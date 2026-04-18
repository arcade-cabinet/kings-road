import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateFile } from '../../scripts/validate-trove';
import { PacingConfigSchema } from './pacing.schema';

const CONTENT_DIR = path.resolve(__dirname, '../content');
const CONFIG_PATH = path.join(CONTENT_DIR, 'pacing/config.json');

describe('pacing config integration', () => {
  it('content/pacing/config.json exists', () => {
    expect(fs.existsSync(CONFIG_PATH)).toBe(true);
  });

  it('passes PacingConfigSchema validation', () => {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const data = JSON.parse(raw);
    expect(() => PacingConfigSchema.parse(data)).not.toThrow();
  });

  it('has correct walkSpeed and sprintSpeed', () => {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config = PacingConfigSchema.parse(JSON.parse(raw));
    expect(config.walkSpeed).toBe(4);
    expect(config.sprintSpeed).toBe(7);
  });

  it('all interval values are in expected ranges', () => {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config = PacingConfigSchema.parse(JSON.parse(raw));

    const intervalKeys = [
      'ambientInterval',
      'minorInterval',
      'majorInterval',
      'questMicroInterval',
      'questMesoInterval',
      'questMacroInterval',
      'anchorInterval',
    ] as const;

    for (const name of intervalKeys) {
      const [min, max] = config[name];
      expect(min, `${name} min should be positive`).toBeGreaterThan(0);
      expect(max, `${name} max should be positive`).toBeGreaterThan(0);
      expect(min, `${name} min <= max`).toBeLessThanOrEqual(max);
    }
  });

  it('passes validate-trove pipeline', () => {
    const index = {
      anchorIds: new Set<string>(),
      questIds: new Set<string>(),
      npcArchetypes: new Set<string>(),
      encounterIds: new Set<string>(),
      featureIds: new Set<string>(),
    };
    const result = validateFile(CONFIG_PATH, CONTENT_DIR, index);
    expect(result.status).toBe('pass');
    expect(result.contentType).toBe('pacing');
    expect(result.errors).toHaveLength(0);
  });
});
