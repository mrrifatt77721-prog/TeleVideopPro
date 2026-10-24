const BASE = import.meta.env.VITE_API_URL || '/api';
const ORIGIN = BASE.startsWith('http') ? BASE.replace(/\/api$/, '') : '';
let token = localStorage.getItem('tv_token');

export const getToken = () => token;
export const setToken = (t) => {
  token = t;
  if (t) localStorage.setItem('tv_token', t);
  else localStorage.removeItem('tv_token');
};
// make server-relative upload paths absolute when API is hosted elsewhere
export const asset = (u) => (u && u.startsWith('/uploads') ? ORIGIN + u : u);

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = { 'X-Tg-Init': window.Telegram?.WebApp?.initData || '' };
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(BASE + path, { method, headers, body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token && !path.startsWith('/auth')) { setToken(null); location.reload(); }
    throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status });
  }
  return data;
}

export async function uploadFile(blob, name = 'file') {
  const f = new FormData();
  f.append('file', blob, name);
  const { url } = await api('/upload', { method: 'POST', form: f });
  return url;
}

// center-crop an image File to an aspect ratio (e.g. 16/9) and return a JPEG Blob
export function cropToAspect(file, ratio, maxW = 1280) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w / h > ratio) w = h * ratio; else h = w / ratio;
      const sx = (img.width - w) / 2, sy = (img.height - h) / 2;
      const scale = Math.min(1, maxW / w);
      const c = document.createElement('canvas');
      c.width = Math.round(w * scale); c.height = Math.round(h * scale);
      c.getContext('2d').drawImage(img, sx, sy, w, h, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Crop failed'))), 'image/jpeg', 0.88);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('Could not read image'));
    img.src = URL.createObjectURL(file);
  });
}

export const tg = () => window.Telegram?.WebApp;
export function openLink(url) {
  if (!url) return;
  const w = tg();
  if (w && /^https?:\/\/(t\.me|telegram\.me)\//.test(url) && w.openTelegramLink) w.openTelegramLink(url);
  else if (w?.openLink) w.openLink(url);
  else window.open(url, '_blank', 'noopener');
}
