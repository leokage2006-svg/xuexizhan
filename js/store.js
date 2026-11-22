// Lưu trữ tiến độ: mỗi tài khoản (profile) một bộ dữ liệu riêng.
// Dữ liệu luôn nằm trong trình duyệt (localStorage); nếu bật Supabase thì được đồng bộ thêm lên mạng.
import { today, weekKey } from './util.js';

const K_PROFILES = 'xxz.profiles';
const K_ACTIVE = 'xxz.active';
const K_STATE = (id) => `xxz.state.${id}`;

export const DEFAULT_SETTINGS = {
  theme: 'auto',          // auto | light | dark
  breakMin: 20,           // nhắc nghỉ mắt sau bao nhiêu phút học
  newPerDay: 0,           // 0 = tự tính theo mục tiêu
  targetLevel: 4,
  targetDate: '2027-01-22',
  aiKey: '',
  aiModel: 'gemini-3.5-flash-lite',
  ttsRate: 0.8,
  autoSpeak: true,
  onboarded: false,
};

function blank(name) {
  return {
    v: 1,
    profile: { name: name || 'Bạn', created: Date.now() },
    settings: { ...DEFAULT_SETTINGS },
    cards: {},
    log: {},
    diary: [],
    notes: {},
    flags: {},
    ai: {},
    grammar: {},
    games: { best: {} },
    updatedAt: 0,
  };
}

let state = null;
let activeId = null;
const listeners = new Set();
let saveTimer = null;
export const hooks = { afterSave: null };

export function profiles() {
  try { return JSON.parse(localStorage.getItem(K_PROFILES) || '[]'); } catch { return []; }
}
function setProfiles(list) { localStorage.setItem(K_PROFILES, JSON.stringify(list)); }

export function load(id) {
  let list = profiles();
  if (!id) id = localStorage.getItem(K_ACTIVE);
  if (!id || !list.find((p) => p.id === id)) {
    if (list.length) id = list[0].id;
    else {
      id = 'local-1';
      list = [{ id, name: 'Bạn' }];
      setProfiles(list);
    }
  }
  activeId = id;
  localStorage.setItem(K_ACTIVE, id);
  try { state = JSON.parse(localStorage.getItem(K_STATE(id)) || 'null'); } catch { state = null; }
  if (!state) state = blank(list.find((p) => p.id === id)?.name);
  state.settings = { ...DEFAULT_SETTINGS, ...(state.settings || {}) };
  for (const k of ['cards', 'log', 'notes', 'flags', 'ai', 'grammar']) state[k] = state[k] || {};
  state.diary = state.diary || [];
  state.games = state.games || { best: {} };
  state.games.best = state.games.best || {};
  return state;
}

export function get() { return state; }
export function id() { return activeId; }

export function save(immediate = false) {
  state.updatedAt = Date.now();
  clearTimeout(saveTimer);
  const write = () => {
    localStorage.setItem(K_STATE(activeId), JSON.stringify(state));
    if (hooks.afterSave) hooks.afterSave(state, activeId);
  };
  if (immediate) write(); else saveTimer = setTimeout(write, 300);
  listeners.forEach((fn) => fn(state));
}
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function addProfile(name, idOverride) {
  const list = profiles();
  const nid = idOverride || `local-${Date.now()}`;
  if (!list.find((p) => p.id === nid)) list.push({ id: nid, name });
  setProfiles(list);
  return nid;
}
export function renameProfile(name) {
  const list = profiles().map((p) => (p.id === activeId ? { ...p, name } : p));
  setProfiles(list);
  state.profile.name = name;
  save();
}
export function switchTo(nid) {
  if (state) localStorage.setItem(K_STATE(activeId), JSON.stringify(state));
  load(nid);
  listeners.forEach((fn) => fn(state));
}
export function removeProfile(pid) {
  const list = profiles().filter((p) => p.id !== pid);
  setProfiles(list);
  localStorage.removeItem(K_STATE(pid));
}
export function replaceState(next) {
  state = next;
  state.settings = { ...DEFAULT_SETTINGS, ...(state.settings || {}) };
  save(true);
}
export function peek(pid) {
  try { return JSON.parse(localStorage.getItem(K_STATE(pid)) || 'null'); } catch { return null; }
}

// ---------- Nhật ký hoạt động ----------
export function dayLog(d = today()) {
  state.log[d] = state.log[d] || { new: 0, rev: 0, xp: 0, sec: 0, games: 0 };
  return state.log[d];
}
export function addXP(n) {
  dayLog().xp += n;
  save();
}
export function weekXP(st = state) {
  const wk = weekKey();
  let sum = 0;
  for (const [d, v] of Object.entries(st.log || {})) {
    if (weekKey(new Date(d + 'T12:00:00')) === wk) sum += v.xp || 0;
  }
  return sum;
}
export function streak(st = state) {
  let n = 0;
  const d = new Date();
  const active = (k) => { const v = st.log[k]; return v && (v.new || v.rev || v.games || v.sec >= 60); };
  if (!active(today(d))) d.setDate(d.getDate() - 1);
  while (active(today(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

// ---------- Ôn tập ngắt quãng (giống Anki, đơn giản hóa) ----------
const MIN = 60000, DAY = 86400000;
const STEPS = [1 * MIN, 10 * MIN];

export function card(wid) { return state.cards[wid]; }

export function addCard(wid) {
  if (state.cards[wid]) return state.cards[wid];
  const c = { s: 'learn', step: 0, due: Date.now() + STEPS[0], ivl: 0, ease: 2.5, reps: 0, lapses: 0, last: 0, added: Date.now() };
  state.cards[wid] = c;
  dayLog().new += 1;
  dayLog().xp += 5;
  save();
  return c;
}

/** Đánh dấu là đã biết (vd: từ HSK 1 đã học ở trung tâm) — ôn lại dần dần */
export function markKnown(wids) {
  const now = Date.now();
  wids.forEach((wid, i) => {
    if (state.cards[wid]) return;
    const ivl = 3 + (i % 19);
    state.cards[wid] = { s: 'review', step: 0, due: now + ivl * DAY, ivl, ease: 2.5, reps: 1, lapses: 0, last: now, added: now, known: true };
  });
  save(true);
}

/** Xem trước khoảng thời gian cho 4 nút */
export function preview(c) {
  return [1, 2, 3, 4].map((g) => schedule(c, g, true).due - Date.now());
}

/** g: 1 = Quên, 2 = Khó, 3 = Nhớ, 4 = Dễ */
export function schedule(c, g, dry = false) {
  const now = Date.now();
  const n = { ...c };
  if (n.s === 'learn') {
    if (g === 1) { n.step = 0; n.due = now + STEPS[0]; }
    else if (g === 2) { n.due = now + Math.max(STEPS[n.step] || STEPS[0], 5 * MIN); }
    else if (g === 3) {
      if (n.step + 1 < STEPS.length) { n.step += 1; n.due = now + STEPS[n.step]; }
      else { n.s = 'review'; n.ivl = 1; n.due = now + DAY; }
    } else { n.s = 'review'; n.ivl = 4; n.due = now + 4 * DAY; }
  } else {
    const late = Math.max(0, (now - n.due) / DAY);
    if (g === 1) {
      n.lapses += 1; n.ease = Math.max(1.3, n.ease - 0.2);
      n.s = 'learn'; n.step = 1; n.ivl = Math.max(1, Math.round(n.ivl * 0.3));
      n.due = now + STEPS[1];
    } else if (g === 2) {
      n.ease = Math.max(1.3, n.ease - 0.15);
      n.ivl = Math.max(n.ivl + 1, Math.round(n.ivl * 1.2));
      n.due = now + n.ivl * DAY;
    } else if (g === 3) {
      n.ivl = Math.max(n.ivl + 1, Math.round((n.ivl + late / 2) * n.ease));
      n.due = now + n.ivl * DAY;
    } else {
      n.ease += 0.15;
      n.ivl = Math.max(n.ivl + 2, Math.round((n.ivl + late) * n.ease * 1.3));
      n.due = now + n.ivl * DAY;
    }
  }
  n.reps += 1;
  n.last = now;
  if (n.s === 'review' && n.ivl > 365) { n.ivl = 365; n.due = now + 365 * DAY; }
  if (dry) return n;
  return n;
}

export function answer(wid, g) {
  const c = state.cards[wid];
  if (!c) return;
  state.cards[wid] = schedule(c, g);
  const l = dayLog();
  l.rev += 1;
  l.xp += g >= 3 ? 2 : 1;
  save();
}

export function dueList(now = Date.now()) {
  return Object.entries(state.cards)
    .filter(([, c]) => c.due <= now)
    .sort((a, b) => (a[1].s === 'learn' ? 0 : 1) - (b[1].s === 'learn' ? 0 : 1) || a[1].due - b[1].due)
    .map(([k]) => k);
}
export function dueCount() { return dueList().length; }
export function learnedIds() { return Object.keys(state.cards); }
export function isMature(c) { return c && c.s === 'review' && c.ivl >= 21; }

// ---------- Gộp dữ liệu khi đồng bộ giữa nhiều thiết bị ----------
export function merge(a, b) {
  if (!a) return b;
  if (!b) return a;
  const out = JSON.parse(JSON.stringify((a.updatedAt || 0) >= (b.updatedAt || 0) ? a : b));
  const other = out === a ? b : a;
  for (const [k, c] of Object.entries(other.cards || {})) {
    const mine = out.cards[k];
    if (!mine || (c.last || 0) > (mine.last || 0)) out.cards[k] = c;
  }
  for (const [d, v] of Object.entries(other.log || {})) {
    const m = out.log[d];
    if (!m) out.log[d] = v;
    else for (const f of ['new', 'rev', 'xp', 'sec', 'games']) m[f] = Math.max(m[f] || 0, v[f] || 0);
  }
  const ids = new Set((out.diary || []).map((e) => e.id));
  for (const e of other.diary || []) if (!ids.has(e.id)) out.diary.push(e);
  out.diary.sort((x, y) => (y.ts || 0) - (x.ts || 0));
  for (const f of ['notes', 'flags', 'ai', 'grammar']) out[f] = { ...(other[f] || {}), ...(out[f] || {}) };
  out.games = out.games || { best: {} };
  for (const [g, v] of Object.entries(other.games?.best || {})) {
    const m = out.games.best[g];
    out.games.best[g] = m == null ? v : (g === 'match' ? Math.min(m, v) : Math.max(m, v));
  }
  out.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
  return out;
}
