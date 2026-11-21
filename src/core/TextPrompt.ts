import Phaser from 'phaser';
import { sfx } from './sfx';
import type { HelperSkin } from './Helper';

export class TextPrompt {
  private scene: Phaser.Scene;
  private skin: HelperSkin;
  private _isOpen = false;
  private currentText = '';
  private maxLength = 50;
  private placeholder = '';
  private label = '';
  private inputX = 0;
  private inputY = 0;
  private pageWidth?: number;
  private resolve: ((value: string | null) => void) | null = null;

  private bgBox: Phaser.GameObjects.Graphics;
  private labelText: Phaser.GameObjects.Text;
  private inputText: Phaser.GameObjects.Text;
  private caret: Phaser.GameObjects.Text;
  private caretTween?: Phaser.Tweens.Tween;

  private keyHandler: (event: KeyboardEvent) => void;
  private readonly handledKeys = new WeakSet<KeyboardEvent>();

  constructor(scene: Phaser.Scene, skin: HelperSkin) {
    this.scene = scene;
    this.skin = skin;

    // Background box
    this.bgBox = scene.add.graphics();
    this.bgBox.setScrollFactor(0);
    this.bgBox.setDepth(1100);

    // Label
    this.labelText = scene.add.text(
      scene.scale.width / 2,
      scene.scale.height / 2 - 40,
      '',
      {
        fontSize: '18px',
        color: '#aaaaaa',
        fontFamily: 'monospace',
      },
    );
    this.labelText.setOrigin(0.5, 0);
    this.labelText.setScrollFactor(0);
    this.labelText.setDepth(1101);

    // Input text
    this.inputText = scene.add.text(
      scene.scale.width / 2 - 120,
      scene.scale.height / 2,
      '',
      {
        fontSize: '22px',
        color: '#ffffff',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 3,
      },
    );
    this.inputText.setScrollFactor(0);
    this.inputText.setDepth(1101);

    // Caret
    this.caret = scene.add.text(
      scene.scale.width / 2 - 120,
      scene.scale.height / 2,
      '_',
      {
        fontSize: '22px',
        color: '#ffffff',
        fontFamily: 'monospace',
      },
    );
    this.caret.setScrollFactor(0);
    this.caret.setDepth(1102);

    this.keyHandler = (event: KeyboardEvent) => this.onKey(event);

    // Hide all
    this.setVisible(false);
  }

  private setVisible(visible: boolean): void {
    this.bgBox.setVisible(visible);
    this.labelText.setVisible(visible);
    this.inputText.setVisible(visible);
    this.caret.setVisible(visible);
  }

  public get isOpen(): boolean {
    return this._isOpen;
  }

  public open(opts: {
    label: string;
    maxLength?: number;
    placeholder?: string;
    terminal?: boolean;
    page?: { x: number; y: number; width: number };
  }): Promise<string | null> {
    return new Promise((resolve) => {
      this._isOpen = true;
      this.currentText = '';
      this.maxLength = opts.maxLength ?? 50;
      this.placeholder = opts.placeholder ?? '';
      this.label = opts.label;
      this.pageWidth = opts.page?.width;
      this.resolve = resolve;

      // Draw background
      this.bgBox.clear();
      if (!opts.terminal && !opts.page) {
        this.bgBox.fillStyle(0x000000, 0.85);
        this.bgBox.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height);
      }

      const centerX = this.scene.scale.width / 2;
      const centerY = this.scene.scale.height / 2;
      this.labelText.setText(opts.label).setOrigin(opts.terminal ? 0 : 0.5, 0)
        .setPosition(opts.terminal ? 88 : centerX, opts.terminal ? 230 : centerY - 40)
        .setFontSize(opts.terminal ? 20 : 18).setColor(opts.terminal ? '#75cf88' : '#aaaaaa');
      this.inputX = opts.page?.x ?? (opts.terminal ? this.labelText.x + this.labelText.width + 12 : centerX - 120);
      this.inputY = opts.page?.y ?? (opts.terminal ? 229 : centerY);
      this.inputText.setPosition(this.inputX, this.inputY).setStyle({
        fontFamily: opts.page ? 'Georgia, serif' : 'monospace', fontSize: opts.page ? '26px' : '22px',
        strokeThickness: opts.page ? 0 : 3, wordWrap: { width: opts.page?.width ?? null },
        color: opts.terminal ? '#b0ffbf' : '#ffffff',
      });
      this.caret.setText(opts.page ? '|' : '_').setColor(opts.page ? '#255aa4' : opts.terminal ? '#75cf88' : '#ffffff');

      // Update display
      this.updateDisplay();
      this.setVisible(true);
      if (opts.page) this.labelText.setVisible(false);

      // Start caret blink
      this.caretTween = this.scene.tweens.add({
        targets: this.caret,
        alpha: 0,
        duration: 400,
        yoyo: true,
        repeat: -1,
      });

      // Add key listener
      this.scene.input.keyboard!.on('keydown', this.keyHandler);
    });
  }

  private onKey(event: KeyboardEvent): void {
    if (!this.isOpen || this.handledKeys.has(event)) return;
    this.handledKeys.add(event);

    const key = event.key;

    if (key === 'Escape') {
      this.close(null);
      return;
    }

    if (key === 'Enter') {
      this.close(this.currentText || null);
      return;
    }

    if (key === 'Backspace') {
      if (this.currentText.length > 0) {
        this.currentText = this.currentText.slice(0, -1);
        sfx('keyclick');
        this.updateDisplay();
      }
      return;
    }

    // Printable characters
    if (key.length === 1 && this.currentText.length < this.maxLength) {
      this.currentText += key;
      sfx('keyclick');
      this.updateDisplay();
    }
  }

  private updateDisplay(): void {
    const display = this.currentText || this.placeholder;
    this.inputText.setText(display);
    if (this.pageWidth !== undefined) {
      this.inputText.setColor(this.currentText ? '#183047' : '#76869a');
      const lines = this.inputText.getWrappedText(this.currentText);
      const width = this.inputText.context.measureText(lines.at(-1) ?? '').width;
      this.caret.setPosition(this.inputX + Math.min(width, this.pageWidth),
        this.inputY + Math.max(0, lines.length - 1) * (this.inputText.height / Math.max(1, lines.length)));
      return;
    }

    // Position caret after text
    const textWidth = this.inputText.getBounds().width;
    this.caret.setPosition(this.inputX + textWidth, this.inputY);
  }

  private close(value: string | null): void {
    this._isOpen = false;
    this.setVisible(false);

    // Stop caret blink
    if (this.caretTween) {
      this.caretTween.stop();
      this.caretTween = undefined;
    }
    this.caret.setAlpha(1);

    // Remove key listener
    this.scene.input.keyboard!.off('keydown', this.keyHandler);

    if (this.resolve) {
      this.resolve(value);
      this.resolve = null;
    }
  }
}
