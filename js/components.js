// Các khối giao diện dùng chung: thẻ từ, cấu tạo chữ, ô viết nét
import { D, ETYM, compInfo, charDataLoader } from './data.js';
import { esc, pyHTML, ICON, toast } from './util.js';
import * as store from './store.js';
import { speak } from './speech.js';
import * as ai from './ai.js';

const isHan = (c) => /[一-鿿]/.test(c);

export function levelChip(l) { return `<span class="chip">HSK ${l}</span>`; }
export function topicChip(code) {
  const t = D.topicBy.get(code);
  return t ? `<a class="chip" href="#/words/${code}"><span class="zh">${esc(t.zh)}</span> ${esc(t.vi)}</a>` : '';
}

function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

/** Tạo ô viết nét Hanzi Writer */
export function makeWriter(el, char, size = 170, opts = {}) {
  if (!window.HanziWriter || !isHan(char)) return null;
  el.innerHTML = '<div class="diag"></div><div></div>';
  const target = el.lastElementChild;
  try {
    return HanziWriter.create(target, char, {
      width: size, height: size, padding: 12,
      strokeColor: css('--stroke'), radicalColor: css('--radical'), outlineColor: css('--outline'),
      highlightColor: css('--accent'), drawingColor: css('--accent'),
      strokeAnimationSpeed: 1, delayBetweenStrokes: 260, showOutline: true,
      charDataLoader, ...opts,
    });
  } catch { return null; }
}

/** Phần cấu tạo một chữ */
export function compositionHTML(c) {
  const ch = D.chars[c];
  if (!ch) return '';
  const et = ETYM[ch.type];
  const parts = (ch.comp || []).filter((x) => x && x !== '？').map((x) => {
    const ci = compInfo(x);
    const role = ch.sem === x ? 'chỉ nghĩa' : ch.pho === x ? 'gợi âm' : '';
    const isRad = x === ch.rad || (D.radByChar.get(x) && D.radByChar.get(x) === D.radByChar.get(ch.rad));
    const href = D.chars[x] ? `#/c/${encodeURIComponent(x)}` : (ci.isRad ? `#/r/${encodeURIComponent(ci.radBase || x)}` : null);
    const tag = href ? 'a' : 'div';
    return `<${tag} class="part ${isRad ? 'is-rad' : ''}" ${href ? `href="${href}"` : ''}>
      <span class="pc">${esc(x)}</span>
      <span class="pt"><b>${esc(ci.name || '—')}</b><small>${esc(ci.mean || '')}</small>${role ? `<span class="role">${role}</span>` : ''}</span>
    </${tag}>`;
  });
  let story = '';
  if (ch.hint) story = esc(ch.hint);
  else if (ch.type === 'pictophonetic' && ch.sem) {
    const s = compInfo(ch.sem), p = ch.pho ? compInfo(ch.pho) : null;
    story = `${esc(ch.sem)} (${esc(s.name || s.mean)}) chỉ nghĩa${p ? `, ${esc(ch.pho)} (${esc(p.hv || p.name)}) gợi âm` : ''}.`;
  }
  const radInfo = compInfo(ch.rad);
  return `<div class="comp">
    <div class="eq">
      <a class="ch" href="#/c/${encodeURIComponent(c)}">${esc(c)}</a>
      ${parts.length ? '<span class="op">=</span>' + parts.join('<span class="op">+</span>') : ''}
    </div>
    <div class="chips">
      ${et ? `<span class="chip acc">${et[0]} · ${et[1]}</span>` : ''}
      <span class="chip">Hán Việt: <span class="hv">${esc((ch.hv || []).join(' / ') || '—')}</span></span>
      ${ch.rad ? `<span class="chip">Bộ thủ chính: <span class="zhs rad">${esc(ch.rad)}</span> ${esc(radInfo.name || '')}</span>` : ''}
      ${ch.sk ? `<span class="chip">${ch.sk} nét</span>` : ''}
    </div>
    ${story ? `<span>${story}</span>` : ''}
    ${ch.vi ? `<span class="muted">Nghĩa của chữ: ${esc(ch.vi)}</span>` : ''}
  </div>`;
}

function relatedHTML(w) {
  const chars = [...new Set(w.w)].filter(isHan);
  const same = [];
  const seen = new Set([w.w]);
  for (const c of chars) for (const x of D.byChar.get(c) || []) {
    if (!seen.has(x.w)) { seen.add(x.w); same.push(x); }
  }
  const higher = [];
  for (const c of chars) for (const x of D.relByChar.get(c) || []) {
    if (!seen.has(x.w) && x.w.length > 1) { seen.add(x.w); higher.push(x); }
  }
  const tile = (x, hsk) => `<a class="wtile" href="${x.id ? `#/w/${x.id}` : `#/s/${encodeURIComponent(x.w)}`}">
      <span class="lv">HSK ${x.l}</span>
      <span class="w">${esc(x.w)}</span>
      <span>${pyHTML(x.p)} · <span class="hv">${esc(x.hv)}</span></span>
      <span class="m">${esc(x.vi)}</span></a>`;
  return `
  ${same.length ? `<section class="card"><h2 class="h2"><span class="zhs">同字</span>Từ cùng chữ trong HSK 1–4</h2>
    <div class="wgrid">${same.slice(0, 12).map((x) => tile(x)).join('')}</div></section>` : ''}
  ${higher.length ? `<section class="card"><h2 class="h2"><span class="zhs">拓展</span>Mở rộng · từ cấp cao cùng gốc</h2>
    <div class="wgrid">${higher.sort((a, b) => a.l - b.l).slice(0, 8).map((x) => tile(x)).join('')}</div></section>` : ''}`;
}

/** Thẻ từ đầy đủ */
export function wordHTML(w, { compact = false } = {}) {
  const st = store.get();
  const c = st.cards[w.id];
  const chars = [...w.w].filter(isHan);
  const alt = (w.alt || []).map((a) => `${pyHTML(a.p)} <span class="muted">${esc(a.vi)}</span>`).join(' · ');
  return `
  <div class="row">
    <div class="stack" style="flex:1 1 380px">
      <section class="card hero">
        <span class="big">${esc(w.w)}</span>
        <span class="py">${pyHTML(w.p)}</span>
        <span class="hvbig">${esc(w.hv)}</span>
        <span class="rule"></span>
        <span class="mean">${esc(w.vi)}</span>
        <div class="chips" style="justify-content:center;margin-top:8px">
          ${levelChip(w.l)}${topicChip(w.tp)}${(w.pos || []).map((p) => `<span class="chip">${esc(p)}</span>`).join('')}
          ${w.cl?.length ? `<span class="chip">Lượng từ: <span class="zh">${esc(w.cl.join('、'))}</span></span>` : ''}
        </div>
        ${alt ? `<span class="muted" style="font-size:13px">Âm khác: ${alt}</span>` : ''}
        <div class="btns" style="justify-content:center;margin-top:10px">
          <button class="btn pri" data-say="${esc(w.w)}">${ICON.sound} Nghe</button>
          ${compact ? '' : (c ? `<span class="chip acc">Đã thêm vào ôn tập</span>` : `<button class="btn" data-add="${w.id}">+ Thêm vào ôn tập</button>`)}
        </div>
      </section>
      <section class="card">
        <div class="between"><h2 class="h2"><span class="zhs">笔顺</span>Thứ tự nét</h2>
          <span class="muted" style="font-size:12px">Nét thuộc bộ thủ được tô màu riêng</span></div>
        <div class="strokes">${chars.map((ch, i) => `<div class="sbox" data-writer="${esc(ch)}" data-i="${i}"></div>`).join('')}</div>
        <div class="btns" style="justify-content:center">
          <button class="btn sm" data-anim>${ICON.play} Chạy animation</button>
          <button class="btn sm" data-quiz>${ICON.pen} Tập viết theo nét</button>
        </div>
      </section>
    </div>
    <div class="stack" style="flex:1.25 1 440px">
      <section class="card">
        <h2 class="h2"><span class="zhs">字形</span>Cấu tạo chữ · bộ thủ</h2>
        ${chars.map(compositionHTML).join('')}
        <details class="more"><summary>Nghĩa tiếng Anh (tham khảo)</summary><p class="muted">${esc(w.en)}</p></details>
      </section>
      ${compact ? '' : `
      <section class="card">
        <div class="between"><h2 class="h2"><span class="zhs">讲解</span>Giải thích sâu &amp; câu ví dụ</h2>
          <button class="btn sm" data-ai>${ICON.spark} ${st.ai[w.id] ? 'Hỏi lại AI' : 'Nhờ AI giải thích'}</button></div>
        <div data-ai-out>${st.ai[w.id] ? `<div class="ai-out">${esc(st.ai[w.id])}</div>` : `<p class="muted" style="margin:0">AI sẽ cho câu ví dụ, phân biệt từ dễ nhầm và mẹo nhớ bằng Hán Việt. ${ai.aiReady() ? '' : 'Cần thêm khóa Gemini miễn phí trong <a href="#/settings">Cài đặt</a>.'}</p>`}</div>
      </section>
      <section class="card">
        <label class="h2" for="note-${w.id}"><span class="zhs">笔记</span>Ghi chú của bạn</label>
        <textarea id="note-${w.id}" rows="2" data-note placeholder="Câu ví dụ tự đặt, mẹo nhớ riêng…">${esc(st.notes[w.id] || '')}</textarea>
        <div class="btns"><button class="btn sm" data-flag>${st.flags[w.id] ? 'Đã đánh dấu sai · bỏ đánh dấu' : 'Báo dữ liệu sai'}</button></div>
      </section>`}
    </div>
  </div>
  ${compact ? '' : relatedHTML(w)}`;
}

/** Gắn sự kiện cho thẻ từ vừa render */
export function mountWord(root, w, { onAdd, speakNow = false, autoAnim = true } = {}) {
  const writers = [];
  root.querySelectorAll('[data-writer]').forEach((el) => {
    const wr = makeWriter(el, el.dataset.writer, 170);
    if (wr) writers.push(wr);
  });
  const animate = async () => {
    for (const wr of writers) { await new Promise((res) => wr.animateCharacter({ onComplete: res })); }
  };
  root.querySelector('[data-anim]')?.addEventListener('click', animate);
  root.querySelector('[data-quiz]')?.addEventListener('click', () => {
    let i = 0;
    const next = () => {
      if (i >= writers.length) { toast('Viết đúng hết rồi! 很好！'); store.addXP(3); return; }
      const wr = writers[i++];
      wr.hideCharacter();
      wr.quiz({ onComplete: next, showHintAfterMisses: 2 });
    };
    next();
    toast('Viết từng nét theo đúng thứ tự trong ô');
  });
  root.querySelectorAll('[data-say]').forEach((b) => b.addEventListener('click', () => speak(b.dataset.say)));
  root.querySelector('[data-add]')?.addEventListener('click', (e) => {
    store.addCard(w.id);
    e.target.outerHTML = '<span class="chip acc">Đã thêm vào ôn tập</span>';
    toast('Đã thêm vào ôn tập · +5 XP');
    onAdd && onAdd();
  });
  const note = root.querySelector('[data-note]');
  note?.addEventListener('input', () => { store.get().notes[w.id] = note.value; store.save(); });
  root.querySelector('[data-flag]')?.addEventListener('click', (e) => {
    const f = store.get().flags;
    if (f[w.id]) delete f[w.id]; else f[w.id] = Date.now();
    store.save();
    e.target.textContent = f[w.id] ? 'Đã đánh dấu sai · bỏ đánh dấu' : 'Báo dữ liệu sai';
    if (f[w.id]) toast('Đã ghi lại. Danh sách nằm trong Cài đặt để bạn tự sửa sau.');
  });
  root.querySelector('[data-ai]')?.addEventListener('click', async (e) => {
    const out = root.querySelector('[data-ai-out]');
    const btn = e.currentTarget;
    btn.disabled = true;
    out.innerHTML = '<p class="muted" style="margin:0">Đang hỏi AI…</p>';
    try {
      const chars = [...w.w].filter(isHan).map((c) => {
        const ch = D.chars[c];
        return `${c} (${(ch?.hv || []).join('/')}) = ${(ch?.comp || []).join(' + ')}${ch?.hint ? ' — ' + ch.hint : ''}`;
      }).join('; ');
      const text = await ai.ask(ai.promptWord(w, chars));
      store.get().ai[w.id] = text; store.save();
      out.innerHTML = `<div class="ai-out">${esc(text)}</div>`;
    } catch (err) {
      out.innerHTML = `<p class="bad" style="margin:0">${esc(err.message)}</p>`;
    }
    btn.disabled = false;
  });
  if (speakNow && store.get().settings.autoSpeak) speak(w.w);
  if (autoAnim) setTimeout(() => writers[0] && animate(), 400);
  return { writers, animate };
}
