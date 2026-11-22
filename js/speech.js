// Phát âm bằng giọng đọc tiếng Trung có sẵn trong trình duyệt / hệ điều hành (miễn phí, không cần AI)
import * as store from './store.js';

let voice = null;
function pickVoice() {
  const vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
  const zh = vs.filter((v) => /^zh(-|_)?(CN|Hans)?/i.test(v.lang) || /Chinese|普通话|中文/.test(v.name));
  voice = zh.find((v) => /CN/i.test(v.lang) && /Google|Microsoft|Tingting|Xiaoxiao|Yunxi/i.test(v.name))
    || zh.find((v) => /CN/i.test(v.lang)) || zh[0] || null;
  return voice;
}
if (window.speechSynthesis) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}

export function hasVoice() { return !!(window.speechSynthesis && (voice || pickVoice())); }

export function speak(text, rate) {
  if (!window.speechSynthesis) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  if (voice || pickVoice()) u.voice = voice;
  u.rate = rate || store.get()?.settings.ttsRate || 0.8;
  speechSynthesis.speak(u);
  return true;
}
