"use strict";
// 地图相关类型定义
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIRECTION_DELTA = exports.TILE_VISUALS = exports.TILE_WALKABLE = exports.TileType = void 0;
// 地图瓷砖类型
var TileType;
(function (TileType) {
    TileType["GRASS"] = "grass";
    TileType["DIRT"] = "dirt";
    TileType["STONE"] = "stone";
    TileType["WATER"] = "water";
    TileType["WALL"] = "wall";
    TileType["TREE"] = "tree";
    TileType["BUILDING"] = "building";
    TileType["PORTAL"] = "portal";
    TileType["NPC"] = "npc";
    TileType["CHEST"] = "chest";
    TileType["MONSTER"] = "monster";
})(TileType || (exports.TileType = TileType = {}));
// 瓷砖是否可通行
exports.TILE_WALKABLE = {
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
exports.TILE_VISUALS = {
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
// 方向对应的位移
exports.DIRECTION_DELTA = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
};
