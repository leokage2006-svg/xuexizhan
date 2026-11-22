import { D, compInfo } from '../data.js';
import * as store from '../store.js';
import * as sync from '../sync.js';
import { esc, pyHTML, shuffle, sample, pick, toast, ICON, stripTones } from '../util.js';
import { speak, hasVoice } from '../speech.js';
import { makeWriter } from '../components.js';

const GAMES = [
  ['radical', '部首拼字', 'Ghép bộ thủ', 'Hai thành phần ghép lại thành chữ nào? Hiểu chữ từ bên trong.', 'Bộ thủ · 8 câu'],
  ['match', '汉越配对', 'Nối Hán Việt', 'Ghép từ tiếng Trung với âm Hán Việt của nó, càng nhanh càng tốt.', 'Trí nhớ · tính giờ'],
  ['sprint', '六十秒', 'Sprint 60 giây', 'Chọn nghĩa đúng càng nhiều càng tốt trong 60 giây.', 'Tốc độ · 1 phút'],
  ['tone', '声调猎人', 'Săn thanh điệu', 'Nghe một từ và chọn đúng pinyin. Luyện tai trước khi lên HSK 3 thi nói.', 'Nghe · 10 câu'],
  ['stroke', '笔顺挑战', 'Thử thách nét', 'Tự viết chữ bằng chuột hoặc ngón tay. Viết sai nhiều nét là mất một mạng.', 'Viết · 3 mạng'],
  ['sentence', '句子拼图', 'Xếp câu', 'Sắp các mảnh từ thành câu đúng ngữ pháp.', 'Ngữ pháp · 6 câu'],
  ['duel', '双人对战', 'Đấu tài khoản', 'So XP tuần giữa các tài khoản. Mỗi người một tiến độ, chung một bảng xếp hạng.', 'Bảng xếp hạng · tuần'],
];

function pool(min = 16) {
  const cards = store.get().cards;
  let ws = Object.keys(cards).map((id) => D.byId.get(id)).filter(Boolean);
  if (ws.length < min) ws = ws.concat((D.byLevel.get(1) || []).concat(D.byLevel.get(2) || []).filter((w) => !cards[w.id]));
  return ws;
}
function finishGame(key, score, better = (a, b) => a > b) {
  const best = store.get().games.best;
  const isBest = best[key] == null || better(score, best[key]);
  if (isBest) best[key] = score;
  store.dayLog().games += 1;
  store.save();
  return isBest;
}

export function gamesHub(view) {
  const best = store.get().games.best;
  const bestTxt = { radical: (v) => `${v}/8`, match: (v) => `${v} giây`, sprint: (v) => `${v} câu`, tone: (v) => `${v}/10`, stroke: (v) => `${v} chữ`, sentence: (v) => `${v}/6` };
  view.innerHTML = `
  <header class="head"><div><span class="cap">Dùng từ bạn đã học · mỗi ván 2–5 phút</span>
    <h1 class="h1"><span class="zhs">游戏</span> Trò chơi</h1></div>
    <div class="stats" style="grid-template-columns:repeat(2,minmax(0,1fr))">
      <div class="stat" style="padding:12px 20px"><span class="cap">XP tuần</span><b style="font-size:30px">${store.weekXP()}</b></div>
      <div class="stat" style="padding:12px 20px"><span class="cap">Chuỗi học</span><b style="font-size:30px">${store.streak()}</b></div>
    </div></header>
  <div class="ggrid">${GAMES.map(([k, zh, vi, desc, tag]) => `<a class="gcard" href="#/games/${k}">
    <span class="zhs">${zh}</span><span class="lux">${vi}</span><p>${desc}</p>
    <span class="cap" style="margin-top:auto;padding-top:8px">${tag}${best[k] != null && bestTxt[k] ? ` · kỷ lục ${bestTxt[k](best[k])}` : ''}</span></a>`).join('')}</div>`;
}

export function game(view, k) {
  const g = GAMES.find((x) => x[0] === k);
  if (!g) { view.innerHTML = '<div class="empty">Không có trò chơi này.</div>'; return; }
  const head = `<header class="head"><div><span class="cap"><a href="#/games" style="text-decoration:none">← Trò chơi</a> · ${g[4]}</span>
    <h1 class="h1"><span class="zhs">${g[1]}</span> ${g[2]}</h1></div><div id="ghud" class="btns"></div></header><div id="gbody" class="stack"></div>`;
  view.innerHTML = head;
  const body = view.querySelector('#gbody');
  const hud = view.querySelector('#ghud');
  return ({ radical, match, sprint, tone, stroke, sentence, duel })[k](body, hud, view);
}

const again = (k) => `<div class="btns" style="justify-content:center"><a class="btn pri" href="#/games/${k}" onclick="setTimeout(()=>dispatchEvent(new HashChangeEvent('hashchange')),0)">Chơi lại</a><a class="btn" href="#/games">Trò khác</a></div>`;
const endCard = (title, sub, k) => `<section class="card hi" style="align-items:center;text-align:center;padding:40px"><span class="cap">完成</span><h2 class="h2" style="justify-content:center;font-size:32px">${title}</h2><p class="muted" style="margin:0">${sub}</p>${again(k)}</section>`;

// ---------- 1. Ghép bộ thủ ----------
function radical(body, hud) {
  const okComp = (x) => x && x !== '？' && (D.comps[x] || D.chars[x]);
  const two = (c) => { const ch = D.chars[c]; return ch && ch.comp.length === 2 && ch.comp.every(okComp); };
  const allTwo = Object.keys(D.chars).filter(two);
  const fromPool = [...new Set(pool().flatMap((w) => [...w.w]))].filter(two);
  const qs = sample(fromPool.length >= 8 ? fromPool : allTwo, 8);
  let i = 0, score = 0;
  const draw = () => {
    if (i >= qs.length) {
      const best = finishGame('radical', score);
      store.addXP(score * 10);
      body.innerHTML = endCard(`${score} / ${qs.length} câu đúng`, `+${score * 10} XP${best ? ' · kỷ lục mới!' : ''}`, 'radical');
      return;
    }
    const c = qs[i], ch = D.chars[c];
    const [a, b] = ch.comp;
    const similar = allTwo.filter((x) => x !== c && (D.chars[x].comp.includes(a) || D.chars[x].comp.includes(b)));
    const opts = shuffle([c, ...sample(similar.length >= 3 ? similar : allTwo.filter((x) => x !== c), 3)]);
    const ia = compInfo(a), ib = compInfo(b);
    hud.innerHTML = `<span class="chip acc">Câu ${i + 1} / ${qs.length}</span><span class="chip">Điểm ${score}</span>`;
    body.innerHTML = `<section class="card hi" style="padding:32px"><div class="row" style="align-items:center;gap:36px">
      <div class="stack" style="gap:12px">
        <span class="soft">Hai thành phần dưới đây ghép lại thành chữ nào?</span>
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
          <div class="slot"><span class="zhs rad">${esc(a)}</span></div><span class="lux" style="font-size:34px;color:var(--muted)">+</span>
          <div class="slot"><span class="zhs rad">${esc(b)}</span></div><span class="lux" style="font-size:34px;color:var(--muted)">=</span>
          <div class="slot q"><span class="zhs" id="ans">?</span></div>
        </div>
        <span class="muted" style="font-size:13px">${esc(a)}: ${esc(ia.name || '')} (${esc(ia.mean || '')}) · ${esc(b)}: ${esc(ib.name || '')} (${esc(ib.mean || '')})</span>
      </div>
      <div class="stack" style="gap:12px"><div class="opts">${opts.map((o) => `<button class="opt" data-o="${esc(o)}"><span class="zhs">${esc(o)}</span></button>`).join('')}</div><div id="fb"></div></div>
    </div></section>`;
    body.querySelectorAll('[data-o]').forEach((btn) => btn.onclick = () => {
      const right = btn.dataset.o === c;
      if (right) score++;
      body.querySelectorAll('[data-o]').forEach((x) => { x.disabled = true; if (x.dataset.o === c) x.classList.add('right'); });
      if (!right) btn.classList.add('wrong');
      body.querySelector('#ans').textContent = c;
      const word = (D.byChar.get(c) || [])[0];
      body.querySelector('#fb').innerHTML = `<div class="fb ${right ? 'ok' : 'bad'}"><b>${right ? 'Chính xác · +10 XP' : `Chưa đúng · đáp án là <span class="zhs">${esc(c)}</span>`}</b>
        <span><span class="zhs">${esc(c)}</span> · <span class="hv">${esc(ch.hv?.[0] || '')}</span> — ${esc(ch.hint || ch.vi || '')}${word ? ` · ví dụ: <span class="zh">${esc(word.w)}</span> (${esc(word.vi.split(';')[0])})` : ''}</span></div>
        <button class="btn pri" id="nx" style="align-self:flex-end;margin-top:12px">Câu tiếp →</button>`;
      body.querySelector('#nx').onclick = () => { i++; draw(); };
      speak(c);
    });
  };
  draw();
}

// ---------- 2. Nối Hán Việt ----------
function match(body, hud) {
  const seen = new Set();
  const ws = shuffle(pool()).filter((w) => !w.hv.includes('?') && !seen.has(w.hv) && seen.add(w.hv)).slice(0, 6);
  const tiles = shuffle([...ws.map((w) => ({ k: w.id, t: w.w, zh: true })), ...ws.map((w) => ({ k: w.id, t: w.hv, zh: false }))]);
  let sel = null, left = ws.length, t0 = Date.now(), mistakes = 0;
  const tick = setInterval(() => { hud.innerHTML = `<span class="chip acc">${Math.floor((Date.now() - t0) / 1000)} giây</span><span class="chip">Còn ${left} cặp</span><span class="chip">Sai ${mistakes}</span>`; }, 250);
  body.innerHTML = `<section class="card"><span class="soft">Chọn một chữ Hán, rồi chọn âm Hán Việt của nó.</span>
    <div class="tiles">${tiles.map((x, n) => `<button class="tile ${x.zh ? 'zhs' : 'hv'}" data-n="${n}">${esc(x.t)}</button>`).join('')}</div></section>`;
  body.querySelectorAll('.tile').forEach((el) => el.onclick = () => {
    const x = tiles[+el.dataset.n];
    if (el.classList.contains('done')) return;
    if (!sel) { sel = el; el.classList.add('sel'); if (x.zh) speak(x.t); return; }
    if (sel === el) { el.classList.remove('sel'); sel = null; return; }
    const y = tiles[+sel.dataset.n];
    if (x.k === y.k && x.zh !== y.zh) {
      [el, sel].forEach((e) => { e.classList.remove('sel'); e.classList.add('done'); });
      left--;
      if (!left) {
        clearInterval(tick);
        const sec = Math.round((Date.now() - t0) / 1000);
        const best = finishGame('match', sec, (a, b) => a < b);
        store.addXP(20);
        body.innerHTML = endCard(`Xong trong ${sec} giây`, `${mistakes} lần ghép sai · +20 XP${best ? ' · kỷ lục mới!' : ''}`, 'match') +
          `<section class="card"><h2 class="h2">Các cặp vừa ghép</h2><div class="wgrid">${ws.map((w) => `<a class="wtile" href="#/w/${w.id}"><span class="w">${esc(w.w)}</span><span class="hv">${esc(w.hv)}</span><span class="m">${esc(w.vi)}</span></a>`).join('')}</div></section>`;
      }
    } else {
      mistakes++;
      [el, sel].forEach((e) => e.classList.add('wrong'));
      const a = el, b = sel;
      setTimeout(() => [a, b].forEach((e) => e.classList.remove('wrong', 'sel')), 450);
    }
    sel = null;
  });
  return () => clearInterval(tick);
}

// ---------- 3. Sprint 60 giây ----------
function sprint(body, hud) {
  const ws = pool(30);
  let score = 0, total = 0, end = Date.now() + 60000, last = null;
  const short = (w) => w.vi.split(';')[0].trim();
  const tick = setInterval(() => {
    const s = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    hud.innerHTML = `<span class="chip acc">${s} giây</span><span class="chip">Đúng ${score} / ${total}</span>`;
    if (s <= 0) finish();
  }, 200);
  const finish = () => {
    clearInterval(tick);
    const best = finishGame('sprint', score);
    store.addXP(score * 2);
    body.innerHTML = endCard(`${score} câu đúng`, `trên ${total} câu · +${score * 2} XP${best ? ' · kỷ lục mới!' : ''}`, 'sprint');
  };
  const draw = () => {
    let w; do { w = pick(ws); } while (w === last && ws.length > 1);
    last = w;
    const opts = shuffle([w, ...sample(ws.filter((x) => x !== w && short(x) !== short(w)), 3)]);
    body.innerHTML = `<section class="card flash" style="min-height:240px"><span class="big" style="font-size:96px">${esc(w.w)}</span></section>
      <div class="opts">${opts.map((o) => `<button class="opt" data-id="${o.id}" style="min-height:64px;font-size:16px">${esc(short(o))}</button>`).join('')}</div>`;
    body.querySelectorAll('[data-id]').forEach((b) => b.onclick = () => {
      total++;
      if (b.dataset.id === w.id) { score++; draw(); }
      else {
        b.classList.add('wrong');
        body.querySelector(`[data-id="${w.id}"]`).classList.add('right');
        body.querySelectorAll('[data-id]').forEach((x) => x.disabled = true);
        setTimeout(draw, 700);
      }
    });
  };
  draw();
  return () => clearInterval(tick);
}

// ---------- 4. Săn thanh điệu ----------
const MARK = { a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', v: 'ǖǘǚǜ' };
function setTone(syl, t) {
  const plain = stripTones(syl);
  if (!t || plain === 'r') return plain.replace(/v/g, 'ü');
  let idx = plain.indexOf('a');
  if (idx < 0) idx = plain.indexOf('e');
  if (idx < 0 && plain.includes('ou')) idx = plain.indexOf('o');
  if (idx < 0) { for (let k = plain.length - 1; k >= 0; k--) if ('aeiouv'.includes(plain[k])) { idx = k; break; } }
  if (idx < 0) return plain;
  const v = plain[idx];
  return (plain.slice(0, idx) + MARK[v][t - 1] + plain.slice(idx + 1)).replace(/v/g, 'ü');
}
function tone(body, hud) {
  const ws = sample(pool().filter((w) => w.p.split(' ').length <= 3), 10);
  const voice = hasVoice();
  let i = 0, score = 0;
  const draw = () => {
    if (i >= ws.length) {
      const best = finishGame('tone', score);
      store.addXP(score * 5);
      body.innerHTML = endCard(`${score} / ${ws.length} câu đúng`, `+${score * 5} XP${best ? ' · kỷ lục mới!' : ''}`, 'tone');
      return;
    }
    const w = ws[i];
    const syls = w.p.split(' ');
    const variants = new Set([w.p]);
    let guard = 0;
    while (variants.size < 4 && guard++ < 60) {
      variants.add(syls.map((s) => (stripTones(s) === 'r' ? s : setTone(s, 1 + Math.floor(Math.random() * 4)))).join(' '));
    }
    const opts = shuffle([...variants]);
    hud.innerHTML = `<span class="chip acc">Câu ${i + 1} / ${ws.length}</span><span class="chip">Điểm ${score}</span>`;
    body.innerHTML = `<section class="card flash" style="min-height:240px">
      ${voice ? `<button class="btn big pri" id="say">${ICON.sound} Nghe</button><span class="muted">Nghe rồi chọn pinyin đúng</span>` : `<span class="big" style="font-size:88px">${esc(w.w)}</span><span class="muted">Máy bạn chưa có giọng đọc tiếng Trung · hãy đoán thanh điệu của từ này</span>`}
      <span id="reveal" hidden><span class="zhs" style="font-size:48px">${esc(w.w)}</span> · <span class="hv">${esc(w.hv)}</span> · ${esc(w.vi.split(';')[0])}</span></section>
      <div class="opts">${opts.map((o) => `<button class="opt" data-p="${esc(o)}" style="min-height:64px;font-size:22px">${pyHTML(o)}</button>`).join('')}</div><div id="fb"></div>`;
    const say = () => speak(w.w, 0.7);
    body.querySelector('#say')?.addEventListener('click', say);
    if (voice) setTimeout(say, 300);
    body.querySelectorAll('[data-p]').forEach((b) => b.onclick = () => {
      const right = b.dataset.p === w.p;
      if (right) score++;
      body.querySelectorAll('[data-p]').forEach((x) => { x.disabled = true; if (x.dataset.p === w.p) x.classList.add('right'); });
      if (!right) b.classList.add('wrong');
      body.querySelector('#reveal').hidden = false;
      body.querySelector('#fb').innerHTML = `<div class="btns" style="justify-content:flex-end"><button class="btn pri" id="nx">Câu tiếp →</button></div>`;
      body.querySelector('#nx').onclick = () => { i++; draw(); };
    });
  };
  draw();
}

// ---------- 5. Thử thách nét ----------
function stroke(body, hud) {
  const cs = shuffle([...new Set(pool().flatMap((w) => [...w.w]))].filter((c) => D.chars[c] && D.chars[c].sk >= 3));
  let lives = 3, score = 0, i = 0;
  const draw = () => {
    if (lives <= 0 || i >= cs.length) {
      const best = finishGame('stroke', score);
      store.addXP(score * 5);
      body.innerHTML = endCard(`Viết đúng ${score} chữ`, `+${score * 5} XP${best ? ' · kỷ lục mới!' : ''}`, 'stroke');
      return;
    }
    const c = cs[i];
    const ch = D.chars[c];
    hud.innerHTML = `<span class="lives" aria-label="Còn ${lives} mạng">${[0, 1, 2].map((n) => `<i class="${n < lives ? '' : 'off'}"></i>`).join('')}</span><span class="chip">Đúng ${score}</span>`;
    body.innerHTML = `<section class="card" style="align-items:center;text-align:center">
      <span class="soft">Viết chữ có âm Hán Việt <span class="hv" style="font-size:24px">${esc(ch.hv?.[0] || '')}</span> · ${pyHTML((ch.py || []).join(' '))}</span>
      <span class="muted">${esc((ch.vi || '').split(';')[0])} · ${ch.sk} nét</span>
      <div class="sbox lg" id="box"></div>
      <div class="btns"><button class="btn sm" id="hint">Gợi ý nét tiếp (−1 mạng)</button><button class="btn sm" id="skip">Bỏ qua</button></div>
      <span class="muted" style="font-size:12px">Sai 3 nét trở lên trong một chữ thì mất một mạng</span></section>`;
    const wr = makeWriter(body.querySelector('#box'), c, 240, { showOutline: false, showCharacter: false });
    if (!wr) { i++; return draw(); }
    wr.quiz({
      showHintAfterMisses: 3,
      onComplete: ({ totalMistakes }) => {
        if (totalMistakes >= 3) { lives--; toast(`Sai ${totalMistakes} nét · mất 1 mạng`); } else { score++; }
        speak(c);
        setTimeout(() => { i++; draw(); }, 900);
      },
    });
    body.querySelector('#hint').onclick = () => { lives--; wr.showOutline(); hud.querySelector('.lives').innerHTML = [0, 1, 2].map((n) => `<i class="${n < lives ? '' : 'off'}"></i>`).join(''); if (lives <= 0) draw(); };
    body.querySelector('#skip').onclick = () => { lives--; i++; draw(); };
  };
  draw();
}

// ---------- 6. Xếp câu ----------
function sentence(body, hud) {
  const items = sample(D.grammar.flatMap((g) => g.egs.map((e) => ({ g, e }))).filter((x) => x.e[0].split('|').length <= 9), 6);
  let i = 0, score = 0;
  const draw = () => {
    if (i >= items.length) {
      const best = finishGame('sentence', score);
      store.addXP(score * 10);
      body.innerHTML = endCard(`${score} / ${items.length} câu đúng`, `+${score * 10} XP${best ? ' · kỷ lục mới!' : ''}`, 'sentence');
      return;
    }
    const { g, e } = items[i];
    const toks = e[0].split('|');
    const punct = /^[。？！，]$/;
    const core = toks.filter((t) => !punct.test(t));
    const end = toks[toks.length - 1];
    let bag = shuffle(core.map((t, n) => ({ t, n })));
    while (core.length > 1 && bag.every((x, k) => x.n === k)) bag = shuffle(bag);
    let built = [];
    hud.innerHTML = `<span class="chip acc">Câu ${i + 1} / ${items.length}</span><span class="chip">Điểm ${score}</span>`;
    const paint = () => {
      body.innerHTML = `<section class="card">
        <span class="soft">Xếp thành câu: <b style="color:var(--text)">${esc(e[2])}</b></span>
        <span class="muted" style="font-size:13px">Gợi ý ngữ pháp: ${esc(g.t)}</span>
        <div class="tokens" id="built" aria-label="Câu của bạn">${built.map((x, k) => `<button class="tok" data-b="${k}">${esc(x.t)}</button>`).join('')}<span class="zh" style="font-size:20px;align-self:center">${esc(punct.test(end) ? end : '')}</span></div>
        <div class="tokens" style="border-style:solid">${bag.map((x, k) => `<button class="tok" data-k="${k}">${esc(x.t)}</button>`).join('')}</div>
        <div class="btns"><button class="btn pri" id="check" ${bag.length ? 'disabled' : ''}>Kiểm tra</button><button class="btn" id="reset">Làm lại</button></div>
        <div id="fb"></div></section>`;
      body.querySelectorAll('[data-k]').forEach((b) => b.onclick = () => { built.push(bag.splice(+b.dataset.k, 1)[0]); paint(); });
      body.querySelectorAll('[data-b]').forEach((b) => b.onclick = () => { bag.push(built.splice(+b.dataset.b, 1)[0]); paint(); });
      body.querySelector('#reset').onclick = () => { bag = bag.concat(built); built = []; paint(); };
      body.querySelector('#check').onclick = () => {
        const mine = built.map((x) => x.t).join('');
        const right = mine === core.join('');
        if (right) score++;
        const full = toks.join('');
        body.querySelector('#fb').innerHTML = `<div class="fb ${right ? 'ok' : 'bad'}"><b>${right ? 'Chính xác · +10 XP' : 'Chưa đúng'}</b>
          <span><span class="zh" style="font-size:18px">${esc(full)}</span><br>${esc(e[1])}</span></div>
          <div class="btns" style="justify-content:flex-end;margin-top:10px"><button class="btn pri" id="nx">Câu tiếp →</button></div>`;
        body.querySelector('#check').disabled = true;
        speak(full);
        body.querySelector('#nx').onclick = () => { i++; draw(); };
      };
    };
    paint();
  };
  draw();
}

// ---------- 7. Đấu tài khoản ----------
function duel(body, hud) {
  const draw = async () => {
    let rows = store.profiles().map((p) => {
      const st = p.id === store.id() ? store.get() : store.peek(p.id);
      return { id: p.id, name: st?.profile?.name || p.name, xp: st ? store.weekXP(st) : 0, me: p.id === store.id(), local: true };
    });
    const remote = sync.enabled ? await sync.leaderboard() : null;
    if (remote) rows = remote;
    rows.sort((a, b) => b.xp - a.xp);
    const top = rows[0]?.xp || 1;
    body.innerHTML = `<section class="card">
      <div class="between"><h2 class="h2"><span class="zhs">本周</span>Bảng xếp hạng tuần này</h2><span class="muted" style="font-size:12px">XP tính từ thứ hai</span></div>
      ${rows.map((r, n) => `<div style="display:flex;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid var(--line)">
        <span class="lux" style="font-size:30px;width:32px">${n + 1}</span>
        <div class="avatar">${esc((r.name || '?')[0].toUpperCase())}</div>
        <div style="flex:1;display:flex;flex-direction:column;gap:6px"><b>${esc(r.name)}${r.me ? ' <span class="chip">bạn</span>' : ''}</b>
          <div class="progress"><i style="width:${(r.xp / Math.max(1, top)) * 100}%"></i></div></div>
        <span class="lux" style="font-size:28px;font-weight:600">${r.xp}</span></div>`).join('')}
      ${rows.length < 2 ? `<p class="muted" style="margin:0">Chưa có đối thủ. ${sync.enabled ? 'Người thứ hai cần đăng nhập bằng Gmail của họ.' : 'Thêm tài khoản thứ hai trong <a href="#/settings">Cài đặt</a>, hoặc bật đồng bộ để đấu qua mạng.'}</p>` : ''}
    </section>
    <section class="card sub"><h2 class="h2" style="font-size:20px">Cách kiếm XP</h2>
      <ul class="list-plain"><li>Học 1 từ mới: +5</li><li>Ôn 1 thẻ: +1 đến +2</li><li>Trò chơi: +2 đến +20 tùy kết quả</li><li>Học xong 1 điểm ngữ pháp: +10 · Viết nhật ký: +5</li></ul></section>`;
  };
  hud.innerHTML = '';
  draw();
}
