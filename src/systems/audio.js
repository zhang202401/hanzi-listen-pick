/**
 * 程序化音效（Web Audio 合成，零素材依赖）。
 * AudioContext 在首次用户交互时创建（浏览器自动播放策略）。
 */
let ctx = null;
let master = null;
let volume = 0.8;
let muted = false;
try {
  muted = localStorage.getItem('hanzi-survivors-muted') === '1';
  volume = Number(localStorage.getItem('hanzi-survivors-volume') ?? 0.8) || 0.8;
} catch (e) { /* ignore */ }

export function ensureAudio() {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : volume;
      master.connect(ctx.destination);
      // R26 环境音：低频氛围垫底（音量极低，营造沉浸感）
      startAmbient();
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) { /* ignore */ }
}

function startAmbient() {
  try {
    const ambGain = ctx.createGain();
    ambGain.gain.value = 0.018;
    const o1 = ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = 55;
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = 82.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.008;
    lfo.connect(lfoGain).connect(ambGain.gain);
    o1.connect(ambGain);
    o2.connect(ambGain);
    ambGain.connect(master);
    o1.start();
    o2.start();
    lfo.start();
  } catch (e) { /* ignore */ }
}

export function setVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  if (master) master.gain.value = muted ? 0 : volume;
  try {
    localStorage.setItem('hanzi-survivors-volume', String(volume));
  } catch (e) { /* ignore */ }
}

export function getVolume() {
  return volume;
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : volume;
  try {
    localStorage.setItem('hanzi-survivors-muted', muted ? '1' : '0');
  } catch (e) { /* ignore */ }
  return muted;
}

function tone({ f = 440, d = 0.1, type = 'sine', v = 0.15, slide = 0, delay = 0, detune = 0 }) {
  if (muted || !ctx || !master) return;
  try {
    // 音高微随机：避免重复射击音的机械感
    const jitter = detune ? f * (1 + (Math.random() * 2 - 1) * detune) : f;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(jitter, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, jitter + slide), t0 + d);
    gain.gain.setValueAtTime(v, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    osc.connect(gain).connect(master);
    osc.start(t0);
    osc.stop(t0 + d + 0.02);
  } catch (e) { /* ignore */ }
}

export const sfx = {
  shoot:  () => tone({ f: 720, d: 0.05, type: 'triangle', v: 0.035, slide: -200, detune: 0.12 }),
  hit:    () => tone({ f: 320, d: 0.06, type: 'square', v: 0.045, slide: -120, detune: 0.1 }),
  kill:   () => tone({ f: 480, d: 0.12, type: 'square', v: 0.075, slide: -300, detune: 0.08 }),
  gem:    () => tone({ f: 980, d: 0.07, type: 'sine', v: 0.06, slide: 240 }),
  hurt:   () => tone({ f: 180, d: 0.18, type: 'sawtooth', v: 0.12, slide: -80 }),
  levelup: () => {
    tone({ f: 523, d: 0.1, v: 0.1 });
    tone({ f: 659, d: 0.1, v: 0.1, delay: 0.09 });
    tone({ f: 784, d: 0.16, v: 0.1, delay: 0.18 });
  },
  correct: () => {
    tone({ f: 660, d: 0.09, v: 0.1 });
    tone({ f: 880, d: 0.14, v: 0.1, delay: 0.08 });
  },
  wrong:   () => tone({ f: 220, d: 0.22, type: 'sawtooth', v: 0.1, slide: -60 }),
  boss:    () => {
    tone({ f: 110, d: 0.5, type: 'sawtooth', v: 0.16, slide: -40 });
    tone({ f: 165, d: 0.5, type: 'square', v: 0.08, delay: 0.1 });
  },
  shieldBreak: () => {
    tone({ f: 880, d: 0.2, type: 'square', v: 0.12, slide: -500 });
    tone({ f: 440, d: 0.3, type: 'sine', v: 0.12, slide: -200, delay: 0.05 });
  },
  heal:    () => tone({ f: 520, d: 0.2, type: 'sine', v: 0.09, slide: 260 }),
};

export const audio = {
  ensure: ensureAudio,
  get muted() {
    return muted;
  },
  toggle() {
    return toggleMute();
  },
  setVolume,
  getVolume: () => volume,
};
