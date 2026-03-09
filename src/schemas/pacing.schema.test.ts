import { describe, it, expect } from 'vitest';
import { PacingConfigSchema } from './pacing.schema';

describe('Pacing Schema', () => {
  it('validates a complete pacing config', () => {
    const pacing = {
      ambientInterval: [50, 150],
      minorInterval: [200, 400],
      majorInterval: [800, 1500],
      questMicroInterval: [300, 600],
      questMesoInterval: [1000, 2000],
      questMacroInterval: [3000, 6000],
      anchorInterval: [4000, 8000],
      walkSpeed: 4,
      sprintSpeed: 7,
    };
    expect(() => PacingConfigSchema.parse(pacing)).not.toThrow();
  });

  it('applies default walkSpeed and sprintSpeed', () => {
    const pacing = {
      ambientInterval: [50, 150],
      minorInterval: [200, 400],
      majorInterval: [800, 1500],
      questMicroInterval: [300, 600],
      questMesoInterval: [1000, 2000],
      questMacroInterval: [3000, 6000],
      anchorInterval: [4000, 8000],
    };
    const parsed = PacingConfigSchema.parse(pacing);
    expect(parsed.walkSpeed).toBe(4);
    expect(parsed.sprintSpeed).toBe(7);
  });

  it('rejects interval where min > max', () => {
    const pacing = {
      ambientInterval: [200, 50], // min > max
      minorInterval: [200, 400],
      majorInterval: [800, 1500],
      questMicroInterval: [300, 600],
      questMesoInterval: [1000, 2000],
      questMacroInterval: [3000, 6000],
      anchorInterval: [4000, 8000],
    };
    expect(() => PacingConfigSchema.parse(pacing)).toThrow();
  });

  it('rejects non-positive interval values', () => {
    const pacing = {
      ambientInterval: [0, 150], // 0 is not positive
      minorInterval: [200, 400],
      majorInterval: [800, 1500],
      questMicroInterval: [300, 600],
      questMesoInterval: [1000, 2000],
      questMacroInterval: [3000, 6000],
      anchorInterval: [4000, 8000],
    };
    expect(() => PacingConfigSchema.parse(pacing)).toThrow();
  });

  it('rejects negative walkSpeed', () => {
    const pacing = {
      ambientInterval: [50, 150],
      minorInterval: [200, 400],
      majorInterval: [800, 1500],
      questMicroInterval: [300, 600],
      questMesoInterval: [1000, 2000],
      questMacroInterval: [3000, 6000],
      anchorInterval: [4000, 8000],
      walkSpeed: -1,
      sprintSpeed: 7,
    };
    expect(() => PacingConfigSchema.parse(pacing)).toThrow();
  });
});
