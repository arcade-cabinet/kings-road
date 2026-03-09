import { z } from 'zod';

export const RoomType = z.enum([
  'entrance',
  'corridor',
  'chamber',
  'puzzle',
  'boss',
  'treasure',
  'shrine',
]);
export type RoomType = z.infer<typeof RoomType>;

export const TrapType = z.enum([
  'pressure_plate',
  'dart_wall',
  'pit_fall',
  'poison_gas',
  'collapsing_ceiling',
]);
export type TrapType = z.infer<typeof TrapType>;

export const TrapSchema = z.object({
  type: TrapType,
  difficulty: z.number().int().min(1).max(10),
  damage: z.number().int().min(1).max(50),
  description: z.string().min(10).max(300),
});
export type Trap = z.infer<typeof TrapSchema>;

export const ConnectionSchema = z.object({
  to: z.string().min(1),
  direction: z.enum(['north', 'south', 'east', 'west', 'up', 'down']),
  locked: z.boolean().default(false),
  keyId: z.string().optional(),
  secret: z.boolean().default(false),
  secretHint: z.string().max(300).optional(),
});
export type Connection = z.infer<typeof ConnectionSchema>;

export const DungeonRoomSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(80),
  type: RoomType,
  description: z.string().min(10).max(500),
  encounterId: z.string().optional(),
  lootTableId: z.string().optional(),
  traps: z.array(TrapSchema).optional(),
  connections: z.array(ConnectionSchema).min(1),
});
export type DungeonRoom = z.infer<typeof DungeonRoomSchema>;

export const DungeonLayoutSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(80),
  anchorId: z.string(),
  description: z.string().min(10).max(500),
  recommendedLevel: z.number().int().min(1).max(20),
  rooms: z.array(DungeonRoomSchema).min(3),
  entranceRoomId: z.string(),
  bossRoomId: z.string(),
});
export type DungeonLayout = z.infer<typeof DungeonLayoutSchema>;
