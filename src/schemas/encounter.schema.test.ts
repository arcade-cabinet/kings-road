import { describe, expect, it } from 'vitest';
import { EncounterDefinitionSchema } from './encounter.schema';

describe('Encounter Schema', () => {
  it('validates a complete encounter definition', () => {
    const encounter = {
      id: 'poisoner-fight',
      name: 'Confronting the Poisoner',
      type: 'combat',
      difficulty: 4,
      description:
        'A tense confrontation with the person responsible for poisoning the village well.',
      rewards: [
        { itemId: 'poisoner-confession', chance: 1 },
        { itemId: 'rare-herb', chance: 0.3 },
      ],
      failureConsequence: 'The poisoner escapes, and the village grows sicker.',
    };
    expect(() => EncounterDefinitionSchema.parse(encounter)).not.toThrow();
  });

  it('rejects encounter with difficulty out of range', () => {
    const encounter = {
      id: 'too-hard',
      name: 'Impossible Fight',
      type: 'combat',
      difficulty: 15,
      description: 'This encounter has an impossibly high difficulty rating.',
    };
    expect(() => EncounterDefinitionSchema.parse(encounter)).toThrow();
  });

  it('rejects encounter with difficulty of 0', () => {
    const encounter = {
      id: 'too-easy',
      name: 'Trivial Encounter',
      type: 'combat',
      difficulty: 0,
      description: 'This encounter has a zero difficulty which is invalid.',
    };
    expect(() => EncounterDefinitionSchema.parse(encounter)).toThrow();
  });

  it('validates encounter without optional fields', () => {
    const encounter = {
      id: 'simple-puzzle',
      name: 'The Riddle Gate',
      type: 'puzzle',
      difficulty: 3,
      description: 'A gate inscribed with riddles that must be solved to pass.',
    };
    expect(() => EncounterDefinitionSchema.parse(encounter)).not.toThrow();
  });

  it('rejects encounter with invalid type', () => {
    const encounter = {
      id: 'bad-type',
      name: 'Bad Encounter',
      type: 'magic_duel',
      difficulty: 5,
      description: 'This encounter has an invalid type that is not supported.',
    };
    expect(() => EncounterDefinitionSchema.parse(encounter)).toThrow();
  });

  it('validates reward chance between 0 and 1', () => {
    const encounter = {
      id: 'bad-chance',
      name: 'Bad Reward Chance',
      type: 'combat',
      difficulty: 5,
      description: 'This encounter has a reward with invalid chance value.',
      rewards: [{ itemId: 'something', chance: 1.5 }],
    };
    expect(() => EncounterDefinitionSchema.parse(encounter)).toThrow();
  });
});
