import Phaser from 'phaser';
import type { LevelId, SceneKey } from './constants';
import { PlayerController, type PlayerOptions } from './PlayerController';
import { emitGame } from './events';
import { addDeath } from './state';
import { sfx, toggleMute } from './sfx';
import { getDebugParams } from './debug';
import { Helper } from './Helper';
import { HUD } from './HUD';
import { TextPrompt } from './TextPrompt';
import { SceneKeys } from './constants';

export abstract class BaseLevelScene extends Phaser.Scene {
  protected abstract readonly levelId: LevelId;
  protected player!: PlayerController;
  protected helper!: Helper;
  protected hud!: HUD;
  protected prompt!: TextPrompt;

  private checkpointX = 100;
  private checkpointY = 400;
  private isPaused = false;
  private isFading = false;
  private isInvulnerable = false;
  private godMode = false;

  constructor(key: SceneKey) {
    super({ key });
    this._sceneKey = key;
  }

  protected readonly _sceneKey!: SceneKey;
  public get sceneKey(): SceneKey { return this._sceneKey; }

  init(): void {
    this.godMode = getDebugParams().godMode;
    // Initialize keys once per scene
    const kb = this.input.keyboard!;
    this._escKey = kb.addKey(27);
    this._mKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this._twoKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this._oneKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
  }

  protected setupWorld(width: number, height: number, bg: number): void {
    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.setBackgroundColor(
      '#' + bg.toString(16).padStart(6, '0')
    );
  }

  protected spawnPlayer(x: number, y: number, opts: PlayerOptions): PlayerController {
    this.player = new PlayerController(this, x, y, opts);
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
    return this.player;
  }

  protected setCheckpoint(x: number, y: number): void {
    this.checkpointX = x;
    this.checkpointY = y;
  }

  protected hurtPlayer(source: string): void {
    if (this.godMode) return;
    if (this.isInvulnerable) return;

    const result = this.onHurt(source);
    if (result === 'dead') {
      this.killPlayer(source);
      return;
    }

    // 1000ms i-frames with blink
    this.isInvulnerable = true;
    sfx('hurt');
    this.tweens.add({
      targets: this.player.sprite,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 9,
      onComplete: () => {
        this.player.sprite.setAlpha(1);
        this.isInvulnerable = false;
      },
    });

    emitGame('player-hit', {
      level: this.levelId,
      remaining: 1, // placeholder
    });
  }

  protected killPlayer(reason: string): void {
    if (this.isInvulnerable) return;
    this.isInvulnerable = true;

    addDeath(this);
    sfx('die');
    emitGame('player-death', { level: this.levelId, reason });

    this.onDeath(reason);

    // Respawn after fade
    this.time.delayedCall(500, () => {
      this.player.reset(this.checkpointX, this.checkpointY);
      this.player.sprite.setAlpha(1);
      this.isInvulnerable = false;
    });
  }

  protected onHurt(_source: string): 'survive' | 'dead' {
    return 'survive';
  }

  protected onDeath(_reason: string): void {
    // Default: fade and respawn at checkpoint (handled in killPlayer)
    this.player.sprite.setAlpha(0.3);
  }

  protected goTo(key: SceneKey, data?: object): void {
    if (this.isFading) return;
    this.isFading = true;
    if (this.player) {
      this.player.setControlsEnabled(false);
    }

    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.time.delayedCall(400, () => {
      this.scene.start(key, data);
    });
  }

  protected completeLevel(next: SceneKey): void {
    emitGame('level-complete', { level: this.levelId });
    this.goTo(next);
  }

  update(_time: number, _delta: number): void {
    this.handleGlobalKeys();

    if (this.isPaused) {
      this.tick(_time, _delta);
      return;
    }

    // Skip player update if no player (e.g. EndingScene)
    if (this.player) {
      if (!this.prompt.isOpen) {
        this.player.update(_delta);
      }

      // Fall death - use world bounds, not GAME_HEIGHT
      if (this.player.sprite.y > this.physics.world.bounds.bottom + 64) {
        this.killPlayer('fell');
      }
    }

    this.tick(_time, _delta);
  }

  protected handleGlobalKeys(): void {
    if (Phaser.Input.Keyboard.JustDown(this._escKey)) {
      this.isPaused = !this.isPaused;
      if (this.isPaused) {
        this.physics.pause();
        this.hud.showBanner('PAUSED', 0);
      } else {
        this.physics.resume();
        this.hud.hideBanner();
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this._mKey)) {
      toggleMute();
    }

    // Shortcut: press 1 to skip to CLI level (Level 1)
    if (Phaser.Input.Keyboard.JustDown(this._oneKey)) {
      this.goTo(SceneKeys.Cli);
    }

    // Shortcut: press 2 to skip to XP Desktop level
    if (Phaser.Input.Keyboard.JustDown(this._twoKey)) {
      this.goTo(SceneKeys.XpDesktop);
    }
  }

  private _escKey!: Phaser.Input.Keyboard.Key;
  private _mKey!: Phaser.Input.Keyboard.Key;
  private _oneKey!: Phaser.Input.Keyboard.Key;
  private _twoKey!: Phaser.Input.Keyboard.Key;

  protected tick(_time: number, _delta: number): void {
    // Override in subclasses for per-frame logic
  }
}
