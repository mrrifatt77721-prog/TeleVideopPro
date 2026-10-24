import React, { useRef, useState } from 'react';
import { api, asset, cropToAspect, uploadFile } from '../../api.js';
import { useApp } from '../../ctx.jsx';
import { Field, Toggle } from '../ui.jsx';

const ASPECTS = { '16:9': 16 / 9, '4:3': 4 / 3, '1:1': 1 };

const blank = {
  title: '', description: '', duration: '', sourceType: 'link', sourceUrl: '',
  thumbnail: '', thumbAspect: '16:9', taskType: 'ads', taskCount: 3, countdown: 3,
  adLinks: [], channels: [], destinationUrl: '', reward: 10,
  buttons: {
    download: { enabled: true, label: 'Download' },
    telegram: { enabled: false, label: 'Join Telegram', url: '' },
    share: { enabled: true, label: 'Share' },
  },
};

const merge = (init) => ({
  ...blank, ...(init || {}),
  buttons: {
    download: { ...blank.buttons.download, ...init?.buttons?.download },
    telegram: { ...blank.buttons.telegram, ...init?.buttons?.telegram },
    share: { ...blank.buttons.share, ...init?.buttons?.share },
  },
});

export default function VideoForm({ initial, onSaved, onCancel }) {
  const { toast } = useApp();
  const [f, setF] = useState(() => merge(initial));
  const [busy, setBusy] = useState('');
  const [thumbFile, setThumbFile] = useState(null);
  const vidRef = useRef();
  const thumbRef = useRef();
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const setBtn = (k, patch) => setF((s) => ({ ...s, buttons: { ...s.buttons, [k]: { ...s.buttons[k], ...patch } } }));

  const doThumb = async (file, aspect) => {
    setBusy('thumb');
    try {
      const blob = await cropToAspect(file, ASPECTS[aspect]);
      set('thumbnail', await uploadFile(blob, 'thumb.jpg'));
    } catch (e) { toast(e.message, 'err'); }
    setBusy('');
  };
  const pickThumb = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbFile(file); doThumb(file, f.thumbAspect);
    e.target.value = '';
  };
  const changeAspect = (a) => { set('thumbAspect', a); if (thumbFile) doThumb(thumbFile, a); };

  const pickVideo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy('video');
    try { set('sourceUrl', await uploadFile(file, file.name)); toast('Video uploaded'); }
    catch (err) { toast(err.message, 'err'); }
    setBusy('');
    e.target.value = '';
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!f.title.trim()) return toast('Title is required', 'err');
    if (f.taskType === 'telegram' && !f.channels.length) return toast('Add at least one Telegram channel', 'err');
    if (!f.destinationUrl && !f.sourceUrl) return toast('Add a destination link or video source', 'err');
    setBusy('save');
    try {
      const body = { ...f, taskCount: Number(f.taskCount), countdown: Number(f.countdown), reward: Number(f.reward) };
      delete body._id; delete body.__v; delete body.views; delete body.downloads; delete body.createdAt; delete body.updatedAt; delete body.id;
      if (initial) await api(`/admin/videos/${initial._id}`, { method: 'PUT', body });
      else await api('/admin/videos', { method: 'POST', body });
      toast(initial ? 'Video updated ✓' : 'Video published to feed 🎉');
      if (!initial) { setF(merge(null)); setThumbFile(null); }
      onSaved?.();
    } catch (err) { toast(err.message, 'err'); }
    setBusy('');
  };

  const chan = (i, patch) => set('channels', f.channels.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  return (
    <form onSubmit={submit} className="space-y-4">
      <h3 className="text-sm font-bold">{initial ? 'Edit video' : 'Upload & configure video'}</h3>

      <Field label="Video title *"><input className="input" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Weekend special mix" /></Field>
      <Field label="Description / subtitle"><input className="input" value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
      <Field label="Duration"><input className="input" value={f.duration} onChange={(e) => set('duration', e.target.value)} placeholder="12:34" /></Field>

      {/* source */}
      <div className="card space-y-3 p-3">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-card2 p-1">
          {[['file', 'MP4 upload'], ['link', 'Stream link']].map(([k, l]) => (
            <button type="button" key={k} onClick={() => set('sourceType', k)}
              className={`rounded-lg py-1.5 text-xs font-semibold ${f.sourceType === k ? 'bg-accent text-white' : 'text-mute'}`}>{l}</button>
          ))}
        </div>
        {f.sourceType === 'file' ? (
          <>
            <input ref={vidRef} type="file" accept="video/mp4" hidden onChange={pickVideo} />
            <button type="button" className="btn-ghost w-full" disabled={busy === 'video'} onClick={() => vidRef.current.click()}>
              {busy === 'video' ? 'Uploading…' : f.sourceUrl ? '✓ Replace MP4' : 'Choose MP4 file'}
            </button>
            {f.sourceUrl && <p className="truncate text-[11px] text-mute">{f.sourceUrl}</p>}
          </>
        ) : (
          <Field label="Google Drive / direct URL"><input className="input" value={f.sourceUrl} onChange={(e) => set('sourceUrl', e.target.value)} placeholder="https://drive.google.com/…" /></Field>
        )}
      </div>

      {/* thumbnail */}
      <div className="card space-y-3 p-3">
        <div className="flex items-center justify-between">
          <span className="label !mb-0">Thumbnail</span>
          <div className="flex gap-1">
            {Object.keys(ASPECTS).map((a) => (
              <button type="button" key={a} onClick={() => changeAspect(a)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${f.thumbAspect === a ? 'bg-accent text-white' : 'bg-card2 text-mute'}`}>{a}</button>
            ))}
          </div>
        </div>
        <div className="grid place-items-center overflow-hidden rounded-xl bg-card2 text-xs text-mute" style={{ aspectRatio: f.thumbAspect.replace(':', ' / ') }}>
          {f.thumbnail ? <img src={asset(f.thumbnail)} alt="" className="h-full w-full object-cover" /> : 'No image'}
        </div>
        <input ref={thumbRef} type="file" accept="image/*" hidden onChange={pickThumb} />
        <button type="button" className="btn-ghost w-full" disabled={busy === 'thumb'} onClick={() => thumbRef.current.click()}>
          {busy === 'thumb' ? 'Processing…' : 'Choose from gallery (auto-crops)'}
        </button>
        <Field label="…or custom image URL"><input className="input" value={f.thumbnail.startsWith('/uploads') ? '' : f.thumbnail} onChange={(e) => set('thumbnail', e.target.value)} placeholder="https://…" /></Field>
      </div>

      {/* tasks */}
      <div className="card space-y-3 p-3">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-card2 p-1">
          {[['ads', 'Normal ad steps'], ['telegram', 'Telegram join']].map(([k, l]) => (
            <button type="button" key={k} onClick={() => set('taskType', k)}
              className={`rounded-lg py-1.5 text-xs font-semibold ${f.taskType === k ? 'bg-accent text-white' : 'text-mute'}`}>{l}</button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {f.taskType === 'ads' && <Field label="Tasks (1-10)"><input type="number" min="1" max="10" className="input" value={f.taskCount} onChange={(e) => set('taskCount', e.target.value)} /></Field>}
          <Field label="Countdown (s)"><input type="number" min="1" max="60" className="input" value={f.countdown} onChange={(e) => set('countdown', e.target.value)} /></Field>
          <Field label="Reward pts"><input type="number" min="0" className="input" value={f.reward} onChange={(e) => set('reward', e.target.value)} /></Field>
        </div>
        {f.taskType === 'ads' && (
          <Field label="Partner task links (one per line, optional)" hint="Each step opens the matching line. Falls back to the first line, then the sponsor link.">
            <textarea className="input min-h-[80px]" value={f.adLinks.join('\n')} onChange={(e) => set('adLinks', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} placeholder="https://partner.example/1" />
          </Field>
        )}
        {f.taskType === 'telegram' && (
          <div className="space-y-2">
            <span className="label">Required Telegram channels</span>
            {f.channels.map((c, i) => (
              <div key={i} className="space-y-1.5 rounded-xl border border-line p-2.5">
                <div className="flex gap-2">
                  <input className="input" placeholder="Channel name" value={c.name || ''} onChange={(e) => chan(i, { name: e.target.value })} />
                  <button type="button" className="btn-danger !px-3" onClick={() => set('channels', f.channels.filter((_, j) => j !== i))}>✕</button>
                </div>
                <input className="input" placeholder="Invite link https://t.me/…" value={c.link || ''} onChange={(e) => chan(i, { link: e.target.value })} />
                <input className="input" placeholder="@channelusername (for real membership check, optional)" value={c.chatId || ''} onChange={(e) => chan(i, { chatId: e.target.value })} />
              </div>
            ))}
            <button type="button" className="btn-ghost w-full" onClick={() => set('channels', [...f.channels, { name: '', link: '', chatId: '' }])}>＋ Add channel</button>
          </div>
        )}
      </div>

      <Field label="Destination download link" hint="Revealed only after the user completes all tasks.">
        <input className="input" value={f.destinationUrl} onChange={(e) => set('destinationUrl', e.target.value)} placeholder="https://…" />
      </Field>

      {/* buttons */}
      <div className="card space-y-2 p-3">
        <span className="label">Video player buttons</span>
        <Toggle label="Download button" on={f.buttons.download.enabled} onChange={(v) => setBtn('download', { enabled: v })} />
        {f.buttons.download.enabled && <input className="input" value={f.buttons.download.label} onChange={(e) => setBtn('download', { label: e.target.value })} placeholder="Button label" />}
        <Toggle label="Telegram join button" on={f.buttons.telegram.enabled} onChange={(v) => setBtn('telegram', { enabled: v })} />
        {f.buttons.telegram.enabled && (
          <div className="space-y-2">
            <input className="input" value={f.buttons.telegram.label} onChange={(e) => setBtn('telegram', { label: e.target.value })} placeholder="Button label" />
            <input className="input" value={f.buttons.telegram.url || ''} onChange={(e) => setBtn('telegram', { url: e.target.value })} placeholder="https://t.me/…" />
          </div>
        )}
        <Toggle label="Share / copy button" on={f.buttons.share.enabled} onChange={(v) => setBtn('share', { enabled: v })} />
        {f.buttons.share.enabled && <input className="input" value={f.buttons.share.label} onChange={(e) => setBtn('share', { label: e.target.value })} placeholder="Button label" />}
      </div>

      <div className="flex gap-2">
        {onCancel && <button type="button" className="btn-ghost flex-1" onClick={onCancel}>Cancel</button>}
        <button className="btn-primary flex-[2]" disabled={!!busy}>{busy === 'save' ? 'Saving…' : initial ? 'Save changes' : '🚀 Publish video to feed'}</button>
      </div>
    </form>
  );
}
