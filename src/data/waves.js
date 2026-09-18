/**
 * 波次导演表（幼儿版：更温和的节奏，8 分钟胜利）。
 * t = 开局秒数；interval = 生成间隔 ms；cap = 敌人上限；mix = 兵种权重；boss = 该波 Boss。
 */
export const WAVES = [
  { t: 0,    interval: 1600, cap: 7,  mix: { chaser: 1 } },
  { t: 60,   interval: 1300, cap: 9,  mix: { chaser: 3, sprinter: 1 } },
  { t: 150,  interval: 1150, cap: 12, mix: { chaser: 3, sprinter: 2, tank: 1 } },
  { t: 260,  interval: 1100, cap: 13, mix: { chaser: 2, sprinter: 1, splitter: 1, shooter: 1 }, boss: 'dice' },
  { t: 380,  interval: 950,  cap: 18, mix: { chaser: 2, sprinter: 2, tank: 1, splitter: 1, shooter: 1, charger: 1 } },
  { t: 480,  interval: 900,  cap: 20, mix: { chaser: 2, sprinter: 2, tank: 1, splitter: 1, shooter: 1, charger: 1, bomber: 1 }, boss: 'stats' },
  { t: 600,  interval: 820,  cap: 26, mix: { chaser: 3, sprinter: 2, tank: 2, splitter: 2, shooter: 2, summoner: 1 } },
  { t: 840,  boss: 'sine' },
  { t: 1020, boss: 'dice' },
  { t: 1200, boss: 'stats' },
];

export function waveAt(t) {
  let w = WAVES[0];
  for (const x of WAVES) {
    if (t >= x.t) w = x;
  }
  return w;
}

export function bossTriggered(t, firedSet) {
  for (const w of WAVES) {
    if (w.boss && t >= w.t && !firedSet.has(w.boss)) {
      firedSet.add(w.boss);
      return w.boss;
    }
  }
  return null;
}
