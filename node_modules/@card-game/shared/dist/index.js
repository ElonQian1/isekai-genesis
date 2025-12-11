"use strict";
/**
 * 末日生存卡牌游戏 - 共享类型库
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GAME_CONFIG = void 0;
// 导出所有类型定义
__exportStar(require("./types/enums"), exports);
__exportStar(require("./types/player"), exports);
__exportStar(require("./types/card"), exports);
__exportStar(require("./types/boss"), exports);
__exportStar(require("./types/game"), exports);
__exportStar(require("./types/socket"), exports);
// 导出游戏常量
exports.GAME_CONFIG = {
    // 基础配置
    MAX_HAND_SIZE: 7,
    CARDS_PER_TURN: 2,
    MAX_ROUNDS: 30,
    TURN_TIME_LIMIT: 60000, // 60秒
    // 经验和等级
    BASE_EXPERIENCE_PER_LEVEL: 100,
    EXPERIENCE_MULTIPLIER: 1.5,
    MAX_LEVEL: 50,
    // 战斗配置
    BOSS_REVIVE_HEALTH_RATIO: 0.5, // 复活时恢复50%血量
    BOSS_ATTACK_BOOST_PER_REVIVE: 5, // 每次复活增加5%攻击力
    // 卡牌配置
    DECK_MIN_SIZE: 20,
    DECK_MAX_SIZE: 40,
    // 奖励配置
    BASE_GOLD_REWARD: 50,
    BASE_SURVIVAL_POINTS: 10,
    MVP_BONUS_MULTIPLIER: 2.0,
};
