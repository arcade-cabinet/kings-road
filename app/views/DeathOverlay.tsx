import { useCallback, useEffect, useState } from 'react';
import { resetCombatUI } from '@/ecs/actions/combat-ui';
import { respawn } from '@/ecs/actions/game';
import { useFlags } from '@/ecs/hooks/useGameSession';

export function DeathOverlay() {
  const { isDead } = useFlags();
  const [fadeIn, setFadeIn] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (isDead) {
      // Stagger the fade-in for dramatic effect
      requestAnimationFrame(() => setFadeIn(true));
      const timer = setTimeout(() => setShowPrompt(true), 1500);
      return () => clearTimeout(timer);
    }
    setFadeIn(false);
    setShowPrompt(false);
  }, [isDead]);

  const handleRespawn = useCallback(() => {
    resetCombatUI();
    respawn();
  }, []);

  // Also allow pressing E or Enter to respawn
  useEffect(() => {
    if (!showPrompt) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
        handleRespawn();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showPrompt, handleRespawn]);

  if (!isDead) return null;

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center"
      style={{
        background: fadeIn ? 'rgba(15, 5, 5, 0.85)' : 'rgba(15, 5, 5, 0)',
        transition: 'background 1.2s ease-in',
      }}
    >
      <div
        className="text-center"
        style={{
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 1.5s ease-out',
        }}
      >
        <h1
          style={{
            fontFamily: 'Lora, serif',
            fontSize: '36px',
            fontWeight: 700,
            color: '#a03030',
            textShadow:
              '0 0 30px rgba(160, 48, 48, 0.4), 0 2px 6px rgba(0,0,0,0.6)',
            letterSpacing: '0.15em',
            marginBottom: '12px',
          }}
        >
          You Have Fallen
        </h1>
        <p
          style={{
            fontFamily: 'Crimson Text, serif',
            fontSize: '16px',
            color: 'rgba(196, 167, 71, 0.7)',
            letterSpacing: '0.05em',
          }}
        >
          The road grows dark...
        </p>
      </div>

      {showPrompt && (
        <button
          type="button"
          onClick={handleRespawn}
          className="mt-12 cursor-pointer"
          style={{
            fontFamily: 'Lora, serif',
            fontSize: '16px',
            fontWeight: 600,
            color: '#c4a747',
            background: 'rgba(245, 240, 232, 0.12)',
            border: '1px solid rgba(196, 167, 71, 0.4)',
            padding: '10px 32px',
            letterSpacing: '0.1em',
            opacity: 0,
            animation: 'fadeInUp 0.6s ease-out forwards',
          }}
        >
          Rise Again
        </button>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
