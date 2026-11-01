const routes = [];
let outlet, sheets;
let base = { key: '', route: null };
let sheet = null, token = 0, idx = -1, replacing = false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// route('/chats/:chatId', { guard, render, leave, onQuery, sheet })
// guard(ctx) -> falsy to allow, or a path string to redirect to.
// sheet: (params) => basePath. Marks the route as an overlay that renders into the sheet host
// and mounts its base view first on deep links. Register specific patterns before parametric ones.
export function route(pattern, opts) {
  const keys = [];
  const src = pattern
    .replace(/\/:([A-Za-z]+)/g, (_, k) => (keys.push(k), '/([^/]+)'))
    .replace(/\/\*$/, '/.*');
  routes.push({ pattern, re: new RegExp(`^${src}/?$`), keys, ...opts });
}

export function parse(hash = location.hash) {
  const [p, q = ''] = hash.replace(/^#/, '').split('?');
  return { path: '/' + p.replace(/^\/+|\/+$/g, ''), query: Object.fromEntries(new URLSearchParams(q)) };
}

export function navigate(path, replace = false) {
  const h = '#' + path;
  if (location.hash === h) return resolve();
  if (replace) { replacing = true; location.replace(h); } else location.hash = h;
}

export const back = (fallback = '/chats') => (idx > 0 ? history.back() : navigate(fallback, true));

function stamp() {
  if (history.state?.i == null) {
    if (!replacing) idx++;
    history.replaceState({ i: idx }, '');
  } else idx = history.state.i;
  replacing = false;
}

const fade = (from, to, ms) =>
  outlet.animate([{ opacity: from }, { opacity: to }], { duration: ms, easing: 'cubic-bezier(0.4,0,0.2,1)', fill: 'forwards' }).finished;

async function closeSheet() {
  if (!sheet) return;
  const s = sheet; sheet = null;
  await s.leave?.();
  sheets.replaceChildren();
}

async function mountBase(r, ctx, my) {
  const key = r.pattern + JSON.stringify(ctx.params);
  if (base.key === key) { r.onQuery?.(ctx); return; }
  if (base.route) {
    await fade(1, 0, 100);
    if (my !== token) return;
    await base.route.leave?.();
  }
  outlet.replaceChildren();
  base = { key, route: r };
  await r.render({ ...ctx, outlet });
  if (my === token) { await fade(0, 1, 140); outlet.getAnimations().forEach((a) => a.cancel()); }
}

async function resolve() {
  const my = ++token;
  stamp();
  const { path, query } = parse();
  const r = routes.find((x) => x.re.test(path));
  if (!r) return navigate('/404', true);
  const m = r.re.exec(path), params = {};
  r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
  const ctx = { path, query, params };
  const to = await r.guard?.(ctx);
  if (my !== token) return;
  if (to) return navigate(to, true);
  if (r.sheet) {
    if (!base.route) {
      const bp = r.sheet(params), b = routes.find((x) => x.re.test(bp));
      if (b) await mountBase(b, { path: bp, query: {}, params: {} }, my);
      if (my !== token) return;
    }
    await closeSheet();
    if (my !== token) return;
    sheet = r;
    await r.render({ ...ctx, outlet: sheets });
    return;
  }
  await closeSheet();
  if (my !== token) return;
  await mountBase(r, ctx, my);
}

export function start(outletEl, sheetHost) {
  outlet = outletEl; sheets = sheetHost;
  addEventListener('hashchange', resolve);
  resolve();
}
