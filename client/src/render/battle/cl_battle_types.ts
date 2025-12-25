/**
 * 战斗场景类型和配置
 * 
 * 模块: client/render/battle
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import { Color3 } from '@babylonjs/core';

// =============================================================================
// 卡牌类型
// =============================================================================

export enum CardType {
    Attack = 'Attack',
    Block = 'Block',
    Heal = 'Heal'
}

export interface BattleCard {
    id: string;
    type: CardType;
    name: string;
    description: string;
    color: string;
}

export enum BattlePhase {
    Deploy = 'Deploy',
    PlayerTurn = 'PlayerTurn',
    EnemyTurn = 'EnemyTurn',
    Victory = 'Victory',
    Defeat = 'Defeat'
}

/**
 * 技能数据
 */
export interface SkillData {
    costAP: number;
    reqAttackCards: number;
    damage: number;
}

/**
 * 获取技能数据
 */
export function getSkillData(skill: 'Normal' | 'Small' | 'Ult'): SkillData {
    switch (skill) {
        case 'Normal': return { costAP: 1, reqAttackCards: 1, damage: 1 };
        case 'Small': return { costAP: 1, reqAttackCards: 2, damage: 3 };
        case 'Ult': return { costAP: 2, reqAttackCards: 3, damage: 6 };
    }
}

/**
 * 创建卡牌
 */
export function createCard(type: CardType, index: number): BattleCard {
    return {
        id: `card_${Date.now()}_${index}`,
        type: type,
        name: type === CardType.Attack ? "攻击" : (type === CardType.Block ? "格挡" : "回血"),
        description: "",
        color: type === CardType.Attack ? "red" : (type === CardType.Block ? "blue" : "green")
    };
}

// =============================================================================
// 战斗场景配置
// =============================================================================

export const CL_BATTLE_CONFIG = {
    // 场地尺寸
    FIELD_WIDTH: 12,
    FIELD_DEPTH: 16,
    
    // 玩家位置
    PLAYER_Z: -6,
    OPPONENT_Z: 6,
    
    // 卡牌区域
    DECK_X: 5,
    DISCARD_X: -5,
    
    // 战场位置
    BATTLEFIELD_Y: 0.5,
    
    // 颜色
    PLAYER_COLOR: new Color3(0.2, 0.4, 0.8),
    OPPONENT_COLOR: new Color3(0.8, 0.2, 0.2),
    BATTLEFIELD_COLOR: new Color3(0.3, 0.25, 0.2),
};

// =============================================================================
// 区域定义
// =============================================================================

export enum ClBattleZone {
    PlayerHand = 'playerHand',
    PlayerField = 'playerField',
    PlayerDeck = 'playerDeck',
    PlayerDiscard = 'playerDiscard',
    OpponentHand = 'opponentHand',
    OpponentField = 'opponentField',
    OpponentDeck = 'opponentDeck',
    OpponentDiscard = 'opponentDiscard',
}
