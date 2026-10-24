import React, { useState } from 'react';
import { useApp } from '../ctx.jsx';

export default function Marquee() {
  const { config } = useApp();
  const [paused, setPaused] = useState(false);
  const m = config.marquee;
  if (!m?.enabled || !m.text) return null;
  return (
    <div className="mt-2.5 flex items-center gap-2 overflow-hidden rounded-xl border border-line bg-card px-2.5 py-1.5">
      <span className="shrink-0 text-sm">📢</span>
      <div className="relative min-w-0 flex-1 overflow-hidden whitespace-nowrap text-xs font-medium">
        <span className="inline-block animate-marquee" style={{ animationPlayState: paused ? 'paused' : 'running' }}>{m.text}</span>
      </div>
      <button onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Play ticker' : 'Pause ticker'}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-card2 text-[10px] text-mute">
        {paused ? '▶' : '❚❚'}
      </button>
    </div>
  );
}
