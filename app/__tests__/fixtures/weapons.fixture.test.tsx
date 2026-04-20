/**
 * Phase B1 — weapons fixture test. Mounts 5 diverse authored weapons from
 * app/scene/generated/weapons-pack/ in isolation inside FixtureStage and
 * captures a PNG per variant.
 *
 * Covered shapes: longsword (broadsword), curved sword (katana-standard),
 * bludgeon (kanabo), polearm (yari), dagger (tanto-standard). Together they
 * exercise both typical mesh sizes and geometry shapes.
 *
 * See docs/plans/2026-04-19-visual-fixtures.prq.md (Phase B1).
 */
import { page } from '@vitest/browser/context';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { FixtureStage } from '@app/fixtures/FixtureStage';
import { Model as Broadsword } from '@app/scene/generated/weapons-pack/broadsword';
import { Model as Kanabo } from '@app/scene/generated/weapons-pack/kanabo';
import { Model as KatanaStandard } from '@app/scene/generated/weapons-pack/katana-standard';
import { Model as TantoStandard } from '@app/scene/generated/weapons-pack/tanto-standard';
import { Model as Yari } from '@app/scene/generated/weapons-pack/yari';

const WEAPONS = [
  { name: 'broadsword', Component: Broadsword },
  { name: 'katana-standard', Component: KatanaStandard },
  { name: 'kanabo', Component: Kanabo },
  { name: 'yari', Component: Yari },
  { name: 'tanto-standard', Component: TantoStandard },
] as const;

for (const { name, Component } of WEAPONS) {
  test(
    `weapons fixture — ${name} renders in stage`,
    async () => {
      let ready: () => void = () => undefined;
      const readyPromise = new Promise<void>((resolve) => {
        ready = resolve;
      });

      const screen = await render(
        <FixtureStage cameraDistance={15} onReady={ready}>
          <Component />
        </FixtureStage>,
      );

      await expect
        .element(screen.getByTestId('fixture-stage'))
        .toBeInTheDocument();

      await readyPromise;
      // Small settle for suspense resolve + first shadow pass.
      await new Promise((resolve) => setTimeout(resolve, 300));

      const result = await page.screenshot({
        element: screen.getByTestId('fixture-stage'),
        path: `__screenshots__/weapons/${name}.png`,
      });
      expect(result).toContain(`${name}.png`);
    },
    20_000,
  );
}
