/**
 * Story wrappers for QuestLog — used by Playwright CT.
 *
 * QuestLog reads from both useQuestStore (activeQuests) and
 * useGameStore (gameActive). It also uses getQuestDefinition()
 * which relies on the static quest registry loaded at module init.
 *
 * We set both stores to control visibility and content.
 */
import { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useQuestStore } from '../../stores/questStore';
import { QuestLog } from './QuestLog';

/**
 * QuestLog with active quests visible (collapsed by default).
 * Uses real quest IDs from the registry so getQuestDefinition() works.
 */
export function QuestLogWithQuests() {
  useEffect(() => {
    useGameStore.setState({ gameActive: true });
    useQuestStore.setState({
      activeQuests: [
        { questId: 'main-chapter-00', currentStep: 1 },
        { questId: 'side-lost-pilgrim', currentStep: 0 },
      ],
    });
  }, []);

  return <QuestLog />;
}

/**
 * QuestLog with the list expanded so quest entries are visible.
 * Wraps QuestLog and clicks the toggle after mount.
 */
export function QuestLogExpanded() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    useGameStore.setState({ gameActive: true });
    useQuestStore.setState({
      activeQuests: [
        { questId: 'main-chapter-00', currentStep: 2 },
        { questId: 'side-aldrics-missing-hammer', currentStep: 0, branch: 'A' },
      ],
    });
    setReady(true);
  }, []);

  if (!ready) return null;

  return <QuestLog />;
}

/**
 * QuestLog when game is not active — should return null.
 */
export function QuestLogHidden() {
  useEffect(() => {
    useGameStore.setState({ gameActive: false });
    useQuestStore.setState({ activeQuests: [] });
  }, []);

  return (
    <div data-testid="quest-hidden-wrapper">
      <QuestLog />
    </div>
  );
}

/**
 * QuestLog when active but no quests — should return null.
 */
export function QuestLogEmpty() {
  useEffect(() => {
    useGameStore.setState({ gameActive: true });
    useQuestStore.setState({ activeQuests: [] });
  }, []);

  return (
    <div data-testid="quest-empty-wrapper">
      <QuestLog />
    </div>
  );
}
