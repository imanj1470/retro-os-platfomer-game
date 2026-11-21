import Phaser from 'phaser';
import { SceneKeys } from '../../core/constants';
import { AppWindow } from './shared/AppWindow';
import { oneWay, XpScene, XP_FLOOR } from './shared/XpScene';

const APPS = [
  { title: 'Microsoft Word', texture: 'xp-word', x: 180, y: 98, width: 405 },
  { title: 'Microsoft Excel', texture: 'xp-excel', x: 118, y: 128, width: 370 },
  { title: 'Microsoft PowerPoint', texture: 'xp-ppt', x: 237, y: 82, width: 390 },
  { title: 'Outlook Express', texture: 'xp-mail', x: 180, y: 98, width: 405, expansion: 128 },
];
const WINDOW_HEIGHT = 370;
const LADDER_X = 385;
const LADDER_TOP = 278;

export default class XpDesktopScene extends XpScene {
  private app?: AppWindow;
  private cursor!: Phaser.GameObjects.Image;
  private appIndex = 0;
  private escaped = 0;
  private chaseGrace = 0;
  private exitLabel!: Phaser.GameObjects.Text;
  private remaining = 0;
  private finished = false;
  private sideways!: Phaser.Input.Keyboard.Key[];
  private desktopColliders: Phaser.Physics.Arcade.Collider[] = [];

  constructor() { super(SceneKeys.XpDesktop); }

  create(): void {
    this.createDesktop();
    this.app = undefined;
    this.appIndex = 0;
    this.escaped = 0;
    this.chaseGrace = 0;
    this.finished = false;
    this.desktopColliders = [];
    this.sideways = ['LEFT', 'RIGHT', 'A', 'D'].map((key) => this.input.keyboard!.addKey(key));
    this.hud.setLeft('Windows XP');
    this.updateProgress();

    const icons = [
      { ...APPS[0], x: 157, y: 474 },
      { ...APPS[1], x: 292, y: 388 },
      { ...APPS[2], x: 545, y: 310 },
      { ...APPS[3], x: 676, y: 227 },
    ];
    for (const icon of icons) {
      this.add.image(icon.x, icon.y + 17, icon.texture).setDisplaySize(40, 40);
      this.add.text(icon.x, icon.y + 41, icon.title, {
        fontFamily: 'Tahoma', fontSize: '13px', stroke: '#18375d', strokeThickness: 4,
      }).setOrigin(0.5, 0);
      this.desktopColliders.push(oneWay(this, this.player.sprite, icon.x - 34, icon.y, 68).collider);
    }

    ['New mail', 'Updates ready', 'Disk cleanup', 'Security alert'].forEach((message, index) => {
      const y = LADDER_TOP + index * 60;
      this.add.rectangle(LADDER_X, y + 16, 120, 32, 0xf4edda).setStrokeStyle(1, 0x145bd7);
      const header = this.add.image(LADDER_X - 60, y, 'xpprompts').setOrigin(0);
      header.setCrop(0, 0, header.width, 38).setScale(120 / header.width);
      this.add.text(LADDER_X, y + 22, message, {
        color: '#233d63', fontFamily: 'Tahoma', fontSize: '12px',
      }).setOrigin(0.5);
      this.desktopColliders.push(oneWay(this, this.player.sprite, LADDER_X - 60, y, 120,
        () => this.player.isClimbing && this.player.isHeld('down')).collider);
    });

    this.cursor = this.add.image(745, 100, 'xp-cursor').setOrigin(0.17, 0).setDisplaySize(44, 44).setDepth(60);
    this.exitLabel = this.add.text(676, 170, 'Exit to BuddyWare ↑', {
      fontFamily: 'Tahoma', fontSize: '14px', backgroundColor: '#176635', padding: { x: 7, y: 4 },
    }).setOrigin(0.5).setVisible(false);
    void this.helper.say('Rover: Jump across the icons to Outlook. Hold ↑ or ↓ on the stacked alerts.', { holdMs: 5600 });
  }

  private openApp(): void {
    this.exitLabel.setVisible(false);
    this.cursor.setAlpha(1);
    this.player.setClimbing(false);
    for (const collider of this.desktopColliders) collider.active = false;
    const data = APPS[this.appIndex];
    this.app = new AppWindow(this, { ...data, height: WINDOW_HEIGHT });
    this.app.confine(this.player.sprite);
    this.remaining = data.expansion ? 24000 : 16000;
    this.player.reset(data.x + 95, data.y + WINDOW_HEIGHT - 43);
    if (data.expansion) {
      void this.helper.say('Rover: Hold right against the wall until the exit appears.', { holdMs: 4200 });
    } else if (this.appIndex === 0) {
      void this.helper.say('Rover: Jump through the green opening before the pointer closes the window.', { holdMs: 4800 });
    }
  }

  private closeApp(): void {
    this.app?.close();
    this.app = undefined;
  }

  private updateProgress(): void {
    this.hud.setRight(this.escaped ? 'Dodge the pointer' : 'Reach Outlook');
  }

  protected onRespawn(): void {
    super.onRespawn();
    for (const collider of this.desktopColliders) collider.active = true;
    this.appIndex = 0;
    this.escaped = 0;
    this.chaseGrace = 0;
    this.exitLabel.setVisible(false);
    this.cursor.setPosition(745, 100).setAlpha(1);
    this.updateProgress();
  }

  protected tick(_time: number, delta: number): void {
    if (this.dying || this.finished || this.physics.world.isPaused) return;
    const player = this.player.sprite;
    this.helper.update(player.x, player.y);

    const app = this.app;
    if (app) {
      const closing = this.remaining < 3800;
      this.moveCursor(closing ? app.right - 35 : app.right + 18, app.top + 8, 300, delta);
      app.tryExpand(player, delta);
      const body = player.body as Phaser.Physics.Arcade.Body;
      if (body.bottom < app.top) {
        this.closeApp();
        for (const collider of this.desktopColliders) collider.active = true;
        this.escaped++;
        this.chaseGrace = 1300;
        this.cursor.setPosition(Math.min(750, app.right + 58), app.top + 75);
        this.exitLabel.setVisible(true);
        this.updateProgress();
        if (this.escaped === 1) this.helper.sayOnce('pointer-dodge', 'Rover: Reach Outlook again to leave. Dodge the arrow or it will trap you in another window.');
        return;
      }

      this.remaining -= delta;
      app.setStatus(`Closing in ${Math.max(0, Math.ceil(this.remaining / 1000))}s`, this.remaining <= 3000);
      if (this.remaining <= 0) {
        this.closeApp();
        this.killPlayer('The pointer closed the app');
      }
      return;
    }

    if (player.x > 640 && player.y < 211) {
      if (this.escaped) {
        this.finished = true;
        this.goTo(SceneKeys.XpBoss);
      } else {
        this.openApp();
      }
      return;
    }

    const body = player.body as Phaser.Physics.Arcade.Body;
    if (this.escaped) {
      this.chaseGrace = Math.max(0, this.chaseGrace - delta);
      this.cursor.setAlpha(this.chaseGrace > 0 ? 0.48 : 1);
      if (this.chaseGrace === 0) {
        this.moveCursor(player.x, player.y, 170, delta);
        if (this.cursor.x >= body.left - 4 && this.cursor.x <= body.right + 4 &&
          this.cursor.y >= body.top - 4 && this.cursor.y <= body.bottom + 4) {
          this.appIndex = (this.appIndex + 1) % APPS.length;
          this.openApp();
          return;
        }
      }
    }
    const onLadder = Math.abs(player.x - LADDER_X) < 55 &&
      player.y > LADDER_TOP - 40 && player.y < LADDER_TOP + 194;
    const movingSideways = this.sideways.some((key) => key.isDown);
    if (this.player.isClimbing && (!onLadder || movingSideways)) {
      this.player.setClimbing(false);
    } else if (!this.player.isClimbing && onLadder && !movingSideways &&
      (this.player.isHeld('down') ||
        (this.player.isHeld('up') && body.velocity.y >= 0 && body.bottom > LADDER_TOP + 2))) {
      this.player.setClimbing(true);
    }
  }

  private moveCursor(x: number, y: number, speed: number, delta: number): void {
    const dx = x - this.cursor.x;
    const dy = y - this.cursor.y;
    const distance = Math.hypot(dx, dy);
    if (distance === 0) return;
    const step = Math.min(1, speed * delta / (1000 * distance));
    this.cursor.x += dx * step;
    this.cursor.y += dy * step;
  }
}
