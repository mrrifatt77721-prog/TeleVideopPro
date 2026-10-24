import React, { useEffect, useState } from 'react';
import { api, asset, openLink } from '../api.js';
import { useApp } from '../ctx.jsx';
import { Header, Modal, Spinner } from './ui.jsx';

export default function MyFiles({ onClose }) {
  const { toast } = useApp();
  const [files, setFiles] = useState(null);
  const [busy, setBusy] = useState('');

  useEffect(() => { api('/me/files').then((d) => setFiles(d.videos)).catch((e) => { toast(e.message, 'err'); setFiles([]); }); }, []); // eslint-disable-line

  const dl = async (f) => {
    setBusy(f.id);
    try { const d = await api(`/videos/${f.id}/unlock`, { method: 'POST' }); openLink(d.destinationUrl); }
    catch (e) { toast(e.message, 'err'); }
    setBusy('');
  };

  return (
    <Modal onClose={onClose}>
      <Header title="My Downloads" onClose={onClose} />
      <div className="space-y-2 p-4">
        {files === null && <div className="grid place-items-center py-10"><Spinner /></div>}
        {files?.length === 0 && <p className="py-10 text-center text-sm text-mute">Unlocked files will appear here. Complete a video's tasks to unlock it.</p>}
        {files?.map((f) => (
          <div key={f.id} className="card flex items-center gap-3 p-2.5">
            <div className="h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-card2">
              {f.thumbnail && <img src={asset(f.thumbnail)} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{f.title}</div>
              {f.duration && <div className="text-xs text-mute">{f.duration}</div>}
            </div>
            <button className="btn-primary !px-3 !py-2" disabled={busy === f.id} onClick={() => dl(f)}>⬇</button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
