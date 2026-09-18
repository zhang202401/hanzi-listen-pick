/**
 * 语音系统（浏览器内置，零成本零素材）—— 只用 TTS，不用麦克风：
 * - speak(): Web Speech TTS，中文朗读题目/鼓励语
 * - 全部交互都是"听音选字"：游戏读、小朋友点，不需要语音识别和麦克风权限
 */
let enabled = true;
try {
  enabled = localStorage.getItem('hanzi-survivors-voice') !== '0';
} catch (e) { /* ignore */ }

// Chrome TTS GC bug：utterance 被回收会导致 onend 永不触发，模块级持有引用
let currentUtterance = null;

// ================= 中文音色优选 =================
// 不同设备默认音色差异很大（Windows 默认偏机械、Edge 自带晓晓等神经网络音很自然）。
// 策略：按音色名评分选最自然的中文语音；家长也可在设置里手动挑选（持久化）。
let cachedVoices = [];
let userVoiceName = null;
try {
  userVoiceName = localStorage.getItem('hanzi-survivors-tts-voice') || null;
} catch (e) { /* ignore */ }

/** 音色自然度评分（越高越好；非中文返回 -1） */
function scoreVoice(v) {
  if (!v || !/^(zh|cmn|yue)/i.test(v.lang)) return -1;
  const n = (v.name || '').toLowerCase();
  let s = 10;
  if (/zh[-_]cn|zh-cn|cmn-hans/i.test(v.lang)) s += 30; // 大陆普通话优先于港台腔
  else if (/^zh|cmn/i.test(v.lang)) s += 8;
  if (n.includes('natural') || n.includes('neural')) s += 80; // Edge/Azure 神经网络音（最自然）
  if (/xiaoxiao|晓晓/.test(n)) s += 50;
  if (/xiaoyi|晓伊|yunxi|云希|yunyang|云扬|yunjian|云健|yunye|云野|xiaoshuang|晓双/.test(n)) s += 40;
  if (/xiaohan|晓涵|xiaomo|晓墨|xiaomeng|晓梦|xiaoxuan|晓萱|xiaorui|晓睿|yunze|云泽/.test(n)) s += 40;
  if (n.includes('google')) s += 45; // Chrome 联网普通话（自然度不错）
  if (/tingting|婷婷|meijia|美佳/.test(n)) s += 15; // macOS/常规本地音
  if (v.localService) s += 4; // 本地音不依赖网络，稍稳
  return s;
}

function refreshVoices() {
  if (!('speechSynthesis' in window)) return;
  const list = window.speechSynthesis.getVoices() || [];
  if (list.length) cachedVoices = list;
}

/** 按自然度排序的中文音色列表（设置面板用） */
export function zhVoices() {
  refreshVoices();
  return [...cachedVoices]
    .filter((v) => /^(zh|cmn|yue)/i.test(v.lang))
    .sort((a, b) => scoreVoice(b) - scoreVoice(a));
}

function pickVoice() {
  refreshVoices();
  if (!cachedVoices.length) return null;
  if (userVoiceName) {
    const chosen = cachedVoices.find((v) => v.name === userVoiceName);
    if (chosen && /^(zh|cmn|yue)/i.test(chosen.lang)) return chosen;
  }
  // 自动模式：取评分最高的中文音色
  let best = null;
  let bestScore = -1;
  for (const v of cachedVoices) {
    const s = scoreVoice(v);
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }
  return bestScore >= 0 ? best : null;
}

// 音色列表是异步加载的：监听变化事件持续刷新
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = refreshVoices;
}

export const voice = {
  get enabled() {
    return enabled;
  },
  toggle() {
    enabled = !enabled;
    if (!enabled) this.stop();
    try {
      localStorage.setItem('hanzi-survivors-voice', enabled ? '1' : '0');
    } catch (e) { /* ignore */ }
    return enabled;
  },
  supported() {
    return 'speechSynthesis' in window;
  },
  /** 家长设置：手动选择音色（传 null 恢复自动优选） */
  setVoiceName(name) {
    userVoiceName = name;
    try {
      if (name) localStorage.setItem('hanzi-survivors-tts-voice', name);
      else localStorage.removeItem('hanzi-survivors-tts-voice');
    } catch (e) { /* ignore */ }
  },
  getVoiceName() {
    return userVoiceName;
  },
  /** 当前实际生效的音色名（显示用） */
  activeVoiceName() {
    const v = pickVoice();
    return v ? v.name : '（系统默认）';
  },
  stop() {
    try {
      window.speechSynthesis?.cancel();
    } catch (e) { /* ignore */ }
  },
  /**
   * 朗读文本；开关关闭或环境不支持时静默跳过。
   * opts.onEnd：朗读结束回调。
   * 兼容处理：
   *  - Chrome 有名的 bug：utterance 无引用会被 GC，onend 永不触发 → 模块级持有引用
   *  - 再加超时兜底：无论 onend/onerror 是否触发，超时后必调 onEnd
   */
  speak(text, { rate = 0.92, onEnd } = {}) {
    if (!enabled || !text || !('speechSynthesis' in window)) {
      if (onEnd) setTimeout(onEnd, 120);
      return;
    }
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN';
      const v = pickVoice();
      if (v) {
        u.voice = v;
        u.lang = v.lang;
      }
      u.rate = rate; // 幼儿听语速稍慢；不变调（pitch 改动会明显降自然度）
      u.pitch = 1;

      if (onEnd) {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          clearTimeout(this._ttsGuard);
          if (currentUtterance === u) currentUtterance = null;
          try { onEnd(); } catch (e) { /* ignore */ }
        };
        u.onend = finish;
        u.onerror = finish;
        // 超时兜底：按字数估算朗读时长（语速0.92约330ms/字），上浮 2.5 秒
        const estimate = Math.max(2500, text.length * 500 + 2000);
        this._ttsGuard = setTimeout(finish, estimate);
        currentUtterance = u; // 防 GC（Chrome onend 不触发的根因）
      }
      window.speechSynthesis.cancel(); // 打断上一条，避免排队堆积
      window.speechSynthesis.speak(u);
    } catch (e) {
      if (onEnd) setTimeout(onEnd, 120);
    }
  },
};
