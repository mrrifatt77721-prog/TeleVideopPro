import React, { useEffect, useState } from 'react';
import { api, asset } from '../../api.js';
import { useApp } from '../../ctx.jsx';
import { Spinner } from '../ui.jsx';

export default function ManageVideos({ onEdit }) {
  const { toast } = useApp();
  const [videos, setVideos] = useState(null);
  const [stats, setStats] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    try {
      const [v, s] = await Promise.all([api('/admin/videos'), api('/admin/stats')]);
      setVideos(v.videos); setStats(s);
    } catch (e) { toast(e.message, 'err'); setVideos([]); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const del = async (v) => {
    try { await api(`/admin/videos/${v._id}`, { method: 'DELETE' }); toast('Video deleted'); setConfirm(null); load(); }
    catch (e) { toast(e.message, 'err'); }
  };

  return (
    <div className="space-y-3">
      {stats && (
        <div className="grid grid-cols-4 gap-2">
          {[['Users', stats.users], ['Videos', stats.videos], ['Views', stats.views], ['Downloads', stats.downloads]].map(([l, n]) => (
            <div key={l} className="card p-2 text-center">
              <div className="text-lg font-extrabold">{n}</div>
              <div className="text-[10px] text-mute">{l}</div>
            </div>
          ))}
        </div>
      )}
      {videos === null && <div className="grid place-items-center py-10"><Spinner /></div>}
      {videos?.length === 0 && <p className="py-10 text-center text-sm text-mute">No videos uploaded yet.</p>}
      {videos?.map((v) => (
        <div key={v._id} className="card flex items-center gap-3 p-2.5">
          <div className="h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-card2">
            {v.thumbnail && <img src={asset(v.thumbnail)} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{v.title}</div>
            <div className="text-[11px] text-mute">
              {v.taskType === 'telegram' ? `${v.channels.length} channels` : `${v.taskCount} tasks`} · 👁 {v.views} · ⬇ {v.downloads}
            </div>
          </div>
          {confirm === v._id ? (
            <div className="flex gap-1.5">
              <button className="btn-danger !px-2.5 !py-1.5 text-xs" onClick={() => del(v)}>Delete</button>
              <button className="btn-ghost !px-2.5 !py-1.5 text-xs" onClick={() => setConfirm(null)}>No</button>
            </div>
          ) : (
            <div className="flex gap-1.5">
              <button className="btn-ghost !px-2.5 !py-1.5" aria-label="Edit" onClick={() => onEdit(v)}>✎</button>
              <button className="btn-danger !px-2.5 !py-1.5" aria-label="Delete" onClick={() => setConfirm(v._id)}>🗑</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
