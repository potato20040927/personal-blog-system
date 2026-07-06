import React, { useEffect, useRef } from 'react';
import './TaiwanMapPage.css';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MAP_FILE = '/assets/taiwan-map.svg';
const DETAIL_BOUNDARY_SCALE = 1.55;
const PAN_BOUNDARY_RATIO = 0.1;
const COUNTY_FOCUS_DURATION = 650;
const COUNTY_FOCUS_MIN_SCALE = DETAIL_BOUNDARY_SCALE + 0.35;
const COUNTY_FOCUS_MAX_SCALE = 7.4;

type Transform = {
  x: number;
  y: number;
  scale: number;
};

type PointerState = {
  dragging: boolean;
  moved: boolean;
  x: number;
  y: number;
};

type SvgRegion = SVGGraphicsElement & {
  dataset: DOMStringMap;
};

type RegionBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const TaiwanMapPage: React.FC = () => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const statusRef = useRef<HTMLElement | null>(null);
  const selectedNameRef = useRef<HTMLHeadingElement | null>(null);
  const selectedIdRef = useRef<HTMLElement | null>(null);
  const selectedRegionNameRef = useRef<HTMLElement | null>(null);
  const zoomInRef = useRef<HTMLButtonElement | null>(null);
  const zoomOutRef = useRef<HTMLButtonElement | null>(null);
  const resetViewRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const mapStatus = statusRef.current;
    const selectedName = selectedNameRef.current;
    const selectedId = selectedIdRef.current;
    const selectedRegionName = selectedRegionNameRef.current;
    const zoomIn = zoomInRef.current;
    const zoomOut = zoomOutRef.current;
    const resetView = resetViewRef.current;

    if (!stage || !zoomIn || !zoomOut || !resetView) return undefined;

    const mapStage = stage;
    let svg: SVGSVGElement | null = null;
    let viewport: SVGGElement | null = null;
    let selectedRegions: SvgRegion[] = [];
    let hoveredRegions: SvgRegion[] = [];
    let dimmedRegions: SvgRegion[] = [];
    let hoveredCountyKey = '';
    let focusedCountyKey = '';
    let transform: Transform = { x: 0, y: 0, scale: 1 };
    let pointer: PointerState = { dragging: false, moved: false, x: 0, y: 0 };
    let ignoreNextStageClick = false;
    let mapAnimationFrame: number | null = null;
    let isMounted = true;

    function setText(element: HTMLElement | null, text: string) {
      if (element) {
        element.textContent = text;
      }
    }

    function clamp(value: number, min: number, max: number) {
      return Math.min(max, Math.max(min, value));
    }

    function easeOutCubic(progress: number) {
      return 1 - Math.pow(1 - progress, 3);
    }

    function getMapViewBox() {
      const viewBox = svg?.viewBox?.baseVal;

      if (viewBox?.width && viewBox?.height) {
        return {
          x: viewBox.x,
          y: viewBox.y,
          width: viewBox.width,
          height: viewBox.height,
        };
      }

      return { x: 0, y: 0, width: 700, height: 850.395 };
    }

    function clampAxis(offset: number, viewportSize: number, scaledContentSize: number) {
      const slack = viewportSize * PAN_BOUNDARY_RATIO;

      if (scaledContentSize <= viewportSize) {
        const centeredOffset = (viewportSize - scaledContentSize) / 2;
        return clamp(offset, centeredOffset - slack, centeredOffset + slack);
      }

      return clamp(offset, viewportSize - scaledContentSize - slack, slack);
    }

    function clampTransform() {
      const viewBox = getMapViewBox();
      const scaledWidth = viewBox.width * transform.scale;
      const scaledHeight = viewBox.height * transform.scale;

      transform.x = clampAxis(transform.x, viewBox.width, scaledWidth);
      transform.y = clampAxis(transform.y, viewBox.height, scaledHeight);
    }

    function clientPointToSvgPoint(clientX: number, clientY: number) {
      if (!svg) return null;

      const matrix = svg.getScreenCTM();
      if (!matrix) return null;

      const point = svg.createSVGPoint();
      point.x = clientX;
      point.y = clientY;

      return point.matrixTransform(matrix.inverse());
    }

    function cssDeltaToSvgDelta(dx: number, dy: number) {
      if (!svg) return { x: 0, y: 0 };

      const rect = svg.getBoundingClientRect();
      const viewBox = getMapViewBox();
      const screenScale = Math.min(rect.width / viewBox.width, rect.height / viewBox.height) || 1;

      return {
        x: dx / screenScale,
        y: dy / screenScale,
      };
    }

    function clearCountyHover() {
      hoveredRegions.forEach((region) => {
        region.classList.remove('is-county-hovered');
      });

      hoveredRegions = [];
      hoveredCountyKey = '';
    }

    function updateTransform() {
      if (!viewport) return;

      clampTransform();
      viewport.setAttribute(
        'transform',
        `translate(${transform.x} ${transform.y}) scale(${transform.scale})`,
      );
      const isCountyView = transform.scale < DETAIL_BOUNDARY_SCALE;
      mapStage.classList.toggle('is-county-view', isCountyView);

      if (!isCountyView) {
        clearCountyHover();
      }

      if (mapStatus) {
        const mode = isCountyView ? '縣市邊界模式' : '鄉鎮市區邊界模式';
        mapStatus.textContent = `可拖曳、縮放、點選：${mode}`;
      }
    }

    function cancelMapAnimation() {
      if (!mapAnimationFrame) return;

      cancelAnimationFrame(mapAnimationFrame);
      mapAnimationFrame = null;
    }

    function animateToTransform(targetTransform: Transform) {
      cancelMapAnimation();

      const startTransform = { ...transform };
      const startedAt = performance.now();

      function step(now: number) {
        const progress = clamp((now - startedAt) / COUNTY_FOCUS_DURATION, 0, 1);
        const eased = easeOutCubic(progress);

        transform = {
          x: startTransform.x + (targetTransform.x - startTransform.x) * eased,
          y: startTransform.y + (targetTransform.y - startTransform.y) * eased,
          scale: startTransform.scale + (targetTransform.scale - startTransform.scale) * eased,
        };
        updateTransform();

        if (progress < 1) {
          mapAnimationFrame = requestAnimationFrame(step);
          return;
        }

        transform = { ...targetTransform };
        updateTransform();
        mapAnimationFrame = null;
      }

      mapAnimationFrame = requestAnimationFrame(step);
    }

    function getRegionsBBox(regions: SvgRegion[]) {
      const boxes = regions
        .map((region) => region.getBBox())
        .filter((box) => box.width > 0 && box.height > 0);

      if (!boxes.length) return null;

      const minX = Math.min(...boxes.map((box) => box.x));
      const minY = Math.min(...boxes.map((box) => box.y));
      const maxX = Math.max(...boxes.map((box) => box.x + box.width));
      const maxY = Math.max(...boxes.map((box) => box.y + box.height));

      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    }

    function getAdaptiveFocusScale(box: RegionBox, viewBox: ReturnType<typeof getMapViewBox>) {
      const fitScale = Math.min(viewBox.width / box.width, viewBox.height / box.height);
      const areaRatio = (box.width * box.height) / (viewBox.width * viewBox.height);
      const paddingFactor = clamp(0.84 - areaRatio * 3.2, 0.56, 0.78);
      const sizeBoost = clamp(0.06 / Math.max(areaRatio, 0.01), 1, 1.32);

      return clamp(
        fitScale * paddingFactor * sizeBoost,
        COUNTY_FOCUS_MIN_SCALE,
        COUNTY_FOCUS_MAX_SCALE,
      );
    }

    function getFocusTransformForRegions(regions: SvgRegion[], options: { preserveScale?: boolean } = {}) {
      const { preserveScale = false } = options;
      const box = getRegionsBBox(regions);

      if (!box) return null;

      const viewBox = getMapViewBox();
      const targetScale = preserveScale
        ? transform.scale
        : getAdaptiveFocusScale(box, viewBox);
      const boxCenterX = box.x + box.width / 2;
      const boxCenterY = box.y + box.height / 2;
      const viewportCenterX = viewBox.x + viewBox.width / 2;
      const viewportCenterY = viewBox.y + viewBox.height / 2;

      return {
        x: viewportCenterX - boxCenterX * targetScale,
        y: viewportCenterY - boxCenterY * targetScale,
        scale: targetScale,
      };
    }

    function focusRegions(regions: SvgRegion[], options: { preserveScale?: boolean } = {}) {
      const targetTransform = getFocusTransformForRegions(regions, options);

      if (targetTransform) {
        animateToTransform(targetTransform);
      }
    }

    function clearDimmedRegions() {
      dimmedRegions.forEach((region) => {
        region.classList.remove('is-dimmed');
      });

      dimmedRegions = [];
    }

    function clearSelection() {
      selectedRegions.forEach((region) => {
        region.classList.remove('is-selected');
        region.style.removeProperty('fill');
        region.style.removeProperty('stroke');
        region.style.removeProperty('stroke-width');
      });

      selectedRegions = [];
      focusedCountyKey = '';
      clearDimmedRegions();
      setText(selectedName, '尚未選取行政區');
      setText(selectedId, '-');
      setText(selectedRegionName, '-');
    }

    function markSelectedRegions(regions: SvgRegion[], options: { showStroke?: boolean } = {}) {
      const { showStroke = true } = options;

      clearSelection();
      selectedRegions = regions;

      selectedRegions.forEach((region) => {
        region.classList.add('is-selected');
        region.style.setProperty('fill', '#ef4444', 'important');

        if (showStroke) {
          region.style.setProperty('stroke', '#f59e0b', 'important');
          region.style.setProperty('stroke-width', '2', 'important');
        } else {
          region.style.setProperty('stroke', 'transparent', 'important');
          region.style.setProperty('stroke-width', '0', 'important');
        }
      });
    }

    function countyKeyFor(region: SvgRegion) {
      const name = region.dataset.name || '';
      const countyMatch = name.match(/^(.{2,3}[縣市])/);

      if (countyMatch) {
        return countyMatch[1];
      }

      const id = region.dataset.customId || region.id || '';
      return id.split('-')[0] || 'unknown';
    }

    function regionsForCounty(region: SvgRegion) {
      const countyKey = countyKeyFor(region);
      const countyRegions = Array.from(svg?.querySelectorAll<SvgRegion>('.region') ?? [])
        .filter((candidate) => countyKeyFor(candidate) === countyKey);

      return { countyKey, countyRegions };
    }

    function dimRegionsOutside(regionsToKeep: SvgRegion[]) {
      const keptRegions = new Set(regionsToKeep);

      clearDimmedRegions();
      dimmedRegions = Array.from(svg?.querySelectorAll<SvgRegion>('.region') ?? [])
        .filter((region) => !keptRegions.has(region));

      dimmedRegions.forEach((region) => {
        region.classList.add('is-dimmed');
      });
    }

    function findRegionAtPoint(clientX: number, clientY: number) {
      return document
        .elementsFromPoint(clientX, clientY)
        .map((element) => element.closest?.('.region') as SvgRegion | null)
        .find((region) => region && svg?.contains(region)) ?? null;
    }

    function setCountyHover(region: SvgRegion) {
      if (transform.scale >= DETAIL_BOUNDARY_SCALE) {
        clearCountyHover();
        return;
      }

      const { countyKey, countyRegions } = regionsForCounty(region);

      if (countyKey === hoveredCountyKey) return;

      clearCountyHover();
      hoveredCountyKey = countyKey;
      hoveredRegions = countyRegions;
      hoveredRegions.forEach((countyRegion) => {
        countyRegion.classList.add('is-county-hovered');
      });
    }

    function updateCountyHoverFromPoint(clientX: number, clientY: number) {
      if (transform.scale >= DETAIL_BOUNDARY_SCALE) {
        clearCountyHover();
        return;
      }

      const region = findRegionAtPoint(clientX, clientY);

      if (!region) {
        clearCountyHover();
        return;
      }

      setCountyHover(region);
    }

    function selectRegion(region: SvgRegion) {
      markSelectedRegions([region], { showStroke: true });

      const id = region.dataset.customId || region.id || '-';
      const name = region.dataset.name || '未命名行政區';
      const { countyKey, countyRegions } = regionsForCounty(region);
      const preserveScale = countyKey === focusedCountyKey;

      setText(selectedName, name);
      setText(selectedId, id);
      setText(selectedRegionName, name);
      dimRegionsOutside(countyRegions);
      focusedCountyKey = countyKey;
      focusRegions(countyRegions, { preserveScale });
    }

    function selectCounty(region: SvgRegion) {
      const { countyKey, countyRegions } = regionsForCounty(region);

      markSelectedRegions(countyRegions, { showStroke: false });
      setText(selectedName, countyKey);
      setText(selectedId, countyKey);
      setText(selectedRegionName, countyKey);
      focusedCountyKey = countyKey;
      focusRegions(countyRegions);
    }

    function selectMapTarget(region: SvgRegion) {
      if (transform.scale < DETAIL_BOUNDARY_SCALE) {
        selectCounty(region);
        return;
      }

      selectRegion(region);
    }

    function addCountyBoundaryOverlay() {
      if (!svg || !viewport) return;

      viewport.querySelectorAll('.county-boundary-layer')
        .forEach((layer) => layer.remove());

      svg.querySelector('#county-outline-filter')?.remove();

      const regions = Array.from(svg.querySelectorAll<SvgRegion>('.region'));
      const countyRegions = new Map<string, SvgRegion[]>();

      regions.forEach((region) => {
        const countyKey = countyKeyFor(region);

        if (!countyRegions.has(countyKey)) {
          countyRegions.set(countyKey, []);
        }

        countyRegions.get(countyKey)?.push(region);
      });

      const defs = svg.querySelector('defs') || document.createElementNS(SVG_NS, 'defs');

      if (!defs.parentNode) {
        svg.insertBefore(defs, svg.firstElementChild);
      }

      const filter = document.createElementNS(SVG_NS, 'filter');
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

      defs.appendChild(filter);

      const countyLayer = document.createElementNS(SVG_NS, 'g');
      countyLayer.classList.add('county-boundary-layer');
      countyLayer.setAttribute('aria-hidden', 'true');
      countyLayer.setAttribute('pointer-events', 'none');

      countyRegions.forEach((countyRegionList, countyKey) => {
        const group = document.createElementNS(SVG_NS, 'g');
        group.setAttribute('class', 'county-boundary');
        group.setAttribute('pointer-events', 'none');
        group.dataset.county = countyKey;

        countyRegionList.forEach((region) => {
          const clone = region.cloneNode(false) as SVGElement;
          clone.removeAttribute('id');
          clone.removeAttribute('class');
          clone.removeAttribute('tabindex');
          clone.removeAttribute('role');
          clone.removeAttribute('style');
          clone.setAttribute('fill', '#000000');
          clone.setAttribute('stroke', 'none');
          clone.setAttribute('pointer-events', 'none');
          group.appendChild(clone);
        });

        countyLayer.appendChild(group);
      });

      viewport.appendChild(countyLayer);
    }

    function zoomAt(clientX: number, clientY: number, factor: number) {
      const point = clientPointToSvgPoint(clientX, clientY);
      if (!point) return;

      const nextScale = Math.min(9, Math.max(0.45, transform.scale * factor));
      const scaleFactor = nextScale / transform.scale;

      transform.x = point.x - (point.x - transform.x) * scaleFactor;
      transform.y = point.y - (point.y - transform.y) * scaleFactor;
      transform.scale = nextScale;
      updateTransform();
    }

    function resetMapView() {
      transform = { x: 0, y: 0, scale: 1 };
      updateTransform();
    }

    function ensureViewport() {
      if (!svg) return;

      viewport = svg.querySelector<SVGGElement>('.layer');

      if (viewport) return;

      viewport = document.createElementNS(SVG_NS, 'g');
      viewport.id = 'interactiveViewport';

      Array.from(svg.children)
        .filter((child) => !['style', 'filter', 'metadata', 'defs'].includes(child.localName))
        .forEach((child) => viewport?.appendChild(child));

      svg.appendChild(viewport);
    }

    function bindRegions() {
      svg?.querySelectorAll<SvgRegion>('.region').forEach((region) => {
        region.setAttribute('tabindex', region.getAttribute('tabindex') || '0');
        region.setAttribute('role', region.getAttribute('role') || 'button');

        region.addEventListener('click', (event) => {
          if (pointer.moved) return;
          event.stopPropagation();
          selectMapTarget(region);
        });

        region.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectMapTarget(region);
          }
        });
      });
    }

    async function loadMap() {
      const response = await fetch(MAP_FILE, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(`無法載入 ${MAP_FILE}`);
      }

      const mapMarkup = await response.text();

      if (!isMounted) return;

      mapStage.innerHTML = mapMarkup;
      svg = mapStage.querySelector('svg');

      if (!svg) {
        throw new Error('SVG 內容不完整');
      }

      ensureViewport();
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      updateTransform();
      bindRegions();
      addCountyBoundaryOverlay();
      updateTransform();
    }

    const handlePointerDown = (event: PointerEvent) => {
      cancelMapAnimation();
      pointer = { dragging: true, moved: false, x: event.clientX, y: event.clientY };
      mapStage.classList.add('is-dragging');
      mapStage.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!pointer.dragging) {
        updateCountyHoverFromPoint(event.clientX, event.clientY);
        return;
      }

      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;

      if (Math.abs(dx) + Math.abs(dy) > 3) {
        pointer.moved = true;
      }

      const delta = cssDeltaToSvgDelta(dx, dy);

      transform.x += delta.x;
      transform.y += delta.y;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      clearCountyHover();
      updateTransform();
    };

    const handlePointerUp = (event: PointerEvent) => {
      const wasMoved = pointer.moved;
      pointer.dragging = false;
      mapStage.classList.remove('is-dragging');

      if (mapStage.hasPointerCapture(event.pointerId)) {
        mapStage.releasePointerCapture(event.pointerId);
      }

      if (!wasMoved) {
        const region = findRegionAtPoint(event.clientX, event.clientY);

        if (region && svg?.contains(region)) {
          selectMapTarget(region);
          ignoreNextStageClick = true;
        }
      }

      setTimeout(() => {
        pointer.moved = false;
      }, 0);
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      cancelMapAnimation();
      zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 1.12 : 0.88);
    };

    const handleStageClick = (event: MouseEvent) => {
      if (ignoreNextStageClick) {
        ignoreNextStageClick = false;
        return;
      }

      if (!(event.target as Element).closest?.('.region') && !pointer.moved) {
        clearSelection();
      }
    };

    const handleZoomIn = () => {
      cancelMapAnimation();
      const rect = mapStage.getBoundingClientRect();
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.2);
    };

    const handleZoomOut = () => {
      cancelMapAnimation();
      const rect = mapStage.getBoundingClientRect();
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 0.82);
    };

    const handleResetView = () => {
      cancelMapAnimation();
      resetMapView();
    };

    mapStage.addEventListener('pointerdown', handlePointerDown);
    mapStage.addEventListener('pointermove', handlePointerMove);
    mapStage.addEventListener('pointerleave', clearCountyHover);
    mapStage.addEventListener('pointerup', handlePointerUp);
    mapStage.addEventListener('wheel', handleWheel, { passive: false });
    mapStage.addEventListener('click', handleStageClick);
    zoomIn.addEventListener('click', handleZoomIn);
    zoomOut.addEventListener('click', handleZoomOut);
    resetView.addEventListener('click', handleResetView);
    window.addEventListener('resize', updateTransform);

    loadMap().catch((error) => {
      mapStage.textContent = `無法載入地圖：${error.message}`;
      setText(mapStatus, '載入失敗');
    });

    return () => {
      isMounted = false;
      cancelMapAnimation();
      mapStage.removeEventListener('pointerdown', handlePointerDown);
      mapStage.removeEventListener('pointermove', handlePointerMove);
      mapStage.removeEventListener('pointerleave', clearCountyHover);
      mapStage.removeEventListener('pointerup', handlePointerUp);
      mapStage.removeEventListener('wheel', handleWheel);
      mapStage.removeEventListener('click', handleStageClick);
      zoomIn.removeEventListener('click', handleZoomIn);
      zoomOut.removeEventListener('click', handleZoomOut);
      resetView.removeEventListener('click', handleResetView);
      window.removeEventListener('resize', updateTransform);
    };
  }, []);

  return (
    <main className="taiwan-map-page">
      <section className="taiwan-map-panel" aria-label="台灣行政區地圖">
        <div className="taiwan-map-toolbar" aria-label="地圖控制">
          <button ref={zoomInRef} type="button" aria-label="放大">+</button>
          <button ref={zoomOutRef} type="button" aria-label="縮小">-</button>
          <button ref={resetViewRef} type="button">重設</button>
        </div>
        <div ref={stageRef} className="taiwan-map-stage" tabIndex={0}></div>
      </section>

      <aside className="taiwan-map-sidebar" aria-label="行政區資訊">
        <header>
          <p className="taiwan-map-eyebrow">Taiwan Map</p>
          <h1>台灣行政區互動地圖</h1>
          <p className="taiwan-map-muted">拖曳地圖移動，滾輪或按鈕縮放。點選行政區查看資料。</p>
        </header>

        <section className="taiwan-map-selected-card" aria-live="polite">
          <span className="taiwan-map-status-label">目前選取</span>
          <h2 ref={selectedNameRef}>尚未選取行政區</h2>
          <dl>
            <div>
              <dt>行政區 ID</dt>
              <dd ref={selectedIdRef}>-</dd>
            </div>
            <div>
              <dt>行政區名稱</dt>
              <dd ref={selectedRegionNameRef}>-</dd>
            </div>
          </dl>
        </section>

        <section className="taiwan-map-meta">
          <div>
            <span>互動狀態</span>
            <strong ref={statusRef}>準備中</strong>
          </div>
        </section>
      </aside>
    </main>
  );
};

export default TaiwanMapPage;
