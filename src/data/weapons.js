/**
 * 武器系统（汉字版）：10 种副武器，每种挂一个课程汉字。
 * 武器卡与技能卡一样直接点选升级。
 */
export const WEAPONS = [
  {
    id: 'whirl', char: '月', pinyin: 'yuè', plain: 'yue',
    word: '月亮', soundsLike: '越乐阅钥岳悦', emoji: '🌙',
    name: '月牙环刃', max: 5,
    lesson: '月：月亮的月。月牙围着身体转！',
    desc: (l) => `环绕旋转的月牙刃 ×${1 + l}，接触伤害 ${8 + 4 * l}`,
  },
  {
    id: 'chain', char: '电', pinyin: 'diàn', plain: 'dian',
    word: '闪电', soundsLike: '店点垫淀甸', emoji: '⚡',
    name: '闪电链', max: 5,
    lesson: '电：闪电的电。闪电跳来跳去！',
    desc: (l) => `每 2.5 秒闪电命中最近敌人 ${10 + 5 * l} 伤害，跳跃 ${1 + l} 次`,
  },
  {
    id: 'grenade', char: '炸', pinyin: 'zhà', plain: 'zha',
    word: '炸弹', soundsLike: '渣眨诈扎', emoji: '💣',
    name: '炸弹投掷', max: 5,
    lesson: '炸：炸弹的炸。轰！中心更痛！',
    desc: (l) => `每 2.8 秒投弹，中心 ${25 + 10 * l} 伤害、外圈减半`,
  },
  {
    id: 'laser', char: '光', pinyin: 'guāng', plain: 'guang',
    word: '月光', soundsLike: '广逛', emoji: '💡',
    name: '光线贯穿', max: 5,
    lesson: '光：月光的光。一条光线穿过去！',
    desc: (l) => `每 1.8 秒贯穿光线，直线上所有敌人受 ${12 + 6 * l} 伤害`,
  },
  {
    id: 'missile', char: '箭', pinyin: 'jiàn', plain: 'jian',
    word: '火箭', soundsLike: '见件建剑间健简剪', emoji: '🚀',
    name: '追踪箭', max: 5,
    lesson: '箭：火箭的箭。小箭会转弯追敌人！',
    desc: (l) => `每 2.4 秒发射 ${l} 枚追踪箭，每枚 ${18 + 8 * l} 伤害`,
  },
  {
    id: 'cluster', char: '花', pinyin: 'huā', plain: 'hua',
    word: '花朵', soundsLike: '话画华滑化', emoji: '🌸',
    name: '花开散射', max: 5,
    lesson: '花：花朵的花。炸开像花一样散开！',
    desc: (l) => `每 2.6 秒投出花弹，爆裂散射 ${4 + 2 * l} 枚子弹`,
  },
  {
    id: 'sine', char: '蛇', pinyin: 'shé', plain: 'she',
    word: '小蛇', soundsLike: '舍社设舌射', emoji: '🐍',
    name: '小蛇弹幕', max: 5,
    lesson: '蛇：小蛇的蛇。子弹像小蛇一样扭呀扭！',
    desc: (l) => `每 1.6 秒射出 ${2 + l} 枚蛇形弹，扭着前进`,
  },
  {
    id: 'boomer', char: '回', pinyin: 'huí', plain: 'hui',
    word: '回家', soundsLike: '会汇惠慧灰恢', emoji: '🪃',
    name: '回旋镖', max: 5,
    lesson: '回：回家的回。飞出去再飞回来！',
    desc: (l) => `掷出回旋镖，去程回程双程伤害 ${14 + 6 * l}`,
  },
  {
    id: 'frost', char: '冰', pinyin: 'bīng', plain: 'bing',
    word: '冰块', soundsLike: '丙饼病并兵', emoji: '🧊',
    name: '冰冻减速', max: 5,
    lesson: '冰：冰块的冰。把敌人冻得慢吞吞！',
    desc: (l) => `每 5 秒冰冻脉冲：圈内敌人速度 -${30 + 10 * l}% 持续 2.5 秒`,
  },
  {
    id: 'mine', char: '雷', pinyin: 'léi', plain: 'lei',
    word: '打雷', soundsLike: '累泪磊蕾擂', emoji: '🌩️',
    name: '小地雷', max: 5,
    lesson: '雷：打雷的雷。踩到地雷轰隆隆！',
    desc: (l) => `每 2.8 秒在身后布雷（最多 ${4 + l} 枚），踩中爆炸 ${20 + 8 * l} 伤害`,
  },
];

export const WEAPON_MAX = 5;

/** 武器卡与字卡混合抽取：30% 概率把最后一张换成武器卡 */
export function drawMixedCards(ps, drawThreeCards) {
  const cards = drawThreeCards(ps.skillLevels);
  if (Math.random() < 0.3) {
    const owned = Object.keys(ps.weapons || {}).filter((k) => k !== 'bolt');
    const newWeapon = WEAPONS.find((w) => !owned.includes(w.id));
    if (newWeapon) {
      cards[2] = {
        id: 'w_' + newWeapon.id,
        char: newWeapon.char,
        pinyin: newWeapon.pinyin,
        plain: newWeapon.plain,
        word: newWeapon.word,
        soundsLike: newWeapon.soundsLike,
        emoji: newWeapon.emoji,
        name: newWeapon.name,
        max: WEAPON_MAX,
        isWeapon: true,
        weaponId: newWeapon.id,
        lesson: newWeapon.lesson,
        desc: () => `解锁新武器：` + newWeapon.desc(1),
        apply: (p) => {
          p.weapons = p.weapons || {};
          p.weapons[newWeapon.id] = (p.weapons[newWeapon.id] || 0) + 1;
        },
      };
    } else if (owned.length) {
      const wid = owned[Math.floor(Math.random() * owned.length)];
      const w = WEAPONS.find((x) => x.id === wid);
      const lvl = ps.weapons[wid];
      if (lvl < WEAPON_MAX) {
        cards[2] = {
          id: 'w_' + wid,
          char: w.char,
          pinyin: w.pinyin,
          plain: w.plain,
          emoji: w.emoji,
          name: w.name,
          max: WEAPON_MAX,
          isWeapon: true,
          weaponId: wid,
          lesson: w.lesson,
          desc: () => `武器升级：` + w.desc(lvl + 1),
          apply: (p) => {
            p.weapons[wid] += 1;
          },
        };
      }
    }
  }
  return cards;
}
