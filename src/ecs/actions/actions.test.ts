import { createWorld, type World } from 'koota';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  Dialogue,
  DistanceTraveled,
  Health,
  Interactable,
  IsNPC,
  IsPlayer,
  IsQuestGiver,
  Movement,
  NPCArchetype,
  PlayerInput,
  Position,
  QuestLog,
  Rotation,
  Stamina,
  Velocity,
} from '../traits';
import { npcActions, playerActions, questActions } from './index';

describe('playerActions', () => {
  let world: World;

  beforeEach(() => {
    world = createWorld();
  });

  afterEach(() => {
    world.destroy();
  });

  describe('spawnPlayer', () => {
    it('creates an entity with all player traits', () => {
      const { spawnPlayer } = playerActions(world);
      const entity = spawnPlayer(10, 0, 20);

      expect(entity.has(IsPlayer)).toBe(true);
      expect(entity.get(Position)).toEqual({ x: 10, y: 0, z: 20 });
      expect(entity.has(Velocity)).toBe(true);
      expect(entity.has(Rotation)).toBe(true);
      expect(entity.get(Health)).toEqual({ current: 100, max: 100 });
      expect(entity.get(Stamina)).toEqual({ current: 100, max: 100 });
      expect(entity.has(Movement)).toBe(true);
      expect(entity.has(PlayerInput)).toBe(true);
      expect(entity.get(DistanceTraveled)).toEqual({
        total: 0,
        sinceLastFeature: 0,
      });
      expect(entity.has(QuestLog)).toBe(true);
    });

    it('positions the player at the given coordinates', () => {
      const { spawnPlayer } = playerActions(world);
      const entity = spawnPlayer(-5, 2.5, 100);
      const pos = entity.get(Position);
      expect(pos?.x).toBe(-5);
      expect(pos?.y).toBe(2.5);
      expect(pos?.z).toBe(100);
    });
  });

  describe('updateInput', () => {
    it('updates partial input on the player entity', () => {
      const { spawnPlayer, updateInput } = playerActions(world);
      const player = spawnPlayer(0, 0, 0);

      updateInput(player, { forward: true, interact: true });

      const input = player.get(PlayerInput);
      expect(input?.forward).toBe(true);
      expect(input?.interact).toBe(true);
      expect(input?.backward).toBe(false);
    });

    it('can reset input back to false', () => {
      const { spawnPlayer, updateInput } = playerActions(world);
      const player = spawnPlayer(0, 0, 0);

      updateInput(player, { forward: true });
      expect(player.get(PlayerInput)?.forward).toBe(true);

      updateInput(player, { forward: false });
      expect(player.get(PlayerInput)?.forward).toBe(false);
    });
  });
});

describe('npcActions', () => {
  let world: World;

  beforeEach(() => {
    world = createWorld();
  });

  afterEach(() => {
    world.destroy();
  });

  describe('spawnNPC', () => {
    it('creates an NPC entity with correct traits', () => {
      const { spawnNPC } = npcActions(world);
      const npc = spawnNPC({
        x: 5,
        y: 0,
        z: 10,
        archetype: 'blacksmith',
        greetings: ['Well met!', 'Need something forged?'],
      });

      expect(npc.has(IsNPC)).toBe(true);
      expect(npc.get(Position)).toEqual({ x: 5, y: 0, z: 10 });
      expect(npc.get(NPCArchetype)?.archetype).toBe('blacksmith');
      expect(npc.has(Dialogue)).toBe(true);
      expect(npc.has(Rotation)).toBe(true);
    });

    it('uses default interaction settings when not specified', () => {
      const { spawnNPC } = npcActions(world);
      const npc = spawnNPC({
        x: 0,
        y: 0,
        z: 0,
        archetype: 'merchant',
        greetings: ['Welcome!'],
      });

      const int = npc.get(Interactable);
      expect(int?.radius).toBe(3);
      expect(int?.actionVerb).toBe('Talk');
    });

    it('accepts custom interaction settings', () => {
      const { spawnNPC } = npcActions(world);
      const npc = spawnNPC({
        x: 0,
        y: 0,
        z: 0,
        archetype: 'merchant',
        greetings: ['Browse my wares!'],
        interactRadius: 5,
        actionVerb: 'Trade',
      });

      const int = npc.get(Interactable);
      expect(int?.radius).toBe(5);
      expect(int?.actionVerb).toBe('Trade');
    });
  });
});

describe('questActions', () => {
  let world: World;

  beforeEach(() => {
    world = createWorld();
  });

  afterEach(() => {
    world.destroy();
  });

  describe('startQuest', () => {
    it('adds a quest to the active quests list', () => {
      const { spawnPlayer } = playerActions(world);
      const { startQuest } = questActions(world);
      const player = spawnPlayer(0, 0, 0);

      startQuest(player, 'micro-lost-merchant');

      const log = player.get(QuestLog);
      expect(log?.activeQuests).toHaveLength(1);
      expect(log?.activeQuests[0].questId).toBe('micro-lost-merchant');
      expect(log?.activeQuests[0].currentStep).toBe(0);
    });

    it('does not duplicate an already active quest', () => {
      const { spawnPlayer } = playerActions(world);
      const { startQuest } = questActions(world);
      const player = spawnPlayer(0, 0, 0);

      startQuest(player, 'micro-lost-merchant');
      startQuest(player, 'micro-lost-merchant');

      const log = player.get(QuestLog);
      expect(log?.activeQuests).toHaveLength(1);
    });

    it('allows multiple different quests', () => {
      const { spawnPlayer } = playerActions(world);
      const { startQuest } = questActions(world);
      const player = spawnPlayer(0, 0, 0);

      startQuest(player, 'micro-lost-merchant');
      startQuest(player, 'meso-poisoned-well');

      const log = player.get(QuestLog);
      expect(log?.activeQuests).toHaveLength(2);
    });
  });

  describe('chooseBranch', () => {
    it('sets the branch for a quest', () => {
      const { spawnPlayer } = playerActions(world);
      const { startQuest, chooseBranch } = questActions(world);
      const player = spawnPlayer(0, 0, 0);

      startQuest(player, 'meso-poisoned-well');
      chooseBranch(player, 'meso-poisoned-well', 'A');

      const log = player.get(QuestLog);
      expect(log?.activeQuests[0].branch).toBe('A');
    });

    it('does not affect other quests', () => {
      const { spawnPlayer } = playerActions(world);
      const { startQuest, chooseBranch } = questActions(world);
      const player = spawnPlayer(0, 0, 0);

      startQuest(player, 'meso-poisoned-well');
      startQuest(player, 'micro-lost-merchant');
      chooseBranch(player, 'meso-poisoned-well', 'B');

      const log = player.get(QuestLog);
      const merchant = log?.activeQuests.find(
        (q) => q.questId === 'micro-lost-merchant',
      );
      expect(merchant?.branch).toBeUndefined();
    });
  });

  describe('advanceStep', () => {
    it('increments the current step for a quest', () => {
      const { spawnPlayer } = playerActions(world);
      const { startQuest, advanceStep } = questActions(world);
      const player = spawnPlayer(0, 0, 0);

      startQuest(player, 'micro-lost-merchant');
      advanceStep(player, 'micro-lost-merchant');
      advanceStep(player, 'micro-lost-merchant');

      const log = player.get(QuestLog);
      expect(log?.activeQuests[0].currentStep).toBe(2);
    });
  });

  describe('completeQuest', () => {
    it('moves quest from active to completed', () => {
      const { spawnPlayer } = playerActions(world);
      const { startQuest, completeQuest } = questActions(world);
      const player = spawnPlayer(0, 0, 0);

      startQuest(player, 'micro-lost-merchant');
      completeQuest(player, 'micro-lost-merchant');

      const log = player.get(QuestLog);
      expect(log?.activeQuests).toHaveLength(0);
      expect(log?.completedQuests).toContain('micro-lost-merchant');
    });

    it('preserves other active quests when completing one', () => {
      const { spawnPlayer } = playerActions(world);
      const { startQuest, completeQuest } = questActions(world);
      const player = spawnPlayer(0, 0, 0);

      startQuest(player, 'micro-lost-merchant');
      startQuest(player, 'meso-poisoned-well');
      completeQuest(player, 'micro-lost-merchant');

      const log = player.get(QuestLog);
      expect(log?.activeQuests).toHaveLength(1);
      expect(log?.activeQuests[0].questId).toBe('meso-poisoned-well');
      expect(log?.completedQuests).toContain('micro-lost-merchant');
    });
  });

  describe('assignQuestGiver', () => {
    it('adds quest giver trait to an NPC', () => {
      const { spawnNPC } = npcActions(world);
      const { assignQuestGiver } = questActions(world);
      const npc = spawnNPC({
        x: 0,
        y: 0,
        z: 0,
        archetype: 'innkeeper',
        greetings: ['Welcome to my inn!'],
      });

      assignQuestGiver(npc, 'meso-poisoned-well');

      expect(npc.has(IsQuestGiver)).toBe(true);
      expect(npc.get(IsQuestGiver)?.questId).toBe('meso-poisoned-well');
    });

    it('updates quest if NPC already has IsQuestGiver', () => {
      const { spawnNPC } = npcActions(world);
      const { assignQuestGiver } = questActions(world);
      const npc = spawnNPC({
        x: 0,
        y: 0,
        z: 0,
        archetype: 'innkeeper',
        greetings: ['Welcome!'],
      });

      assignQuestGiver(npc, 'meso-poisoned-well');
      assignQuestGiver(npc, 'micro-lost-merchant');

      expect(npc.get(IsQuestGiver)?.questId).toBe('micro-lost-merchant');
    });
  });

  describe('full quest lifecycle', () => {
    it('runs a complete quest from start to finish', () => {
      const { spawnPlayer } = playerActions(world);
      const { spawnNPC } = npcActions(world);
      const {
        startQuest,
        chooseBranch,
        advanceStep,
        completeQuest,
        assignQuestGiver,
      } = questActions(world);

      // Set up
      const player = spawnPlayer(0, 0, 0);
      const npc = spawnNPC({
        x: 5,
        y: 0,
        z: 5,
        archetype: 'innkeeper',
        greetings: ['Welcome!'],
      });
      assignQuestGiver(npc, 'meso-poisoned-well');

      // Player starts quest
      startQuest(player, 'meso-poisoned-well');
      expect(player.get(QuestLog)?.activeQuests).toHaveLength(1);

      // Player chooses branch A
      chooseBranch(player, 'meso-poisoned-well', 'A');
      expect(player.get(QuestLog)?.activeQuests[0].branch).toBe('A');

      // Player advances through steps
      advanceStep(player, 'meso-poisoned-well');
      advanceStep(player, 'meso-poisoned-well');
      expect(player.get(QuestLog)?.activeQuests[0].currentStep).toBe(2);

      // Quest complete
      completeQuest(player, 'meso-poisoned-well');
      expect(player.get(QuestLog)?.activeQuests).toHaveLength(0);
      expect(player.get(QuestLog)?.completedQuests).toContain(
        'meso-poisoned-well',
      );
    });
  });
});
