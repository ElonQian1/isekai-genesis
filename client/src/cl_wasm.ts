/**
 * WASM 模块封装
 * 
 * 模块: client
 * 前缀: cl_
 * 文档: 文档/04-client.md
 */

import init, {
    gw_version,
    gw_health_check,
    gw_create_test_battle,
    gw_preview_damage,
    GwPlayer,
    GwCard,
    GwBattle,
} from 'game-wasm';

// WASM 模块是否已初始化
let wasmInitialized = false;

// =============================================================================
// 类型定义 - 与 game-core 类型对应
// =============================================================================

/** 卡牌类型 */
export interface ClWasmCard {
    id: string;
    template_id: string;
    name: string;
    description?: string;
    card_type: 'Attack' | 'Defense' | 'Skill' | 'Special';
    rarity?: 'Common' | 'Rare' | 'Epic' | 'Legendary';
    cost: number;
    base_damage: number;
    base_defense?: number;
    target_type?: 'SingleEnemy' | 'AllEnemies' | 'self' | 'SingleAlly' | 'AllAllies' | 'None';
    effects: ClWasmEffect[];
}

/** 效果类型 */
export interface ClWasmEffect {
    effect_type: string;
    value: number;
    duration?: number;
}

/** 玩家属性 */
export interface ClWasmPlayerStats {
    hp: number;
    max_hp: number;
    attack: number;
    defense: number;
    energy: number;
    max_energy: number;
    action_points: number;
    max_action_points: number;
}

/** 玩家状态 */
export interface ClWasmPlayer {
    id: string;
    name: string;
    stats: ClWasmPlayerStats;
    state: 'Alive' | 'Dead' | 'Stunned' | 'Disconnected';
    hand: ClWasmCard[];
    deck: ClWasmCard[];
    discard: ClWasmCard[];
    battlefield: ClWasmBattlefield;
}

/** 卡池配置 */
export interface ClWasmCardPoolConfig {
    display_size: number;
    acquire_cost: number;
    refresh_cost: number;
    initial_pool_size: number;
}

/** 公共卡池 */
export interface ClWasmCardPool {
    config: ClWasmCardPoolConfig;
    display: ClWasmCard[];
    draw_pile_count: number;
    discard_pile_count: number;
}

/** 战场槽位 */
export interface ClWasmBattlefieldSlot {
    index: number;
    card: ClWasmCard | null;
    can_attack: boolean;
    remaining_hp: number;
}

/** 战场 */
export interface ClWasmBattlefield {
    config: {
        slot_count: number;
        deploy_cost: number;
    };
    slots: ClWasmBattlefieldSlot[];
}

/** 战斗状态 */
export interface ClWasmBattleState {
    id: string;
    turn: number;
    current_player_index: number;
    players: ClWasmPlayer[];
    phase: 'Starting' | 'DrawCard' | 'Playing' | 'EndTurn' | 'Finished';
    turn_time_limit: number;
    winner_id?: string;
    card_pool: ClWasmCardPool;
    action_points_per_turn: number;
}

/** 出牌结果 */
export interface ClWasmPlayCardResult {
    success: boolean;
    error?: string;
    card_used?: ClWasmCard;
    damage_dealt: number;
    effects_triggered: ClWasmEffectResult[];
    target_killed: boolean;
}

/** 效果结果 */
export interface ClWasmEffectResult {
    effect_name: string;
    target_id: string;
    value: number;
    description: string;
}

/** 伤害计算结果 */
export interface ClWasmDamageResult {
    base_damage: number;
    defense_reduction: number;
    final_damage: number;
}

// =============================================================================
// 初始化
// =============================================================================

/**
 * 初始化 WASM 模块
 */
export async function cl_initWasm(): Promise<void> {
    if (wasmInitialized) {
        return;
    }

    console.log('🦀 加载 WASM 模块...');
    await init();
    wasmInitialized = true;
    
    const version = gw_version();
    console.log(`✅ WASM 模块加载成功! 版本: ${version}`);
    
    // 健康检查
    if (!gw_health_check()) {
        throw new Error('WASM 健康检查失败');
    }
}

/**
 * 检查 WASM 是否已初始化
 */
export function cl_isWasmReady(): boolean {
    return wasmInitialized;
}

/**
 * 获取 WASM 版本
 */
export function cl_getWasmVersion(): string {
    if (!wasmInitialized) {
        throw new Error('WASM 未初始化');
    }
    return gw_version();
}

// =============================================================================
// 战斗相关
// =============================================================================

/**
 * 创建测试战斗
 */
export function cl_createTestBattle(): GwBattle {
    if (!wasmInitialized) {
        throw new Error('WASM 未初始化');
    }
    return gw_create_test_battle();
}

/**
 * 创建新战斗
 */
export function cl_createBattle(battleId: string): GwBattle {
    if (!wasmInitialized) {
        throw new Error('WASM 未初始化');
    }
    return new GwBattle(battleId);
}

/**
 * 预览伤害计算
 */
export function cl_previewDamage(
    attackerAttack: number,
    targetDefense: number,
    cardDamage: number
): ClWasmDamageResult {
    if (!wasmInitialized) {
        throw new Error('WASM 未初始化');
    }
    return gw_preview_damage(attackerAttack, targetDefense, cardDamage) as ClWasmDamageResult;
}

// =============================================================================
// 卡牌创建
// =============================================================================

/**
 * 创建攻击卡
 */
export function cl_createAttackCard(id: string, name: string, cost: number, damage: number): GwCard {
    if (!wasmInitialized) {
        throw new Error('WASM 未初始化');
    }
    return GwCard.new_attack(id, name, cost, damage);
}

/**
 * 创建防御卡
 */
export function cl_createDefenseCard(id: string, name: string, cost: number, shield: number): GwCard {
    if (!wasmInitialized) {
        throw new Error('WASM 未初始化');
    }
    return GwCard.new_defense(id, name, cost, shield);
}

// 导出 WASM 类型
export { GwPlayer, GwCard, GwBattle };

// =============================================================================
// Boss 类型定义
// =============================================================================

/** Boss 类型 */
export type ClWasmBossType = 'Mini' | 'Weekly' | 'World';

/** Boss 状态 */
export type ClWasmBossState = 'Idle' | 'Attacking' | 'Charging' | 'Enraged' | 'Stunned' | 'Dead';

/** 技能目标类型 */
export type ClWasmSkillTargetType = 'Single' | 'Organization' | 'All';

/** Boss 技能 */
export interface ClWasmBossSkill {
    id: string;
    name: string;
    description: string;
    damage: number;
    target_type: ClWasmSkillTargetType;
    cooldown: number;
    current_cooldown: number;
    rage_required?: number;
}

/** Boss 数据 */
export interface ClWasmBoss {
    id: string;
    name: string;
    boss_type: ClWasmBossType;
    description: string;
    max_hp: number;
    current_hp: number;
    base_attack: number;
    current_attack: number;
    defense: number;
    max_rage: number;
    current_rage: number;
    rage_per_damage: number;
    skills: ClWasmBossSkill[];
    rage_skill: ClWasmBossSkill;
    state: ClWasmBossState;
    revive_count: number;
    max_revives: number;
    attack_boost_per_revive: number;
    target_organization?: string;
}

// =============================================================================
// 组织类型定义
// =============================================================================

/** 组织类型 */
export type ClWasmOrganizationType = 'IronBlood' | 'ShadowGuild' | 'HolyLight' | 'Wildland';

/** 阵型位置 */
export type ClWasmFormationPosition = 'Front' | 'Back';

/** 组织成员 */
export interface ClWasmOrganizationMember {
    player_id: string;
    player_name: string;
    position: ClWasmFormationPosition;
    is_alive: boolean;
    hp_percent: number;
}

/** 组织队伍 */
export interface ClWasmOrganizationTeam {
    organization: ClWasmOrganizationType;
    members: ClWasmOrganizationMember[];
    is_wiped: boolean;
    total_damage: number;
    blame_count: number;
}

/** 8 人团队阵型 */
export interface ClWasmRaidFormation {
    teams: ClWasmOrganizationTeam[];
    action_order: string[];
    current_action_index: number;
}

