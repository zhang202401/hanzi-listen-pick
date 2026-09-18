const KEY = 'hanzi-survivors-tutorial-done';

/** 家长引导（首次进入显示一次） */
export function maybeShowTutorial(onDone) {
  let done = false;
  try {
    done = localStorage.getItem(KEY) === '1';
  } catch (e) { /* ignore */ }
  if (done) {
    onDone && onDone();
    return;
  }

  const root = document.getElementById('overlay');
  root.innerHTML = '';
  root.style.display = 'flex';

  const panel = document.createElement('div');
  panel.className = 'report-panel';
  panel.innerHTML = `
    <div class="report-title">家长须知</div>
    <div class="tut-step"><b>🕹 移动</b><span>手机：按住屏幕拖动 · 电脑：WASD / 方向键 · Shift 冲刺<br>小怪兽自动攻击，孩子专注走位躲避</span></div>
    <div class="tut-step"><b>🔊 听音选字</b><span>每 2 次升级出现一次：语音读字，孩子点字听音、再点确认</span></div>
    <div class="tut-step"><b>👆 点卡升级</b><span>升级时出现 3 张汉字卡片，点一张即可升级（键盘 1 / 2 / 3 也行）</span></div>
    <div class="tut-step"><b>🛡 Boss 识字护盾</b><span>语音读字，操控角色跑到正确的字上撞碎护盾</span></div>
    <div class="tut-step"><b>🌐 浏览器要求</b><span>朗读用浏览器内置语音（可离线）· 全程不需要麦克风</span></div>
  `;

  const go = document.createElement('button');
  go.className = 'rp-btn primary';
  go.textContent = '开始认字 ▶';
  go.addEventListener('click', () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch (e) { /* ignore */ }
    root.style.display = 'none';
    root.innerHTML = '';
    onDone && onDone();
  });
  panel.appendChild(go);
  root.appendChild(panel);
}

export function resetTutorial() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) { /* ignore */ }
}
