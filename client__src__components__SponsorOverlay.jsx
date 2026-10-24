import React, { useEffect, useState } from 'react';
import { asset, openLink } from '../api.js';
import { useApp } from '../ctx.jsx';

export default function SponsorOverlay({ onClose }) {
  const { config } = useApp();
  const s = config.sponsor;
  const [left, setLeft] = useState(Math.max(1, s.seconds || 5));
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-5 animate-fade">
      <div className="card animate-pop w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <span className="badge bg-warn/15 text-warn">Sponsored</span>
          <button disabled={left > 0} onClick={onClose}
                  className="rounded-full bg-card2 px-3 py-1 text-xs font-semibold disabled:text-mute">
            {left > 0 ? `Skip in ${left}s` : 'Close ✕'}
          </button>
        </div>
        <button className="block w-full" onClick={() => openLink(s.url)}>
          {s.image && <img src={asset(s.image)} alt="" className="aspect-video w-full object-cover" />}
          {s.title && <div className="p-4 text-center text-base font-bold">{s.title}</div>}
        </button>
        {s.url && <div className="px-4 pb-4"><button className="btn-primary w-full" onClick={() => openLink(s.url)}>Learn more</button></div>}
      </div>
    </div>
  );
}
