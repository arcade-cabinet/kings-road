import { describe, expect, it } from 'vitest';
import kingdomConfigJson from '../../../content/world/kingdom-config.json';
import { KingdomConfigSchema } from '../../schemas/kingdom.schema';
import {
  buildFeatureIndex,
  generateFeaturePlacements,
  getFeaturesAtTile,
} from './feature-placement';
import { generateKingdom } from './kingdom-gen';

const config = KingdomConfigSchema.parse(kingdomConfigJson);

describe('Playability: Dead Zones', () => {
  it('ensures no road dead zones exceed 15 tiles on the main path', () => {
    // Generate a test kingdom
    const map = generateKingdom('playtest-deadzone-1', config);
    const placements = generateFeaturePlacements(map, 'playtest-deadzone-1');
    const featureIndex = buildFeatureIndex(placements);

    // Find the main road tiles ordered south-to-north
    const roadTiles: [number, number][] = [];
    for (const tile of map.tiles) {
      if (tile.hasRoad && tile.isLand) {
        roadTiles.push([tile.x, tile.y]);
      }
    }
    roadTiles.sort((a, b) => a[1] - b[1]);

    expect(roadTiles.length).toBeGreaterThan(0);

    let tilesSinceInteraction = 0;
    let maxDeadZone = 0;

    // Simulate walking the road
    for (const [x, y] of roadTiles) {
      tilesSinceInteraction++;

      // Check for settlement presence
      const isSettlementTile = map.settlements.some((s) => {
        const [sx, sy] = s.position;
        return Math.abs(sx - x) <= 2 && Math.abs(sy - y) <= 2;
      });

      // Check for roadside feature
      const featuresHere = getFeaturesAtTile(featureIndex, x, y);

      if (isSettlementTile || featuresHere.length > 0) {
        tilesSinceInteraction = 0;
      }

      if (tilesSinceInteraction > maxDeadZone) {
        maxDeadZone = tilesSinceInteraction;
      }
    }

    // Assert that the maximum dead zone is less than or equal to 15 tiles
    // If this fails, the feature generator is starving the road of content!
    expect(
      maxDeadZone,
      `Found a dead zone of ${maxDeadZone} tiles along the main road!`,
    ).toBeLessThanOrEqual(15);
  });
});
