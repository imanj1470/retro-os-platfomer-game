import Phaser from 'phaser';
import { BaseLevelScene } from '../../../core/BaseLevelScene';
import { GAME_HEIGHT, GAME_WIDTH, SceneKeys } from '../../../core/constants';
import { emitGame } from '../../../core/events';
import { Helper } from '../../../core/Helper';
import { HUD } from '../../../core/HUD';
import { sfx } from '../../../core/sfx';
import { getInventory, setInventory, type Win10Inventory } from '../../../core/state';
import { TextPrompt } from '../../../core/TextPrompt';
import { Blocky, BLOCKY_TEXTURE } from './Blocky';
import { Combat } from './Combat';
import { drawDesktop, UI_FONT, WIN10_FLOOR } from './Win10Theme';

export interface HubReturn { spawnX: number; spawnY: number }

export abstract class Win10StageScene extends BaseLevelScene {
  protected readonly levelId = 'win10' as const;
  protected blocky!: Blocky;
  protected combat!: Combat;
  protected inventory!: Win10Inventory;
  protected departing = false;
  protected dead = false;
  private hp = 3;
  private home?: HubReturn;

  protected setupStage(title: string, data: Partial<HubReturn> = {}, width = GAME_WIDTH): void {
    this.home = data.spawnX !== undefined && data.spawnY !== undefined ? { spawnX: data.spawnX, spawnY: data.spawnY } : undefined;
    this.hp = 3;
    this.dead = this.departing = false;
    this.setupWorld(width, GAME_HEIGHT, 0x0b1a3a);
    drawDesktop(this, width);
    this.helper = new Helper(this, 'win10');
    this.hud = new HUD(this);
    this.prompt = new TextPrompt(this, 'win10');
    this.hud.setLeft(title);
    this.updateHearts();
    Blocky.prepare(this);
    const x = this.home?.spawnX ?? 82;
    const y = this.home?.spawnY ?? WIN10_FLOOR - 24;
    this.spawnPlayer(x, y, { texture: BLOCKY_TEXTURE, moveSpeed: 245 });
    this.player.sprite.setCollideWorldBounds(true).setDepth(50);
    if (width === GAME_WIDTH) this.cameras.main.stopFollow();
    else this.cameras.main.centerOn(x, GAME_HEIGHT / 2);
    this.setCheckpoint(x, y);
    this.platform(width / 2, WIN10_FLOOR, width, false);
    this.blocky = new Blocky(this, this.player);
    this.combat = new Combat(this, this.player);
    this.refreshGear();
  }

  protected setupApp(title: string, data: Partial<HubReturn> = {}): void {
    this.setupStage(title);
    this.home = data.spawnX !== undefined && data.spawnY !== undefined ? { spawnX: data.spawnX, spawnY: data.spawnY } : undefined;
  }

  protected platform(x: number, y: number, width: number, oneWay = true): void {
    const zone = this.add.zone(x, y, width, 12).setOrigin(0.5, 0);
    this.physics.add.existing(zone, true);
    const body = zone.body as Phaser.Physics.Arcade.StaticBody;
    if (oneWay) body.checkCollision.down = body.checkCollision.left = body.checkCollision.right = false;
    this.physics.add.collider(this.player.sprite, zone, undefined, () => {
      if (!oneWay) return true;
      const player = this.player.sprite.body as Phaser.Physics.Arcade.Body;
      return player.velocity.y >= 0 && player.prev.y + player.height <= y + 2;
    });
  }

  protected refreshGear(): void {
    this.inventory = getInventory(this);
    this.blocky.setGear(this.inventory);
    this.combat.setGear(this.inventory);
  }

  protected collect(item: string, flags: Partial<Win10Inventory> = {}, sound: 'collect' | 'chimeWin10' = 'collect'): void {
    setInventory(this, flags);
    this.refreshGear();
    sfx(sound);
    emitGame('collect', { level: 'win10', item });
  }

  protected near(x: number, y: number, dx = 36, dy = 38): boolean {
    return Math.abs(this.player.sprite.x - x) <= dx && Math.abs(this.player.sprite.y - y) <= dy;
  }

  protected addDoor(): void {
    this.add.rectangle(43, 515, 34, 81, 0x284966).setStrokeStyle(2, 0x9fc9ea);
    this.add.text(43, 515, '←', { fontFamily: UI_FONT, fontSize: '21px' }).setOrigin(0.5);
  }

  protected checkDoor(): void {
    if (this.near(42, WIN10_FLOOR - 24, 15, 29)) {
      this.departing = true;
      this.goTo(SceneKeys.Win10Hub, this.home);
    }
  }

  protected get playerHitRemaining(): number { return this.hp; }

  protected onHurt(): 'survive' | 'dead' {
    this.hp--;
    this.updateHearts();
    return this.hp <= 0 ? 'dead' : 'survive';
  }

  protected onDeath(reason: string): void {
    this.dead = true;
    this.player.setControlsEnabled(false);
    this.player.sprite.setVelocity(0);
    this.combat.reset();
    this.hud.showBanner('Recycle Bin', 500);
    super.onDeath(reason);
  }

  protected onRespawn(): void {
    this.dead = false;
    this.hp = 3;
    this.updateHearts();
    this.refreshGear();
    this.player.setControlsEnabled(true);
  }

  private updateHearts(): void { this.hud.setRight('♥'.repeat(this.hp) + '♡'.repeat(3 - this.hp)); }

  protected tick(time: number, delta: number): void {
    if (!this.departing && !this.dead && !this.prompt.isOpen && !this.physics.world.isPaused) {
      this.combat.update(delta, this.movementScale());
      this.helper.update(this.player.sprite.x, this.player.sprite.y);
      this.play(time, delta);
    }
    this.blocky.update(time, this.combat.isSwinging, this.combat.isShielding);
  }

  protected movementScale(): number { return 1; }
  protected abstract play(time: number, delta: number): void;
}
