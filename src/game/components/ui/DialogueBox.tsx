import { useEffect, useState } from 'react';
import { cn } from '../../../lib/utils';
import { useGameStore } from '../../stores/gameStore';

// Typewriter effect hook
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

// NPC Type to portrait color mapping
const NPC_PORTRAITS: Record<
  string,
  { bgColor: string; accentColor: string; icon: string }
> = {
  blacksmith: { bgColor: '#5c4033', accentColor: '#c4a747', icon: '⚒' },
  innkeeper: { bgColor: '#4a6340', accentColor: '#8baa60', icon: '🍺' },
  merchant: { bgColor: '#6b5344', accentColor: '#b8962e', icon: '💰' },
  wanderer: { bgColor: '#5a6a7a', accentColor: '#a89078', icon: '🧭' },
};

// NPC Portrait component
function NPCPortrait({ npcType }: { npcType?: string }) {
  const portrait =
    NPC_PORTRAITS[npcType || 'wanderer'] || NPC_PORTRAITS.wanderer;

  return (
    <div
      className="relative w-16 h-16 rounded-lg border-2 flex items-center justify-center text-2xl"
      style={{
        backgroundColor: portrait.bgColor,
        borderColor: portrait.accentColor,
        boxShadow: `0 0 20px ${portrait.accentColor}33, inset 0 0 20px ${portrait.accentColor}22`,
      }}
    >
      {/* Decorative inner border */}
      <div
        className="absolute inset-1 rounded border border-opacity-30"
        style={{ borderColor: portrait.accentColor }}
      />
      <span className="relative z-10">{portrait.icon}</span>
    </div>
  );
}

// Decorative corner component
function DialogueCorner({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const isTop = position.includes('t');
  const isLeft = position.includes('l');

  return (
    <div
      className={cn(
        'absolute w-6 h-6 pointer-events-none',
        isTop ? '-top-px' : '-bottom-px',
        isLeft ? '-left-px' : '-right-px',
      )}
    >
      <svg viewBox="0 0 24 24" className="w-full h-full text-yellow-700">
        <path
          d={
            isTop
              ? isLeft
                ? 'M0 0 L10 0 L10 2 L2 2 L2 10 L0 10 Z'
                : 'M24 0 L14 0 L14 2 L22 2 L22 10 L24 10 Z'
              : isLeft
                ? 'M0 24 L10 24 L10 22 L2 22 L2 14 L0 14 Z'
                : 'M24 24 L14 24 L14 22 L22 22 L22 14 L24 14 Z'
          }
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

export function DialogueBox() {
  const inDialogue = useGameStore((state) => state.inDialogue);
  const dialogueName = useGameStore((state) => state.dialogueName);
  const dialogueText = useGameStore((state) => state.dialogueText);
  const currentInteractable = useGameStore(
    (state) => state.currentInteractable,
  );
  const closeDialogue = useGameStore((state) => state.closeDialogue);

  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(true);
  const { displayedText, isComplete, skip } = useTypewriter(dialogueText, 25);

  // Handle opening animation
  useEffect(() => {
    if (inDialogue) {
      setIsOpening(true);
      setIsClosing(false);
      const timer = setTimeout(() => setIsOpening(false), 200);
      return () => clearTimeout(timer);
    }
  }, [inDialogue]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      closeDialogue();
      setIsClosing(false);
    }, 200);
  };

  const handleClick = () => {
    if (!isComplete) {
      skip();
    }
  };

  if (!inDialogue && !isClosing) return null;

  const npcType = currentInteractable?.type;

  return (
    <div
      className={cn(
        'absolute inset-0 z-20 pointer-events-none transition-opacity duration-200',
        isClosing && 'opacity-0',
      )}
    >
      {/* Darkened backdrop with vignette */}
      <div
        className="absolute inset-0 pointer-events-auto cursor-pointer"
        onClick={handleClose}
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* Dialogue box */}
      <div
        className={cn(
          'absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 w-[95%] md:w-[700px] max-w-[800px] pointer-events-auto transition-all duration-200',
          isOpening
            ? 'translate-y-4 opacity-0 scale-95'
            : 'translate-y-0 opacity-100 scale-100',
          isClosing && 'translate-y-4 opacity-0 scale-95',
        )}
        onClick={handleClick}
      >
        <div className="relative bg-gradient-to-b from-amber-50/98 to-yellow-50/98 border border-yellow-700/40 shadow-2xl backdrop-blur-sm">
          {/* Top accent line */}
          <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-amber-600/60 to-transparent" />

          {/* Decorative corners */}
          <DialogueCorner position="tl" />
          <DialogueCorner position="tr" />
          <DialogueCorner position="bl" />
          <DialogueCorner position="br" />

          {/* Inner glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-yellow-100/30 to-transparent pointer-events-none" />

          <div className="p-5 md:p-6">
            {/* Header with portrait and name */}
            <div className="flex items-center gap-4 border-b border-yellow-800/30 pb-4 mb-4">
              <NPCPortrait npcType={npcType} />
              <div>
                <div
                  className="font-lora text-xl md:text-2xl text-yellow-700 font-bold tracking-wide"
                  style={{ textShadow: '0 0 20px rgba(212, 175, 55, 0.3)' }}
                >
                  {dialogueName}
                </div>
                <div className="text-xs text-yellow-900 uppercase tracking-widest mt-1">
                  {npcType === 'blacksmith' && 'Master Smith'}
                  {npcType === 'innkeeper' && 'Innkeeper'}
                  {npcType === 'merchant' && 'Traveling Merchant'}
                  {npcType === 'wanderer' && 'Wanderer'}
                  {!npcType && 'Stranger'}
                </div>
              </div>
            </div>

            {/* Dialogue Text with typewriter effect */}
            <div className="relative min-h-[80px] md:min-h-[100px] mb-5">
              <div className="text-base md:text-lg text-yellow-900 leading-relaxed">
                <span className="text-yellow-700/60">"</span>
                <span className="italic">{displayedText}</span>
                {!isComplete && (
                  <span className="animate-pulse text-yellow-700">|</span>
                )}
                <span className="text-yellow-700/60">"</span>
              </div>

              {/* Click to continue hint */}
              {!isComplete && (
                <div className="absolute bottom-0 right-0 text-xs text-yellow-800 animate-pulse">
                  Click to skip...
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="flex justify-between items-center">
              <div className="text-xs text-yellow-800 hidden md:block">
                Press <span className="text-yellow-900 font-bold">ESC</span> or
                click backdrop to close
              </div>

              <button
                type="button"
                onClick={handleClose}
                className={cn(
                  'relative bg-yellow-100/80 text-yellow-900 border border-yellow-700/50',
                  'px-6 py-2.5 font-lora text-sm font-bold tracking-widest uppercase',
                  'hover:bg-yellow-200 hover:text-yellow-900 hover:border-yellow-700/70',
                  'transition-all duration-200 cursor-pointer overflow-hidden group',
                )}
              >
                {/* Hover shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />

                <span className="relative flex items-center gap-2">
                  <span>Farewell</span>
                  <span className="text-xs text-yellow-800 group-hover:text-yellow-900">
                    →
                  </span>
                </span>
              </button>
            </div>
          </div>

          {/* Bottom accent line */}
          <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-yellow-700/40 to-transparent" />
        </div>
      </div>
    </div>
  );
}
