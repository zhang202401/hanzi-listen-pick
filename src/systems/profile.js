import { CHARS, activePool, buildQuiz, CHAR_MAP } from '../data/chars.js';

/**
 * 识字档案（localStorage 持久化，跨局累积）：
 * - charStats：每个字的答题数/正确数/最近答错时间
 * - wrongBook：错字本，答错后隔 2 级重现，答对移出
 * - 生字池随等级扩大（从 0 开始：开局 6 字 → 逐步解锁全部课程字）
 */
const KEY = 'hanzi-survivors-profile-v1';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return { charStats: {}, wrongBook: {}, totalAnswered: 0, totalCorrect: 0, sessions: 0, bestTime: 0 };
}

const profile = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch (e) { /* ignore */ }
}

/**
 * 记录一次识字答题。
 * 错字本采用间隔重复（SRS/Leitner 盒简化版）：
 *   答错 → 重学（隔 2 级重现）；答对 → 连对 streak+1，复习间隔逐步拉长（3→7→14 级），
 *   连对 4 次视为掌握，移出错字本。研究支持扩展间隔比集中复习记得更久。
 */
export function recordCharAnswer(char, correct, gameLevel) {
  const st = profile.charStats[char] || { n: 0, c: 0, lastWrongAt: 0 };
  st.n += 1;
  if (correct) st.c += 1;
  else st.lastWrongAt = Date.now();
  profile.charStats[char] = st;

  profile.totalAnswered += 1;
  if (correct) profile.totalCorrect += 1;

  const wb = profile.wrongBook;
  if (!correct) {
    wb[char] = { count: (wb[char]?.count || 0) + 1, streak: 0, due: gameLevel + 2, lastAt: Date.now() };
  } else if (wb[char]) {
    const streak = (wb[char].streak || 0) + 1;
    if (streak >= 4) {
      delete wb[char]; // 连对 4 次：掌握，移出错字本
    } else {
      const gaps = [3, 7, 14]; // 连对 1/2/3 次后的下一轮复习间隔（级）
      wb[char].streak = streak;
      wb[char].due = gameLevel + gaps[streak - 1];
      wb[char].lastAt = Date.now();
    }
  }
  save();
}

/** 错字列表（结算报告用） */
export function wrongChars() {
  return Object.keys(profile.wrongBook)
    .map((ch) => ({ ...CHAR_MAP.get(ch), meta: profile.wrongBook[ch] }))
    .filter((x) => x.char);
}

/**
 * 识字自适应抽题：错字重现优先；生字权重高，已熟字低频维持。
 * 返回 quiz 对象（含语音播报文本）。
 */
export function pickQuizChar(gameLevel) {
  const pool = activePool(gameLevel);

  // 1) 错字本到期重现（60% 概率直接考错字）
  const due = pool.filter((c) => profile.wrongBook[c.char] && profile.wrongBook[c.char].due <= gameLevel);
  let target;
  if (due.length && Math.random() < 0.6) {
    target = due[Math.floor(Math.random() * due.length)];
  } else {
    // 2) 加权抽样：没考过的字 ×1.5；正确率 <60% ×2.5；≥85%（测过≥3次）×0.4；
    //    错字本中尚未到复习期的字 ×0.5（SRS：不到时间不抢先考）
    const weights = pool.map((c) => {
      const st = profile.charStats[c.char];
      let w = 1;
      if (!st || st.n === 0) w = 1.5;
      else {
        const acc = st.c / st.n;
        if (acc < 0.6) w = 2.5;
        else if (acc >= 0.85 && st.n >= 3) w = 0.4;
      }
      const wbEntry = profile.wrongBook[c.char];
      if (wbEntry && wbEntry.due > gameLevel) w = Math.min(w, 0.5);
      return { c, w };
    });
    const total = weights.reduce((s, x) => s + x.w, 0);
    let roll = Math.random() * total;
    target = pool[0];
    for (const { c, w } of weights) {
      roll -= w;
      if (roll <= 0) { target = c; break; }
    }
  }

  const q = buildQuiz(gameLevel, target);
  // 选项拼音表（quiz 答完后揭晓用）
  q.pinyinMap = {};
  q.opts.forEach((ch) => {
    const c = CHAR_MAP.get(ch);
    if (c) q.pinyinMap[ch] = c;
  });
  return q;
}

/** Boss 识字护盾题：从生字池取目标字 + 干扰字 */
export function buildShieldQuiz(gameLevel) {
  const q = pickQuizChar(Math.max(1, gameLevel));
  return q;
}

export function addSession(timeSec) {
  profile.sessions += 1;
  if (timeSec > profile.bestTime) profile.bestTime = timeSec;
  save();
}

export function getProfile() {
  return profile;
}

/** 学字总览（结算报告用）：最近练的字按掌握度排序 */
export function charSummary(limit = 8) {
  const rows = CHARS
    .filter((c) => profile.charStats[c.char] && profile.charStats[c.char].n > 0)
    .map((c) => {
      const st = profile.charStats[c.char];
      return { ...c, n: st.n, c: st.c, acc: st.c / st.n };
    })
    .sort((a, b) => a.acc - b.acc);
  return rows.slice(0, limit);
}

export function resetProfile() {
  profile.charStats = {};
  profile.wrongBook = {};
  profile.totalAnswered = 0;
  profile.totalCorrect = 0;
  profile.sessions = 0;
  profile.bestTime = 0;
  save();
}
