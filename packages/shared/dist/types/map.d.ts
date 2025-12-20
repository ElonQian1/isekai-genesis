export declare enum TileType {
    GRASS = "grass",// 草地
    DIRT = "dirt",// 泥土
    STONE = "stone",// 石头路
    WATER = "water",// 水
    WALL = "wall",// 墙壁
    TREE = "tree",// 树木
    BUILDING = "building",// 建筑
    PORTAL = "portal",// 传送门
    NPC = "npc",// NPC位置
    CHEST = "chest",// 宝箱
    MONSTER = "monster"
}
export declare const TILE_WALKABLE: Record<TileType, boolean>;
export declare const TILE_VISUALS: Record<TileType, {
    char: string;
    color: string;
    bgColor: string;
}>;
export interface Position {
    x: number;
    y: number;
}
export interface MapTile {
    type: TileType;
    walkable: boolean;
    interactable?: boolean;
    interactionId?: string;
    metadata?: Record<string, unknown>;
}
export interface GameMap {
    id: string;
    name: string;
    width: number;
    height: number;
    tiles: MapTile[][];
    spawnPoint: Position;
    portals: MapPortal[];
    npcs: MapNPC[];
    monsters: MapMonster[];
}
export interface MapPortal {
    id: string;
    position: Position;
    targetMapId: string;
    targetPosition: Position;
    name: string;
}
export interface MapNPC {
    id: string;
    name: string;
    position: Position;
    sprite: string;
    dialogues: string[];
    type: 'shop' | 'quest' | 'info' | 'battle';
}
export interface MapMonster {
    id: string;
    name: string;
    position: Position;
    sprite: string;
    level: number;
    isBoss: boolean;
    bossId?: string;
}
export interface PlayerMapState {
    playerId: string;
    currentMapId: string;
    position: Position;
    direction: 'up' | 'down' | 'left' | 'right';
    isMoving: boolean;
}
export type Direction = 'up' | 'down' | 'left' | 'right';
export declare const DIRECTION_DELTA: Record<Direction, Position>;
