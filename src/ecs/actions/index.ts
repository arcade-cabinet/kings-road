import { createActions, type Entity } from 'koota';
import {
  IsPlayer,
  Health,
  Stamina,
  Movement,
  PlayerInput,
  DistanceTraveled,
  QuestLog,
  Position,
  Velocity,
  Rotation,
  IsNPC,
  NPCArchetype,
  Dialogue,
  Interactable,
  RoadPosition,
  IsOnRoad,
  IsQuestGiver,
} from '../traits';

export const playerActions = createActions((world) => ({
  spawnPlayer: (x: number, y: number, z: number) =>
    world.spawn(
      IsPlayer,
      Position({ x, y, z }),
      Velocity,
      Rotation,
      Health,
      Stamina,
      Movement,
      PlayerInput,
      DistanceTraveled,
      QuestLog,
    ),
  updateInput: (
    entity: Entity,
    input: Partial<{
      forward: boolean;
      backward: boolean;
      left: boolean;
      right: boolean;
      strafeLeft: boolean;
      strafeRight: boolean;
      jump: boolean;
      walk: boolean;
      interact: boolean;
    }>,
  ) => {
    entity.set(PlayerInput, input);
  },
}));

export const npcActions = createActions((world) => ({
  spawnNPC: (options: {
    x: number;
    y: number;
    z: number;
    archetype: string;
    greetings: string[];
    questDialogue?: Record<string, string[]>;
    interactRadius?: number;
    actionVerb?: string;
  }) =>
    world.spawn(
      IsNPC,
      Position({ x: options.x, y: options.y, z: options.z }),
      Rotation,
      NPCArchetype({ archetype: options.archetype }),
      Dialogue,
      Interactable({
        radius: options.interactRadius ?? 3,
        actionVerb: options.actionVerb ?? 'Talk',
      }),
    ),
}));

export const questActions = createActions((world) => ({
  startQuest: (entity: Entity, questId: string) => {
    const log = entity.get(QuestLog);
    if (!log) return;
    const alreadyActive = log.activeQuests.some((q) => q.questId === questId);
    if (alreadyActive) return;
    entity.set(QuestLog, {
      ...log,
      activeQuests: [...log.activeQuests, { questId, currentStep: 0 }],
    });
  },
  chooseBranch: (entity: Entity, questId: string, branch: 'A' | 'B') => {
    const log = entity.get(QuestLog);
    if (!log) return;
    entity.set(QuestLog, {
      ...log,
      activeQuests: log.activeQuests.map((q) =>
        q.questId === questId ? { ...q, branch } : q,
      ),
    });
  },
  advanceStep: (entity: Entity, questId: string) => {
    const log = entity.get(QuestLog);
    if (!log) return;
    entity.set(QuestLog, {
      ...log,
      activeQuests: log.activeQuests.map((q) =>
        q.questId === questId ? { ...q, currentStep: q.currentStep + 1 } : q,
      ),
    });
  },
  completeQuest: (entity: Entity, questId: string) => {
    const log = entity.get(QuestLog);
    if (!log) return;
    entity.set(QuestLog, {
      ...log,
      activeQuests: log.activeQuests.filter((q) => q.questId !== questId),
      completedQuests: [...log.completedQuests, questId],
    });
  },
  assignQuestGiver: (npcEntity: Entity, questId: string) => {
    if (!npcEntity.has(IsQuestGiver)) {
      npcEntity.add(IsQuestGiver({ questId }));
    } else {
      npcEntity.set(IsQuestGiver, { questId });
    }
  },
}));
