# 学习站 · Học tập trạm

Trang web cá nhân để học tiếng Trung theo **HSK 3.0** (đề cương 11/2025), từ HSK 1 đến HSK 4.

- **1950 từ HSK 1–4** chia theo 19 chủ đề. Mỗi từ có pinyin tô màu theo thanh điệu, âm Hán Việt, nghĩa tiếng Việt và lượng từ.
- **Cấu tạo chữ**: tách từng chữ thành bộ thủ / thành phần (có tên và nghĩa tiếng Việt), cho biết loại chữ (hội ý, hình thanh, tượng hình) và câu chuyện ghi nhớ.
- **Animation thứ tự nét**, có tô màu riêng các nét của bộ thủ, kèm chế độ **tự tập viết** theo từng nét.
- **Từ cấp cao cùng gốc** (HSK 5–6) gợi ý ngay trên thẻ từ.
- **Ôn tập ngắt quãng** kiểu Anki, với ba kiểu ôn: chữ → nghĩa, nghĩa → chữ, nghe → chữ.
- **33 điểm ngữ pháp trọng tâm** giải thích bằng tiếng Việt (ví dụ: 去 và 走, 了, 把, 被…).
- **7 trò chơi**: Ghép bộ thủ, Nối Hán Việt, Sprint 60 giây, Săn thanh điệu, Thử thách nét, Xếp câu, Đấu tài khoản.
- **Nhật ký** tiếng Trung, **mục tiêu** tự tính số từ cần học mỗi ngày, biểu đồ tiến độ.
- **Bảo vệ mắt**: tự chuyển sáng (6:00–18:00) / tối, nhắc nghỉ mắt theo quy tắc 20-20-20.
- **Nhiều tài khoản**, mỗi tài khoản một tiến độ riêng. Có thể đồng bộ giữa máy tính và điện thoại bằng Gmail (tùy chọn).
- **Trợ lý AI** (tùy chọn, miễn phí): sửa nhật ký, giải thích sâu từ và ngữ pháp.

Web không cần cài đặt hay "build": chỉ là các file tĩnh, đưa lên GitHub Pages là chạy.

---

## 1. Đưa web lên mạng bằng GitHub Pages (miễn phí, khoảng 10 phút)

1. Tạo tài khoản tại **github.com** (nếu chưa có).
2. Bấm **+** (góc trên bên phải) → **New repository**.
   - Repository name: ví dụ `xuexizhan`
   - Chọn **Public** (GitHub Pages miễn phí yêu cầu repo công khai; tiến độ học của bạn **không** nằm trong repo nên vẫn riêng tư).
   - Bấm **Create repository**.
3. Trong trang repo mới, bấm dòng chữ **uploading an existing file**.
4. Giải nén file zip, mở thư mục `xuexizhan`, **chọn tất cả file và thư mục bên trong** (không chọn chính thư mục `xuexizhan`) rồi kéo thả vào trang GitHub. Đợi tải xong, bấm **Commit changes**.
5. Vào **Settings → Pages**. Ở mục *Build and deployment*: Source = **Deploy from a branch**, Branch = **main**, thư mục **/(root)** → **Save**.
6. Đợi 1–2 phút, tải lại trang. GitHub hiện địa chỉ web dạng `https://<tên-bạn>.github.io/xuexizhan/`. Xong!

> Mở web lần đầu sẽ có màn hình thiết lập 1 phút: tên, đã xong HSK 1 chưa, mục tiêu và hạn.

**Lưu ý:** nếu chưa bật đồng bộ (mục 3), tiến độ được lưu trong trình duyệt bạn đang dùng. Máy tính và điện thoại sẽ có hai tiến độ khác nhau. Thỉnh thoảng hãy vào **Cài đặt → Tải bản sao lưu** để giữ một bản dự phòng.

### Chạy thử trên máy tính (không bắt buộc)

Web cần chạy qua một máy chủ, không mở trực tiếp file `index.html` được. Nếu máy có Python: mở Terminal trong thư mục web, gõ `python -m http.server 8000`, rồi vào `http://localhost:8000`.

---

## 2. Bật trợ lý AI (miễn phí, 3 phút)

1. Vào **aistudio.google.com**, đăng nhập bằng Gmail → **Get API key** → **Create API key** → copy khóa.
2. Trên web: **Cài đặt → Trợ lý AI** → dán khóa.

Khóa chỉ lưu trong trình duyệt của bạn, không nằm trên GitHub. Google đổi tên model khá thường xuyên. Nếu web báo "không tìm thấy model", xem tên model Flash mới nhất trong AI Studio rồi điền vào ô **Tên model**. Ở gói miễn phí, Google có thể dùng nội dung bạn gửi để cải thiện sản phẩm.

---

## 3. Bật đồng bộ giữa các thiết bị bằng Gmail (miễn phí, khoảng 15 phút)

Dùng Supabase (cơ sở dữ liệu miễn phí). Mỗi Gmail đăng nhập sẽ có tiến độ riêng, và chỉ những Gmail bạn cho phép mới vào được.

1. Vào **supabase.com** → đăng ký bằng GitHub → **New project**. Đặt tên, tạo mật khẩu database (lưu lại), chọn khu vực **Singapore** → **Create**.
2. Khi project tạo xong: menu trái **SQL Editor → New query**. Mở file `supabase.sql`, **sửa 2 Gmail ở cuối file** thành Gmail thật, dán toàn bộ vào ô SQL → **Run**.
3. Menu **Authentication → URL Configuration**:
   - **Site URL**: địa chỉ GitHub Pages của bạn (ví dụ `https://ten-ban.github.io/xuexizhan/`)
   - **Redirect URLs**: thêm đúng địa chỉ đó.
4. Menu **Project Settings → API** (hoặc **Data API**): copy **Project URL** và khóa **anon public**.
5. Trên GitHub, mở file `config.js` → bấm biểu tượng bút chì để sửa:
   ```js
   SUPABASE_URL: 'https://xxxx.supabase.co',
   SUPABASE_ANON_KEY: 'eyJhbGciOi...',
   ALLOWED_EMAILS: ['ban@gmail.com', 'ban.thu.hai@gmail.com'],
   ```
   Bấm **Commit changes**, đợi 1 phút.
6. Trên web: **Cài đặt → Tài khoản** → nhập Gmail → **Gửi link đăng nhập** → mở Gmail, bấm link. Xong. Làm tương tự trên điện thoại.

Thêm Gmail mới về sau: thêm vào `ALLOWED_EMAILS` trong `config.js` **và** chạy lại phần cuối `supabase.sql` với Gmail đó.

Cần biết:
- Khóa *anon public* được phép công khai. Bảo mật nằm ở các quy tắc trong `supabase.sql`: chỉ Gmail được phép mới đọc/ghi được, và mỗi người chỉ sửa được tiến độ của mình.
- Supabase gói miễn phí sẽ **tạm dừng project nếu không có hoạt động trong 7 ngày**. Nếu bị dừng, vào supabase.com bấm *Resume project*. Dữ liệu vẫn còn, và trình duyệt cũng luôn giữ một bản trên máy.
- Muốn có nút "Đăng nhập bằng Google" thay cho link qua email: bật Google trong *Authentication → Providers* (cần tạo OAuth Client trên Google Cloud), rồi đặt `GOOGLE_LOGIN: true` trong `config.js`.

---

## 4. Cấu trúc thư mục

```
index.html            khung trang
config.js             cấu hình (đồng bộ, Gmail được phép)
css/style.css         giao diện: bảng màu Bạch kim, sáng/tối
js/                   mã chương trình (mỗi trang một file trong js/views/)
data/words.json       1950 từ HSK 1–4 (sửa nghĩa / Hán Việt / chủ đề ở đây)
data/chars.json       1092 chữ: Hán Việt, thành phần, loại chữ, câu chuyện ghi nhớ
data/grammar.json     33 điểm ngữ pháp
data/strokes/         dữ liệu nét viết
vendor/               thư viện Hanzi Writer
supabase.sql          cấu hình cơ sở dữ liệu cho đồng bộ
tools/                script tạo lại dữ liệu (dành cho khi muốn cập nhật nguồn)
```

**Sửa dữ liệu sai:** trên thẻ từ có nút *Báo dữ liệu sai*. Danh sách các từ đã đánh dấu nằm trong **Cài đặt → Dữ liệu**. Bạn có thể sửa trực tiếp trong `data/words.json` trên GitHub, hoặc gửi danh sách cho Claude để sửa giúp.

---

## 5. Nguồn dữ liệu & giấy phép

| Phần | Nguồn | Giấy phép |
|---|---|---|
| Danh sách từ HSK 3.0 (đề cương 11/2025) | complete-hsk-vocabulary (drkameleon) | MIT |
| Nghĩa tiếng Việt | CVDICT (Phong Phan), dịch từ CC-CEDICT | CC BY-SA 4.0 |
| Phân tách chữ, bộ thủ, loại chữ | Make Me a Hanzi (skishore) | LGPL / Arphic PL |
| Dữ liệu nét viết, thư viện animation | Hanzi Writer (chanind) | MIT / Arphic PL (xem `vendor/`) |
| Âm Hán Việt, tên 214 bộ thủ, câu chuyện ghi nhớ tiếng Việt, chủ đề, ngữ pháp | Soạn riêng cho web này | — |

Nghĩa tiếng Việt của CVDICT phần lớn do AI dịch rồi được rà soát, nên vẫn có thể còn chỗ chưa chuẩn. Câu chuyện ghi nhớ của chữ là cách nhớ phổ biến (theo Make Me a Hanzi), không phải lúc nào cũng là từ nguyên học thuật.
