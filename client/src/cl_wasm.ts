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
    gw_generate_battle_terrain,
    gw_get_terrain_modifier,
    gw_migrate_save,
    gw_validate_normal_summon,
    gw_validate_tribute_summon,
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

// =============================================================================
// 战斗地形系统
// =============================================================================

/** 地形类型 */
export type ClWasmTerrainType = 'plain' | 'volcano' | 'glacier' | 'ocean' | 'swamp' | 'shadow' | 'holy' | 'forest' | 'mountain';

/** 怪兽属性 */
export type ClWasmMonsterAttribute = 'none' | 'fire' | 'water' | 'wind' | 'earth' | 'light' | 'dark';

/** 战斗结果 */
export interface ClWasmBattleResult {
    attacker_atk: number;
    defender_def: number;
    damage: number;
    defender_destroyed: boolean;
    counter_damage: number;
    attacker_destroyed: boolean;
}

/** 地形修正 */
export interface ClWasmTerrainModifier {
    atk_percent: number;
    def_percent: number;
    hp_per_turn_percent: number;
    dodge_bonus: number;
    damage_taken_percent: number;
    healing_bonus_percent: number;
}

/** 战斗地形生成结果 */
export interface ClWasmBattleTerrainResult {
    player_terrain: string;
    enemy_terrain: string;
    player_terrain_name: string;
    enemy_terrain_name: string;
    player_color: number[];
    enemy_color: number[];
}

/**
 * 计算怪兽战斗伤害
 * 使用纯 TypeScript 实现，与 Rust gc_monster 逻辑一致
 */
export function cl_calculateBattleDamage(
    attackerAtk: number,
    attackerHp: number,
    attackerAttr: ClWasmMonsterAttribute,
    attackerTerrain: ClWasmTerrainType,
    defenderDef: number,
    defenderHp: number,
    defenderAttr: ClWasmMonsterAttribute,
    defenderTerrain: ClWasmTerrainType
): ClWasmBattleResult {
    // 获取地形修正
    const attackerMod = cl_getTerrainModifier(attackerTerrain, attackerAttr);
    const defenderMod = cl_getTerrainModifier(defenderTerrain, defenderAttr);
    
    // 应用地形加成
    const atkBonus = attackerMod?.atk_percent ?? 0;
    const defBonus = defenderMod?.def_percent ?? 0;
    
    const effectiveAtk = Math.floor(attackerAtk * (100 + atkBonus) / 100);
    const effectiveDef = Math.floor(defenderDef * (100 + defBonus) / 100);
    
    // 计算伤害
    let damage = 0;
    let counterDamage = 0;
    
    if (effectiveAtk > effectiveDef) {
        damage = effectiveAtk - effectiveDef;
    } else if (effectiveAtk < effectiveDef) {
        counterDamage = effectiveDef - effectiveAtk;
    }
    
    return {
        attacker_atk: effectiveAtk,
        defender_def: effectiveDef,
        damage,
        defender_destroyed: damage >= defenderHp,
        counter_damage: counterDamage,
        attacker_destroyed: counterDamage >= attackerHp
    };
}

/**
 * 计算直接攻击伤害
 * 使用纯 TypeScript 实现，应用地形加成
 */
export function cl_calculateDirectAttack(
    attackerAtk: number,
    attackerAttr: ClWasmMonsterAttribute,
    terrain: ClWasmTerrainType
): number {
    const mod = cl_getTerrainModifier(terrain, attackerAttr);
    const atkBonus = mod?.atk_percent ?? 0;
    return Math.floor(attackerAtk * (100 + atkBonus) / 100);
}

/**
 * 生成战斗地形
 * @param worldTerrain 世界地形类型（如 "Grassland", "Forest" 等）
 * @param enemyType 敌人类型
 * @param seed 随机种子
 */
export function cl_generateBattleTerrain(
    worldTerrain: string,
    enemyType: string,
    seed: number
): ClWasmBattleTerrainResult | null {
    if (!wasmInitialized) {
        return null;
    }
    try {
        const result = gw_generate_battle_terrain(worldTerrain, enemyType, seed);
        return result as ClWasmBattleTerrainResult;
    } catch (e) {
        console.error('地形生成失败:', e);
        return null;
    }
}

/**
 * 获取地形修正
 */
export function cl_getTerrainModifier(
    terrain: ClWasmTerrainType,
    monsterAttr: ClWasmMonsterAttribute
): ClWasmTerrainModifier | null {
    if (!wasmInitialized) {
        return null;
    }
    try {
        const result = gw_get_terrain_modifier(terrain, monsterAttr);
        return result as ClWasmTerrainModifier;
    } catch (e) {
        console.error('地形修正获取失败:', e);
        return null;
    }
}

// =============================================================================
// 存档迁移
// =============================================================================

/**
 * 存档迁移结果
 */
export interface ClWasmMigrationResult {
    success: boolean;
    data?: string;
    error?: string;
}

/**
 * 迁移存档数据到当前版本
 * @param saveJson - 存档 JSON 字符串
 * @returns 迁移结果 { success, data?, error? }
 */
export function cl_migrateSave(saveJson: string): ClWasmMigrationResult {
    if (!wasmInitialized) {
        return { success: false, error: 'WASM 模块未初始化' };
    }
    try {
        const migratedJson = gw_migrate_save(saveJson);
        console.log('✅ 存档迁移成功');
        return { success: true, data: migratedJson };
    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.error('❌ 存档迁移失败:', errorMsg);
        return { success: false, error: errorMsg };
    }
}

// =============================================================================
// 召唤验证
// =============================================================================

/**
 * 普通召唤验证结果
 */
export interface ClWasmSummonValidation {
    valid: boolean;
    error?: string;
}

/**
 * 验证普通召唤 (4星及以下)
 * @param level - 怪兽等级 (1-12)
 * @param normalSummonUsed - 本回合是否已使用普通召唤
 * @returns 验证结果
 */
export function cl_validateNormalSummon(level: number, normalSummonUsed: boolean): ClWasmSummonValidation {
    if (!wasmInitialized) {
        // WASM 未初始化时的前端兜底验证
        if (normalSummonUsed) {
            return { valid: false, error: '本回合已进行过普通召唤' };
        }
        if (level > 4) {
            return { valid: false, error: `${level}星怪兽需要祭品召唤` };
        }
        return { valid: true };
    }
    try {
        const result = gw_validate_normal_summon(level, normalSummonUsed);
        return result as ClWasmSummonValidation;
    } catch (e) {
        console.error('普通召唤验证失败:', e);
        return { valid: false, error: '验证失败' };
    }
}

/**
 * 验证祭品召唤 (5星及以上)
 * @param level - 怪兽等级 (5-12)
 * @param sacrificeSlots - 祭品怪兽槽位索引数组
 * @param occupiedSlots - 当前场上有怪兽的槽位索引数组
 * @returns 验证结果
 */
export function cl_validateTributeSummon(
    level: number,
    sacrificeSlots: number[],
    occupiedSlots: number[]
): ClWasmSummonValidation {
    if (!wasmInitialized) {
        // WASM 未初始化时的前端兜底验证
        const requiredTributes = level >= 7 ? 2 : 1;
        if (sacrificeSlots.length < requiredTributes) {
            return { valid: false, error: `${level}星怪兽需要 ${requiredTributes} 个祭品` };
        }
        // 检查祭品是否在场上
        for (const slot of sacrificeSlots) {
            if (!occupiedSlots.includes(slot)) {
                return { valid: false, error: `槽位 ${slot} 没有怪兽可以作为祭品` };
            }
        }
        return { valid: true };
    }
    try {
        const result = gw_validate_tribute_summon(
            level,
            new Uint8Array(sacrificeSlots),
            new Uint8Array(occupiedSlots)
        );
        return result as ClWasmSummonValidation;
    } catch (e) {
        console.error('祭品召唤验证失败:', e);
        return { valid: false, error: '验证失败' };
    }
}
