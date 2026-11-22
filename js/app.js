// 学习站 — khung ứng dụng: điều hướng, giao diện sáng/tối, nhắc nghỉ mắt, đếm giờ học
import { loadData, D } from './data.js';
import * as store from './store.js';
import * as sync from './sync.js';
import { $, $$, esc, toast } from './util.js';
import { home, onboarding } from './views/home.js';
import { learn, review } from './views/study.js';
import { words, topic, word, chars, charPage, radical, searchView } from './views/words.js';
import { grammarList, grammarPage } from './views/grammar.js';
import { gamesHub, game } from './views/games.js';
import { diary } from './views/diary.js';
import { goals } from './views/goals.js';
import { settings } from './views/settings.js';

const view = $('#view');
let cleanup = null;

const routes = [
  [/^\/?$/, 'home', home],
  [/^\/learn(?:\/(\w+))?$/, 'learn', learn],
  [/^\/review$/, 'review', review],
  [/^\/words$/, 'words', words],
  [/^\/words\/(\w+)$/, 'words', topic],
  [/^\/w\/([\w-]+)$/, 'words', word],
  [/^\/s\/(.+)$/, 'words', searchView],
  [/^\/chars$/, 'chars', chars],
  [/^\/c\/(.+)$/, 'chars', charPage],
  [/^\/r\/(.+)$/, 'chars', radical],
  [/^\/grammar$/, 'grammar', grammarList],
  [/^\/g\/([\w-]+)$/, 'grammar', grammarPage],
  [/^\/games$/, 'games', gamesHub],
  [/^\/games\/(\w+)$/, 'games', game],
  [/^\/diary$/, 'diary', diary],
  [/^\/goals$/, 'goals', goals],
  [/^\/settings$/, 'settings', settings],
];

export function render() {
  if (!D.ready) return;
  if (typeof cleanup === 'function') { try { cleanup(); } catch {} }
  cleanup = null;
  const path = decodeURIComponent(location.hash.replace(/^#/, '') || '/');
  if (!store.get().settings.onboarded && path !== '/settings') {
    cleanup = onboarding(view, () => { location.hash = '#/'; render(); });
    setNav('home');
    return;
  }
  for (const [re, nav, fn] of routes) {
    const m = path.match(re);
    if (m) {
      setNav(nav);
      view.innerHTML = '';
      cleanup = fn(view, ...m.slice(1));
      window.scrollTo(0, 0);
      updateChrome();
      return;
    }
  }
  view.innerHTML = '<div class="empty">Không tìm thấy trang. <a href="#/">Về Tổng quan</a></div>';
}

function setNav(name) {
  $$('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.nav === name));
}

export function updateChrome() {
  const st = store.get();
  const due = store.dueCount();
  const b = $('#due-badge');
  b.hidden = !due; b.textContent = due > 99 ? '99+' : due;
  const name = st.profile.name || 'Bạn';
  const list = store.profiles();
  $('#me').innerHTML = `<div class="avatar" aria-hidden="true">${esc(name[0]?.toUpperCase() || 'B')}</div>
    <div class="me-info"><b>${esc(name)}</b><span>${sync.enabled ? esc(sync.status.text) : `Tài khoản ${Math.max(1, list.findIndex((p) => p.id === store.id()) + 1)} / ${list.length}`}</span></div>
    <a class="btn sm" href="#/settings">Đổi</a>`;
}

// ---------- Sáng / tối ----------
function applyTheme() {
  const mode = store.get()?.settings.theme || 'auto';
  const h = new Date().getHours();
  const light = mode === 'light' || (mode === 'auto' && h >= 6 && h < 18);
  const next = light ? 'light' : 'dark';
  if (document.documentElement.dataset.theme !== next) {
    document.documentElement.dataset.theme = next;
    return true;
  }
  return false;
}
$('#theme-btn').addEventListener('click', () => {
  const st = store.get();
  const cur = document.documentElement.dataset.theme;
  st.settings.theme = cur === 'light' ? 'dark' : 'light';
  store.save();
  applyTheme();
  toast(st.settings.theme === 'light' ? 'Chế độ Đọc sâu (sáng)' : 'Chế độ tối · vào Cài đặt để chọn lại "Tự động theo giờ"');
  render();
});

// ---------- Đếm thời gian học & nhắc nghỉ mắt ----------
let lastInput = Date.now();
let activeSec = 0;
let breakOpen = false;
['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((ev) => window.addEventListener(ev, () => { lastInput = Date.now(); }, { passive: true }));
setInterval(() => {
  if (document.hidden || breakOpen) return;
  if (Date.now() - lastInput > 90000) return;
  activeSec += 5;
  const l = store.dayLog();
  l.sec = (l.sec || 0) + 5;
  if (activeSec % 60 === 0) store.save();
  const lim = (store.get().settings.breakMin || 0) * 60;
  if (lim && activeSec >= lim) { activeSec = 0; eyeBreak(); }
}, 5000);
setInterval(() => { if (applyTheme()) render(); }, 60000);

function eyeBreak() {
  const ov = $('#overlay');
  breakOpen = true;
  let n = 20;
  ov.innerHTML = `<div class="box" role="dialog" aria-modal="true" aria-labelledby="eb-t">
    <span class="cap">Nghỉ mắt · 20-20-20</span>
    <h2 id="eb-t" class="h2" style="justify-content:center">Nhìn ra xa khoảng 6 mét</h2>
    <span class="count" id="eb-n">20</span>
    <p class="muted" style="margin:0">Bạn đã học ${store.get().settings.breakMin} phút. Chớp mắt vài lần, thả lỏng vai.</p>
    <div class="btns"><button class="btn" id="eb-skip">Bỏ qua</button><a class="btn" href="#/games/match" id="eb-game">Nghỉ xong thì chơi 1 ván</a></div>
  </div>`;
  ov.hidden = false;
  const close = () => { ov.hidden = true; ov.innerHTML = ''; breakOpen = false; clearInterval(t); };
  const t = setInterval(() => {
    n--; const el = $('#eb-n'); if (el) el.textContent = n;
    if (n <= 0) { close(); toast('Mắt đã được nghỉ. Học tiếp nào!'); }
  }, 1000);
  $('#eb-skip').onclick = close;
  $('#eb-game').onclick = close;
}

// ---------- Tra cứu ----------
$('#search-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $('#search').value.trim();
  if (q) location.hash = `#/s/${encodeURIComponent(q)}`;
});

// ---------- Khởi động ----------
async function start() {
  store.load();
  applyTheme();
  view.innerHTML = '<div class="empty">Đang tải dữ liệu HSK…</div>';
  try {
    await loadData();
  } catch (e) {
    view.innerHTML = `<div class="empty">Không tải được dữ liệu. Nếu bạn mở file trực tiếp (file://), hãy chạy bằng GitHub Pages hoặc một máy chủ cục bộ (xem README).<br><small>${esc(e.message)}</small></div>`;
    return;
  }
  store.onChange(() => updateChrome());
  window.addEventListener('hashchange', render);
  render();
  if (sync.enabled) {
    sync.onStatus(() => updateChrome());
    sync.init(() => { applyTheme(); render(); toast('Đã đăng nhập và đồng bộ tiến độ'); });
  }
}
start();
