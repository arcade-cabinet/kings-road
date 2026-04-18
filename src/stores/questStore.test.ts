import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { initContentStore } from '@/db/content-queries';
// --- Load quest JSON files for test data ---
import chapter00 from '../../content/quests/main/chapter-00.json';
import chapter01 from '../../content/quests/main/chapter-01.json';
import chapter02 from '../../content/quests/main/chapter-02.json';
import chapter03 from '../../content/quests/main/chapter-03.json';
import chapter04 from '../../content/quests/main/chapter-04.json';
import chapter05 from '../../content/quests/main/chapter-05.json';
import aldricsMissingHammer from '../../content/quests/side/aldrics-missing-hammer.json';
import banditAmbush from '../../content/quests/side/bandit-ambush.json';
import besssSecretRecipe from '../../content/quests/side/besss-secret-recipe.json';
import fatherCedricsLostHymnal from '../../content/quests/side/father-cedrics-lost-hymnal.json';
import lordAshwicksSecret from '../../content/quests/side/lord-ashwicks-secret.json';
import lostPilgrim from '../../content/quests/side/lost-pilgrim.json';
import merchantsBrokenCart from '../../content/quests/side/merchants-broken-cart.json';
import sisterMaevesGarden from '../../content/quests/side/sister-maeves-garden.json';
import strangeShrine from '../../content/quests/side/strange-shrine.json';
import theBridgeTroll from '../../content/quests/side/the-bridge-troll.json';
import theCartographersMap from '../../content/quests/side/the-cartographers-map.json';
import theCursedRing from '../../content/quests/side/the-cursed-ring.json';
import theDeserter from '../../content/quests/side/the-deserter.json';
import theHerbalistsJourney from '../../content/quests/side/the-herbalists-journey.json';
import theMissingManuscript from '../../content/quests/side/the-missing-manuscript.json';
import theMissingMerchant from '../../content/quests/side/the-missing-merchant.json';
import thePoisonedWell from '../../content/quests/side/the-poisoned-well.json';
import theUnderground from '../../content/quests/side/the-underground.json';
import woundedSoldier from '../../content/quests/side/wounded-soldier.json';
import { getAllQuests, getQuestDefinition, useQuestStore } from './questStore';

const TEST_QUESTS = [
  chapter00,
  chapter01,
  chapter02,
  chapter03,
  chapter04,
  chapter05,
  aldricsMissingHammer,
  banditAmbush,
  besssSecretRecipe,
  fatherCedricsLostHymnal,
  lordAshwicksSecret,
  lostPilgrim,
  merchantsBrokenCart,
  sisterMaevesGarden,
  strangeShrine,
  theBridgeTroll,
  theCartographersMap,
  theCursedRing,
  theDeserter,
  theHerbalistsJourney,
  theMissingMerchant,
  theMissingManuscript,
  thePoisonedWell,
  theUnderground,
  woundedSoldier,
] as Array<{ id: string }>;

beforeAll(() => {
  initContentStore({
    monsters: [],
    items: [],
    encounterTables: [],
    lootTables: [],
    npcsNamed: [],
    npcPools: [],
    buildings: [],
    towns: [],
    features: [],
    quests: TEST_QUESTS.map((q) => ({ id: q.id, data: JSON.stringify(q) })),
    dungeons: [],
    encounters: [],
    roadSpine: null,
    pacingConfig: null,
  });
});

describe('questStore', () => {
  afterEach(() => {
    useQuestStore.getState().resetQuests();
  });

  describe('quest registry', () => {
    it('loads all quest definitions', () => {
      const quests = getAllQuests();
      expect(quests.length).toBeGreaterThan(0);
      // Should have both main chapters and side quests
      const mainQuests = quests.filter((q) => q.id.startsWith('main-'));
      const sideQuests = quests.filter((q) => q.id.startsWith('side-'));
      expect(mainQuests.length).toBeGreaterThanOrEqual(6);
      expect(sideQuests.length).toBeGreaterThan(0);
    });

    it('looks up quest by id', () => {
      const quest = getQuestDefinition('main-chapter-00');
      expect(quest).toBeDefined();
      expect(quest?.title).toBe('The Call');
    });

    it('returns undefined for unknown quest id', () => {
      expect(getQuestDefinition('nonexistent-quest')).toBeUndefined();
    });
  });

  describe('activateQuest', () => {
    it('adds a quest to activeQuests', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      const { activeQuests } = useQuestStore.getState();
      expect(activeQuests).toHaveLength(1);
      expect(activeQuests[0].questId).toBe('main-chapter-00');
      expect(activeQuests[0].currentStep).toBe(0);
      expect(activeQuests[0].branch).toBeUndefined();
    });

    it('does not double-activate the same quest', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      useQuestStore.getState().activateQuest('main-chapter-00');
      expect(useQuestStore.getState().activeQuests).toHaveLength(1);
    });

    it('does not activate a completed quest', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      useQuestStore.getState().completeQuest('main-chapter-00');
      useQuestStore.getState().activateQuest('main-chapter-00');
      expect(useQuestStore.getState().activeQuests).toHaveLength(0);
    });

    it('marks the quest as triggered', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      expect(useQuestStore.getState().triggeredQuests).toContain(
        'main-chapter-00',
      );
    });

    it('activates with a branch', () => {
      useQuestStore.getState().activateQuest('main-chapter-00', 'A');
      const { activeQuests } = useQuestStore.getState();
      expect(activeQuests[0].branch).toBe('A');
    });
  });

  describe('advanceStep', () => {
    it('increments the step counter', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      useQuestStore.getState().advanceStep('main-chapter-00');
      expect(useQuestStore.getState().activeQuests[0].currentStep).toBe(1);
    });

    it('does not affect other quests', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      useQuestStore.getState().activateQuest('side-lost-pilgrim');
      useQuestStore.getState().advanceStep('main-chapter-00');
      const side = useQuestStore
        .getState()
        .activeQuests.find((q) => q.questId === 'side-lost-pilgrim');
      expect(side?.currentStep).toBe(0);
    });
  });

  describe('chooseBranch', () => {
    it('sets the branch and resets step to 0', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      useQuestStore.getState().advanceStep('main-chapter-00');
      useQuestStore.getState().chooseBranch('main-chapter-00', 'B');
      const quest = useQuestStore.getState().activeQuests[0];
      expect(quest.branch).toBe('B');
      expect(quest.currentStep).toBe(0);
    });
  });

  describe('completeQuest', () => {
    it('removes from active and adds to completed', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      useQuestStore.getState().completeQuest('main-chapter-00');
      expect(useQuestStore.getState().activeQuests).toHaveLength(0);
      expect(useQuestStore.getState().completedQuests).toContain(
        'main-chapter-00',
      );
    });

    it('does not duplicate in completedQuests', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      useQuestStore.getState().completeQuest('main-chapter-00');
      // Force a second complete call (edge case)
      useQuestStore.getState().completeQuest('main-chapter-00');
      expect(
        useQuestStore
          .getState()
          .completedQuests.filter((id) => id === 'main-chapter-00'),
      ).toHaveLength(1);
    });
  });

  describe('failQuest', () => {
    it('removes from active without adding to completed', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      useQuestStore.getState().failQuest('main-chapter-00');
      expect(useQuestStore.getState().activeQuests).toHaveLength(0);
      expect(useQuestStore.getState().completedQuests).not.toContain(
        'main-chapter-00',
      );
    });
  });

  describe('markTriggered', () => {
    it('adds quest to triggered list', () => {
      useQuestStore.getState().markTriggered('side-lost-pilgrim');
      expect(useQuestStore.getState().triggeredQuests).toContain(
        'side-lost-pilgrim',
      );
    });

    it('does not duplicate triggered entries', () => {
      useQuestStore.getState().markTriggered('side-lost-pilgrim');
      useQuestStore.getState().markTriggered('side-lost-pilgrim');
      expect(
        useQuestStore
          .getState()
          .triggeredQuests.filter((id) => id === 'side-lost-pilgrim'),
      ).toHaveLength(1);
    });
  });

  describe('resetQuests', () => {
    it('clears all quest state including questGraph', () => {
      useQuestStore.getState().activateQuest('main-chapter-00');
      useQuestStore.getState().completeQuest('main-chapter-00');
      useQuestStore.getState().activateQuest('side-lost-pilgrim');
      useQuestStore.getState().resolveNarrative('reset-test-seed');
      useQuestStore.getState().resetQuests();
      const state = useQuestStore.getState();
      expect(state.activeQuests).toHaveLength(0);
      expect(state.completedQuests).toHaveLength(0);
      expect(state.triggeredQuests).toHaveLength(0);
      expect(state.questGraph).toBeNull();
    });
  });

  describe('resolveNarrative', () => {
    it('resolves a quest graph from the seed', () => {
      useQuestStore.getState().resolveNarrative('narrative-test-seed');
      const { questGraph } = useQuestStore.getState();
      expect(questGraph).not.toBeNull();
      expect(questGraph!.seed).toBe('narrative-test-seed');
      expect(questGraph!.quests.length).toBeGreaterThan(0);
    });

    it('is deterministic with the same seed', () => {
      useQuestStore.getState().resolveNarrative('determinism-seed');
      const graph1Branches = useQuestStore
        .getState()
        .questGraph!.quests.map((q) => q.branch);

      useQuestStore.getState().resetQuests();
      useQuestStore.getState().resolveNarrative('determinism-seed');
      const graph2Branches = useQuestStore
        .getState()
        .questGraph!.quests.map((q) => q.branch);

      expect(graph1Branches).toEqual(graph2Branches);
    });
  });

  describe('getResolvedQuest', () => {
    it('looks up a resolved quest by id', () => {
      useQuestStore.getState().resolveNarrative('lookup-test-seed');
      const resolved = useQuestStore
        .getState()
        .getResolvedQuest('main-chapter-00');
      expect(resolved).toBeDefined();
      expect(resolved!.id).toBe('main-chapter-00');
      expect(resolved!.title).toBe('The Call');
    });

    it('returns undefined for unknown quest id', () => {
      useQuestStore.getState().resolveNarrative('lookup-test-seed');
      const resolved = useQuestStore
        .getState()
        .getResolvedQuest('nonexistent-quest');
      expect(resolved).toBeUndefined();
    });

    it('returns undefined when no narrative has been resolved', () => {
      const resolved = useQuestStore
        .getState()
        .getResolvedQuest('main-chapter-00');
      expect(resolved).toBeUndefined();
    });
  });

  describe('quest state persists across simulated chunk loads', () => {
    it('state remains after multiple activations and advances', () => {
      // Simulate: activate quest, advance, activate another
      useQuestStore.getState().activateQuest('main-chapter-00');
      useQuestStore.getState().advanceStep('main-chapter-00');
      useQuestStore.getState().advanceStep('main-chapter-00');
      useQuestStore.getState().activateQuest('side-lost-pilgrim');

      // Read state (simulating a "new chunk" reading state)
      const state = useQuestStore.getState();
      expect(state.activeQuests).toHaveLength(2);
      expect(
        state.activeQuests.find((q) => q.questId === 'main-chapter-00')
          ?.currentStep,
      ).toBe(2);
      expect(
        state.activeQuests.find((q) => q.questId === 'side-lost-pilgrim')
          ?.currentStep,
      ).toBe(0);
    });
  });
});
