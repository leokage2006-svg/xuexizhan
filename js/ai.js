// Trợ lý AI (tùy chọn) — dùng Gemini API với khóa của chính bạn.
// Khóa chỉ lưu trong trình duyệt của bạn, không nằm trong mã nguồn trên GitHub.
import * as store from './store.js';

export function aiReady() { return !!store.get()?.settings.aiKey; }

export async function ask(prompt) {
  const { aiKey, aiModel } = store.get().settings;
  if (!aiKey) throw new Error('Chưa có khóa AI. Vào Cài đặt → Trợ lý AI để thêm khóa Gemini miễn phí.');
  const model = (aiModel || 'gemini-3.5-flash-lite').trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': aiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1400 },
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data?.error?.message || r.statusText;
    if (r.status === 404) throw new Error(`Không tìm thấy model "${model}". Vào Cài đặt và đổi tên model (xem danh sách model trong Google AI Studio).`);
    if (r.status === 429) throw new Error('Đã hết lượt miễn phí trong lúc này. Thử lại sau ít phút.');
    throw new Error(`Lỗi AI: ${msg}`);
  }
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  if (!text) throw new Error('AI không trả lời. Thử lại nhé.');
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#+\s*/gm, '').trim();
}

const SYSTEM = `Bạn là giáo viên tiếng Trung giỏi, dạy người Việt đang ôn thi HSK 3.0 (cấp 1–4).
Luôn trả lời bằng tiếng Việt, ngắn gọn, rõ ràng, không dùng markdown đậm/nghiêng.
Mỗi câu tiếng Trung đều kèm pinyin có dấu và nghĩa tiếng Việt.
Khi có thể, liên hệ với âm Hán Việt để người học dễ nhớ. Chỉ dùng từ vựng phù hợp trình độ HSK 1–4 trong ví dụ.
Nếu không chắc chắn điều gì, hãy nói rõ là không chắc.`;

export function promptWord(w, chars) {
  return `Giải thích sâu từ "${w.w}" (${w.p}, Hán Việt: ${w.hv}, nghĩa: ${w.vi}).
Cấu tạo chữ: ${chars}.
Hãy viết theo đúng các mục sau:
1. Nghĩa và cách dùng chính (2–3 câu).
2. Ba câu ví dụ thực tế ở trình độ HSK ${w.l}–4.
3. Phân biệt với 1–2 từ dễ nhầm (nếu có), nêu rõ khác nhau ở đâu.
4. Mẹo ghi nhớ dựa trên bộ thủ và âm Hán Việt.`;
}

export function promptDiary(text) {
  return `Đây là đoạn nhật ký tiếng Trung của học viên trình độ HSK 1–2, đang hướng tới HSK 4:
"""${text}"""
Hãy:
1. Viết lại đoạn văn đã sửa đúng (giữ ý của học viên, chỉ sửa lỗi và làm tự nhiên hơn), kèm pinyin.
2. Liệt kê từng lỗi: câu sai → câu đúng → giải thích ngắn bằng tiếng Việt.
3. Gợi ý 1–2 từ hoặc cấu trúc HSK 3–4 có thể dùng để nâng cấp đoạn văn.
4. Một lời nhận xét ngắn, thẳng thắn về điểm mạnh và điểm cần cải thiện.`;
}

export function promptGrammar(g, question) {
  return `Điểm ngữ pháp: ${g.t} (cấu trúc: ${g.form}). Giải thích đã có: ${g.ex}
Câu hỏi của học viên: ${question || 'Cho thêm 4 ví dụ đa dạng, và chỉ ra lỗi người Việt hay mắc với cấu trúc này.'}`;
}
