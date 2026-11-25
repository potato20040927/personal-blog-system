import { useId, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { addDistrictVisitPhoto, saveDistrictVisitDescription } from '../api/districtVisits';
import type { DistrictVisit, DistrictVisitPhoto } from '../api/districtVisits';
import type { District } from '../types/district';

interface DistrictVisitPanelProps {
  district: District;
  visit: DistrictVisit | undefined;
  isAdmin: boolean;
  onDescriptionSaved: (description: string) => void;
  onPhotoAdded: (photo: DistrictVisitPhoto) => void;
}

export default function DistrictVisitPanel({
  district,
  visit,
  isAdmin,
  onDescriptionSaved,
  onPhotoAdded,
}: DistrictVisitPanelProps) {
  const descriptionId = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [descriptionError, setDescriptionError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const description = visit?.description ?? '';

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || draft.trim() === description) return;

    setSaving(true);
    setDescriptionError('');
    try {
      const saved = await saveDistrictVisitDescription(district.id, draft);
      onDescriptionSaved(saved.description);
      setEditing(false);
    } catch {
      setDescriptionError('儲存說明失敗，請重試。');
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file || uploading) return;

    setUploading(true);
    setPhotoError('');
    try {
      onPhotoAdded(await addDistrictVisitPhoto(district.id, file));
    } catch (error) {
      setPhotoError(error instanceof Error && error.message === 'Image file is too large'
        ? '照片大小須在 5 MB 以內。'
        : '上傳照片失敗，請重試。');
    } finally {
      setUploading(false);
    }
  }

  if (!visit && !isAdmin) return null;

  return (
    <section className="taiwan-map-visit-record" aria-label="到訪紀錄">
      <h3>到訪紀錄</h3>
      {isAdmin && editing ? (
        <form className="taiwan-map-visit-form" onSubmit={(event) => void handleSave(event)}>
          <label htmlFor={descriptionId}>到訪說明</label>
          <textarea
            id={descriptionId}
            rows={4}
            value={draft}
            disabled={saving}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="taiwan-map-visit-actions">
            <button className="taiwan-map-visit-button" type="submit" disabled={saving || draft.trim() === description}>
              {saving ? '儲存中…' : '儲存說明'}
            </button>
            <button className="taiwan-map-visit-button" type="button" disabled={saving} onClick={() => setEditing(false)}>
              取消
            </button>
          </div>
          {descriptionError && <p className="taiwan-map-visit-error" role="alert">{descriptionError}</p>}
        </form>
      ) : description && (
        <p className="taiwan-map-visit-description">{description}</p>
      )}
      {visit && visit.photos.length > 0 && (
        <ul className="taiwan-map-visit-photos" aria-label="到訪照片">
          {visit.photos.map((photo, index) => (
            <li key={photo.id}>
              <a href={photo.url} target="_blank" rel="noreferrer">
                <img src={photo.url} alt={`${district.name}到訪照片 ${index + 1}`} loading="lazy" />
              </a>
            </li>
          ))}
        </ul>
      )}
      {isAdmin && (
        <div className="taiwan-map-visit-actions">
          {!editing && (
            <button
              className="taiwan-map-visit-button"
              type="button"
              onClick={() => {
                setDraft(description);
                setDescriptionError('');
                setEditing(true);
              }}
            >
              {description ? '編輯說明' : '新增說明'}
            </button>
          )}
          <label className="taiwan-map-visit-button taiwan-map-visit-upload">
            {uploading ? '上傳中…' : '新增照片'}
            <input type="file" accept="image/*" disabled={uploading} onChange={(event) => void handlePhotoChange(event)} />
          </label>
        </div>
      )}
      {photoError && <p className="taiwan-map-visit-error" role="alert">{photoError}</p>}
    </section>
  );
}
