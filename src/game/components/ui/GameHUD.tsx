import { useEffect, useRef, useState } from 'react';
import { cn } from '../../../lib/utils';
import { useGameStore } from '../../stores/gameStore';

// Animated stat bar component with glow effects
function StatBar({
  value,
  maxValue = 100,
  color,
  glowColor,
  label,
  showLabel = false,
  icon,
}: {
  value: number;
  maxValue?: number;
  color: string;
  glowColor: string;
  label?: string;
  showLabel?: boolean;
  icon?: React.ReactNode;
}) {
  const percentage = Math.max(0, Math.min(100, (value / maxValue) * 100));
  const isLow = percentage < 25;

  return (
    <div className="flex items-center gap-2">
      {icon && (
        <div
          className={cn('text-xs', isLow && 'animate-pulse')}
          style={{ color }}
        >
          {icon}
        </div>
      )}
      <div className="relative w-44 md:w-52 h-2.5 bg-stone-800/70 border border-stone-600/50 rounded-sm overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />

        {/* Main bar */}
        <div
          className={cn(
            'h-full transition-all duration-200 relative',
            isLow && 'animate-pulse',
          )}
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(to right, ${color}88, ${color})`,
          }}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent h-1/2" />
        </div>

        {/* Glow effect when low */}
        {isLow && (
          <div
            className="absolute inset-0 animate-pulse"
            style={{ boxShadow: `inset 0 0 10px ${glowColor}` }}
          />
        )}

        {/* Tick marks */}
        <div className="absolute inset-0 flex">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex-1 border-r border-stone-700/30 last:border-r-0"
            />
          ))}
        </div>
      </div>
      {showLabel && (
        <span className="text-xs text-yellow-900 font-bold min-w-[32px]">
          {Math.round(value)}
        </span>
      )}
    </div>
  );
}

// Compass component
function Compass({ yaw }: { yaw: number }) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const normalizedYaw = ((((-yaw * 180) / Math.PI) % 360) + 360) % 360;

  return (
    <div className="relative w-20 h-6 bg-yellow-100/80 border border-yellow-700/50 rounded overflow-hidden">
      <div
        className="absolute whitespace-nowrap text-xs font-bold tracking-wider flex items-center h-full transition-transform duration-100"
        style={{
          transform: `translateX(${-normalizedYaw * 0.55 + 40}px)`,
        }}
      >
        {[...directions, ...directions, ...directions].map((dir, i) => (
          <span
            key={i}
            className={cn(
              'w-10 text-center',
              dir === 'N'
                ? 'text-red-400'
                : dir === 'S'
                  ? 'text-yellow-700'
                  : 'text-yellow-900',
            )}
          >
            {dir}
          </span>
        ))}
      </div>
      {/* Center indicator */}
      <div className="absolute left-1/2 top-0 w-px h-full bg-amber-400/80 -translate-x-1/2" />
      <div className="absolute left-1/2 top-0 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-amber-400 -translate-x-1/2" />
    </div>
  );
}

// Sun/moon indicator
function DayNightIndicator({ timeOfDay }: { timeOfDay: number }) {
  const isDay = timeOfDay > 0.25 && timeOfDay < 0.75;
  const sunMoonY = Math.sin((timeOfDay - 0.25) * Math.PI * 2);

  return (
    <div className="relative w-8 h-8 bg-stone-950/60 border border-stone-700/40 rounded-full overflow-hidden">
      {/* Sky gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: isDay
            ? 'linear-gradient(to bottom, #4488cc, #88aacc)'
            : 'linear-gradient(to bottom, #0a0a1a, #1a1a2a)',
        }}
      />

      {/* Sun/Moon */}
      <div
        className={cn(
          'absolute left-1/2 w-3 h-3 rounded-full -translate-x-1/2 transition-all duration-1000',
          isDay
            ? 'bg-amber-300 shadow-[0_0_8px_#fcd34d]'
            : 'bg-stone-300 shadow-[0_0_6px_#e5e5e5]',
        )}
        style={{
          top: `${50 - sunMoonY * 30}%`,
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Horizon line */}
      <div className="absolute bottom-1/3 left-0 right-0 h-px bg-yellow-700/50" />
    </div>
  );
}

export function GameHUD() {
  const gameActive = useGameStore((state) => state.gameActive);
  const health = useGameStore((state) => state.health);
  const stamina = useGameStore((state) => state.stamina);
  const isSprinting = useGameStore((state) => state.isSprinting);
  const timeOfDay = useGameStore((state) => state.timeOfDay);
  const currentChunkName = useGameStore((state) => state.currentChunkName);
  const currentChunkType = useGameStore((state) => state.currentChunkType);
  const currentInteractable = useGameStore(
    (state) => state.currentInteractable,
  );
  const inDialogue = useGameStore((state) => state.inDialogue);
  const cameraYaw = useGameStore((state) => state.cameraYaw);

  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerAnimating, setBannerAnimating] = useState(false);
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevChunkName = useRef(currentChunkName);

  // Show location banner when chunk changes
  useEffect(() => {
    if (currentChunkName !== prevChunkName.current && gameActive) {
      prevChunkName.current = currentChunkName;
      setBannerAnimating(true);
      setBannerVisible(true);

      setTimeout(() => setBannerAnimating(false), 100);

      if (bannerTimeoutRef.current) {
        clearTimeout(bannerTimeoutRef.current);
      }

      bannerTimeoutRef.current = setTimeout(() => {
        setBannerVisible(false);
      }, 5000);
    }
  }, [currentChunkName, gameActive]);

  // Format time display
  const formatTime = () => {
    const tHours = timeOfDay * 24;
    let hours = Math.floor(tHours);
    const mins = Math.floor((tHours % 1) * 60);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${ampm}`;
  };

  // Get chunk type display name and icon
  const getChunkTypeInfo = () => {
    switch (currentChunkType) {
      case 'TOWN':
        return { name: 'Settlement', icon: '⌂' };
      case 'DUNGEON':
        return { name: 'Ancient Ruins', icon: '◈' };
      case 'ROAD':
        return { name: "The King's Road", icon: '═' };
      default:
        return { name: 'Wilderness', icon: '♣' };
    }
  };

  const chunkInfo = getChunkTypeInfo();

  if (!gameActive) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative w-6 h-6">
          {/* Outer ring */}
          <div className="absolute inset-0 border border-white/20 rounded-full" />
          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white/80 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_4px_rgba(0,0,0,0.8)]" />
          {/* Cardinal lines */}
          <div className="absolute top-0 left-1/2 w-px h-1.5 bg-white/40 -translate-x-1/2" />
          <div className="absolute bottom-0 left-1/2 w-px h-1.5 bg-white/40 -translate-x-1/2" />
          <div className="absolute left-0 top-1/2 w-1.5 h-px bg-white/40 -translate-y-1/2" />
          <div className="absolute right-0 top-1/2 w-1.5 h-px bg-white/40 -translate-y-1/2" />
        </div>
      </div>

      {/* Interaction Prompt */}
      {currentInteractable && !inDialogue && (
        <div className="absolute top-[calc(50%+35px)] left-1/2 -translate-x-1/2">
          <div className="relative bg-yellow-100/80 border border-yellow-700/30 px-4 py-2 rounded">
            {/* Corner accents */}
            <div className="absolute -top-px -left-px w-2 h-2 border-t border-l border-yellow-700" />
            <div className="absolute -top-px -right-px w-2 h-2 border-t border-r border-yellow-700" />
            <div className="absolute -bottom-px -left-px w-2 h-2 border-b border-l border-yellow-700" />
            <div className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-yellow-700" />

            <div className="font-lora text-sm font-bold text-yellow-900 uppercase tracking-wider flex items-center gap-2">
              <span className="text-yellow-700 text-xs bg-yellow-200/50 px-1.5 py-0.5 rounded">
                [E]
              </span>
              {currentInteractable.actionVerb}
              <span className="text-yellow-900">
                {currentInteractable.name}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Player Stats - Top Left */}
      <div className="absolute top-6 left-6 flex flex-col gap-2">
        <StatBar
          value={health}
          color="#c4695a"
          glowColor="#d9796366"
          icon={<span>❤</span>}
        />
        <StatBar
          value={stamina}
          color="#6b8f5e"
          glowColor="#6b8f5e66"
          icon={<span className={cn(isSprinting && 'animate-bounce')}>⚡</span>}
        />

        {/* Sprint indicator */}
        {isSprinting && (
          <div className="text-xs text-yellow-700 font-bold tracking-wider animate-pulse ml-6">
            SPRINTING
          </div>
        )}
      </div>

      {/* Location Banner */}
      <div
        className={cn(
          'absolute top-6 left-1/2 -translate-x-1/2 text-center transition-all duration-500',
          bannerVisible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-4',
          bannerAnimating && 'scale-110',
        )}
      >
        <div className="relative bg-yellow-100/60 border border-yellow-700/30 px-8 py-4 backdrop-blur-sm">
          {/* Decorative corners */}
          <div className="absolute -top-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-yellow-700/50 to-transparent" />
          <div className="absolute -bottom-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-yellow-700/50 to-transparent" />

          <div
            className="font-lora text-2xl md:text-3xl font-black text-yellow-900 tracking-[0.15em] uppercase"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}
          >
            {currentChunkName}
          </div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-yellow-800/80">{chunkInfo.icon}</span>
            <span className="text-xs text-yellow-900 tracking-[0.3em] uppercase font-bold">
              {chunkInfo.name}
            </span>
            <span className="text-yellow-800/80">{chunkInfo.icon}</span>
          </div>
        </div>
      </div>

      {/* Top Right - Time, Compass, Gems */}
      <div className="absolute top-6 right-6 flex flex-col items-end gap-3">
        {/* Time and day/night */}
        <div className="flex items-center gap-3">
          <div
            className="font-lora text-lg text-yellow-700/90 tracking-wider"
            style={{ textShadow: '0 0 10px rgba(212, 175, 55, 0.3)' }}
          >
            {formatTime()}
          </div>
          <DayNightIndicator timeOfDay={timeOfDay} />
        </div>

        {/* Compass */}
        <Compass yaw={cameraYaw} />
      </div>

      {/* Controls Hint - Bottom */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden md:block">
        <div className="bg-yellow-100/40 border border-yellow-700/30 px-4 py-2 rounded backdrop-blur-sm">
          <div className="text-xs text-yellow-900 tracking-wider font-medium flex items-center gap-4">
            <span>
              <span className="text-yellow-900 font-bold">WASD</span> Move
            </span>
            <span className="text-yellow-800">|</span>
            <span>
              <span className="text-yellow-900 font-bold">Mouse</span> Look
            </span>
            <span className="text-yellow-800">|</span>
            <span>
              <span className="text-yellow-900 font-bold">E</span> Interact
            </span>
            <span className="text-yellow-800">|</span>
            <span>
              <span className="text-yellow-900 font-bold">SPACE</span> Jump
            </span>
            <span className="text-yellow-800">|</span>
            <span>
              <span className="text-yellow-900 font-bold">SHIFT</span> Walk
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
