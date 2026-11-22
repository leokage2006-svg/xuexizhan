// ===== Cấu hình của 学习站 =====
// Chỉ cần sửa file này. Xem README.md, mục "Bật đồng bộ" để biết lấy các giá trị ở đâu.
window.XXZ_CONFIG = {
  // Để trống 2 dòng dưới = web chạy hoàn toàn trên máy (lưu trong trình duyệt), chưa đồng bộ.
  SUPABASE_URL: '',        // ví dụ: 'https://abcdxyz.supabase.co'
  SUPABASE_ANON_KEY: '',   // khóa "anon public" (được phép công khai)

  // Các Gmail được phép đăng nhập (tối đa bao nhiêu tùy bạn). Mỗi Gmail có tiến độ riêng.
  // Danh sách này cũng phải được thêm vào bảng allowed_emails trong Supabase (xem supabase.sql).
  ALLOWED_EMAILS: [
    // 'ban@gmail.com',
    // 'ban.thu.hai@gmail.com',
  ],

  // Bật nút "Đăng nhập bằng Google" (cần cấu hình Google trong Supabase).
  // Nếu để false, web vẫn đăng nhập bằng đường link gửi vào Gmail.
  GOOGLE_LOGIN: false,
};
