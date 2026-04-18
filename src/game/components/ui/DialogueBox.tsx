import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../../lib/utils';
import { useGameStore } from '../../stores/gameStore';
import { Portrait3D } from './Portrait3D';

// ---------------------------------------------------------------------------
// Typewriter hook
// ---------------------------------------------------------------------------

function useTypewriter(text: string, speed: number = 30) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setIsComplete(false);

    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  const skip = () => {
    setDisplayedText(text);
    setIsComplete(true);
  };

  return { displayedText, isComplete, skip };
}

// ---------------------------------------------------------------------------
// NPC portrait data — archetype to silhouette + palette
// ---------------------------------------------------------------------------

const NPC_PORTRAITS: Record<
  string,
  { bgColor: string; accentColor: string; silhouette: string; label: string }
> = {
  blacksmith: {
    bgColor: '#5c4033',
    accentColor: '#c4a747',
    silhouette:
      'M12 4a3 3 0 00-3 3v1H7l-1 2v6h2v4h8v-4h2v-6l-1-2h-2V7a3 3 0 00-3-3z',
    label: 'Master Smith',
  },
  innkeeper: {
    bgColor: '#4a6340',
    accentColor: '#8baa60',
    silhouette:
      'M12 3a3.5 3.5 0 00-3.5 3.5V8H6l-1 3v5h2v4h10v-4h2v-5l-1-3h-2.5V6.5A3.5 3.5 0 0012 3z',
    label: 'Innkeeper',
  },
  merchant: {
    bgColor: '#6b5344',
    accentColor: '#b8962e',
    silhouette:
      'M12 3a3 3 0 00-3 3v1.5L6 9l-.5 2.5V16h2v4h9v-4h2v-4.5L18 9l-3-1.5V6a3 3 0 00-3-3z',
    label: 'Traveling Merchant',
  },
  wanderer: {
    bgColor: '#5a6a7a',
    accentColor: '#a89078',
    silhouette:
      'M12 2a4 4 0 00-4 4v2l-2.5 1.5L5 12v4h2v4h10v-4h2v-4l-.5-2.5L16 8V6a4 4 0 00-4-4z',
    label: 'Wanderer',
  },
  healer: {
    bgColor: '#4a5a4a',
    accentColor: '#7aaa7a',
    silhouette:
      'M12 3a3 3 0 00-3 3v2H6v3l1 1v4h2v4h6v-4h2v-4l1-1V8h-3V6a3 3 0 00-3-3z',
    label: 'Healer',
  },
  knight: {
    bgColor: '#4a4a5a',
    accentColor: '#8888bb',
    silhouette:
      'M12 1l-2 3v3H7l-2 2v4l1 1v2h2v4h8v-4h2v-2l1-1V9l-2-2h-3V4l-2-3z',
    label: 'Knight',
  },
  hermit: {
    bgColor: '#5a5044',
    accentColor: '#9a8a6a',
    silhouette:
      'M12 2a4 4 0 00-4 4v3l-3 2v3l2 1v5h10v-5l2-1v-3l-3-2V6a4 4 0 00-4-4z',
    label: 'Hermit',
  },
  farmer: {
    bgColor: '#5a6a44',
    accentColor: '#8a9a5a',
    silhouette:
      'M12 4a3 3 0 00-3 3v1H6l-1 2v5h2v5h10v-5h2v-5l-1-2h-3V7a3 3 0 00-3-3z',
    label: 'Farmer',
  },
  priest: {
    bgColor: '#4a4050',
    accentColor: '#9a8aaa',
    silhouette:
      'M12 1l-1 2v4H7l-1.5 2V14l1.5 1v5h10v-5l1.5-1V9L17 7h-4V3l-1-2z',
    label: 'Priest',
  },
  noble: {
    bgColor: '#5a3040',
    accentColor: '#c4a060',
    silhouette: 'M12 1l-3 2v4H6l-1 2v5l2 1v5h10v-5l2-1v-5l-1-2h-3V3l-3-2z',
    label: 'Noble',
  },
  scholar: {
    bgColor: '#3a4a5a',
    accentColor: '#8a9aaa',
    silhouette:
      'M12 3a3.5 3.5 0 00-3.5 3.5V8H6l-1 2v6h2v4h10v-4h2v-6l-1-2h-2.5V6.5A3.5 3.5 0 0012 3z',
    label: 'Scholar',
  },
  pilgrim: {
    bgColor: '#5a5a44',
    accentColor: '#aaa888',
    silhouette:
      'M12 2a4 4 0 00-4 4v2l-2.5 1.5L5 12v4h2v4h10v-4h2v-4l-.5-2.5L16 8V6a4 4 0 00-4-4z',
    label: 'Pilgrim',
  },
  captain: {
    bgColor: '#4a4a5a',
    accentColor: '#aaa070',
    silhouette:
      'M12 1l-2 3v3H7l-2 2v4l1 1v2h2v4h8v-4h2v-2l1-1V9l-2-2h-3V4l-2-3z',
    label: 'Captain',
  },
  guard: {
    bgColor: '#4a4a50',
    accentColor: '#8a8a9a',
    silhouette:
      'M12 1l-2 3v3H7l-2 2v4l1 1v2h2v4h8v-4h2v-2l1-1V9l-2-2h-3V4l-2-3z',
    label: 'Guard',
  },
  herbalist: {
    bgColor: '#4a5a3a',
    accentColor: '#7aaa5a',
    silhouette:
      'M12 3a3 3 0 00-3 3v2H6v3l1 1v4h2v4h6v-4h2v-4l1-1V8h-3V6a3 3 0 00-3-3z',
    label: 'Herbalist',
  },
  lord: {
    bgColor: '#5a2a3a',
    accentColor: '#c4a040',
    silhouette: 'M12 1l-3 2v4H6l-1 2v5l2 1v5h10v-5l2-1v-5l-1-2h-3V3l-3-2z',
    label: 'Lord',
  },
  miller: {
    bgColor: '#6a6050',
    accentColor: '#a09070',
    silhouette:
      'M12 4a3 3 0 00-3 3v1H6l-1 2v5h2v5h10v-5h2v-5l-1-2h-3V7a3 3 0 00-3-3z',
    label: 'Miller',
  },
  jailer: {
    bgColor: '#3a3a40',
    accentColor: '#7a7a8a',
    silhouette:
      'M12 2a3.5 3.5 0 00-3.5 3.5V8H6l-1 2v4l1 1v5h12v-5l1-1v-4l-1-2h-2.5V5.5A3.5 3.5 0 0012 2z',
    label: 'Jailer',
  },
  stablehand: {
    bgColor: '#5a5a3a',
    accentColor: '#9a9060',
    silhouette:
      'M12 4a3 3 0 00-3 3v1H6l-1 2v5h2v5h10v-5h2v-5l-1-2h-3V7a3 3 0 00-3-3z',
    label: 'Stablehand',
  },
  watchman: {
    bgColor: '#4a4a50',
    accentColor: '#8a8a9a',
    silhouette:
      'M12 1l-2 3v3H7l-2 2v4l1 1v2h2v4h8v-4h2v-2l1-1V9l-2-2h-3V4l-2-3z',
    label: 'Watchman',
  },
};

const DEFAULT_PORTRAIT = NPC_PORTRAITS.wanderer;

// ---------------------------------------------------------------------------
// NPC Portrait — silhouette on tinted background
// ---------------------------------------------------------------------------

function NPCPortrait({ npcType }: { npcType?: string }) {
  return <Portrait3D type={npcType ?? 'wanderer'} />;
}

// ---------------------------------------------------------------------------
// Decorative scroll border corners — illuminated manuscript style
// ---------------------------------------------------------------------------

function ScrollCorner({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const isTop = position.includes('t');
  const isLeft = position.includes('l');

  return (
    <div
      className={cn(
        'absolute w-8 h-8 pointer-events-none',
        isTop ? '-top-[1px]' : '-bottom-[1px]',
        isLeft ? '-left-[1px]' : '-right-[1px]',
      )}
    >
      <svg
        viewBox="0 0 32 32"
        className="w-full h-full"
        style={{ color: '#8b6f47' }}
        aria-hidden="true"
      >
        {/* Outer L-bracket */}
        <path
          d={
            isTop
              ? isLeft
                ? 'M0 0 L14 0 L14 2.5 L2.5 2.5 L2.5 14 L0 14 Z'
                : 'M32 0 L18 0 L18 2.5 L29.5 2.5 L29.5 14 L32 14 Z'
              : isLeft
                ? 'M0 32 L14 32 L14 29.5 L2.5 29.5 L2.5 18 L0 18 Z'
                : 'M32 32 L18 32 L18 29.5 L29.5 29.5 L29.5 18 L32 18 Z'
          }
          fill="currentColor"
        />
        {/* Inner decorative dot */}
        <circle
          cx={isLeft ? 6 : 26}
          cy={isTop ? 6 : 26}
          r="1.5"
          fill="currentColor"
          opacity="0.5"
        />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Horizontal divider — illuminated manuscript rule
// ---------------------------------------------------------------------------

function ManuscriptDivider() {
  return (
    <div className="relative h-[1px] my-3">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-700/40 to-transparent" />
      {/* Central diamond ornament */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-amber-700/30" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Choice button — medieval tab style
// ---------------------------------------------------------------------------

function ChoiceButton({
  text,
  onClick,
  index,
}: {
  text: string;
  onClick: () => void;
  index: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative text-left w-full px-5 py-2.5',
        'bg-gradient-to-r from-amber-100/60 via-amber-50/40 to-amber-100/60',
        'border border-amber-700/25',
        'font-crimson text-[15px] text-yellow-900 leading-snug',
        'hover:from-amber-200/70 hover:via-amber-100/50 hover:to-amber-200/70',
        'hover:border-amber-700/40 hover:text-yellow-950',
        'transition-all duration-150 cursor-pointer group',
      )}
    >
      {/* Left tab indicator */}
      <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber-700/30 group-hover:bg-amber-700/60 transition-colors" />

      <span className="flex items-baseline gap-2">
        <span className="font-lora text-xs text-amber-700/50 tracking-wider">
          {String.fromCharCode(65 + index)}.
        </span>
        <span>{text}</span>
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main DialogueBox component
// ---------------------------------------------------------------------------

export function DialogueBox() {
  const inDialogue = useGameStore((state) => state.inDialogue);
  const dialogueName = useGameStore((state) => state.dialogueName);
  const dialogueText = useGameStore((state) => state.dialogueText);
  const dialogueType = useGameStore((state) => state.dialogueType);
  const currentInteractable = useGameStore(
    (state) => state.currentInteractable,
  );
  const closeDialogue = useGameStore((state) => state.closeDialogue);

  const [isClosing, setIsClosing] = useState(false);
  const [animPhase, setAnimPhase] = useState<'entering' | 'open' | 'closing'>(
    'entering',
  );
  const { displayedText, isComplete, skip } = useTypewriter(dialogueText, 25);
  const dialogueRef = useRef<HTMLDivElement>(null);

  // Open animation
  useEffect(() => {
    if (inDialogue) {
      setIsClosing(false);
      setAnimPhase('entering');
      const timer = setTimeout(() => setAnimPhase('open'), 300);
      return () => clearTimeout(timer);
    }
  }, [inDialogue]);

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setAnimPhase('closing');
    setTimeout(() => {
      closeDialogue();
      setIsClosing(false);
    }, 250);
  }, [isClosing, closeDialogue]);

  const handleClick = () => {
    if (!isComplete) {
      skip();
    }
  };

  // Keyboard handler — ESC to close, Space/Enter to skip typewriter
  useEffect(() => {
    if (!inDialogue && !isClosing) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!isComplete) {
          skip();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [inDialogue, isClosing, isComplete, handleClose, skip]);

  if (!inDialogue && !isClosing) return null;

  const npcType = currentInteractable?.type;
  const _portrait = NPC_PORTRAITS[npcType ?? ''] ?? DEFAULT_PORTRAIT;

  return (
    <div
      className={cn(
        'absolute inset-0 z-20 pointer-events-none',
        'transition-opacity duration-250',
        animPhase === 'closing' && 'opacity-0',
      )}
    >
      {/* Darkened backdrop with warm vignette */}
      {/* biome-ignore lint/a11y/useSemanticElements: full-screen backdrop overlay */}
      <div
        className="absolute inset-0 pointer-events-auto cursor-pointer"
        role="button"
        tabIndex={0}
        onClick={handleClose}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleClose();
        }}
        style={{
          background:
            'radial-gradient(ellipse at center bottom, rgba(20,15,10,0.3) 0%, rgba(15,10,5,0.65) 100%)',
        }}
      />

      {/* Dialogue scroll */}
      {/* biome-ignore lint/a11y/useSemanticElements: dialogue container with click-to-skip */}
      <div
        ref={dialogueRef}
        className={cn(
          'absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2',
          'w-[95%] md:w-[720px] max-w-[800px]',
          'pointer-events-auto',
          'transition-all duration-300 ease-out',
          animPhase === 'entering' && 'translate-y-6 opacity-0 scale-[0.97]',
          animPhase === 'open' && 'translate-y-0 opacity-100 scale-100',
          animPhase === 'closing' && 'translate-y-4 opacity-0 scale-[0.98]',
        )}
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleClick();
        }}
      >
        {/* Parchment panel */}
        <div
          className="relative border overflow-hidden"
          style={{
            backgroundColor: '#f5f0e8',
            borderColor: '#8b6f4766',
            boxShadow:
              '0 8px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.4)',
          }}
        >
          {/* Parchment texture — subtle radial grain */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: `
                radial-gradient(ellipse at 20% 30%, rgba(210,190,160,0.3), transparent 50%),
                radial-gradient(ellipse at 80% 70%, rgba(200,180,150,0.2), transparent 50%),
                radial-gradient(ellipse at 50% 50%, rgba(220,200,170,0.15), transparent 70%)
              `,
            }}
          />

          {/* Top decorative border band */}
          <div
            className="h-[3px]"
            style={{
              background:
                'linear-gradient(to right, transparent 5%, #8b6f47 15%, #c4a747 50%, #8b6f47 85%, transparent 95%)',
              opacity: 0.5,
            }}
          />

          {/* Scroll corner ornaments */}
          <ScrollCorner position="tl" />
          <ScrollCorner position="tr" />
          <ScrollCorner position="bl" />
          <ScrollCorner position="br" />

          {/* Content */}
          <div className="p-5 md:p-6">
            {/* Header — portrait + NPC name + archetype label */}
            <div className="flex items-start gap-4 mb-1">
              <NPCPortrait npcType={dialogueType} />

              <div className="pt-1 min-w-0 flex-1">
                {/* NPC Name — Lora serif, golden */}
                <div
                  className="font-lora text-xl md:text-2xl font-bold tracking-wide leading-tight"
                  style={{
                    color: '#c4a747',
                    textShadow: '0 1px 3px rgba(196,167,71,0.2)',
                  }}
                >
                  {dialogueName}
                </div>

                {/* Archetype label */}
                <div
                  className="text-[11px] uppercase tracking-[0.2em] mt-1.5 font-semibold"
                  style={{ color: '#8b6f47' }}
                >
                  {NPC_PORTRAITS[dialogueType]?.label ?? dialogueType}
                </div>
              </div>
            </div>

            {/* Manuscript divider */}
            <ManuscriptDivider />

            {/* Dialogue text — Crimson Text, italic */}
            <div className="relative min-h-[80px] md:min-h-[100px] mb-4 px-1">
              <div
                className="font-crimson text-base md:text-lg leading-relaxed italic"
                style={{ color: '#3d3a34' }}
              >
                {/* Opening quote — decorative drop cap style */}
                <span
                  className="not-italic text-2xl leading-none mr-0.5 align-text-bottom"
                  style={{ color: '#8b6f4740' }}
                >
                  {'\u201C'}
                </span>
                {displayedText}
                {!isComplete && (
                  <span
                    className="inline-block w-[2px] h-[1em] align-text-bottom ml-0.5 animate-pulse"
                    style={{ backgroundColor: '#8b6f47' }}
                  />
                )}
                {isComplete && (
                  <span
                    className="not-italic text-2xl leading-none ml-0.5"
                    style={{ color: '#8b6f4740' }}
                  >
                    {'\u201D'}
                  </span>
                )}
              </div>

              {/* Skip hint */}
              {!isComplete && (
                <div
                  className="absolute bottom-0 right-0 text-[11px] animate-pulse tracking-wider"
                  style={{ color: '#8b6f4780' }}
                >
                  click to skip
                </div>
              )}
            </div>

            {/* Choice buttons area — future dialogue tree support */}
            {/* For now we show a single "Farewell" action */}
            <div className="flex flex-col gap-1.5 mb-3">
              <ChoiceButton
                text="Farewell, friend."
                onClick={handleClose}
                index={0}
              />
            </div>

            {/* Footer hints */}
            <div className="flex justify-between items-center mt-2">
              <div
                className="text-[11px] hidden md:block tracking-wider"
                style={{ color: '#8b6f4760' }}
              >
                <span className="font-bold" style={{ color: '#8b6f47' }}>
                  ESC
                </span>{' '}
                close
              </div>

              {/* Decorative quill ornament */}
              <div className="hidden md:block" style={{ color: '#8b6f4730' }}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                >
                  <path
                    d="M13 1L3 11l-1 4 4-1L16 4z M11 3l2 2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Bottom decorative border band */}
          <div
            className="h-[3px]"
            style={{
              background:
                'linear-gradient(to right, transparent 5%, #8b6f47 15%, #c4a747 50%, #8b6f47 85%, transparent 95%)',
              opacity: 0.5,
            }}
          />
        </div>
      </div>
    </div>
  );
}
