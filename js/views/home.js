import { D, cumulative } from '../data.js';
import * as store from '../store.js';
import * as plan from '../plan.js';
import { esc, pyHTML, today, fmtDate, toast } from '../util.js';
import { speak } from '../speech.js';

const WEEKDAY = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

export function home(view) {
  const st = store.get();
  const d = new Date();
  const learned = plan.learnedCount();
  const total = plan.targetTotal();
  const q = plan.quota();
  const doneNew = store.dayLog().new || 0;
  const due = store.dueCount();
  const left = plan.daysLeft();
  const lp = plan.levelProgress();
  const next = plan.nextWords(6);
  const t = next[0] ? D.topicBy.get(next[0].tp) : null;
  const g = plan.grammarOfDay();
  const pct = Math.round((learned / Math.max(1, total)) * 100);
  const greet = d.getHours() < 11 ? '早上好' : d.getHours() < 18 ? '你好' : '晚上好';
  const dayNo = Math.max(1, Object.keys(st.log).length);

  // 14 ngày gần nhất
  const days = [];
  const c = new Date();
  c.setDate(c.getDate() - 13);
  for (let i = 0; i < 14; i++) { const k = today(c); days.push([k, st.log[k] || {}]); c.setDate(c.getDate() + 1); }
  const maxAct = Math.max(1, ...days.map(([, v]) => (v.new || 0) + (v.rev || 0)));

  view.innerHTML = `
  <header class="head">
    <div>
      <span class="cap">${WEEKDAY[d.getDay()]} · ${fmtDate(today())} · <span class="zh" style="letter-spacing:1px">第${dayNo}天</span></span>
      <h1 class="h1"><span class="zhs">${greet}</span>, ${esc(st.profile.name || 'bạn')}</h1>
      <span class="soft">Đích đến: <b style="color:var(--text)">HSK ${st.settings.targetLevel} · ${total} từ</b> trước ${fmtDate(st.settings.targetDate)}</span>
    </div>
    <div class="btns">
      ${due ? `<a class="btn big" href="#/review">Ôn ${due} thẻ</a>` : ''}
      <a class="btn pri big" href="#/learn">${doneNew >= q ? 'Học thêm từ mới' : 'Bắt đầu buổi học'} →</a>
    </div>
  </header>

  <section class="stats" aria-label="Chỉ số">
    <div class="stat"><span class="cap">Từ đã học <span class="zh">已学</span></span><b>${learned}<small> / ${total}</small></b><span>${pct}% mục tiêu</span></div>
    <div class="stat"><span class="cap">Từ mới hôm nay <span class="zh">今天</span></span><b>${doneNew}<small> / ${q}</small></b><span>${st.settings.newPerDay ? 'Chỉ tiêu bạn tự đặt' : 'Tự tính theo ngày còn lại'}</span></div>
    <div class="stat"><span class="cap">Cần ôn <span class="zh">复习</span></span><b>${due}</b><span>Thẻ đến hạn lúc này</span></div>
    <div class="stat"><span class="cap">Còn lại <span class="zh">倒计时</span></span><b>${left}<small> ngày</small></b><span>Chuỗi học · ${store.streak()} ngày</span></div>
  </section>

  <section class="card">
    <div class="between"><h2 class="h2"><span class="zhs">路线图</span>Lộ trình HSK 3.0</h2>
      <span class="cap">đề cương 11.2025</span></div>
    <div class="road">${lp.map((x) => `<i style="flex:${x.total} 1 0"><em style="width:${(x.done / Math.max(1, x.total)) * 100}%"></em></i>`).join('')}</div>
    <div class="road-l">${lp.map((x) => `<div style="flex:${x.total} 1 0"><b style="${x.done >= x.total ? 'color:var(--accent)' : ''}">HSK ${x.l}${x.done >= x.total ? ' ✓' : ''}</b><span class="muted">${x.done} / ${x.total}${x.l === 3 ? ' · có thi nói' : ''}</span></div>`).join('')}</div>
    <span class="muted" style="font-size:12px">Cộng dồn: HSK 1 = ${cumulative(1)}, HSK 2 = ${cumulative(2)}, HSK 3 = ${cumulative(3)}, HSK 4 = ${cumulative(4)} từ.</span>
  </section>

  <div class="row">
    <section class="card grow">
      <div class="between">
        <h2 class="h2">${t ? `<span class="zhs">${esc(t.zh)}</span>${esc(t.vi)}` : 'Tiếp theo'}</h2>
        <a href="#/learn" style="font-size:13px;text-decoration:none">Vào bài học →</a>
      </div>
      ${next.length ? `<div class="tbl-wrap"><table class="tbl">
        <thead><tr><th scope="col">Chữ Hán</th><th scope="col">Pinyin</th><th scope="col">Hán Việt</th><th scope="col">Nghĩa</th></tr></thead>
        <tbody>${next.map((w) => `<tr class="click" data-href="#/w/${w.id}"><td class="w">${esc(w.w)}</td><td>${pyHTML(w.p)}</td><td class="hv">${esc(w.hv)}</td><td>${esc(w.vi.split(';')[0])}</td></tr>`).join('')}</tbody>
      </table></div>` : '<div class="empty">Bạn đã học hết từ của mục tiêu. 太棒了！</div>'}
      <div class="chips" style="font-size:12px"><span class="muted">Thanh điệu</span><span class="t1">● 1</span><span class="t2">● 2</span><span class="t3">● 3</span><span class="t4">● 4</span><span class="t0">● nhẹ</span></div>
    </section>

    <div class="stack">
      <section class="card">
        <span class="cap" style="color:var(--accent)">语法 · Ngữ pháp hôm nay · HSK ${g.l}</span>
        <h2 class="h2" style="font-size:22px">${esc(g.t)}</h2>
        <span class="zh soft">${esc(g.form)}</span>
        <a href="#/g/${g.id}" style="font-size:13px;text-decoration:none">Học điểm ngữ pháp này →</a>
      </section>
      <section class="card hi">
        <span class="cap" style="color:var(--accent)">游戏 · Thử thách hôm nay</span>
        <span class="lux" style="font-size:24px;font-weight:600;line-height:1.2">Ghép bộ thủ thành chữ</span>
        <a class="btn" href="#/games/radical" style="align-self:flex-start">Chơi ngay →</a>
      </section>
      <section class="card">
        <label for="q-diary" class="h2"><span class="zhs">日记</span>Nhật ký</label>
        <textarea id="q-diary" rows="3" placeholder="今天我……"></textarea>
        <div class="btns"><button class="btn sm" id="q-save">Lưu</button><a class="btn sm" href="#/diary">Mở nhật ký</a></div>
      </section>
    </div>
  </div>

  <section class="card">
    <div class="between"><h2 class="h2"><span class="zhs">活动</span>14 ngày gần đây</h2><span class="muted" style="font-size:12px">từ mới + lượt ôn mỗi ngày</span></div>
    <div class="bars" role="img" aria-label="Biểu đồ số lượt học 14 ngày gần đây">
      ${days.map(([k, v]) => { const n = (v.new || 0) + (v.rev || 0); return `<div title="${fmtDate(k)}: ${v.new || 0} từ mới, ${v.rev || 0} lượt ôn"><i class="${n ? '' : 'zero'}" style="height:${(n / maxAct) * 100}%"></i><span>${k.slice(8)}</span></div>`; }).join('')}
    </div>
  </section>`;

  view.querySelectorAll('tr[data-href]').forEach((tr) => tr.addEventListener('click', () => { location.hash = tr.dataset.href; }));
  view.querySelector('#q-save').addEventListener('click', () => {
    const ta = view.querySelector('#q-diary');
    if (!ta.value.trim()) return;
    store.get().diary.unshift({ id: `${Date.now()}`, d: today(), text: ta.value.trim(), ts: Date.now() });
    store.addXP(5);
    ta.value = '';
    toast('Đã lưu vào nhật ký · +5 XP');
  });
}

export function onboarding(view, done) {
  const st = store.get();
  view.innerHTML = `
  <header class="head"><div>
    <span class="cap">Thiết lập lần đầu · 1 phút</span>
    <h1 class="h1"><span class="zhs">欢迎</span> Chào mừng đến 学习站</h1>
    <span class="soft">Trang học tiếng Trung của riêng bạn: từ vựng HSK 3.0 theo chủ đề, hiểu chữ qua bộ thủ và âm Hán Việt, ôn tập ngắt quãng.</span>
  </div></header>
  <section class="card" style="max-width:720px">
    <form id="ob" class="stack" style="gap:16px">
      <label class="f">Bạn muốn được gọi là gì?
        <input type="text" id="ob-name" value="${esc(st.profile.name === 'Bạn' ? '' : st.profile.name)}" placeholder="Ví dụ: Bún" required maxlength="30"></label>
      <fieldset style="border:0;padding:0;margin:0;display:flex;flex-direction:column;gap:8px">
        <legend class="muted" style="font-size:13px;margin-bottom:6px">Bạn đã học xong HSK 1 (${cumulative(1)} từ, đề cương 2025) chưa?</legend>
        <label style="display:flex;gap:10px;align-items:center"><input type="radio" name="ob-l1" value="yes" checked> Rồi — đánh dấu ${cumulative(1)} từ HSK 1 là đã biết, web sẽ ôn lại dần</label>
        <label style="display:flex;gap:10px;align-items:center"><input type="radio" name="ob-l1" value="no"> Chưa — học từ đầu</label>
      </fieldset>
      <div class="form-grid">
        <label class="f">Mục tiêu
          <select id="ob-level"><option value="2">HSK 2 (${cumulative(2)} từ)</option><option value="3">HSK 3 (${cumulative(3)} từ)</option><option value="4" selected>HSK 4 (${cumulative(4)} từ)</option></select></label>
        <label class="f">Hạn hoàn thành
          <input type="date" id="ob-date" value="${esc(st.settings.targetDate)}" min="${today()}"></label>
      </div>
      <p class="muted" style="margin:0;font-size:13px" id="ob-calc"></p>
      <div class="btns"><button class="btn pri big" type="submit">Bắt đầu học →</button></div>
    </form>
  </section>`;
  const calc = () => {
    const lv = +view.querySelector('#ob-level').value;
    const yes = view.querySelector('input[name=ob-l1]:checked').value === 'yes';
    const remain = cumulative(lv) - (yes ? cumulative(1) : 0);
    const dd = Math.max(1, Math.round((new Date(view.querySelector('#ob-date').value) - new Date()) / 86400000));
    view.querySelector('#ob-calc').textContent = `Cần học ${remain} từ trong ${dd} ngày → khoảng ${Math.ceil(remain / dd)} từ mới mỗi ngày, cộng thêm thời gian ôn.`;
  };
  view.querySelectorAll('select, input').forEach((el) => el.addEventListener('input', calc));
  calc();
  view.querySelector('#ob').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = view.querySelector('#ob-name').value.trim() || 'Bạn';
    store.renameProfile(name);
    st.settings.targetLevel = +view.querySelector('#ob-level').value;
    st.settings.targetDate = view.querySelector('#ob-date').value || st.settings.targetDate;
    if (view.querySelector('input[name=ob-l1]:checked').value === 'yes') {
      store.markKnown((D.byLevel.get(1) || []).map((w) => w.id));
    }
    st.settings.onboarded = true;
    store.save(true);
    speak('欢迎');
    done();
  });
}
