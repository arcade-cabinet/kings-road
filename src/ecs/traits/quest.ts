import { trait } from 'koota';

export const QuestLog = trait(() => ({
  activeQuests: [] as Array<{
    questId: string;
    currentStep: number;
    branch?: 'A' | 'B';
  }>,
  completedQuests: [] as string[],
  mainQuestChapter: 0,
}));
export const IsQuestGiver = trait({ questId: '' });
