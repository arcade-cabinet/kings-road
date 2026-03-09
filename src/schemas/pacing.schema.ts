import { z } from 'zod';

const IntervalRange = z
  .tuple([z.number().positive(), z.number().positive()])
  .refine(([min, max]) => min <= max, { message: 'min must be <= max' });

export const PacingConfigSchema = z.object({
  ambientInterval: IntervalRange,
  minorInterval: IntervalRange,
  majorInterval: IntervalRange,
  questMicroInterval: IntervalRange,
  questMesoInterval: IntervalRange,
  questMacroInterval: IntervalRange,
  anchorInterval: IntervalRange,
  walkSpeed: z.number().positive().default(4),
  sprintSpeed: z.number().positive().default(7),
});
export type PacingConfig = z.infer<typeof PacingConfigSchema>;
