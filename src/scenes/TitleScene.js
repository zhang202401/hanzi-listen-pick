import Phaser from 'phaser';
import { COLORS, FONT, WORLD } from '../config.js';
import { getProfile } from '../systems/profile.js';
import { showSettings } from '../systems/settings.js';
import { voice } from '../systems/voice.js';

/** 标题场景：小朋友看到的是大大的标题和一个大大的开始按钮 */
export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setBackgroundColor(WORLD.BACKGROUND);

    const cx = width / 2;
    const cy = height / 2;

    // 星星氛围
    this.stars = this.add.particles(0, 0, 'particle', {
      quantity: 50,
      frequency: 220,
      lifespan: 8000,
      speedY: { min: 6, max: 22 },
      x: { min: 0, max: width },
      y: -10,
      scale: { min: 0.15, max: 0.6 },
      alpha: { start: 0.55, end: 0 },
      tint: [0xfbbf24, COLORS.player, 0xf472b6],
      blendMode: 'ADD',
    });

    // 主标题（字号随屏宽缩放：小手机不超宽）
    const titleSize = Math.min(68, Math.round(width * 0.185));
    this.title = this.add
      .text(cx, cy - 110, '汉字幸存者', {
        fontFamily: FONT,
        fontSize: titleSize + 'px',
        fontStyle: 'bold',
        color: '#ffe9a3',
        stroke: '#fbbf24',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    if (this.title.postFX) this.title.postFX.addGlow(0xfbbf24, 6, 0, false);

    this.add
      .text(cx, cy - 44, '听一听 · 点一点 · 认汉字', {
        fontFamily: FONT,
        fontSize: '24px',
        color: COLORS.uiDim,
      })
      .setOrigin(0.5);

    // 学习进度
    const prof = getProfile();
    if (prof.totalAnswered > 0) {
      const acc = Math.round((prof.totalCorrect / prof.totalAnswered) * 100);
      this.add
        .text(cx, cy + 8, `已经答对 ${prof.totalCorrect} 题 · 正确率 ${acc}%`, {
          fontFamily: FONT,
          fontSize: '16px',
          color: COLORS.uiDim,
        })
        .setOrigin(0.5);
    }

    // 开始按钮（大大的）
    this.btn = this.add
      .text(cx, cy + 100, '▶ 开始认字', {
        fontFamily: FONT,
        fontSize: '34px',
        fontStyle: 'bold',
        color: '#0a0e1a',
        backgroundColor: '#fbbf24',
        padding: { x: 40, y: 18 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startGame());

    this.tweens.add({
      targets: this.btn,
      scale: { from: 1, to: 1.06 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // 家长入口
    this.add
      .text(width - 16, 16, '⚙ 家长设置', {
        fontFamily: FONT,
        fontSize: '15px',
        color: COLORS.uiDim,
        backgroundColor: '#16203a88',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => showSettings());

    this.add
      .text(16, 16, '🔊 听音选字 · 无需麦克风', {
        fontFamily: FONT,
        fontSize: '13px',
        color: COLORS.uiDim,
      })
      .setOrigin(0, 0);

    this.input.keyboard.once('keydown-ENTER', () => this.startGame());

    // 首次点击解锁音频/TTS（浏览器手势要求）
    this.input.once('pointerdown', () => voice.speak('准备好了吗？'));
    this.scale.on(Phaser.Scenes.Events.RESIZE, () => this.scene.restart());
  }

  startGame() {
    this.tweens.add({ targets: this.cameras.main, zoom: 1.06, duration: 320, ease: 'Sine.In' });
    this.cameras.main.fadeOut(320, 10, 14, 26);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Game');
    });
  }
}
