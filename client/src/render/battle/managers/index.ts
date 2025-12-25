/**
 * 战斗管理器模块导出
 * 
 * 模块: client/render/battle/managers
 * 前缀: Cl
 */

// 卡牌管理
export { 
    ClBattleCardManager,
    CardType,
    DEFAULT_CARD_CONFIG
} from './cl_battle_card_manager';

export type {
    BattleCard,
    CardConfig
} from './cl_battle_card_manager';

// 战斗逻辑管理
export {
    ClBattleCombatManager,
    BattlePhase,
    SKILL_DEFS
} from './cl_battle_combat_manager';

export type {
    SkillDef,
    CombatantState,
    CombatResult,
    AITurnResult
} from './cl_battle_combat_manager';
