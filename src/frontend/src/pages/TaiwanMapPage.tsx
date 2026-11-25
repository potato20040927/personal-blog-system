import { useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDistrictVisits } from '../api/districtVisits';
import type { DistrictVisit } from '../api/districtVisits';
import DistrictVisitPanel from '../components/DistrictVisitPanel';
import { PostsContext } from '../components/Layout';
import PostCard from '../components/PostCard';
import TaiwanMapViewport from '../components/TaiwanMapViewport';
import { useAuth } from '../context/AuthContext';
import type { District } from '../types/district';
import type { Post } from '../types/post';
import type { TravelMapMode } from '../utils/travelMap';
import './TaiwanMapPage.css';

export default function TaiwanMapPage() {
  const context = useContext(PostsContext);
  if (!context) throw new Error('PostsContext 未提供');

  const { posts, postsStatus } = context;
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchParams, setSearchParams] = useSearchParams();
  const [districts, setDistricts] = useState<District[]>([]);
  const [mode, setMode] = useState<TravelMapMode>('heat');
  const [visits, setVisits] = useState<Map<string, DistrictVisit>>(() => new Map());
  const [visitStatus, setVisitStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [visitAttempt, setVisitAttempt] = useState(0);
  const selectedId = searchParams.get('district');
  const selected = districts.find(({ id }) => id === selectedId);
  const recordedVisits = useMemo(() => new Set(visits.keys()), [visits]);

  useEffect(() => {
    const controller = new AbortController();
    getDistrictVisits(controller.signal)
      .then((records) => {
        if (controller.signal.aborted) return;
        setVisits(new Map(records.map((visit) => [visit.districtId, visit])));
        setVisitStatus('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) setVisitStatus('error');
      });
    return () => controller.abort();
  }, [visitAttempt]);

  const postsByDistrict = useMemo(() => {
    const groups = new Map<string, Post[]>();
    for (const post of posts) {
      for (const districtId of new Set(post.districtIds)) {
        const group = groups.get(districtId);
        if (group) group.push(post);
        else groups.set(districtId, [post]);
      }
    }
    return groups;
  }, [posts]);

  const counts = useMemo(
    () => new Map(Array.from(postsByDistrict, ([id, group]) => [id, group.length])),
    [postsByDistrict],
  );
  const selectedPosts = useMemo(
    () => (postsByDistrict.get(selectedId ?? '') ?? [])
      .slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id),
    [postsByDistrict, selectedId],
  );

  function selectDistrict(id: string | null) {
    const params = new URLSearchParams(searchParams);
    if (id) params.set('district', id);
    else params.delete('district');
    setSearchParams(params, { replace: true, preventScrollReset: true });
  }

  function updateVisit(districtId: string, update: (visit: DistrictVisit) => DistrictVisit) {
    setVisits((current) => {
      const next = new Map(current);
      const visit = update(next.get(districtId) ?? { districtId, description: '', photos: [] });
      if (visit.description || visit.photos.length) next.set(districtId, visit);
      else next.delete(districtId);
      return next;
    });
  }

  return (
    <main className="taiwan-map-page">
      <TaiwanMapViewport
        counts={counts}
        recordedVisits={recordedVisits}
        mode={mode}
        onModeChange={setMode}
        selectedId={selectedId}
        onSelect={selectDistrict}
        onLoad={setDistricts}
      />
      <aside className="taiwan-map-sidebar" aria-label="行政區資訊">
        {mode === 'visited' && visitStatus !== 'ready' && (
          <div className="taiwan-map-visit-load">
            <p className="taiwan-map-muted" role="status">
              {visitStatus === 'loading' ? '到訪紀錄載入中…' : '到訪紀錄載入失敗。'}
            </p>
            {visitStatus === 'error' && (
              <button
                className="taiwan-map-visit-button"
                type="button"
                onClick={() => {
                  setVisitStatus('loading');
                  setVisitAttempt((attempt) => attempt + 1);
                }}
              >
                重試
              </button>
            )}
          </div>
        )}
        {selected ? (
          <>
            <div className="taiwan-map-district">
              <p>{selected.county}</p>
              <h2>{selected.name}</h2>
            </div>
            {mode === 'visited' && visitStatus === 'ready' && (
              <DistrictVisitPanel
                key={selected.id}
                district={selected}
                visit={visits.get(selected.id)}
                isAdmin={isAdmin}
                onDescriptionSaved={(description) => updateVisit(selected.id, (visit) => ({ ...visit, description }))}
                onPhotoAdded={(photo) => updateVisit(selected.id, (visit) => ({ ...visit, photos: [...visit.photos, photo] }))}
              />
            )}
            {postsStatus === 'loading' && <p className="taiwan-map-muted" role="status">文章載入中…</p>}
            {postsStatus === 'error' && <p className="taiwan-map-muted" role="status">文章載入失敗，請重新整理頁面。</p>}
            {postsStatus !== 'loading' && postsStatus !== 'error' && selectedPosts.length === 0 && (
              <p className="taiwan-map-muted">這個行政區目前沒有文章。</p>
            )}
            {selectedPosts.length > 0 && (
              <ul className="taiwan-map-post-list" aria-label="此行政區的文章">
                {selectedPosts.map((post) => (
                  <li key={post.id}>
                    <PostCard post={post} />
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <header>
            <h1>台灣旅行地圖</h1>
            <p className="taiwan-map-muted">
              {mode === 'visited' ? '點選行政區查看到訪紀錄和旅行文章。' : '拖曳或縮放地圖，點選行政區查看旅行文章。'}
            </p>
          </header>
        )}
      </aside>
    </main>
  );
}
