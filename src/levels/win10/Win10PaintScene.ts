import Phaser from 'phaser';
import { SceneKeys } from '../../core/constants';
import { sfx } from '../../core/sfx';
import { Win10StageScene, type HubReturn } from './shared/Win10StageScene';
import { drawWindow, TURQUOISE, UI_FONT } from './shared/Win10Theme';

const SWATCHES = [
  { name: 'Red', color: 0xd65058 }, { name: 'Gold', color: 0xf4bb48 }, { name: 'Iron', color: 0x8c9bad },
  { name: 'Leather', color: 0x965f43 }, { name: 'Black', color: 0x21293a }, { name: 'Turquoise', color: TURQUOISE },
];
const SWATCH_Y = 500;
const TOOL_Y = 244;
const TOOLS = [
  { x: 126, name: 'Paintbrush', flag: 'sword', hint: "A brush. Swing it with J. It's basically a sword." },
  { x: 235, name: 'Eraser', flag: 'shield', hint: 'An eraser. Hold K to block. Erase your problems.' },
  { x: 344, name: 'Fill bucket', flag: 'bucket', hint: 'Touch a colour, then press E at an armour outline.' },
] as const;

const PATTERNS = [
  ['1111', '1111', '1001'],
  ['010010', '111111', '011110', '011110'],
  ['11111', '11111', '11011', '11011'],
  ['11011', '11011', '11111'],
];
const ARMOUR = [
  { x: 445, y: 322, name: 'Helmet' }, { x: 611, y: 331, name: 'Chestplate' },
  { x: 445, y: 435, name: 'Leggings' }, { x: 611, y: 447, name: 'Boots' },
];
interface ArmourPiece {
  x: number;
  y: number;
  color?: number;
  art: Phaser.GameObjects.Graphics;
}
interface Pickup {
  tool: typeof TOOLS[number];
  art: Phaser.GameObjects.Container;
}
const swatchX = (index: number) => 100 + index * 45;

export default class Win10PaintScene extends Win10StageScene {
  private bucket = false;
  private color?: number;
  private equipping = false;
  private pieces: ArmourPiece[] = [];
  private pickups: Pickup[] = [];
  private bucketBadge!: Phaser.GameObjects.Graphics;
  private dummy!: Phaser.GameObjects.Container;
  private dummyBounds = new Phaser.Geom.Rectangle(688, 499, 47, 58);
  private trainingShot!: Phaser.GameObjects.Arc;
  private practiceTime = 0;
  private swatchIndex?: number;

  constructor() { super(SceneKeys.Win10Paint); }

  create(data: Partial<HubReturn> = {}): void {
    this.setupApp('Paint', data);
    drawWindow(this, 'Paint  /  Armour workshop');
    this.add.text(49, 103, 'Collect the tools, select a colour, then press E on an outline.', {
      fontFamily: UI_FONT, fontSize: '14px', color: '#425d77',
    });
    this.addDoor();
    this.bucket = false;
    this.color = undefined;
    this.equipping = false;
    this.practiceTime = 0;
    this.swatchIndex = undefined;
    this.pickups = [];
    this.add.rectangle(549, 384, 337, 214, 0xffffff).setStrokeStyle(1, 0xc1d4e5);
    this.add.rectangle(126, 420, 116, 9, 0x92b4d0);
    this.platform(126, 415, 116);
    this.add.rectangle(126, 333, 116, 9, 0x92b4d0);
    this.platform(126, 328, 116);
    this.makeToolbar();
    this.makePalette();
    this.pieces = ARMOUR.map(({ x, y, name }, index) => {
      this.add.text(x, y + 54, name, { fontFamily: UI_FONT, fontSize: '12px', color: '#344f6b' }).setOrigin(0.5);
      this.platform(x, y, 98);
      const piece: ArmourPiece = { x, y, art: this.add.graphics().setPosition(x, y),
        color: this.inventory.armour ? TURQUOISE : undefined };
      this.drawPiece(piece, index);
      return piece;
    });
    this.bucketBadge = this.add.graphics().setDepth(56).setVisible(false);
    this.dummy = this.add.container(712, 530, [
      this.add.rectangle(0, 0, 42, 43, 0xf6d878).setStrokeStyle(1, 0xae854a),
      this.add.text(0, -3, '•  •\n  —', { fontFamily: UI_FONT, fontSize: '13px', color: '#514134' }).setOrigin(0.5),
      this.add.text(0, -34, 'Practice  J / K', { fontFamily: UI_FONT, fontSize: '12px', color: '#425d77' }).setOrigin(0.5),
    ]);
    this.trainingShot = this.add.circle(0, 0, 5, 0xdf9a3e).setDepth(24).setVisible(false);
  }

  private makeToolbar(): void {
    for (const tool of TOOLS) {
      this.add.rectangle(tool.x, TOOL_Y - 24, 101, 56, 0xe5edf5).setStrokeStyle(1, 0x9cb7d0);
      this.add.text(tool.x, TOOL_Y + 14, tool.name, { fontFamily: UI_FONT, fontSize: '12px', color: '#274965' }).setOrigin(0.5);
      this.platform(tool.x, TOOL_Y, 101);
      if (tool.flag !== 'bucket' && this.inventory[tool.flag]) continue;
      const logo = this.add.graphics();
      if (tool.flag === 'sword') {
        logo.lineStyle(5, 0xa4673d).lineBetween(-12, 15, 8, -11).fillStyle(0x218f88).fillRect(3, -18, 12, 14);
      } else if (tool.flag === 'shield') {
        logo.fillStyle(0xc05b85).fillRoundedRect(-14, -10, 28, 19, 4)
          .fillStyle(0xff9dbb).fillRoundedRect(-14, -12, 19, 17, 4);
      } else {
        logo.fillStyle(0x52768d).fillRoundedRect(-12, -8, 24, 20, 4).lineStyle(3, 0x7eabc1).strokeCircle(0, -7, 8);
      }
      const star = this.add.star(17, -17, 4, 2, 5, 0xffffff);
      const art = this.add.container(tool.x, TOOL_Y - 27, [logo, star]).setDepth(20);
      this.pickups.push({ tool, art });
      this.tweens.add({ targets: art, y: art.y - 8, duration: 550, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: star, alpha: 0.25, duration: 430, yoyo: true, repeat: -1 });
    }
  }

  private makePalette(): void {
    this.platform(212.5, SWATCH_Y, 270);
    for (const [index, swatch] of SWATCHES.entries()) {
      const locked = swatch.color === TURQUOISE && !this.inventory.turquoise;
      const x = swatchX(index);
      this.add.rectangle(x, SWATCH_Y - 14, 40, 28, locked ? 0x8c9bad : swatch.color).setStrokeStyle(2, 0xffffff);
      this.add.text(x, SWATCH_Y + 10, locked ? '?' : swatch.name, {
        fontFamily: UI_FONT, fontSize: '10px', color: '#344e68',
      }).setOrigin(0.5, 0);
      if (locked) this.add.text(x, SWATCH_Y - 15, '?', { fontFamily: UI_FONT, fontSize: '17px' }).setOrigin(0.5);
    }
  }

  private drawPiece(piece: ArmourPiece, index: number): void {
    const pattern = PATTERNS[index];
    const art = piece.art.clear();
    const offset = -pattern[0].length * 6;
    for (const [row, cells] of pattern.entries()) {
      for (const [col, bit] of [...cells].entries()) {
        if (bit !== '1') continue;
        const x = offset + col * 12;
        const y = row * 11;
        if (piece.color === undefined) art.lineStyle(1, 0x7193ae).strokeRect(x + 1, y + 1, 9, 8);
        else art.fillStyle(piece.color).fillRect(x, y, 12, 11);
      }
    }
  }

  private takeTools(): void {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const { art, tool } = this.pickups[i];
      if (!this.near(art.x, art.y, 24, 29)) continue;
      this.tweens.killTweensOf([art, ...art.list]);
      art.destroy();
      this.pickups.splice(i, 1);
      if (tool.flag === 'bucket') {
        this.bucket = true;
        this.collect(tool.name);
      } else {
        this.collect(tool.name, { [tool.flag]: true });
      }
      void this.helper.say(tool.hint);
    }
  }

  private selectColor(): void {
    const index = SWATCHES.findIndex((_, i) => this.near(swatchX(i), SWATCH_Y - 19, 22, 26));
    if (index < 0) {
      this.swatchIndex = undefined;
      return;
    }
    if (index === this.swatchIndex) return;
    this.swatchIndex = index;
    const { name, color } = SWATCHES[index];
    if (color === TURQUOISE && !this.inventory.turquoise) {
      this.color = undefined;
      this.hud.showBanner('Turquoise locked · find the swatch in Photos', 1700);
      void this.helper.say('Find the turquoise swatch in Photos first.');
      return;
    }
    this.color = color;
    this.hud.setLeft(`Paint · ${name}`);
  }

  private fillPiece(index: number): void {
    const piece = this.pieces[index];
    if (this.inventory.armour || this.equipping) return;
    if (!this.bucket || this.color === undefined) {
      this.hud.showBanner(this.bucket ? 'Touch a swatch to select a colour' : 'Pick up the fill bucket', 1400);
      return;
    }
    piece.color = this.color;
    this.drawPiece(piece, index);
    this.tweens.killTweensOf(piece.art);
    this.tweens.add({ targets: piece.art.setAlpha(0.42), alpha: 1, duration: 190 });
    sfx('collect');
    if (this.color !== TURQUOISE) {
      const color = SWATCHES.find((item) => item.color === this.color)?.name;
      const hint = color === 'Gold' ? 'Gold armour? Bold. Wrong, but bold.'
        : color === 'Leather' ? 'Leather. Very… early game.' : 'That shade does not match the turquoise sample.';
      void this.helper.say(hint, { holdMs: 1800 });
      return;
    }
    if (!this.pieces.every((item) => item.color === TURQUOISE)) return;
    this.equipArmour();
  }

  private equipArmour(): void {
    this.equipping = true;
    this.player.setControlsEnabled(false);
    this.player.sprite.setVelocityX(0);
    const sprite = this.player.sprite;
    this.pieces.forEach(({ art }, i) => {
      art.setDepth(55);
      this.tweens.add({ targets: art, x: sprite.x, y: sprite.y - 23 + i * 11,
        alpha: 0, scale: 0.2, duration: 370, delay: i * 65, ease: 'Quad.easeIn' });
    });
    this.time.delayedCall(590, () => {
      this.collect('Turquoise armour', { armour: true });
      this.equipping = false;
      if (!this.dead) this.player.setControlsEnabled(true);
      void this.helper.say('Diamond-tier drip. Now: Word.');
    });
  }

  private practice(delta: number): void {
    const hitbox = this.combat.hitbox;
    if (hitbox && Phaser.Geom.Intersects.RectangleToRectangle(hitbox, this.dummyBounds)) {
      this.helper.sayOnce('practice-swing', 'Nice swing. That brush is ready.');
      if (this.dummy.angle === 0) this.tweens.add({ targets: this.dummy, angle: 11, duration: 95, yoyo: true });
    }
    this.practiceTime = Math.max(0, this.practiceTime - delta);
    if (!this.trainingShot.visible && !this.practiceTime && this.inventory.shield && this.near(620, 536, 80, 25)) {
      this.trainingShot.setPosition(687, 532).setVisible(true);
      this.practiceTime = 2100;
    }
    if (!this.trainingShot.visible) return;
    this.trainingShot.x -= delta * 0.13;
    if (this.near(this.trainingShot.x, this.trainingShot.y, 19, 21)) {
      if (this.combat.blocks(this.trainingShot.x)) {
        sfx('reflect');
        this.helper.sayOnce('practice-block', 'Blocked. Face the threat and hold K.');
      }
      this.trainingShot.setVisible(false);
    } else if (this.trainingShot.x < 499) {
      this.trainingShot.setVisible(false);
    }
  }

  protected play(_time: number, delta: number): void {
    if (!this.equipping) this.checkDoor();
    if (this.departing) return;
    this.takeTools();
    this.selectColor();
    const p = this.player.sprite;
    this.bucketBadge.clear().setPosition(p.x, p.y - 37).setVisible(this.bucket)
      .fillStyle(0x476578).fillRoundedRect(-8, -5, 16, 12, 3)
      .lineStyle(2, 0x8aaabd).strokeCircle(0, -4, 5)
      .fillStyle(this.color ?? 0xd3dee6).fillRect(-5, -1, 10, 5);
    if (this.player.justPressed('interact')) {
      const index = this.pieces.findIndex(({ x, y }) => this.near(x, y - 13, 53, 43));
      if (index >= 0) this.fillPiece(index);
    }
    this.practice(delta);
  }
}
