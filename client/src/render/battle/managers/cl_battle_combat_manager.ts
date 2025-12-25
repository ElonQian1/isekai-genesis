/**
 * 战斗逻辑管理器 - 处理技能、伤害、AI
 * 
 * 模块: client/render/battle/managers
 * 前缀: Cl
 * 文档: 文档/09-模块化架构.md
 * 
 * 职责：
 * - 技能执行和伤害计算
 * - 战斗状态管理
 * - AI 敌人逻辑
 */

import { ClBattleCardManager, CardType } from './cl_battle_card_manager';

// =============================================================================
// 类型定义
// =============================================================================

export enum BattlePhase {
    Deploy = 'Deploy',
    PlayerTurn = 'PlayerTurn',
    EnemyTurn = 'EnemyTurn',
    Victory = 'Victory',
    Defeat = 'Defeat'
}

/**
 * 技能定义
 */
export interface SkillDef {
    name: string;
    apCost: number;
    cardRequirement: number;
    damage: number;
}

/**
 * 技能配置
 */
export const SKILL_DEFS: Record<string, SkillDef> = {
    Normal: { name: '普通攻击', apCost: 1, cardRequirement: 1, damage: 1 },
    Small: { name: '小技能', apCost: 1, cardRequirement: 2, damage: 3 },
    Ult: { name: '大招', apCost: 2, cardRequirement: 3, damage: 6 }
};

/**
 * 战斗者状态
 */
export interface CombatantState {
    hp: number;
    maxHp: number;
    shield: number;
    actionPoints: number;
    maxActionPoints: number;
}

/**
 * 战斗结果
 */
export interface CombatResult {
    success: boolean;
    damage?: number;
    heal?: number;
    shield?: number;
    message: string;
}

/**
 * AI 回合结果
 */
export interface AITurnResult {
    attackCount: number;
    totalDamage: number;
}

// =============================================================================
// 战斗逻辑管理器
// =============================================================================

export class ClBattleCombatManager {
    private phase: BattlePhase = BattlePhase.Deploy;
    private player: CombatantState;
    private enemy: CombatantState;
    
    constructor() {
        this.player = this.createDefaultPlayer();
        this.enemy = this.createDefaultEnemy();
    }
    
    // =========================================================================
    // 初始化
    // =========================================================================
    
    /**
     * 重置战斗状态
     */
    reset(): void {
        this.phase = BattlePhase.Deploy;
        this.player = this.createDefaultPlayer();
        this.enemy = this.createDefaultEnemy();
    }
    
    /**
     * 使用自定义值初始化
     */
    init(playerHp: number, enemyHp: number, ap: number): void {
        this.player = {
            hp: playerHp,
            maxHp: playerHp,
            shield: 0,
            actionPoints: ap,
            maxActionPoints: ap
        };
        this.enemy = {
            hp: enemyHp,
            maxHp: enemyHp,
            shield: 0,
            actionPoints: 5,
            maxActionPoints: 5
        };
    }
    
    private createDefaultPlayer(): CombatantState {
        return {
            hp: 10,
            maxHp: 10,
            shield: 0,
            actionPoints: 5,
            maxActionPoints: 5
        };
    }
    
    private createDefaultEnemy(): CombatantState {
        return {
            hp: 6,
            maxHp: 6,
            shield: 0,
            actionPoints: 5,
            maxActionPoints: 5
        };
    }
    
    // =========================================================================
    // 状态访问
    // =========================================================================
    
    getPhase(): BattlePhase {
        return this.phase;
    }
    
    setPhase(phase: BattlePhase): void {
        this.phase = phase;
    }
    
    getPlayerState(): CombatantState {
        return { ...this.player };
    }
    
    getEnemyState(): CombatantState {
        return { ...this.enemy };
    }
    
    isPlayerTurn(): boolean {
        return this.phase === BattlePhase.PlayerTurn;
    }
    
    isBattleOver(): boolean {
        return this.phase === BattlePhase.Victory || this.phase === BattlePhase.Defeat;
    }
    
    // =========================================================================
    // 回合管理
    // =========================================================================
    
    /**
     * 开始玩家回合
     */
    startPlayerTurn(): void {
        this.phase = BattlePhase.PlayerTurn;
        this.player.actionPoints = this.player.maxActionPoints;
    }
    
    /**
     * 开始敌人回合
     */
    startEnemyTurn(): void {
        this.phase = BattlePhase.EnemyTurn;
        this.enemy.actionPoints = this.enemy.maxActionPoints;
    }
    
    /**
     * 消耗行动点
     */
    consumeAP(amount: number): boolean {
        if (this.player.actionPoints < amount) return false;
        this.player.actionPoints -= amount;
        return true;
    }
    
    /**
     * 检查行动点是否足够
     */
    hasEnoughAP(amount: number): boolean {
        return this.player.actionPoints >= amount;
    }
    
    // =========================================================================
    // 技能执行
    // =========================================================================
    
    /**
     * 检查技能是否可用
     */
    canUseSkill(skillId: string, cardManager: ClBattleCardManager): { ok: boolean; reason?: string } {
        const skill = SKILL_DEFS[skillId];
        if (!skill) return { ok: false, reason: '技能不存在' };
        
        if (!this.hasEnoughAP(skill.apCost)) {
            return { ok: false, reason: '行动点不足' };
        }
        
        if (!cardManager.hasCards(CardType.Attack, skill.cardRequirement)) {
            return { ok: false, reason: `需要 ${skill.cardRequirement} 张攻击牌` };
        }
        
        return { ok: true };
    }
    
    /**
     * 使用攻击技能
     */
    useAttackSkill(skillId: string, cardManager: ClBattleCardManager): CombatResult {
        const check = this.canUseSkill(skillId, cardManager);
        if (!check.ok) {
            return { success: false, message: check.reason! };
        }
        
        const skill = SKILL_DEFS[skillId];
        
        // 消耗资源
        this.consumeAP(skill.apCost);
        cardManager.consumeCards(CardType.Attack, skill.cardRequirement);
        
        // 造成伤害
        this.enemy.hp -= skill.damage;
        
        // 检查胜利
        if (this.enemy.hp <= 0) {
            this.enemy.hp = 0;
            this.phase = BattlePhase.Victory;
        }
        
        return {
            success: true,
            damage: skill.damage,
            message: `${skill.name}造成 ${skill.damage} 点伤害！`
        };
    }
    
    /**
     * 使用格挡
     */
    useDefend(cardManager: ClBattleCardManager): CombatResult {
        if (!this.hasEnoughAP(1)) {
            return { success: false, message: '行动点不足' };
        }
        
        if (!cardManager.hasCards(CardType.Block, 1)) {
            return { success: false, message: '需要 1 张格挡牌' };
        }
        
        this.consumeAP(1);
        cardManager.consumeCards(CardType.Block, 1);
        
        const shieldAmount = 2;
        this.player.shield += shieldAmount;
        
        return {
            success: true,
            shield: shieldAmount,
            message: `获得 ${shieldAmount} 点护盾`
        };
    }
    
    /**
     * 使用治疗
     */
    useHeal(cardManager: ClBattleCardManager): CombatResult {
        if (!this.hasEnoughAP(1)) {
            return { success: false, message: '行动点不足' };
        }
        
        if (!cardManager.hasCards(CardType.Heal, 1)) {
            return { success: false, message: '需要 1 张回血牌' };
        }
        
        this.consumeAP(1);
        cardManager.consumeCards(CardType.Heal, 1);
        
        const healAmount = 2;
        const oldHp = this.player.hp;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmount);
        const actualHeal = this.player.hp - oldHp;
        
        return {
            success: true,
            heal: actualHeal,
            message: `恢复 ${actualHeal} 点生命`
        };
    }
    
    // =========================================================================
    // AI 逻辑
    // =========================================================================
    
    /**
     * 执行 AI 回合
     * @returns AI 本回合的行动结果
     */
    executeAITurn(): AITurnResult {
        let aiAP = 5;
        let aiAttackCards = 0;
        
        // 1. 模拟抽牌阶段 (40% 概率抽到攻击牌)
        for (let i = 0; i < 5; i++) {
            if (aiAP > 0 && Math.random() < 0.4) {
                aiAP--;
                aiAttackCards++;
            }
        }
        
        // 2. 计算攻击次数
        let attackCount = 0;
        while (aiAP >= 1 && aiAttackCards >= 1) {
            aiAP--;
            aiAttackCards--;
            attackCount++;
        }
        
        return {
            attackCount,
            totalDamage: attackCount // 每次攻击 1 点伤害
        };
    }
    
    /**
     * 对玩家造成伤害（考虑护盾）
     */
    damagePlayer(rawDamage: number): { actualDamage: number; shieldBroken: boolean; blocked: boolean } {
        let actualDamage = rawDamage;
        let shieldBroken = false;
        let blocked = false;
        
        if (this.player.shield > 0) {
            if (this.player.shield >= actualDamage) {
                this.player.shield -= actualDamage;
                blocked = true;
                actualDamage = 0;
            } else {
                actualDamage -= this.player.shield;
                this.player.shield = 0;
                shieldBroken = true;
            }
        }
        
        if (actualDamage > 0) {
            this.player.hp -= actualDamage;
        }
        
        // 检查失败
        if (this.player.hp <= 0) {
            this.player.hp = 0;
            this.phase = BattlePhase.Defeat;
        }
        
        return { actualDamage, shieldBroken, blocked };
    }
}
