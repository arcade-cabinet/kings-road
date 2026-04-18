import { useEffect, useState } from 'react';
import { getMostRecentSave } from '@/db/save-service';
import type { SaveData } from '@/db/save-service';
import { cn } from '@/lib/utils';
import { generateSeedPhrase, useGameStore } from '@/stores/gameStore';
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

  const [recentSave, setRecentSave] = useState<SaveData | undefined>(undefined);

  useEffect(() => {
    if (gameActive) return;
    let cancelled = false;
    getMostRecentSave()
      .then((save) => {
        if (!cancelled) setRecentSave(save);
      })
      .catch((err) => {
        console.warn('[MainMenu] getMostRecentSave failed:', err);
        if (!cancelled) setRecentSave(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [gameActive]);

  const hasSaves = Boolean(recentSave);

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
        {hasSaves && recentSave && (
          <ContinueCard
            save={recentSave}
            loading={loadingContinue}
            disabled={fadeOut}
            onClick={continueFromSave}
          />
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

// ─────────────────────────────────────────────────────────────────────────────
// ContinueCard — rich resume-a-pilgrimage card
//
// 21st.dev-inspired: the Continue action is not a button, it's a glance-ready
// card showing the pilgrim's seed phrase, how long ago they last stopped, and
// how much time is already in that journey. Tapping anywhere on the card
// resumes.
// ─────────────────────────────────────────────────────────────────────────────

function ContinueCard({
  save,
  loading,
  disabled,
  onClick,
}: {
  save: SaveData;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const playTimeLabel = formatPlayTime(save.playTimeSeconds);
  const savedAtLabel = formatRelativeTime(save.savedAt);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className={cn(
        'w-full mb-3 px-5 py-4 rounded-sm relative overflow-hidden text-left group',
        'border border-[#c4a747]/50 backdrop-blur-sm',
        'active:scale-[0.99] transition-all duration-200',
        'disabled:opacity-70 disabled:cursor-wait',
      )}
      style={{
        background:
          'linear-gradient(180deg, rgba(252,247,235,0.82) 0%, rgba(242,233,210,0.78) 100%)',
        boxShadow:
          '0 1px 0 rgba(255,255,255,0.55) inset, 0 6px 22px rgba(74,56,32,0.18)',
      }}
    >
      {/* Subtle hover sweep — same vocabulary as Set Forth */}
      <span
        aria-hidden
        className={cn(
          'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300',
          'bg-gradient-to-r from-transparent via-[rgba(196,167,71,0.15)] to-transparent',
        )}
      />
      <div className="relative flex items-center gap-4">
        <QuillSeal />
        <div className="flex-1 min-w-0">
          <div className="font-crimson italic text-[#8b6f47]/80 text-[0.6rem] tracking-[0.28em] uppercase">
            {loading ? 'Returning…' : 'Continue'}
          </div>
          <div
            className="font-lora font-semibold text-[#4a3820] text-lg md:text-xl leading-tight truncate mt-0.5"
            title={save.seedPhrase}
          >
            {save.seedPhrase}
          </div>
          <div className="flex items-center gap-3 mt-1 text-[#8b6f47]/75 text-xs font-crimson italic">
            <span>{savedAtLabel}</span>
            <span className="w-px h-3 bg-[#c4a747]/40" aria-hidden="true" />
            <span>{playTimeLabel}</span>
          </div>
        </div>
        <ForwardGlyph />
      </div>
    </button>
  );
}

function QuillSeal() {
  return (
    <div
      className="relative w-10 h-10 flex items-center justify-center rounded-full shrink-0"
      style={{
        background:
          'radial-gradient(circle at 30% 30%, rgba(196,167,71,0.35), rgba(139,111,71,0.18))',
        boxShadow: '0 0 0 1px rgba(196,167,71,0.5) inset',
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5 text-[#8b6f47]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 21 L11 13" />
        <path
          d="M21 3 C13 5 9 9 7 15 L9 17 C15 15 19 11 21 3 Z"
          fill="currentColor"
          fillOpacity="0.3"
        />
      </svg>
    </div>
  );
}

function ForwardGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5 text-[#8b6f47]/60 group-hover:text-[#8b6f47] shrink-0 transition-colors"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M8 5l8 7-8 7" />
    </svg>
  );
}

function formatPlayTime(seconds: number): string {
  if (seconds < 60) return 'just begun';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m walked`;
  return `${m}m walked`;
}

function formatRelativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return 'some time ago';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'moments ago';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  const wks = Math.floor(days / 7);
  if (wks < 5) return `${wks}w ago`;
  const mons = Math.floor(days / 30);
  return `${mons}mo ago`;
}
