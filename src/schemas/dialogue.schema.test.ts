import { describe, expect, it } from 'vitest';
import { DialogueTreeSchema } from './dialogue.schema';

describe('DialogueTreeSchema', () => {
  it('accepts a valid dialogue tree', () => {
    const tree = {
      id: 'elara-greeting',
      owner: 'elara',
      startNode: 'start',
      nodes: [
        {
          id: 'start',
          speaker: 'Elara',
          text: 'Welcome, traveller. The road ahead is long.',
          expression: 'neutral',
          options: [
            { text: 'Tell me about this place.', next: 'about' },
            { text: 'Farewell.', next: 'bye' },
          ],
        },
        {
          id: 'about',
          speaker: 'Elara',
          text: 'This village has stood since the old king reigned.',
          next: 'bye',
        },
        {
          id: 'bye',
          speaker: 'Elara',
          text: 'Safe travels, friend.',
          terminal: true,
        },
      ],
    };
    expect(() => DialogueTreeSchema.parse(tree)).not.toThrow();
  });

  it('rejects a tree with no nodes', () => {
    const tree = {
      id: 'empty-tree',
      owner: 'nobody',
      startNode: 'start',
      nodes: [],
    };
    expect(() => DialogueTreeSchema.parse(tree)).toThrow();
  });

  it('rejects a tree missing required fields', () => {
    const tree = {
      id: 'broken',
      nodes: [{ id: 'start', text: 'Hello.' }],
    };
    expect(() => DialogueTreeSchema.parse(tree)).toThrow();
  });

  it('accepts a node with conditions and effects', () => {
    const tree = {
      id: 'quest-dialogue',
      owner: 'guard-marcus',
      startNode: 'start',
      nodes: [
        {
          id: 'start',
          speaker: 'Guard Marcus',
          text: 'Halt! State your business.',
          options: [
            {
              text: "I bear the captain's seal.",
              next: 'pass',
              conditions: [{ type: 'has_item', target: 'captain-seal' }],
              effects: [{ type: 'set_flag', target: 'gate-passed' }],
            },
            { text: 'Never mind.', next: 'end' },
          ],
        },
        { id: 'pass', text: 'Right, carry on then.', terminal: true },
        { id: 'end', text: 'Move along.', terminal: true },
      ],
    };
    expect(() => DialogueTreeSchema.parse(tree)).not.toThrow();
  });
});
