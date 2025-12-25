/**
 * 战斗卡牌管理器 - 处理牌库、卡池、手牌
 * 
 * 模块: client/render/battle/managers
 * 前缀: Cl
 * 文档: 文档/09-模块化架构.md
 * 
 * 职责：
 * - 牌库初始化和洗牌
 * - 卡池生成
 * - 手牌管理
 */

// =============================================================================
// 类型定义
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

/**
 * 卡牌配置
 */
export interface CardConfig {
    attackCount: number;  // 攻击牌数量
    blockCount: number;   // 格挡牌数量
    healCount: number;    // 回血牌数量
    poolSize: number;     // 每回合卡池大小
}

/**
 * 默认卡牌配置
 */
export const DEFAULT_CARD_CONFIG: CardConfig = {
    attackCount: 15,
    blockCount: 15,
    healCount: 20,
    poolSize: 5
};

// =============================================================================
// 卡牌管理器
// =============================================================================

export class ClBattleCardManager {
    private deck: CardType[] = [];
    private pool: BattleCard[] = [];
    private hand: BattleCard[] = [];
    private config: CardConfig;
    
    constructor(config: CardConfig = DEFAULT_CARD_CONFIG) {
        this.config = config;
    }
    
    // =========================================================================
    // 初始化
    // =========================================================================
    
    /**
     * 初始化牌库
     */
    initDeck(): void {
        this.deck = [];
        this.hand = [];
        this.pool = [];
        
        // 根据配置生成牌库
        for (let i = 0; i < this.config.attackCount; i++) {
            this.deck.push(CardType.Attack);
        }
        for (let i = 0; i < this.config.blockCount; i++) {
            this.deck.push(CardType.Block);
        }
        for (let i = 0; i < this.config.healCount; i++) {
            this.deck.push(CardType.Heal);
        }
        
        this.shuffle();
    }
    
    /**
     * 洗牌
     */
    shuffle(): void {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }
    
    // =========================================================================
    // 卡池操作
    // =========================================================================
    
    /**
     * 生成新的卡池
     */
    generatePool(): BattleCard[] {
        this.pool = [];
        
        for (let i = 0; i < this.config.poolSize; i++) {
            const type = this.deck[Math.floor(Math.random() * this.deck.length)];
            this.pool.push(this.createCard(type, i));
        }
        
        return this.pool;
    }
    
    /**
     * 获取当前卡池
     */
    getPool(): BattleCard[] {
        return [...this.pool];
    }
    
    /**
     * 从卡池选取卡牌到手牌
     */
    draftCard(cardId: string): BattleCard | null {
        const cardIndex = this.pool.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return null;
        
        const card = this.pool[cardIndex];
        this.pool.splice(cardIndex, 1);
        this.hand.push(card);
        
        return card;
    }
    
    // =========================================================================
    // 手牌操作
    // =========================================================================
    
    /**
     * 获取当前手牌
     */
    getHand(): BattleCard[] {
        return [...this.hand];
    }
    
    /**
     * 清空手牌
     */
    clearHand(): void {
        this.hand = [];
    }
    
    /**
     * 获取特定类型卡牌数量
     */
    countCardsByType(type: CardType): number {
        return this.hand.filter(c => c.type === type).length;
    }
    
    /**
     * 消耗指定数量的特定类型卡牌
     * @returns 是否成功消耗
     */
    consumeCards(type: CardType, count: number): boolean {
        const available = this.countCardsByType(type);
        if (available < count) return false;
        
        let removed = 0;
        this.hand = this.hand.filter(c => {
            if (c.type === type && removed < count) {
                removed++;
                return false;
            }
            return true;
        });
        
        return true;
    }
    
    /**
     * 检查是否有足够的卡牌
     */
    hasCards(type: CardType, count: number): boolean {
        return this.countCardsByType(type) >= count;
    }
    
    // =========================================================================
    // 辅助方法
    // =========================================================================
    
    /**
     * 创建卡牌对象
     */
    private createCard(type: CardType, index: number): BattleCard {
        const cardInfo = this.getCardInfo(type);
        return {
            id: `card_${Date.now()}_${index}`,
            type: type,
            name: cardInfo.name,
            description: cardInfo.description,
            color: cardInfo.color
        };
    }
    
    /**
     * 获取卡牌信息
     */
    private getCardInfo(type: CardType): { name: string; description: string; color: string } {
        switch (type) {
            case CardType.Attack:
                return { name: '攻击', description: '造成伤害', color: '#D32F2F' };
            case CardType.Block:
                return { name: '格挡', description: '获得护盾', color: '#1976D2' };
            case CardType.Heal:
                return { name: '回血', description: '恢复生命', color: '#388E3C' };
        }
    }
    
    /**
     * 获取牌库统计
     */
    getDeckStats(): { attack: number; block: number; heal: number; total: number } {
        return {
            attack: this.config.attackCount,
            block: this.config.blockCount,
            heal: this.config.healCount,
            total: this.deck.length
        };
    }
}
