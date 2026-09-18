import { audio } from './audio.js';
import { voice, zhVoices } from './voice.js';
import { isRestReminderOn, restIntervalMin, setRestIntervalMin, setRestReminderOn } from './playtime.js';

/** 休息提醒浮层：暂停游戏，引导孩子眺望远处 10 秒 */
export function showRestOverlay(onClose) {
  const root = document.getElementById('overlay');
  root.innerHTML = '';
  root.style.display = 'flex';

  const panel = document.createElement('div');
  panel.className = 'report-panel';
  panel.style.textAlign = 'center';
  panel.innerHTML = `
    <div class="report-title">🌿 休息一下眼睛吧</div>
    <div style="font-size:52px; margin: 10px 0;">👀🌲☁️</div>
    <div style="font-size:18px; line-height:1.8; color:#c4d2e8; margin-bottom: 6px">
      玩了好久啦！站起来，<br>看看窗外最远的地方，数 10 个数～
    </div>
  `;

  const eyeBtn = document.createElement('button');
  eyeBtn.className = 'rp-btn primary';
  eyeBtn.textContent = '👀 眺望远处 10 秒';
  let left = 10;
  let timer = null;
  const close = () => {
    if (timer) clearInterval(timer);
    root.style.display = 'none';
    root.innerHTML = '';
    onClose && onClose();
  };
  eyeBtn.addEventListener('click', () => {
    if (timer) return;
    timer = setInterval(() => {
      left -= 1;
      eyeBtn.textContent = `👀 眺望远处 ${left} 秒`;
      if (left <= 0) close();
    }, 1000);
    eyeBtn.textContent = '👀 眺望远处 10 秒';
  });

  const cont = document.createElement('button');
  cont.className = 'rp-btn';
  cont.textContent = '继续玩 ▶';
  cont.addEventListener('click', close);

  panel.appendChild(eyeBtn);
  panel.appendChild(cont);
  panel.insertAdjacentHTML('beforeend', `<div class="rp-advice" style="margin-top:12px">给家长：休息提醒可在家长设置调整或关闭</div>`);
  root.appendChild(panel);
  import('./voice.js').then((m) => m.voice.speak('玩了好久啦，休息一下眼睛，看看窗外最远的地方吧！'));
}

/** 读取性能模式（省电模式：敌量/粒子降档） */
export function isPerfMode() {
  try {
    return localStorage.getItem('hanzi-survivors-perf') === '1';
  } catch (e) {
    return false;
  }
}

/** 小主角颜色（孩子可在家长设置里换） */
export const SKINS = [
  { id: 'gold', name: '小金豆', tint: 0xfbbf24 },
  { id: 'cyan', name: '小蓝鲸', tint: 0x22d3ee },
  { id: 'violet', name: '小紫葡萄', tint: 0xa78bfa },
  { id: 'rose', name: '小桃子', tint: 0xf472b6 },
];

export function getSkin() {
  try {
    const id = localStorage.getItem('hanzi-survivors-skin');
    return SKINS.find((s) => s.id === id) || SKINS[0];
  } catch (e) {
    return SKINS[0];
  }
}

export function setSkin(id) {
  try {
    localStorage.setItem('hanzi-survivors-skin', id);
  } catch (e) { /* ignore */ }
}

/** 家长设置面板（DOM 浮层）：音量 / 语音朗读 / 性能模式 / 学字档案管理 */
export function showSettings(onClose) {
  const root = document.getElementById('overlay');
  root.innerHTML = '';
  root.style.display = 'flex';

  const panel = document.createElement('div');
  panel.className = 'report-panel';
  panel.innerHTML = `<div class="report-title">⚙ 家长设置</div>`;

  // 音量
  const volRow = document.createElement('div');
  volRow.className = 'set-row';
  volRow.innerHTML = `<span>🔊 音量</span>`;
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100';
  slider.value = String(Math.round(audio.getVolume() * 100));
  slider.addEventListener('input', () => {
    audio.ensure();
    audio.setVolume(Number(slider.value) / 100);
    if (audio.muted) audio.toggle();
  });
  volRow.appendChild(slider);
  panel.appendChild(volRow);

  // 语音朗读开关（题目朗读 + 选卡确认）
  const voiceBtn = document.createElement('button');
  voiceBtn.className = 'rp-btn';
  const renderVoice = () => (voiceBtn.textContent = voice.enabled ? '🗣 语音朗读：开' : '🗣 语音朗读：关');
  voiceBtn.addEventListener('click', () => {
    voice.toggle();
    renderVoice();
  });
  renderVoice();
  panel.appendChild(voiceBtn);

  // 音色选择：自动优选 + 手动挑选 + 试听（不同设备音色差异大，家长可试听后选定）
  const voiceRow = document.createElement('div');
  voiceRow.className = 'set-row';
  const vLabel = document.createElement('span');
  const buildVoiceOptions = () => {
    vLabel.innerHTML = `🗣 音色<br><small style="color:#64748b">当前：${voice.activeVoiceName()}</small>`;
  };
  buildVoiceOptions();
  const sel = document.createElement('select');
  sel.style.cssText = 'flex:1;min-height:40px;background:#16203a;color:#e2e8f0;border:1px solid #2a3a5e;border-radius:8px;font-family:inherit';
  const fillVoices = () => {
    sel.innerHTML = '';
    const auto = document.createElement('option');
    auto.value = '';
    auto.textContent = '自动（推荐·选最自然的）';
    sel.appendChild(auto);
    zhVoices().forEach((v) => {
      const o = document.createElement('option');
      o.value = v.name;
      o.textContent = v.name + (v.localService ? '（本机）' : '（在线）');
      sel.appendChild(o);
    });
    sel.value = voice.getVoiceName() || '';
  };
  fillVoices();
  // 音色列表异步加载，稍后再刷一次
  setTimeout(fillVoices, 600);
  setTimeout(fillVoices, 2000);
  sel.addEventListener('change', () => {
    voice.setVoiceName(sel.value || null);
    buildVoiceOptions();
    voice.speak('大家好，一起认字啦！');
  });
  const tryBtn = document.createElement('button');
  tryBtn.className = 'rp-btn';
  tryBtn.style.flex = '0 0 88px';
  tryBtn.style.marginTop = '0';
  tryBtn.textContent = '▶ 试听';
  tryBtn.addEventListener('click', () => voice.speak('你好呀！听音选字，一起认汉字。'));
  voiceRow.appendChild(vLabel);
  voiceRow.appendChild(sel);
  voiceRow.appendChild(tryBtn);
  panel.appendChild(voiceRow);
  const voiceTip = document.createElement('div');
  voiceTip.className = 'rp-advice';
  voiceTip.textContent = '想要更自然的声音：用 Edge 浏览器自带"晓晓"等在线音色最自然；Chrome 用"Google 普通话"；改完点"试听"对比。';
  panel.appendChild(voiceTip);

  // 性能模式
  const perfBtn = document.createElement('button');
  perfBtn.className = 'rp-btn';
  const renderPerf = () => (perfBtn.textContent = isPerfMode() ? '🏃 性能模式：开（旧手机建议）' : '🌿 画质优先：开');
  renderPerf();
  perfBtn.addEventListener('click', () => {
    try {
      localStorage.setItem('hanzi-survivors-perf', isPerfMode() ? '0' : '1');
    } catch (e) { /* ignore */ }
    renderPerf();
  });
  panel.appendChild(perfBtn);

  // 用眼健康：休息提醒开关 + 间隔时长
  const restBtn = document.createElement('button');
  restBtn.className = 'rp-btn';
  const renderRest = () => (restBtn.textContent = isRestReminderOn() ? '🌿 休息提醒：开' : '🌿 休息提醒：关');
  restBtn.addEventListener('click', () => {
    setRestReminderOn(!isRestReminderOn());
    renderRest();
  });
  renderRest();
  panel.appendChild(restBtn);

  const restRow = document.createElement('div');
  restRow.className = 'set-row';
  restRow.innerHTML = `<span>⏰ 提醒间隔</span>`;
  const restSel = document.createElement('select');
  restSel.style.cssText = 'flex:1;min-height:40px;background:#16203a;color:#e2e8f0;border:1px solid #2a3a5e;border-radius:8px;font-family:inherit';
  [10, 15, 20, 30].forEach((min) => {
    const o = document.createElement('option');
    o.value = String(min);
    o.textContent = `每 ${min} 分钟提醒一次`;
    restSel.appendChild(o);
  });
  restSel.value = String(restIntervalMin());
  restSel.addEventListener('change', () => setRestIntervalMin(Number(restSel.value)));
  restRow.appendChild(restSel);
  panel.appendChild(restRow);

  // 小主角颜色
  const skinRow = document.createElement('div');
  skinRow.className = 'set-row';
  skinRow.innerHTML = `<span>🎨 小主角</span>`;
  const skinBtns = [];
  SKINS.forEach((s) => {
    const b = document.createElement('button');
    b.className = 'rp-btn';
    b.style.minHeight = '40px';
    b.style.padding = '4px';
    b.textContent = s.name;
    const render = () => {
      const cur = getSkin();
      b.style.borderColor = cur.id === s.id ? '#' + s.tint.toString(16).padStart(6, '0') : '#2a3a5e';
      b.style.color = cur.id === s.id ? '#' + s.tint.toString(16).padStart(6, '0') : '#8ea2c0';
    };
    b.addEventListener('click', () => {
      setSkin(s.id);
      skinBtns.forEach(render);
    });
    render();
    skinBtns.push(b);
    skinRow.appendChild(b);
  });
  panel.appendChild(skinRow);

  const note = document.createElement('div');
  note.className = 'rp-advice';
  note.textContent = '全部玩法都是【听音选字】：游戏朗读、孩子点选，升级选卡直接点卡片，不需要麦克风和语音识别权限。';
  panel.appendChild(note);

  // 学字档案管理
  const dataRow = document.createElement('div');
  dataRow.className = 'rp-btns';
  const exportBtn = document.createElement('button');
  exportBtn.className = 'rp-btn';
  exportBtn.textContent = '📤 导出档案';
  exportBtn.addEventListener('click', () => {
    const raw = localStorage.getItem('hanzi-survivors-profile-v1') || '{}';
    const blob = new Blob([raw], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'hanzi-survivors-档案.json';
    a.click();
  });
  const resetBtn = document.createElement('button');
  resetBtn.className = 'rp-btn';
  resetBtn.textContent = '🗑 清空学字记录';
  resetBtn.addEventListener('click', () => {
    if (resetBtn.dataset.confirm) {
      try {
        localStorage.removeItem('hanzi-survivors-profile-v1');
        localStorage.removeItem('hanzi-survivors-tutorial-done');
      } catch (e) { /* ignore */ }
      resetBtn.textContent = '✔ 已清空';
    } else {
      resetBtn.dataset.confirm = '1';
      resetBtn.textContent = '⚠ 再点一次确认清空';
    }
  });
  dataRow.appendChild(exportBtn);
  dataRow.appendChild(resetBtn);
  panel.appendChild(dataRow);

  const close = document.createElement('button');
  close.className = 'rp-btn primary';
  close.textContent = '返回';
  close.addEventListener('click', () => {
    root.style.display = 'none';
    root.innerHTML = '';
    onClose && onClose();
  });
  panel.appendChild(close);

  root.appendChild(panel);
}
