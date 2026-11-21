import Phaser from 'phaser';
import type { LevelConfig } from '../types/LevelConfig';
import { TILE_SIZE } from '../config/GameConfig';

export interface BuiltLevel {
  platforms: Phaser.Physics.Arcade.StaticGroup;
  collectibles: Phaser.Physics.Arcade.Group;
  hazards: Phaser.Physics.Arcade.StaticGroup;
  goal: Phaser.Physics.Arcade.Sprite;
}

export class LevelFactory {
  static build(scene: Phaser.Scene, config: LevelConfig): BuiltLevel {
    const platforms = this.buildPlatforms(scene, config);
    const collectibles = this.buildCollectibles(scene, config);
    const hazards = this.buildHazards(scene, config);
    const goal = this.buildGoal(scene, config);

    return { platforms, collectibles, hazards, goal };
  }

  private static buildPlatforms(
    scene: Phaser.Scene,
    config: LevelConfig
  ): Phaser.Physics.Arcade.StaticGroup {
    const group = scene.physics.add.staticGroup();

    for (const platform of config.platforms) {
      for (let y = 0; y < platform.height; y++) {
        for (let x = 0; x < platform.width; x++) {
          const tile = group.create(
            platform.x + x * TILE_SIZE,
            platform.y + y * TILE_SIZE,
            'ground'
          ) as Phaser.Physics.Arcade.Sprite;
          tile.refreshBody();
        }
      }
    }

    return group;
  }

  private static buildCollectibles(
    scene: Phaser.Scene,
    config: LevelConfig
  ): Phaser.Physics.Arcade.Group {
    const group = scene.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    for (const collectible of config.collectibles) {
      const item = group.create(
        collectible.x,
        collectible.y,
        collectible.key
      ) as Phaser.Physics.Arcade.Sprite;
      item.setImmovable(true);
      item.setData('value', collectible.value);
    }

    return group;
  }

  private static buildHazards(
    scene: Phaser.Scene,
    config: LevelConfig
  ): Phaser.Physics.Arcade.StaticGroup {
    const group = scene.physics.add.staticGroup();

    for (const hazard of config.hazards) {
      for (let y = 0; y < hazard.height; y++) {
        for (let x = 0; x < hazard.width; x++) {
          const tile = group.create(
            hazard.x + x * TILE_SIZE,
            hazard.y + y * TILE_SIZE,
            hazard.key
          ) as Phaser.Physics.Arcade.Sprite;
          tile.refreshBody();
        }
      }
    }

    return group;
  }

  private static buildGoal(
    scene: Phaser.Scene,
    config: LevelConfig
  ): Phaser.Physics.Arcade.Sprite {
    const goal = scene.physics.add.sprite(
      config.goal.x,
      config.goal.y,
      config.goal.key
    );
    (goal.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    goal.setImmovable(true);

    return goal;
  }
}
