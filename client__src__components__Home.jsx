import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, asset, openLink, tg } from '../api.js';
import { useApp } from '../ctx.jsx';
import { Spinner } from './ui.jsx';
import Marquee from './Marquee.jsx';
import WelcomeModal from './WelcomeModal.jsx';
import ProfileModal from './ProfileModal.jsx';
import TaskModal from './TaskModal.jsx';
import MyFiles from './MyFiles.jsx';
import SponsorOverlay from './SponsorOverlay.jsx';
import AdminPanel from './admin/AdminPanel.jsx';
import { shareVideo } from '../share.js';

const ratioCss = (a) => (a || '16:9').replace(':', ' / ');

export function VideoCard({ v, onOpen, toast }) {
  const done = v.unlocked ? v.taskCount : v.tasksDone;
  return (
    <div className="card animate-pop overflow-hidden">
      <button className="relative block w-full bg-card2" style={{ aspectRatio: ratioCss(v.thumbAspect) }} onClick={() => onOpen(v)}>
        {v.thumbnail
          ? <img src={asset(v.thumbnail)} alt="" loading="lazy" className="h-full w-full object-cover" />
          : <div className="grid h-full place-items-center text-4xl text-mute">▶</div>}
        {v.duration && <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">{v.duration}</span>}
        {v.unlocked && <span className="badge absolute left-2 top-2 bg-good/90 text-white">✓ Unlocked</span>}
      </button>
      <div className="space-y-2.5 p-3">
        <div>
          <h3 className="line-clamp-2 text-sm font-bold leading-snug">{v.title}</h3>
          {v.description && <p className="mt-0.5 line-clamp-1 text-xs text-mute">{v.description}</p>}
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-[11px] tabular-nums text-mute" title="Views">👁 {v.views || 0}</span>
          <span className="inline-flex items-center gap-1 text-[11px] tabular-nums text-mute" title="Downloads">⬇ {v.downloads || 0}</span>
          <div className="ml-auto flex gap-2">
            {v.buttons?.share?.enabled !== false && (
              <button className="btn-ghost !px-3 !py-2" aria-label="Share" onClick={() => shareVideo(v, toast)}>⤴</button>
            )}
            <button className="btn-primary !py-2 tabular-nums" onClick={() => onOpen(v)}>
              {v.unlocked ? `⬇ ${v.buttons?.download?.label || 'Download'}` : `Task (${done}/${v.taskCount})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { user, config, toast } = useApp();
  const b = config.branding;
  const [tab, setTab] = useState('latest');
  const [q, setQ] = useState('');
  const [videos, setVideos] = useState(null);
  const [active, setActive] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [showNotice, setShowNotice] = useState(() => config.notice?.enabled && !sessionStorage.getItem('tv_notice'));
  const [sponsorOpen, setSponsorOpen] = useState(() => config.sponsor?.enabled && !sessionStorage.getItem('tv_sponsor'));
  const timer = useRef();

  const load = useCallback(async (query = q, sort = tab) => {
    try {
      const d = await api(`/videos?sort=${sort}&q=${encodeURIComponent(query)}`);
      setVideos(d.videos);
    } catch (e) { toast(e.message, 'err'); setVideos([]); }
  }, [q, tab, toast]);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => load(q, tab), q ? 250 : 0);
    return () => clearTimeout(timer.current);
  }, [q, tab]); // eslint-disable-line

  // deep link: t.me/bot/app?startapp=v_<id>
  useEffect(() => {
    const sp = tg()?.initDataUnsafe?.start_param || new URLSearchParams(location.search).get('v');
    const id = sp?.startsWith('v_') ? sp.slice(2) : sp;
    if (id && /^[a-f0-9]{24}$/.test(id)) api(`/videos/${id}`).then((d) => setActive(d.video)).catch(() => {});
  }, []);

  const refreshAfter = () => load(q, tab);

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col pb-28">
      {/* top bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 px-4 pb-2.5 pt-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-extrabold leading-tight">{b.title}</h1>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-mute">
              <span className="truncate">📁 {b.folder}</span>
              <span className="badge bg-good/15 text-good"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-good" />{b.badge}</span>
            </div>
          </div>
          <button onClick={() => setShowProfile(true)} className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-accent bg-card2" aria-label="Profile">
            {user.avatar
              ? <img src={asset(user.avatar)} alt="" className="h-full w-full object-cover" />
              : <span className="grid h-full place-items-center text-sm font-bold">{(user.name || user.email)[0].toUpperCase()}</span>}
          </button>
        </div>
        <Marquee />
        <div className="relative mt-2.5">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute">🔍</span>
          <input className="input !pl-9" placeholder="Search videos & links…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-1 rounded-xl bg-card p-1">
          {[['latest', 'Latest'], ['popular', 'Popular']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`rounded-lg py-2 text-sm font-semibold transition ${tab === k ? 'text-white shadow' : 'text-mute'}`}
              style={tab === k ? { background: 'linear-gradient(135deg,var(--accent),var(--accent2))' } : undefined}>{l}</button>
          ))}
        </div>
      </header>

      {/* feed */}
      <main className="flex-1 space-y-3 px-4 pt-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-mute">
          {tab === 'latest' ? b.latestHeader : b.popularHeader}
        </h2>
        {videos === null && <div className="grid place-items-center py-16"><Spinner /></div>}
        {videos?.length === 0 && <div className="card py-14 text-center text-sm text-mute">{q ? 'No results found' : 'No links yet — check back soon!'}</div>}
        {videos?.map((v) => <VideoCard key={v.id} v={v} onOpen={setActive} toast={toast} />)}
      </main>

      <footer className="px-4 py-6 text-center text-xs text-mute">{b.footer}</footer>

      {/* floating quick-download button */}
      <button onClick={() => setShowFiles(true)}
        className="btn-primary fixed bottom-5 left-1/2 z-30 -translate-x-1/2 !rounded-full !px-6 !py-3.5 shadow-2xl shadow-accent/30">
        ⬇ My Downloads{user.unlockedCount ? ` (${user.unlockedCount})` : ''}
      </button>

      {showNotice && <WelcomeModal onClose={() => { sessionStorage.setItem('tv_notice', '1'); setShowNotice(false); }} />}
      {sponsorOpen && !showNotice && <SponsorOverlay onClose={() => { sessionStorage.setItem('tv_sponsor', '1'); setSponsorOpen(false); }} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} onAdmin={() => { setShowProfile(false); setShowAdmin(true); }} />}
      {showAdmin && user.isAdmin && <AdminPanel onClose={() => { setShowAdmin(false); load(q, tab); }} />}
      {showFiles && <MyFiles onClose={() => setShowFiles(false)} />}
      {active && <TaskModal video={active} onClose={() => { setActive(null); refreshAfter(); }} />}
    </div>
  );
}
