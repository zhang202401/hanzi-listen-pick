/**
 * 全局配置（幼儿识字版调参）：
 * - 敌人更温和、升级更快 → 小朋友有更多"听音选字"的学习循环
 */

// —— 自适应视口 ——
export const VIEWPORT = {
  MIN_W: 420,
  MIN_H: 700,
  MAX_W: 1700,
  MAX_H: 950,
};

// —— 玩家 ——
export const PLAYER = {
  SPEED: 210,
  RADIUS: 16,
  MAX_HP: 120,
  IFRAME_MS: 700,
};

// —— 世界 ——
export const WORLD = {
  BACKGROUND: 0x0a0e1a,
  GRID_COLOR: 0x1b2440,
};

// —— 主题色（暖色系，儿童友好）——
export const COLORS = {
  player: 0xfbbf24, // 暖金
  playerCore: 0xffffff,
  enemy1: 0xef4444,
  enemy2: 0xf59e0b,
  enemy3: 0xa855f7,
  enemy4: 0xec4899,
  xp: 0x4ade80,
  gold: 0xfbbf24,
  hp: 0xef4444,
  uiText: '#e2e8f0',
  uiDim: '#64748b',
  accent: '#fbbf24',
};

// —— 敌人（比数学版温和约 35%：血更少、伤害更低）——
export const ENEMY = {
  chaser: { key: 'enemy1', speed: 85, damage: 7, radius: 14, hp: 20, xp: 1 },
  sprinter: { key: 'enemy2', speed: 140, damage: 6, radius: 10, hp: 14, xp: 1 },
  tank: { key: 'enemy3', speed: 52, damage: 14, radius: 21, hp: 75, xp: 4 },
  splitter: { key: 'enemy4', speed: 70, damage: 8, radius: 16, hp: 32, xp: 2 },
  mini: { key: 'enemy5', speed: 120, damage: 4, radius: 8, hp: 7, xp: 1 },
  shooter: { key: 'enemy6', speed: 62, damage: 6, radius: 12, hp: 18, xp: 2 },
  charger: { key: 'enemy7', speed: 78, damage: 11, radius: 13, hp: 28, xp: 3 },
  bomber: { key: 'enemy8', speed: 95, damage: 15, radius: 13, hp: 16, xp: 3 },
  summoner: { key: 'enemy9', speed: 56, damage: 4, radius: 14, hp: 42, xp: 5 },
};

// —— 敌方弹幕 ——
export const EBULLET = { speed: 220, damage: 8, lifeMs: 3200, radius: 5 };

// —— 生成节奏 ——
export const SPAWN = {
  intervalStart: 1500,
  intervalMin: 400,
  decayPerSec: 2.2,
  capBase: 6,
  capPerTenSec: 1,
  capMax: 60,
  margin: 90,
  despawnDist: 1700,
};

// —— 接触伤害 ——
export const CONTACT = {
  iframeMs: 800,
  knockback: 300,
};

// —— 自动武器 ——
export const WEAPON = {
  range: 620,
  interval: 400,
  bulletSpeed: 560,
  damage: 14,
  lifetimeMs: 1100,
  spreadDeg: 10,
};

// —— 经验球 ——
export const GEM = {
  magnetRadius: 110,
  collectRadius: 28,
  magnetSpeed: 430,
};

// —— 升级曲线（更快：识字循环是核心玩法）——
export const XP = {
  baseNeed: 4,
  growth: 1.24,
};

// —— 掉落与奖励 ——
export const DROPS = {
  healChance: 0.035,
  magnetChance: 0.014,
  chestChance: 0.016,
  healAmount: 40,
};

// —— 精英怪 ——
export const ELITE = {
  afterSec: 180,
  chance: 0.05,
  hpMul: 4, speedMul: 0.85, scale: 1.45,
  xpMul: 6,
};

// —— 胜利条件与节奏 ——
export const RUN = {
  victorySec: 480, // 8 分钟胜利（幼儿一局不宜过长）
  hitStopMs: 50,
  hitStopCritMs: 80,
};

// —— 字体 ——
export const FONT = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
