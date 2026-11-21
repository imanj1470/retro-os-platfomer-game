import Phaser from 'phaser';

/**
 * Draws with a temporary Graphics, generates a texture, then destroys the Graphics.
 * Does nothing if the key already exists.
 */
export function ensureTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (g: Phaser.GameObjects.Graphics) => void,
): string {
  if (scene.textures.exists(key)) {
    return key;
  }

  const g = scene.add.graphics();
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
  return key;
}

/**
 * Bakes a Text object into a texture for static text platforms.
 */
export function textTexture(
  scene: Phaser.Scene,
  key: string,
  text: string,
  style?: Phaser.Types.GameObjects.Text.TextStyle,
): string {
  if (scene.textures.exists(key)) {
    return key;
  }

  const t = scene.add.text(0, 0, text, {
    fontSize: '16px',
    color: '#ffffff',
    fontFamily: 'monospace',
    ...style,
  });

  const w = Math.ceil(t.getBounds().width) || 1;
  const h = Math.ceil(t.getBounds().height) || 1;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(t.texture.getSourceImage() as HTMLCanvasElement, 0, 0);
  scene.textures.addCanvas(key, canvas);
  t.destroy();
  return key;
}
