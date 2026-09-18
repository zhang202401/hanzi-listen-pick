import Phaser from 'phaser';
import { buildPlaceholderTextures } from '../systems/textures.js';

/** 启动场景：生成占位纹理 → 直接进标题（以后这里加载用户素材） */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // 卡片图样（缺图不阻塞：UIScene 自动回退 emoji）
    const CARD_IDS = [
      'big', 'small', 'water', 'mountain', 'wind', 'fire', 'sun', 'earth',
      'tree', 'gold', 'field', 'stone', 'star', 'foot', 'heart',
      'whirl', 'chain', 'grenade', 'laser', 'missile', 'cluster', 'sine', 'boomer', 'frost', 'mine',
    ];
    CARD_IDS.forEach((id) => this.load.image('card_' + id, 'cards/' + id + '.png'));
    this.load.on('loaderror', () => {});
  }

  create() {
    buildPlaceholderTextures(this);
    this.scene.start('Title');
  }
}
