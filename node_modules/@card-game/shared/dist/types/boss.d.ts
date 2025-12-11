/**
 * BOSS系统类型定义
 */
import { Organization } from './enums';
export declare enum BossType {
    MINI = "mini",// 小型BOSS（组队副本）
    WEEKLY = "weekly",// 周本BOSS（8人团队）
    WORLD = "world"
}
export declare enum BossState {
    IDLE = "idle",// 待机
    ATTACKING = "attacking",// 攻击中
    CHARGING = "charging",// 蓄力中
    ENRAGED = "enraged",// 狂怒状态
    STUNNED = "stunned",// 眩晕
    DEAD = "dead"
}
export interface BossSkill {
    id: string;
    name: string;
    description: string;
    damage: number;
    target: 'single' | 'organization' | 'all';
    cooldown: number;
    currentCooldown: number;
    rageRequired?: number;
}
export interface Boss {
    id: string;
    name: string;
    type: BossType;
    description: string;
    maxHealth: number;
    currentHealth: number;
    baseAttack: number;
    currentAttack: number;
    defense: number;
    maxRage: number;
    currentRage: number;
    ragePerDamage: number;
    skills: BossSkill[];
    rageSkill: BossSkill;
    state: BossState;
    reviveCount: number;
    attackBoostPerRevive: number;
    targetOrganization?: Organization;
    drops: BossDrop[];
    imageUrl?: string;
}
export interface BossDrop {
    itemId: string;
    itemName: string;
    dropRate: number;
    minQuantity: number;
    maxQuantity: number;
}
export interface BattleRound {
    roundNumber: number;
    phase: 'player' | 'boss';
    playerActions: PlayerAction[];
    bossAction?: BossAction;
    bossHealthAfter: number;
    bossRageAfter: number;
    aliveOrganizations: Organization[];
}
export interface PlayerAction {
    playerId: string;
    playerName: string;
    organization: Organization;
    cardId: string;
    cardName: string;
    damage: number;
    isCritical: boolean;
    targetType: 'boss' | 'self' | 'ally' | 'organization';
    targetId?: string;
    effects: string[];
}
export interface BossAction {
    skillId: string;
    skillName: string;
    targetType: 'single' | 'organization' | 'all';
    targetOrganization?: Organization;
    targetPlayerId?: string;
    damage: number;
    isRageSkill: boolean;
    effects: string[];
}
export declare const MINI_BOSSES: Partial<Boss>[];
export declare const WEEKLY_BOSSES: Partial<Boss>[];
export declare function getBossById(bossId: string): Partial<Boss> | undefined;
export declare function createBossInstance(bossTemplate: Partial<Boss>): Boss;
