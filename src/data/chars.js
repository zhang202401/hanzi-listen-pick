/**
 * 识字课程库（幼儿园基础字，按由易到难排序）。
 * - 生字池随游戏等级从前向后扩大 → "从 0 开始"的进阶路线
 * - 每个字：拼音（含/不含声调）、例词、emoji、字形记忆提示
 * - 技能卡上的 25 个字全部在课程内 → 点卡升级 = 认字复习
 */
export const CHARS = [
  { char: '人', pinyin: 'rén', plain: 'ren', word: '大人', emoji: '🧑', hint: '一撇一捺就是人' },
  { char: '大', pinyin: 'dà', plain: 'da', word: '大象', emoji: '🐘', hint: '人张开手臂就是大' },
  { char: '小', pinyin: 'xiǎo', plain: 'xiao', word: '小鸟', emoji: '🐤', hint: '两个小钩子中间一竖' },
  { char: '山', pinyin: 'shān', plain: 'shan', word: '大山', emoji: '⛰️', hint: '三座山峰连在一起' },
  { char: '水', pinyin: 'shuǐ', plain: 'shui', word: '喝水', emoji: '💧', hint: '弯弯的水流' },
  { char: '火', pinyin: 'huǒ', plain: 'huo', word: '大火', emoji: '🔥', hint: '火苗噼里啪啦' },
  { char: '日', pinyin: 'rì', plain: 'ri', word: '日出', emoji: '☀️', hint: '太阳圆圆的写成长方块' },
  { char: '月', pinyin: 'yuè', plain: 'yue', word: '月亮', emoji: '🌙', hint: '弯弯的月牙有两个脚' },
  { char: '木', pinyin: 'mù', plain: 'mu', word: '木头', emoji: '🌳', hint: '一棵小树，上有枝下有根' },
  { char: '土', pinyin: 'tǔ', plain: 'tu', word: '泥土', emoji: '🟫', hint: '地面上的小土堆' },
  { char: '天', pinyin: 'tiān', plain: 'tian', word: '白天', emoji: '🌤️', hint: '大字头上加一横', kin: '大', kinNote: '大字头上加一横就是天' },
  { char: '上', pinyin: 'shàng', plain: 'shang', word: '上面', emoji: '⬆️', hint: '一横上面加一小竖' },
  { char: '下', pinyin: 'xià', plain: 'xia', word: '下面', emoji: '⬇️', hint: '一横下面加一小竖' },
  { char: '口', pinyin: 'kǒu', plain: 'kou', word: '大口', emoji: '👄', hint: '方方块块就是口' },
  { char: '中', pinyin: 'zhōng', plain: 'zhong', word: '中间', emoji: '🎯', hint: '口字中间穿一根棍', kin: '口', kinNote: '口字中间穿一根棍' },
  { char: '风', pinyin: 'fēng', plain: 'feng', word: '大风', emoji: '🌬️', hint: '几字里装着小风叉' },
  { char: '地', pinyin: 'dì', plain: 'di', word: '大地', emoji: '🌍', hint: '土字旁加也，就是大地', kin: '土', kinNote: '土字旁加也' },
  { char: '白', pinyin: 'bái', plain: 'bai', word: '白云', emoji: '⚪', hint: '日字头上加一撇', kin: '日', kinNote: '日字头上加一撇就是白' },
  { char: '石', pinyin: 'shí', plain: 'shi', word: '石头', emoji: '🪨', hint: '一口咬住悬崖上的石头', kin: '口', kinNote: '一口咬住悬崖上的石头' },
  { char: '田', pinyin: 'tián', plain: 'tian', word: '田地', emoji: '🌾', hint: '方块里四块小田地' },
  { char: '金', pinyin: 'jīn', plain: 'jin', word: '金色', emoji: '🥇', hint: '小屋下藏着两粒金子' },
  { char: '心', pinyin: 'xīn', plain: 'xin', word: '爱心', emoji: '❤️', hint: '三颗星围着月亮❤' },
  { char: '星', pinyin: 'xīng', plain: 'xing', word: '星星', emoji: '⭐', hint: '日字生出一颗小星星', kin: '日', kinNote: '日字头上生出一颗星' },
  { char: '云', pinyin: 'yún', plain: 'yun', word: '白云', emoji: '☁️', hint: '二加个云朵钩' },
  { char: '雨', pinyin: 'yǔ', plain: 'yu', word: '下雨', emoji: '🌧️', hint: '云朵下面掉雨点' },
  { char: '电', pinyin: 'diàn', plain: 'dian', word: '闪电', emoji: '⚡', hint: '日字拖出电尾巴', kin: '日', kinNote: '日字拖出电尾巴' },
  { char: '光', pinyin: 'guāng', plain: 'guang', word: '月光', emoji: '💡', hint: '小太阳下面两条光腿' },
  { char: '手', pinyin: 'shǒu', plain: 'shou', word: '小手', emoji: '✋', hint: '五根手指弯一弯' },
  { char: '目', pinyin: 'mù', plain: 'mu', word: '目光', emoji: '👁️', hint: '眼睛里画了两条睫毛', kin: '日', kinNote: '跟日很像，里面多一横' },
  { char: '足', pinyin: 'zú', plain: 'zu', word: '足球', emoji: '⚽', hint: '上面是口，下面是脚', kin: '口', kinNote: '上面是口，下面是脚' },
  { char: '耳', pinyin: 'ěr', plain: 'er', word: '耳朵', emoji: '👂', hint: '左边耳朵右边耳朵' },
  { char: '鸟', pinyin: 'niǎo', plain: 'niao', word: '小鸟', emoji: '🐦', hint: '小鸟头上有个小点' },
  { char: '鱼', pinyin: 'yú', plain: 'yu', word: '大鱼', emoji: '🐟', hint: '鱼头鱼身加鱼尾巴' },
  { char: '虫', pinyin: 'chóng', plain: 'chong', word: '小虫', emoji: '🐛', hint: '中字加个小提和点' },
  { char: '马', pinyin: 'mǎ', plain: 'ma', word: '大马', emoji: '🐴', hint: '马儿昂头迈开腿' },
  { char: '牛', pinyin: 'niú', plain: 'niu', word: '黄牛', emoji: '🐮', hint: '小牛头上两只角' },
  { char: '羊', pinyin: 'yáng', plain: 'yang', word: '小羊', emoji: '🐑', hint: '小羊头上有两只弯角' },
  { char: '飞', pinyin: 'fēi', plain: 'fei', word: '飞机', emoji: '✈️', hint: '小鸟展开翅膀飞' },
  { char: '走', pinyin: 'zǒu', plain: 'zou', word: '走路', emoji: '🚶', hint: '土字下面迈开腿', kin: '土', kinNote: '土字下面迈开腿' },
  { char: '车', pinyin: 'chē', plain: 'che', word: '汽车', emoji: '🚗', hint: '一竖穿过的车厢' },
  { char: '球', pinyin: 'qiú', plain: 'qiu', word: '皮球', emoji: '🏀', hint: '王的旁边一只圆皮球' },
  { char: '花', pinyin: 'huā', plain: 'hua', word: '花朵', emoji: '🌸', hint: '草字头开着两朵花' },
  { char: '草', pinyin: 'cǎo', plain: 'cao', word: '小草', emoji: '🌿', hint: '草字头下面早早早' },
  { char: '米', pinyin: 'mǐ', plain: 'mi', word: '大米', emoji: '🍚', hint: '米字像稻穗四面开' },
  { char: '瓜', pinyin: 'guā', plain: 'gua', word: '西瓜', emoji: '🍉', hint: '瓜藤下挂着一个瓜' },
  { char: '果', pinyin: 'guǒ', plain: 'guo', word: '苹果', emoji: '🍎', hint: '田字上面长果树', kin: '田', kinNote: '田字上面长果子' },
  { char: '书', pinyin: 'shū', plain: 'shu', word: '书本', emoji: '📖', hint: '一叠纸用竖线串起来' },
  { char: '门', pinyin: 'mén', plain: 'men', word: '大门', emoji: '🚪', hint: '两扇门板立起来' },
  { char: '炸', pinyin: 'zhà', plain: 'zha', word: '炸弹', emoji: '💣', hint: '火字旁，砰的一声炸' },
  { char: '箭', pinyin: 'jiàn', plain: 'jian', word: '火箭', emoji: '🚀', hint: '竹字头，前字在下面飞' },
  { char: '蛇', pinyin: 'shé', plain: 'she', word: '小蛇', emoji: '🐍', hint: '虫字旁，弯弯曲曲爬' },
  { char: '冰', pinyin: 'bīng', plain: 'bing', word: '冰块', emoji: '🧊', hint: '两点水，冻得冰冰凉' },
  { char: '雷', pinyin: 'léi', plain: 'lei', word: '打雷', emoji: '🌩️', hint: '雨字头，田里轰隆隆', kin: '田', kinNote: '雨字头下面藏着田' },
  { char: '回', pinyin: 'huí', plain: 'hui', word: '回家', emoji: '🏠', hint: '大口套小口，回字围一圈', kin: '口', kinNote: '大口套小口' },
  { char: '我', pinyin: 'wǒ', plain: 'wo', word: '我们', emoji: '🙋', hint: '手拿小钩是我' },
  { char: '你', pinyin: 'nǐ', plain: 'ni', word: '你好', emoji: '🤝', hint: '人字旁加尔，就是你' },
  { char: '好', pinyin: 'hǎo', plain: 'hao', word: '好人', emoji: '👍', hint: '女子在一起就是好' },
  { char: '妈', pinyin: 'mā', plain: 'ma', word: '妈妈', emoji: '👩', hint: '女字旁加马，是妈妈' },
  { char: '爸', pinyin: 'bà', plain: 'ba', word: '爸爸', emoji: '👨', hint: '父字下面加巴巴' },
];

export const CHAR_MAP = new Map(CHARS.map((c) => [c.char, c]));

/** 生字池大小：等级越高学的字越多（从 0 开始，开局 6 个基础字） */
export function poolSizeForLevel(level) {
  return Math.min(CHARS.length, 6 + Math.floor(level * 0.8));
}

/** 当前生字池（前 N 个字） */
export function activePool(level) {
  return CHARS.slice(0, poolSizeForLevel(level));
}

/**
 * 组一道识字题：语音读字 → 从 4 个字里选出正确的。
 * target 从生字池选；干扰项从同池随机。
 */
export function buildQuiz(level, target) {
  const pool = activePool(level);
  const t = target || pool[Math.floor(Math.random() * pool.length)];
  const others = pool.filter((c) => c.char !== t.char);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const opts = [t, ...others.slice(0, 3)];
  // 洗牌并记录正确位置
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  const ans = opts.findIndex((c) => c.char === t.char);
  // 字族联想："记一个字等于记一串字"（如 星=日+生）
  const kinText = t.kin ? `它和【${t.kin}】是一家人：${t.kinNote}。` : '';
  return {
    char: t.char,
    pinyin: t.pinyin,
    plain: t.plain,
    word: t.word,
    emoji: t.emoji,
    hint: t.hint,
    opts: opts.map((c) => c.char),
    ans,
    // 语音播报文本：例词帮助理解（"哪个是「大」？大象的大。"）
    speak: `哪个是${t.char}字？${t.word}的${t.char}。`,
    // 答错教学文案（含字族联想）
    exp: `正确答案是【${t.char}】，${t.word}的${t.char}。${t.hint}。${kinText}`,
  };
}
