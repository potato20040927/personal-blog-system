import { useEffect, useMemo, useState } from 'react';
import { getDistricts } from '../api/districts';
import type { District } from '../types/district';

interface DistrictPickerProps {
  value: string[];
  onChange: (districtIds: string[]) => void;
}

export default function DistrictPicker({ value, onChange }: DistrictPickerProps) {
  const [districts, setDistricts] = useState<District[]>([]);
  const [county, setCounty] = useState('');
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getDistricts(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setDistricts(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [attempt]);

  const names = useMemo(
    () => new Map(districts.map(({ id, county, name }) => [id, county + name])),
    [districts],
  );
  const counties = useMemo(
    () => [...new Set(districts.map((district) => district.county))].sort((a, b) => a.localeCompare(b, 'zh-TW')),
    [districts],
  );
  const available = districts.filter((district) => district.county === county && !value.includes(district.id));

  return (
    <fieldset className="post-district-picker">
      <legend>行政區（選填）</legend>
      <div className="post-district-selects">
        <select
          className="post-editor-field"
          aria-label="標記縣市"
          value={county}
          disabled={districts.length === 0}
          onChange={(event) => setCounty(event.target.value)}
        >
          <option value="">選擇縣市</option>
          {counties.map((name) => <option key={name}>{name}</option>)}
        </select>
        <select
          className="post-editor-field"
          aria-label="加入行政區"
          value=""
          disabled={!county || available.length === 0}
          onChange={(event) => {
            if (event.target.value) onChange([...value, event.target.value]);
          }}
        >
          <option value="">{county && available.length === 0 ? '此縣市已全部標記' : '加入行政區'}</option>
          {available.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>
      {failed && (
        <p className="post-district-status" role="status">
          行政區清單載入失敗
          <button type="button" onClick={() => { setFailed(false); setAttempt((count) => count + 1); }}>
            重試
          </button>
        </p>
      )}
      {value.length > 0 && (
        <ul className="post-district-tags" aria-label="已標記的行政區">
          {value.map((id) => {
            const label = names.get(id) ?? id;
            return (
              <li key={id}>
                <button type="button" aria-label={`移除 ${label}`} onClick={() => onChange(value.filter((item) => item !== id))}>
                  {label} <span aria-hidden="true">×</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </fieldset>
  );
}
