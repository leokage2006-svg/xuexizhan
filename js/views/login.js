// Trang đăng nhập bằng Google (hiện khi đã bật đồng bộ mà chưa đăng nhập)
import * as sync from '../sync.js';
import { esc } from '../util.js';

const GOOGLE = `<svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

export function login(view, checked) {
  view.innerHTML = `
  <section class="login">
    <span class="zhs login-brand">学习站</span>
    <span class="cap">Học tập trạm · HSK 3.0</span>
    <h1 class="h1" style="font-size:40px;text-align:center">Đăng nhập để bắt đầu học</h1>
    <p class="soft" style="margin:0;text-align:center;max-width:44ch">Tiến độ được lưu theo tài khoản Google và tự đồng bộ giữa máy tính và điện thoại. Mỗi Gmail có tiến độ riêng.</p>
    ${checked ? `<button class="btn pri big google" id="g-login">${GOOGLE} Đăng nhập bằng Google</button>` : '<p class="muted">Đang kiểm tra đăng nhập…</p>'}
    <p class="bad" id="g-err" style="margin:0;text-align:center" hidden></p>
    <p class="muted" style="margin:0;font-size:12px;text-align:center">Web chỉ đọc tên và địa chỉ Gmail của bạn, không đọc thư hay dữ liệu khác.</p>
  </section>`;
  view.querySelector('#g-login')?.addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    try { await sync.signInGoogle(); }
    catch (err) {
      const el = view.querySelector('#g-err');
      el.hidden = false;
      el.textContent = 'Không đăng nhập được: ' + (err.message || err);
      e.currentTarget.disabled = false;
    }
  });
}
