# tools/ — tạo lại dữ liệu (không bắt buộc)

Chỉ cần khi muốn cập nhật dữ liệu từ nguồn gốc. Web chạy bình thường mà không cần thư mục này.

1. Tạo thư mục `tools/sources/` và tải các nguồn:
   ```
   git clone --depth 1 https://github.com/drkameleon/complete-hsk-vocabulary sources/complete-hsk-vocabulary
   git clone --depth 1 https://github.com/ph0ngp/CVDICT sources/CVDICT
   git clone --depth 1 https://github.com/skishore/makemeahanzi sources/makemeahanzi
   npm pack hanzi-writer-data@2.0.1 && tar xzf hanzi-writer-data-2.0.1.tgz && mv package sources/hanzi-writer-data
   ```
2. Chạy `python3 build_data.py` → ghi đè vào `../data/`.

Các file do người soạn (sửa trực tiếp được):
- `hv14.txt`, `hv56.txt`, `hv_comp.txt`: âm Hán Việt từng chữ (`字 âm|字 âm1/âm2`)
- `radicals.txt`: 214 bộ thủ, tên và nghĩa tiếng Việt
- `hints_vi.txt`: câu chuyện ghi nhớ của chữ hội ý / tượng hình
- `topics.txt`: gán từ vào chủ đề
- Trong `build_data.py`: `HV_WORD` (Hán Việt theo từ cho chữ đa âm) và `PY_OVERRIDE` (chọn cách đọc đúng)
