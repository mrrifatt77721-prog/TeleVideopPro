import React, { useRef, useState } from 'react';
import { api, asset, cropToAspect } from '../api.js';
import { useApp } from '../ctx.jsx';
import { Header, Modal, Toggle } from './ui.jsx';

const utc = (d = new Date()) => d.toISOString().slice(0, 10);

function blobToDataUrl(b) {
  return new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });
}

export default function ProfileModal({ onClose, onAdmin }) {
  const { user, setUser, rewards, toast, logout } = useApp();
  const [name, setName] = useState(user.name || '');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef();

  const patch = async (body) => {
    try { const d = await api('/me', { method: 'PATCH', body }); setUser(d.user); return true; }
    catch (e) { toast(e.message, 'err'); return false; }
  };

  const claimedToday = user.streak.lastClaim === utc();
  const yesterday = utc(new Date(Date.now() - 864e5));
  const eff = claimedToday ? user.streak.day : user.streak.lastClaim === yesterday ? (user.streak.day >= 7 ? 0 : user.streak.day) : 0;

  const claim = async () => {
    setBusy(true);
    try {
      const d = await api('/me/checkin', { method: 'POST' });
      setUser(d.user);
      toast(`+${d.reward} points${d.bonusToken ? ' & 1 skip token!' : ''}`);
    } catch (e) { toast(e.message, 'err'); }
    setBusy(false);
  };

  const pickPhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const blob = await cropToAspect(f, 1, 256);
      await patch({ avatar: await blobToDataUrl(blob) });
    } catch (err) { toast(err.message, 'err'); }
    e.target.value = '';
  };

  const stats = [
    ['📂', user.unlockedCount, 'Unlocked files'],
    ['✅', user.tasksDone, 'Tasks completed'],
    ['⭐', user.points, 'Reward points'],
    ['⏭', user.skipTokens, 'Skip tokens'],
  ];

  return (
    <Modal onClose={onClose} full>
      <Header title="Profile & Settings" onClose={onClose} />
      <div className="space-y-4 p-4">
        {/* header */}
        <div className="card flex items-center gap-3 p-4">
          <button onClick={() => fileRef.current.click()} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-accent bg-card2" aria-label="Change photo">
            {user.avatar
              ? <img src={asset(user.avatar)} alt="" className="h-full w-full object-cover" />
              : <span className="grid h-full place-items-center text-2xl font-bold">{(user.name || user.email)[0].toUpperCase()}</span>}
            <span className="absolute inset-x-0 bottom-0 bg-black/60 text-[9px] text-white">EDIT</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickPhoto} />
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="flex gap-2">
                <input className="input !py-1.5" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} autoFocus />
                <button className="btn-primary !px-3 !py-1.5" onClick={async () => { if (await patch({ name })) setEditing(false); }}>Save</button>
              </div>
            ) : (
              <button className="block max-w-full truncate text-left text-base font-bold" onClick={() => setEditing(true)}>{user.name || 'Set your name'} ✎</button>
            )}
            <div className="truncate text-xs text-mute">{user.email}</div>
            <span className="badge mt-1 bg-accent/20 text-accent">{user.isAdmin ? 'Admin' : 'Member'}</span>
          </div>
        </div>

        {/* stats */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map(([i, n, l]) => (
            <div key={l} className="card p-3.5">
              <div className="text-lg">{i}</div>
              <div className="text-2xl font-extrabold">{n}</div>
              <div className="text-xs text-mute">{l}</div>
            </div>
          ))}
        </div>

        {/* daily check-in */}
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold">Daily Check-in</h3>
            <span className="text-xs text-mute">Day 7 = bonus skip token</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {rewards.map((r, idx) => {
              const d = idx + 1;
              const got = d <= eff;
              const next = !claimedToday && d === eff + 1;
              return (
                <button key={d} disabled={!next || busy} onClick={claim}
                  className={`flex flex-col items-center rounded-xl border py-2 text-center transition ${
                    got ? 'border-good/40 bg-good/15 text-good' : next ? 'animate-pulse border-accent bg-accent/15 text-accent' : 'border-line bg-card2 text-mute'}`}>
                  <span className="text-[10px]">D{d}</span>
                  <span className="text-sm">{got ? '✓' : d === 7 ? '🎁' : '⭐'}</span>
                  <span className="text-[10px] font-bold">+{r}</span>
                </button>
              );
            })}
          </div>
          <button className="btn-primary mt-3 w-full" disabled={claimedToday || busy} onClick={claim}>
            {claimedToday ? 'Come back tomorrow' : 'Claim today’s reward'}
          </button>
        </div>

        {/* preferences */}
        <div className="card divide-y divide-line px-4 py-2">
          <Toggle label="Light mode" sub="Switch between light and dark theme"
                  on={user.settings.theme === 'light'}
                  onChange={(v) => patch({ settings: { theme: v ? 'light' : 'dark' } })} />
          <Toggle label="Alerts" sub="Notifications about new links"
                  on={user.settings.alerts} onChange={(v) => patch({ settings: { alerts: v } })} />
        </div>

        {user.isAdmin && <button className="btn-primary w-full" onClick={onAdmin}>🛠 Admin Control Panel</button>}
        <button className="btn-danger w-full" onClick={logout}>Log out</button>
      </div>
    </Modal>
  );
}
