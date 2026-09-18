import Phaser from 'phaser';
import { COLORS, FONT } from '../config.js';
import { drawThreeCards } from '../data/skills.js';
import { drawMixedCards } from '../data/weapons.js';
import FloatingJoystick from '../systems/joystick.js';
import { audio, ensureAudio, sfx } from '../systems/audio.js';

const IS_TOUCH = /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent) || 'ontouchstart' in window;

/**
 * UI 场景：独立于游戏相机（zoom=1，纯屏幕坐标）。
 * HUD、虚拟摇杆、升级卡片、Boss 血条、低血量红晕、静音按钮。
 * 答题与诊断报告为 DOM 浮层（index.html #overlay）。
 */
export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    const { width, height } = this.scale.gameSize;
    const pad = 14;
    // 场景重启复位浮层引用：旧容器已随 shutdown 销毁，残留真值引用会
    // 让"选卡期间禁暂停"与卡死看门狗误判（以为界面还开着）
    this.levelUpUI = null;
    this.pauseOverlay = null;
    this._cardMic = null;
    this._cardHeard = null;
    this._cardKeyBinds = [];
    // R19 安全区：触屏设备（刘海屏）HUD 整体下移
    this.topPad = IS_TOUCH ? 22 : 0;
    const top = 7 + this.topPad;

    // 经验条（顶部通栏）
    this.xpBg = this.add.rectangle(width / 2, top, width - 2 * pad, 8, 0x1e293b, 0.9);
    this.xpFill = this.add.rectangle(pad + 1, top, 10, 6, 0xfbbf24).setOrigin(0, 0.5);

    // Boss 血条（经验条下方，有 Boss 时显示）
    this.bossBg = this.add.rectangle(width / 2, top + 17, Math.min(420, width - 60), 10, 0x2a0a12, 0.9).setStrokeStyle(1, 0xef4444, 0.6).setVisible(false);
    this.bossFill = this.add.rectangle(0, top + 17, 10, 6, 0xef4444).setOrigin(0, 0.5).setVisible(false);
    this.bossName = this.add.text(width / 2, top + 31, '', { fontFamily: FONT, fontSize: '11px', color: '#ef4444' }).setOrigin(0.5).setVisible(false);

    // HP 条（左上）
    this.hpBg = this.add.rectangle(pad + 100, top + 16, 200, 18, 0x1e293b, 0.85).setStrokeStyle(1, 0x475569);
    this.hpFill = this.add.rectangle(pad + 1, top + 16, 198, 14, COLORS.hp).setOrigin(0, 0.5);
    this.hpText = this.add
      .text(pad + 100, top + 16, '100/100', { fontFamily: FONT, fontSize: '12px', color: COLORS.uiText })
      .setOrigin(0.5);

    // 击杀/护盾（HP 右侧）
    this.killText = this.add
      .text(pad + 210, top + 16, '👾 0', { fontFamily: FONT, fontSize: '14px', color: COLORS.uiDim })
      .setOrigin(0, 0.5);

    // R24 连击显示
    this.comboText = this.add
      .text(pad + 290, top + 16, '', { fontFamily: FONT, fontSize: '14px', color: '#fbbf24' })
      .setOrigin(0, 0.5);

    // 等级 + 时间（右上）
    this.levelText = this.add
      .text(width - pad, top, 'Lv.1', { fontFamily: FONT, fontSize: '20px', color: COLORS.accent })
      .setOrigin(1, 0);
    this.timeText = this.add
      .text(width - pad, top + 26, '00:00', { fontFamily: FONT, fontSize: '16px', color: COLORS.uiDim })
      .setOrigin(1, 0);

    // 静音按钮（血条下方，避免小屏与血条/击杀数重叠）
    this.muteBtn = this.add
      .text(pad + 2, top + 32, audio.muted ? '🔇' : '🔊', { fontSize: '18px' })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        const m = audio.toggle();
        this.muteBtn.setText(m ? '🔇' : '🔊');
      });

    // 暂停按钮（右上，等级下方；手机必备）
    this.pauseBtn = this.add
      .text(width - pad, pad + 50, '⏸', { fontSize: '20px' })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.togglePauseOverlay());

    // 冲刺按钮（右下，手机必备；桌面 Shift/空格）
    this.dashBtn = this.add
      .text(width - pad - 6, height - 86, '💨', { fontSize: '30px', color: '#22d3ee' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.doDash());
    this.dashCdText = this.add
      .text(width - pad - 6, height - 56, '', { fontFamily: FONT, fontSize: '11px', color: COLORS.uiDim })
      .setOrigin(0.5);

    // R16 按钮按压反馈：统一缩放脉冲
    const pressFx = (btn) => {
      btn.on('pointerdown', () => {
        const s = btn.scale;
        btn.setScale(s * 0.85);
        this.tweens.add({ targets: btn, scale: s, duration: 180, ease: 'Back.Out' });
      });
    };
    pressFx(this.muteBtn);
    pressFx(this.pauseBtn);
    pressFx(this.dashBtn);

    // 暂停浮层（隐藏备用）
    this.pauseOverlay = null;

    // 低血量红晕
    this.vignette = this.add.rectangle(width / 2, height / 2, width, height, 0xef4444, 0).setDepth(90);
    // R4 受击红闪层
    this.hurtRect = this.add.rectangle(width / 2, height / 2, width, height, 0xff3333, 0).setDepth(95);

    // 操作提示
    const isTouch = this.sys.game.device.input.touch;
    this.hint = this.add
      .text(width / 2, height - 12, isTouch ? '按住屏幕拖动移动 · 躲避敌人' : 'WASD / 方向键 移动 · 躲避敌人', {
        fontFamily: FONT,
        fontSize: '14px',
        color: COLORS.uiDim,
      })
      .setOrigin(0.5, 1);

    this.levelUpUI = null;
    this._lastW = width;
    this._lastH = height;

    // 虚拟摇杆（触屏 + 桌面键盘统一输入）
    this.joystick = new FloatingJoystick(this);

    // 首次交互解锁音频（浏览器自动播放策略）+ 桌面 ESC 暂停 + Shift/空格冲刺
    this.input.once('pointerdown', ensureAudio);
    this.input.keyboard.once('keydown', ensureAudio);
    this.input.keyboard.on('keydown-ESC', () => this.togglePauseOverlay());
    const dashKey = () => {
      const game = this.scene.get('Game');
      const vec = this.joystick ? this.joystick.getVector() : { x: 0, y: 0 };
      const move = vec.x || vec.y ? vec : { x: 1, y: 0 };
      if (game) game.tryDash(move);
    };
    this.input.keyboard.on('keydown-SHIFT', dashKey);
    this.input.keyboard.on('keydown-SPACE', dashKey);

    this.scale.on(Phaser.Scenes.Events.RESIZE, this.relayout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.scale.off(Phaser.Scenes.Events.RESIZE, this.relayout, this)
    );
  }

  relayout() {
    const { width, height } = this.scale.gameSize;
    const pad = 14;
    const top = 7 + this.topPad;
    this.xpBg.setPosition(width / 2, top);
    this.xpBg.setSize(width - 2 * pad, 8);
    this.xpFill.setPosition(pad + 1, top);
    this.bossBg.setPosition(width / 2, top + 17);
    this.bossBg.setSize(Math.min(420, width - 60), 10);
    this.bossFill.y = top + 17;
    this.bossName.setPosition(width / 2, top + 31);
    this.hpBg.setPosition(pad + 100, top + 16);
    this.hpFill.setPosition(pad + 1, top + 16);
    this.hpText.setPosition(pad + 100, top + 16);
    this.killText.setPosition(pad + 210, top + 16);
    this.comboText.setPosition(pad + 290, top + 16);
    this.muteBtn.setPosition(pad + 2, top + 32);
    this.pauseBtn.setPosition(width - pad, top + 43);
    this.dashBtn.setPosition(width - pad - 6, height - 86);
    this.dashCdText.setPosition(width - pad - 6, height - 56);
    this.levelText.setPosition(width - pad, top);
    this.timeText.setPosition(width - pad, top + 26);
    this.vignette.setPosition(width / 2, height / 2);
    this.vignette.setSize(width, height);
    this.hurtRect.setPosition(width / 2, height / 2);
    this.hurtRect.setSize(width, height);
    this.hint.setPosition(width / 2, height - 12);
    this.relayoutLevelUpUI();
  }

  doDash() {
    const game = this.scene.get('Game');
    if (!game || !game.playerState || game.playerState.dead) return;
    const vec = game.player.body.velocity.clone();
    const move = vec.length() > 10
      ? { x: vec.x, y: vec.y }
      : (this.joystick ? this.joystick.getVector() : { x: 1, y: 0 });
    game.tryDash(move);
  }

  /** R4 受击红闪 */
  flashHurt() {
    this.hurtRect.setFillStyle(0xff3333, 0.28).setAlpha(1);
    this.tweens.add({ targets: this.hurtRect, alpha: 0, duration: 260, ease: 'Quad.Out' });
  }

  /** R40 成就 toast：顶部滑入 2.5 秒 */
  showAchievementToast(name, desc) {
    const { width } = this.scale.gameSize;
    const txt = this.add
      .text(width / 2, -40, `🏆 成就解锁：${name} —— ${desc}`, {
        fontFamily: FONT,
        fontSize: '16px',
        color: '#fbbf24',
        backgroundColor: '#0a0e1add',
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5, 0)
      .setDepth(300);
    this.tweens.add({ targets: txt, y: 64, duration: 400, ease: 'Back.Out' });
    this.tweens.add({
      targets: txt,
      y: -50,
      delay: 2400,
      duration: 300,
      onComplete: () => txt.destroy(),
    });
  }

  togglePauseOverlay() {
    const game = this.scene.get('Game');
    if (!game || !game.playerState || game.playerState.dead) return;
    // 升级选卡期间禁止暂停：暂停/恢复会与选卡的冻结/恢复互相错位导致假死
    if (this.levelUpUI) return;

    if (this.pauseOverlay) {
      // 恢复
      this.pauseOverlay.destroy();
      this.pauseOverlay = null;
      game.togglePause();
      return;
    }

    const paused = game.togglePause();
    if (!paused) return;

    const { width, height } = this.scale.gameSize;
    const dim = this.add.rectangle(width / 2, height / 2, width, height, 0x0a0e1a, 0.75);
    const title = this.add
      .text(width / 2, height / 2 - 60, '⏸ 暂停', {
        fontFamily: FONT, fontSize: '40px', color: COLORS.accent,
      })
      .setOrigin(0.5);
    const tip = this.add
      .text(width / 2, height / 2 + 10, '战况已冻结，喘口气', {
        fontFamily: FONT, fontSize: '15px', color: COLORS.uiDim,
      })
      .setOrigin(0.5);
    const btn = this.add
      .text(width / 2, height / 2 + 80, '▶ 继续', {
        fontFamily: FONT, fontSize: '26px', color: '#0a0e1a',
        backgroundColor: COLORS.accent, padding: { x: 30, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.togglePauseOverlay());

    this.pauseOverlay = this.add.container(0, 0, [dim, title, tip, btn]);
  }

  // ---------- 升级选卡：全部点卡片手选（无麦克风/喊字环节） ----------
  buildLevelUpCards(playerState) {
    return drawMixedCards(playerState, drawThreeCards);
  }

  showLevelUp(cards, onPick) {
    const { width, height } = this.scale.gameSize;
    const ps = this.scene.get('Game').playerState;
    const dim = this.add.rectangle(width / 2, height / 2, width, height, 0x0a0e1a, 0.82);
    // 响应式缩放：手机竖屏/矮屏整体缩小卡片和底栏，保证不超出屏幕
    const BW = 250, BH = 200, GAP = 18;
    // 竖屏堆叠仅在“窄且足够高”时使用：矮横屏改用横向排布（568×320 等场景）
    const vertical = width < 620 && height >= 500;
    const stackH = vertical ? 3 * BH + 2 * GAP : BH;
    const stackW = vertical ? BW : 3 * BW + 2 * GAP;
    const k = Math.max(0.45, Math.min(1, (height - 150) / (stackH + 120), (width - 28) / (stackW + 24)));
    const cy = height / 2 - 12;
    const stackTop = cy - (stackH * k) / 2;
    const stackBottom = cy + (stackH * k) / 2;
    const title = this.add
      .text(width / 2, stackTop - 30 * k - 8, '⬆ 升级！点卡片升级', {
        fontFamily: FONT,
        fontSize: '30px',
        color: '#fbbf24',
        stroke: '#78350f',
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    const cardW = BW * k, cardH = BH * k, gap = GAP * k;
    const startX = vertical ? width / 2 : width / 2 - (cardW * 3 + gap * 2) / 2 + cardW / 2;
    const startY = vertical ? stackTop + cardH / 2 : cy - 10;

    const nodes = cards.map((card, i) => {
      const cx = vertical ? width / 2 : startX + i * (cardW + gap);
      const cy = vertical ? startY + i * (cardH + gap) : startY;
      const lvl = ps.skillLevels[card.id] || 0;
      const willMax = lvl + 1 === card.max;
      const borderColor = willMax ? 0xfbbf24 : 0x38bdf8;

      const g = this.add.graphics();
      g.fillStyle(0x111a2e, 0.97);
      g.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 16 * k);
      g.lineStyle(willMax ? 4 : 2, borderColor, 0.95);
      g.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 16 * k);

      // 巨大汉字（认知主体，居左）
      const hanzi = this.add
        .text(cx - cardW * 0.24, cy - cardH * 0.10, card.char, {
          fontFamily: FONT,
          fontSize: Math.round(76 * k) + 'px',
          fontStyle: 'bold',
          color: '#ffe9a3',
          stroke: '#78350f',
          strokeThickness: 3,
        })
        .setOrigin(0.5);

      // 图样托盘（居右）：白底圆角 + 对应图样；缺图回退 emoji
      const tileX = cx + cardW * 0.24;
      const tileY = cy - cardH * 0.10;
      const tray = this.add.graphics();
      tray.fillStyle(0xf6f8fc, 1);
      tray.fillRoundedRect(tileX - 46 * k, tileY - 46 * k, 92 * k, 92 * k, 14 * k);
      const texKey = 'card_' + card.id;
      const art = this.textures.exists(texKey)
        ? this.add.image(tileX, tileY, texKey).setDisplaySize(84 * k, 84 * k)
        : this.add.text(tileX, tileY, card.emoji || '', { fontSize: Math.round(44 * k) + 'px' }).setOrigin(0.5);

      const name = this.add
        .text(cx, cy + cardH * 0.21, `${card.name} ${willMax ? '✦MAX' : `${lvl + 1}/${card.max === Infinity ? '∞' : card.max}`}`, {
          fontFamily: FONT,
          fontSize: Math.round(17 * k) + 'px',
          color: '#' + borderColor.toString(16).padStart(6, '0'),
        })
        .setOrigin(0.5);
      const desc = this.add
        .text(cx, cy + cardH / 2 - 22 * k, card.desc(lvl), {
          fontFamily: FONT,
          fontSize: Math.round(12 * k) + 'px',
          color: COLORS.uiText,
          wordWrap: { width: cardW - 26 * k },
        })
        .setOrigin(0.5, 1);

      const children = [g, hanzi, tray, art, name, desc];

      // 卡片可点选（也支持键盘 1/2/3）
      const hit = this.add
        .rectangle(cx, cy, cardW, cardH, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          sfx.gem();
          this.pickCard(onPick, i);
        });
      children.push(hit);

      return this.add.container(0, 0, children);
    });

    // 卡片交错入场动画
    nodes.forEach((node, i) => {
      node.y = 26;
      node.alpha = 0;
      this.tweens.add({
        targets: node,
        y: 0,
        alpha: 1,
        duration: 340,
        delay: 90 + i * 80,
        ease: 'Back.Out',
      });
    });

    this.levelUpUI = this.add.container(0, 0, [dim, title, ...nodes]);
    this.levelUpUI.cards = cards;
    this.levelUpUI.onPick = onPick;

    // 手选模式：大字提示 + 1/2/3 键也可用
    this._cardMic = null;
    this._cardHeard = null;
    const tip = this.add
      .text(width / 2, Math.min(stackBottom + 44 * k, height - 40), '👆 点一张卡片升级！（键盘 1 / 2 / 3 也行）', {
        fontFamily: FONT, fontSize: Math.round(20 * k) + 'px', color: '#4ade80', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.levelUpUI.add(tip);
    this.unbindCardKeys();
    this.bindCardKeys(onPick);
  }

  /** 绑定键盘 1/2/3 选卡 */
  bindCardKeys(onPick) {
    this.unbindCardKeys();
    this._cardKeyBinds = ['ONE', 'TWO', 'THREE'].map((k, i) => {
      const h = () => this.pickCard(onPick, i);
      this.input.keyboard.on('keydown-' + k, h);
      return { evt: 'keydown-' + k, h };
    });
  }

  unbindCardKeys() {
    (this._cardKeyBinds || []).forEach(({ evt, h }) => this.input.keyboard.off(evt, h));
    this._cardKeyBinds = [];
  }

  pickCard(onPick, index = 0) {
    if (!this.levelUpUI) return;
    const card = this.levelUpUI.cards[index];
    if (!card) return;
    this.unbindCardKeys();
    this._cardMic = null;
    this._cardHeard = null;
    this.levelUpUI.destroy();
    this.levelUpUI = null;
    onPick(card);
  }

  relayoutLevelUpUI() {
    if (!this.levelUpUI) return;
    const { cards, onPick } = this.levelUpUI;
    this._cardMic = null;
    this._cardHeard = null;
    this.levelUpUI.destroy();
    this.levelUpUI = null;
    this.showLevelUp(cards, onPick);
  }

  restart() {
    this.scene.get('Game').scene.restart();
  }

  update() {
    // 尺寸变化时重排
    const { width, height } = this.scale.gameSize;
    if (width !== this._lastW || height !== this._lastH) {
      this._lastW = width;
      this._lastH = height;
      this.relayout();
    }

    const game = this.scene.get('Game');
    if (!game || !game.playerState) return;

    const ps = game.playerState;
    this.hpText.setText(`${Math.max(0, Math.ceil(ps.hp))}/${ps.maxHp}`);
    const ratio = Phaser.Math.Clamp(ps.hp / ps.maxHp, 0, 1);
    // R27 经验条平滑渐变（xp/xpNeed 非有限值时按 0 处理，防止 NaN 宽度把条画没）
    const xpRaw = ps.xpNeed > 0 ? ps.xp / ps.xpNeed : 0;
    const xpRatio = Number.isFinite(xpRaw) ? Phaser.Math.Clamp(xpRaw, 0, 1) : 0;
    this._xpShow = Phaser.Math.Linear(Number.isFinite(this._xpShow) ? this._xpShow : 0, xpRatio, 0.22);
    const xpW = (this.xpBg.width - 2) * this._xpShow;
    this.xpFill.width = Number.isFinite(xpW) ? Math.max(xpW, 3) : 3;
    this.killText.setText(ps.shieldMax > 0 ? `👾 ${ps.kills}  🛡 ${ps.shield}/${ps.shieldMax}` : `👾 ${ps.kills}`);
    this.comboText.setText(game.combo >= 5 && game.comboTimer > 0 ? `🔥 连击 ×${game.combo}` : '');
    // 连击文字动态定位：窄屏移到 HUD 第二行居中，宽屏跟随击杀数右侧
    if (width < 480) {
      this.comboText.x = width / 2 - this.comboText.width / 2;
      this.comboText.y = top + 34;
    } else {
      this.comboText.y = top + 16;
      this.comboText.x = Math.min(this.killText.x + this.killText.width + 10, width - this.comboText.width - 6);
    }
    this.levelText.setText(`Lv.${ps.level}`);

    const t = Math.floor(game.elapsedMs / 1000);
    this.timeText.setText(
      `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
    );

    // R17 血条平滑渐变（显示值追赶真实值）
    const safeRatio = Number.isFinite(ratio) ? ratio : 0;
    this._hpShow = Phaser.Math.Linear(Number.isFinite(this._hpShow) ? this._hpShow : 1, safeRatio, 0.18);
    const hpW = 198 * this._hpShow;
    this.hpFill.width = Number.isFinite(hpW) ? Math.max(hpW, 2) : 2;

    // Boss 血条：白色残影条（显示受击前血量）+ 红色实条快速跟随
    const boss = game.boss;
    if (boss && boss.active) {
      this.bossBg.setVisible(true);
      this.bossFill.setVisible(true);
      this.bossName.setVisible(true);
      const bw = this.bossBg.width - 2;
      const target = Phaser.Math.Clamp(boss.hp / boss.maxHp, 0, 1);
      this._bossShow = Phaser.Math.Linear(this._bossShow ?? target, target, 0.12);
      if (!this.bossGhost) {
        this.bossGhost = this.add.rectangle(0, this.bossBg.y, 10, 6, 0xffffff, 0.6).setOrigin(0, 0.5).setVisible(false);
      }
      this.bossGhost.setVisible(true);
      this.bossGhost.setPosition(this.bossBg.x - this.bossBg.width / 2 + 1, this.bossBg.y);
      this.bossGhost.width = Math.max(bw * this._bossShow, 3);
      this.bossFill.setPosition(this.bossBg.x - this.bossBg.width / 2 + 1, this.bossBg.y);
      this.bossFill.width = Math.max(bw * target, 3);
      this.bossName.setText(boss.kind === 'dice' ? '生字大王' : boss.kind === 'sine' ? '拼音魔像' : '笔画巨人');
    } else {
      this.bossBg.setVisible(false);
      this.bossFill.setVisible(false);
      this.bossName.setVisible(false);
      if (this.bossGhost) this.bossGhost.setVisible(false);
      this._bossShow = null;
    }

    // 冲刺冷却显示
    const cd = game.dashCd || 0;
    this.dashCdText.setText(cd > 0 ? (cd / 1000).toFixed(1) + 's' : 'READY');
    this.dashCdText.setColor(cd > 0 ? COLORS.uiDim : '#4ade80');

    // 低血量红晕脉冲
    const hpRatio = ps.hp / ps.maxHp;
    if (!ps.dead && hpRatio < 0.3) {
      const pulse = 0.1 + 0.12 * (0.5 + 0.5 * Math.sin(this.time.now / 200));
      this.vignette.setFillStyle(0xef4444, pulse * (1 - hpRatio / 0.3));
    } else {
      this.vignette.setFillStyle(0xef4444, 0);
    }
  }
}
