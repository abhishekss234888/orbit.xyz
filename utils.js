export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const isMobile = () => matchMedia('(max-width: 767px)').matches;

export function debounce(fn, ms = 200) {
  let t;
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.cancel = () => clearTimeout(t);
  return d;
}

export function throttle(fn, ms = 500) {
  let last = 0, t;
  return (...a) => {
    const wait = ms - (Date.now() - last);
    clearTimeout(t);
    if (wait <= 0) { last = Date.now(); fn(...a); }
    else t = setTimeout(() => { last = Date.now(); fn(...a); }, wait);
  };
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

// Normalises user text: strips control chars and bidi-override tricks, keeps ZWJ so emoji sequences survive.
export function sanitizeText(s, max = 4000) {
  return String(s ?? '')
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B\u200C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

export function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const monthDay = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const full = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

export function timeAgo(ts, now = Date.now()) {
  const ms = ts?.toMillis?.() ?? (ts instanceof Date ? ts.getTime() : Number(ts));
  if (!ms) return '';
  const s = Math.max(0, (now - ms) / 1000), d = new Date(ms);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 172800) return 'Yesterday';
  if (s < 604800) return weekday.format(d);
  return (d.getFullYear() === new Date(now).getFullYear() ? monthDay : full).format(d);
}
