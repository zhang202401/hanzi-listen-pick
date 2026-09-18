import { addSession, charSummary, getProfile, wrongChars } from './profile.js';
import { poolSizeForLevel } from '../data/chars.js';
import { CHARS } from '../data/chars.js';

/**
 * 战斗结算报告（家长视角）：本局学字情况 + 错字本 + 进度。
 */
export function showReport({ timeStr, kills, level, correct, total, bossKills, victory }, onRestart) {
  addSession(timeStr ? parseSec(timeStr) : 0);
  const profile = getProfile();
  const summary = charSummary(10);
  const wrong = wrongChars();
  const acc = total ? Math.round((correct / total) * 100) : null;

  const root = document.getElementById('overlay');
  root.innerHTML = '';
  root.style.display = 'flex';

  const panel = document.createElement('div');
  panel.className = 'report-panel';

  panel.innerHTML = `
    <div class="report-title" style="${victory ? 'color:#4ade80' : ''}">${victory ? '🏆 生存胜利！' : '学字小报告'}</div>
    <div class="rp-stats">
      <div class="rp-stat"><span>存活时间</span><b>${timeStr}</b></div>
      <div class="rp-stat"><span>击倒小怪</span><b>${kills}</b></div>
      <div class="rp-stat"><span>最终等级</span><b>Lv.${level}</b></div>
      <div class="rp-stat"><span>已学生字</span><b>${poolSizeForLevel(level)} / ${CHARS.length}</b></div>
      <div class="rp-stat"><span>本局答题</span><b>${total ? `${correct}/${total}（${acc}%）` : '未答题'}</b></div>
      <div class="rp-stat"><span>历史最佳</span><b>${formatTime(profile.bestTime)}</b></div>
    </div>
  `;

  if (summary.length) {
    const title = document.createElement('div');
    title.className = 'rp-wrong-title';
    title.textContent = '📖 本档案学字情况（最需要巩固在前）';
    panel.appendChild(title);
    summary.forEach((c) => {
      const box = document.createElement('div');
      box.className = 'rp-wrong';
      const pct = Math.round(c.acc * 100);
      box.innerHTML = `<b>${c.char}</b>（${c.pinyin}）${c.word} — 答对 ${c.c}/${c.n}（${pct}%）`;
      panel.appendChild(box);
    });
  }

  if (wrong.length) {
    const title = document.createElement('div');
    title.className = 'rp-wrong-title';
    title.textContent = `📕 错字本（${wrong.length} 个，游戏中会间隔重现）`;
    panel.appendChild(title);
    wrong.slice(0, 8).forEach((c) => {
      const box = document.createElement('div');
      box.className = 'rp-wrong';
      const streak = c.meta.streak || 0;
      box.innerHTML = `<b>${c.char}</b>（${c.pinyin}）${c.word} · 错 ${c.meta.count} 次 · 复习连对 ${streak}/4`;
      panel.appendChild(box);
    });
  }

  const btns = document.createElement('div');

  // 亲子共玩小贴士（研究支持：亲子共读共玩显著提升学习迁移）
  const tips = [];
  if (wrong.length) {
    tips.push(`生活里遇到【${wrong[0].char}】（招牌、绘本都行），指给孩子问"这是什么字？"`);
  }
  if (summary.length) {
    const best = [...summary].sort((a, b) => b.acc - a.acc)[0];
    tips.push(`让孩子当小老师，教您读【${best.char}】——会教才是真的会。`);
  }
  tips.push('陪孩子一起玩 10 分钟，比孩子独自玩半小时更有效哦。');
  const tipDiv = document.createElement('div');
  tipDiv.className = 'rp-advice';
  tipDiv.innerHTML = '👨‍👩‍👧 亲子小贴士：<br>' + tips.map((t) => `· ${t}`).join('<br>');
  panel.appendChild(tipDiv);

  btns.className = 'rp-btns';
  const again = document.createElement('button');
  again.className = 'rp-btn primary';
  again.textContent = '↻ 再来一局';
  again.addEventListener('click', () => {
    root.style.display = 'none';
    root.innerHTML = '';
    onRestart();
  });
  btns.appendChild(again);
  panel.appendChild(btns);

  root.appendChild(panel);
  again.focus({ preventScroll: true });
}

function parseSec(str) {
  const [m, s] = String(str).split(':').map(Number);
  return (m || 0) * 60 + (s || 0);
}

function formatTime(sec) {
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}
