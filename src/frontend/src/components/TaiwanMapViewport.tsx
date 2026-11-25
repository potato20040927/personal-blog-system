import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { District } from '../types/district';
import { travelHeatLevels, travelVisitLevels } from '../utils/travelMap';
import type { TravelMapMode } from '../utils/travelMap';

const mapUrl = '/assets/taiwan-map.svg';
const pointerThreshold = 4;
const svgNamespace = 'http://www.w3.org/2000/svg';
const districtBoundaryScale = 1.55;
const countyFocusDuration = 650;

interface Transform {
  x: number;
  y: number;
  scale: number;
}

interface MapView {
  svg: SVGSVGElement;
  layer: SVGGElement;
  districts: { district: District; shape: SVGGraphicsElement }[];
  counties: Map<string, SVGGraphicsElement[]>;
}

interface TaiwanMapViewportProps {
  counts: ReadonlyMap<string, number>;
  recordedVisits: ReadonlySet<string>;
  mode: TravelMapMode;
  onModeChange: (mode: TravelMapMode) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onLoad: (districts: District[]) => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function addCountyBoundaries(map: MapView) {
  const defs = map.svg.querySelector('defs') ?? document.createElementNS(svgNamespace, 'defs');
  if (!defs.parentNode) map.svg.prepend(defs);

  const filter = document.createElementNS(svgNamespace, 'filter');
  filter.id = 'county-outline-filter';
  filter.setAttribute('x', '-5%');
  filter.setAttribute('y', '-5%');
  filter.setAttribute('width', '110%');
  filter.setAttribute('height', '110%');
  filter.innerHTML = `
    <feMorphology in="SourceAlpha" operator="dilate" radius="1.45" result="expanded"/>
    <feComposite in="expanded" in2="SourceAlpha" operator="out" result="outline"/>
    <feFlood flood-color="#111827" flood-opacity="0.95" result="color"/>
    <feComposite in="color" in2="outline" operator="in"/>
  `;
  defs.append(filter);

  const boundaries = document.createElementNS(svgNamespace, 'g');
  boundaries.classList.add('county-boundary-layer');
  boundaries.setAttribute('aria-hidden', 'true');
  for (const shapes of map.counties.values()) {
    const county = document.createElementNS(svgNamespace, 'g');
    county.classList.add('county-boundary');
    for (const shape of shapes) {
      const edge = shape.cloneNode(false) as SVGElement;
      for (const attribute of ['id', 'class', 'tabindex', 'role', 'style']) edge.removeAttribute(attribute);
      edge.setAttribute('fill', '#000000');
      edge.setAttribute('stroke', 'none');
      edge.setAttribute('pointer-events', 'none');
      county.append(edge);
    }
    boundaries.append(county);
  }
  map.layer.append(boundaries);
}

function applyTransform(view: MapView, transform: Transform) {
  const { width, height } = view.svg.viewBox.baseVal;
  const clampAxis = (offset: number, size: number) => {
    const available = size * (1 - transform.scale);
    const slack = size * 0.1;
    return clamp(offset, Math.min(0, available) - slack, Math.max(0, available) + slack);
  };
  transform.x = clampAxis(transform.x, width);
  transform.y = clampAxis(transform.y, height);
  view.layer.setAttribute('transform', `translate(${transform.x} ${transform.y}) scale(${transform.scale})`);
  view.svg.classList.toggle('is-county-view', transform.scale < districtBoundaryScale);
}

function getCountyTransform(map: MapView, county: string, currentScale: number | null): Transform | null {
  const boxes = (map.counties.get(county) ?? []).map((shape) => shape.getBBox())
    .filter(({ width, height }) => width > 0 && height > 0);
  if (!boxes.length) return null;

  const left = Math.min(...boxes.map(({ x }) => x));
  const top = Math.min(...boxes.map(({ y }) => y));
  const right = Math.max(...boxes.map(({ x, width }) => x + width));
  const bottom = Math.max(...boxes.map(({ y, height }) => y + height));
  const viewBox = map.svg.viewBox.baseVal;
  const fitScale = Math.min(viewBox.width / (right - left), viewBox.height / (bottom - top));
  const areaRatio = (right - left) * (bottom - top) / (viewBox.width * viewBox.height);
  const padding = clamp(0.84 - areaRatio * 3.2, 0.56, 0.78);
  const sizeBoost = clamp(0.06 / Math.max(areaRatio, 0.01), 1, 1.32);
  const scale = currentScale ?? clamp(fitScale * padding * sizeBoost, 1.9, 7.4);
  return {
    x: viewBox.x + viewBox.width / 2 - (left + right) * scale / 2,
    y: viewBox.y + viewBox.height / 2 - (top + bottom) * scale / 2,
    scale,
  };
}

export default function TaiwanMapViewport({
  counts,
  recordedVisits,
  mode,
  onModeChange,
  selectedId,
  onSelect,
  onLoad,
}: TaiwanMapViewportProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const transform = useRef({ x: 0, y: 0, scale: 1 });
  const focusedCounty = useRef<string | null>(null);
  const animationFrame = useRef<number | null>(null);
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [map, setMap] = useState<MapView | null>(null);
  const [failed, setFailed] = useState(false);
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  const isVisitedMode = mode === 'visited';
  const levels = isVisitedMode ? travelVisitLevels : travelHeatLevels;

  const cancelFocus = useCallback(() => {
    if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
    animationFrame.current = null;
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const controller = new AbortController();

    async function loadMap() {
      const response = await fetch(mapUrl, { signal: controller.signal });
      if (!response.ok) throw new Error('無法載入行政區地圖');
      const markup = await response.text();
      if (controller.signal.aborted) return;

      const svg = new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement as unknown as SVGSVGElement;
      const layer = svg.querySelector<SVGGElement>('.layer');
      if (svg.localName !== 'svg' || !layer) throw new Error('地圖內容不完整');

      const districts: MapView['districts'] = [];
      const counties: MapView['counties'] = new Map();
      for (const shape of layer.querySelectorAll<SVGGraphicsElement>('.region[data-custom-id][data-name]')) {
        const id = shape.getAttribute('data-custom-id')!;
        const label = shape.getAttribute('data-name')!;
        const county = label.slice(0, 3);
        districts.push({ district: { id, county, name: label.slice(3) }, shape });
        const shapes = counties.get(county);
        if (shapes) shapes.push(shape);
        else counties.set(county, [shape]);
        shape.setAttribute('role', 'button');
        shape.setAttribute('tabindex', '0');
      }

      const view = { svg, layer, districts, counties };
      addCountyBoundaries(view);
      applyTransform(view, transform.current);
      stage?.replaceChildren(svg);
      setMap(view);
      onLoad(districts.map(({ district }) => district));
    }

    loadMap().catch(() => {
      if (!controller.signal.aborted) setFailed(true);
    });

    return () => {
      controller.abort();
      cancelFocus();
    };
  }, [cancelFocus, onLoad]);

  useEffect(() => {
    if (!map) return;

    for (const { district, shape } of map.districts) {
      const count = counts.get(district.id) ?? 0;
      const value = isVisitedMode ? Number(count > 0 || recordedVisits.has(district.id)) : count;
      const level = levels.findLast(({ min }) => value >= min) ?? levels[0];
      const selected = district.id === selectedId;
      const description = isVisitedMode ? level.label : `${count} 篇文章`;

      shape.style.setProperty('--district-fill', level.color);
      shape.setAttribute('aria-label', `${district.county}${district.name}，${description}`);
      shape.setAttribute('aria-pressed', String(selected));
      shape.classList.toggle('is-selected', selected);
    }
  }, [counts, isVisitedMode, levels, map, recordedVisits, selectedId]);

  const zoomAt = useCallback((clientX: number, clientY: number, factor: number) => {
    if (!map) return;
    const matrix = map.svg.getScreenCTM();
    if (!matrix) return;

    const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    const current = transform.current;
    setHoveredName(null);
    cancelFocus();
    const scale = clamp(current.scale * factor, 0.45, 9);
    const ratio = scale / current.scale;
    transform.current = {
      x: point.x - (point.x - current.x) * ratio,
      y: point.y - (point.y - current.y) * ratio,
      scale,
    };
    applyTransform(map, transform.current);
  }, [cancelFocus, map]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !map) return;

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 1.12 : 0.88);
    }

    stage.addEventListener('wheel', handleWheel, { passive: false });
    return () => stage.removeEventListener('wheel', handleWheel);
  }, [map, zoomAt]);

  function zoomFromCenter(factor: number) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (rect) zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
  }

  function resetView() {
    if (!map) return;
    setHoveredName(null);
    cancelFocus();
    focusedCounty.current = null;
    transform.current = { x: 0, y: 0, scale: 1 };
    applyTransform(map, transform.current);
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!map || !event.isPrimary || event.button !== 0) return;
    setHoveredName(null);
    cancelFocus();
    suppressClick.current = false;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
  }

  function showDistrictName(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || animationFrame.current !== null) return;

    const name = getTargetRegion(event.target)?.getAttribute('data-name') ?? null;
    setHoveredName(name);
    const tooltip = tooltipRef.current;
    if (!name || !tooltip) return;

    const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - left;
    const y = event.clientY - top;
    const openLeft = width - x < 160;
    const openAbove = height - y < 44;
    tooltip.style.left = `${x + (openLeft ? -12 : 12)}px`;
    tooltip.style.top = `${y + (openAbove ? -12 : 12)}px`;
    tooltip.style.transform = `translate(${openLeft ? '-100%' : '0'}, ${openAbove ? '-100%' : '0'})`;
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const pointer = drag.current;
    if (!pointer) {
      showDistrictName(event);
      return;
    }
    if (!map || pointer.id !== event.pointerId) return;

    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (!pointer.moved && Math.hypot(dx, dy) < pointerThreshold) return;

    if (!pointer.moved) {
      pointer.moved = true;
      suppressClick.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.classList.add('is-dragging');
    }

    const screenScale = map.svg.getScreenCTM()?.a;
    if (!screenScale) return;
    transform.current.x += dx / screenScale;
    transform.current.y += dy / screenScale;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    applyTransform(map, transform.current);
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    event.currentTarget.classList.remove('is-dragging');
  }

  function getTargetRegion(target: EventTarget) {
    return target instanceof Element ? target.closest('.region') : null;
  }

  function getTargetId(target: EventTarget) {
    return getTargetRegion(target)?.getAttribute('data-custom-id') ?? null;
  }

  function selectDistrict(id: string) {
    setHoveredName(null);
    onSelect(id);
    if (!map) return;
    const view = map;
    const district = view.districts.find(({ district }) => district.id === id)?.district;
    if (!district) return;

    const start = { ...transform.current };
    const sameCounty = focusedCounty.current === district.county && start.scale >= districtBoundaryScale;
    const destination = getCountyTransform(view, district.county, sameCounty ? start.scale : null);
    if (!destination) return;

    cancelFocus();
    focusedCounty.current = district.county;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      transform.current = destination;
      applyTransform(view, transform.current);
      return;
    }

    const startedAt = performance.now();
    const step = (now: number) => {
      const progress = clamp((now - startedAt) / countyFocusDuration, 0, 1);
      const eased = 1 - (1 - progress) ** 3;
      transform.current = {
        x: start.x + (destination.x - start.x) * eased,
        y: start.y + (destination.y - start.y) * eased,
        scale: start.scale + (destination.scale - start.scale) * eased,
      };
      applyTransform(view, transform.current);
      animationFrame.current = progress < 1 ? requestAnimationFrame(step) : null;
    };
    animationFrame.current = requestAnimationFrame(step);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const id = getTargetId(event.target);
    if (id && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      selectDistrict(id);
    } else if (event.key === 'Escape') {
      setHoveredName(null);
      focusedCounty.current = null;
      onSelect(null);
    }
  }

  return (
    <section className="taiwan-map-panel" aria-label="台灣旅行地圖">
      <div className="taiwan-map-controls">
        <div className="taiwan-map-toolbar" role="group" aria-label="地圖縮放">
          <button type="button" aria-label="放大" onClick={() => zoomFromCenter(1.2)} disabled={!map}>+</button>
          <button type="button" aria-label="縮小" onClick={() => zoomFromCenter(0.82)} disabled={!map}>-</button>
          <button type="button" onClick={resetView} disabled={!map}>重設</button>
        </div>
        <div className="taiwan-map-toolbar taiwan-map-mode" role="group" aria-label="地圖顯示模式">
          <button type="button" aria-pressed={!isVisitedMode} onClick={() => onModeChange('heat')}>文章熱度</button>
          <button type="button" aria-pressed={isVisitedMode} onClick={() => onModeChange('visited')}>到訪紀錄</button>
        </div>
      </div>
      <div
        ref={stageRef}
        className="taiwan-map-stage"
        onPointerDown={startDrag}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onPointerLeave={(event) => {
          setHoveredName(null);
          if (!drag.current?.moved) endDrag(event);
        }}
        onClick={(event) => {
          if (suppressClick.current) return;
          const id = getTargetId(event.target);
          if (id) selectDistrict(id);
          else {
            focusedCounty.current = null;
            onSelect(null);
          }
        }}
        onKeyDown={handleKeyDown}
      />
      <div ref={tooltipRef} className="taiwan-map-district-tooltip" hidden={!hoveredName} aria-hidden="true">
        {hoveredName}
      </div>
      {!map && (
        <p className="taiwan-map-status" role="status">
          {failed ? '地圖載入失敗，請重新整理頁面。' : '地圖載入中…'}
        </p>
      )}
      <div className="taiwan-map-legend">
        <span>{isVisitedMode ? '到訪狀態' : '各區文章數'}</span>
        <ul aria-label={isVisitedMode ? '到訪圖例' : '文章數量色階'}>
          {levels.map(({ label, color }) => (
            <li key={label}><span style={{ backgroundColor: color }} aria-hidden="true" />{label}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
