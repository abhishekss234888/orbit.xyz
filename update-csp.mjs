// Run before every deploy:  node update-csp.mjs
// Adds a SHA-256 hash of each inline <script>/<style> in your pages to the Content-Security-Policy in
// firebase.json, so the site can run WITHOUT 'unsafe-inline'. Edit a page (PIN, config...) -> run this again.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const hash = (s) => `'sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}'`;
const inline = (html, tag) => [...html.matchAll(new RegExp(`<${tag}(?![^>]*\\bsrc=)[^>]*>([\\s\\S]*?)</${tag}>`, 'g'))]
  .map((m) => m[1]).filter((s) => s.trim()).map(hash);
const csp = (file) => {
  const html = readFileSync(file, 'utf8');
  return [
    "default-src 'none'",
    `script-src 'self' https://www.gstatic.com ${inline(html, 'script').join(' ')}`.trim(),
    `style-src 'self' ${inline(html, 'style').join(' ')}`.trim(),
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebasedatabase.app wss://*.firebasedatabase.app",
    "img-src 'self' data:", "manifest-src 'self'", "worker-src 'self'", "object-src 'none'",
    "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'"
  ].join('; ');
};
const cfg = JSON.parse(readFileSync('firebase.json', 'utf8'));
const pages = { '/': 'index.html', '/index.html': 'index.html', '/main.html': 'main.html' };
cfg.hosting.headers = cfg.hosting.headers.filter((h) => !(h.source in pages));
for (const [source, file] of Object.entries(pages)) {
  cfg.hosting.headers.push({ source, headers: [{ key: 'Content-Security-Policy', value: csp(file) }] });
}
writeFileSync('firebase.json', JSON.stringify(cfg, null, 2) + '\n');
console.log('CSP hashes updated for', Object.values(pages).filter((v, i, a) => a.indexOf(v) === i).join(', '));
