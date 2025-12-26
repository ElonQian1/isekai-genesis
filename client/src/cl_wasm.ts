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
    // 酒馆模式
    gw_get_board_slots,
    gw_get_refresh_cost,
    gw_get_xp_cost,
    gw_get_shop_info,
    gw_refresh_shop,
    gw_toggle_freeze,
    gw_buy_monster,
    gw_sell_monster,
    gw_buy_xp,
    gw_collect_income,
    gw_get_economy_info,
    gw_find_mergeable,
    gw_auto_merge_once,
    gw_auto_merge_all,
    gw_deploy_from_bench,
    gw_recall_to_bench,
    gw_swap_positions,
    gw_game_mode_name,
    gw_tavern_phase_name,
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
// 酒馆模式类型定义
// =============================================================================

/** 经济信息 */
export interface ClTavernEconomy {
    gold: number;
    level: number;
    xp: number;
    xp_to_next: number;
    win_streak: number;
    lose_streak: number;
}

/** 酒馆怪兽 */
export interface ClTavernMonster {
    id: string;
    name: string;
    template_id: string;
    star: number;
    golden_level: number;
    atk: number;
    def: number;
    hp: number;
    buy_price: number;
    sell_price: number;
}

/** 商店槽位 */
export interface ClTavernShopSlot {
    index: number;
    monster: ClTavernMonster | null;
    frozen: boolean;
}

/** 可合并组 */
export interface ClMergeableGroup {
    template_id: string;
    star: number;
    golden_level: number;
    monster_indices: Array<{ location: number; index: number }>;
}

/** 操作结果 */
export interface ClOperationResult {
    success: boolean;
    error?: string;
    data?: string;
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

// =============================================================================
// 酒馆模式 - 常量
// =============================================================================

/** 获取棋盘槽位数 */
export function cl_getBoardSlots(level: number): number {
    if (!wasmInitialized) {
        // 兜底: Lv1-2=3, Lv3-4=4, Lv5+=5
        if (level <= 2) return 3;
        if (level <= 4) return 4;
        return 5;
    }
    return gw_get_board_slots(level);
}

/** 获取刷新商店费用 */
export function cl_getRefreshCost(): number {
    if (!wasmInitialized) return 2;
    return gw_get_refresh_cost();
}

/** 获取购买经验费用 */
export function cl_getXpCost(): number {
    if (!wasmInitialized) return 4;
    return gw_get_xp_cost();
}

// =============================================================================
// 酒馆模式 - 商店操作
// =============================================================================

/** 获取商店信息 */
export function cl_getShopInfo(shopJson: string): ClTavernShopSlot[] {
    if (!wasmInitialized) return [];
    try {
        return gw_get_shop_info(shopJson) as ClTavernShopSlot[];
    } catch (e) {
        console.error('获取商店信息失败:', e);
        return [];
    }
}

/** 刷新商店 */
export function cl_refreshShop(
    economyJson: string,
    shopJson: string,
    poolJson: string,
    randomRolls: number[]
): ClOperationResult {
    if (!wasmInitialized) {
        return { success: false, error: 'WASM 未初始化' };
    }
    try {
        return gw_refresh_shop(economyJson, shopJson, poolJson, JSON.stringify(randomRolls)) as ClOperationResult;
    } catch (e) {
        console.error('刷新商店失败:', e);
        return { success: false, error: String(e) };
    }
}

/** 冻结/解冻槽位 */
export function cl_toggleFreeze(shopJson: string, slotIndex: number): ClOperationResult {
    if (!wasmInitialized) {
        return { success: false, error: 'WASM 未初始化' };
    }
    try {
        return gw_toggle_freeze(shopJson, slotIndex) as ClOperationResult;
    } catch (e) {
        console.error('冻结槽位失败:', e);
        return { success: false, error: String(e) };
    }
}

// =============================================================================
// 酒馆模式 - 交易
// =============================================================================

/** 购买怪兽 */
export function cl_buyMonster(
    economyJson: string,
    shopJson: string,
    slotIndex: number
): ClOperationResult {
    if (!wasmInitialized) {
        return { success: false, error: 'WASM 未初始化' };
    }
    try {
        return gw_buy_monster(economyJson, shopJson, slotIndex) as ClOperationResult;
    } catch (e) {
        console.error('购买怪兽失败:', e);
        return { success: false, error: String(e) };
    }
}

/** 出售怪兽 */
export function cl_sellMonster(economyJson: string, monsterJson: string): ClOperationResult {
    if (!wasmInitialized) {
        return { success: false, error: 'WASM 未初始化' };
    }
    try {
        return gw_sell_monster(economyJson, monsterJson) as ClOperationResult;
    } catch (e) {
        console.error('出售怪兽失败:', e);
        return { success: false, error: String(e) };
    }
}

// =============================================================================
// 酒馆模式 - 经济
// =============================================================================

/** 购买经验 */
export function cl_buyXp(economyJson: string): ClOperationResult {
    if (!wasmInitialized) {
        return { success: false, error: 'WASM 未初始化' };
    }
    try {
        return gw_buy_xp(economyJson) as ClOperationResult;
    } catch (e) {
        console.error('购买经验失败:', e);
        return { success: false, error: String(e) };
    }
}

/** 收取回合收入 */
export function cl_collectIncome(economyJson: string): ClOperationResult {
    if (!wasmInitialized) {
        return { success: false, error: 'WASM 未初始化' };
    }
    try {
        return gw_collect_income(economyJson) as ClOperationResult;
    } catch (e) {
        console.error('收取收入失败:', e);
        return { success: false, error: String(e) };
    }
}

/** 获取经济信息 */
export function cl_getEconomyInfo(economyJson: string): ClTavernEconomy | null {
    if (!wasmInitialized) return null;
    try {
        return gw_get_economy_info(economyJson) as ClTavernEconomy;
    } catch (e) {
        console.error('获取经济信息失败:', e);
        return null;
    }
}

// =============================================================================
// 酒馆模式 - 合并
// =============================================================================

/** 查找可合并组 */
export function cl_findMergeable(boardJson: string, benchJson: string): ClMergeableGroup[] {
    if (!wasmInitialized) return [];
    try {
        return gw_find_mergeable(boardJson, benchJson) as ClMergeableGroup[];
    } catch (e) {
        console.error('查找可合并组失败:', e);
        return [];
    }
}

/** 自动合并一次 */
export function cl_autoMergeOnce(boardJson: string, benchJson: string): ClOperationResult {
    if (!wasmInitialized) {
        return { success: false, error: 'WASM 未初始化' };
    }
    try {
        return gw_auto_merge_once(boardJson, benchJson) as ClOperationResult;
    } catch (e) {
        console.error('自动合并失败:', e);
        return { success: false, error: String(e) };
    }
}

/** 全部自动合并 */
export function cl_autoMergeAll(boardJson: string, benchJson: string): ClOperationResult {
    if (!wasmInitialized) {
        return { success: false, error: 'WASM 未初始化' };
    }
    try {
        return gw_auto_merge_all(boardJson, benchJson) as ClOperationResult;
    } catch (e) {
        console.error('全部自动合并失败:', e);
        return { success: false, error: String(e) };
    }
}

// =============================================================================
// 酒馆模式 - 部署
// =============================================================================

/** 从手牌区部署到战场 */
export function cl_deployFromBench(
    arenaJson: string,
    benchJson: string,
    monsterId: string,
    slot: number
): ClOperationResult {
    if (!wasmInitialized) {
        return { success: false, error: 'WASM 未初始化' };
    }
    try {
        return gw_deploy_from_bench(arenaJson, benchJson, monsterId, slot) as ClOperationResult;
    } catch (e) {
        console.error('部署怪兽失败:', e);
        return { success: false, error: String(e) };
    }
}

/** 从战场召回到手牌区 */
export function cl_recallToBench(
    arenaJson: string,
    benchJson: string,
    slot: number
): ClOperationResult {
    if (!wasmInitialized) {
        return { success: false, error: 'WASM 未初始化' };
    }
    try {
        return gw_recall_to_bench(arenaJson, benchJson, slot) as ClOperationResult;
    } catch (e) {
        console.error('召回怪兽失败:', e);
        return { success: false, error: String(e) };
    }
}

/** 战场内换位 */
export function cl_swapPositions(arenaJson: string, slotA: number, slotB: number): ClOperationResult {
    if (!wasmInitialized) {
        return { success: false, error: 'WASM 未初始化' };
    }
    try {
        return gw_swap_positions(arenaJson, slotA, slotB) as ClOperationResult;
    } catch (e) {
        console.error('换位失败:', e);
        return { success: false, error: String(e) };
    }
}

// =============================================================================
// 酒馆模式 - 模式信息
// =============================================================================

/** 获取游戏模式名称 */
export function cl_getGameModeName(mode: number): string {
    if (!wasmInitialized) {
        return mode === 0 ? 'yugioh' : mode === 1 ? 'tavern' : 'unknown';
    }
    return gw_game_mode_name(mode);
}

/** 获取酒馆阶段名称 */
export function cl_getTavernPhaseName(phase: number): string {
    if (!wasmInitialized) {
        const phases = ['shopping', 'deploy', 'combat', 'result'];
        return phases[phase] ?? 'unknown';
    }
    return gw_tavern_phase_name(phase);
}
