import Phaser from 'phaser';
import { PLAYER, ENEMY, SPAWN, CONTACT, COLORS, WEAPON, GEM, XP, DROPS, ELITE, RUN, EBULLET } from '../config.js';
import { applyResponsiveCamera } from '../systems/viewport.js';
import { waveAt, bossTriggered } from '../data/waves.js';
import { pickQuizChar, buildShieldQuiz, recordCharAnswer, addSession } from '../systems/profile.js';
import { showQuiz } from '../systems/quiz.js';
import { drawMixedCards } from '../data/weapons.js';
import { showReport } from '../systems/report.js';
import { sfx } from '../systems/audio.js';
import { maybeShowTutorial } from '../systems/tutorial.js';
import { isPerfMode, getSkin, showRestOverlay } from '../systems/settings.js';
import { addPlayTime, getPlayTime, resetPlayTime, isRestReminderOn, restIntervalMin } from '../systems/playtime.js';
import { checkAchievement } from '../systems/achievements.js';
import { voice } from '../systems/voice.js';

const IS_TOUCH = /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent) || 'ontouchstart' in window;
const PARTICLE_SCALE = (isPerfMode() ? 0.5 : 1) * (IS_TOUCH ? 0.7 : 1);
const BASE_CAP_MUL = (isPerfMode() ? 0.65 : 1) * (IS_TOUCH ? 0.8 : 1);
const pastMinRaw = (t) => Math.max(0, (t - RUN.victorySec) / 60); // 无尽模式经过的分钟数

/**
 * 游戏主场景：世界层（波次/敌人/Boss护盾/自动攻击/答题升级/特效）。
 * HUD、摇杆、升级卡片在 UIScene；答题与诊断报告为 DOM 浮层。
 */
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    // Phaser 的 Arcade World 实例跨 restart 复用且 shutdown 不重置 isPaused/timeScale：
    // 死亡结算时 world.pause() 残留会让新一局开场就全场冻结，必须在此强制复位
    this.physics.world.isPaused = false;
    this.physics.world.timeScale = 1;
    this.tweens.timeScale = 1;

    this.elapsedMs = 0;
    this.spawnCooldown = 800;
    this.fireCooldown = 200;
    // 武器计时器（场景级，weaponTick 使用）
    this.whirlAngle = 0;
    this.chainTimer = 2200;
    this.grenadeTimer = 2400;
    this.laserTimer = 1200;
    this.missileTimer = 1800;
    this.clusterTimer = 2000;
    this.sineTimer = 1400;
    this.boomerTimer = 2600;
    this.frostTimer = 3800;
    this.mineTimer = 2400;
    this.volleyTimer = 0;
    this.novaTimer = 0;
    this.pendingLevelUps = 0;
    this.choosing = false;
    this.restOverlayOpen = false; // 休息浮层状态随开局复位
    this._levelUpCount = 0; // 升级计数：驱动听音选字（每2次升级1次）的节奏
    this.bossFired = new Set();
    this.boss = null;
    this.bossKills = 0;
    this.bossTimer = 0;
    this.hitStopMs = 0; // 击杀顿帧剩余时间
    this.paused = false;
    this.victoryDone = false;
    this.combo = 0; // 连击数
    this.comboTimer = 0; // 连击衰减计时
    this.dashCd = 0; // 冲刺冷却
    this.dashUntil = 0; // 冲刺结束时间
    this.dashDir = new Phaser.Math.Vector2(1, 0);
    this.capMul = BASE_CAP_MUL; // R20 动态性能降档系数
    this._fpsN = 0;
    this._fpsT = 0;
    this.session = { correct: 0, total: 0, answers: [] };

    this.playerState = {
      hp: PLAYER.MAX_HP, maxHp: PLAYER.MAX_HP,
      level: 1, xp: 0, xpNeed: XP.baseNeed,
      dead: false, invincibleUntil: 0, kills: 0,
      critChance: 0, fireInterval: WEAPON.interval, pierce: 0, projectiles: 1,
      critMul: 2, volleyDbl: false, novaRange: 240,
      shieldMax: 0, shield: 0, shieldTimer: 0,
      volleyLvl: 0, novaLvl: 0, regen: 0,
      bonusDmg: 1, // 答对题的强化加成
      moveMul: 1, magnetMul: 1, armor: 0, xpMul: 1, dashCdMul: 1, // 足：冲刺冷却缩减
      weapons: {}, // 多武器构筑
      skillLevels: {},
    };

    this.setupWorld();
    this.setupPlayer();
    this.setupEnemies();
    this.setupBullets();
    this.setupGems();
    this.setupBubbles();
    applyResponsiveCamera(this);
    // R25 入场淡入
    this.cameras.main.fadeIn(420, 10, 14, 26);

    // R19 全屏 Bloom（桌面 WebGL 专属；触屏/降级环境自动跳过保帧率）
    this.isWebGL = this.game.renderer.type === Phaser.WEBGL;
    if (!IS_TOUCH && this.isWebGL && this.cameras.main.postFX) {
      this.cameras.main.postFX.addBloom(0xffffff, 1, 1, 1, 1.05, 4);
    }

    // R17 首局教程
    if (!this.__tutorialShown) {
      this.__tutorialShown = true;
      maybeShowTutorial();
    }

    if (this.scene.isActive('UIScene') || this.scene.isSleeping('UIScene')) {
      this.scene.stop('UIScene');
    }
    this.scene.launch('UIScene');

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.stop('UIScene');
      this.clearBubbles();
    });
  }

  // ---------- 场景搭建 ----------
  setupWorld() {
    const { width, height } = this.scale.gameSize;
    this.grid = this.add.tileSprite(0, 0, width, height, 'grid').setOrigin(0).setScrollFactor(0).setDepth(-10);

    // R22 漂浮数学符号氛围层
    this.symbols = [];
    const glyphs = ['π', 'Σ', '√', '%', '∞', '±', '≈', '÷', 'P(A)', 'x̄', 'S²', '|'];
    for (let i = 0; i < 12; i++) {
      const t = this.add
        .text(Math.random() * width, Math.random() * height, glyphs[i % glyphs.length], {
          fontFamily: 'Georgia, serif',
          fontSize: Phaser.Math.Between(16, 30) + 'px',
          color: '#3b527a',
        })
        .setAlpha(Phaser.Math.FloatBetween(0.16, 0.32))
        .setScrollFactor(0)
        .setDepth(-9);
      t.driftSpeed = Phaser.Math.FloatBetween(4, 12);
      this.symbols.push(t);
    }

    this.scale.on(Phaser.Scenes.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.scale.off(Phaser.Scenes.Events.RESIZE, this.onResize, this)
    );

    // R8 渐晕层：四周暗角聚焦中心（描环近似径向渐变）
    if (!this.textures.exists('vignette-radial')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const S = 512;
      const steps = 28;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        g.lineStyle(3, 0x000000, 0.012 + 0.30 * Math.pow(t, 2.2));
        g.strokeCircle(S / 2, S / 2, (S / 2) * t);
      }
      g.generateTexture('vignette-radial', S, S);
      g.destroy();
    }
    this.radial = this.add.image(width / 2, height / 2, 'vignette-radial')
      .setOrigin(0.5).setScrollFactor(0).setDepth(-8)
      .setDisplaySize(Math.max(width, height) * 1.05, Math.max(width, height) * 1.05);
  }

  updateSymbols(delta) {
    const cam = this.cameras.main;
    const view = cam.worldView;
    for (const s of this.symbols) {
      s.y += (s.driftSpeed * delta) / 1000;
      if (s.y > this.scale.gameSize.height + 40) {
        s.y = -40;
        s.x = Math.random() * this.scale.gameSize.width;
      }
    }
  }

  onResize() {
    this.grid.setSize(this.scale.gameSize.width, this.scale.gameSize.height);
    const { width, height } = this.scale.gameSize;
    if (this.radial) this.radial.setSize(Math.max(width, height) * 1.05).setPosition(width / 2, height / 2);
  }

  setupPlayer() {
    this.player = this.physics.add.image(0, 0, 'player').setDepth(5).setBlendMode(Phaser.BlendModes.ADD);
    this.player.body.setCircle(PLAYER.RADIUS, 4, 4);
    this.physics.world.setBounds(-4000, -4000, 8000, 8000);
    this.player.setCollideWorldBounds(true);

    // R45 皮肤 + R7 移动尾迹
    this.skinTint = getSkin().tint;
    this.player.setTint(this.skinTint);

    // 角色进化系统字段（必须在下方 applyEvolution 之前初始化）
    this._evoTier = 0;
    this._evoRing = null;
    this._evoOrbs = [];
    this.playerBaseScale = 1;

    this.trail = this.add.particles(0, 0, 'particle', {
      follow: this.player,
      frequency: 28,
      quantity: 1,
      lifespan: 320,
      speed: { min: 4, max: 14 },
      scale: { start: 0.65, end: 0 },
      alpha: { start: 0.55, end: 0 },
      tint: this.skinTint,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.trail.setDepth(4);

    // 初始形态（1 档小圆豆，静默应用）
    this.playerBaseScale = 1;
    this.applyEvolution(1, true);

    // 索敌锁定指示器：当前自动攻击目标（让"会开火"可见）
    this.lockon = this.add.circle(0, 0, 26, 0xffffff, 0).setStrokeStyle(2, 0xfbbf24, 0.9).setDepth(3).setVisible(false);
    this.lockonTarget = null;
  }

  /** 等级 → 进化档位：1 小圆豆 / 2 光环小豆 / 3 星环小豆 / 4 超级大豆 */
  evoTierForLevel(level) {
    if (level >= 30) return 4;
    if (level >= 20) return 3;
    if (level >= 10) return 2;
    return 1;
  }

  /** 应用进化档位：缩放、碰撞体、光环与环绕星豆的创建/销毁 */
  applyEvolution(tier, silent) {
    const base = 1 + (tier - 1) * 0.11;
    this._evoTier = tier;
    this.playerBaseScale = base;

    // 碰撞体同步缩放（贴图 40px，圆心居中：offset = 20 - r），封顶防难度失衡
    const r = Math.min(PLAYER.RADIUS * base, 22);
    this.player.body.setCircle(r, 20 - r, 20 - r);

    // 光环层（档位 ≥2）
    if (tier >= 2 && !this._evoRing) {
      this._evoRing = this.add.image(0, 0, 'joy-base')
        .setTint(this.skinTint).setAlpha(0.35).setDepth(4).setScale(base * 0.62);
    } else if (this._evoRing) {
      this._evoRing.setScale(base * 0.62).setAlpha(tier >= 2 ? 0.35 : 0);
      if (tier < 2) {
        this._evoRing.destroy();
        this._evoRing = null;
      }
    }

    // 环绕星豆（档位 3 → 1 颗，档位 4 → 2 颗）
    const orbCount = tier >= 4 ? 2 : tier >= 3 ? 1 : 0;
    while (this._evoOrbs.length < orbCount) {
      const orb = this.add.image(0, 0, 'joy-stick')
        .setTint(this.skinTint).setAlpha(0.9).setDepth(4).setScale(0.42);
      this._evoOrbs.push(orb);
    }
    while (this._evoOrbs.length > orbCount) {
      this._evoOrbs.pop().destroy();
    }

    if (!silent) {
      const names = { 1: '小圆豆', 2: '光环小豆', 3: '星环小豆', 4: '超级大豆' };
      this.showFloat(this.player.x, this.player.y - 60, `✦ 进化成【${names[tier]}】啦！`, '#fbbf24', 20);
      sfx.levelup();
      this.goldBurst();
      import('../systems/voice.js').then((m) => m.voice.speak(`进化啦！变成${names[tier]}！`));
      this.ach('evolve', 1);
    }
  }

  setupEnemies() {
    this.enemies = this.physics.add.group();
    this.physics.add.overlap(this.player, this.enemies, this.onPlayerHit, null, this);
  }

  setupBullets() {
    this.bullets = this.physics.add.group({ maxSize: 200 });
    this.physics.add.overlap(this.bullets, this.enemies, this.onBulletHit, null, this);
  }

  setupGems() {
    this.gems = this.physics.add.group({ maxSize: 300 });
    // 掉落物（回复包/磁铁/宝箱）
    this.drops = this.physics.add.group();
    this.physics.add.overlap(this.player, this.drops, this.onPickup, null, this);
    // 敌方弹幕
    this.ebullets = this.physics.add.group({ maxSize: 120 });
    this.physics.add.overlap(this.player, this.ebullets, this.onEnemyBulletHit, null, this);
    // 追踪弹 / 回旋刃 / 地雷
    this.missiles = this.physics.add.group({ maxSize: 40 });
    this.physics.add.overlap(this.missiles, this.enemies, this.onMissileHit, null, this);
    this.boomers = this.physics.add.group({ maxSize: 8 });
    this.physics.add.overlap(this.boomers, this.enemies, this.onBoomerHit, null, this);
    this.mines = this.physics.add.group({ maxSize: 14 });
    this.physics.add.overlap(this.enemies, this.mines, this.onMineTrigger, null, this);
  }

  onEnemyBulletHit(player, b) {
    if (!b.active || this.playerState.dead) return;
    const now = this.time.now;
    const ps = this.playerState;
    if (now < ps.invincibleUntil) return;
    ps.invincibleUntil = now + CONTACT.iframeMs;
    if (ps.shield > 0) {
      ps.shield -= 1;
      ps.shieldTimer = 0;
    } else {
      ps.hp -= Math.round(b.damage * (1 - (ps.armor || 0)));
      sfx.hurt();
    }
    // 刃甲：弹幕找不到射击者，刃气外放反弹给最近敌人（必然事件）
    if (ps.thorns > 0) {
      const near = this.nearestEnemy(200);
      if (near && !near.shielded) this.damageEnemy(near, Math.round(ps.thorns * (ps.bonusDmg || 1)), false);
    }
    player.setTintFill(0xffffff);
    this.time.delayedCall(90, () => player.setTint(this.skinTint));
    this.cameras.main.shake(100, 0.01);
    b.destroy();
    if (ps.hp <= 0) {
      ps.hp = 0;
      this.die();
    }
  }

  setupBubbles() {
    this.bubbles = this.physics.add.group();
    this.physics.add.overlap(this.player, this.bubbles, this.onBubbleHit, null, this);
  }

  // ---------- 波次导演 ----------
  waveDirector(delta) {
    const t = this.elapsedMs / 1000;
    const wave = waveAt(t);
    this.spawnCooldown -= delta;
    if (this.spawnCooldown > 0) return;

    // R10 无尽模式：胜利后每分钟加压（间隔缩短、上限升高、血量增强）
    let interval = wave.interval;
    let cap = wave.cap;
    let hpMul = 1;
    if (this.endless) {
      const pastMin = (t - RUN.victorySec) / 60;
      interval = Math.max(380, wave.interval * Math.pow(0.9, pastMin));
      cap = Math.min(44, Math.round(wave.cap * (1 + pastMin * 0.12)));
      hpMul = 1 + pastMin * 0.2;
    }

    this.spawnCooldown = interval;
    if (this.enemies.countActive(true) >= Math.round(cap * this.capMul)) return;

    const keys = Object.keys(wave.mix);
    let total = 0;
    for (const k of keys) total += wave.mix[k];
    let roll = Math.random() * total;
    let kind = keys[0];
    for (const k of keys) {
      roll -= wave.mix[k];
      if (roll <= 0) {
        kind = k;
        break;
      }
    }
    const e = this.spawnEnemy(ENEMY[kind], kind);
    if (hpMul > 1) {
      e.hp = Math.round(e.hp * hpMul);
      e.maxHp = e.hp;
      e.xpValue = Math.max(1, Math.round(e.xpValue * (1 + pastMinRaw(t) * 0.1)));
    }

    // 精英化：3 分钟后概率升级为精英（金环、高血量、必掉宝箱）
    if (t > ELITE.afterSec && Math.random() < ELITE.chance && kind !== 'mini') {
      this.makeElite(e);
    }

    // Boss 触发（无尽模式每 4 分钟重复挑战强化 Boss）
    const bossKind = bossTriggered(t, this.bossFired);
    if (bossKind && !this.boss) {
      this.spawnBoss(bossKind);
      if (this.endless) this.boss.maxHp = this.boss.hp = Math.round(this.boss.hp * 1.5);
    }
  }

  makeElite(e) {
    e.hp = Math.round(e.hp * ELITE.hpMul);
    e.maxHp = e.hp;
    e.speed *= ELITE.speedMul;
    e.xpValue *= ELITE.xpMul;
    e.damage = Math.round(e.damage * 1.3);
    e.isElite = true;
    e.baseScale = ELITE.scale;
    e.setScale(ELITE.scale);
    // R7 精英词缀
    const affixes = [
      { id: 'swift', name: '迅捷', ring: 0x22d3ee, apply: (en) => { en.speed *= 1.35; } },
      { id: 'tough', name: '坚韧', ring: 0xf59e0b, apply: (en) => { en.hp = Math.round(en.hp * 1.6); en.maxHp = en.hp; } },
      { id: 'giant', name: '巨大', ring: 0xef4444, apply: (en) => { en.baseScale = 1.8; en.setScale(1.8); en.damage = Math.round(en.damage * 1.5); } },
    ];
    const affix = affixes[Math.floor(Math.random() * affixes.length)];
    affix.apply(e);
    e.affix = affix.name;
    // 金色光环（词缀色）
    const ring = this.add.image(e.x, e.y, 'joy-base').setTint(affix.ring).setScale(1.1).setAlpha(0.85);
    e.ring = ring;
  }

  spawnEnemy(type, kind) {
    const view = this.cameras.main.worldView;
    // 开局 5 秒内从近环生成（屏幕边缘可见），快速接战；之后回到屏外环
    const closeRing = this.elapsedMs < 5000;
    const ring = closeRing
      ? Math.max(view.width, view.height) / 2 * 0.62
      : Math.max(view.width, view.height) / 2 + SPAWN.margin;
    const angle = Math.random() * Math.PI * 2;
    const x = this.player.x + Math.cos(angle) * ring;
    const y = this.player.y + Math.sin(angle) * ring;

    const e = this.enemies.create(x, y, type.key);
    e.setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
    e.body.setCircle(type.radius, e.width / 2 - type.radius, e.height / 2 - type.radius);
    e.speed = type.speed * Phaser.Math.FloatBetween(0.9, 1.1);
    e.damage = type.damage;
    e.hp = type.hp;
    e.maxHp = type.hp;
    e.xpValue = type.xp;
    e.kind = kind || null;
    e.kb = new Phaser.Math.Vector2();
    e.spin = Phaser.Math.FloatBetween(-80, 80);
    e.baseScale = 1;
    e.phase = Math.random() * Math.PI * 2;
    // R11 传送入场动画（缩放+淡入）
    e.setAlpha(0);
    this.tweens.add({ targets: e, alpha: 1, scale: { from: 0.2, to: 1 }, duration: 280, ease: 'Back.Out' });
    return e;
  }

  // ---------- Boss 数学护盾 ----------
  spawnBoss(kind) {
    const view = this.cameras.main.worldView;
    const ring = Math.max(view.width, view.height) / 2 + 140;
    const angle = Math.random() * Math.PI * 2;
    const x = this.player.x + Math.cos(angle) * ring;
    const y = this.player.y + Math.sin(angle) * ring;

    const boss = this.enemies.create(x, y, kind === 'dice' ? 'boss_dice' : kind === 'sine' ? 'boss_sine' : 'boss_stats');
    boss.setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
    boss.body.setCircle(44, 4, 4);
    boss.speed = 40;
    boss.damage = 25;
    boss.hp = 700;
    boss.maxHp = 700;
    boss.xpValue = 0;
    boss.isBoss = true;
    boss.kind = kind;
    boss.shielded = true;
    boss.enraged = false;
    boss.kb = new Phaser.Math.Vector2();
    boss.spin = 30;
    // R10 周身旋转光环
    boss.aura = this.add.image(x, y, 'joy-base').setTint(0xa855f7).setScale(2.6).setAlpha(0.4).setDepth(3);
    this.boss = boss;
    this.bossTimer = 25000;
    sfx.boss();
    this.cameras.main.shake(400, 0.008);

    // R23 登场演出：横幅 + 变暗 + 顿帧
    this.hitStopMs = Math.max(this.hitStopMs, 350);
    const { width: vw, height: vh } = this.scale.gameSize;
    const dark = this.add.rectangle(vw / 2, vh / 2, vw, vh, 0x000000, 0.45).setScrollFactor(0).setDepth(50);
    this.tweens.add({ targets: dark, alpha: 0, delay: 900, duration: 600, onComplete: () => dark.destroy() });
    const nameCn = kind === 'dice' ? '生字大王' : kind === 'sine' ? '拼音魔像' : '笔画巨人';
    const banner = this.add
      .text(vw / 2, vh * 0.3, `⚠ BOSS 来袭 · ${nameCn}`, {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '38px',
        color: '#ef4444',
        stroke: '#450a0a',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51)
      .setScale(0.5);
    this.tweens.add({ targets: banner, scale: 1, duration: 300, ease: 'Back.Out', hold: 1400, onComplete: () => banner.destroy() });

    // 识字护盾：找到听到的那个字
    const q = buildShieldQuiz(this.playerState.level);
    boss.shieldQ = q;
    boss.shieldTarget = q.char;
    // 4 个字气泡呈环形分布在 Boss 周围（世界坐标固定）
    const opts = q.opts.map((t, i) => ({ t, correct: i === q.ans }));
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    const R = 190;
    this.bubbles.clear(true, true);
    opts.forEach((o, i) => {
      const a = (Math.PI * 2 * i) / opts.length;
      const bx = x + Math.cos(a) * R;
      const by = y + Math.sin(a) * R;
      const img = this.bubbles.create(bx, by, 'bubble').setDepth(6);
      img.body.setCircle(37, 53, 0);
      img.correct = o.correct;
      const txt = this.add.text(bx, by, o.t, {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif', fontSize: '36px', color: '#fbbf24',
        fontStyle: 'bold', align: 'center',
      }).setOrigin(0.5).setDepth(7);
      img.label = txt;
    });

    // 识字护盾横幅提示 + 语音播报（听音辨字）
    const shieldTip = this.add.text(x, y - 120, `🛡 听一听：跑到「${q.char}」字上撞碎护盾！`, {
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif', fontSize: '17px',
      color: '#22d3ee', backgroundColor: '#0a0e1acc', padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: shieldTip, alpha: 0, delay: 4200, duration: 500, onComplete: () => shieldTip.destroy() });
    this.time.delayedCall(700, () => voice.speak(`跑到${q.char}字上！${q.word}的${q.char}。`));
  }

  spawnEBullet(x, y, angle) {
    const b = this.ebullets.get(x, y, 'ebullet');
    if (!b) return;
    b.setActive(true).setVisible(true).setDepth(6).setBlendMode(Phaser.BlendModes.ADD);
    b.body.reset(x, y);
    b.body.setCircle(5, 1, 1);
    b.setVelocity(Math.cos(angle) * EBULLET.speed, Math.sin(angle) * EBULLET.speed);
    b.damage = EBULLET.damage;
    b.life = EBULLET.lifeMs;
  }

  onMissileHit(missile, enemy) {
    if (!missile.active || !enemy.active) return;
    if (enemy.shielded) { missile.destroy(); return; }
    this.damageEnemy(enemy, missile.mdamage, false);
    const spark = this.add.particles(missile.x, missile.y, 'particle', {
      quantity: 5, speed: { min: 40, max: 120 }, lifespan: 200,
      scale: { start: 0.7, end: 0 }, tint: 0xfb923c,
      blendMode: Phaser.BlendModes.ADD, emitting: false,
    });
    spark.setDepth(7); spark.explode();
    this.time.delayedCall(260, () => spark.destroy());
    missile.destroy();
  }

  onBoomerHit(boomer, enemy) {
    if (!boomer.active || !enemy.active || boomer.hitSet.has(enemy)) return;
    boomer.hitSet.add(enemy);
    if (enemy.shielded) return;
    this.damageEnemy(enemy, boomer.bdamage, false);
  }

  onMineTrigger(enemy, mine) {
    if (!mine.active || !enemy.active) return;
    if (this.time.now < (mine.armAt || 0)) return;
    const boom = this.add.circle(mine.x, mine.y, 20, 0xf87171, 0.7).setDepth(9);
    this.tweens.add({ targets: boom, radius: 95, alpha: 0, duration: 300, onComplete: () => boom.destroy() });
    this.cameras.main.shake(140, 0.01);
    sfx.wrong();
    this.enemies.children.iterate((e) => {
      if (!e || e.shielded) return;
      if (Phaser.Math.Distance.Between(e.x, e.y, mine.x, mine.y) < 95) {
        this.damageEnemy(e, mine.mdamage, false);
      }
    });
    mine.destroy();
  }

  onBubbleHit(player, bubble) {
    if (!this.boss || !bubble.active) return;
    const q = this.boss.shieldQ;
    if (bubble.correct) {
      // 破盾！
      this.breakShield(false);
      this.showFloat(this.player.x, this.player.y - 40, '护盾破碎！', '#4ade80', 20);
    } else {
      // 撞错：该选项爆掉，Boss 狂暴
      bubble.label && bubble.label.destroy();
      bubble.destroy();
      this.enrageBoss();
      this.showFloat(this.player.x, this.player.y - 40, '答案错误 · Boss 狂暴！', '#ef4444', 18);
    }
  }

  breakShield(enraged) {
    const boss = this.boss;
    if (!boss) return;
    boss.shielded = false;
    if (enraged) {
      boss.enraged = true;
      boss.speed = 78;
      boss.setTint(0xef4444);
    }
    this.clearBubbles();
    this.cameras.main.shake(220, 0.014);
    this.zoomPunch(1.05, 260);
    sfx.shieldBreak();
    // 破盾粒子
    const burst = this.add.particles(boss.x, boss.y, 'particle', {
      quantity: Math.round(26 * PARTICLE_SCALE) + 10,
      speed: { min: 80, max: 260 }, lifespan: { min: 300, max: 700 },
      scale: { start: 1.2, end: 0 }, tint: 0x22d3ee,
      blendMode: Phaser.BlendModes.ADD, emitting: false,
    });
    burst.setDepth(8);
    burst.explode();
    this.time.delayedCall(700, () => burst.destroy());
  }

  enrageBoss() {
    const boss = this.boss;
    if (!boss || boss.enraged) return;
    boss.enraged = true;
    boss.speed = 82;
    boss.setTint(0xef4444);
    boss.damage = Math.round(boss.damage * 1.4);
    this.cameras.main.shake(200, 0.012);
    sfx.wrong();
  }

  clearBubbles() {
    // 场景 SHUTDOWN 时物理组可能已被更早注册的关闭监听销毁（children 为 undefined），
    // 此时若抛异常会中断 Phaser 的帧循环重挂（RAF 模式下表现为死亡重开后再也卡死）
    if (!this.bubbles || !this.bubbles.children) return;
    this.bubbles.children.iterate((b) => {
      if (b) b.label && b.label.destroy();
    });
    this.bubbles.clear(true, true);
  }

  bossTick(delta) {
    if (!this.boss) return;
    // R10 光环跟随+旋转
    if (this.boss.aura) {
      this.boss.aura.setPosition(this.boss.x, this.boss.y);
      this.boss.aura.rotation += delta / 600;
      this.boss.aura.setAlpha(this.boss.shielded ? 0.45 : 0.15);
    }
    if (this.boss.shielded) {
      this.bossTimer -= delta;
      if (this.bossTimer <= 0) {
        this.showFloat(this.boss.x, this.boss.y - 80, '超时！Boss 狂暴', '#ef4444', 18);
        this.breakShield(true);
      }
    } else {
      // R8/R26 Boss 弹幕：破盾后周期弹幕（函数魔像=旋转螺旋；二阶段加速）
      this.boss.barrageTimer = (this.boss.barrageTimer ?? 3000) - delta;
      if (this.boss.barrageTimer <= 0) {
        this.boss.barrageTimer = this.boss.phase2 ? 2100 : 4200;
        const n = 12;
        const baseA = this.boss.kind === 'sine' ? (this.boss.spiralA = (this.boss.spiralA || 0) + 0.7) : 0;
        for (let i = 0; i < n; i++) {
          this.spawnEBullet(this.boss.x, this.boss.y, baseA + (Math.PI * 2 * i) / n);
        }
      }
      // R26 二阶段：血量过半触发
      if (!this.boss.phase2 && this.boss.hp < this.boss.maxHp / 2) {
        this.boss.phase2 = true;
        this.boss.speed *= 1.35;
        this.boss.setTint(0xff6b6b);
        this.showFloat(this.boss.x, this.boss.y - 90, '二阶段！', '#ef4444', 20);
        this.cameras.main.shake(200, 0.012);
      }
    }
  }

  // ---------- 自动攻击 ----------
  nearestEnemy(maxDist) {
    let best = null;
    let bestDist = maxDist;
    this.enemies.children.iterate((e) => {
      if (!e) return;
      const d = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    });
    return best;
  }

  fireVolley() {
    const target = this.nearestEnemy(WEAPON.range);
    if (!target) return;
    const ps = this.playerState;
    const n = ps.projectiles;
    const baseAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    const spread = Phaser.Math.DegToRad(WEAPON.spreadDeg);
    for (let i = 0; i < n; i++) {
      const offset = (i - (n - 1) / 2) * spread;
      this.spawnBullet(this.player.x, this.player.y, baseAngle + offset, WEAPON.damage * ps.bonusDmg);
    }
    sfx.shoot();
  }

  spawnBullet(x, y, angle, damage, speedScale = 1) {
    const b = this.bullets.get(x, y, 'bullet');
    if (!b) return;
    b.setActive(true).setVisible(true).setDepth(6).setBlendMode(Phaser.BlendModes.ADD);
    b.setPosition(x, y);
    b.body.setCircle(5, 2, 2);
    b.body.reset(x, y);
    b.setVelocity(Math.cos(angle) * WEAPON.bulletSpeed * speedScale, Math.sin(angle) * WEAPON.bulletSpeed * speedScale);
    b.rotation = angle; // R2 溅射方向需要弹道朝向
    b.hitSet = new Set();
    b.pierceLeft = this.playerState.pierce;
    b.baseDamage = damage;
    b.life = WEAPON.lifetimeMs;
  }

  onBulletHit(bullet, enemy) {
    if (!bullet.active || !enemy.active || bullet.hitSet.has(enemy)) return;
    bullet.hitSet.add(enemy);
    const crit = Math.random() < this.playerState.critChance;
    const dmg = Math.round(bullet.baseDamage * (crit ? this.playerState.critMul : 1));

    // R2 命中溅射：沿弹道反向的火花
    if (PARTICLE_SCALE > 0.3) {
      const spark = this.add.particles(bullet.x, bullet.y, 'particle', {
        quantity: Math.round(4 * PARTICLE_SCALE),
        speed: { min: 40, max: 130 },
        angle: { min: bullet.rotation + 150, max: bullet.rotation + 210 },
        lifespan: 220,
        scale: { start: 0.7, end: 0 },
        tint: crit ? 0xfbbf24 : 0xffffff,
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      });
      spark.setDepth(7);
      spark.explode();
      this.time.delayedCall(300, () => spark.destroy());
    }

    if (enemy.shielded) {
      // Boss 护盾期免疫伤害
      bullet.destroy();
      return;
    }
    this.damageEnemy(enemy, dmg, crit);
    if (bullet.pierceLeft > 0) bullet.pierceLeft -= 1;
    else bullet.destroy();
  }

  /** R37-R40 成就检查：达成即弹 toast */
  ach(event, data) {
    const unlocked = checkAchievement(event, data);
    const ui = this.scene.get('UIScene');
    unlocked.forEach((d) => ui.showAchievementToast(d.name, d.desc));
  }

  damageEnemy(enemy, dmg, crit) {
    enemy.hp -= dmg;
    // R1 受击闪白 + 冲压量（由主循环统一合成缩放）
    enemy.setTintFill(0xffffff);
    enemy.punch = 0.22;
    this.time.delayedCall(60, () => enemy.active && enemy.clearTint());
    this.showDamageNumber(enemy.x, enemy.y - 12, dmg, crit);
    sfx.hit();
    if (enemy.hp <= 0) this.killEnemy(enemy, crit);
  }

  showDamageNumber(x, y, dmg, crit) {
    const txt = this.add.text(x, y, crit ? `${dmg}!` : String(dmg), {
      fontFamily: 'Arial', fontSize: crit ? '24px' : '13px',
      color: crit ? '#fbbf24' : '#ffffff',
      stroke: crit ? '#7c2d12' : '#00000088', strokeThickness: crit ? 3 : 2,
    }).setOrigin(0.5).setDepth(20);
    if (crit) {
      // 暴击冲击环
      const ring = this.add.circle(x, y, 6, 0xfbbf24, 0).setStrokeStyle(2, 0xfbbf24, 0.9).setDepth(19);
      this.tweens.add({ targets: ring, radius: 34, alpha: 0, duration: 260, ease: 'Cubic.Out', onComplete: () => ring.destroy() });
      this.tweens.add({ targets: txt, scale: { from: 1.5, to: 1 }, duration: 180, ease: 'Back.Out' });
    }
    this.tweens.add({
      targets: txt, y: y - (crit ? 48 : 28), alpha: 0,
      duration: crit ? 750 : 480, ease: 'Cubic.Out', onComplete: () => txt.destroy(),
    });
  }

  showFloat(x, y, text, color, size) {
    const txt = this.add.text(x, y, text, {
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: size + 'px', color, stroke: '#00000099', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(21);
    this.tweens.add({ targets: txt, y: y - 40, alpha: 0, duration: 1100, ease: 'Cubic.Out', onComplete: () => txt.destroy() });
  }

  killEnemy(enemy, crit = false) {
    const ps = this.playerState;
    ps.kills += 1;
    this.ach('kills', ps.kills);

    // 连击系统：3 秒内连续击杀累积，里程碑奖励经验球雨
    this.combo = (this.comboTimer > 0 ? this.combo : 0) + 1;
    this.comboTimer = 3000;
    if (this.combo > 0 && this.combo % 10 === 0) {
      this.ach('combo', this.combo);
      this.showFloat(this.player.x, this.player.y - 56, `连击 ×${this.combo}！`, '#fbbf24', 22);
      sfx.gem();
      for (let i = 0; i < Math.min(6, this.combo / 10); i++) {
        this.spawnGem(this.player.x + Phaser.Math.Between(-60, 60), this.player.y + Phaser.Math.Between(-60, 60));
      }
    }

    // 顿帧：击杀瞬间时间凝固（打击感核心；暴击/精英更长）
    if (!enemy.isBoss) {
      this.hitStopMs = Math.max(this.hitStopMs, crit || enemy.isElite ? RUN.hitStopCritMs : RUN.hitStopMs);
    }

    if (enemy.isBoss) {
      this.bossKills += 1;
      this.ach('boss', this.bossKills);
      this.boss = null;
      this.clearBubbles();
      if (enemy.aura) enemy.aura.destroy();
      // R22 Boss 死亡大爆炸：白闪 → 双冲击波 → 慢动作
      sfx.heal();
      ps.hp = Math.min(ps.maxHp, ps.hp + 30);
      this.cameras.main.flash(300, 255, 255, 255);
      this.cameras.main.shake(500, 0.02);
      this.zoomPunch(1.12, 500);
      const flash = this.add.circle(enemy.x, enemy.y, 10, 0xffffff, 0.9).setDepth(10);
      this.tweens.add({ targets: flash, radius: 160, alpha: 0, duration: 400, ease: 'Cubic.Out', onComplete: () => flash.destroy() });
      [0, 140].forEach((delay, i) => {
        const ring = this.add.circle(enemy.x, enemy.y, 20, 0xfbbf24, 0).setStrokeStyle(3, i ? 0x22d3ee : 0xfbbf24, 0.9).setDepth(9);
        this.tweens.add({ targets: ring, radius: i ? 220 : 160, alpha: 0, delay, duration: 520, ease: 'Cubic.Out', onComplete: () => ring.destroy() });
      });
      // 慢动作 0.6 秒
      this.physics.world.timeScale = 2.4;
      this.tweens.timeScale = 0.35;
      this.time.delayedCall(600, () => {
        this.physics.world.timeScale = 1;
        this.tweens.timeScale = 1;
      });
      for (let i = 0; i < 24; i++) {
        this.spawnGem(enemy.x + Phaser.Math.Between(-46, 46), enemy.y + Phaser.Math.Between(-46, 46));
      }
    } else {
      sfx.kill();
    }

    // 分裂兵：死亡分裂成 2 个小个体（总体与个体）
    if (enemy.kind === 'splitter' && !enemy.isElite) {
      for (let i = 0; i < 2; i++) {
        const mini = this.spawnEnemy(ENEMY.mini);
        mini.setPosition(enemy.x + Phaser.Math.Between(-20, 20), enemy.y + Phaser.Math.Between(-20, 20));
      }
    }

    // 掉落判定：精英必掉宝箱；普通怪按概率
    if (enemy.isElite) {
      this.spawnDrop('drop_chest', enemy.x, enemy.y);
    } else if (!enemy.isBoss && enemy.kind !== 'mini') {
      const r = Math.random();
      if (r < DROPS.healChance) this.spawnDrop('drop_heal', enemy.x, enemy.y);
      else if (r < DROPS.healChance + DROPS.magnetChance) this.spawnDrop('drop_magnet', enemy.x, enemy.y);
      else if (r < DROPS.healChance + DROPS.magnetChance + DROPS.chestChance) this.spawnDrop('drop_chest', enemy.x, enemy.y);
    }

    if (enemy.ring) enemy.ring.destroy();

    // R3 击杀冲击波（按体型分档）
    if (!enemy.kind || enemy.kind !== 'mini' || enemy.isElite) {
      const rr = enemy.isBoss ? 90 : enemy.isElite ? 44 : 26;
      const wave = this.add.circle(enemy.x, enemy.y, rr * 0.3, 0xffffff, 0).setStrokeStyle(2, enemy.isBoss ? 0xfbbf24 : 0xffffff, 0.8).setDepth(9);
      this.tweens.add({ targets: wave, radius: rr, alpha: 0, duration: 320, ease: 'Cubic.Out', onComplete: () => wave.destroy() });
    }

    const tintMap = { enemy1: COLORS.enemy1, enemy2: COLORS.enemy2, enemy3: COLORS.enemy3, enemy4: COLORS.enemy4, enemy5: 0xf472b6 };
    const burst = this.add.particles(enemy.x, enemy.y, 'particle', {
      quantity: enemy.isBoss ? 60 : Math.round((enemy.isElite ? 20 : 10) * PARTICLE_SCALE),
      speed: { min: 50, max: enemy.isBoss ? 340 : 190 },
      lifespan: { min: 240, max: enemy.isBoss ? 900 : 520 },
      scale: { start: enemy.isBoss ? 1.6 : 1, end: 0 },
      tint: enemy.isBoss ? 0xfbbf24 : enemy.isElite ? 0xfbbf24 : (tintMap[enemy.texture.key] || 0xffffff),
      blendMode: Phaser.BlendModes.ADD, emitting: false,
    });
    burst.setDepth(7);
    burst.explode();
    this.time.delayedCall(900, () => burst.destroy());

    for (let i = 0; i < enemy.xpValue; i++) {
      this.spawnGem(enemy.x + Phaser.Math.Between(-8, 8), enemy.y + Phaser.Math.Between(-8, 8));
    }
    enemy.destroy();
  }

  // ---------- 掉落物 ----------
  spawnDrop(key, x, y) {
    const d = this.drops.create(x, y, key);
    d.setDepth(5).setBlendMode(Phaser.BlendModes.ADD);
    d.body.setCircle(14, d.width / 2 - 14, d.height / 2 - 14);
    d.dropKind = key;
    // 轻微弹出
    const ang = Math.random() * Math.PI * 2;
    d.setVelocity(Math.cos(ang) * 60, Math.sin(ang) * 60);
    this.tweens.add({ targets: d.body.velocity, x: 0, y: 0, duration: 400 });
    // 闪烁吸引注意
    this.tweens.add({ targets: d, scale: { from: 1, to: 1.15 }, duration: 500, yoyo: true, repeat: -1 });
    return d;
  }

  onPickup(player, drop) {
    if (!drop.active || this.playerState.dead) return;
    const kind = drop.dropKind;
    this.tweens.killTweensOf(drop);
    drop.destroy();

    if (kind === 'drop_heal') {
      this.playerState.hp = Math.min(this.playerState.maxHp, this.playerState.hp + DROPS.healAmount);
      this.showFloat(player.x, player.y - 36, '+' + DROPS.healAmount + ' HP', '#4ade80', 18);
      sfx.heal();
    } else if (kind === 'drop_magnet') {
      this.gems.children.iterate((gem) => {
        if (gem) gem.magnetized = true;
      });
      this.showFloat(player.x, player.y - 36, '🧲 磁铁！经验全收', '#22d3ee', 18);
      sfx.gem();
    } else if (kind === 'drop_chest') {
      this.showFloat(player.x, player.y - 36, '🎁 宝箱！直接升级', '#fbbf24', 20);
      this.goldBurst();
      sfx.levelup();
      // 补满当前等级所需经验（复用升级含答题流程）
      this.gainXP(this.playerState.xpNeed - this.playerState.xp);
    }
  }

  // ---------- 经验球 ----------
  spawnGem(x, y) {
    const gem = this.gems.get(x, y, 'xp');
    if (!gem) return;
    gem.setActive(true).setVisible(true).setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
    gem.body.reset(x, y);
    gem.body.setCircle(6, 1, 1);
    gem.setVelocity(0, 0);
    gem.magnetized = false;
  }

  updateGems(delta) {
    const now = this.time.now;
    const magnetR = GEM.magnetRadius * (this.playerState.magnetMul || 1);
    this.gems.children.iterate((gem) => {
      if (!gem || !gem.active) return;
      const d = Phaser.Math.Distance.Between(gem.x, gem.y, this.player.x, this.player.y);
      if (d < GEM.collectRadius) {
        this.gainXP(1);
        gem.destroy();
        return;
      }
      if (d < magnetR) gem.magnetized = true;
      if (gem.magnetized) {
        // R5 磁吸状态：加速旋转+发亮
        const angle = Phaser.Math.Angle.Between(gem.x, gem.y, this.player.x, this.player.y);
        gem.setVelocity(Math.cos(angle) * GEM.magnetSpeed, Math.sin(angle) * GEM.magnetSpeed);
        gem.rotation += 0.15;
        gem.setScale(1 + 0.25 * Math.sin(now / 50));
      } else {
        // R9 待机浮动：呼吸脉动
        gem.setScale(1 + 0.1 * Math.sin(now / 300 + gem.x));
      }
    });
  }

  gainXP(v) {
    const ps = this.playerState;
    ps.xp += v * (ps.xpMul || 1); // R12 经验加权被动
    while (ps.xp >= ps.xpNeed) {
      ps.xp -= ps.xpNeed;
      ps.level += 1;
      ps.xpNeed = Math.round(XP.baseNeed * Math.pow(XP.growth, ps.level - 1));
      this.ach('level', ps.level);
      this.pendingLevelUps += 1;
    }
    if (this.pendingLevelUps > 0 && !this.choosing) this.openLevelUp();
  }

  // ---------- 升级：节奏制（每2次1次听音选字，其余直接点卡片升级） ----------
  openLevelUp() {
    this._levelUpCount += 1;
    this.choosing = true;
    // R12 升级慢动作：时间凝固前先体验 0.5 秒子弹时间
    this.physics.world.timeScale = 3;
    this.tweens.timeScale = 0.35;
    this.playerState.invincibleUntil = Math.max(this.playerState.invincibleUntil, this.time.now + 900);
    sfx.levelup();
    this.zoomPunch(1.05, 300);
    this.goldBurst();

    this.time.delayedCall(520, () => {
      this.physics.world.timeScale = 1;
      this.tweens.timeScale = 1;
      this.physics.world.pause();

    const doCards = () => {
      const ui = this.scene.get('UIScene');
      const cards = ui.buildLevelUpCards(this.playerState);
      cards.forEach((card) => {
        card.__apply = () => {
          card.apply(this.playerState);
          this.playerState.skillLevels[card.id] = (this.playerState.skillLevels[card.id] || 0) + 1;
        };
      });
      // 升级选卡全部点选（无喊字环节）
      ui.showLevelUp(cards, (chosen) => {
        try {
          // 朗读确认：卡上的字 + 讲解，加深听音印象
          voice.speak(`${chosen.char}！${chosen.lesson ? chosen.lesson : ''}`);
          chosen.__apply(); // apply 效果 + skillLevels 计数（只在这里加一次）
          if (chosen.isWeapon) this.ach('weapons', Object.keys(this.playerState.weapons || {}).length);
          // 满级进化
          if (this.playerState.skillLevels[chosen.id] === chosen.max) {
            this.evolveSkill(chosen.id);
            this.showFloat(this.player.x, this.player.y - 70, `✦ ${chosen.char} · 进化！`, '#fbbf24', 22);
            this.ach('evolve', 1);
          }
        } finally {
          // 无论选卡逻辑是否抛异常，都必须恢复战斗，否则世界永久冻结
          this.choosing = false;
          this.pendingLevelUps -= 1;
          this.physics.world.resume();
          if (this.pendingLevelUps > 0) this.openLevelUp();
        }
      });
    };

    try {
      // 节奏：每 2 次升级出现 1 次听音选字（答对本次强化更高）
      if (this._levelUpCount % 2 === 0) {
        const q = pickQuizChar(this.playerState.level);
        const onDone = (correct, qRec) => {
          recordCharAnswer(qRec.char, correct, this.playerState.level);
          this.session.total += 1;
          this.ach('quiz_total', this.session.total);
          this.ach('quiz_ok', this.session.correct);
          if (correct) {
            this.session.correct += 1;
            this.session.streak = (this.session.streak || 0) + 1;
            // 连对加成：每连对 3 题，伤害 +5%
            if (this.session.streak % 3 === 0) {
              this.playerState.bonusDmg = Math.min(1.8, this.playerState.bonusDmg + 0.05);
              this.showFloat(this.player.x, this.player.y - 100, `连对 ${this.session.streak} 题！威力提升`, '#4ade80', 16);
            }
            this.playerState.bonusDmg = Math.min(1.8, this.playerState.bonusDmg * 1.1);
            this.session.answers.push({ char: q.char, correct: true });
          } else {
            this.session.streak = 0;
            this.session.answers.push({ char: q.char, correct: false });
          }
          doCards();
        };
        showQuiz(q, onDone);
      } else {
        doCards();
      }
    } catch (e) {
      // 答题浮层异常也不得卡死升级流程：直接进选卡
      console.error('quiz flow error, fallback to cards', e);
      doCards();
    }
    });
  }

  /** 满级进化：每个字卡满级时获得一次质变加成 */
  evolveSkill(id) {
    const ps = this.playerState;
    switch (id) {
      case 'big': ps.bonusDmg = Math.min(2.5, ps.bonusDmg + 0.3); break;
      case 'small': ps.fireInterval = Math.max(110, ps.fireInterval - 25); break;
      case 'water': ps.regen += ps.regen; break; // 回复翻倍
      case 'mountain': ps.shieldMax += 1; ps.shield = ps.shieldMax; ps.shieldTimer = 0; break;
      case 'wind': ps.moveMul += 0.1; break;
      case 'fire': ps.critMul = 3; break; // 暴击伤害 2→3 倍
      case 'sun': ps.volleyDbl = true; break; // 日耀弹数翻倍
      case 'earth': ps.novaRange = 320; break; // 地震范围扩大
    }
  }

  // ---------- R1-R4 多武器系统 ----------
  weaponTick(delta) {
    const ps = this.playerState;
    const W = ps.weapons || {};

    // 环刃：绕体旋转刃片，接触伤害（每敌人 0.4s 免疫）
    if (W.whirl) {
      const lvl = W.whirl;
      this.whirlAngle = (this.whirlAngle || 0) + delta * 0.005;
      this.whirlSprites = this.whirlSprites || [];
      const count = 1 + lvl;
      while (this.whirlSprites.length < count) {
        const s = this.add.image(0, 0, 'whirl').setDepth(6).setBlendMode(Phaser.BlendModes.ADD);
        this.whirlSprites.push(s);
      }
      while (this.whirlSprites.length > count) this.whirlSprites.pop().destroy();
      const R = 84;
      this.whirlSprites.forEach((s, i) => {
        const a = this.whirlAngle + (Math.PI * 2 * i) / count;
        const wx = this.player.x + Math.cos(a) * R;
        const wy = this.player.y + Math.sin(a) * R;
        s.setPosition(wx, wy).setRotation(a + Math.PI / 2);
      });
      this.whirlHitTimer = (this.whirlHitTimer || 0) - delta;
      if (this.whirlHitTimer <= 0) {
        this.whirlHitTimer = 380;
        const dmg = Math.round((8 + 4 * lvl) * ps.bonusDmg);
        this.enemies.children.iterate((e) => {
          if (!e || e.shielded) return;
          for (const s of this.whirlSprites) {
            if (Phaser.Math.Distance.Between(s.x, s.y, e.x, e.y) < 26 + (e.radius || 12) * 0.4) {
              this.damageEnemy(e, dmg, false);
              break;
            }
          }
        });
      }
    } else if (this.whirlSprites) {
      this.whirlSprites.forEach((s) => s.destroy());
      this.whirlSprites = null;
    }

    // 闪电链：命中最近敌人后跳跃
    if (W.chain) {
      const lvl = W.chain;
      this.chainTimer -= delta;
      if (this.chainTimer <= 0) {
        this.chainTimer = 2500;
        let from = this.nearestEnemy(520);
        if (from) {
          const dmg = Math.round((10 + 5 * lvl) * ps.bonusDmg);
          const hitSet = new Set();
          let cur = from;
          const pts = [{ x: this.player.x, y: this.player.y }];
          for (let j = 0; j <= lvl && cur; j++) {
            hitSet.add(cur);
            pts.push({ x: cur.x, y: cur.y });
            this.damageEnemy(cur, dmg, false);
            let next = null;
            let nd = 170;
            this.enemies.children.iterate((e2) => {
              if (!e2 || hitSet.has(e2)) return;
              const d = Phaser.Math.Distance.Between(cur.x, cur.y, e2.x, e2.y);
              if (d < nd) {
                nd = d;
                next = e2;
              }
            });
            cur = next;
          }
          // 闪电绘线
          const line = this.add.graphics().setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
          line.lineStyle(3, 0x7dd3fc, 0.95);
          line.beginPath();
          pts.forEach((p, i) => (i === 0 ? line.moveTo(p.x, p.y) : line.lineTo(p.x, p.y)));
          line.strokePath();
          this.tweens.add({ targets: line, alpha: 0, duration: 180, onComplete: () => line.destroy() });
        }
      }
    }

    // 函数射线：贯穿直线
    if (W.laser) {
      this.laserTimer = (this.laserTimer || 1200) - delta;
      if (this.laserTimer <= 0) {
        this.laserTimer = 1800;
        const target = this.nearestEnemy(560);
        if (target) {
          const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
          const len = 700;
          const dmg = Math.round((12 + 6 * W.laser) * ps.bonusDmg);
          const dx = Math.cos(angle), dy = Math.sin(angle);
          this.enemies.children.iterate((e) => {
            if (!e || e.shielded) return;
            const px = e.x - this.player.x, py = e.y - this.player.y;
            const proj = px * dx + py * dy;
            const perp = Math.abs(px * dy - py * dx);
            if (proj >= 0 && proj <= len && perp < 30) this.damageEnemy(e, dmg, false);
          });
          const line = this.add.graphics().setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
          line.lineStyle(4, 0x38bdf8, 0.9);
          line.beginPath();
          line.moveTo(this.player.x, this.player.y);
          line.lineTo(this.player.x + dx * len, this.player.y + dy * len);
          line.strokePath();
          this.tweens.add({ targets: line, alpha: 0, duration: 200, onComplete: () => line.destroy() });
          sfx.hit();
        }
      }
    }

    // 向量追踪弹：发射后自动转向
    if (W.missile) {
      this.missileTimer = (this.missileTimer || 1800) - delta;
      if (this.missileTimer <= 0) {
        this.missileTimer = 2400;
        for (let i = 0; i < W.missile; i++) {
          const m = this.missiles.get(this.player.x, this.player.y, 'missile');
          if (!m) break;
          m.setActive(true).setVisible(true).setDepth(6).setBlendMode(Phaser.BlendModes.ADD);
          m.body.reset(this.player.x, this.player.y);
          m.body.setCircle(4, 4, 1);
          const a = Math.random() * Math.PI * 2;
          m.setVelocity(Math.cos(a) * 200, Math.sin(a) * 200);
          m.target = null;
          m.mdamage = Math.round((18 + 8 * W.missile) * ps.bonusDmg);
          m.life = 3000;
        }
      }
    }

    // 子母弹：母弹到位后散射
    if (W.cluster) {
      this.clusterTimer = (this.clusterTimer || 2000) - delta;
      if (this.clusterTimer <= 0) {
        this.clusterTimer = 2600;
        const target = this.nearestEnemy(460);
        if (target) {
          const dmg = Math.round((10 + 4 * W.cluster) * ps.bonusDmg);
          const p = this.add.image(this.player.x, this.player.y, 'grenade').setDepth(6).setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({
            targets: p,
            x: target.x, y: target.y,
            scale: { from: 1.3, to: 0.9 },
            duration: 460,
            ease: 'Sine.In',
            onComplete: () => {
              p.destroy();
              const ring = this.add.circle(target.x, target.y, 24, 0xe879f9, 0).setStrokeStyle(3, 0xe879f9, 0.9).setDepth(9);
              this.tweens.add({ targets: ring, radius: 60, alpha: 0, duration: 300, onComplete: () => ring.destroy() });
              const cnt = 4 + 2 * W.cluster;
              for (let i = 0; i < cnt; i++) {
                this.spawnBullet(target.x, target.y, (Math.PI * 2 * i) / cnt, dmg, 0.75);
                this.bullets.children.iterate((b) => {
                  if (b && b.life === WEAPON.lifetimeMs) b.life = 700;
                });
              }
              sfx.gem();
            },
          });
        }
      }
    }

    // 正弦弹幕：波浪蛇形弹
    if (W.sine) {
      this.sineTimer = (this.sineTimer || 1400) - delta;
      if (this.sineTimer <= 0) {
        this.sineTimer = 1600;
        const target = this.nearestEnemy(560);
        if (target) {
          const base = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
          const cnt = 2 + W.sine;
          for (let i = 0; i < cnt; i++) {
            const b = this.spawnBullet(this.player.x, this.player.y, base, WEAPON.damage * 0.8 * ps.bonusDmg, 0.85);
            if (b) b.wave = { base, amp: 0.75, freq: 5, speed: WEAPON.bulletSpeed * 0.85, t: Math.random() * 6 };
          }
        }
      }
    }

    // 回旋刃：去程回程双程伤害
    if (W.boomer) {
      this.boomerTimer = (this.boomerTimer || 2600) - delta;
      if (this.boomerTimer <= 0) {
        this.boomerTimer = 3000;
        const target = this.nearestEnemy(500);
        const a = target ? Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y) : Math.random() * Math.PI * 2;
        const bo = this.boomers.get(this.player.x, this.player.y, 'whirl');
        if (bo) {
          bo.setActive(true).setVisible(true).setDepth(6).setBlendMode(Phaser.BlendModes.ADD);
          bo.body.reset(this.player.x, this.player.y);
          bo.body.setCircle(10, 5, 5);
          bo.setVelocity(Math.cos(a) * 300, Math.sin(a) * 300);
          bo.rotation = 0;
          bo.hitSet = new Set();
          bo.phase = 'out';
          bo.maxDist = 240 + 40 * W.boomer;
          bo.startX = this.player.x; bo.startY = this.player.y;
          bo.bdamage = Math.round((14 + 6 * W.boomer) * ps.bonusDmg);
        }
      }
    }

    // 不等式减速场：脉冲减速圈
    if (W.frost) {
      this.frostTimer = (this.frostTimer || 3800) - delta;
      if (this.frostTimer <= 0) {
        this.frostTimer = 5000;
        const R = 220;
        const slowPct = 30 + 10 * W.frost;
        const slow = 1 - slowPct / 100;
        const ring = this.add.circle(this.player.x, this.player.y, 30, 0x93c5fd, 0).setStrokeStyle(3, 0x93c5fd, 0.9).setDepth(8);
        this.tweens.add({ targets: ring, radius: R, alpha: 0, duration: 480, ease: 'Cubic.Out', onComplete: () => ring.destroy() });
        this.enemies.children.iterate((e) => {
          if (!e) return;
          if (Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y) < R) {
            e.slowUntil = this.time.now + 2500;
            e.slowMul = slow;
          }
        });
        sfx.gem();
      }
    }

    // 落点地雷：身后布雷
    if (W.mine) {
      this.mineTimer = (this.mineTimer || 2400) - delta;
      if (this.mineTimer <= 0) {
        this.mineTimer = 2800;
        if (this.mines.countActive(true) < 4 + W.mine) {
          const m = this.mines.get(this.player.x + Phaser.Math.Between(-30, 30), this.player.y + Phaser.Math.Between(-30, 30), 'grenade');
          if (m) {
            m.setActive(true).setVisible(true).setDepth(2).setTint(0xf87171).setScale(0.9);
            m.body.reset(m.x, m.y);
            m.body.setCircle(10, 3, 3);
            m.mdamage = Math.round((20 + 8 * W.mine) * ps.bonusDmg);
            m.armAt = this.time.now + 400;
          }
        }
      }
    }

    // 分层榴弹：投掷后中心/外圈两档伤害
    if (W.grenade) {
      const lvl = W.grenade;
      this.grenadeTimer -= delta;
      if (this.grenadeTimer <= 0) {
        this.grenadeTimer = 2800;
        const target = this.nearestEnemy(420);
        if (target) {
          const g = this.add.image(this.player.x, this.player.y, 'grenade').setDepth(6).setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({
            targets: g,
            x: target.x, y: target.y,
            scale: { from: 1.3, to: 0.8 },
            duration: 480,
            ease: 'Sine.In',
            onComplete: () => {
              g.destroy();
              const inner = Math.round((25 + 10 * lvl) * ps.bonusDmg);
              const ring = this.add.circle(target.x, target.y, 30, 0xf59e0b, 0).setStrokeStyle(3, 0xf59e0b, 0.9).setDepth(9);
              this.tweens.add({ targets: ring, radius: 140, alpha: 0, duration: 380, ease: 'Cubic.Out', onComplete: () => ring.destroy() });
              this.enemies.children.iterate((e) => {
                if (!e || e.shielded) return;
                const d = Phaser.Math.Distance.Between(e.x, e.y, target.x, target.y);
                if (d < 80) this.damageEnemy(e, inner, false);
                else if (d < 150) this.damageEnemy(e, Math.round(inner / 2), false);
              });
            },
          });
        }
      }
    }
  }

  goldBurst() {
    const burst = this.add.particles(this.player.x, this.player.y, 'particle', {
      quantity: Math.round(22 * PARTICLE_SCALE),
      speed: { min: 60, max: 220 }, lifespan: { min: 300, max: 700 },
      scale: { start: 1.1, end: 0 }, tint: 0xfbbf24,
      blendMode: Phaser.BlendModes.ADD, emitting: false,
    });
    burst.setDepth(8);
    burst.explode();
    // R23 能量上升流：金色粒子柱
    const rise = this.add.particles(this.player.x, this.player.y, 'particle', {
      quantity: Math.round(14 * PARTICLE_SCALE),
      speedY: { min: 90, max: 190 },
      speedX: { min: -30, max: 30 },
      lifespan: { min: 400, max: 800 },
      scale: { start: 0.9, end: 0 },
      tint: [0xfbbf24, 0xffe9a3],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    rise.setDepth(8);
    rise.explode();
    this.time.delayedCall(900, () => { burst.destroy(); rise.destroy(); });
  }

  zoomPunch(scale, duration) {
    const cam = this.cameras.main;
    const base = cam.zoom;
    this.tweens.add({
      targets: cam, zoom: base * scale,
      duration: duration / 2, yoyo: true, hold: 40, ease: 'Sine.InOut',
    });
  }

  // ---------- 接触伤害 ----------
  onPlayerHit(player, enemy) {
    const now = this.time.now;
    const ps = this.playerState;
    if (ps.dead || now < ps.invincibleUntil) return;

    ps.invincibleUntil = now + CONTACT.iframeMs;

    if (ps.shield > 0) {
      ps.shield -= 1;
      ps.shieldTimer = 0;
      player.setTintFill(0xa855f7);
      this.time.delayedCall(90, () => player.setTint(this.skinTint));
      sfx.shieldBreak();
    } else {
      ps.hp -= Math.round(enemy.damage * (1 - (ps.armor || 0)));
      player.setTintFill(0xffffff);
      this.time.delayedCall(90, () => player.setTint(this.skinTint));
      sfx.hurt();
      const uiScene = this.scene.get('UIScene');
      if (uiScene && uiScene.flashHurt) uiScene.flashHurt();
    }

    // 刃甲：受击必然反弹伤害给攻击者（必然事件）
    if (ps.thorns > 0 && enemy.active && !enemy.shielded) {
      this.damageEnemy(enemy, Math.round(ps.thorns * (ps.bonusDmg || 1)), false);
    }

    const push = new Phaser.Math.Vector2(enemy.x - player.x, enemy.y - player.y)
      .normalize().scale(CONTACT.knockback);
    enemy.kb.copy(push);
    this.cameras.main.shake(120, 0.012);
    // R4 受击红闪
    const uiScene = this.scene.get('UIScene');
    if (uiScene && uiScene.flashHurt) uiScene.flashHurt();

    if (ps.hp <= 0) {
      ps.hp = 0;
      this.die();
    }
  }

  // ---------- 胜利 / 暂停 ----------
  victory() {
    this.victoryDone = true;
    this.endless = true;
    this.ach('victory', 1);
    sfx.levelup();
    this.cameras.main.flash(400, 251, 191, 36);
    this.zoomPunch(1.1, 500);
    this.goldBurst();
    this.showFloat(this.player.x, this.player.y - 80, '🏆 生存胜利！进入无尽模式', '#fbbf24', 24);
    this.showFloat(this.player.x, this.player.y - 30, '敌潮将持续增强，看你能撑多久', '#e2e8f0', 15);
  }

  togglePause() {
    if (this.playerState.dead) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.physics.world.pause();
      this.joystickVecZero();
    } else {
      this.physics.world.resume();
    }
    return this.paused;
  }

  joystickVecZero() {
    const ui = this.scene.get('UIScene');
    if (ui && ui.joystick) {
      ui.joystick.touchVec.set(0, 0);
      ui.joystick.activePointerId = null;
      ui.joystick.base.setAlpha(0);
      ui.joystick.arrow.setAlpha(0);
    }
  }

  /** R5 冲刺：向当前移动方向瞬移，冲刺期间无敌 */
  tryDash(moveVec) {
    const ps = this.playerState;
    if (ps.dead || this.paused || this.choosing) return false;
    if (this.dashCd > 0 || this.time.now < this.dashUntil) return false;
    this.dashDir.set(moveVec.x || this.dashDir.x, moveVec.y || this.dashDir.y).normalize();
    this.dashUntil = this.time.now + 190;
    this.dashCd = 3000 * (ps.dashCdMul || 1); // 足：冷却缩减
    sfx.gem();
    return true;
  }

  die() {
    this.playerState.dead = true;
    // R26 死亡慢动作：敌人缓慢漂移，粒子与补间放缓，随后定格
    this.physics.world.timeScale = 3;
    this.tweens.timeScale = 0.45;
    sfx.wrong();

    const boom = this.add.particles(this.player.x, this.player.y, 'particle', {
      quantity: Math.round(46 * PARTICLE_SCALE),
      speed: { min: 60, max: 300 }, lifespan: { min: 400, max: 900 },
      scale: { start: 1.4, end: 0 }, alpha: { start: 1, end: 0 },
      tint: this.skinTint || COLORS.player, blendMode: Phaser.BlendModes.ADD, emitting: false,
    });
    boom.setDepth(6);
    boom.explode();
    this.player.setVisible(false);
    this.cameras.main.shake(260, 0.02);

    // 1.4s 后弹出诊断报告（真实时间，避免被暂停影响）；先恢复时间流速
    const timeStr = this.formatTime(this.elapsedMs);
    this.time.delayedCall(800, () => {
      this.physics.world.pause();
      this.physics.world.timeScale = 1;
      this.tweens.timeScale = 1;
    });
    setTimeout(() => {
      addSession(Math.floor(this.elapsedMs / 1000));
      showReport({
        timeStr,
        kills: this.playerState.kills,
        level: this.playerState.level,
        correct: this.session.correct,
        total: this.session.total,
        bossKills: this.bossKills,
        victory: this.victoryDone,
      }, () => this.scene.restart());
    }, 1400);
  }

  formatTime(ms) {
    const t = Math.floor(ms / 1000);
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  }

  // ---------- 周期型技能 ----------
  skillTick(delta) {
    const ps = this.playerState;
    if (ps.volleyLvl > 0) {
      this.volleyTimer += delta;
      if (this.volleyTimer >= 6000) {
        this.volleyTimer = 0;
        let n = 6 + 2 * ps.volleyLvl;
        if (ps.volleyDbl) n *= 2;
        for (let i = 0; i < n; i++) {
          this.spawnBullet(this.player.x, this.player.y, (Math.PI * 2 * i) / n, WEAPON.damage * 0.7 * ps.bonusDmg, 0.9);
        }
      }
    }
    if (ps.novaLvl > 0) {
      this.novaTimer += delta;
      if (this.novaTimer >= 5000) {
        this.novaTimer = 0;
        this.fireNova(ps.novaLvl);
      }
    }
    if (ps.regen > 0 && ps.hp < ps.maxHp) {
      ps.hp = Math.min(ps.maxHp, ps.hp + (ps.regen * delta) / 1000);
      // R21 回复光效：治疗粒子缓缓上升
      this.healFxT = (this.healFxT || 0) + delta;
      if (this.healFxT >= 900) {
        this.healFxT = 0;
        const fx = this.add.particles(this.player.x, this.player.y, 'particle', {
          quantity: 3,
          speed: { min: 20, max: 55 },
          angle: { min: 240, max: 300 },
          lifespan: 600,
          scale: { start: 0.8, end: 0 },
          tint: 0x34d399,
          blendMode: Phaser.BlendModes.ADD,
          emitting: false,
        });
        fx.setDepth(6);
        fx.explode();
        this.time.delayedCall(700, () => fx.destroy());
      }
    }
    if (ps.shield < ps.shieldMax) {
      ps.shieldTimer += delta;
      if (ps.shieldTimer >= 12000) {
        ps.shield += 1;
        ps.shieldTimer = 0;
      }
    }
  }

  fireNova(lvl) {
    const ps = this.playerState;
    const range = ps.novaRange;
    const inner = range / 2;
    const innerDmg = Math.round((20 + 8 * lvl) * ps.bonusDmg);
    const ring = this.add.circle(this.player.x, this.player.y, 24, 0x22d3ee, 0).setStrokeStyle(3, 0x22d3ee, 0.8).setDepth(8);
    this.tweens.add({ targets: ring, radius: range, alpha: 0, duration: 460, ease: 'Cubic.Out', onComplete: () => ring.destroy() });
    this.enemies.children.iterate((e) => {
      if (!e) return;
      const d = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
      if (d < inner) this.damageEnemy(e, innerDmg, false);
      else if (d < range) this.damageEnemy(e, Math.round(innerDmg / 2), false);
    });
  }

  // ---------- 主循环 ----------
  update(_time, delta) {
    const ps = this.playerState;

    // 用眼健康：累计游玩时长（暂停/选卡/死亡不计时），到点弹休息提醒并暂停游戏
    if (!this.restOverlayOpen && !this.paused && !this.choosing && !ps.dead) {
      addPlayTime(delta);
      if (isRestReminderOn() && getPlayTime() >= restIntervalMin() * 60000) {
        this.restOverlayOpen = true;
        this.togglePause();
        showRestOverlay(() => {
          this.restOverlayOpen = false;
          resetPlayTime();
          if (this.paused && !this.playerState.dead) this.togglePause();
        });
      }
    }

    // 胜利判定：存活 8 分钟 → 进入无尽模式（继续游戏）
    if (!this.victoryDone && this.elapsedMs >= RUN.victorySec * 1000) {
      this.victory();
    }

    // 暂停：完全冻结（网格仍随相机）
    if (this.paused) {
      this.gridFollow();
      this.updateSymbols(delta);
      return;
    }

    if (!ps.dead) this.elapsedMs += delta;

    this.gridFollow();
    this.updateSymbols(delta);

    // R20 帧率监测：持续低于 38fps 自动降档
    this._fpsN += 1;
    this._fpsT += delta;
    if (this._fpsT >= 3000) {
      const fps = this._fpsN / (this._fpsT / 1000);
      this._fpsN = 0;
      this._fpsT = 0;
      if (fps < 38 && this.capMul > 0.45) {
        this.capMul = Math.max(0.45, this.capMul - 0.2);
      }
    }

    // 顿帧：击杀后的时间凝固（视觉层 tween 照常，逻辑跳过）
    if (this.hitStopMs > 0) {
      this.hitStopMs -= delta;
      return;
    }

    if (ps.dead || this.choosing) return;

    const ui = this.scene.get('UIScene');
    const vec = ui && ui.joystick ? ui.joystick.getVector() : Phaser.Math.Vector2.ZERO;
    // R9 移速被动
    this.player.setVelocity(vec.x * PLAYER.SPEED * (ps.moveMul || 1), vec.y * PLAYER.SPEED * (ps.moveMul || 1));
    if (vec.x !== 0) this.player.setFlipX(vec.x < 0);

    // R13 移动倾斜 + 挤压拉伸：朝移动方向轻微侧倾
    const tilt = (vec.x || vec.y) ? Math.sin(this.time.now / 130) * 0.09 : 0;
    this.player.rotation = Phaser.Math.Linear(this.player.rotation, tilt, 0.2);

    // 连击衰减
    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // R4 相机前视：朝移动方向偏移视角（预判感）
    const cam = this.cameras.main;
    this.lookX = Phaser.Math.Linear(this.lookX ?? 0, vec.x * 70, 0.04);
    this.lookY = Phaser.Math.Linear(this.lookY ?? 0, vec.y * 70, 0.04);
    cam.setFollowOffset(-this.lookX, -this.lookY);

    // R5 冲刺：冷却期间不可用；冲刺中高速+无敌+残影
    this.dashCd = Math.max(0, this.dashCd - delta);
    const dashing = this.time.now < this.dashUntil;
    if (dashing) {
      this.player.setVelocity(this.dashDir.x * PLAYER.SPEED * 3.4, this.dashDir.y * PLAYER.SPEED * 3.4);
      ps.invincibleUntil = Math.max(ps.invincibleUntil, this.dashUntil + 60);
      // 残影（R6：拉伸拖尾造型）
      if (!this._ghostTick || this.time.now - this._ghostTick > 40) {
        this._ghostTick = this.time.now;
        const ghost = this.add.image(this.player.x, this.player.y, 'player')
          .setDepth(4).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5)
          .setScale(this.player.scale * 1.15, this.player.scale * 0.9)
          .setRotation(Math.atan2(this.dashDir.y, this.dashDir.x));
        this.tweens.add({ targets: ghost, alpha: 0, duration: 280, onComplete: () => ghost.destroy() });
      }
    }

    // 角色进化：等级跨档时应用新形态（体型/光环/星豆）
    const tier = this.evoTierForLevel(ps.level);
    if (tier !== this._evoTier) this.applyEvolution(tier, false);

    // 呼吸脉动（替代旧 tween：与进化基础缩放叠加）
    const pulse = 1 + 0.05 * Math.sin(this.time.now / 500);
    this.player.setScale(this.playerBaseScale * pulse);

    // 进化层跟随：光环随体缩放微旋，星豆环绕
    if (this._evoRing) {
      this._evoRing.setPosition(this.player.x, this.player.y);
      this._evoRing.rotation += delta / 900;
      this._evoRing.setScale(this.playerBaseScale * 0.62);
    }
    if (this._evoOrbs.length) {
      this._evoOrbs.forEach((orb, i) => {
        const a = this.time.now / 650 + (Math.PI * 2 * i) / this._evoOrbs.length;
        orb.setPosition(this.player.x + Math.cos(a) * 36 * this.playerBaseScale, this.player.y + Math.sin(a) * 36 * this.playerBaseScale);
      });
    }

    const invincible = this.time.now < ps.invincibleUntil;
    this.player.setAlpha(invincible ? (Math.floor(this.time.now / 80) % 2 ? 0.35 : 0.9) : 1);

    this.enemies.children.iterate((e) => {
      if (!e) return;
      // 精英金环跟随
      if (e.ring) e.ring.setPosition(e.x, e.y);
      // R1+R14 统一缩放合成：基础尺寸 × 相位脉动 × 受击冲压
      if (e.punch > 0) e.punch = Math.max(0, e.punch - delta * 0.0016);
      if (!e.isBoss && this.time.now > (e.warpUntil || 0)) {
        const pulse = 1 + 0.06 * Math.sin(this.time.now / 240 + (e.phase || 0));
        e.setScale((e.baseScale || 1) * pulse * (1 + (e.punch || 0)));
      }
      const dir = new Phaser.Math.Vector2(this.player.x - e.x, this.player.y - e.y);
      const dist = dir.length();
      if (dist > SPAWN.despawnDist && !e.isBoss) {
        if (e.ring) e.ring.destroy();
        e.destroy();
        return;
      }

      // R6 远程兵：保持距离 + 周期射击
      if (e.kind === 'shooter') {
        e.shootTimer = (e.shootTimer || 1800) - delta;
        const desired = 300;
        let vx = 0, vy = 0;
        if (dist > desired + 50) { dir.normalize(); vx = dir.x * e.speed; vy = dir.y * e.speed; }
        else if (dist < desired - 70) { dir.normalize(); vx = -dir.x * e.speed; vy = -dir.y * e.speed; }
        e.kb.scale(0.86);
        e.setVelocity(vx + e.kb.x, vy + e.kb.y);
        e.rotation += (e.spin * delta) / 1000;
        if (e.shootTimer <= 0 && dist < 540) {
          e.shootTimer = 2300;
          const a = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
          this.spawnEBullet(e.x, e.y, a);
        }
        return;
      }
      // 通用追踪
      const slow = this.time.now < (e.slowUntil || 0) ? (e.slowMul || 0.5) : 1;
      dir.normalize().scale(e.speed * slow).add(e.kb);

      // R13 冲锋怪：接近→前摇闪红→直线冲锋
      if (e.kind === 'charger') {
        e.ai = e.ai || { phase: 'seek', t: 0 };
        if (e.ai.phase === 'seek') {
          if (dist < 380) {
            e.ai.phase = 'windup';
            e.ai.t = 700;
            e.ai.dir = dir.clone().normalize();
            e.setTintFill(0xff6666);
          }
        } else if (e.ai.phase === 'windup') {
          e.ai.t -= delta;
          e.setVelocity(0, 0);
          if (e.ai.t <= 0) {
            e.ai.phase = 'charge';
            e.ai.t = 460;
            e.clearTint();
            sfx.hit();
          }
        } else if (e.ai.phase === 'charge') {
          e.ai.t -= delta;
          e.setVelocity(e.ai.dir.x * e.speed * 3.4, e.ai.dir.y * e.speed * 3.4);
          if (e.ai.t <= 0) e.ai.phase = 'seek';
        }
        return;
      }

      // R14 自爆怪：贴近后引信闪烁→爆炸
      if (e.kind === 'bomber') {
        if (e.fuse === undefined) {
          if (dist < 100) {
            e.fuse = 900;
            e.setTintFill(0xffaa00);
          }
        } else {
          e.fuse -= delta;
          e.setVelocity(0, 0);
          e.setAlpha(Math.floor(e.fuse / 90) % 2 ? 1 : 0.3);
          if (e.fuse <= 0) {
            const boom = this.add.circle(e.x, e.y, 30, 0xf97316, 0.7).setDepth(9);
            this.tweens.add({ targets: boom, radius: 115, alpha: 0, duration: 320, onComplete: () => boom.destroy() });
            this.cameras.main.shake(160, 0.01);
            sfx.wrong();
            if (!ps.dead && dist < 115) this.onPlayerHit(player, e);
            e.destroy();
          }
          return;
        }
      }

      // R15 召唤师：远程保持距离，周期召唤小个体
      if (e.kind === 'summoner') {
        e.ai = e.ai || { t: 3000 };
        e.ai.t -= delta;
        const desired = 380;
        let vx = 0, vy = 0;
        if (dist > desired + 60) { dir.normalize(); vx = dir.x * e.speed; vy = dir.y * e.speed; }
        else if (dist < desired - 80) { dir.normalize(); vx = -dir.x * e.speed; vy = -dir.y * e.speed; }
        e.setVelocity(vx, vy);
        if (e.ai.t <= 0) {
          e.ai.t = 4500;
          for (let i = 0; i < 2; i++) {
            const m = this.spawnEnemy(ENEMY.mini, 'mini');
            m.setPosition(e.x + Phaser.Math.Between(-30, 30), e.y + Phaser.Math.Between(-30, 30));
          }
          this.showFloat(e.x, e.y - 30, '召唤！', '#a78bfa', 13);
        }
        return;
      }

      e.kb.scale(0.86);
      e.setVelocity(dir.x, dir.y);
      e.rotation += (e.spin * delta) / 1000;
      // R14 追踪浮动：朝向玩家的轻微脉动
      if (!e.isBoss) {
        const pulse = 1 + 0.06 * Math.sin(this.time.now / 240 + (e.phase || 0));
        e.setScale((e.baseScale || 1) * pulse);
      }
    });

    this.bubbles.children.iterate((b) => {
      if (b && b.label) b.label.setPosition(b.x, b.y);
    });

    // 追踪弹转向
    this.missiles.children.iterate((m) => {
      if (!m) return;
      m.life -= delta;
      if (!m.target || !m.target.active) {
        m.target = this.nearestEnemy(700);
      }
      if (m.target && m.target.active) {
        const want = Phaser.Math.Angle.Between(m.x, m.y, m.target.x, m.target.y);
        const cur = Math.atan2(m.body.velocity.y, m.body.velocity.x);
        let diff = Phaser.Math.Angle.Wrap(want - cur);
        diff = Phaser.Math.Clamp(diff, -0.09, 0.09);
        const a = cur + diff;
        m.setVelocity(Math.cos(a) * 330, Math.sin(a) * 330);
        m.rotation = a;
      }
      if (m.life <= 0) m.destroy();
    });

    // 回旋刃折返
    this.boomers.children.iterate((bo) => {
      if (!bo) return;
      bo.rotation += delta / 60;
      if (bo.phase === 'out') {
        const d = Phaser.Math.Distance.Between(bo.x, bo.y, bo.startX, bo.startY);
        if (d >= bo.maxDist) {
          bo.phase = 'back';
          bo.hitSet.clear();
        }
      } else {
        const want = Phaser.Math.Angle.Between(bo.x, bo.y, this.player.x, this.player.y);
        bo.setVelocity(Math.cos(want) * 380, Math.sin(want) * 380);
        if (Phaser.Math.Distance.Between(bo.x, bo.y, this.player.x, this.player.y) < 26) bo.destroy();
      }
    });

    this.bullets.children.iterate((b) => {
      if (!b) return;
      b.life -= delta;
      // 正弦波弹道：垂直于基准方向的正弦偏移
      if (b.wave) {
        b.wave.t += delta / 1000;
        const a = b.wave.base + Math.sin(b.wave.t * b.wave.freq) * b.wave.amp;
        b.setVelocity(Math.cos(a) * b.wave.speed, Math.sin(a) * b.wave.speed);
        b.rotation = a;
      }
      // R20 弹道色变：生命周期内青→金渐隐
      const t = Phaser.Math.Clamp(b.life / WEAPON.lifetimeMs, 0, 1);
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        { r: 0x22, g: 0xd3, b: 0xee }, { r: 0xfb, g: 0xbf, b: 0x24 }, 100, Math.round(t * 100)
      );
      b.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
      if (b.life <= 0) b.destroy();
    });

    this.ebullets.children.iterate((b) => {
      if (!b) return;
      b.life -= delta;
      if (b.life <= 0) b.destroy();
    });

    // 索敌锁定指示器
    const tgt = this.nearestEnemy(WEAPON.range);
    if (tgt) {
      this.lockon.setVisible(true).setPosition(tgt.x, tgt.y);
      this.lockon.setRotation(this.lockon.rotation + delta / 500);
    } else {
      this.lockon.setVisible(false);
    }

    this.fireCooldown -= delta;
    if (this.fireCooldown <= 0) {
      this.fireCooldown = ps.fireInterval;
      this.fireVolley();
    }

    this.updateGems(delta);
    this.skillTick(delta);
    this.weaponTick(delta);
    this.bossTick(delta);
    this.waveDirector(delta);
  }

  gridFollow() {
    const cam = this.cameras.main;
    this.grid.tilePositionX = cam.scrollX;
    this.grid.tilePositionY = cam.scrollY;
  }
}
