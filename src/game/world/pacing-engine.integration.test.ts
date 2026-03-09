/**
 * Pacing Engine Integration Tests
 *
 * Loads the real pacing config and road spine, runs the pacing engine,
 * and verifies the output makes sense against the actual game world.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { PacingConfig } from '../../schemas/pacing.schema';
import { PacingConfigSchema } from '../../schemas/pacing.schema';
import { generatePlacements, generateRoadPacing } from './pacing-engine';
import { loadRoadSpine } from './road-spine';

const CONFIG_PATH = path.resolve(
  __dirname,
  '../../../content/pacing/config.json',
);

function loadPacingConfig(): PacingConfig {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return PacingConfigSchema.parse(JSON.parse(raw));
}

describe('pacing engine with real config + road spine', () => {
  const config = loadPacingConfig();
  const spine = loadRoadSpine();
  const totalDistance = spine.totalDistance;

  it('generates placements across the full road distance', () => {
    const placements = generatePlacements(
      totalDistance,
      config,
      'integration-seed',
    );
    expect(placements.length).toBeGreaterThan(0);

    // First placement should be near the start
    expect(placements[0].distance).toBeLessThan(1000);

    // Last placement should be near the end
    const last = placements[placements.length - 1];
    expect(last.distance).toBeGreaterThan(totalDistance * 0.8);
  });

  it('produces placements at all three tiers', () => {
    const placements = generatePlacements(
      totalDistance,
      config,
      'integration-seed',
    );
    const tiers = new Set(placements.map((p) => p.tier));
    expect(tiers.has('ambient')).toBe(true);
    expect(tiers.has('minor')).toBe(true);
    expect(tiers.has('major')).toBe(true);
  });

  it('ambient density matches real config intervals', () => {
    const placements = generatePlacements(
      totalDistance,
      config,
      'integration-seed',
    );
    const ambientCount = placements.filter((p) => p.tier === 'ambient').length;

    // Real config ambient interval: compute expected range
    const [minInterval, maxInterval] = config.ambientInterval;
    const avgInterval = (minInterval + maxInterval) / 2;
    const expectedCount = totalDistance / avgInterval;

    // Allow 50% variance for jitter
    expect(ambientCount).toBeGreaterThan(expectedCount * 0.5);
    expect(ambientCount).toBeLessThan(expectedCount * 1.5);
  });

  it('major placements are rarer than minor, which are rarer than ambient', () => {
    const placements = generatePlacements(
      totalDistance,
      config,
      'integration-seed',
    );
    const counts = {
      ambient: placements.filter((p) => p.tier === 'ambient').length,
      minor: placements.filter((p) => p.tier === 'minor').length,
      major: placements.filter((p) => p.tier === 'major').length,
    };
    expect(counts.ambient).toBeGreaterThan(counts.minor);
    expect(counts.minor).toBeGreaterThan(counts.major);
  });

  it('no placements exceed total distance', () => {
    const placements = generatePlacements(
      totalDistance,
      config,
      'integration-seed',
    );
    for (const p of placements) {
      expect(p.distance).toBeLessThan(totalDistance);
      expect(p.distance).toBeGreaterThanOrEqual(0);
    }
  });

  it('placements are in ascending distance order', () => {
    const placements = generatePlacements(
      totalDistance,
      config,
      'integration-seed',
    );
    for (let i = 1; i < placements.length; i++) {
      expect(placements[i].distance).toBeGreaterThanOrEqual(
        placements[i - 1].distance,
      );
    }
  });

  it('generateRoadPacing validates the real config', () => {
    const placements = generateRoadPacing(
      totalDistance,
      config,
      'integration-seed',
    );
    expect(placements.length).toBeGreaterThan(0);
  });

  it('every road region between anchors has placements', () => {
    const placements = generatePlacements(
      totalDistance,
      config,
      'integration-seed',
    );

    // Check that each inter-anchor segment has at least some content
    for (let i = 0; i < spine.anchors.length - 1; i++) {
      const start = spine.anchors[i].distanceFromStart;
      const end = spine.anchors[i + 1].distanceFromStart;
      const segmentPlacements = placements.filter(
        (p) => p.distance >= start && p.distance < end,
      );
      expect(
        segmentPlacements.length,
        `No placements between ${spine.anchors[i].name} (${start}) and ${spine.anchors[i + 1].name} (${end})`,
      ).toBeGreaterThan(0);
    }
  });

  it('determinism: same seed + real config = identical output', () => {
    const a = generatePlacements(totalDistance, config, 'stable-seed');
    const b = generatePlacements(totalDistance, config, 'stable-seed');
    expect(a).toEqual(b);
  });
});
