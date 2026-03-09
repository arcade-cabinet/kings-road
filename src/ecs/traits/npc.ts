import { trait } from 'koota';

export const IsNPC = trait();
export const NPCArchetype = trait({ archetype: '' as string });
export const Dialogue = trait(() => ({
  greetings: [] as string[],
  questDialogue: {} as Record<string, string[]>,
}));
export const Interactable = trait({ radius: 3, actionVerb: 'Talk' });
