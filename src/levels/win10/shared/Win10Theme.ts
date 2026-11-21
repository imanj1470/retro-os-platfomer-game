import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../../core/constants';
import { ensureTexture } from '../../../core/art';

export const WIN10_FLOOR = GAME_HEIGHT - 40;
export const UI_FONT = 'Segoe UI, Arial, sans-serif';
export const TURQUOISE = 0x25c3b9;
export type AppIcon = 'photos' | 'paint' | 'word' | 'explorer' | 'bin';

export function appTexture(scene: Phaser.Scene, icon: AppIcon): string {
  return ensureTexture(scene, `win10-icon-${icon}`, 56, 56, (g) => {
    if (icon === 'photos') {
      g.fillStyle(0x2766a5).fillRoundedRect(4, 5, 48, 45, 7);
      g.fillStyle(0xffd275).fillCircle(39, 17, 5);
      g.fillStyle(0x7bd5db).fillTriangle(9, 42, 23, 19, 38, 42)
        .fillTriangle(27, 42, 39, 27, 48, 42);
    } else if (icon === 'paint') {
      g.fillStyle(0xf9dfa7).fillEllipse(28, 28, 47, 40);
      g.fillStyle(0x304570).fillCircle(40, 33, 6);
      [0xff805f, 0x67c8c6, 0x5d97ef, 0xefbf45].forEach((color, i) => {
        g.fillStyle(color).fillCircle(14 + i * 8, 23 - Math.sin(i) * 8, 4);
      });
    } else if (icon === 'word') {
      g.fillStyle(0x428fe5).fillRoundedRect(10, 3, 36, 50, 5);
      g.fillStyle(0xb5dfff).fillTriangle(33, 3, 46, 16, 33, 16);
      for (let y = 24; y <= 40; y += 8) g.fillStyle(0xf1faff).fillRect(17, y, 22, 2);
    } else if (icon === 'explorer') {
      g.fillStyle(0xd3a052).fillRoundedRect(4, 12, 47, 35, 5).fillRect(6, 8, 21, 10);
      g.fillStyle(0xffd86b).fillRoundedRect(5, 19, 47, 29, 4);
    } else {
      g.fillStyle(0xd7e9f1).fillRoundedRect(15, 14, 27, 35, 5).fillRoundedRect(9, 9, 39, 8, 3);
      g.fillStyle(0x719bab).fillRect(22, 22, 3, 19).fillRect(31, 22, 3, 19);
    }
  });
}

export function drawDesktop(scene: Phaser.Scene, width: number): void {
  const wall = scene.add.graphics().setDepth(-30);
  for (let y = 0; y < GAME_HEIGHT; y += 8) {
    const t = y / GAME_HEIGHT;
    const rgb = Phaser.Display.Color.Interpolate.ColorWithColor(
      new Phaser.Display.Color(11, 26, 58), new Phaser.Display.Color(30, 79, 163), 100, t * 100,
    );
    wall.fillStyle(Phaser.Display.Color.GetColor(rgb.r, rgb.g, rgb.b)).fillRect(0, y, width, 8);
  }
  for (let i = 0; i < 3; i++) {
    wall.fillStyle(0x99e5ff, 0.065).fillTriangle(width * 0.42 + i * 70, 0, width * 0.91 + i * 52,
      GAME_HEIGHT, width * 0.36 + i * 74, GAME_HEIGHT);
  }

  const bar = scene.add.container(0, WIN10_FLOOR, [
    scene.add.rectangle(0, 0, GAME_WIDTH, 40, 0x101418).setOrigin(0),
    scene.add.rectangle(0, 0, GAME_WIDTH, 1, 0x314050).setOrigin(0),
    scene.add.rectangle(16, 5, 211, 30, 0x2a3037).setOrigin(0),
    scene.add.text(28, 11, 'Type here to search', { fontFamily: UI_FONT, fontSize: '13px', color: '#d4dce6' }),
    scene.add.text(784, 11, new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      { fontFamily: UI_FONT, fontSize: '13px' }).setOrigin(1, 0),
  ]).setScrollFactor(0).setDepth(70);
  (['photos', 'paint', 'word', 'explorer'] as const).forEach((icon, i) => {
    bar.add(scene.add.image(248 + 32 * i, 20, appTexture(scene, icon)).setDisplaySize(22, 22));
  });
}

export function drawWindow(scene: Phaser.Scene, title: string, tint = 0xffffff): void {
  scene.add.rectangle(24, 55, 752, 499, 0xf5f8fc).setOrigin(0).setStrokeStyle(1, 0xb7c8da);
  scene.add.rectangle(24, 55, 752, 35, tint).setOrigin(0);
  const color = tint === 0xffffff ? '#24364b' : '#ffffff';
  scene.add.text(40, 63, title, { fontFamily: UI_FONT, fontSize: '15px', fontStyle: 'bold', color });
  scene.add.text(754, 63, '—   ☐   ✕', { fontFamily: UI_FONT, fontSize: '15px', color }).setOrigin(1, 0);
}
