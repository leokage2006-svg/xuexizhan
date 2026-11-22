import { D, search, compInfo } from '../data.js';
import * as store from '../store.js';
import { esc, pyHTML } from '../util.js';
import { wordHTML, mountWord, compositionHTML, makeWriter, levelChip } from '../components.js';
import { speak } from '../speech.js';

const tile = (w, cards) => `<a class="wtile" href="#/w/${w.id}">${cards[w.id] ? '<i class="dot" title="Đã học"></i>' : ''}
  <span class="w">${esc(w.w)}</span><span>${pyHTML(w.p)} · <span class="hv">${esc(w.hv)}</span></span><span class="m">${esc(w.vi)}</span></a>`;

// ---------- Danh sách chủ đề ----------
export function words(view) {
  const cards = store.get().cards;
  view.innerHTML = `
  <header class="head"><div><span class="cap">1950 từ HSK 1–4 · chia theo ${D.topics.length} chủ đề</span>
    <h1 class="h1"><span class="zhs">词汇</span> Từ vựng</h1></div></header>
  <div class="ggrid">
    ${D.topics.map((t) => {
      const ws = D.byTopic.get(t.code) || [];
      const done = ws.filter((w) => cards[w.id]).length;
      const sample = ws.slice().sort((a, b) => a.q - b.q).slice(0, 5).map((w) => w.w).join(' · ');
      return `<a class="gcard" href="#/words/${t.code}">
        <span class="zhs">${esc(t.zh)}</span>
        <span class="lux">${esc(t.vi)}</span>
        <p class="zh">${esc(sample)}</p>
        <div class="progress" style="margin-top:8px"><i style="width:${(done / Math.max(1, ws.length)) * 100}%"></i></div>
        <span class="cap" style="margin-top:4px">${done} / ${ws.length} từ đã học</span>
      </a>`;
    }).join('')}
  </div>`;
}

// ---------- Một chủ đề ----------
export function topic(view, code) {
  const t = D.topicBy.get(code);
  if (!t) { view.innerHTML = '<div class="empty">Không có chủ đề này.</div>'; return; }
  const cards = store.get().cards;
  const ws = D.byTopic.get(code) || [];
  let lv = 0;
  const draw = () => {
    const list = ws.filter((w) => !lv || w.l === lv);
    view.innerHTML = `
    <header class="head"><div><span class="cap"><a href="#/words" style="text-decoration:none">← Từ vựng</a> · ${ws.length} từ</span>
      <h1 class="h1"><span class="zhs">${esc(t.zh)}</span> ${esc(t.vi)}</h1></div>
      <div class="btns"><a class="btn pri" href="#/learn/${code}">Học chủ đề này</a></div></header>
    <div class="chips">${[0, 1, 2, 3, 4].map((l) => `<button class="chip ${l === lv ? 'acc' : ''}" data-lv="${l}" style="background:none;cursor:pointer">${l ? 'HSK ' + l : 'Tất cả'} · ${l ? ws.filter((w) => w.l === l).length : ws.length}</button>`).join('')}</div>
    ${[1, 2, 3, 4].filter((l) => !lv || l === lv).map((l) => {
      const g = list.filter((w) => w.l === l);
      return g.length ? `<section class="card"><div class="between"><h2 class="h2">HSK ${l}</h2><span class="muted" style="font-size:12px">● = đã học</span></div><div class="wgrid">${g.map((w) => tile(w, cards)).join('')}</div></section>` : '';
    }).join('')}`;
    view.querySelectorAll('[data-lv]').forEach((b) => b.onclick = () => { lv = +b.dataset.lv; draw(); });
  };
  draw();
}

// ---------- Một từ ----------
export function word(view, id) {
  const w = D.byId.get(id);
  if (!w) { view.innerHTML = '<div class="empty">Không tìm thấy từ.</div>'; return; }
  const t = D.topicBy.get(w.tp);
  const sib = D.byTopic.get(w.tp) || [];
  const k = sib.indexOf(w);
  const prev = sib[k - 1], next = sib[k + 1];
  view.innerHTML = `
    <div class="between"><span class="cap"><a href="#/words/${w.tp}" style="text-decoration:none">← ${esc(t?.vi || 'Từ vựng')}</a></span>
      <div class="btns">${prev ? `<a class="btn sm" href="#/w/${prev.id}">← <span class="zh">${esc(prev.w)}</span></a>` : ''}${next ? `<a class="btn sm" href="#/w/${next.id}"><span class="zh">${esc(next.w)}</span> →</a>` : ''}</div></div>
    <div id="wc">${wordHTML(w)}</div>`;
  mountWord(view.querySelector('#wc'), w);
}

// ---------- Tra cứu ----------
export function searchView(view, q) {
  const res = search(q);
  const cards = store.get().cards;
  const exact = res[0] && res[0].w === q;
  if (res.length === 1 || (exact && !res.slice(1).some((w) => w.w === q))) { if (res.length === 1 || exact) { location.replace(`#/w/${res[0].id}`); return; } }
  const rel = /[一-鿿]/.test(q) ? D.related.filter((r) => r.w.includes(q)).slice(0, 12) : [];
  const ch = q.length === 1 && D.chars[q];
  view.innerHTML = `
  <header class="head"><div><span class="cap">Kết quả tra cứu</span><h1 class="h1">“${esc(q)}”</h1></div></header>
  ${ch ? `<a class="card hi" href="#/c/${encodeURIComponent(q)}" style="text-decoration:none;color:inherit;flex-direction:row;align-items:center;gap:18px"><span class="zhs" style="font-size:56px">${esc(q)}</span><span>Xem trang chữ <b>${esc(q)}</b>: cấu tạo, bộ thủ, nét viết và các từ chứa chữ này →</span></a>` : ''}
  ${res.length ? `<section class="card"><h2 class="h2">Trong HSK 1–4 · ${res.length}</h2><div class="wgrid">${res.map((w) => tile(w, cards)).join('')}</div></section>` : '<div class="empty">Không tìm thấy trong HSK 1–4. Thử gõ chữ Hán, pinyin không dấu (vd: xiuxi), âm Hán Việt (vd: huu tuc) hoặc nghĩa.</div>'}
  ${rel.length ? `<section class="card"><h2 class="h2">Cấp cao hơn (HSK 5–6)</h2><div class="wgrid">${rel.map((r) => `<div class="wtile"><span class="lv">HSK ${r.l}</span><span class="w">${esc(r.w)}</span><span>${pyHTML(r.p)} · <span class="hv">${esc(r.hv)}</span></span><span class="m">${esc(r.vi)}</span></div>`).join('')}</div></section>` : ''}`;
}

// ---------- Chữ Hán & bộ thủ ----------
export function chars(view) {
  const cards = store.get().cards;
  const known = new Set();
  for (const id of Object.keys(cards)) { const w = D.byId.get(id); if (w) for (const c of w.w) known.add(c); }
  const byRad = new Map();
  for (const [c, info] of Object.entries(D.chars)) {
    const r = D.radByChar.get(info.rad);
    const key = r ? r.r : info.rad;
    if (!byRad.has(key)) byRad.set(key, []);
    byRad.get(key).push(c);
  }
  const rads = D.radicals.filter((r) => byRad.has(r.r)).sort((a, b) => byRad.get(b.r).length - byRad.get(a.r).length);
  view.innerHTML = `
  <header class="head"><div><span class="cap">${Object.keys(D.chars).length} chữ trong HSK 1–4 · bạn đã gặp ${known.size} chữ</span>
    <h1 class="h1"><span class="zhs">汉字</span> Chữ Hán &amp; bộ thủ</h1></div></header>
  <section class="card">
    <div class="between"><h2 class="h2"><span class="zhs">部首</span>Bộ thủ xuất hiện trong HSK 1–4</h2><span class="muted" style="font-size:12px">sắp theo số chữ</span></div>
    <div class="radgrid">${rads.map((r) => `<a class="radtile" href="#/r/${encodeURIComponent(r.r)}"><span class="zhs">${esc(r.r)}${r.v.length ? `<small style="font-size:18px;color:var(--muted)"> ${esc(r.v.join(' '))}</small>` : ''}</span><b style="font-size:14px">${esc(r.name)}</b><small>${esc(r.mean)} · ${byRad.get(r.r).length} chữ</small></a>`).join('')}</div>
  </section>
  <section class="card">
    <h2 class="h2"><span class="zhs">已学</span>Chữ bạn đã gặp</h2>
    ${known.size ? `<div class="chargrid">${[...known].filter((c) => D.chars[c]).map((c) => `<a class="chartile" href="#/c/${encodeURIComponent(c)}"><span class="zhs">${esc(c)}</span><small>${esc(D.chars[c].hv?.[0] || '')}</small></a>`).join('')}</div>` : '<div class="empty">Học từ mới để mở khóa chữ.</div>'}
  </section>`;
}

export function radical(view, r) {
  const rad = D.radByChar.get(r);
  const list = Object.entries(D.chars).filter(([, i]) => {
    const rr = D.radByChar.get(i.rad);
    return (rr && rad && rr.r === rad.r) || i.rad === r || (i.comp || []).includes(r);
  }).map(([c]) => c);
  const cards = store.get().cards;
  const known = new Set();
  for (const id of Object.keys(cards)) { const w = D.byId.get(id); if (w) for (const c of w.w) known.add(c); }
  view.innerHTML = `
  <header class="head"><div><span class="cap"><a href="#/chars" style="text-decoration:none">← Chữ Hán &amp; bộ thủ</a>${rad ? ` · Bộ số ${rad.no}/214` : ''}</span>
    <h1 class="h1"><span class="zhs rad" style="color:var(--radical)">${esc(rad ? rad.r : r)}</span> ${esc(rad ? 'Bộ ' + rad.name : r)}</h1>
    ${rad ? `<span class="soft">Nghĩa: ${esc(rad.mean)}${rad.v.length ? ` · Dạng biến thể: <span class="zhs">${esc(rad.v.join(' '))}</span>` : ''}</span>` : ''}</div></header>
  <section class="card"><h2 class="h2">${list.length} chữ HSK 1–4 chứa bộ này</h2>
    <div class="chargrid">${list.map((c) => `<a class="chartile ${known.has(c) ? 'known' : ''}" href="#/c/${encodeURIComponent(c)}"><span class="zhs">${esc(c)}</span><small>${esc(D.chars[c].hv?.[0] || '')}</small></a>`).join('')}</div>
    <span class="muted" style="font-size:12px">Ô có viền = chữ bạn đã gặp</span>
  </section>`;
}

export function charPage(view, c) {
  const ch = D.chars[c];
  if (!ch) {
    const ci = compInfo(c);
    view.innerHTML = `<header class="head"><div><span class="cap"><a href="#/chars" style="text-decoration:none">← Chữ Hán</a></span><h1 class="h1"><span class="zhs">${esc(c)}</span> ${esc(ci.name || '')}</h1><span class="soft">${esc(ci.mean || 'Thành phần chữ, không phải chữ độc lập trong HSK 1–4.')}</span></div></header>`;
    return;
  }
  const ws = D.byChar.get(c) || [];
  const rel = (D.relByChar.get(c) || []).slice(0, 12);
  const cards = store.get().cards;
  view.innerHTML = `
  <header class="head"><div><span class="cap"><a href="#/chars" style="text-decoration:none">← Chữ Hán &amp; bộ thủ</a></span>
    <h1 class="h1"><span class="zhs">${esc(c)}</span> <span class="hv">${esc((ch.hv || []).join(' / '))}</span></h1>
    <span class="soft">${pyHTML((ch.py || []).join(' '))} · ${esc(ch.vi || ch.en)}</span></div>
    <button class="btn" data-say="${esc(c)}">Nghe</button></header>
  <div class="row">
    <section class="card" style="flex:1 1 300px;align-items:center">
      <div class="sbox lg" id="big"></div>
      <div class="btns"><button class="btn sm" id="anim">Chạy animation</button><button class="btn sm" id="quiz">Tập viết</button></div>
      <span class="muted" style="font-size:12px">${ch.sk} nét · nét thuộc bộ thủ được tô màu riêng</span>
    </section>
    <section class="card" style="flex:1.4 1 420px"><h2 class="h2"><span class="zhs">字形</span>Cấu tạo</h2>${compositionHTML(c)}</section>
  </div>
  <section class="card"><h2 class="h2"><span class="zhs">词语</span>Từ HSK 1–4 chứa chữ ${esc(c)} · ${ws.length}</h2><div class="wgrid">${ws.map((w) => tile(w, cards)).join('')}</div></section>
  ${rel.length ? `<section class="card"><h2 class="h2"><span class="zhs">拓展</span>Cấp cao hơn</h2><div class="wgrid">${rel.map((r) => `<div class="wtile"><span class="lv">HSK ${r.l}</span><span class="w">${esc(r.w)}</span><span>${pyHTML(r.p)} · <span class="hv">${esc(r.hv)}</span></span><span class="m">${esc(r.vi)}</span></div>`).join('')}</div></section>` : ''}`;
  const wr = makeWriter(view.querySelector('#big'), c, 240);
  view.querySelector('#anim').onclick = () => wr?.animateCharacter();
  view.querySelector('#quiz').onclick = () => { wr?.hideCharacter(); wr?.quiz({ showHintAfterMisses: 2 }); };
  view.querySelector('[data-say]').onclick = () => speak(c);
  setTimeout(() => wr?.animateCharacter(), 300);
}

export { levelChip };
