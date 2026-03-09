import { createWorld } from 'koota';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Dialogue, Interactable, IsNPC, NPCArchetype } from './npc';

describe('NPC Traits', () => {
  let world: ReturnType<typeof createWorld>;

  beforeEach(() => {
    world = createWorld();
  });

  afterEach(() => {
    world.destroy();
  });

  describe('IsNPC', () => {
    it('is a tag trait', () => {
      const entity = world.spawn(IsNPC);
      expect(entity.has(IsNPC)).toBe(true);
    });
  });

  describe('NPCArchetype', () => {
    it('defaults to empty archetype', () => {
      const entity = world.spawn(NPCArchetype);
      expect(entity.get(NPCArchetype)?.archetype).toBe('');
    });

    it('stores an archetype string', () => {
      const entity = world.spawn(NPCArchetype({ archetype: 'blacksmith' }));
      expect(entity.get(NPCArchetype)?.archetype).toBe('blacksmith');
    });
  });

  describe('Dialogue', () => {
    it('starts with empty dialogue arrays', () => {
      const entity = world.spawn(Dialogue);
      const dlg = entity.get(Dialogue);
      expect(dlg?.greetings).toEqual([]);
      expect(dlg?.questDialogue).toEqual({});
    });

    it('stores greetings and quest dialogue', () => {
      const entity = world.spawn(Dialogue);
      entity.set(Dialogue, {
        greetings: ['Well met, traveler!', 'The road is long, friend.'],
        questDialogue: {
          'meso-poisoned-well': ['Have you heard about the well?'],
        },
      });
      const dlg = entity.get(Dialogue);
      expect(dlg?.greetings).toHaveLength(2);
      expect(dlg?.questDialogue['meso-poisoned-well']).toHaveLength(1);
    });

    it('each entity gets its own dialogue instance', () => {
      const e1 = world.spawn(Dialogue);
      const e2 = world.spawn(Dialogue);

      e1.set(Dialogue, {
        greetings: ['Hello!'],
        questDialogue: {},
      });

      expect(e2.get(Dialogue)?.greetings).toEqual([]);
    });
  });

  describe('Interactable', () => {
    it('has default radius 3 and action verb Talk', () => {
      const entity = world.spawn(Interactable);
      const int = entity.get(Interactable);
      expect(int?.radius).toBe(3);
      expect(int?.actionVerb).toBe('Talk');
    });

    it('accepts custom interaction settings', () => {
      const entity = world.spawn(
        Interactable({ radius: 5, actionVerb: 'Trade' }),
      );
      const int = entity.get(Interactable);
      expect(int?.radius).toBe(5);
      expect(int?.actionVerb).toBe('Trade');
    });
  });

  describe('full NPC entity', () => {
    it('composes all NPC traits together', () => {
      const entity = world.spawn(
        IsNPC,
        NPCArchetype({ archetype: 'merchant' }),
        Dialogue,
        Interactable({ radius: 4, actionVerb: 'Trade' }),
      );
      expect(entity.has(IsNPC)).toBe(true);
      expect(entity.get(NPCArchetype)?.archetype).toBe('merchant');
      expect(entity.has(Dialogue)).toBe(true);
      expect(entity.get(Interactable)?.actionVerb).toBe('Trade');
    });
  });
});
