/**
 * 末日生存卡牌游戏 - 共享类型库
 */

// 导出所有类型定义
export * from './types/enums';
export * from './types/player';
export * from './types/card';
export * from './types/boss';
export * from './types/game';
export * from './types/socket';
export * from './types/map';

// 导出游戏常量
export const GAME_CONFIG = {
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
  BOSS_REVIVE_HEALTH_RATIO: 0.5,  // 复活时恢复50%血量
  BOSS_ATTACK_BOOST_PER_REVIVE: 5, // 每次复活增加5%攻击力
  
  // 卡牌配置
  DECK_MIN_SIZE: 20,
  DECK_MAX_SIZE: 40,
  
  // 奖励配置
  BASE_GOLD_REWARD: 50,
  BASE_SURVIVAL_POINTS: 10,
  MVP_BONUS_MULTIPLIER: 2.0,
} as const;
