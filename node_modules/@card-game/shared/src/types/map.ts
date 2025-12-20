// 地图相关类型定义

// 地图瓷砖类型
export enum TileType {
  GRASS = 'grass',           // 草地
  DIRT = 'dirt',             // 泥土
  STONE = 'stone',           // 石头路
  WATER = 'water',           // 水
  WALL = 'wall',             // 墙壁
  TREE = 'tree',             // 树木
  BUILDING = 'building',     // 建筑
  PORTAL = 'portal',         // 传送门
  NPC = 'npc',               // NPC位置
  CHEST = 'chest',           // 宝箱
  MONSTER = 'monster',       // 怪物刷新点
}

// 瓷砖是否可通行
export const TILE_WALKABLE: Record<TileType, boolean> = {
  [TileType.GRASS]: true,
  [TileType.DIRT]: true,
  [TileType.STONE]: true,
  [TileType.WATER]: false,
  [TileType.WALL]: false,
  [TileType.TREE]: false,
  [TileType.BUILDING]: false,
  [TileType.PORTAL]: true,
  [TileType.NPC]: true,
  [TileType.CHEST]: true,
  [TileType.MONSTER]: true,
};

// 瓷砖视觉信息
export const TILE_VISUALS: Record<TileType, { char: string; color: string; bgColor: string }> = {
  [TileType.GRASS]: { char: '░', color: '#4ade80', bgColor: '#166534' },
  [TileType.DIRT]: { char: '▒', color: '#a8a29e', bgColor: '#78716c' },
  [TileType.STONE]: { char: '▓', color: '#9ca3af', bgColor: '#4b5563' },
  [TileType.WATER]: { char: '~', color: '#38bdf8', bgColor: '#0284c7' },
  [TileType.WALL]: { char: '█', color: '#6b7280', bgColor: '#374151' },
  [TileType.TREE]: { char: '♣', color: '#22c55e', bgColor: '#166534' },
  [TileType.BUILDING]: { char: '⌂', color: '#fbbf24', bgColor: '#78716c' },
  [TileType.PORTAL]: { char: '◎', color: '#a855f7', bgColor: '#166534' },
  [TileType.NPC]: { char: '☺', color: '#fbbf24', bgColor: '#166534' },
  [TileType.CHEST]: { char: '■', color: '#fbbf24', bgColor: '#166534' },
  [TileType.MONSTER]: { char: '◆', color: '#ef4444', bgColor: '#166534' },
};

// 位置坐标
export interface Position {
  x: number;
  y: number;
}

// 地图瓷砖
export interface MapTile {
  type: TileType;
  walkable: boolean;
  interactable?: boolean;
  interactionId?: string;   // 交互目标ID (NPC ID, 传送门ID等)
  metadata?: Record<string, unknown>;
}

// 地图区域
export interface GameMap {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: MapTile[][];        // [y][x] 二维数组
  spawnPoint: Position;      // 出生点
  portals: MapPortal[];      // 传送点列表
  npcs: MapNPC[];            // NPC列表
  monsters: MapMonster[];    // 怪物列表
}

// 传送门
export interface MapPortal {
  id: string;
  position: Position;
  targetMapId: string;
  targetPosition: Position;
  name: string;
}

// 地图上的NPC
export interface MapNPC {
  id: string;
  name: string;
  position: Position;
  sprite: string;            // 显示的emoji或精灵ID
  dialogues: string[];       // 对话内容
  type: 'shop' | 'quest' | 'info' | 'battle';
}

// 地图上的怪物/Boss入口
export interface MapMonster {
  id: string;
  name: string;
  position: Position;
  sprite: string;
  level: number;
  isBoss: boolean;
  bossId?: string;           // 关联的Boss ID
}

// 玩家在地图上的状态
export interface PlayerMapState {
  playerId: string;
  currentMapId: string;
  position: Position;
  direction: 'up' | 'down' | 'left' | 'right';
  isMoving: boolean;
}

// 移动方向
export type Direction = 'up' | 'down' | 'left' | 'right';

// 方向对应的位移
export const DIRECTION_DELTA: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
