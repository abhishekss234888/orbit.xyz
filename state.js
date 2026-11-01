export const defaults = () => ({
  user: null,            // Firebase user snapshot { uid, email, emailVerified }
  profile: null,         // /users/{uid} document data
  authReady: false,
  online: navigator.onLine,
  chats: { items: [], loaded: false, tab: 'direct', query: '' },
  chatIndex: {},         // chatId -> { unreadCount, muted, pinned, lastReadAt }
  blocked: {},           // targetUid -> true
  presence: {},          // uid -> { state, at }
  typing: {},            // chatId -> { uid: { typing, at } }
  activeChatId: null,
  settings: { theme: 'dark', fontScale: 1, notifications: true },
  ui: { sheet: null, toasts: [] }
});

let state = defaults();
const subs = new Set();

const read = (obj, keys) => keys.reduce((o, k) => (o == null ? undefined : o[k]), obj);
const assoc = (obj, keys, val) => {
  if (!keys.length) return val;
  const [k, ...rest] = keys;
  return { ...obj, [k]: assoc(obj?.[k], rest, val) };
};

export const get = (path = '') => (path ? read(state, path.split('.')) : state);

export function set(path, value) {
  const next = typeof value === 'function' ? value(get(path)) : value;
  if (Object.is(next, get(path))) return;
  state = assoc(state, path.split('.'), next);
  for (const s of [...subs]) {
    const cur = s.path ? read(state, s.keys) : state;
    if (!Object.is(cur, s.last)) { const prev = s.last; s.last = cur; s.fn(cur, prev); }
  }
}

export function subscribe(path, fn, immediate = false) {
  const keys = path ? path.split('.') : [];
  const s = { path, keys, fn, last: path ? read(state, keys) : state };
  subs.add(s);
  if (immediate) fn(s.last, undefined);
  return () => subs.delete(s);
}

export const reset = () => { state = defaults(); for (const s of subs) { s.last = s.path ? read(state, s.keys) : state; s.fn(s.last, undefined); } };
