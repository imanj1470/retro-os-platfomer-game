import Phaser from 'phaser';
import { ensureTexture } from '../../../core/art';
import { sfx } from '../../../core/sfx';
import { XP_FLOOR } from '../shared/XpScene';

export const BUDDY_COLORS = [0x55317d, 0x8b53bf, 0xc49be7, 0xf3e5ff, 0x3568af];
export const ANCHORS = [200, 600];
export const ANCHOR_Y = 102;
export const BUDDY_FLOOR = XP_FLOOR - 36;
const TAUNTS = ['Want FREE smileys?', "I'm your buddy!", 'Installing toolbar…'];

export type BuddyState = 'SWING' | 'LEAP' | 'GRAB' | 'BLOCK' | 'TAUNT';

export class BuddyWare {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly body: Phaser.Physics.Arcade.Body;
  state: BuddyState = 'SWING';
  elapsed = 0;
  private cycle = 0;
  private swingLeg = 0;
  private grab = 0;
  private grabContact = false;
  private originX = 0;
  private originY = 0;
  private targetX = 0;
  private targetY = BUDDY_FLOOR;
  private speechMs = 0;
  private readonly cable: Phaser.GameObjects.Graphics;
  private readonly speech: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    ensureTexture(scene, 'buddyware-ape', 80, 88, (g) => {
      g.fillStyle(0x55317d).fillEllipse(17, 55, 21, 43).fillEllipse(63, 55, 21, 43)
        .fillEllipse(26, 76, 25, 15).fillEllipse(54, 76, 25, 15)
        .fillCircle(15, 33, 11).fillCircle(65, 33, 11);
      g.fillStyle(0x8b53bf).fillEllipse(40, 58, 50, 43).fillEllipse(40, 35, 52, 46);
      g.fillStyle(0xc49be7).fillEllipse(40, 61, 26, 31).fillEllipse(40, 39, 43, 31);
      g.fillStyle(0xf3e5ff).fillCircle(31, 31, 8).fillCircle(49, 31, 8);
      g.fillStyle(0x2b1b40).fillCircle(33, 31, 2.5).fillCircle(51, 31, 2.5).fillEllipse(40, 43, 26, 13);
      g.fillStyle(0xffffff).fillRoundedRect(30, 39, 20, 4, 2);
      g.fillStyle(0x3568af).fillRoundedRect(12, 6, 56, 17, 4);
      g.fillStyle(0xe5f4ff).fillRoundedRect(29, 11, 27, 7, 2);
      g.fillStyle(0xc9e76c).fillCircle(19, 14, 3);
      g.fillStyle(0xffc64a).fillCircle(62, 14, 3);
    });

    this.sprite = scene.physics.add.sprite(400, -55, 'buddyware-ape').setDepth(24);
    this.sprite.setBodySize(64, 72);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setAllowGravity(false);
    this.body.moves = false;
    this.cable = scene.add.graphics().setDepth(19);
    this.speech = scene.add.text(400, 100, '', {
      fontFamily: 'Tahoma', fontSize: '14px', color: '#182f21', backgroundColor: '#fff6cf',
      padding: { x: 8, y: 5 },
    }).setOrigin(0.5, 1).setDepth(30).setVisible(false);
  }

  say(text: string, duration = 1300): void {
    this.speechMs = duration;
    this.speech.setText(text).setVisible(true);
    this.positionSpeech();
  }

  private positionSpeech(): void {
    this.speech.setPosition(Phaser.Math.Clamp(this.sprite.x, 102, 698), Math.max(67, this.sprite.y - 45));
  }

  place(x: number, y: number): void {
    this.body.reset(x, y);
  }

  start(): void {
    this.cycle = 0;
    this.swingLeg = 0;
    this.speechMs = 0;
    this.speech.setVisible(false);
    this.sprite.clearTint().setScale(1).setAngle(0).setAlpha(1);
    this.enter('SWING');
  }

  interrupt(): void {
    this.cable.clear();
    this.speechMs = 0;
    this.speech.setVisible(false);
    this.sprite.setScale(1).setAngle(0);
  }

  restartSwing(): void {
    this.swingLeg = 0;
    this.enter('SWING');
  }

  grabHit(): void { this.grabContact = true; }

  private enter(state: BuddyState): void {
    this.elapsed = 0;
    this.state = state;
    this.originX = this.sprite.x;
    this.originY = this.sprite.y;
    this.cable.clear();
    this.sprite.setScale(1).setAngle(0);
    if (state === 'TAUNT') this.say(TAUNTS[this.cycle % TAUNTS.length], 1600);
    if (state === 'SWING') sfx('jump');
  }

  tick(delta: number, hits: number, playerX: number, landingY: (x: number) => number, keepTaunting: boolean): void {
    this.elapsed += delta;
    const speed = 1 + hits * 0.2;
    const x = this.sprite.x;
    const t = this.elapsed;

    switch (this.state) {
      case 'SWING': {
        const approach = 330;
        const legMs = 1260 / speed;
        const swingTime = Math.max(0, t - approach);
        const leg = Math.min(1, Math.floor(swingTime / legMs));
        if (leg !== this.swingLeg) {
          this.swingLeg = leg;
          sfx('jump');
        }
        const fraction = Phaser.Math.Clamp((swingTime - leg * legMs) / legMs, 0, 1);
        const angle = Phaser.Math.Linear(leg === 0 ? -0.76 : -1.04,
          leg === 0 ? 1.04 : 0.76, Phaser.Math.Easing.Sine.InOut(fraction));
        const anchor = ANCHORS[leg];
        const swingX = anchor + 232 * Math.sin(angle);
        const swingY = ANCHOR_Y + 232 * Math.cos(angle);
        const mix = Math.min(1, t / approach);
        this.place(Phaser.Math.Linear(this.originX, swingX, mix), Phaser.Math.Linear(this.originY, swingY, mix));
        this.sprite.setAngle(angle * 24 * mix);
        this.cable.clear().lineStyle(4, 0x4b3c62).lineBetween(anchor, ANCHOR_Y, this.sprite.x, this.sprite.y - 34);
        if (swingTime >= 2 * legMs) {
          sfx('jump');
          this.targetX = Phaser.Math.Clamp(playerX, 43, 757);
          this.targetY = landingY(this.targetX);
          this.enter('LEAP');
        }
        break;
      }
      case 'LEAP': {
        const flight = 1200 / speed;
        if (t < 400) {
          this.sprite.setScale(1.1, 0.77);
          this.cable.clear().lineStyle(3, 0xc49be7).strokeEllipse(this.targetX, this.targetY + 34, 66, 15);
        } else {
          this.cable.clear();
          const p = Math.min(1, (t - 400) / flight);
          this.sprite.setScale(1);
          this.place(Phaser.Math.Linear(this.originX, this.targetX, p),
            Phaser.Math.Linear(this.originY, this.targetY, p) - 125 * 4 * p * (1 - p));
          if (t >= 400 + flight + 850) {
            this.grab = 0;
            this.beginGrab(playerX);
          }
        }
        break;
      }
      case 'GRAB': {
        const dash = 600 / speed;
        const p = Math.min(1, t / dash);
        const reach = Math.sin(Math.PI * p);
        this.sprite.setScale(1 + 0.2 * reach, 1);
        this.place(Phaser.Math.Linear(this.originX, this.targetX, p), Phaser.Math.Linear(this.originY, BUDDY_FLOOR, p));
        const handX = this.sprite.x + Math.sign(this.targetX - this.originX) * (24 + 20 * reach);
        this.cable.clear().lineStyle(9, 0x55317d)
          .lineBetween(this.sprite.x, this.sprite.y + 4, handX, this.sprite.y + 6)
          .fillStyle(0xc49be7).fillCircle(handX, this.sprite.y + 6, 6);
        if (t >= dash + (this.grabContact ? 0 : 400)) {
          this.grab++;
          if (hits >= 2 && this.grab < 2) this.beginGrab(playerX);
          else this.enter(hits > 0 || this.cycle % 2 === 1 ? 'BLOCK' : 'TAUNT');
        }
        break;
      }
      case 'BLOCK':
        this.sprite.setAngle(Math.sin(t / 170) * 6);
        if (t >= 5000) this.enter('TAUNT');
        break;
      case 'TAUNT':
        this.sprite.setScale(1, 1 + 0.06 * Math.sin(t / 95));
        if (t >= (hits >= 2 ? 1200 : 1600) && !keepTaunting) {
          this.cycle++;
          this.restartSwing();
        }
        break;
    }

    this.sprite.setFlipX(playerX < x);
    if (this.speechMs > 0) {
      this.speechMs -= delta;
      this.speech.setVisible(this.speechMs > 0);
      this.positionSpeech();
    }
  }

  private beginGrab(playerX: number): void {
    this.enter('GRAB');
    this.grabContact = false;
    this.targetX = Phaser.Math.Clamp(this.sprite.x + (playerX >= this.sprite.x ? 120 : -120), 38, 762);
  }
}
