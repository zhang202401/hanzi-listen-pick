import { VIEWPORT } from '../config.js';

/**
 * 自适应视口系统：竖屏手机 / 横屏平板 / 桌面窗口统一适配
 *
 * 策略：相机 zoom 让"可见世界范围"落在 [MIN, MAX] 之间——
 *   短边受限决定 zoom 下限（保证至少看到最小可玩区域），
 *   超宽屏时 zoom 抬高（防止看得太远，敌人从屏幕外突袭）。
 *
 * 用法：GameScene 里调用 applyResponsiveCamera(scene)，
 * 之后每当 scale 发生 resize，自动重排 hud（传入 onResize 回调）。
 */
export function applyResponsiveCamera(scene, onResize) {
  const camera = scene.cameras.main;

  const relayout = () => {
    const { width, height } = scene.scale.gameSize;
    camera.setZoom(computeZoom(width, height));
    // 摄像机跟随玩家（roundPixels 防抖动）
    camera.startFollow(scene.player, true, 0.12, 0.12);
    if (onResize) onResize(width, height);
  };

  scene.scale.on(Phaser.Scenes.Events.RESIZE, relayout);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
    scene.scale.off(Phaser.Scenes.Events.RESIZE, relayout)
  );
  relayout();
}

function computeZoom(w, h) {
  // 至少看到 MIN_W × MIN_H
  let zoom = Math.min(w / VIEWPORT.MIN_W, h / VIEWPORT.MIN_H);
  // 至多看到 MAX_W × MAX_H
  zoom = Math.max(zoom, Math.max(w / VIEWPORT.MAX_W, h / VIEWPORT.MAX_H));
  return zoom;
}
