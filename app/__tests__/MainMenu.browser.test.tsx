import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { MainMenu } from '@app/views/MainMenu/MainMenu';
import { useGameStore } from '@/stores/gameStore';

test('MainMenu renders title and primary CTA', async () => {
  useGameStore.setState({ gameActive: false, seedPhrase: '' });
  const screen = await render(<MainMenu />);
  await expect.element(screen.getByText(/King's Road/)).toBeInTheDocument();
  await expect
    .element(screen.getByRole('button', { name: /Set Forth/i }))
    .toBeInTheDocument();
  await expect
    .element(screen.getByText(/The Pilgrimage of/i))
    .toBeInTheDocument();
});

test('MainMenu auto-generates a seed phrase on mount when none is set', async () => {
  useGameStore.setState({ gameActive: false, seedPhrase: '' });
  await render(<MainMenu />);
  // Effect runs after paint — wait briefly then inspect store.
  await new Promise((r) => setTimeout(r, 30));
  const seed = useGameStore.getState().seedPhrase;
  expect(seed).toBeTruthy();
  expect(seed.length).toBeGreaterThan(3);
});
