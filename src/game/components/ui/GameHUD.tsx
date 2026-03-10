import { useEffect, useRef, useState } from 'react';
import { cn } from '../../../lib/utils';
import { useGameStore } from '../../stores/gameStore';
import {
  type ActiveQuest,
  getQuestDefinition,
  useQuestStore,
} from '../../stores/questStore';
import { Minimap } from './Minimap';

// ── Design tokens ────────────────────────────────────────────────────
const PARCHMENT = 'rgba(245, 240, 232, 0.85)';
const PARCHMENT_BORDER = '#c4a747';
const PARCHMENT_BORDER_SUBTLE = 'rgba(196, 167, 71, 0.4)';
const GOLD_TEXT = '#8b6f47';

const WEATHER_LABELS: Record<string, string> = {
  clear: 'Fair',
  overcast: 'Overcast',
  foggy: 'Fog',
  rainy: 'Rain',
  stormy: 'Storm',
};
const HEALTH_FILL = '#a03030';
const STAMINA_FILL = '#3d7a3d';

// ── Stat bar — illuminated manuscript margin style ───────────────────
function StatBar({
  value,
  maxValue = 100,
  label,
  fillColor,
}: {
  value: number;
  maxValue?: number;
  label: string;
  fillColor: string;
}) {
  const percentage = Math.max(0, Math.min(100, (value / maxValue) * 100));
  const isLow = percentage < 25;

  return (
    <div className="flex items-center gap-2">
      <span
        className="font-lora text-[10px] font-bold uppercase tracking-widest w-5 text-right"
        style={{ color: GOLD_TEXT }}
      >
        {label}
      </span>
      <div
        className="relative w-40 md:w-48 h-3 overflow-hidden"
        style={{
          background: PARCHMENT,
          border: `1.5px solid ${PARCHMENT_BORDER}`,
          borderRadius: '1px',
        }}
      >
        {/* Fill bar */}
        <div
          className={cn(
            'h-full transition-all duration-300 relative',
            isLow && 'animate-pulse',
          )}
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(to bottom, ${fillColor}dd, ${fillColor})`,
          }}
        >
          {/* Parchment texture overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent h-1/2" />
        </div>

        {/* Quarter tick marks — manuscript ruling lines */}
        <div className="absolute inset-0 flex">
          {['q1', 'q2', 'q3'].map((id) => (
            <div
              key={id}
              className="flex-1"
              style={{ borderRight: `1px solid ${PARCHMENT_BORDER_SUBTLE}` }}
            />
          ))}
          <div className="flex-1" />
        </div>

        {/* Golden corner accents */}
        <div
          className="absolute top-0 left-0 w-1 h-1"
          style={{
            borderTop: `1px solid ${PARCHMENT_BORDER}`,
            borderLeft: `1px solid ${PARCHMENT_BORDER}`,
          }}
        />
        <div
          className="absolute top-0 right-0 w-1 h-1"
          style={{
            borderTop: `1px solid ${PARCHMENT_BORDER}`,
            borderRight: `1px solid ${PARCHMENT_BORDER}`,
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-1 h-1"
          style={{
            borderBottom: `1px solid ${PARCHMENT_BORDER}`,
            borderLeft: `1px solid ${PARCHMENT_BORDER}`,
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-1 h-1"
          style={{
            borderBottom: `1px solid ${PARCHMENT_BORDER}`,
            borderRight: `1px solid ${PARCHMENT_BORDER}`,
          }}
        />
      </div>
      {/* Numeric value */}
      <span
        className="font-lora text-[10px] font-bold min-w-[24px]"
        style={{ color: GOLD_TEXT }}
      >
        {Math.round(value)}
      </span>
    </div>
  );
}

// ── Compass — medieval brass strip ───────────────────────────────────
function Compass({ yaw }: { yaw: number }) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const compassItems = (['a', 'b', 'c'] as const).flatMap((group) =>
    directions.map((dir) => ({ key: `${group}-${dir}`, dir })),
  );
  const normalizedYaw = ((((-yaw * 180) / Math.PI) % 360) + 360) % 360;

  return (
    <div
      className="relative w-24 h-7 overflow-hidden"
      style={{
        background: PARCHMENT,
        border: `1.5px solid ${PARCHMENT_BORDER}`,
      }}
    >
      <div
        className="absolute whitespace-nowrap font-lora text-xs font-bold tracking-wider flex items-center h-full transition-transform duration-100"
        style={{ transform: `translateX(${-normalizedYaw * 0.66 + 48}px)` }}
      >
        {compassItems.map(({ key, dir }) => (
          <span
            key={key}
            className={cn(
              'w-12 text-center',
              dir === 'N'
                ? 'text-red-700'
                : dir.length === 1
                  ? 'text-yellow-900'
                  : 'text-yellow-800/60',
            )}
          >
            {dir}
          </span>
        ))}
      </div>
      {/* Center indicator — golden pointer */}
      <div
        className="absolute left-1/2 top-0 w-px h-full -translate-x-1/2"
        style={{ backgroundColor: PARCHMENT_BORDER }}
      />
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: '-1px',
          width: 0,
          height: 0,
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderTop: `5px solid ${PARCHMENT_BORDER}`,
        }}
      />
    </div>
  );
}

// ── Day/night indicator — sun/moon in a brass medallion ──────────────
function DayNightIndicator({ timeOfDay }: { timeOfDay: number }) {
  const isDay = timeOfDay > 0.25 && timeOfDay < 0.75;
  const sunMoonY = Math.sin((timeOfDay - 0.25) * Math.PI * 2);

  return (
    <div
      className="relative w-8 h-8 rounded-full overflow-hidden"
      style={{ border: `1.5px solid ${PARCHMENT_BORDER}` }}
    >
      {/* Sky gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: isDay
            ? 'linear-gradient(to bottom, #87CEEB, #b8d4e8)'
            : 'linear-gradient(to bottom, #1a1a3a, #2a2a4a)',
        }}
      />

      {/* Sun/Moon */}
      <div
        className={cn(
          'absolute left-1/2 w-3 h-3 rounded-full -translate-x-1/2 transition-all duration-1000',
          isDay
            ? 'bg-amber-300 shadow-[0_0_6px_#c4a747]'
            : 'bg-stone-200 shadow-[0_0_4px_#e5e5e5]',
        )}
        style={{
          top: `${50 - sunMoonY * 30}%`,
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Horizon line */}
      <div
        className="absolute bottom-1/3 left-0 right-0 h-px"
        style={{ backgroundColor: PARCHMENT_BORDER_SUBTLE }}
      />
    </div>
  );
}

// ── Quest tracker — parchment card showing active quest objective ────
function QuestTracker() {
  const activeQuests = useQuestStore((s) => s.activeQuests);

  if (activeQuests.length === 0) return null;

  // Show the first active quest (main quests take priority)
  const sorted = [...activeQuests].sort((a, b) => {
    const aMain = a.questId.startsWith('main-') ? 0 : 1;
    const bMain = b.questId.startsWith('main-') ? 0 : 1;
    return aMain - bMain;
  });
  const quest = sorted[0];

  return <QuestTrackerCard quest={quest} />;
}

function QuestTrackerCard({ quest }: { quest: ActiveQuest }) {
  const def = getQuestDefinition(quest.questId);
  if (!def) return null;

  // Get current step description
  let stepDescription = '';
  let steps: {
    description?: string;
    type: string;
    npcArchetype?: string;
    destination?: string;
  }[] = [];

  if (quest.branch && def.branches) {
    steps = def.branches[quest.branch].steps;
  } else if (def.steps) {
    steps = def.steps;
  }

  const currentStep = steps[quest.currentStep];
  if (currentStep) {
    if (currentStep.description) {
      stepDescription = currentStep.description;
    } else if (currentStep.type === 'dialogue' && currentStep.npcArchetype) {
      stepDescription = `Speak with the ${currentStep.npcArchetype}`;
    } else if (currentStep.type === 'travel' && currentStep.destination) {
      stepDescription = 'Travel onward';
    } else {
      stepDescription = `${currentStep.type.charAt(0).toUpperCase()}${currentStep.type.slice(1)}`;
    }
  }

  const isMain = def.id.startsWith('main-');

  return (
    <div
      className="min-w-[180px] max-w-[240px] p-2.5"
      style={{
        background: PARCHMENT,
        border: `1.5px solid ${PARCHMENT_BORDER}`,
      }}
    >
      {/* Quest title */}
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="text-[10px] font-bold"
          style={{ color: isMain ? '#c4a747' : GOLD_TEXT }}
        >
          {isMain ? '\u25C6' : '\u25C7'}
        </span>
        <span
          className="font-lora text-xs font-bold truncate"
          style={{ color: '#3d3a34' }}
        >
          {def.title}
        </span>
      </div>
      {/* Current objective */}
      {stepDescription && (
        <div
          className="text-[10px] leading-tight pl-4"
          style={{ color: GOLD_TEXT, fontFamily: 'Crimson Text, serif' }}
        >
          {stepDescription.length > 80
            ? `${stepDescription.slice(0, 77)}...`
            : stepDescription}
        </div>
      )}
    </div>
  );
}

// ── First-time controls tooltip — shows once per session ─────────────
const TOOLTIP_KEY = 'kings-road:controls-seen';

function ControlsTooltip() {
  const gameActive = useGameStore((state) => state.gameActive);
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!gameActive) return;

    try {
      if (sessionStorage.getItem(TOOLTIP_KEY)) return;
    } catch {
      // sessionStorage unavailable
    }

    setVisible(true);
    setFading(false);

    const fadeTimer = setTimeout(() => setFading(true), 27000);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem(TOOLTIP_KEY, '1');
      } catch {
        // ignore
      }
    }, 30000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [gameActive]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        'absolute bottom-4 left-1/2 -translate-x-1/2 hidden md:block',
        'transition-opacity duration-[3000ms]',
        fading ? 'opacity-0' : 'opacity-100',
      )}
    >
      <div
        className="px-4 py-2 backdrop-blur-sm"
        style={{
          background: PARCHMENT,
          border: `1px solid ${PARCHMENT_BORDER_SUBTLE}`,
        }}
      >
        <div
          className="font-lora text-xs tracking-wider font-medium flex items-center gap-4"
          style={{ color: '#3d3a34' }}
        >
          <span>
            <span className="font-bold">WASD</span> Move
          </span>
          <span style={{ color: PARCHMENT_BORDER_SUBTLE }}>|</span>
          <span>
            <span className="font-bold">Mouse</span> Look
          </span>
          <span style={{ color: PARCHMENT_BORDER_SUBTLE }}>|</span>
          <span>
            <span className="font-bold">E</span> Interact
          </span>
          <span style={{ color: PARCHMENT_BORDER_SUBTLE }}>|</span>
          <span>
            <span className="font-bold">ESC</span> Pause
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main HUD ─────────────────────────────────────────────────────────
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
  const inDungeon = useGameStore((state) => state.inDungeon);
  const activeDungeonName = useGameStore(
    (state) => state.activeDungeon?.name ?? '',
  );
  const weatherCondition = useGameStore(
    (state) => state.currentWeather.condition,
  );

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

  const formatTime = () => {
    const tHours = timeOfDay * 24;
    let hours = Math.floor(tHours);
    const mins = Math.floor((tHours % 1) * 60);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${ampm}`;
  };

  const getChunkTypeInfo = () => {
    if (inDungeon) {
      return { name: `Dungeon: ${activeDungeonName}`, icon: '\u25C8' };
    }
    switch (currentChunkType) {
      case 'TOWN':
        return { name: 'Settlement', icon: '\u2302' };
      case 'DUNGEON':
        return { name: 'Ancient Ruins', icon: '\u25C8' };
      case 'ROAD':
        return { name: "The King's Road", icon: '\u2550' };
      default:
        return { name: 'Wilderness', icon: '\u2663' };
    }
  };

  const chunkInfo = getChunkTypeInfo();

  if (!gameActive) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Crosshair — subtle golden dot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative w-5 h-5">
          <div
            className="absolute inset-0 rounded-full"
            style={{ border: `1px solid rgba(196, 167, 71, 0.25)` }}
          />
          <div
            className="absolute top-1/2 left-1/2 w-1 h-1 rounded-full -translate-x-1/2 -translate-y-1/2"
            style={{
              backgroundColor: 'rgba(245, 240, 232, 0.8)',
              boxShadow: '0 0 3px rgba(0,0,0,0.6)',
            }}
          />
        </div>
      </div>

      {/* Interaction Prompt — parchment pill */}
      {currentInteractable && !inDialogue && (
        <div className="absolute top-[calc(50%+35px)] left-1/2 -translate-x-1/2">
          <div
            className="relative px-5 py-2"
            style={{
              background: PARCHMENT,
              border: `1.5px solid ${PARCHMENT_BORDER}`,
              borderRadius: '2px',
            }}
          >
            {/* Corner accents */}
            <div
              className="absolute -top-px -left-px w-2.5 h-2.5"
              style={{
                borderTop: `2px solid ${PARCHMENT_BORDER}`,
                borderLeft: `2px solid ${PARCHMENT_BORDER}`,
              }}
            />
            <div
              className="absolute -top-px -right-px w-2.5 h-2.5"
              style={{
                borderTop: `2px solid ${PARCHMENT_BORDER}`,
                borderRight: `2px solid ${PARCHMENT_BORDER}`,
              }}
            />
            <div
              className="absolute -bottom-px -left-px w-2.5 h-2.5"
              style={{
                borderBottom: `2px solid ${PARCHMENT_BORDER}`,
                borderLeft: `2px solid ${PARCHMENT_BORDER}`,
              }}
            />
            <div
              className="absolute -bottom-px -right-px w-2.5 h-2.5"
              style={{
                borderBottom: `2px solid ${PARCHMENT_BORDER}`,
                borderRight: `2px solid ${PARCHMENT_BORDER}`,
              }}
            />

            <div className="font-lora text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <span
                className="text-xs px-1.5 py-0.5"
                style={{
                  color: PARCHMENT_BORDER,
                  backgroundColor: 'rgba(196, 167, 71, 0.15)',
                  border: `1px solid ${PARCHMENT_BORDER_SUBTLE}`,
                }}
              >
                [E]
              </span>
              <span style={{ color: GOLD_TEXT }}>
                {currentInteractable.actionVerb}
              </span>
              <span style={{ color: '#3d3a34' }}>
                {currentInteractable.name}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Player Stats — Top Left */}
      <div className="absolute top-6 left-6 flex flex-col gap-1.5">
        <StatBar value={health} label="HP" fillColor={HEALTH_FILL} />
        <StatBar value={stamina} label="SP" fillColor={STAMINA_FILL} />

        {/* Sprint indicator */}
        {isSprinting && (
          <div
            className="font-lora text-[10px] font-bold tracking-[0.2em] uppercase animate-pulse ml-7"
            style={{ color: GOLD_TEXT }}
          >
            SPRINTING
          </div>
        )}
      </div>

      {/* Location Banner — golden serif, centered */}
      <div
        className={cn(
          'absolute top-6 left-1/2 -translate-x-1/2 text-center transition-all duration-500',
          bannerVisible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-4',
          bannerAnimating && 'scale-110',
        )}
      >
        <div
          className="relative px-10 py-4 backdrop-blur-sm"
          style={{
            background: 'rgba(245, 240, 232, 0.6)',
            border: `1px solid ${PARCHMENT_BORDER_SUBTLE}`,
          }}
        >
          {/* Decorative ruling lines */}
          <div
            className="absolute -top-px left-6 right-6 h-px"
            style={{
              background: `linear-gradient(to right, transparent, ${PARCHMENT_BORDER}80, transparent)`,
            }}
          />
          <div
            className="absolute -bottom-px left-6 right-6 h-px"
            style={{
              background: `linear-gradient(to right, transparent, ${PARCHMENT_BORDER}80, transparent)`,
            }}
          />

          <div
            className="font-lora text-2xl md:text-3xl font-black tracking-[0.15em] uppercase"
            style={{
              color: '#3d3a34',
              textShadow: `0 1px 8px rgba(0,0,0,0.5), 0 0 20px rgba(196, 167, 71, 0.2)`,
            }}
          >
            {currentChunkName}
          </div>
          <div className="flex items-center justify-center gap-2 mt-1.5">
            <span style={{ color: PARCHMENT_BORDER }}>{chunkInfo.icon}</span>
            <span
              className="font-lora text-[10px] tracking-[0.3em] uppercase font-bold"
              style={{ color: GOLD_TEXT }}
            >
              {chunkInfo.name}
            </span>
            <span style={{ color: PARCHMENT_BORDER }}>{chunkInfo.icon}</span>
          </div>
        </div>
      </div>

      {/* Top Right — Time, Compass, Quest Tracker, Minimap */}
      <div className="absolute top-6 right-6 flex flex-col items-end gap-2.5">
        {/* Time, weather, and day/night */}
        <div className="flex items-center gap-2.5">
          <div
            className="font-lora text-base tracking-wider"
            style={{
              color: GOLD_TEXT,
              textShadow: '0 0 8px rgba(196, 167, 71, 0.25)',
            }}
          >
            {formatTime()}
          </div>
          <span
            className="font-crimson text-xs italic tracking-wide"
            style={{ color: PARCHMENT_BORDER }}
          >
            {WEATHER_LABELS[weatherCondition] ?? 'Fair'}
          </span>
          <DayNightIndicator timeOfDay={timeOfDay} />
        </div>

        {/* Compass */}
        <Compass yaw={cameraYaw} />

        {/* Quest Tracker */}
        <QuestTracker />

        {/* Minimap */}
        <Minimap />
      </div>

      {/* Dungeon room description — shown when inside a dungeon */}
      {inDungeon && <DungeonRoomInfo />}

      {/* First-time controls tooltip — fades after 30s */}
      <ControlsTooltip />
    </div>
  );
}

// ── Dungeon room info — bottom-center parchment card ─────────────────

function DungeonRoomInfo() {
  const activeDungeon = useGameStore((s) => s.activeDungeon);
  if (!activeDungeon) return null;

  const currentRoom =
    activeDungeon.spatial.rooms[activeDungeon.currentRoomIndex];
  if (!currentRoom) return null;

  const room = currentRoom.room;
  const exitCount = currentRoom.exits.length;
  const exitLabel = exitCount === 1 ? '1 exit' : `${exitCount} exits`;

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 max-w-md">
      <div
        className="px-5 py-3 backdrop-blur-sm"
        style={{
          background: PARCHMENT,
          border: `1.5px solid ${PARCHMENT_BORDER}`,
        }}
      >
        {/* Room name */}
        <div
          className="font-lora text-sm font-bold tracking-wider uppercase mb-1"
          style={{ color: '#3d3a34' }}
        >
          {room.name}
        </div>
        {/* Room description (truncated) */}
        <div
          className="text-xs leading-relaxed mb-1.5"
          style={{ color: GOLD_TEXT, fontFamily: 'Crimson Text, serif' }}
        >
          {room.description.length > 160
            ? `${room.description.slice(0, 157)}...`
            : room.description}
        </div>
        {/* Room metadata */}
        <div className="flex items-center gap-3">
          <span
            className="text-[10px] font-bold tracking-wider uppercase"
            style={{ color: PARCHMENT_BORDER }}
          >
            {room.type}
          </span>
          <span className="text-[10px]" style={{ color: PARCHMENT_BORDER }}>
            |
          </span>
          <span
            className="text-[10px] tracking-wider"
            style={{ color: GOLD_TEXT }}
          >
            {exitLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
