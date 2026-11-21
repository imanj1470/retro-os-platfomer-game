import Phaser from 'phaser';

export class HUD {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private leftText: Phaser.GameObjects.Text;
  private rightText: Phaser.GameObjects.Text;
  private bannerText: Phaser.GameObjects.Text;
  private bossBarBg: Phaser.GameObjects.Graphics;
  private bossBarFill: Phaser.GameObjects.Graphics;
  private bossBarName: Phaser.GameObjects.Text;
  private bossHp = 0;
  private bossMax = 1;
  private bossVisible = false;
  private bannerTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(1000);

    // Left text (top-left)
    this.leftText = scene.add.text(16, 16, '', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 4,
    });
    this.container.add(this.leftText);

    // Right text (top-right)
    this.rightText = scene.add.text(scene.scale.width - 16, 16, '', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 4,
    });
    this.rightText.setOrigin(1, 0);
    this.container.add(this.rightText);

    // Banner text (centered)
    this.bannerText = scene.add.text(
      scene.scale.width / 2,
      60,
      '',
      {
        fontSize: '28px',
        color: '#ffffff',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 4,
      },
    );
    this.bannerText.setOrigin(0.5, 0);
    this.bannerText.setVisible(false);
    this.container.add(this.bannerText);

    // Boss bar background
    this.bossBarBg = scene.add.graphics();
    this.bossBarBg.setScrollFactor(0);
    this.bossBarBg.setDepth(1001);

    // Boss bar fill
    this.bossBarFill = scene.add.graphics();
    this.bossBarFill.setScrollFactor(0);
    this.bossBarFill.setDepth(1002);

    // Boss bar name
    this.bossBarName = scene.add.text(scene.scale.width / 2, 10, '', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.bossBarName.setOrigin(0.5, 0);
    this.bossBarName.setScrollFactor(0);
    this.bossBarName.setDepth(1003);
    this.bossBarName.setVisible(false);
  }

  public setLeft(text: string): void {
    this.leftText.setText(text);
  }

  public setRight(text: string): void {
    this.rightText.setText(text);
  }

  public showBanner(text: string, durationMs: number): void {
    this.bannerText.setText(text);
    this.bannerText.setVisible(true);

    if (this.bannerTimer) {
      this.bannerTimer.remove();
    }

    if (durationMs > 0) {
      this.bannerTimer = this.scene.time.delayedCall(durationMs, () => {
        this.hideBanner();
      });
    }
  }

  public hideBanner(): void {
    this.bannerText.setVisible(false);
    this.bannerText.setText('');
    if (this.bannerTimer) {
      this.bannerTimer.remove();
      this.bannerTimer = null;
    }
  }

  public showBossBar(name: string, maxHp: number): void {
    this.bossMax = maxHp;
    this.bossHp = maxHp;
    this.bossVisible = true;
    this.bossBarName.setText(name);
    this.bossBarName.setVisible(true);
    this.updateBossBar();
  }

  public setBossHp(hp: number): void {
    this.bossHp = Math.max(0, hp);
    this.updateBossBar();
  }

  public hideBossBar(): void {
    this.bossVisible = false;
    this.bossBarBg.clear();
    this.bossBarFill.clear();
    this.bossBarName.setVisible(false);
  }

  private updateBossBar(): void {
    if (!this.bossVisible) return;

    const w = 400;
    const h = 20;
    const x = (this.scene.scale.width - w) / 2;
    const y = 35;

    this.bossBarBg.clear();
    this.bossBarBg.fillStyle(0x333333, 1);
    this.bossBarBg.fillRect(x - 2, y - 2, w + 4, h + 4);
    this.bossBarBg.fillStyle(0x660000, 1);
    this.bossBarBg.fillRect(x, y, w, h);

    this.bossBarFill.clear();
    const ratio = this.bossHp / this.bossMax;
    this.bossBarFill.fillStyle(0xff0000, 1);
    this.bossBarFill.fillRect(x, y, w * ratio, h);
  }
}
