/**
 * Phase B2 — ruins fixture test. Mounts 5 authored ruin GLBs through the
 * shared FixtureStage + GlbAsset path and captures a PNG per variant.
 *
 * Covered shapes: architectural (wall-broken, column-round), funerary
 * (gravestone-cross, coffin-old), and debris (pot-broken-1). This exercises
 * the asset-load path + per-asset scale detection across typical ruin
 * geometries.
 *
 * See docs/plans/2026-04-19-visual-fixtures.prq.md (Phase B2).
 */
import { page } from '@vitest/browser/context';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { FixtureStage } from '@app/fixtures/FixtureStage';
import { GlbAsset } from '@app/fixtures/GlbAsset';

const RUINS = [
  { name: 'wall-broken', path: '/assets/ruins/wall-broken.glb' },
  { name: 'gravestone-cross', path: '/assets/ruins/gravestone-cross.glb' },
  { name: 'coffin-old', path: '/assets/ruins/coffin-old.glb' },
  { name: 'column-round', path: '/assets/ruins/column-round.glb' },
  { name: 'pot-broken-1', path: '/assets/ruins/pot-broken-1.glb' },
] as const;

for (const { name, path } of RUINS) {
  test(
    `ruins fixture — ${name} renders in stage`,
    async () => {
      let ready: () => void = () => undefined;
      const readyPromise = new Promise<void>((resolve) => {
        ready = resolve;
      });

      const screen = await render(
        <FixtureStage cameraDistance={4} onReady={ready}>
          <GlbAsset path={path} scale={1.5} />
        </FixtureStage>,
      );

      await expect
        .element(screen.getByTestId('fixture-stage'))
        .toBeInTheDocument();

      await readyPromise;
      // Two frames for suspense + first shadow pass.
      await new Promise((resolve) => setTimeout(resolve, 300));

      const result = await page.screenshot({
        element: screen.getByTestId('fixture-stage'),
        path: `__screenshots__/ruins/${name}.png`,
      });
      expect(result).toContain(`${name}.png`);
    },
    20_000,
  );
}
