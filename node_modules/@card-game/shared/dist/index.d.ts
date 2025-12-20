/**
 * 末日生存卡牌游戏 - 共享类型库
 */
export * from './types/enums';
export * from './types/player';
export * from './types/card';
export * from './types/boss';
export * from './types/game';
export * from './types/socket';
export * from './types/map';
export declare const GAME_CONFIG: {
    readonly MAX_HAND_SIZE: 7;
    readonly CARDS_PER_TURN: 2;
    readonly MAX_ROUNDS: 30;
    readonly TURN_TIME_LIMIT: 60000;
    readonly BASE_EXPERIENCE_PER_LEVEL: 100;
    readonly EXPERIENCE_MULTIPLIER: 1.5;
    readonly MAX_LEVEL: 50;
    readonly BOSS_REVIVE_HEALTH_RATIO: 0.5;
    readonly BOSS_ATTACK_BOOST_PER_REVIVE: 5;
    readonly DECK_MIN_SIZE: 20;
    readonly DECK_MAX_SIZE: 40;
    readonly BASE_GOLD_REWARD: 50;
    readonly BASE_SURVIVAL_POINTS: 10;
    readonly MVP_BONUS_MULTIPLIER: 2;
};
