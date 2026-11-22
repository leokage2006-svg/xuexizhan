import * as store from '../store.js';
import * as ai from '../ai.js';
import { D } from '../data.js';
import { esc, today, fmtDate, toast, ICON } from '../util.js';

export function diary(view) {
  const st = store.get();
  const draw = () => {
    const entries = st.diary;
    const words = new Set();
    for (const e of entries) for (const w of D.words) if (w.w.length > 1 && e.text.includes(w.w)) words.add(w.w);
    view.innerHTML = `
    <header class="head"><div><span class="cap">${entries.length} bài · đã dùng ${words.size} từ HSK nhiều chữ</span>
      <h1 class="h1"><span class="zhs">日记</span> Nhật ký</h1>
      <span class="soft">Mỗi ngày viết 1–3 câu bằng tiếng Trung. Vài tuần sau đọc lại sẽ thấy rõ mình tiến bộ.</span></div></header>
    <section class="card hi">
      <label class="h2" for="d-text"><span class="zhs">今天</span>${fmtDate(today())}</label>
      <textarea id="d-text" rows="4" placeholder="今天我学了二十个新词。我觉得汉字很有意思……"></textarea>
      <div class="btns"><button class="btn pri" id="d-save">Lưu bài · +5 XP</button>
        <button class="btn" id="d-ai">${ICON.spark} Lưu &amp; nhờ AI sửa</button>
        ${ai.aiReady() ? '' : '<span class="muted" style="font-size:13px">AI sửa câu cần khóa Gemini trong <a href="#/settings">Cài đặt</a>.</span>'}</div>
      <div id="d-out"></div>
    </section>
    ${entries.length ? entries.map((e) => `<section class="card">
      <div class="between"><span class="cap">${fmtDate(e.d)}</span><button class="btn sm" data-del="${e.id}" aria-label="Xóa bài này">Xóa</button></div>
      <p class="zh" style="margin:0;font-size:18px;line-height:1.8;white-space:pre-wrap">${esc(e.text)}</p>
      ${e.ai ? `<details class="more"><summary>Bản sửa của AI</summary><div class="ai-out" style="margin-top:10px">${esc(e.ai)}</div></details>` : `<button class="btn sm" data-fix="${e.id}" style="align-self:flex-start">${ICON.spark} Nhờ AI sửa bài này</button>`}
    </section>`).join('') : '<div class="empty">Chưa có bài nào. Bắt đầu bằng một câu thật đơn giản: 今天我很高兴。</div>'}`;

    const ta = view.querySelector('#d-text');
    const add = () => {
      const text = ta.value.trim();
      if (!text) { toast('Viết ít nhất một câu nhé'); return null; }
      const e = { id: `${Date.now()}`, d: today(), text, ts: Date.now() };
      st.diary.unshift(e);
      store.addXP(5);
      return e;
    };
    view.querySelector('#d-save').onclick = () => { if (add()) { toast('Đã lưu · +5 XP'); draw(); } };
    view.querySelector('#d-ai').onclick = async () => { const e = add(); if (e) { draw(); fix(e.id); } };
    view.querySelectorAll('[data-fix]').forEach((b) => b.onclick = () => fix(b.dataset.fix));
    view.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => {
      if (!confirm('Xóa bài nhật ký này?')) return;
      st.diary = st.diary.filter((x) => x.id !== b.dataset.del); store.save(); draw();
    });
  };
  const fix = async (id) => {
    const e = st.diary.find((x) => x.id === id);
    const out = view.querySelector('#d-out');
    out.innerHTML = '<p class="muted" style="margin:0">AI đang đọc bài của bạn…</p>';
    out.scrollIntoView({ block: 'nearest' });
    try {
      e.ai = await ai.ask(ai.promptDiary(e.text));
      store.save();
      draw();
      view.querySelector('#d-out').innerHTML = `<div class="ai-out">${esc(e.ai)}</div>`;
    } catch (err) {
      out.innerHTML = `<p class="bad" style="margin:0">${esc(err.message)}</p>`;
    }
  };
  draw();
}
