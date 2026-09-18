/**
 * 汉字技能卡：卡面上是一个大大的汉字，点卡片即升级（听音选字版，无喊字环节）。
 * 玩技能 = 体验汉字含义（大=伤害变大、水=回血、山=护盾挡伤…）。
 */
export const SKILL_MAX_LEVEL = 5;

export const SKILLS = [
  {
    id: 'big', char: '大', pinyin: 'dà', plain: 'da',
    word: '大象', soundsLike: '达答打', emoji: '🐘',
    name: '变大变强',
    lesson: '大：大象的大。伤害变大！',
    desc: (l) => `伤害 +25%（变大变强）· 下一级 ${l + 1}/${SKILL_MAX_LEVEL}`,
    apply: (ps) => { ps.bonusDmg = Math.min(2.5, ps.bonusDmg + 0.25); },
  },
  {
    id: 'small', char: '小', pinyin: 'xiǎo', plain: 'xiao',
    word: '小鸟', soundsLike: '晓笑筱', emoji: '🐤',
    name: '小快灵',
    lesson: '小：小鸟的小。子弹小小的，飞得更快！',
    desc: (l) => `射击间隔 ×0.88（小快灵）· 下一级 ${l + 1}/${SKILL_MAX_LEVEL}`,
    apply: (ps) => { ps.fireInterval = Math.max(140, Math.round(ps.fireInterval * 0.88)); },
  },
  {
    id: 'water', char: '水', pinyin: 'shuǐ', plain: 'shui',
    word: '喝水', soundsLike: '睡谁说', emoji: '💧',
    name: '喝水回血',
    lesson: '水：喝水的水。喝水回复生命！',
    desc: (l) => `每秒回复 ${(0.9 * (l + 1)).toFixed(1)} HP · 下一级 ${l + 1}/${SKILL_MAX_LEVEL}`,
    apply: (ps) => { ps.regen += 0.9; },
  },
  {
    id: 'mountain', char: '山', pinyin: 'shān', plain: 'shan',
    word: '大山', soundsLike: '三杉衫珊闪删', emoji: '⛰️',
    name: '大山护盾',
    lesson: '山：大山的山。像大山一样挡住伤害！',
    desc: () => '获得一层护盾（挡一次伤害），破损后 12 秒重充',
    apply: (ps) => { ps.shieldMax += 1; ps.shield = ps.shieldMax; ps.shieldTimer = 0; },
  },
  {
    id: 'wind', char: '风', pinyin: 'fēng', plain: 'feng',
    word: '大风', soundsLike: '丰封疯峰锋分', emoji: '🌬️',
    name: '乘风快跑',
    lesson: '风：大风的风。跑得像风一样快！',
    desc: (l) => `移动速度 +8% · 下一级 ${l + 1}/${SKILL_MAX_LEVEL}`,
    apply: (ps) => { ps.moveMul = (ps.moveMul || 1) + 0.08; },
  },
  {
    id: 'fire', char: '火', pinyin: 'huǒ', plain: 'huo',
    word: '大火', soundsLike: '伙活或货', emoji: '🔥',
    name: '火眼金睛',
    lesson: '火：大火的火。火眼金睛，一击必胜（暴击）！',
    desc: (l) => `暴击率 +15%（暴击造成 2 倍伤害）· 下一级 ${l + 1}/${SKILL_MAX_LEVEL}`,
    apply: (ps) => { ps.critChance = Math.min(1, ps.critChance + 0.15); },
  },
  {
    id: 'sun', char: '日', pinyin: 'rì', plain: 'ri',
    word: '日出', soundsLike: '日入', emoji: '☀️',
    name: '日耀光环',
    lesson: '日：日出的日。太阳向四周发光！',
    desc: (l) => `每 6 秒向四周发射 ${6 + 2 * (l + 1)} 道阳光 · 下一级 ${l + 1}/${SKILL_MAX_LEVEL}`,
    apply: (ps) => { ps.volleyLvl += 1; },
  },
  {
    id: 'earth', char: '地', pinyin: 'dì', plain: 'di',
    word: '大地', soundsLike: '弟第低敌滴迪', emoji: '🌍',
    name: '地震冲击',
    lesson: '地：大地的地。跺跺脚，大地震动！',
    desc: (l) => `每 5 秒地震冲击波：近处 ${20 + 8 * l} 伤害、远处减半 · 下一级 ${l + 1}/${SKILL_MAX_LEVEL}`,
    apply: (ps) => { ps.novaLvl += 1; },
  },
];

// ---------- 被动六件套（也是汉字卡）----------
const PASSIVES = [
  {
    id: 'tree', char: '木', pinyin: 'mù', plain: 'mu',
    word: '木头', soundsLike: '目母慕墓幕亩姆', emoji: '🌳',
    name: '茁壮成长', max: 5,
    lesson: '木：木头的木。像小树一样长高高！',
    desc: (l) => `最大生命 +20 · ${l + 1}/5`,
    apply: (ps) => { ps.maxHp += 20; ps.hp += 20; },
  },
  {
    id: 'gold', char: '金', pinyin: 'jīn', plain: 'jin',
    word: '金色', soundsLike: '今斤津进近尽晋', emoji: '🥇',
    name: '吸金磁铁', max: 5,
    lesson: '金：金色的金。把经验统统吸过来！',
    desc: (l) => `经验球磁吸范围 +20% · ${l + 1}/5`,
    apply: (ps) => { ps.magnetMul = (ps.magnetMul || 1) + 0.2; },
  },
  {
    id: 'field', char: '田', pinyin: 'tián', plain: 'tian',
    word: '田地', soundsLike: '天甜添填', emoji: '🌾',
    name: '田里丰收', max: 5,
    lesson: '田：田地的田。田里丰收，经验变多！',
    desc: (l) => `经验获取 +15% · ${l + 1}/5`,
    apply: (ps) => { ps.xpMul = (ps.xpMul || 1) + 0.15; },
  },
  {
    id: 'stone', char: '石', pinyin: 'shí', plain: 'shi',
    word: '石头', soundsLike: '十时是事市实拾湿', emoji: '🪨',
    name: '石头硬硬', max: 5,
    lesson: '石：石头的石。像石头一样硬，受伤变少！',
    desc: (l) => `受到伤害 -${8 * (l + 1)}% · ${l + 1}/5`,
    apply: (ps) => { ps.armor = Math.min(0.5, (ps.armor || 0) + 0.08); },
  },
  {
    id: 'star', char: '星', pinyin: 'xīng', plain: 'xing',
    word: '星星', soundsLike: '行醒性姓兴', emoji: '⭐',
    name: '星光一闪', max: 5,
    lesson: '星：星星的星。星光一闪，暴击更痛！',
    desc: (l) => `暴击伤害 +0.5 倍 · ${l + 1}/5`,
    apply: (ps) => { ps.critMul += 0.5; },
  },
  {
    id: 'foot', char: '足', pinyin: 'zú', plain: 'zu',
    word: '足球', soundsLike: '族组祖阻', emoji: '⚽',
    name: '健步如飞', max: 5,
    lesson: '足：足球的足。小脚更有力，冲刺更快恢复！',
    desc: (l) => `冲刺冷却 -${10 + 2 * l}% · ${l + 1}/5`,
    apply: (ps) => { ps.dashCdMul = Math.max(0.4, (ps.dashCdMul || 1) - 0.12); },
  },
];

/** 保底卡：全部字卡满级时出现 */
export const FALLBACK_CARD = {
  id: 'heart', char: '心', pinyin: 'xīn', plain: 'xin',
    word: '爱心', soundsLike: '新辛欣信芯薪', emoji: '❤️',
  name: '爱心满满',
  max: Infinity,
  lesson: '心：爱心的心。爱心满满，恢复生命！',
  desc: () => '立即回复 40 HP',
  apply: (ps) => { ps.hp = Math.min(ps.maxHp, ps.hp + 40); },
};

/** 从字卡池抽 3 张不重复的可用卡（满级剔除；不足用心卡补齐） */
export function drawThreeCards(skillLevels, pool) {
  const full = pool || [...SKILLS, ...PASSIVES];
  const avail = full.filter((s) => (skillLevels[s.id] || 0) < s.max);
  for (let i = avail.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [avail[i], avail[j]] = [avail[j], avail[i]];
  }
  const cards = avail.slice(0, 3);
  while (cards.length < 3) cards.push(FALLBACK_CARD);
  return cards;
}
