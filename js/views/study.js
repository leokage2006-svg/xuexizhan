import { D } from '../data.js';
import * as store from '../store.js';
import * as plan from '../plan.js';
import { esc, pyHTML, fmtIvl, toast, ICON } from '../util.js';
import { wordHTML, mountWord } from '../components.js';
import { speak } from '../speech.js';

// ================= Học từ mới =================
export function learn(view, topicCode) {
  const left = plan.newLeftToday();
  const q = plan.quota();
  const cards = store.get().cards;
  const maxL = store.get().settings.targetLevel || 4;
  const topicsLeft = D.topics.map((t) => ({ ...t, left: (D.byTopic.get(t.code) || []).filter((w) => w.l <= maxL && !cards[w.id]).length })).filter((t) => t.left);
  const size = Math.min(10, Math.max(5, left || 5));
  let batch = plan.nextWords(size, topicCode);
  let i = 0;

  const header = () => `
    <header class="head"><div>
      <span class="cap">Học từ mới · hôm nay ${store.dayLog().new || 0} / ${q} từ</span>
      <h1 class="h1"><span class="zhs">新词</span> ${topicCode ? esc(D.topicBy.get(topicCode)?.vi || '') : 'Theo lộ trình'}</h1>
    </div>
    <div class="btns"><a class="btn" href="#/review">Ôn tập (${store.dueCount()})</a></div></header>
    <details class="more"${topicCode ? ' open' : ''}><summary>Chọn chủ đề khác (${topicsLeft.length} chủ đề còn từ chưa học)</summary>
    <div class="chips" aria-label="Chọn chủ đề" style="margin-top:12px">
      <a class="chip ${topicCode ? '' : 'acc'}" href="#/learn">Theo lộ trình</a>
      ${topicsLeft.map((t) => `<a class="chip ${t.code === topicCode ? 'acc' : ''}" href="#/learn/${t.code}"><span class="zh">${esc(t.zh)}</span> ${esc(t.vi)} · ${t.left}</a>`).join('')}
    </div></details>`;

  const show = () => {
    if (!batch.length) {
      view.innerHTML = header() + `<div class="empty">Không còn từ mới trong mục này. Chọn chủ đề khác hoặc <a href="#/review">ôn tập</a>.</div>`;
      return;
    }
    if (i >= batch.length) return finish();
    const w = batch[i];
    view.innerHTML = header() + `
      <div class="stack" style="gap:10px">
        <div class="between"><span class="muted" style="font-size:13px">Từ ${i + 1} / ${batch.length} · ${esc(D.topicBy.get(w.tp)?.vi || '')}</span>
          <span class="muted" style="font-size:12px"><span class="kbd">→</span> tiếp · <span class="kbd">Space</span> nghe</span></div>
        <div class="progress"><i style="width:${(i / batch.length) * 100}%"></i></div>
      </div>
      <div id="wc">${wordHTML(w, { compact: true })}</div>
      <div class="btns" style="justify-content:space-between">
        <button class="btn" id="prev" ${i ? '' : 'disabled'}>${ICON.back} Trước</button>
        <div class="btns"><a class="btn" href="#/w/${w.id}">Xem chi tiết</a><button class="btn pri big" id="next">Đã hiểu, tiếp →</button></div>
      </div>`;
    mountWord(view.querySelector('#wc'), w, { speakNow: true });
    view.querySelector('#next').onclick = nextWord;
    view.querySelector('#prev').onclick = () => { if (i) { i--; show(); } };
  };
  const nextWord = () => {
    store.addCard(batch[i].id);
    i++;
    show();
  };
  const finish = () => {
    const words = batch.slice(0, i);
    const leftNow = plan.newLeftToday();
    view.innerHTML = header() + `
      <section class="card hi" style="align-items:center;text-align:center;padding:40px">
        <span class="cap">完成 · Xong một lượt</span>
        <h2 class="h2" style="justify-content:center;font-size:34px">Đã học ${words.length} từ mới</h2>
        <div class="chips" style="justify-content:center">${words.map((w) => `<a class="chip" href="#/w/${w.id}"><span class="zh" style="font-size:16px">${esc(w.w)}</span> ${esc(w.hv)}</a>`).join('')}</div>
        <p class="muted" style="margin:0">Các từ này sẽ quay lại sau 1 phút, 10 phút, rồi giãn dần theo ngày. ${leftNow ? `Hôm nay còn ${leftNow} từ theo chỉ tiêu.` : 'Bạn đã đủ chỉ tiêu hôm nay!'}</p>
        <div class="btns" style="justify-content:center"><a class="btn pri big" href="#/review">Ôn ngay</a><button class="btn big" id="more">Học thêm ${Math.min(10, Math.max(5, leftNow || 5))} từ</button></div>
      </section>`;
    view.querySelector('#more').onclick = () => {
      batch = plan.nextWords(Math.min(10, Math.max(5, plan.newLeftToday() || 5)), topicCode);
      i = 0; show();
    };
  };
  const onKey = (e) => {
    if (e.target.matches('input, textarea')) return;
    if (e.key === 'ArrowRight' && view.querySelector('#next')) { e.preventDefault(); nextWord(); }
    if (e.key === 'ArrowLeft' && i) { i--; show(); }
    if (e.key === ' ' && batch[i]) { e.preventDefault(); speak(batch[i].w); }
  };
  window.addEventListener('keydown', onKey);
  show();
  return () => window.removeEventListener('keydown', onKey);
}

// ================= Ôn tập =================
export function review(view) {
  const st = store.get();
  let mode = st.settings.revMode || 'zh';
  let cur = null;
  let shown = false;
  let done = 0;
  let timer = null;

  const quickComp = (w) => [...w.w].filter((c) => D.chars[c]).map((c) => {
    const ch = D.chars[c];
    const parts = (ch.comp || []).filter((x) => x !== '？').join(' + ');
    return `<span><span class="zhs" style="font-size:20px">${esc(c)}</span> <span class="hv">${esc(ch.hv?.[0] || '')}</span>${parts ? ` = <span class="zhs">${esc(parts)}</span>` : ''}${ch.hint ? ` <span class="muted">· ${esc(ch.hint)}</span>` : ''}</span>`;
  }).join('<br>');

  const draw = () => {
    clearTimeout(timer);
    const due = store.dueList();
    if (!due.length) {
      const soon = Object.values(store.get().cards).filter((c) => c.due > Date.now() && c.due - Date.now() < 15 * 60000).sort((a, b) => a.due - b.due);
      view.innerHTML = `
        <header class="head"><div><span class="cap">Ôn tập</span><h1 class="h1"><span class="zhs">复习</span> Ôn tập</h1></div></header>
        <section class="card" style="align-items:center;text-align:center;padding:44px">
          <h2 class="h2" style="justify-content:center;font-size:30px">${done ? `Xong ${done} thẻ. 很好！` : 'Chưa có thẻ nào đến hạn'}</h2>
          ${soon.length ? `<p class="muted" style="margin:0">${soon.length} thẻ đang chờ, thẻ gần nhất đến hạn sau ${fmtIvl(soon[0].due - Date.now())}. Trang sẽ tự hiện khi đến lúc.</p>` : `<p class="muted" style="margin:0">Học thêm từ mới để có thẻ ôn.</p>`}
          <div class="btns" style="justify-content:center"><a class="btn pri" href="#/learn">Học từ mới</a><a class="btn" href="#/games">Chơi trò chơi</a></div>
        </section>`;
      if (soon.length) timer = setTimeout(draw, Math.max(1000, soon[0].due - Date.now() + 500));
      return;
    }
    cur = due[0];
    shown = false;
    const w = D.byId.get(cur);
    if (!w) { delete store.get().cards[cur]; store.save(); return draw(); }
    const c = store.card(cur);
    view.innerHTML = `
      <header class="head"><div><span class="cap">Ôn tập · còn ${due.length} thẻ · đã xong ${done}</span><h1 class="h1"><span class="zhs">复习</span> Ôn tập</h1></div>
        <div class="btns" role="group" aria-label="Kiểu ôn">
          <button class="btn sm ${mode === 'zh' ? 'pri' : ''}" data-mode="zh">Chữ → nghĩa</button>
          <button class="btn sm ${mode === 'vi' ? 'pri' : ''}" data-mode="vi">Nghĩa → chữ</button>
          <button class="btn sm ${mode === 'ear' ? 'pri' : ''}" data-mode="ear">Nghe → chữ</button>
        </div></header>
      <section class="card flash" id="flash">
        <span class="cap">${c.s === 'learn' ? 'Đang học' : 'Ôn lại'} · HSK ${w.l}</span>
        ${mode === 'zh' ? `<span class="big">${esc(w.w)}</span>` : ''}
        ${mode === 'vi' ? `<span class="hero"><span class="mean" style="font-family:var(--serif);font-size:30px">${esc(w.vi.split(';').slice(0, 2).join(';'))}</span><br><span class="hv" style="font-size:22px">${esc(w.hv)}</span></span>` : ''}
        ${mode === 'ear' ? `<button class="btn big" data-say>${ICON.sound} Nghe lại</button><span class="muted">Nghe và nhớ lại chữ Hán, nghĩa</span>` : ''}
        <div id="back" hidden style="display:flex;flex-direction:column;gap:8px;align-items:center">
          ${mode !== 'zh' ? `<span class="big">${esc(w.w)}</span>` : ''}
          <span style="font-size:26px">${pyHTML(w.p)}</span>
          ${mode !== 'vi' ? `<span class="hv" style="font-size:24px;letter-spacing:3px">${esc(w.hv)}</span><span class="lux" style="font-size:24px">${esc(w.vi.split(';').slice(0, 3).join(';'))}</span>` : ''}
          <div style="text-align:left;line-height:1.9;font-size:14px;margin-top:6px">${quickComp(w)}</div>
          ${store.get().notes[w.id] ? `<span class="muted">Ghi chú: ${esc(store.get().notes[w.id])}</span>` : ''}
          <a href="#/w/${w.id}" style="font-size:13px">Xem thẻ đầy đủ</a>
        </div>
      </section>
      <div id="actions"></div>`;
    view.querySelectorAll('[data-mode]').forEach((b) => b.onclick = () => { mode = b.dataset.mode; store.get().settings.revMode = mode; store.save(); draw(); });
    view.querySelector('[data-say]')?.addEventListener('click', () => speak(w.w));
    if (mode === 'ear') speak(w.w);
    drawActions(c);
  };

  const drawActions = (c) => {
    const a = view.querySelector('#actions');
    if (!shown) {
      a.innerHTML = `<button class="btn pri big" style="width:100%" id="reveal">Hiện đáp án <span class="kbd" style="color:inherit">Space</span></button>`;
      a.querySelector('#reveal').onclick = reveal;
      return;
    }
    const pv = store.preview(c);
    const names = ['Quên', 'Khó', 'Nhớ', 'Dễ'];
    a.innerHTML = `<div class="grade">${names.map((n, k) => `<button data-g="${k + 1}" class="${k === 2 ? 'pri' : ''}"><b>${n} <span class="kbd">${k + 1}</span></b><small>${fmtIvl(pv[k])}</small></button>`).join('')}</div>`;
    a.querySelectorAll('[data-g]').forEach((b) => b.onclick = () => grade(+b.dataset.g));
  };
  const reveal = () => {
    if (shown) return;
    shown = true;
    view.querySelector('#back').hidden = false;
    const w = D.byId.get(cur);
    if (mode !== 'ear' && store.get().settings.autoSpeak) speak(w.w);
    drawActions(store.card(cur));
  };
  const grade = (g) => {
    store.answer(cur, g);
    done++;
    draw();
  };
  const onKey = (e) => {
    if (e.target.matches('input, textarea')) return;
    if (!cur) return;
    if ((e.key === ' ' || e.key === 'Enter') && !shown) { e.preventDefault(); reveal(); }
    else if (shown && ['1', '2', '3', '4'].includes(e.key)) grade(+e.key);
  };
  window.addEventListener('keydown', onKey);
  draw();
  return () => { window.removeEventListener('keydown', onKey); clearTimeout(timer); };
}
