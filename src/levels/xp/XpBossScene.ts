import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SceneKeys } from '../../core/constants';
import { ensureTexture } from '../../core/art';
import { emitGame } from '../../core/events';
import { sfx } from '../../core/sfx';
import { ANCHORS, ANCHOR_Y, BUDDY_COLORS, BUDDY_FLOOR, BuddyWare } from './boss/BuddyWare';
import { AppWindow } from './shared/AppWindow';
import { oneWay, solid, XpScene, XP_FLOOR } from './shared/XpScene';

const NAME = 'BuddyWare.exe';
const MAX_HP = 3;
const COOLDOWN = 3000;
const TRAP_MS = 800;
const PLATFORMS = [
  { x: 120, y: 456, texture: 'xp-word' },
  { x: 260, y: 350, texture: 'xp-excel' },
  { x: 400, y: 456, texture: 'xp-mail' },
  { x: 540, y: 350, texture: 'xp-ppt' },
  { x: 680, y: 456, texture: 'xp-excel' },
];
const LOCKOUTS = [
  { x: 25, y: 410 }, { x: 330, y: 478 }, { x: 635, y: 369 },
];
const LOCK_W = 140;
const LOCK_H = 90;

interface WindowButton {
  x: number;
  icon: Phaser.GameObjects.Text;
  fill: Phaser.GameObjects.Rectangle;
  cooldown: number;
  ready?: boolean;
}

interface DeniedZone {
  body: ReturnType<typeof solid>['body'];
  art: Phaser.GameObjects.Container;
  warning: Phaser.GameObjects.Graphics;
  stripes: Phaser.GameObjects.Graphics;
}

type Phase = 'install' | 'fight' | 'defeat' | 'update' | 'depart';

export default class XpBossScene extends XpScene {
  private buddy!: BuddyWare;
  private buttons: WindowButton[] = [];
  private zones: DeniedZone[] = [];
  private trap?: AppWindow;
  private trapRemaining = 0;
  private trappedTaunt = false;
  private playerHp = MAX_HP;
  private bossHp = MAX_HP;
  private hitStop = 0;
  private fightTime = 0;
  private phase: Phase = 'install';
  private phaseTime = 0;
  private install!: Phaser.GameObjects.Container;
  private installFill!: Phaser.GameObjects.Rectangle;
  private updateRing!: Phaser.GameObjects.Graphics;
  private updateText!: Phaser.GameObjects.Text;
  private readonly skipUpdate = () => this.finishUpdate();

  constructor() { super(SceneKeys.XpBoss); }

  create(): void {
    this.createDesktop(true);
    this.buddy = new BuddyWare(this);
    this.trap = undefined;
    this.phase = 'install';
    this.phaseTime = 0;
    this.player.setControlsEnabled(false);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown', this.skipUpdate));

    for (const { x, y, texture } of PLATFORMS) {
      this.add.image(x, y + 17, texture).setDisplaySize(42, 42);
      oneWay(this, this.player.sprite, x - 37, y, 74);
    }
    for (const x of ANCHORS) {
      this.add.text(x, ANCHOR_Y, '↗', {
        fontFamily: 'Tahoma', fontSize: '19px', backgroundColor: '#2255a6',
        padding: { x: 6, y: 2 },
      }).setOrigin(0.5).setDepth(21);
    }
    this.buttons = [120, 680].map((x) => this.makeButton(x));
    this.zones = LOCKOUTS.map(({ x, y }) => this.makeZone(x, y));
    this.hud.showBossBar(NAME, MAX_HP);
    this.resetHealth();

    this.installFill = this.add.rectangle(-134, 14, 268, 12, 0x4cae43).setOrigin(0, 0.5).setScale(0, 1);
    this.install = this.add.container(400, 280, [
      this.add.rectangle(0, 0, 302, 92, 0xf4efd9).setStrokeStyle(3, 0x245ed1),
      this.add.text(0, -18, `Installing ${NAME}…`, { fontFamily: 'Tahoma', color: '#19335e' }).setOrigin(0.5),
      this.add.rectangle(0, 14, 270, 14, 0xd4dccd).setStrokeStyle(1, 0x81938a),
      this.installFill,
    ]).setDepth(1100);
    void this.helper.say('It installed itself. Of course it did.', { holdMs: 2800 });
  }

  private makeButton(x: number): WindowButton {
    const icon = this.add.text(x, 516, '+', {
      fontFamily: 'Tahoma', fontSize: '24px', fontStyle: 'bold',
      backgroundColor: '#297e3b', padding: { x: 12, y: 0 },
    }).setOrigin(0.5);
    this.add.text(x, 542, 'E  New Window', { fontFamily: 'Tahoma', fontSize: '13px',
      stroke: '#17355c', strokeThickness: 4 }).setOrigin(0.5);
    this.add.rectangle(x, 555, 76, 5, 0x354958);
    const fill = this.add.rectangle(x - 38, 555, 76, 5, 0x83da58).setOrigin(0, 0.5);
    return { x, icon, fill, cooldown: 0 };
  }

  private makeZone(x: number, y: number): DeniedZone {
    const zone = solid(this, x, y, LOCK_W, LOCK_H);
    zone.body.enable = false;
    this.physics.add.collider(this.player.sprite, zone, () => this.hurtPlayer('access denied'));
    const warning = this.add.graphics().lineStyle(2, 0x343b43);
    for (let i = 0; i < LOCK_W; i += 14) {
      warning.lineBetween(i, 0, i + 8, 0).lineBetween(i, LOCK_H, i + 8, LOCK_H);
    }
    for (let i = 0; i < LOCK_H; i += 14) {
      warning.lineBetween(0, i, 0, i + 7).lineBetween(LOCK_W, i, LOCK_W, i + 7);
    }
    const stripes = this.add.graphics().fillStyle(0x858b91).fillRect(0, 0, LOCK_W, LOCK_H).lineStyle(5, 0xa5aab0);
    for (let offset = -LOCK_H; offset < LOCK_W; offset += 14) {
      const x1 = Math.max(0, offset);
      const x2 = Math.min(LOCK_W, offset + LOCK_H);
      stripes.lineBetween(x1, LOCK_H - (x1 - offset), x2, LOCK_H - (x2 - offset));
    }
    const label = this.add.text(LOCK_W / 2, LOCK_H / 2, 'ACCESS DENIED', {
      fontFamily: 'Tahoma', fontSize: '12px', fontStyle: 'bold', backgroundColor: '#42464a',
      padding: { x: 4, y: 3 },
    }).setOrigin(0.5);
    const art = this.add.container(x, y, [warning, stripes, label]).setDepth(17).setVisible(false);
    return { body: zone.body, art, warning, stripes };
  }

  private clearZones(): void {
    for (const zone of this.zones) {
      zone.body.enable = false;
      zone.art.setVisible(false);
    }
  }

  private showZones(): void {
    if (this.buddy.state !== 'BLOCK') {
      this.clearZones();
      return;
    }
    const active = this.buddy.elapsed >= 1000;
    const player = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    for (const [index, zone] of this.zones.entries()) {
      const visible = index < 2 || this.bossHp < MAX_HP;
      zone.art.setVisible(visible);
      zone.warning.setVisible(!active);
      zone.stripes.setVisible(active);
      if (!active || !visible) continue;
      const overlaps = player.right > zone.body.left && player.left < zone.body.right &&
        player.bottom > zone.body.top && player.top < zone.body.bottom;
      if (!zone.body.enable && overlaps) this.hurtPlayer('access denied');
      else zone.body.enable = true;
      if (this.dying) return;
    }
  }

  private resetHealth(): void {
    this.playerHp = this.bossHp = MAX_HP;
    this.hitStop = this.fightTime = 0;
    this.hud.setBossHp(MAX_HP);
    this.refreshPlayerHp();
    for (const button of this.buttons) button.cooldown = 0;
    this.refreshButtons(0);
    this.clearZones();
  }

  private refreshPlayerHp(): void {
    this.hud.setRight(`Clippy ${this.playerHp}/${MAX_HP}`);
  }

  private refreshButtons(delta: number): void {
    for (const button of this.buttons) {
      button.cooldown = Math.max(0, button.cooldown - delta);
      const ready = button.cooldown === 0 && !this.trap;
      if (ready !== button.ready) {
        button.ready = ready;
        button.icon.setBackgroundColor(ready ? '#297e3b' : '#415777')
          .setShadow(0, 0, ready ? '#95ff63' : '#415777', ready ? 9 : 0);
      }
      button.fill.setScale(1 - button.cooldown / COOLDOWN, 1);
    }
  }

  protected get playerHitRemaining(): number { return this.playerHp; }

  protected onHurt(): 'survive' | 'dead' {
    this.playerHp--;
    this.refreshPlayerHp();
    return this.playerHp === 0 ? 'dead' : 'survive';
  }

  protected onDeath(reason: string): void {
    this.trap?.close();
    this.trap = undefined;
    this.buddy.interrupt();
    this.clearZones();
    super.onDeath(reason);
  }

  protected onRespawn(): void {
    super.onRespawn();
    this.resetHealth();
    this.buddy.place(400, 170);
    this.buddy.start();
  }

  private tryTrap(): void {
    const player = this.player.sprite;
    if (!this.player.justPressed('interact') || this.trap || !this.player.isOnGround || player.y < 520) return;
    const button = this.buttons.find(({ x }) => Math.abs(player.x - x) < 44);
    if (!button || button.cooldown > 0) return;

    button.cooldown = COOLDOWN;
    this.trapRemaining = TRAP_MS;
    this.trappedTaunt = this.buddy.state === 'TAUNT';
    this.trap = new AppWindow(this, {
      x: Phaser.Math.Clamp(this.buddy.sprite.x - 110, 0, GAME_WIDTH - 220),
      y: Phaser.Math.Clamp(this.buddy.sprite.y - 90, 0, XP_FLOOR - 180),
      width: 220, height: 180, title: NAME,
    });
  }

  private updateTrap(delta: number): void {
    if (!this.trap) return;
    this.trapRemaining -= delta;
    this.trap.pulse(0.81 + Math.cos(this.trapRemaining / 37) * 0.19);
    if (this.trapRemaining > 0) return;

    const caught = this.trap.closeNow(this.buddy.body);
    this.trap = undefined;
    if (!caught) {
      this.buddy.say('Missed me!');
      this.showTrapHint();
      return;
    }

    this.bossHp--;
    this.hud.setBossHp(this.bossHp);
    emitGame('boss-hit', { boss: NAME, hp: this.bossHp, max: MAX_HP });
    sfx('hurt');
    this.cameras.main.shake(125, 0.004);
    this.buddy.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.clearZones();
    if (this.bossHp === 0) {
      this.beginDefeat();
      return;
    }
    this.hitStop = 150;
    if (this.bossHp === 2) void this.helper.say('One more uninstall step… two actually.', { holdMs: 3200 });
  }

  private showTrapHint(): void {
    this.helper.sayOnce('boss-trap', 'Trap it in a window — use the New Window icon when it stops to show off.');
  }

  private beginDefeat(): void {
    this.phase = 'defeat';
    this.phaseTime = 0;
    this.player.setControlsEnabled(false);
    this.player.sprite.setVelocity(0);
    this.buddy.interrupt();
    const sprite = this.buddy.sprite;
    this.tweens.add({ targets: sprite, angle: 5, duration: 56, yoyo: true, repeat: 2 });
  }

  private dissolve(): void {
    const sprite = this.buddy.sprite;
    ensureTexture(this, 'buddyware-pixel', 4, 4, (g) => { g.fillStyle(0xffffff).fillRect(0, 0, 4, 4); });
    this.add.particles(sprite.x, sprite.y, 'buddyware-pixel', {
      emitting: false, lifespan: { min: 400, max: 900 }, speed: { min: 45, max: 215 },
      gravityY: 110, tint: BUDDY_COLORS, alpha: { start: 1, end: 0 },
    }).setDepth(44).explode(105);
    this.tweens.add({ targets: sprite, alpha: 0, duration: 620 });
    sfx('chimeXp');
    this.hud.showBanner(`${NAME} was successfully uninstalled.`, 1900);
    void this.helper.say('Finally. Okay, I think the system wants to… upgrade?', { holdMs: 2100 });
  }

  private beginUpdate(): void {
    this.phase = 'update';
    this.phaseTime = 0;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x072459).setOrigin(0).setDepth(2000);
    this.updateRing = this.add.graphics().setDepth(2001);
    this.updateText = this.add.text(400, 325, 'Working on updates 0%', {
      fontFamily: 'Tahoma', fontSize: '24px',
    }).setOrigin(0.5).setDepth(2001);
    this.add.text(400, 376, 'Press any key to skip', { fontFamily: 'Tahoma', fontSize: '14px', color: '#c4d7f6' })
      .setOrigin(0.5).setDepth(2001);
    this.input.keyboard?.on('keydown', this.skipUpdate);
  }

  private finishUpdate(): void {
    if (this.phase !== 'update') return;
    this.phase = 'depart';
    this.input.keyboard?.off('keydown', this.skipUpdate);
    this.completeLevel(SceneKeys.Win10Hub);
  }

  private landingY(x: number): number {
    const platform = PLATFORMS.find((item) => Math.abs(item.x - x) <= 34);
    return platform ? platform.y - 36 : BUDDY_FLOOR;
  }

  protected tick(_time: number, delta: number): void {
    if (this.dying || this.phase === 'depart' || this.physics.world.isPaused) return;
    this.phaseTime += delta;
    const player = this.player.sprite;
    this.helper.update(player.x, player.y);

    if (this.phase === 'install') {
      this.installFill.setScale(Math.min(1, this.phaseTime / 1500), 1);
      if (this.phaseTime >= 1500) {
        this.install.setVisible(false);
        const fall = Math.min(1, (this.phaseTime - 1500) / 490);
        this.buddy.place(400, Phaser.Math.Linear(-55, 215, Phaser.Math.Easing.Bounce.Out(fall)));
        if (fall >= 1) {
          this.phase = 'fight';
          this.buddy.start();
          this.buddy.say("Hi! I'm your new best friend!");
          this.player.setControlsEnabled(true);
        }
      }
      return;
    }
    if (this.phase === 'defeat') {
      if (this.phaseTime >= 120) this.buddy.sprite.clearTint();
      if (this.phaseTime >= 420 && this.phaseTime - delta < 420) this.dissolve();
      if (this.phaseTime >= 2600) this.beginUpdate();
      return;
    }
    if (this.phase === 'update') {
      const percent = this.phaseTime < 720 ? 0 : this.phaseTime < 1640 ? 37 : this.phaseTime < 2560 ? 99 : 100;
      this.updateText.setText(`Working on updates ${percent}%`);
      const start = this.phaseTime / 280;
      this.updateRing.clear().lineStyle(5, 0x89c9ff).beginPath()
        .arc(400, 258, 23, start, start + Math.PI * 1.42).strokePath();
      if (this.phaseTime >= 3000) this.finishUpdate();
      return;
    }

    this.refreshButtons(delta);
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - delta);
      if (this.hitStop <= 30) this.buddy.sprite.clearTint();
      if (this.hitStop === 0) this.buddy.restartSwing();
      return;
    }

    this.fightTime += delta;
    if (this.fightTime >= 10000) this.showTrapHint();
    this.tryTrap();
    this.buddy.tick(delta, MAX_HP - this.bossHp, player.x, (x) => this.landingY(x), !!this.trap && this.trappedTaunt);
    this.showZones();
    if (this.dying) return;
    if (this.physics.overlap(player, this.buddy.sprite)) {
      const grabbing = this.buddy.state === 'GRAB';
      if (grabbing) this.buddy.grabHit();
      this.hurtPlayer(grabbing ? 'grab' : 'contact');
    }
    if (!this.dying) this.updateTrap(delta);
  }
}
