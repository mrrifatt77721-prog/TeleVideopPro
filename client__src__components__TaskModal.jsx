import React, { useEffect, useRef, useState } from 'react';
import { api, asset, openLink } from '../api.js';
import { useApp } from '../ctx.jsx';
import { Header, Modal, Spinner } from './ui.jsx';
import { copyLink, shareVideo } from '../share.js';

function Ring({ fraction, done, children }) {
  const R = 44, C = 2 * Math.PI * R;
  return (
    <div className="relative h-[104px] w-[104px]">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" strokeWidth="7" stroke="var(--card2)" />
        <circle cx="50" cy="50" r={R} fill="none" strokeWidth="7" strokeLinecap="round"
                stroke={done ? '#34d399' : 'var(--accent)'} strokeDasharray={C} strokeDashoffset={C * (1 - fraction)}
                style={{ transition: 'stroke-dashoffset 1s linear, stroke .3s' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export default function TaskModal({ video, onClose }) {
  const { toast, setUser } = useApp();
  const [info, setInfo] = useState(null); // { steps, done, unlocked, skipTokens }
  const [done, setDone] = useState(0);
  const [phase, setPhase] = useState('idle'); // idle | running | ready (retry verify) | done
  const [left, setLeft] = useState(0);
  const [totalCd, setTotalCd] = useState(3);
  const [busy, setBusy] = useState(false);
  const [final, setFinal] = useState(null); // unlock payload
  const tick = useRef();

  const unlock = async () => {
    try { setFinal(await api(`/videos/${video.id}/unlock`, { method: 'POST' })); }
    catch (e) { toast(e.message, 'err'); }
  };

  useEffect(() => {
    api(`/videos/${video.id}/tasks`).then((d) => {
      setInfo(d); setDone(d.done);
      if (d.unlocked) unlock();
    }).catch((e) => { toast(e.message, 'err'); onClose(); });
    return () => { clearInterval(tick.current); clearTimeout(tick.current); };
  }, []); // eslint-disable-line

  const total = info?.steps.length || video.taskCount;
  const step = info?.steps[done];

  const finishTask = (d) => {
    setDone(d.done); setUser(d.user); setPhase('done');
    clearTimeout(tick.current);
    tick.current = setTimeout(onClose, 1100); // "Done!" then the page closes; Home refreshes the Task (n/total) counter
  };

  const verify = async () => {
    setBusy(true);
    try { finishTask(await api(`/videos/${video.id}/tasks/verify`, { method: 'POST', body: { step: done } })); }
    catch (e) { toast(e.message, 'err'); setPhase('ready'); }
    setBusy(false);
  };

  // One task per tap: start -> animated countdown -> auto-verify -> Done -> close
  const start = async () => {
    setBusy(true);
    try {
      await api(`/videos/${video.id}/tasks/start`, { method: 'POST', body: { step: done } });
      openLink(step.link);
      setPhase('running'); setLeft(step.countdown); setTotalCd(step.countdown);
      clearInterval(tick.current);
      let x = step.countdown;
      tick.current = setInterval(() => {
        x -= 1; setLeft(x);
        if (x <= 0) { clearInterval(tick.current); verify(); }
      }, 1000);
    } catch (e) { toast(e.message, 'err'); }
    setBusy(false);
  };

  const skip = async () => {
    setBusy(true);
    try {
      clearInterval(tick.current);
      const d = await api(`/videos/${video.id}/tasks/skip`, { method: 'POST' });
      setInfo((i) => ({ ...i, skipTokens: d.user.skipTokens }));
      finishTask(d);
    } catch (e) { toast(e.message, 'err'); }
    setBusy(false);
  };

  const btn = video.buttons || {};
  const isMp4 = final && (final.sourceType === 'file' || /\.mp4(\?|$)/i.test(final.sourceUrl || ''));

  return (
    <Modal onClose={onClose}>
      <Header title={final ? 'Unlocked 🎉' : 'Unlock this file'} onClose={onClose} />
      <div className="space-y-4 p-4">
        <div className="card flex items-center gap-3 p-2.5">
          <div className="h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-card2">
            {video.thumbnail && <img src={asset(video.thumbnail)} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0">
            <div className="line-clamp-2 text-sm font-bold">{video.title}</div>
            {video.duration && <div className="text-xs text-mute">{video.duration}</div>}
          </div>
        </div>

        {!info && <div className="grid place-items-center py-8"><Spinner /></div>}

        {info && !final && (
          <>
            <div className="flex justify-center gap-1.5">
              {info.steps.map((_, i) => (
                <i key={i} className={`h-1.5 w-6 rounded-full transition-all ${i < done || (phase === 'done' && i === done - 1) ? 'bg-good' : i === done ? 'bg-accent/50' : 'bg-card2'}`} />
              ))}
            </div>

            <div className="card relative flex flex-col items-center gap-1.5 overflow-hidden px-4 pb-5 pt-6 text-center"
                 style={{ background: 'linear-gradient(160deg,color-mix(in srgb,var(--accent) 14%,var(--card)),color-mix(in srgb,var(--accent2) 12%,var(--card)))' }}>
              <span className="absolute left-3 top-2.5 rounded-md bg-card2 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-mute">AD</span>
              {phase === 'idle' || phase === 'ready' ? (
                <>
                  <div className="grid h-16 w-16 place-items-center rounded-2xl text-2xl text-white shadow-lg" style={{ background: 'linear-gradient(135deg,var(--accent),var(--accent2))' }}>
                    {video.taskType === 'telegram' ? '✈' : '🔗'}
                  </div>
                  <h4 className="mt-1 text-base font-extrabold">Task {Math.min(done + 1, total)} of {total}</h4>
                  <p className="max-w-full truncate text-sm text-mute">{step?.label}</p>
                </>
              ) : (
                <>
                  <Ring fraction={phase === 'done' ? 1 : 1 - left / totalCd} done={phase === 'done'}>
                    {phase === 'done'
                      ? <span className="grid h-14 w-14 animate-pop place-items-center rounded-full bg-good text-3xl text-white">✓</span>
                      : <b className="text-4xl font-extrabold tabular-nums">{left}</b>}
                  </Ring>
                  <h4 className="text-base font-extrabold">{phase === 'done' ? 'Done!' : 'Watching partner ad…'}</h4>
                  <p className="text-sm text-mute">{phase === 'done' ? `Task ${done} of ${total} completed` : `Task ${done + 1} of ${total} · please wait`}</p>
                </>
              )}
            </div>

            {step && (phase === 'idle' || phase === 'ready') && (
              <div className="space-y-2">
                {phase === 'idle' && (
                  <button className="btn-primary w-full" disabled={busy} onClick={start}>
                    {video.taskType === 'telegram' ? '✈ Join & start task' : '▶ Start task'} {done + 1}
                  </button>
                )}
                {phase === 'ready' && <button className="btn-primary w-full" disabled={busy} onClick={verify}>✓ Verify task {done + 1}</button>}
                {phase === 'ready' && <button className="w-full text-xs text-mute" onClick={() => openLink(step.link)}>Open link again</button>}
                {phase === 'idle' && <p className="text-center text-xs text-mute">Complete one task now. Tap Task again on the card for the next one.</p>}
                {phase === 'idle' && info.skipTokens > 0 && (
                  <button className="btn-ghost w-full" disabled={busy} onClick={skip}>⏭ Use a skip token ({info.skipTokens} left)</button>
                )}
              </div>
            )}
          </>
        )}

        {final && (
          <div className="space-y-3">
            {isMp4 && <video src={asset(final.sourceUrl)} controls playsInline className="w-full rounded-xl bg-black" />}
            {btn.download?.enabled !== false && (
              <button className="btn-primary w-full" onClick={() => openLink(final.destinationUrl)}>⬇ {btn.download?.label || 'Download'}</button>
            )}
            {btn.telegram?.enabled && btn.telegram.url && (
              <button className="btn-ghost w-full" onClick={() => openLink(btn.telegram.url)}>✈ {btn.telegram.label || 'Join Telegram'}</button>
            )}
            {btn.share?.enabled !== false && (
              <div className="grid grid-cols-2 gap-2">
                <button className="btn-ghost" onClick={() => shareVideo(video, toast)}>⤴ {btn.share?.label || 'Share'}</button>
                <button className="btn-ghost" onClick={() => copyLink(video, toast)}>⧉ Copy link</button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
