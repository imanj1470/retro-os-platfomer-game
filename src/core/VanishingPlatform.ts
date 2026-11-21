import Phaser from 'phaser';
import { emitGame } from './events';
import { sfx } from './sfx';

export interface VanishingPlatformOpts {
  label?: string;
  vanishMs?: number;
  respawnMs?: number;
}

export interface VanishingPlatform {
  sprite: Phaser.Physics.Arcade.Sprite;
  destroy: () => void;
}

export function createVanishingPlatform(
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.StaticGroup,
  x: number,
  y: number,
  texture: string,
  opts?: VanishingPlatformOpts,
): VanishingPlatform {
  const label = opts?.label ?? 'Platform';
  const vanishMs = opts?.vanishMs ?? 500;
  const respawnMs = opts?.respawnMs ?? 3000;

  // Create as a regular sprite in the group so it can be interacted with
  const sprite = group.create(x, y, texture) as Phaser.Physics.Arcade.Sprite;
  sprite.setImmovable(true);
  (sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
  sprite.refreshBody();

  let isVanished = false;
  let isTouching = false;
  let vanishTimer: Phaser.Time.TimerEvent | null = null;
  let respawnTimer: Phaser.Time.TimerEvent | null = null;

  // Check for player landing on top
  const checkLanding = () => {
    if (isVanished) return;

    const playerBody = scene.physics.world.bounds;
    // Find the player sprite
    const children = scene.children.getAll();
    for (const child of children) {
      if (child instanceof Phaser.Physics.Arcade.Sprite) {
        const body = child.body as Phaser.Physics.Arcade.Body;
        if (!body) continue;

        // Check if player is on top of this platform
        const playerBottom = child.y + (body.height ?? 0);
        const platformTop = sprite.y;
        const playerRight = child.x + (body.width ?? 0);
        const platformLeft = sprite.x;
        const platformRight = sprite.x + (sprite.width ?? 0);

        if (
          Math.abs(playerBottom - platformTop) < 10 &&
          playerRight > platformLeft &&
          child.x < platformRight &&
          (child.body as Phaser.Physics.Arcade.Body).velocity.y >= 0
        ) {
          isTouching = true;
          vanishPlatform();
          break;
        }
      }
    }
  };

  const vanishPlatform = () => {
    isVanished = true;

    // Emit rage-trap event
    emitGame('rage-trap', { x: sprite.x, y: sprite.y, label: `${label} (Not Responding)` });

    // Play sound
    sfx('notResponding');

    // Grey out
    sprite.setTint(0x888888);
    sprite.setAlpha(0.6);

    // After vanishMs, hide
    vanishTimer = scene.time.delayedCall(vanishMs, () => {
      const body = sprite.body as Phaser.Physics.Arcade.Body;
      if (body) body.enable = false;
      sprite.setVisible(false);

      // After respawnMs, come back
      respawnTimer = scene.time.delayedCall(respawnMs, () => {
        isVanished = false;
        isTouching = false;
        sprite.clearTint();
        sprite.setAlpha(1);
        sprite.setVisible(true);
        if (body) body.enable = true;
        respawnTimer = null;
      });
    });
  };

  // Check every frame
  scene.events.on('update', checkLanding);
  scene.events.once('shutdown', () => {
    if (vanishTimer) vanishTimer.remove();
    if (respawnTimer) respawnTimer.remove();
  });

  return {
    sprite,
    destroy: () => {
      sprite.destroy();
    },
  };
}
