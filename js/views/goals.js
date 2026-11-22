import { D, cumulative } from '../data.js';
import * as store from '../store.js';
import * as plan from '../plan.js';
import { esc, today, fmtDate, daysBetween, toast } from '../util.js';

export function goals(view) {
  const st = store.get();
  const draw = () => {
    const total = plan.targetTotal();
    const learned = plan.learnedCount();
    const pj = plan.projection();
    const q = plan.quota();
    const left = plan.daysLeft();
    const lp = plan.levelProgress();

    // Đường tích lũy số từ đã học
    const added = Object.values(st.cards).map((c) => c.added).sort((a, b) => a - b);
    const start = added.length ? new Date(added[0]) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(st.settings.targetDate + 'T00:00:00');
    const span = Math.max(1, (end - start) / 86400000);
    const W = 640, H = 220, P = 34;
    const x = (t) => P + ((t - start) / 86400000 / span) * (W - P * 2);
    const y = (n) => H - P - (n / Math.max(1, total)) * (H - P * 2);
    let pts = `${x(start)},${y(0)}`;
    added.forEach((t, k) => { pts += ` ${x(t)},${y(k + 1)}`; });
    pts += ` ${x(Date.now())},${y(added.length)}`;
    const ideal = `${x(start)},${y(added.filter((t) => t < start.getTime() + 86400000).length)} ${x(end)},${y(total)}`;

    // Thời gian học 14 ngày
    const days = [];
    const c = new Date(); c.setDate(c.getDate() - 13);
    for (let i = 0; i < 14; i++) { const k = today(c); days.push([k, Math.round((st.log[k]?.sec || 0) / 60)]); c.setDate(c.getDate() + 1); }
    const maxMin = Math.max(30, ...days.map((d) => d[1]));
    const totalMin = Math.round(Object.values(st.log).reduce((s, v) => s + (v.sec || 0), 0) / 60);

    view.innerHTML = `
    <header class="head"><div><span class="cap">Kế hoạch tự điều chỉnh theo tốc độ của bạn</span>
      <h1 class="h1"><span class="zhs">目标</span> Mục tiêu</h1></div></header>
    <section class="stats">
      <div class="stat"><span class="cap">Mục tiêu</span><b>HSK ${st.settings.targetLevel}</b><span>${total} từ · hạn ${fmtDate(st.settings.targetDate)}</span></div>
      <div class="stat"><span class="cap">Đã học</span><b>${learned}<small> / ${total}</small></b><span>${Math.round((learned / Math.max(1, total)) * 100)}%</span></div>
      <div class="stat"><span class="cap">Chỉ tiêu / ngày</span><b>${q}</b><span>${left} ngày còn lại</span></div>
      <div class="stat"><span class="cap">Dự kiến xong</span><b style="font-size:30px">${pj.done ? 'Đã xong' : pj.date ? fmtDate(pj.date) : '—'}</b><span>${pj.pace ? `tốc độ ${pj.pace.toFixed(1)} từ/ngày (7 ngày qua)` : 'Học vài ngày để có dự đoán'}</span></div>
    </section>
    ${pj.date && daysBetween(pj.date, st.settings.targetDate) < 0 ? `<section class="card" style="border-color:var(--bad-line)"><b class="bad">Với tốc độ hiện tại bạn sẽ trễ hạn ${-daysBetween(pj.date, st.settings.targetDate)} ngày.</b><span class="soft">Tăng lên ${q} từ mỗi ngày, hoặc dời hạn cho vừa sức. Học nhanh mà không ôn kịp thì quên cũng nhanh.</span></section>` : ''}
    <section class="card">
      <div class="between"><h2 class="h2"><span class="zhs">进度</span>Tiến độ so với kế hoạch</h2>
        <span class="muted" style="font-size:12px">— thực tế · - - - đường lý tưởng</span></div>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Biểu đồ số từ đã học theo thời gian so với kế hoạch" style="width:100%;height:auto">
        <line x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}" stroke="var(--line2)"/>
        <line x1="${P}" y1="${y(total)}" x2="${W - P}" y2="${y(total)}" stroke="var(--line)" stroke-dasharray="2 4"/>
        <text x="${P}" y="${y(total) - 6}" fill="var(--muted)" font-size="11">${total} từ</text>
        <polyline points="${ideal}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="6 5"/>
        <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="${x(Date.now())}" cy="${y(added.length)}" r="4" fill="var(--accent)"/>
        <text x="${P}" y="${H - 12}" fill="var(--muted)" font-size="11">${fmtDate(today(start))}</text>
        <text x="${W - P}" y="${H - 12}" fill="var(--muted)" font-size="11" text-anchor="end">${fmtDate(st.settings.targetDate)}</text>
      </svg>
    </section>
    <div class="row">
      <section class="card"><h2 class="h2"><span class="zhs">等级</span>Theo cấp</h2>
        ${lp.map((l) => `<div class="stack" style="gap:6px"><div class="between"><b>HSK ${l.l}</b><span class="muted">${l.done} / ${l.total}</span></div><div class="progress"><i style="width:${(l.done / Math.max(1, l.total)) * 100}%"></i></div></div>`).join('')}
        <span class="muted" style="font-size:12px">Ngữ pháp: ${Object.keys(st.grammar).length} / ${D.grammar.length} điểm</span>
      </section>
      <section class="card"><div class="between"><h2 class="h2"><span class="zhs">时间</span>Thời gian học</h2><span class="muted">${Math.floor(totalMin / 60)} giờ ${totalMin % 60} phút tổng</span></div>
        <div class="bars" role="img" aria-label="Số phút học mỗi ngày trong 14 ngày gần đây">${days.map(([k, m]) => `<div title="${fmtDate(k)}: ${m} phút"><i class="${m ? '' : 'zero'}" style="height:${(m / maxMin) * 100}%"></i><span>${k.slice(8)}</span></div>`).join('')}</div>
        <span class="muted" style="font-size:12px">Chỉ tính lúc bạn thực sự thao tác trên web</span>
      </section>
    </div>
    <section class="card"><h2 class="h2"><span class="zhs">设定</span>Đổi mục tiêu</h2>
      <form id="gf" class="form-grid">
        <label class="f">Cấp mục tiêu<select id="g-level">${[2, 3, 4].map((l) => `<option value="${l}" ${l === st.settings.targetLevel ? 'selected' : ''}>HSK ${l} (${cumulative(l)} từ)</option>`).join('')}</select></label>
        <label class="f">Hạn hoàn thành<input type="date" id="g-date" value="${esc(st.settings.targetDate)}"></label>
        <label class="f">Từ mới mỗi ngày (0 = tự tính)<input type="number" id="g-new" min="0" max="80" value="${st.settings.newPerDay}"></label>
        <div style="display:flex;align-items:flex-end"><button class="btn pri" type="submit">Lưu mục tiêu</button></div>
      </form></section>`;
    view.querySelector('#gf').onsubmit = (e) => {
      e.preventDefault();
      st.settings.targetLevel = +view.querySelector('#g-level').value;
      st.settings.targetDate = view.querySelector('#g-date').value || st.settings.targetDate;
      st.settings.newPerDay = Math.max(0, +view.querySelector('#g-new').value || 0);
      store.save(); toast('Đã cập nhật mục tiêu'); draw();
    };
  };
  draw();
}
