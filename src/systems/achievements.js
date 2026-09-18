import { getProfile } from './profile.js';

/**
 * 成就系统（R37-R40）：基于学习档案与战斗事件的里程碑。
 * check(event, data) 在关键节点调用；达成即持久化并返回成就对象（供 toast）。
 */
const DEFINITIONS = [
  { id: 'first_blood', name: '初次狩猎', desc: '完成第一局', test: (e, d, p) => e === 'run_end' },
  { id: 'kill_100', name: '百人斩', desc: '单局击杀 100', test: (e, d) => e === 'kills' && d >= 100 },
  { id: 'kill_300', name: '三百人斩', desc: '单局击杀 300', test: (e, d) => e === 'kills' && d >= 300 },
  { id: 'combo_30', name: '连击大师', desc: '单局连击 ×30', test: (e, d) => e === 'combo' && d >= 30 },
  { id: 'level_15', name: '成长线', desc: '单局达到 Lv.15', test: (e, d) => e === 'level' && d >= 15 },
  { id: 'boss_slayer', name: '屠龙者', desc: '单局击破 Boss', test: (e, d) => e === 'boss' && d >= 1 },
  { id: 'victory', name: '幸存者', desc: '达成 10 分钟生存胜利', test: (e, d) => e === 'victory' },
  { id: 'quiz_10', name: '十题小测', desc: '单局答题 10 道', test: (e, d) => e === 'quiz_total' && d >= 10 },
  { id: 'quiz_ace', name: '满分学员', desc: '单局答对 5 题及以上', test: (e, d, p) => e === 'quiz_ok' && d >= 5 },
  { id: 'endless_2', name: '无尽行者', desc: '无尽模式坚持 2 分钟', test: (e, d) => e === 'endless_min' && d >= 2 },
  { id: 'weapon_3', name: '军火商', desc: '同时拥有 3 种武器', test: (e, d) => e === 'weapons' && d >= 3 },
  { id: 'evolve_any', name: '质变时刻', desc: '首次技能满级进化', test: (e) => e === 'evolve' },
];

export function checkAchievement(event, data) {
  const p = getProfile();
  p.achievements = p.achievements || {};
  const unlocked = [];
  for (const def of DEFINITIONS) {
    if (!p.achievements[def.id] && def.test(event, data, p)) {
      p.achievements[def.id] = { at: Date.now() };
      unlocked.push(def);
    }
  }
  if (unlocked.length) {
    try {
      localStorage.setItem('hanzi-survivors-profile-v1', JSON.stringify(p));
    } catch (e) { /* ignore */ }
  }
  return unlocked;
}

export function achievementList() {
  const p = getProfile();
  return DEFINITIONS.map((d) => ({ ...d, done: !!(p.achievements || {})[d.id] }));
}
