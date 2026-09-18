import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';

(async () => {
  // 部分内嵌 WebView 会抑制 requestAnimationFrame（页面可见也不回调）。
  // 探测 300ms，RAF 不工作则退回 setTimeout 驱动游戏循环。
  const rafWorks = await new Promise((resolve) => {
    let fired = false;
    requestAnimationFrame(() => {
      fired = true;
      resolve(true);
    });
    setTimeout(() => resolve(fired), 300);
  });

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#0a0e1a',
    render: {
      antialias: true,
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    physics: {
      default: 'arcade',
      arcade: { debug: false },
    },
    input: {
      activePointers: 2,
    },
    fps: rafWorks ? {} : { forceSetTimeOut: true },
    scene: [BootScene, TitleScene, GameScene, UIScene],
  });

  // 游戏包已就绪：移除 index.html 里的"加载中"占位层（fixed 定位会盖住画布）
  document.getElementById('loading-hint')?.remove();

  // 自动化测试句柄
  window.__game = game;

  // 本地错误兜底日志（便于家长/开发者排查）
  window.addEventListener('error', (e) => {
    try {
      const log = JSON.parse(localStorage.getItem('hanzi-survivors-errors') || '[]');
      log.push({ t: Date.now(), msg: String(e.message).slice(0, 200), src: (e.filename || '').split('/').pop() });
      localStorage.setItem('hanzi-survivors-errors', JSON.stringify(log.slice(-20)));
    } catch (err) { /* ignore */ }
  });

  // PWA 离线支持（生产环境注册；本地 dev 不注册避免缓存干扰调试）
  if (!import.meta.env?.DEV) {
    navigator.serviceWorker?.register('./sw.js').catch(() => {});
  }
})();
