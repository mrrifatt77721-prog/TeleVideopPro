import { tg } from './api.js';

// Set VITE_TG_APP_LINK to e.g. https://t.me/YourBot/app  (Direct Link Mini App URL)
export function videoLink(v) {
  const base = import.meta.env.VITE_TG_APP_LINK;
  return base ? `${base}?startapp=v_${v.id}` : `${location.origin}/?v=${v.id}`;
}

export async function shareVideo(v, toast) {
  const url = videoLink(v);
  const w = tg();
  if (w?.openTelegramLink && /^https:\/\/t\.me\//.test(url)) {
    w.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(v.title)}`);
    return;
  }
  try {
    if (navigator.share) { await navigator.share({ title: v.title, url }); return; }
  } catch { return; }
  try { await navigator.clipboard.writeText(url); toast?.('Link copied'); }
  catch { toast?.(url); }
}

export async function copyLink(v, toast) {
  try { await navigator.clipboard.writeText(videoLink(v)); toast?.('Link copied'); }
  catch { toast?.(videoLink(v)); }
}
