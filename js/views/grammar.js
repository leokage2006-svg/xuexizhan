import { D } from '../data.js';
import * as store from '../store.js';
import * as ai from '../ai.js';
import { esc, ICON, toast } from '../util.js';
import { speak } from '../speech.js';

export function grammarList(view) {
  const done = store.get().grammar;
  view.innerHTML = `
  <header class="head"><div><span class="cap">${D.grammar.length} điểm trọng tâm HSK 1–4 · đã học ${Object.keys(done).length}</span>
    <h1 class="h1"><span class="zhs">语法</span> Ngữ pháp</h1>
    <span class="soft">Mỗi điểm có cấu trúc, giải thích bằng tiếng Việt, ví dụ và mẹo Hán Việt. Muốn hỏi thêm thì dùng nút AI trong từng bài.</span></div></header>
  ${[1, 2, 3, 4].map((l) => {
    const gs = D.grammar.filter((g) => g.l === l);
    return gs.length ? `<section class="card"><h2 class="h2">HSK ${l}</h2>
      <div class="ggrid">${gs.map((g) => `<a class="gcard" href="#/g/${g.id}" style="${done[g.id] ? 'border-color:var(--accent-line)' : ''}">
        <span class="zhs" style="font-size:24px">${esc(g.zh)}</span>
        <span class="lux" style="font-size:20px">${esc(g.t)}</span>
        <p class="zh">${esc(g.form)}</p>
        ${done[g.id] ? '<span class="cap" style="margin-top:4px">✓ đã học</span>' : ''}</a>`).join('')}</div></section>` : '';
  }).join('')}`;
}

export function grammarPage(view, id) {
  const g = D.grammarBy.get(id);
  if (!g) { view.innerHTML = '<div class="empty">Không có điểm ngữ pháp này.</div>'; return; }
  const st = store.get();
  const idx = D.grammar.indexOf(g);
  const next = D.grammar[idx + 1];
  view.innerHTML = `
  <header class="head"><div><span class="cap"><a href="#/grammar" style="text-decoration:none">← Ngữ pháp</a> · HSK ${g.l}</span>
    <h1 class="h1" style="font-size:40px">${esc(g.t)}</h1></div>
    <div class="btns">${st.grammar[g.id] ? '<span class="chip acc">✓ Đã học</span>' : '<button class="btn pri" id="mark">Đánh dấu đã học</button>'}${next ? `<a class="btn" href="#/g/${next.id}">Bài tiếp →</a>` : ''}</div></header>
  <div class="row">
    <div class="stack grow">
      <section class="card hi">
        <span class="cap">Cấu trúc</span>
        <span class="zh" style="font-size:24px">${esc(g.form)}</span>
        <p style="margin:0" class="soft">${esc(g.ex)}</p>
        ${g.tip ? `<p style="margin:0"><span class="cap" style="margin-right:8px">Mẹo</span>${esc(g.tip)}</p>` : ''}
      </section>
      <section class="card"><h2 class="h2"><span class="zhs">例句</span>Câu ví dụ</h2>
        ${g.egs.map((e) => `<div class="ex"><span class="zh">${esc(e[0].replace(/\|/g, ''))} <button class="btn sm" data-say="${esc(e[0].replace(/\|/g, ''))}" aria-label="Nghe câu">${ICON.sound}</button></span><span class="py">${esc(e[1])}</span><span>${esc(e[2])}</span></div>`).join('')}
        <a class="btn sm" href="#/games/sentence" style="align-self:flex-start">Luyện xếp câu với các ví dụ này</a>
      </section>
    </div>
    <section class="card" style="flex:1 1 320px">
      <h2 class="h2"><span class="zhs">问</span>Hỏi thêm AI</h2>
      <label class="f">Câu hỏi của bạn (để trống = xin thêm ví dụ và lỗi hay gặp)
        <textarea id="q" rows="3" style="font-family:var(--sans);font-size:15px"></textarea></label>
      <button class="btn" id="ask">${ICON.spark} Hỏi</button>
      <div id="out">${st.ai['g:' + g.id] ? `<div class="ai-out">${esc(st.ai['g:' + g.id])}</div>` : (ai.aiReady() ? '' : '<p class="muted" style="margin:0">Cần thêm khóa Gemini miễn phí trong <a href="#/settings">Cài đặt</a>.</p>')}</div>
    </section>
  </div>`;
  view.querySelectorAll('[data-say]').forEach((b) => b.onclick = () => speak(b.dataset.say));
  view.querySelector('#mark')?.addEventListener('click', () => { st.grammar[g.id] = Date.now(); store.addXP(10); toast('Đã học xong điểm ngữ pháp · +10 XP'); grammarPage(view, id); });
  view.querySelector('#ask').onclick = async (e) => {
    const out = view.querySelector('#out');
    e.target.disabled = true;
    out.innerHTML = '<p class="muted" style="margin:0">Đang hỏi AI…</p>';
    try {
      const text = await ai.ask(ai.promptGrammar(g, view.querySelector('#q').value.trim()));
      st.ai['g:' + g.id] = text; store.save();
      out.innerHTML = `<div class="ai-out">${esc(text)}</div>`;
    } catch (err) { out.innerHTML = `<p class="bad" style="margin:0">${esc(err.message)}</p>`; }
    e.target.disabled = false;
  };
}
