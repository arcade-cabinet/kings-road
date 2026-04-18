import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useGameStore } from '@/stores/gameStore';
import { generateSeedPhrase } from '@/stores/gameStore';
import { hasAnySave } from '@/db/save-service';
import { useState } from 'react';
import { ShaderBackdrop } from './ShaderBackdrop';
import { useMenuOrchestrator } from './useMenuOrchestrator';
import { VellumOrnaments } from './VellumOrnaments';

// ── Copy ──────────────────────────────────────────────────────────────
// Narrative, not UI-builder. The player is a pilgrim, not a "user."
const COPY = {
  eyebrow: 'The Pilgrimage of',
  title: "King's Road",
  tagline:
    'The road runs from the hearths of Ashford to the temple at Grailsend. ' +
    'Thirty kilometres of meadows, bridges, bandits, and bells.',
  seedLabel: 'Your Pilgrimage Begins With',
  seedExplain:
    'Each journey is named for the land it weaves. Change yours, or keep it.',
  reseed: 'Name Another Road',
  start: 'Set Forth',
  continue: 'Return to the Road',
  continueLoading: 'Finding the road…',
} as const;

export function MainMenu() {
  const gameActive = useGameStore((s) => s.gameActive);
  const seedPhrase = useGameStore((s) => s.seedPhrase);
  const setSeedPhrase = useGameStore((s) => s.setSeedPhrase);

  const {
    fadeOut,
    loadingContinue,
    bootError,
    continueFromSave,
    beginNewPilgrimage,
    reseed,
  } = useMenuOrchestrator();

  const [hasSaves, setHasSaves] = useState(false);

  useEffect(() => {
    if (!gameActive) {
      hasAnySave().then(setHasSaves);
    }
  }, [gameActive]);

  useEffect(() => {
    if (!seedPhrase && !gameActive) {
      setSeedPhrase(generateSeedPhrase());
    }
  }, [seedPhrase, gameActive, setSeedPhrase]);

  if (gameActive) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 z-50 overflow-hidden',
        'flex flex-col items-center justify-between',
        'px-6 py-[max(env(safe-area-inset-top),2rem)]',
        'transition-all duration-700 ease-out',
        fadeOut ? 'opacity-0 scale-[1.02]' : 'opacity-100 scale-100',
      )}
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 2rem)' }}
    >
      <ShaderBackdrop />

      <header className="relative z-10 flex flex-col items-center text-center pt-10 md:pt-16">
        <div className="font-crimson italic text-[#8b6f47]/80 text-sm md:text-base tracking-[0.18em] uppercase">
          {COPY.eyebrow}
        </div>
        <h1
          className="font-lora font-bold text-[#4a3820] leading-[0.92] text-[clamp(3.5rem,11vw,7rem)] mt-2"
          style={{
            textShadow:
              '0 1px 0 rgba(255,255,255,0.5), 0 2px 8px rgba(196,167,71,0.25), 0 8px 32px rgba(139,111,71,0.18)',
          }}
        >
          {COPY.title}
        </h1>
        <div className="flex items-center gap-3 mt-4 opacity-70">
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#c4a747]" />
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 text-[#c4a747]"
            aria-hidden="true"
            fill="currentColor"
          >
            <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" />
          </svg>
          <span className="h-px w-10 bg-gradient-to-l from-transparent to-[#c4a747]" />
        </div>
        <p className="font-crimson text-[#3d3a34]/80 text-sm md:text-base leading-relaxed mt-5 max-w-[24rem] md:max-w-[32rem] italic">
          {COPY.tagline}
        </p>
      </header>

      <section className="relative z-10 flex flex-col items-center w-full max-w-[26rem] md:max-w-[30rem]">
        <div
          className="relative w-full rounded-sm px-6 py-7 md:px-10 md:py-8 backdrop-blur-sm"
          style={{
            background:
              'linear-gradient(180deg, rgba(252,247,235,0.92) 0%, rgba(242,233,210,0.88) 100%)',
            boxShadow:
              '0 1px 0 rgba(255,255,255,0.6) inset, 0 0 0 1px rgba(196,167,71,0.35), 0 14px 48px rgba(74,56,32,0.22)',
          }}
        >
          <VellumOrnaments />
          <div className="text-[#8b6f47] text-[0.65rem] md:text-xs tracking-[0.3em] uppercase text-center font-crimson">
            {COPY.seedLabel}
          </div>
          <div
            className="font-lora text-[#4a3820] text-2xl md:text-3xl font-semibold tracking-wide text-center mt-3"
            style={{ textShadow: '0 1px 0 rgba(255,255,255,0.5)' }}
          >
            {seedPhrase || '…'}
          </div>
          <p className="font-crimson italic text-[#8b6f47]/75 text-xs text-center mt-2 leading-snug">
            {COPY.seedExplain}
          </p>

          <button
            type="button"
            onClick={reseed}
            disabled={loadingContinue || fadeOut}
            className={cn(
              'mt-5 w-full py-2.5 rounded-sm',
              'font-crimson italic text-sm text-[#8b6f47]',
              'border border-[#c4a747]/40 bg-white/40',
              'hover:bg-[#c4a747]/10 hover:border-[#c4a747]/70',
              'active:scale-[0.99] transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {COPY.reseed}
          </button>
        </div>
      </section>

      <footer className="relative z-10 flex flex-col items-center w-full max-w-[26rem] md:max-w-[30rem] pb-6">
        {bootError && (
          <div
            className={cn(
              'mb-3 w-full px-4 py-2 rounded-sm text-center',
              'font-crimson italic text-sm text-[#7a2c1d]',
              'border border-[#7a2c1d]/40 bg-[#fdf0e8]/90',
            )}
            role="alert"
          >
            The road faltered: {bootError}
          </div>
        )}
        {hasSaves && (
          <button
            type="button"
            onClick={continueFromSave}
            disabled={loadingContinue || fadeOut}
            className={cn(
              'w-full py-3 mb-3 rounded-sm',
              'font-crimson italic text-base text-[#4a3820]',
              'border border-[#c4a747]/50 bg-[#fcf7eb]/70 backdrop-blur-sm',
              'hover:bg-[#fcf7eb]/90 hover:border-[#c4a747]',
              'active:scale-[0.99] transition-all duration-200',
              'disabled:opacity-60 disabled:cursor-wait',
            )}
          >
            {loadingContinue ? COPY.continueLoading : COPY.continue}
          </button>
        )}
        <button
          type="button"
          onClick={() => beginNewPilgrimage(seedPhrase)}
          disabled={loadingContinue || fadeOut}
          className={cn(
            'w-full py-4 rounded-sm relative overflow-hidden group',
            'font-lora font-semibold text-base tracking-[0.12em] uppercase text-[#fcf7eb]',
            'border border-[#8b6f47]',
            'active:scale-[0.99] transition-all duration-300',
            'shadow-[0_10px_30px_-10px_rgba(139,111,71,0.6),0_0_0_1px_rgba(196,167,71,0.3)]',
            'disabled:opacity-70 disabled:cursor-wait',
          )}
          style={{
            background:
              'linear-gradient(180deg, #8b6f47 0%, #6d573a 100%)',
          }}
        >
          <span
            aria-hidden
            className={cn(
              'absolute inset-0 opacity-0 group-hover:opacity-100',
              'bg-gradient-to-r from-transparent via-[rgba(252,247,235,0.2)] to-transparent',
              'kr-menu-sweep',
            )}
          />
          <span className="relative">{COPY.start}</span>
        </button>
        <div className="mt-3 text-[#8b6f47]/55 text-[0.65rem] tracking-[0.25em] uppercase font-crimson">
          vi · mmxxvi
        </div>
      </footer>
    </div>
  );
}
