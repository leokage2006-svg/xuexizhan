import * as store from '../store.js';
import * as sync from '../sync.js';
import { D } from '../data.js';
import { esc, toast, today } from '../util.js';
import { speak, hasVoice } from '../speech.js';

export function settings(view) {
  const draw = () => {
    const st = store.get();
    const s = st.settings;
    const list = store.profiles();
    const user = sync.currentUser();
    const flagged = Object.keys(st.flags).map((id) => D.byId.get(id)).filter(Boolean);
    view.innerHTML = `
    <header class="head"><div><span class="cap">Mọi thứ được lưu tự động</span><h1 class="h1"><span class="zhs">设置</span> Cài đặt</h1></div></header>

    <section class="card">
      <h2 class="h2"><span class="zhs">账号</span>Tài khoản</h2>
      ${sync.enabled ? `
        <p class="soft" style="margin:0">Trạng thái: <b>${esc(sync.status.text)}</b>${user ? ` · ${esc(user.email)}` : ''}</p>
        ${user ? `<div class="btns"><button class="btn" id="sync-now">Đồng bộ ngay</button><button class="btn" id="logout">Đăng xuất</button></div>
          <p class="muted" style="margin:0;font-size:13px">Muốn dùng Gmail khác? Bấm Đăng xuất rồi đăng nhập lại bằng Gmail đó. Mỗi Gmail có tiến độ riêng.</p>
          ${list.filter((p) => p.id.startsWith('local-') && store.peek(p.id)).map((p) => `<div class="btns"><span class="soft" style="font-size:14px">Tiến độ cũ trên máy này: <b>${esc(store.peek(p.id)?.profile?.name || p.name)}</b> (${Object.keys(store.peek(p.id)?.cards || {}).length} từ)</span><button class="btn sm" data-merge="${p.id}">Gộp vào tài khoản này</button></div>`).join('')}` : ''}` : `
        <p class="soft" style="margin:0">Đang lưu trên trình duyệt này. Muốn đồng bộ giữa máy tính và điện thoại, làm theo mục <b>Bật đồng bộ</b> trong README (khoảng 10 phút, miễn phí).</p>
        <div class="stack" style="gap:8px">${list.map((p, n) => `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--line)">
          <div class="avatar">${esc((p.name || '?')[0].toUpperCase())}</div><b style="flex:1">${esc(p.id === store.id() ? st.profile.name : p.name)} ${p.id === store.id() ? '<span class="chip acc">đang dùng</span>' : ''}</b>
          ${p.id === store.id() ? '' : `<button class="btn sm" data-sw="${p.id}">Chuyển sang</button><button class="btn sm" data-rm="${p.id}">Xóa</button>`}</div>`).join('')}</div>
        ${list.length < 4 ? '<button class="btn" id="add-prof" style="align-self:flex-start">+ Thêm tài khoản (tiến độ riêng)</button>' : ''}`}
      <label class="f" style="max-width:360px">Tên hiển thị<input type="text" id="name" value="${esc(st.profile.name)}" maxlength="30"></label>
    </section>

    <section class="card">
      <h2 class="h2"><span class="zhs">眼睛</span>Giao diện &amp; bảo vệ mắt</h2>
      <div class="form-grid">
        <label class="f">Chế độ màu<select id="theme">
          <option value="auto" ${s.theme === 'auto' ? 'selected' : ''}>Tự động theo giờ (sáng 6:00–18:00)</option>
          <option value="light" ${s.theme === 'light' ? 'selected' : ''}>Luôn sáng (Đọc sâu)</option>
          <option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>Luôn tối</option></select></label>
        <label class="f">Nhắc nghỉ mắt sau<select id="break">
          ${[0, 15, 20, 25, 30, 45].map((m) => `<option value="${m}" ${s.breakMin === m ? 'selected' : ''}>${m ? m + ' phút học' : 'Tắt nhắc nhở'}</option>`).join('')}</select></label>
      </div>
    </section>

    <section class="card">
      <h2 class="h2"><span class="zhs">发音</span>Phát âm</h2>
      <p class="soft" style="margin:0">${hasVoice() ? 'Đã tìm thấy giọng đọc tiếng Trung trên máy này.' : 'Chưa thấy giọng đọc tiếng Trung. Trên Windows: Cài đặt → Thời gian &amp; ngôn ngữ → Giọng nói → thêm giọng Chinese (Simplified). Trên Chrome thường có sẵn giọng Google 普通话.'}</p>
      <div class="form-grid">
        <label class="f">Tốc độ đọc · <span id="rate-v">${s.ttsRate}</span><input type="range" id="rate" min="0.5" max="1.2" step="0.05" value="${s.ttsRate}"></label>
        <label style="display:flex;gap:10px;align-items:center;font-size:14px"><input type="checkbox" id="autospeak" ${s.autoSpeak ? 'checked' : ''}> Tự đọc khi học và ôn</label>
        <div style="display:flex;align-items:flex-end"><button class="btn" id="test-voice">Nghe thử 你好，我是学习站</button></div>
      </div>
    </section>

    <section class="card">
      <h2 class="h2"><span class="zhs">助手</span>Trợ lý AI (tùy chọn, miễn phí)</h2>
      <p class="soft" style="margin:0">Dùng để sửa nhật ký, giải thích sâu từ vựng và ngữ pháp. Lấy khóa miễn phí tại Google AI Studio (aistudio.google.com → Get API key). Khóa chỉ lưu trong trình duyệt này, không lên GitHub.</p>
      <div class="form-grid">
        <label class="f">Khóa Gemini API<input type="password" id="ai-key" value="${esc(s.aiKey)}" placeholder="AIza…" autocomplete="off"></label>
        <label class="f">Tên model<input type="text" id="ai-model" value="${esc(s.aiModel)}" list="models"></label>
        <datalist id="models"><option value="gemini-3.5-flash-lite"><option value="gemini-3.5-flash"><option value="gemini-3.6-flash"></datalist>
      </div>
      <p class="muted" style="margin:0;font-size:13px">Google đổi tên model khá thường xuyên. Nếu báo lỗi "không tìm thấy model", mở Google AI Studio xem tên model Flash mới nhất rồi điền vào đây. Ở gói miễn phí, Google có thể dùng dữ liệu bạn gửi để cải thiện sản phẩm.</p>
    </section>

    <section class="card">
      <h2 class="h2"><span class="zhs">数据</span>Dữ liệu</h2>
      <div class="btns">
        <button class="btn" id="export">Tải bản sao lưu (.json)</button>
        <label class="btn" style="cursor:pointer">Khôi phục từ file<input type="file" id="import" accept="application/json" hidden></label>
        <button class="btn" id="reset" style="border-color:var(--bad-line);color:var(--bad)">Xóa tiến độ tài khoản này</button>
      </div>
      ${flagged.length ? `<details class="more"><summary>${flagged.length} từ bạn đánh dấu là dữ liệu sai</summary><div class="chips" style="margin-top:10px">${flagged.map((w) => `<a class="chip" href="#/w/${w.id}"><span class="zh">${esc(w.w)}</span> ${esc(w.hv)}</a>`).join('')}</div>
        <p class="muted" style="font-size:13px">Sửa trong file data/words.json trên GitHub, hoặc gửi danh sách này cho Claude để sửa giúp.</p></details>` : ''}
    </section>

    <section class="card sub">
      <h2 class="h2" style="font-size:20px">Nguồn dữ liệu &amp; giấy phép</h2>
      <ul class="list-plain" style="font-size:13px">
        <li>Danh sách từ HSK 3.0 (đề cương 11/2025): complete-hsk-vocabulary, giấy phép MIT.</li>
        <li>Nghĩa tiếng Việt: CVDICT của Phong Phan, giấy phép CC BY-SA 4.0 (dịch từ CC-CEDICT, có thể còn lỗi).</li>
        <li>Phân tích cấu tạo chữ: Make Me a Hanzi. Dữ liệu nét: Hanzi Writer, giấy phép Arphic Public License.</li>
        <li>Âm Hán Việt, tên bộ thủ, giải thích chữ bằng tiếng Việt, chủ đề và ngữ pháp: soạn riêng cho web này.</li>
      </ul>
    </section>`;

    const bind = (id, ev, fn) => view.querySelector(id)?.addEventListener(ev, fn);
    bind('#name', 'change', (e) => { store.renameProfile(e.target.value.trim() || 'Bạn'); toast('Đã đổi tên'); });
    bind('#theme', 'change', (e) => { s.theme = e.target.value; store.save(); location.reload(); });
    bind('#break', 'change', (e) => { s.breakMin = +e.target.value; store.save(); toast('Đã lưu'); });
    bind('#rate', 'input', (e) => { s.ttsRate = +e.target.value; view.querySelector('#rate-v').textContent = s.ttsRate; store.save(); });
    bind('#autospeak', 'change', (e) => { s.autoSpeak = e.target.checked; store.save(); });
    bind('#test-voice', 'click', () => { if (!speak('你好，我是学习站')) toast('Trình duyệt không hỗ trợ đọc'); });
    bind('#ai-key', 'change', (e) => { s.aiKey = e.target.value.trim(); store.save(); toast(s.aiKey ? 'Đã lưu khóa AI' : 'Đã xóa khóa AI'); });
    bind('#ai-model', 'change', (e) => { s.aiModel = e.target.value.trim() || 'gemini-3.5-flash-lite'; store.save(); toast('Đã lưu model'); });
    bind('#add-prof', 'click', () => {
      const name = prompt('Tên cho tài khoản mới?');
      if (!name) return;
      const nid = store.addProfile(name.trim());
      store.switchTo(nid);
      store.get().profile.name = name.trim();
      store.save(true);
      location.hash = '#/';
    });
    view.querySelectorAll('[data-sw]').forEach((b) => b.onclick = () => { store.switchTo(b.dataset.sw); location.hash = '#/'; location.reload(); });
    view.querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => { if (confirm('Xóa tài khoản này và toàn bộ tiến độ của nó trên máy này?')) { store.removeProfile(b.dataset.rm); draw(); } });
    bind('#login', 'submit', async (e) => {
      e.preventDefault();
      try { await sync.signInEmail(view.querySelector('#email').value.trim()); toast('Đã gửi link. Mở Gmail và bấm vào link để đăng nhập.', 6000); }
      catch (err) { toast(err.message, 6000); }
    });
    bind('#google', 'click', () => sync.signInGoogle().catch((err) => toast(err.message)));
    view.querySelectorAll('[data-merge]').forEach((b) => b.onclick = () => {
      if (!confirm('Gộp tiến độ cũ trên máy này vào tài khoản đang đăng nhập?')) return;
      const old = store.peek(b.dataset.merge);
      const merged = store.merge(store.get(), old);
      merged.profile = store.get().profile;
      store.replaceState(merged);
      store.removeProfile(b.dataset.merge);
      toast('Đã gộp tiến độ'); draw();
    });
    bind('#logout', 'click', async () => { await sync.signOut(); draw(); });
    bind('#sync-now', 'click', async () => { await sync.push(); toast(sync.status.text); draw(); });
    bind('#export', 'click', () => {
      const blob = new Blob([JSON.stringify({ ...st, settings: { ...st.settings, aiKey: '' } }, null, 1)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `xuexizhan-${(st.profile.name || 'ban').replace(/\s+/g, '-')}-${today()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
    bind('#import', 'change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        if (!data.cards || !data.settings) throw new Error('File không đúng định dạng');
        if (!confirm('Gộp bản sao lưu này vào tiến độ hiện tại?')) return;
        store.replaceState(store.merge(store.get(), data));
        toast('Đã khôi phục'); draw();
      } catch (err) { toast('Không đọc được file: ' + err.message); }
    });
    bind('#reset', 'click', () => {
      if (!confirm('Xóa toàn bộ tiến độ (từ đã học, nhật ký, điểm) của tài khoản này? Không hoàn tác được.')) return;
      const keep = { ...s, onboarded: false };
      store.replaceState({ ...store.get(), cards: {}, log: {}, diary: [], notes: {}, flags: {}, ai: {}, grammar: {}, games: { best: {} }, settings: keep });
      location.hash = '#/';
      location.reload();
    });
  };
  draw();
}
