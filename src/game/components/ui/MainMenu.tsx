import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { cn } from '../../../lib/utils';
import { generateSeedPhrase, useGameStore } from '../../stores/gameStore';
import { CHUNK_SIZE, PLAYER_HEIGHT } from '../../utils/worldGen';

// Particle type for floating embers
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  hue: number;
}

// Floating ember particle component
function FloatingEmbers() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleId = useRef(0);

  useEffect(() => {
    // Initialize particles
    const initialParticles: Particle[] = [];
    for (let i = 0; i < 40; i++) {
      initialParticles.push({
        id: particleId.current++,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2.5 + 0.8,
        speed: Math.random() * 0.2 + 0.05,
        opacity: Math.random() * 0.4 + 0.15,
        hue: Math.random() * 15 + 45, // warm golden yellow range
      });
    }
    setParticles(initialParticles);

    // Animation loop
    const interval = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            y: p.y - p.speed,
            x: p.x + Math.sin(Date.now() / 1000 + p.id) * 0.1,
            opacity: p.y < 10 ? p.opacity * 0.95 : p.opacity,
          }))
          .map((p) =>
            p.y < -5
              ? {
                  ...p,
                  y: 105,
                  x: Math.random() * 100,
                  opacity: Math.random() * 0.6 + 0.2,
                }
              : p,
          ),
      );
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: `hsla(${p.hue}, 100%, 60%, ${p.opacity})`,
            boxShadow: `0 0 ${p.size * 2}px hsla(${p.hue}, 100%, 50%, ${p.opacity * 0.8})`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  );
}

// Decorative corner ornament
function CornerOrnament({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const transforms = {
    tl: '',
    tr: 'scaleX(-1)',
    bl: 'scaleY(-1)',
    br: 'scale(-1)',
  };
  const positions = {
    tl: 'top-0 left-0',
    tr: 'top-0 right-0',
    bl: 'bottom-0 left-0',
    br: 'bottom-0 right-0',
  };

  return (
    <div
      className={cn(
        'absolute w-8 h-8 pointer-events-none',
        positions[position],
      )}
      style={{ transform: transforms[position] }}
    >
      <svg viewBox="0 0 32 32" className="w-full h-full text-yellow-700/40">
        <path d="M0 0 L12 0 L12 2 L2 2 L2 12 L0 12 Z" fill="currentColor" />
        <path
          d="M0 0 L8 0 L8 1 L1 1 L1 8 L0 8 Z"
          fill="currentColor"
          className="text-yellow-600/50"
        />
      </svg>
    </div>
  );
}

export function MainMenu() {
  const gameActive = useGameStore((state) => state.gameActive);
  const seedPhrase = useGameStore((state) => state.seedPhrase);
  const setSeedPhrase = useGameStore((state) => state.setSeedPhrase);
  const startGame = useGameStore((state) => state.startGame);

  const [isHovering, setIsHovering] = useState<'reseed' | 'enter' | null>(null);
  const [fadeOut, setFadeOut] = useState(false);

  const handleReseed = () => {
    const newSeed = generateSeedPhrase();
    setSeedPhrase(newSeed);
  };

  const handleStart = () => {
    // Ensure we have a seed
    let currentSeed = seedPhrase;
    if (!currentSeed) {
      currentSeed = generateSeedPhrase();
      setSeedPhrase(currentSeed);
    }

    // Trigger fade out
    setFadeOut(true);

    // Delay game start for animation, then start atomically
    setTimeout(() => {
      startGame(
        currentSeed,
        new THREE.Vector3(CHUNK_SIZE / 2, PLAYER_HEIGHT, CHUNK_SIZE / 2),
        Math.PI,
      );
    }, 600);
  };

  // Generate initial seed if needed
  useEffect(() => {
    if (!seedPhrase && !gameActive) {
      const newSeed = generateSeedPhrase();
      setSeedPhrase(newSeed);
    }
  }, [seedPhrase, gameActive, setSeedPhrase]);

  if (gameActive) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 z-50 flex flex-col items-center justify-center transition-all duration-700',
        fadeOut ? 'opacity-0 scale-105' : 'opacity-100 scale-100',
      )}
      style={{
        background:
          'radial-gradient(ellipse at center bottom, #f5f1e8 0%, #ede8dc 50%, #e8d7c3 100%)',
      }}
    >
      {/* Animated background particles */}
      <FloatingEmbers />

      {/* Gentle vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.08) 100%)',
        }}
      />

      {/* Decorative background rune circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-[0.03] pointer-events-none">
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full animate-spin"
          style={{ animationDuration: '120s' }}
        >
          <circle
            cx="100"
            cy="100"
            r="95"
            fill="none"
            stroke="#c4a747"
            strokeWidth="0.5"
          />
          <circle
            cx="100"
            cy="100"
            r="85"
            fill="none"
            stroke="#c4a747"
            strokeWidth="0.3"
            strokeDasharray="8 4"
          />
          <circle
            cx="100"
            cy="100"
            r="75"
            fill="none"
            stroke="#c4a747"
            strokeWidth="0.5"
          />
          {[...Array(12)].map((_, i) => (
            <line
              key={i}
              x1="100"
              y1="5"
              x2="100"
              y2="25"
              stroke="#c4a747"
              strokeWidth="0.5"
              transform={`rotate(${i * 30} 100 100)`}
            />
          ))}
        </svg>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Title with glow effect */}
        <div className="relative">
          <h1
            className="font-lora text-6xl md:text-8xl font-bold tracking-[0.05em] mb-0"
            style={{
              color: '#8b6f47',
              textShadow:
                '0 0 20px rgba(196, 167, 71, 0.15), 0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            King's Road
          </h1>
          {/* Subtitle */}
          <div className="text-yellow-700/70 text-sm md:text-base tracking-[0.3em] font-light uppercase mt-3 text-center">
            Seek the Holy Grail
          </div>
          {/* Decorative line */}
          <div className="w-48 h-px bg-gradient-to-r from-transparent via-yellow-600/30 to-transparent mx-auto mt-4" />
        </div>

        {/* Seed Container */}
        <div className="relative bg-yellow-50/90 p-8 px-12 md:px-16 border border-yellow-900/20 mt-10 backdrop-blur-sm shadow-sm">
          {/* Corner ornaments */}
          <CornerOrnament position="tl" />
          <CornerOrnament position="tr" />
          <CornerOrnament position="bl" />
          <CornerOrnament position="br" />

          {/* Decorative top/bottom lines */}
          <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-yellow-600/30 to-transparent" />
          <div className="absolute -bottom-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-yellow-600/30 to-transparent" />

          {/* Inner glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-yellow-100/40 to-transparent pointer-events-none" />

          <div className="text-xs text-yellow-700/70 uppercase tracking-[0.3em] mb-4 text-center font-light flex items-center justify-center gap-3">
            <span className="w-8 h-px bg-gradient-to-r from-transparent to-yellow-600/40" />
            Realm Seed
            <span className="w-8 h-px bg-gradient-to-l from-transparent to-yellow-600/40" />
          </div>

          <div
            className="font-lora text-2xl md:text-3xl font-semibold text-yellow-900 tracking-wider text-center min-w-[280px]"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            {seedPhrase || 'Generating...'}
          </div>

          {/* Buttons */}
          <div className="flex gap-4 justify-center mt-8">
            <button
              type="button"
              onClick={handleReseed}
              onMouseEnter={() => setIsHovering('reseed')}
              onMouseLeave={() => setIsHovering(null)}
              className={cn(
                'relative border border-yellow-700/40 bg-yellow-100/60',
                'text-yellow-800 px-6 md:px-8 py-3',
                'font-lora text-sm font-semibold tracking-wider uppercase',
                'transition-all duration-300 cursor-pointer overflow-hidden',
                isHovering === 'reseed' &&
                  'border-yellow-600/70 text-yellow-900 bg-yellow-200/70',
              )}
            >
              {/* Hover shine effect */}
              <div
                className={cn(
                  'absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full transition-transform duration-500',
                  isHovering === 'reseed' && 'translate-x-full',
                )}
              />
              <span className="relative">Reseed</span>
            </button>

            <button
              type="button"
              onClick={handleStart}
              onMouseEnter={() => setIsHovering('enter')}
              onMouseLeave={() => setIsHovering(null)}
              className={cn(
                'relative border border-rose-700/40 bg-gradient-to-b from-rose-100/70 to-rose-50/70',
                'text-rose-900 px-6 md:px-10 py-3',
                'font-lora text-sm font-semibold tracking-wider uppercase',
                'transition-all duration-300 cursor-pointer overflow-hidden',
                isHovering === 'enter' &&
                  'border-rose-600/70 text-rose-900 shadow-lg shadow-rose-200/40 scale-105',
              )}
            >
              {/* Hover shine effect */}
              <div
                className={cn(
                  'absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full transition-transform duration-500',
                  isHovering === 'enter' && 'translate-x-full',
                )}
              />
              {/* Gentle glow when hovered */}
              {isHovering === 'enter' && (
                <div className="absolute inset-0 bg-rose-300/15 animate-pulse" />
              )}
              <span className="relative">Enter Realm</span>
            </button>
          </div>
        </div>

        {/* Features list */}
        <div className="mt-12 text-center">
          <div className="text-yellow-700/60 text-xs tracking-[0.2em] mb-4 uppercase font-light">
            Features
          </div>
          <div className="flex flex-wrap gap-3 justify-center max-w-lg">
            {[
              { name: 'Procedural Worlds', icon: '◇' },
              { name: 'Day/Night Cycle', icon: '☀' },
              { name: 'NPCs & Dialogue', icon: '◈' },
              { name: 'Dungeon Exploration', icon: '▣' },
            ].map((feature, i) => (
              <span
                key={feature.name}
                className="px-4 py-2 bg-yellow-100/40 border border-yellow-600/20 text-yellow-800 text-xs tracking-wider uppercase flex items-center gap-2 hover:text-yellow-900 hover:bg-yellow-100/60 hover:border-yellow-600/40 transition-colors"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <span className="text-yellow-700/70">{feature.icon}</span>
                {feature.name}
              </span>
            ))}
          </div>
        </div>

        {/* Controls hint */}
        <div className="mt-10 text-yellow-800/70 text-xs tracking-wider text-center hidden md:block">
          Press <span className="text-yellow-900 font-semibold">WASD</span> to
          move | <span className="text-yellow-900 font-semibold">E</span> to
          interact |{' '}
          <span className="text-yellow-900 font-semibold">SPACE</span> to jump
        </div>
      </div>
    </div>
  );
}
