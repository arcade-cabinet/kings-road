import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useGameStore } from '@/stores/gameStore';
import {
  type ActiveQuest,
  getQuestDefinition,
  useQuestStore,
} from '@/stores/questStore';

function QuestEntry({ quest }: { quest: ActiveQuest }) {
  const def = getQuestDefinition(quest.questId);
  if (!def) return null;

  // Determine total steps for this quest
  let totalSteps: number;
  if (quest.branch && def.branches) {
    totalSteps = def.branches[quest.branch].steps.length;
  } else if (def.steps) {
    totalSteps = def.steps.length;
  } else {
    totalSteps = 0;
  }

  const isMain = def.id.startsWith('main-');

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'text-xs font-bold uppercase tracking-wider',
            isMain ? 'text-amber-300' : 'text-stone-400',
          )}
        >
          {isMain ? '◆' : '◇'}
        </span>
        <span className="text-sm font-bold text-yellow-100 truncate">
          {def.title}
        </span>
      </div>
      <div className="ml-5 text-xs text-stone-400">
        Step {quest.currentStep + 1} / {totalSteps}
        {quest.branch && (
          <span className="ml-2 text-amber-400/70">Path {quest.branch}</span>
        )}
      </div>
    </div>
  );
}

export function QuestLog() {
  const activeQuests = useQuestStore((s) => s.activeQuests);
  const gameActive = useGameStore((s) => s.gameActive);
  const [expanded, setExpanded] = useState(false);

  if (!gameActive || activeQuests.length === 0) return null;

  return (
    <div className="absolute bottom-20 right-6 pointer-events-auto z-10">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mb-1 px-3 py-1 bg-stone-900/80 border border-yellow-700/40 rounded text-xs text-yellow-200 font-bold uppercase tracking-wider hover:bg-stone-800/90 transition-colors"
      >
        Quests ({activeQuests.length}) {expanded ? '▾' : '▸'}
      </button>

      {/* Quest list */}
      {expanded && (
        <div className="bg-stone-900/85 border border-yellow-700/30 rounded p-3 min-w-[220px] max-w-[280px] backdrop-blur-sm">
          <div className="flex flex-col gap-2">
            {activeQuests.map((q) => (
              <QuestEntry key={q.questId} quest={q} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
