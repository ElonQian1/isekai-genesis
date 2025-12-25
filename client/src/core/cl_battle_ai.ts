/**
 * 战斗 AI 模块
 * 
 * 模块: client
 * 前缀: Cl
 * 
 * 职责:
 * - AI 决策逻辑
 * - AI 回合执行
 * - 难度级别管理
 */

import { ClCardData, ClPlayerData } from '../cl_battle_manager';

// =============================================================================
// AI 难度
// =============================================================================

export enum ClAIDifficulty {
    Easy = 'easy',
    Normal = 'normal',
    Hard = 'hard',
}

// =============================================================================
// AI 配置
// =============================================================================

export const CL_AI_CONFIG = {
    // 回合延迟 (毫秒)
    turnDelay: 1000,
    cardDelay: 500,
    endTurnDelay: 500,
};

// =============================================================================
// 战斗 AI
// =============================================================================

export class ClBattleAI {
    private difficulty: ClAIDifficulty = ClAIDifficulty.Normal;

    /**
     * 设置难度
     */
    setDifficulty(difficulty: ClAIDifficulty): void {
        this.difficulty = difficulty;
    }

    /**
     * 获取当前难度
     */
    getDifficulty(): ClAIDifficulty {
        return this.difficulty;
    }

    /**
     * AI 选择要打的牌
     */
    selectCards(playableCards: ClCardData[], energy: number): ClCardData[] {
        if (playableCards.length === 0) return [];

        const selected: ClCardData[] = [];
        let remainingEnergy = energy;

        switch (this.difficulty) {
            case ClAIDifficulty.Easy:
                return this.selectCardsEasy(playableCards);

            case ClAIDifficulty.Normal:
                return this.selectCardsNormal(playableCards, remainingEnergy);

            case ClAIDifficulty.Hard:
                return this.selectCardsHard(playableCards, remainingEnergy);
        }

        return selected;
    }

    /**
     * 简单难度：随机打一张
     */
    private selectCardsEasy(playableCards: ClCardData[]): ClCardData[] {
        if (playableCards.length === 0) return [];
        
        const randomIndex = Math.floor(Math.random() * playableCards.length);
        return [playableCards[randomIndex]];
    }

    /**
     * 普通难度：打出所有能打的牌 (贪心 - 高费优先)
     */
    private selectCardsNormal(playableCards: ClCardData[], energy: number): ClCardData[] {
        const selected: ClCardData[] = [];
        let remainingEnergy = energy;

        const sortedCards = [...playableCards].sort((a, b) => b.cost - a.cost);
        
        for (const card of sortedCards) {
            if (card.cost <= remainingEnergy) {
                selected.push(card);
                remainingEnergy -= card.cost;
            }
        }

        return selected;
    }

    /**
     * 困难难度：优先攻击牌，然后防御牌
     */
    private selectCardsHard(playableCards: ClCardData[], energy: number): ClCardData[] {
        const selected: ClCardData[] = [];
        let remainingEnergy = energy;

        // 分类卡牌
        const attackCards = playableCards.filter(c => c.card_type === 'Attack');
        const defenseCards = playableCards.filter(c => c.card_type === 'Defense');
        const otherCards = playableCards.filter(
            c => c.card_type !== 'Attack' && c.card_type !== 'Defense'
        );

        // 优先顺序：攻击 > 防御 > 其他，按伤害排序
        const priorityOrder = [...attackCards, ...defenseCards, ...otherCards]
            .sort((a, b) => (b.base_damage ?? 0) - (a.base_damage ?? 0));

        for (const card of priorityOrder) {
            if (card.cost <= remainingEnergy) {
                selected.push(card);
                remainingEnergy -= card.cost;
            }
        }

        return selected;
    }

    /**
     * 计算 AI 的行动顺序
     */
    planActions(aiPlayer: ClPlayerData): { cardId: string; targetId: string }[] {
        const playableCards = aiPlayer.hand.filter(
            (card: ClCardData) => card.cost <= aiPlayer.stats.energy
        );

        const cardsToPlay = this.selectCards(playableCards, aiPlayer.stats.energy);

        // 简单策略：所有卡牌攻击对手
        return cardsToPlay.map(card => ({
            cardId: card.id,
            targetId: '', // 由调用者设置
        }));
    }

    /**
     * 辅助方法：延迟
     */
    static delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
