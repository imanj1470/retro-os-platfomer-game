import Phaser from 'phaser';
import { ensureTexture } from './art';
import { emitGame } from './events';
import { sfx } from './sfx';

export type HelperSkin = 'cli' | 'xp' | 'win10';

interface Message {
  text: string;
  id?: string;
  holdMs?: number;
  _resolve?: () => void;
}

interface ProximityHint {
  id: string;
  targetX: number;
  targetY: number;
  radius: number;
  text: string;
  shown: boolean;
}

export class Helper {
  private scene: Phaser.Scene;
  private skin: HelperSkin;
  private container: Phaser.GameObjects.Container;
  private avatar: Phaser.GameObjects.Image;
  private textBox: Phaser.GameObjects.Graphics;
  private textObj: Phaser.GameObjects.Text;
  private messageQueue: Message[] = [];
  private currentMessage: Message | null = null;
  private saidIds = new Set<string>();
  private proximityHints: ProximityHint[] = [];
  private isProcessing = false;

  constructor(scene: Phaser.Scene, skin: HelperSkin) {
    this.scene = scene;
    this.skin = skin;

    // Create avatar texture
    this.createAvatarTexture();

    // Container in screen space
    const boxWidth = 320;
    this.container = scene.add.container(scene.scale.width - boxWidth - 16, scene.scale.height - 100);
    this.container.setScrollFactor(0);
    this.container.setDepth(900);

    // Avatar
    this.avatar = scene.add.image(0, 20, `helper-${skin}`);
    this.avatar.setDisplaySize(24, 24);
    this.container.add(this.avatar);

    // Text box background
    this.textBox = scene.add.graphics();
    this.textBox.fillStyle(skin === 'cli' ? 0x07140b : 0x000000, skin === 'cli' ? 1 : 0.7);
    this.textBox.fillRect(30, -10, boxWidth - 30, 60);
    this.container.add(this.textBox);

    // Text
    this.textObj = scene.add.text(35, -5, '', {
      fontSize: skin === 'win10' ? '22px' : '15px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 3,
      wordWrap: { width: boxWidth - 50 },
    });
    this.container.add(this.textObj);
    this.container.setVisible(false);
  }

  private createAvatarTexture(): void {
    if (this.skin === 'cli') {
      ensureTexture(this.scene, 'helper-cli', 24, 24, (g) => {
        g.fillStyle(0x000000, 1);
        g.fillRect(0, 0, 24, 24);
        g.fillStyle(0x00ff00, 1);
        g.fillRect(2, 2, 20, 20);
        // Blinking cursor
        g.fillStyle(0x00ff00, 1);
        g.fillRect(8, 14, 4, 8);
      });
    } else if (this.skin === 'xp') {
      ensureTexture(this.scene, 'helper-xp', 24, 24, (g) => {
        g.fillStyle(0x75421e);
        g.fillEllipse(5, 12, 7, 16);
        g.fillEllipse(19, 12, 7, 16);
        g.fillStyle(0xd69952);
        g.fillEllipse(12, 11, 15, 17);
        g.fillStyle(0xffdc9b);
        g.fillEllipse(12, 16, 13, 9);
        g.fillStyle(0x26190f);
        g.fillCircle(9, 10, 1.5);
        g.fillCircle(15, 10, 1.5);
        g.fillEllipse(12, 15, 6, 4);
        g.fillStyle(0xc43636);
        g.fillRoundedRect(8, 20, 8, 3, 1);
      });
    } else {
      ensureTexture(this.scene, 'helper-win10', 24, 24, (g) => {
        // Arrow pointer
        g.fillStyle(0xffffff, 1);
        g.fillTriangle(4, 4, 4, 20, 12, 14);
        g.lineStyle(1, 0x000000, 1);
        g.strokeTriangle(4, 4, 4, 20, 12, 14);
      });
    }
  }

  public say(text: string, opts?: { holdMs?: number; id?: string }): Promise<void> {
    return new Promise((resolve) => {
      this.messageQueue.push({
        text,
        holdMs: opts?.holdMs,
        id: opts?.id,
      });
      if (!this.isProcessing) {
        this.processNext(resolve);
      } else {
        // Chain resolution
        const lastMsg = this.messageQueue[this.messageQueue.length - 1];
        lastMsg._resolve = resolve;
      }
    });
  }

  public sayOnce(id: string, text: string): void {
    if (this.saidIds.has(id)) return;
    this.saidIds.add(id);
    this.say(text, { id });
  }

  public get isIdle(): boolean {
    return !this.isProcessing;
  }

  public addProximityHint(
    id: string,
    target: { x: number; y: number },
    radius: number,
    text: string,
  ): void {
    this.proximityHints.push({
      id,
      targetX: target.x,
      targetY: target.y,
      radius,
      text,
      shown: false,
    });
  }

  public clear(): void {
    this.messageQueue = [];
    this.currentMessage = null;
    this.isProcessing = false;
    this.container.setVisible(false);
  }

  public update(playerX: number, playerY: number): void {
    if (this.skin === 'cli') {
      this.container.x = playerX < this.scene.scale.width / 2 ? this.scene.scale.width - 336 : 24;
    }
    // Check proximity hints
    for (const hint of this.proximityHints) {
      if (hint.shown) continue;
      const dx = playerX - hint.targetX;
      const dy = playerY - hint.targetY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < hint.radius) {
        hint.shown = true;
        this.sayOnce(hint.id, hint.text);
      }
    }
  }

  private processNext(resolve?: () => void): void {
    if (this.messageQueue.length === 0) {
      this.isProcessing = false;
      this.currentMessage = null;
      this.container.setVisible(false);
      if (resolve) resolve();
      return;
    }

    this.isProcessing = true;
    const msg = this.messageQueue.shift()!;
    this.currentMessage = msg;

    // Play sound and emit event
    sfx('notify');
    emitGame('helper-say', { text: msg.text });

    // Calculate hold time
    const words = msg.text.split(/\s+/).length;
    const holdMs = msg.holdMs ?? Math.max(2000, 300 * words);

    // Show text
    this.container.setVisible(true);
    this.textObj.setText(msg.text);

    // Auto-hide after hold time
    this.scene.time.delayedCall(holdMs, () => {
      this.processNext(msg._resolve);
    });
  }
}
