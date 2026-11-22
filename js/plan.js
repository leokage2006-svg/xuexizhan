// Kế hoạch học: chỉ tiêu mỗi ngày, từ tiếp theo, tiến độ theo cấp
import { D, cumulative } from './data.js';
import * as store from './store.js';
import { today, daysBetween } from './util.js';

export function daysLeft() {
  const st = store.get();
  return Math.max(0, daysBetween(today(), st.settings.targetDate));
}
export function targetTotal() { return cumulative(store.get().settings.targetLevel || 4); }
export function learnedCount() { return Object.keys(store.get().cards).length; }

export function quota() {
  const st = store.get();
  if (st.settings.newPerDay > 0) return st.settings.newPerDay;
  const doneToday = store.dayLog().new || 0;
  const remaining = Math.max(0, targetTotal() - (learnedCount() - doneToday));
  const days = Math.max(1, daysLeft());
  return Math.min(60, Math.max(5, Math.ceil(remaining / days)));
}
export function newLeftToday() { return Math.max(0, quota() - (store.dayLog().new || 0)); }

/** Các từ chưa học, theo thứ tự lộ trình (có thể lọc theo chủ đề) */
export function nextWords(n, topicCode) {
  const cards = store.get().cards;
  const maxL = store.get().settings.targetLevel || 4;
  const out = [];
  for (const w of D.order) {
    if (w.l > maxL || cards[w.id]) continue;
    if (topicCode && w.tp !== topicCode) continue;
    out.push(w);
    if (out.length >= n) break;
  }
  return out;
}

export function levelProgress() {
  const cards = store.get().cards;
  const res = [];
  for (let l = 1; l <= 4; l++) {
    const ws = D.byLevel.get(l) || [];
    res.push({ l, total: ws.length, done: ws.filter((w) => cards[w.id]).length });
  }
  return res;
}

export function currentLevel() {
  const lp = levelProgress();
  const cur = lp.find((x) => x.done < x.total * 0.95);
  return cur ? cur.l : 4;
}

/** Ngữ pháp gợi ý hôm nay: điểm chưa học đầu tiên của cấp hiện tại trở xuống */
export function grammarOfDay() {
  const g = store.get().grammar;
  const lv = currentLevel();
  return D.grammar.find((x) => x.l <= lv && !g[x.id]) || D.grammar.find((x) => !g[x.id]) || D.grammar[0];
}

/** Ước tính ngày hoàn thành với tốc độ 7 ngày gần nhất */
export function projection() {
  const log = store.get().log;
  let sum = 0;
  const d = new Date();
  for (let i = 0; i < 7; i++) { sum += log[today(d)]?.new || 0; d.setDate(d.getDate() - 1); }
  const pace = sum / 7;
  const remaining = Math.max(0, targetTotal() - learnedCount());
  if (!remaining) return { pace, date: null, done: true };
  if (pace <= 0) return { pace, date: null };
  const f = new Date();
  f.setDate(f.getDate() + Math.ceil(remaining / pace));
  return { pace, date: today(f) };
}
