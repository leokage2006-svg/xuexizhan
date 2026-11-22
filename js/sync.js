// Đồng bộ qua Supabase (tùy chọn). Đăng nhập bằng Gmail → mỗi Gmail một tiến độ riêng.
import * as store from './store.js';
import { toast, weekKey } from './util.js';

const CFG = window.XXZ_CONFIG || {};
export const enabled = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
let sb = null;
let user = null;
let pushTimer = null;
const subs = new Set();
export const status = { text: enabled ? 'Chưa đăng nhập' : 'Đang lưu trên máy này', ok: false, last: 0, checked: !enabled };

function emit() { subs.forEach((f) => f(status, user)); }
export function onStatus(f) { subs.add(f); return () => subs.delete(f); }
export function currentUser() { return user; }

async function client() {
  if (sb) return sb;
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  sb = createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: true, detectSessionInUrl: true } });
  return sb;
}

function allowed(email) {
  const list = (CFG.ALLOWED_EMAILS || []).map((e) => e.toLowerCase().trim()).filter(Boolean);
  return !list.length || list.includes(String(email || '').toLowerCase());
}

export async function init(onUser) {
  if (!enabled) return;
  try {
    const c = await client();
    const { data } = await c.auth.getSession();
    await handleSession(data.session, onUser);
    status.checked = true; emit();
    c.auth.onAuthStateChange((_e, session) => handleSession(session, onUser));
  } catch (e) {
    status.text = 'Không kết nối được máy chủ đồng bộ'; status.checked = true; status.failed = true; emit();
  }
}

async function handleSession(session, onUser) {
  const u = session?.user || null;
  if (u && user && u.id === user.id) return;
  user = u;
  if (!u) { status.text = 'Chưa đăng nhập'; status.ok = false; emit(); return; }
  if (!allowed(u.email)) {
    toast('Gmail này không có trong danh sách được phép.');
    await signOut();
    return;
  }
  const pid = `sb-${u.id}`;
  store.addProfile(u.user_metadata?.full_name || u.email.split('@')[0], pid);
  store.switchTo(pid);
  if (!store.get().profile.email) { store.get().profile.email = u.email; }
  const gname = u.user_metadata?.full_name || u.user_metadata?.name;
  if (gname && (!store.get().profile.name || store.get().profile.name === 'Bạn' || store.get().profile.name === u.email.split('@')[0])) store.get().profile.name = gname;
  await pull();
  store.hooks.afterSave = () => schedulePush();
  if (onUser) onUser(u);
}

export async function signInEmail(email) {
  const c = await client();
  if (!allowed(email)) throw new Error('Gmail này chưa có trong danh sách được phép (config.js).');
  const { error } = await c.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
  if (error) throw error;
}
export async function signInGoogle() {
  const c = await client();
  const { error } = await c.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
  if (error) throw error;
}
export async function signOut() {
  const c = await client();
  await c.auth.signOut();
  user = null;
  store.hooks.afterSave = null;
  status.text = 'Đã đăng xuất'; status.ok = false; emit();
}

async function pull() {
  const c = await client();
  status.text = 'Đang tải tiến độ…'; emit();
  const { data, error } = await c.from('progress').select('data, updated_at').eq('user_id', user.id).maybeSingle();
  if (error) { status.text = 'Lỗi đồng bộ: ' + error.message; emit(); return; }
  if (data?.data && Object.keys(data.data).length) {
    const localKey = store.get().settings.aiKey;
    const merged = store.merge(store.get(), data.data);
    merged.profile = { ...merged.profile, email: user.email };
    merged.settings = { ...merged.settings, aiKey: localKey || '' };
    store.replaceState(merged);
  }
  await push();
}

function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, 2500);
}

export async function push() {
  if (!user) return;
  const c = await client();
  const st = store.get();
  const name = st.profile.name || user.email.split('@')[0];
  // Không gửi khóa AI lên máy chủ: khóa chỉ nằm trên thiết bị này
  const data = { ...st, settings: { ...st.settings, aiKey: '' } };
  const now = new Date().toISOString();
  const { error } = await c.from('progress').upsert({ user_id: user.id, email: user.email, name, data, updated_at: now });
  await c.from('leaderboard').upsert({ user_id: user.id, name, xp_week: store.weekXP(st), week: weekKey(), updated_at: now });
  if (error) { status.text = 'Lỗi đồng bộ: ' + error.message; status.ok = false; }
  else { status.text = 'Đã đồng bộ'; status.ok = true; status.last = Date.now(); }
  emit();
}

/** Bảng xếp hạng tuần giữa các tài khoản được phép */
export async function leaderboard() {
  if (!user) return null;
  const c = await client();
  const { data, error } = await c.from('leaderboard').select('user_id, name, xp_week, week');
  if (error) return null;
  const wk = weekKey();
  return data.map((r) => ({ id: r.user_id, name: r.name || '?', xp: r.week === wk ? r.xp_week : 0, me: r.user_id === user.id }));
}
