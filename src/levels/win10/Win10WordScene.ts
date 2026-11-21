import Phaser from 'phaser';
import { SceneKeys } from '../../core/constants';
import { sfx } from '../../core/sfx';
import { getPlayerName } from '../../core/state';
import { Win10StageScene, type HubReturn } from './shared/Win10StageScene';
import { drawWindow, UI_FONT, WIN10_FLOOR } from './shared/Win10Theme';

const PAGE_X = 183;
const LINE_Y = 217;
const PAGE_WIDTH = 450;
const normalize = (text: string) => text.trim().replace(/\s+/g, ' ');

export default class Win10WordScene extends Win10StageScene {
  private sentence = '';
  private editing = false;
  private pageText!: Phaser.GameObjects.Text;
  private underline!: Phaser.GameObjects.Graphics;
  private caret!: Phaser.GameObjects.Rectangle;

  constructor() { super(SceneKeys.Win10Word); }

  create(data: Partial<HubReturn> = {}): void {
    this.setupApp('Word', data);
    drawWindow(this, 'Word  /  Untitled document', 0x245b9e);
    this.add.text(50, 104, 'Walk to the editing marker and press E.', {
      color: '#3c5877', fontFamily: UI_FONT, fontSize: '14px',
    });
    this.add.rectangle(400, 344, 543, 379, 0xe5edf7);
    this.add.rectangle(400, 339, 534, 380, 0xffffff).setStrokeStyle(1, 0xc0cedd);
    for (let y = 246; y < 500; y += 36) this.add.rectangle(400, y, 458, 1, 0xe0e8f2);
    this.add.rectangle(164, 345, 1, 300, 0xe8bfc1);
    this.add.rectangle(400, WIN10_FLOOR - 10, 535, 18, 0xd6e5f6);
    this.addDoor();
    this.add.text(PAGE_X, 509, 'E  Edit document', {
      fontFamily: UI_FONT, fontSize: '13px', color: '#285688',
    }).setOrigin(0.5, 0);
    this.caret = this.add.rectangle(PAGE_X, LINE_Y + 14, 2, 26, 0x306fc6).setOrigin(0, 0.5);
    this.tweens.add({ targets: this.caret, alpha: 0.12, duration: 425, yoyo: true, repeat: -1 });
    this.pageText = this.add.text(PAGE_X, LINE_Y, '', {
      fontFamily: 'Georgia, serif', fontSize: '26px', color: '#183047', wordWrap: { width: PAGE_WIDTH },
    });
    this.underline = this.add.graphics();
    this.sentence = `${normalize(getPlayerName(this))} was here`;
    this.editing = false;
    if (this.inventory.wordDone) this.pageText.setText(this.sentence);
  }

  private edit(): void {
    this.editing = true;
    this.player.setControlsEnabled(false);
    this.player.sprite.setVelocity(0);
    this.physics.pause();
    this.caret.setVisible(false);
    this.pageText.setVisible(false);
    this.underline.setVisible(false);
    void this.prompt.open({
      label: '', placeholder: this.sentence, maxLength: Math.max(72, this.sentence.length + 20),
      page: { x: PAGE_X, y: LINE_Y, width: PAGE_WIDTH },
    }).then((result) => {
      this.input.keyboard?.resetKeys();
      this.editing = false;
      this.pageText.setVisible(true);
      this.underline.setVisible(true);
      const text = normalize(result ?? '');
      if (text && text.toLowerCase() === this.sentence.toLowerCase()) {
        this.pageText.setText(text);
        this.underline.clear();
        if (!this.inventory.wordDone) this.collect('Word signature', { wordDone: true }, 'chimeWin10');
        else sfx('chimeWin10');
        this.departing = true;
        this.time.delayedCall(1000, () => this.goTo(SceneKeys.Win10Boss, { from: 'word' }));
        return;
      }
      if (text) {
        this.pageText.setText(text);
        this.drawSquiggle(text);
        void this.helper.say('Autocorrect disagrees. Try again.', { holdMs: 2800 });
      }
      this.caret.setVisible(!this.pageText.text);
      this.physics.resume();
      this.player.setControlsEnabled(true);
    });
  }

  private drawSquiggle(text: string): void {
    this.underline.clear().lineStyle(1.5, 0xcc394d);
    const lines = this.pageText.getWrappedText(text);
    const lineHeight = this.pageText.height / Math.max(1, lines.length);
    for (const [row, line] of lines.entries()) {
      const width = Math.min(PAGE_WIDTH, this.pageText.context.measureText(line).width);
      const y = LINE_Y + (row + 1) * lineHeight - 1;
      this.underline.beginPath().moveTo(PAGE_X, y);
      for (let x = 3; x < width; x += 3) this.underline.lineTo(PAGE_X + x, y + (x % 6 ? 2 : 0));
      this.underline.strokePath();
    }
  }

  protected handleGlobalKeys(): void {
    if (!this.editing && !this.departing) super.handleGlobalKeys();
  }

  protected play(): void {
    this.checkDoor();
    if (this.departing) return;
    if (this.near(PAGE_X, WIN10_FLOOR - 24, 63, 34) && this.player.justPressed('interact')) this.edit();
  }
}
