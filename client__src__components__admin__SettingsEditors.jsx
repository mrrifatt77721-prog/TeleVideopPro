import React, { useRef, useState } from 'react';
import { api, asset, cropToAspect, uploadFile } from '../../api.js';
import { useApp } from '../../ctx.jsx';
import { Field, Toggle } from '../ui.jsx';

function useSection(key) {
  const { config, setConfig, toast } = useApp();
  const [d, setD] = useState({ ...config[key] });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setD((s) => ({ ...s, [k]: v }));
  const save = async () => {
    setBusy(true);
    try {
      const r = await api('/config', { method: 'PUT', body: { [key]: d } });
      setConfig(r.config); toast('Saved ✓');
    } catch (e) { toast(e.message, 'err'); }
    setBusy(false);
  };
  return { d, set, save, busy, toast };
}

function ImagePicker({ label, value, onChange, toast }) {
  const ref = useRef();
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try { onChange(await uploadFile(await cropToAspect(f, 16 / 9), 'img.jpg')); }
    catch (err) { toast(err.message, 'err'); }
    setBusy(false); e.target.value = '';
  };
  return (
    <div className="space-y-2">
      <span className="label">{label}</span>
      {value && <img src={asset(value)} alt="" className="aspect-video w-full rounded-xl object-cover" />}
      <input ref={ref} type="file" accept="image/*" hidden onChange={pick} />
      <div className="flex gap-2">
        <button type="button" className="btn-ghost flex-1" disabled={busy} onClick={() => ref.current.click()}>{busy ? 'Uploading…' : 'Upload image'}</button>
        {value && <button type="button" className="btn-danger" onClick={() => onChange('')}>Remove</button>}
      </div>
      <input className="input" placeholder="…or image URL" value={value?.startsWith('/uploads') ? '' : value || ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

const Save = ({ busy, onClick }) => <button className="btn-primary w-full" disabled={busy} onClick={onClick}>{busy ? 'Saving…' : 'Save changes'}</button>;

export function NoticeEditor() {
  const m = useSection('marquee');
  const n = useSection('notice');
  return (
    <div className="space-y-5">
      <section className="card space-y-3 p-4">
        <h3 className="text-sm font-bold">Marquee banner</h3>
        <Toggle label="Show scrolling headline" on={m.d.enabled} onChange={(v) => m.set('enabled', v)} />
        <Field label="Scrolling text"><textarea className="input min-h-[70px]" value={m.d.text || ''} onChange={(e) => m.set('text', e.target.value)} /></Field>
        <Save busy={m.busy} onClick={m.save} />
      </section>
      <section className="card space-y-3 p-4">
        <h3 className="text-sm font-bold">Welcome notice popup</h3>
        <Toggle label="Show on app open" on={n.d.enabled} onChange={(v) => n.set('enabled', v)} />
        <ImagePicker label="Thumbnail image" value={n.d.image} onChange={(v) => n.set('image', v)} toast={n.toast} />
        <Field label="Badge"><input className="input" value={n.d.badge || ''} onChange={(e) => n.set('badge', e.target.value)} /></Field>
        <Field label="Title"><input className="input" value={n.d.title || ''} onChange={(e) => n.set('title', e.target.value)} /></Field>
        <Field label="Message"><textarea className="input min-h-[80px]" value={n.d.message || ''} onChange={(e) => n.set('message', e.target.value)} /></Field>
        <Field label="Button label"><input className="input" value={n.d.linkLabel || ''} onChange={(e) => n.set('linkLabel', e.target.value)} /></Field>
        <Field label="Button link (optional)"><input className="input" value={n.d.linkUrl || ''} onChange={(e) => n.set('linkUrl', e.target.value)} placeholder="https://…" /></Field>
        <Save busy={n.busy} onClick={n.save} />
      </section>
    </div>
  );
}

export function BrandingEditor() {
  const b = useSection('branding');
  const fields = [
    ['title', 'Top bar title'], ['folder', 'Folder / channel name'], ['badge', 'Status badge'],
    ['latestHeader', '“Latest” section header'], ['popularHeader', '“Popular” section header'], ['footer', 'Footer text'],
  ];
  return (
    <section className="card space-y-3 p-4">
      <h3 className="text-sm font-bold">App UI & branding</h3>
      {fields.map(([k, l]) => (
        <Field key={k} label={l}><input className="input" value={b.d[k] || ''} onChange={(e) => b.set(k, e.target.value)} /></Field>
      ))}
      <Toggle label="Allow pinch-to-zoom" sub="Lets users zoom the app with two fingers" on={!!b.d.pinchZoom} onChange={(v) => b.set('pinchZoom', v)} />
      <Save busy={b.busy} onClick={b.save} />
    </section>
  );
}

export function SponsorEditor() {
  const s = useSection('sponsor');
  return (
    <section className="card space-y-3 p-4">
      <h3 className="text-sm font-bold">Sponsor / ad setup</h3>
      <Toggle label="Show sponsor on app open" on={!!s.d.enabled} onChange={(v) => s.set('enabled', v)} />
      <ImagePicker label="Sponsor banner image" value={s.d.image} onChange={(v) => s.set('image', v)} toast={s.toast} />
      <Field label="Sponsor title"><input className="input" value={s.d.title || ''} onChange={(e) => s.set('title', e.target.value)} /></Field>
      <Field label="Target URL"><input className="input" value={s.d.url || ''} onChange={(e) => s.set('url', e.target.value)} placeholder="https://…" /></Field>
      <Field label="Display duration (seconds before skip)"><input type="number" min="1" max="60" className="input" value={s.d.seconds || 5} onChange={(e) => s.set('seconds', Number(e.target.value))} /></Field>
      <Save busy={s.busy} onClick={s.save} />
    </section>
  );
}
