import Phaser from 'phaser';

/**
 * 浮动虚拟摇杆 + 键盘双输入。
 * - 触屏/鼠标：按下处出现半透明底座圆环，拖拽方向以半透明箭头指示，松手消失
 * - 桌面：WASD / 方向键
 * 统一通过 getVector() 返回归一化移动向量。
 */
export default class FloatingJoystick {
  /** @param {Phaser.Scene} uiScene 挂在 UIScene（屏幕坐标层） */
  constructor(uiScene) {
    this.scene = uiScene;
    this.radius = 58;
    this.touchVec = new Phaser.Math.Vector2();
    this.origin = new Phaser.Math.Vector2();
    this.activePointerId = null;

    // 拖拽指示：底座圆环 + 半透明方向箭头（尾部对准起点，旋转指向拖拽方向）
    this.base = uiScene.add.image(0, 0, 'joy-base').setDepth(200).setAlpha(0);
    this.arrow = uiScene.add.image(0, 0, 'arrow').setOrigin(0, 0.5).setDepth(201).setAlpha(0);

    const input = uiScene.input;

    input.on('pointerdown', (p) => {
      if (this.activePointerId !== null) return;
      this.activePointerId = p.id;
      this.origin.set(p.x, p.y);
      this.base.setPosition(p.x, p.y).setAlpha(0.35);
      this.arrow.setPosition(p.x, p.y).setRotation(0).setDisplaySize(12, 9).setAlpha(0);
    });

    input.on('pointermove', (p) => {
      if (p.id !== this.activePointerId || !p.isDown) return;
      const dx = p.x - this.origin.x;
      const dy = p.y - this.origin.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const clamped = Math.min(dist, this.radius);
      if (dist > 0) {
        this.touchVec.set((dx / dist) * (clamped / this.radius), (dy / dist) * (clamped / this.radius));
        // 半透明箭头：从按下起点指向拖拽方向，长度随拖拽距离伸缩
        this.arrow
          .setPosition(this.origin.x, this.origin.y)
          .setRotation(Math.atan2(dy, dx))
          .setDisplaySize(Phaser.Math.Clamp(dist + 30, 36, this.radius + 42), 30)
          .setAlpha(0.55);
      }
    });

    const release = (p) => {
      if (p.id !== this.activePointerId) return;
      this.activePointerId = null;
      this.touchVec.set(0, 0);
      this.base.setAlpha(0);
      this.arrow.setAlpha(0);
    };
    input.on('pointerup', release);
    input.on('pointerupoutside', release);
    input.on('gameout', () => {
      this.activePointerId = null;
      this.touchVec.set(0, 0);
      this.base.setAlpha(0);
      this.arrow.setAlpha(0);
    });

    this.keys = uiScene.input.keyboard.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT');
    this.keyVec = new Phaser.Math.Vector2();
  }

  /** 归一化移动向量（键盘优先级高于触屏，二者都无则零向量） */
  getVector() {
    const k = this.keys;
    let x = 0;
    let y = 0;
    if (k.A.isDown || k.LEFT.isDown) x -= 1;
    if (k.D.isDown || k.RIGHT.isDown) x += 1;
    if (k.W.isDown || k.UP.isDown) y -= 1;
    if (k.S.isDown || k.DOWN.isDown) y += 1;

    if (x !== 0 || y !== 0) {
      this.keyVec.set(x, y).normalize();
      return this.keyVec;
    }
    return this.touchVec;
  }
}
