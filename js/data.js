// Nạp dữ liệu HSK và tạo các chỉ mục tra cứu
import { stripTones, viFold } from './util.js';

export const D = {
  words: [], byId: new Map(), byWord: new Map(), byChar: new Map(), byTopic: new Map(), byLevel: new Map(),
  chars: {}, comps: {}, related: [], relByChar: new Map(), topics: [], topicBy: new Map(), radicals: [], radByChar: new Map(),
  grammar: [], grammarBy: new Map(), order: [], levelTotals: {}, ready: false,
};

async function j(path) {
  const r = await fetch(path, { cache: 'force-cache' });
  if (!r.ok) throw new Error(`Không tải được ${path}`);
  return r.json();
}

export async function loadData() {
  const [words, chars, comps, related, topics, radicals, grammar] = await Promise.all([
    j('data/words.json'), j('data/chars.json'), j('data/components.json'), j('data/related.json'),
    j('data/topics.json'), j('data/radicals.json'), j('data/grammar.json'),
  ]);
  D.words = words; D.chars = chars; D.comps = comps; D.related = related; D.topics = topics; D.radicals = radicals; D.grammar = grammar;
  for (const t of topics) D.topicBy.set(t.code, t);
  for (const w of words) {
    w._py = stripTones(w.p).replace(/\s+/g, '');
    w._hv = viFold(w.hv);
    w._vi = viFold(w.vi);
    D.byId.set(w.id, w);
    if (!D.byWord.has(w.w)) D.byWord.set(w.w, w);
    if (!D.byTopic.has(w.tp)) D.byTopic.set(w.tp, []);
    D.byTopic.get(w.tp).push(w);
    if (!D.byLevel.has(w.l)) D.byLevel.set(w.l, []);
    D.byLevel.get(w.l).push(w);
    for (const ch of new Set(w.w)) {
      if (!D.byChar.has(ch)) D.byChar.set(ch, []);
      D.byChar.get(ch).push(w);
    }
  }
  for (const r of related) {
    for (const ch of new Set(r.w)) {
      if (!D.relByChar.has(ch)) D.relByChar.set(ch, []);
      D.relByChar.get(ch).push(r);
    }
  }
  for (const r of radicals) {
    D.radByChar.set(r.r, r);
    for (const v of r.v) if (!D.radByChar.has(v)) D.radByChar.set(v, r);
  }
  for (const g of grammar) D.grammarBy.set(g.id, g);
  for (let l = 1; l <= 6; l++) D.levelTotals[l] = (D.byLevel.get(l) || []).length;

  // Thứ tự học: theo cấp, trong mỗi cấp gom theo chủ đề (để học trọn từng chủ đề), từ phổ biến trước.
  const topicRank = new Map(topics.map((t, i) => [t.code, i]));
  D.order = words.slice().sort((a, b) => a.l - b.l || topicRank.get(a.tp) - topicRank.get(b.tp) || a.q - b.q);
  D.ready = true;
  return D;
}

export function cumulative(level) {
  let n = 0;
  for (let l = 1; l <= level; l++) n += D.levelTotals[l] || 0;
  return n;
}

/** Tra cứu: chữ Hán, pinyin (có/không dấu), Hán Việt, nghĩa tiếng Việt */
export function search(q, limit = 60) {
  q = q.trim();
  if (!q) return [];
  const hasHan = /[一-鿿]/.test(q);
  const fq = viFold(q);
  const pq = stripTones(q).replace(/\s+/g, '');
  const out = [];
  for (const w of D.words) {
    let score = 0;
    if (hasHan) {
      if (w.w === q) score = 100; else if (w.w.includes(q)) score = 60 - w.w.length;
    } else {
      if (w._py === pq) score = 90;
      else if (w._hv === fq) score = 88;
      else if (w._py.startsWith(pq) && pq.length > 1) score = 70;
      else if (w._hv.startsWith(fq) && fq.length > 1) score = 65;
      else if (w._vi.split(/[;,]\s*/).some((m) => m === fq)) score = 80;
      else if (fq.length > 2 && w._vi.includes(fq)) score = 40;
    }
    if (score && !hasHan && q !== fq && w.vi.toLowerCase().includes(q.toLowerCase())) score += 15;
    if (score) out.push([score - w.l * 0.5, w]);
  }
  return out.sort((a, b) => b[0] - a[0]).slice(0, limit).map((x) => x[1]);
}

/** Dữ liệu nét cho Hanzi Writer: ưu tiên file đi kèm, thiếu thì lấy từ CDN */
const strokeBuckets = new Map();
function bucket(n) {
  if (!strokeBuckets.has(n)) {
    strokeBuckets.set(n, fetch(`data/strokes/s${n}.json`).then((r) => (r.ok ? r.json() : {})).catch(() => ({})));
  }
  return strokeBuckets.get(n);
}
export function charDataLoader(char, onComplete, onError) {
  bucket(char.codePointAt(0) % 16)
    .then((m) => m[char] || fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${char}.json`).then((r) => r.json()))
    .then(onComplete)
    .catch(onError || (() => {}));
}

export const ETYM = {
  ideographic: ['Hội ý', 'ghép nghĩa các thành phần'],
  pictographic: ['Tượng hình', 'vẽ lại hình sự vật'],
  pictophonetic: ['Hình thanh', 'một phần chỉ nghĩa, một phần gợi âm'],
};

export function compInfo(c) {
  const info = D.comps[c] || {};
  const ch = D.chars[c];
  const rad = info.rad;
  return {
    c,
    isRad: !!rad,
    name: rad ? `bộ ${rad.name}` : (ch?.hv?.[0] || info.hv ? (ch?.hv?.[0] || info.hv) : ''),
    mean: rad ? rad.mean : (ch?.vi || info.vi || info.en || '').split(';')[0],
    hv: ch?.hv?.[0] || info.hv || '',
    radBase: rad?.base,
  };
}
