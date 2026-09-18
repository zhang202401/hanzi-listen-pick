import Phaser from 'phaser';
import { COLORS, WORLD } from '../config.js';

/**
 * 程序化纹理工厂：零素材也能玩（色块占位）。
 * 用户手绘素材放入 public/assets/ 后，在 assets.js 里同名覆盖即可热替换。
 */
export function buildPlaceholderTextures(scene) {
  // 可平铺网格底纹：世界移动感的来源
  gridTexture(scene, 'grid', 128);
  // 发光圆（玩家/子弹/粒子通用底）：多层同心圆模拟辉光
  glowCircle(scene, 'glow-16', 16, COLORS.player);
  glowCircle(scene, 'glow-32', 32, COLORS.player);
  glowCircle(scene, 'bullet', 14, 0xffffff);
  glowCircle(scene, 'particle', 8, 0xffffff); // 白底，运行时 tint 上色

  // 玩家：青色发光核
  glowCircle(scene, 'player', 40, COLORS.player, 0.22);

  // 敌人：三种几何形（占位）+ 分裂兵（品红圆）+ 分裂后的小兵
  polygon(scene, 'enemy1', 30, 3, COLORS.enemy1); // 三角 追踪杂兵
  polygon(scene, 'enemy2', 22, 3, COLORS.enemy2); // 小三角 快速兵
  polygon(scene, 'enemy3', 44, 6, COLORS.enemy3); // 六边 肉盾兵
  polygon(scene, 'enemy4', 34, 8, COLORS.enemy4); // 圆 分裂兵（总体）
  polygon(scene, 'enemy5', 16, 8, 0xf472b6); // 小圆 分裂个体
  polygon(scene, 'enemy6', 26, 4, 0xfb7185); // 菱形 远程兵
  polygon(scene, 'enemy7', 28, 3, 0xdc2626); // 尖三角 冲锋怪
  polygon(scene, 'enemy8', 26, 12, 0xf97316); // 圆齿 自爆怪
  polygon(scene, 'enemy9', 32, 5, 0x8b5cf6); // 五边 召唤师
  glowCircle(scene, 'ebullet', 12, 0xef4444); // 敌方弹幕

  // 拟形敌人家族（霓虹剪影 + 白描边，与几何兵同风格）：
  carTexture(scene, 'enemy_car', 56, 30, 0x2dd4bf);      // 小汽车 青绿（冲锋）
  mechaTexture(scene, 'enemy_mecha', 52, 56, 0xe879f9);  // 机甲 紫红（远程射击）
  planeTexture(scene, 'enemy_plane', 54, 42, 0x818cf8);  // 飞机 靛蓝（蛇形飞行）
  bunnyTexture(scene, 'enemy_bunny', 40, 46, 0xf9a8d4);  // 小兔 粉（跳跃）
  birdTexture(scene, 'enemy_bird', 38, 28, 0x7dd3fc);    // 小鸟 天蓝（快速）
  turtleTexture(scene, 'enemy_turtle', 54, 36, 0x84cc16); // 小龟 草绿（慢速肉盾）

  // 掉落物：回复包 / 磁铁 / 宝箱
  capsuleTexture(scene, 'drop_heal', 22, 30, 0x4ade80);
  horseshoeTexture(scene, 'drop_magnet', 34, 0x22d3ee);
  chestTexture(scene, 'drop_chest', 34, 0xfbbf24);

  // 武器：环刃 + 榴弹 + 追踪弹
  bladeTexture(scene, 'whirl', 30, 0x4ade80);
  glowCircle(scene, 'grenade', 16, 0xf59e0b);
  dartTexture(scene, 'missile', 16, 7, 0xfb923c);

  // 经验球：绿色小菱形
  polygon(scene, 'xp', 14, 4, COLORS.xp);

  // 虚拟摇杆
  ringTexture(scene, 'joy-base', 96);
  glowCircle(scene, 'joy-stick', 40, COLORS.player, 0.3);

  // Boss 占位：大六边形（概率暴君·骰子）/ 大方形（统计巨像）
  polygon(scene, 'boss_dice', 96, 6, 0xa855f7);
  polygon(scene, 'boss_stats', 96, 4, 0xef4444);
  // R25 函数魔像：正弦波形纹理
  sineTexture(scene, 'boss_sine', 100, 60, 0x38bdf8);

  // Boss 护盾选项气泡（世界内跑撞答案用）
  bubbleTexture(scene, 'bubble', 180, 74);

  // 拖拽方向箭头（半透明，右向，尾部在原点便于旋转）
  arrowTexture(scene, 'arrow', 90, 36);

  // 星空氛围粒子用 particle 即可
}

/** 小汽车（顶视，车头朝右）：可见四轮 + 描边车身 + 浅色座舱 + 车头灯 */
function carTexture(scene, key, w, h, color) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0x334155, 1); // 车轮（四角，深灰蓝可见）
  g.fillRoundedRect(w * 0.13, 0, w * 0.22, h * 0.26, 2);
  g.fillRoundedRect(w * 0.13, h * 0.74, w * 0.22, h * 0.26, 2);
  g.fillRoundedRect(w * 0.58, 0, w * 0.22, h * 0.26, 2);
  g.fillRoundedRect(w * 0.58, h * 0.74, w * 0.22, h * 0.26, 2);
  g.fillStyle(color, 0.95); // 车身
  g.fillRoundedRect(2, h * 0.12, w - 6, h * 0.76, h * 0.28);
  g.lineStyle(2, 0xffffff, 0.6); // 白描边（与几何兵一致）
  g.strokeRoundedRect(2, h * 0.12, w - 6, h * 0.76, h * 0.28);
  g.fillStyle(0xe2e8f0, 0.9); // 座舱窗
  g.fillRoundedRect(w * 0.34, h * 0.24, w * 0.28, h * 0.52, 3);
  g.fillStyle(0xffffff, 0.95); // 车头灯
  g.fillCircle(w - 9, h * 0.3, 2.6);
  g.fillCircle(w - 9, h * 0.7, 2.6);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** 机甲头部（正面）：V 字天线角 + 方形头 + 发光独眼横条 + 深色下颚 */
function mechaTexture(scene, key, w, h, color) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(color, 0.9); // 天线角
  g.fillTriangle(w * 0.08, h * 0.32, w * 0.3, h * 0.04, w * 0.36, h * 0.3);
  g.fillTriangle(w * 0.92, h * 0.32, w * 0.7, h * 0.04, w * 0.64, h * 0.3);
  g.fillStyle(color, 0.95); // 头部
  g.fillRoundedRect(w * 0.16, h * 0.2, w * 0.68, h * 0.52, 6);
  g.fillStyle(0x0b1222, 0.9); // 下颚
  g.fillRoundedRect(w * 0.16, h * 0.68, w * 0.68, h * 0.16, 3);
  g.fillStyle(0xffffff, 0.95); // 独眼横条
  g.fillRoundedRect(w * 0.26, h * 0.38, w * 0.48, h * 0.13, 3);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** 喷气飞机（机头朝右）：上下后掠翼 + 尾翼 + 尖机身 + 座舱光点 */
function planeTexture(scene, key, w, h, color) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(color, 0.8); // 后掠翼
  g.fillTriangle(w * 0.32, h * 0.5, w * 0.52, 0, w * 0.68, h * 0.5);
  g.fillTriangle(w * 0.32, h * 0.5, w * 0.52, h, w * 0.68, h * 0.5);
  g.fillTriangle(2, h * 0.18, w * 0.22, h * 0.5, 2, h * 0.82); // 尾翼
  g.fillStyle(color, 0.97); // 机身
  g.fillPoints([
    { x: w - 2, y: h * 0.5 },
    { x: w * 0.55, y: h * 0.33 },
    { x: w * 0.18, y: h * 0.38 },
    { x: w * 0.18, y: h * 0.62 },
    { x: w * 0.55, y: h * 0.67 },
  ], true);
  g.fillStyle(0xffffff, 0.9); // 座舱
  g.fillCircle(w * 0.74, h * 0.5, 2.6);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** 小兔子（正面）：长耳朵（浅色内耳）+ 圆头 + 黑豆眼 */
function bunnyTexture(scene, key, w, h, color) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(color, 0.95); // 耳朵
  g.fillEllipse(w * 0.3, h * 0.26, w * 0.2, h * 0.5);
  g.fillEllipse(w * 0.7, h * 0.26, w * 0.2, h * 0.5);
  g.fillStyle(0xffffff, 0.7); // 内耳
  g.fillEllipse(w * 0.3, h * 0.28, w * 0.09, h * 0.32);
  g.fillEllipse(w * 0.7, h * 0.28, w * 0.09, h * 0.32);
  g.fillStyle(color, 0.97); // 头
  g.fillCircle(w / 2, h * 0.66, w * 0.34);
  g.fillStyle(0x0b1222, 0.9); // 眼睛
  g.fillCircle(w * 0.4, h * 0.6, 2);
  g.fillCircle(w * 0.6, h * 0.6, 2);
  g.fillStyle(0xffffff, 0.85); // 鼻子
  g.fillCircle(w / 2, h * 0.72, 1.6);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** 小鸟（朝右）：圆身 + 上扬翅膀 + 金色尖喙 + 尾羽 */
function birdTexture(scene, key, w, h, color) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(color, 0.85); // 翅膀
  g.fillTriangle(w * 0.26, h * 0.58, w * 0.6, 0, w * 0.64, h * 0.62);
  g.fillStyle(color, 0.97); // 身体
  g.fillEllipse(w * 0.48, h * 0.58, w * 0.6, h * 0.72);
  g.fillStyle(0xfbbf24, 0.95); // 喙
  g.fillTriangle(w * 0.74, h * 0.46, w * 0.98, h * 0.58, w * 0.74, h * 0.72);
  g.fillStyle(0x0b1222, 0.9); // 眼睛
  g.fillCircle(w * 0.64, h * 0.48, 1.8);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** 小乌龟（顶视，头朝右）：草绿壳 + 深色壳纹 + 四脚 + 探出的头 */
function turtleTexture(scene, key, w, h, color) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(color, 0.9); // 四脚
  g.fillEllipse(w * 0.24, h * 0.14, w * 0.18, h * 0.28);
  g.fillEllipse(w * 0.24, h * 0.86, w * 0.18, h * 0.28);
  g.fillEllipse(w * 0.6, h * 0.88, w * 0.16, h * 0.24);
  g.fillEllipse(w * 0.6, h * 0.12, w * 0.16, h * 0.24);
  g.fillStyle(color, 0.95); // 头
  g.fillEllipse(w * 0.86, h * 0.5, w * 0.2, h * 0.32);
  g.fillStyle(color, 0.97); // 壳
  g.fillEllipse(w * 0.46, h * 0.5, w * 0.62, h * 0.9);
  g.fillStyle(0x0b1222, 0.4); // 壳纹
  g.fillEllipse(w * 0.46, h * 0.5, w * 0.34, h * 0.5);
  g.fillStyle(0xffffff, 0.6); // 眼
  g.fillCircle(w * 0.92, h * 0.42, 1.4);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** 半透明箭头：指向右（0 弧度），尾巴在左端 */
function arrowTexture(scene, key, w, h) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const cy = h / 2;
  const shaftEnd = w * 0.62;
  const pts = [
    new Phaser.Math.Vector2(0, cy + 5),
    new Phaser.Math.Vector2(shaftEnd, cy + 5),
    new Phaser.Math.Vector2(shaftEnd, cy + h * 0.36),
    new Phaser.Math.Vector2(w - 2, cy),
    new Phaser.Math.Vector2(shaftEnd, cy - h * 0.36),
    new Phaser.Math.Vector2(shaftEnd, cy - 5),
    new Phaser.Math.Vector2(0, cy - 5),
  ];
  g.fillStyle(0x22d3ee, 0.32);
  g.fillPoints(pts, true);
  g.lineStyle(2, 0x67e8f9, 0.85);
  g.strokePoints(pts, true, true);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** 圆角矩形气泡（Boss 护盾答案选项底板） */
function bubbleTexture(scene, key, w, h) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0x111a2e, 0.92);
  g.fillRoundedRect(0, 0, w, h, 14);
  g.lineStyle(2, 0x22d3ee, 0.9);
  g.strokeRoundedRect(0, 0, w, h, 14);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** 追踪弹小镖：尖端朝右 */
function dartTexture(scene, key, w, h, color) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const pts = [
    new Phaser.Math.Vector2(w, h / 2),
    new Phaser.Math.Vector2(w * 0.4, 0),
    new Phaser.Math.Vector2(0, h * 0.28),
    new Phaser.Math.Vector2(0, h * 0.72),
    new Phaser.Math.Vector2(w * 0.4, h),
  ];
  g.fillStyle(color, 0.95);
  g.fillPoints(pts, true);
  g.fillStyle(0xffffff, 0.85);
  g.fillCircle(w * 0.28, h / 2, 2);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** 环刃：细长菱形刃片，尖端朝右 */
function bladeTexture(scene, key, size, color) {  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const pts = [
    new Phaser.Math.Vector2(size, size / 2),
    new Phaser.Math.Vector2(size * 0.55, size * 0.12),
    new Phaser.Math.Vector2(0, size / 2),
    new Phaser.Math.Vector2(size * 0.55, size * 0.88),
  ];
  g.fillStyle(color, 0.9);
  g.fillPoints(pts, true);
  g.lineStyle(2, 0xffffff, 0.7);
  g.strokePoints(pts, true, true);
  g.generateTexture(key, size, size);
  g.destroy();
}

/** 正弦波纹理（函数魔像 Boss） */
function sineTexture(scene, key, w, h, color) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.lineStyle(6, color, 0.95);
  g.beginPath();
  for (let x = 0; x <= w; x += 2) {
    const y = h / 2 + Math.sin((x / w) * Math.PI * 4) * (h / 2 - 6);
    if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.strokePath();
  g.lineStyle(3, 0xffffff, 0.5);
  g.beginPath();
  for (let x = 0; x <= w; x += 2) {
    const y = h / 2 - Math.sin((x / w) * Math.PI * 4) * (h / 2 - 10);
    if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.strokePath();
  g.generateTexture(key, w, h);
  g.destroy();
}

/** 胶囊（回复包） */
function capsuleTexture(scene, key, w, h, color) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(color, 0.95);
  g.fillRoundedRect(0, 0, w, h, w / 2);
  g.fillStyle(0xffffff, 0.9);
  g.fillRect(w / 2 - 1.5, h * 0.25, 3, h * 0.5);
  g.fillRect(w / 2 - w * 0.18, h / 2 - 1.5, w * 0.36, 3);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** 马蹄形磁铁 */
function horseshoeTexture(scene, key, size, color) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const r = size / 2;
  const thick = size * 0.3;
  g.lineStyle(thick, color, 1);
  g.beginPath();
  g.arc(r, r, r - thick / 2, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false);
  g.strokePath();
  g.fillStyle(0xffffff, 0.9);
  g.fillRect(0, r - thick / 2 - 2, thick, 5);
  g.fillRect(size - thick, r - thick / 2 - 2, thick, 5);
  g.generateTexture(key, size, size);
  g.destroy();
}

/** 宝箱（上盖+箱体+锁扣） */
function chestTexture(scene, key, size, color) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const w = size;
  const h = size * 0.78;
  const y0 = (size - h) / 2;
  g.fillStyle(color, 0.95);
  g.fillRoundedRect(1, y0 + h * 0.38, w - 2, h * 0.62, 4); // 箱体
  g.fillStyle(0xb45309, 1);
  g.fillRoundedRect(1, y0, w - 2, h * 0.42, 6); // 上盖
  g.fillStyle(0xffffff, 0.95);
  g.fillRect(w / 2 - 2.5, y0 + h * 0.3, 5, h * 0.34); // 锁扣
  g.generateTexture(key, size, size);
  g.destroy();
}

/** 多层同心圆 → 柔和辉光贴图 */
function glowCircle(scene, key, size, color, edgeAlpha = 0.16) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const r = size / 2;
  const steps = 6;
  for (let i = steps; i >= 1; i--) {
    const rr = (r * i) / steps;
    const alpha = edgeAlpha + (1 - i / steps) * 0.55;
    g.fillStyle(color, Math.min(alpha, 1));
    g.fillCircle(r, r, rr);
  }
  g.generateTexture(key, size, size);
  g.destroy();
}

/** 正多边形贴图（三角形/菱形/六边形敌人） */
function polygon(scene, key, size, sides, color) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const r = size / 2;
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = (Math.PI * 2 * i) / sides - Math.PI / 2;
    pts.push(new Phaser.Math.Vector2(r + r * Math.cos(a), r + r * Math.sin(a)));
  }
  g.fillStyle(color, 0.95);
  g.fillPoints(pts, true);
  g.lineStyle(2, 0xffffff, 0.5);
  g.strokePoints(pts, true, true);
  g.generateTexture(key, size, size);
  g.destroy();
}

/** 空心圆环（摇杆底座） */
function ringTexture(scene, key, size) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.lineStyle(3, COLORS.player, 0.35);
  g.strokeCircle(size / 2, size / 2, size / 2 - 2);
  g.generateTexture(key, size, size);
  g.destroy();
}

/** 可平铺网格底纹：暗色底 + 微亮网格线 */
function gridTexture(scene, key, cell) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(WORLD.BACKGROUND, 1);
  g.fillRect(0, 0, cell, cell);
  g.lineStyle(1, WORLD.GRID_COLOR, 1);
  g.strokeRect(0, 0, cell, cell);
  g.generateTexture(key, cell, cell);
  g.destroy();
}
