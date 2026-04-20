import { render } from 'vitest-browser-react';
import { beforeEach, expect, test } from 'vitest';
import { MainMenu } from '@app/views/MainMenu/MainMenu';
import { getSeedPhrase, setGameActive, setSeedPhrase } from '@/ecs/actions/game';
import { unsafe_resetSessionEntity } from '@/ecs/world';
import { KootaProvider } from './test-utils';

beforeEach(() => {
  unsafe_resetSessionEntity();
  setGameActive(false);
  setSeedPhrase('');
});

test('MainMenu renders title and primary CTA', async () => {
  const screen = await render(
    <KootaProvider>
      <MainMenu />
    </KootaProvider>,
  );
  await expect.element(screen.getByText(/King's Road/)).toBeInTheDocument();
  await expect
    .element(screen.getByRole('button', { name: /Set Forth/i }))
    .toBeInTheDocument();
  await expect
    .element(screen.getByText(/The Pilgrimage of/i))
    .toBeInTheDocument();
});

test('MainMenu auto-generates a seed phrase on mount when none is set', async () => {
  await render(
    <KootaProvider>
      <MainMenu />
    </KootaProvider>,
  );
  // Effect runs after paint — wait briefly then inspect store.
  await new Promise((r) => setTimeout(r, 30));
  const seed = getSeedPhrase();
  expect(seed).toBeTruthy();
  expect(seed.length).toBeGreaterThan(3);
});
