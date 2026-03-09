import { describe, it, expect } from 'vitest';
import { NPCDefinitionSchema, DialogueLineSchema } from './npc.schema';

describe('NPC Schema', () => {
  it('validates a complete NPC definition', () => {
    const npc = {
      id: 'npc-blacksmith-01',
      archetype: 'blacksmith',
      namePool: ['Aldric', 'Brennan', 'Cedric'],
      greetingPool: [
        { text: 'Welcome to my forge, traveler. What can I craft for you today?' },
        { text: 'The anvil sings when good steel meets it. What do you need?' },
      ],
      questDialogue: {
        'quest-broken-sword': [
          { text: 'Aye, I can reforge that blade. Bring me iron ore from the hills.', condition: 'quest:broken-sword:active' },
        ],
      },
      appearance: {
        clothColor: '#8B4513',
        accessory: 'leather_apron',
      },
    };
    expect(() => NPCDefinitionSchema.parse(npc)).not.toThrow();
  });

  it('rejects NPC with fewer than 3 names in pool', () => {
    const npc = {
      id: 'npc-bad',
      archetype: 'merchant',
      namePool: ['Alice', 'Bob'],
      greetingPool: [
        { text: 'Hello there, welcome to my humble shop today.' },
        { text: 'What can I do for you on this fine day, traveler?' },
      ],
    };
    expect(() => NPCDefinitionSchema.parse(npc)).toThrow();
  });

  it('rejects NPC with fewer than 2 greetings', () => {
    const npc = {
      id: 'npc-bad',
      archetype: 'merchant',
      namePool: ['Alice', 'Bob', 'Charlie'],
      greetingPool: [
        { text: 'Hello there, welcome to my humble shop today.' },
      ],
    };
    expect(() => NPCDefinitionSchema.parse(npc)).toThrow();
  });

  it('rejects NPC with invalid archetype', () => {
    const npc = {
      id: 'npc-bad',
      archetype: 'wizard',
      namePool: ['Alice', 'Bob', 'Charlie'],
      greetingPool: [
        { text: 'Hello there, welcome to my humble shop today.' },
        { text: 'What brings you to these parts on this fine day?' },
      ],
    };
    expect(() => NPCDefinitionSchema.parse(npc)).toThrow();
  });

  it('validates dialogue line with condition', () => {
    const line = {
      text: 'I heard about the trouble at the well. Let me know if you need help.',
      condition: 'quest:poisoned-well:active',
    };
    expect(() => DialogueLineSchema.parse(line)).not.toThrow();
  });

  it('rejects dialogue line with too-short text', () => {
    const line = { text: 'Hi there' };
    expect(() => DialogueLineSchema.parse(line)).toThrow();
  });
});
