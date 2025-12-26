/**
 * 战斗特效模块索引
 * 
 * 模块: client/render/battle/effects
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 架构概览:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                     特效子模块                               │
 * ├─────────────────────────────────────────────────────────────┤
 * │  ┌─────────────────┐     ┌─────────────────┐               │
 * │  │ClSkillEffectGen │     │ClVisualEffectMgr│               │
 * │  │  (技能特效)     │     │  (视觉特效)     │               │
 * │  │  - 火焰/冰霜    │     │  - 浮动数字     │               │
 * │  │  - 闪电/毒素    │     │  - 屏幕震动     │               │
 * │  └─────────────────┘     └─────────────────┘               │
 * │                                                             │
 * │  ┌─────────────────┐     ┌─────────────────┐               │
 * │  │ClCombatEffectMgr│     │ClAmbientEffectMgr│              │
 * │  │  (战斗动作)     │     │  (环境特效)      │              │
 * │  │  - 攻击/伤害    │     │  - 漂浮粒子     │               │
 * │  │  - 治疗/抽卡    │     │  - 背景颜色     │               │
 * │  └─────────────────┘     └─────────────────┘               │
 * └─────────────────────────────────────────────────────────────┘
 */

// =============================================================================
// 技能特效
// =============================================================================
export { ClSkillEffectGenerator, CL_SKILL_EFFECT_CONFIG } from './cl_skill_effects';
export type { ClSkillEffectType } from './cl_skill_effects';

// =============================================================================
// 视觉效果 (浮动数字、相机抖动、屏幕闪烁)
// =============================================================================
export { ClVisualEffectManager, CL_VISUAL_EFFECT_CONFIG } from './cl_visual_effects';

// =============================================================================
// 战斗动作特效 (攻击、伤害、治疗、抽卡)
// =============================================================================
export { ClCombatEffectManager, CL_COMBAT_EFFECT_CONFIG } from './cl_combat_effects';

// =============================================================================
// 合成升星特效 (3合1、星级提升、金色光环)
// =============================================================================
export { ClMergeEffectManager, CL_MERGE_EFFECT_CONFIG } from './cl_merge_effects';
export type { ClMergeAnimationOptions } from './cl_merge_effects';

// =============================================================================
// 环境特效 (环境粒子、背景)
// =============================================================================
export { ClAmbientEffectManager, CL_AMBIENT_EFFECT_CONFIG } from './cl_ambient_effects';

// =============================================================================
// 特效配置
// =============================================================================
export {
    AMBIENT_EFFECT_CONFIG,
    ATTACK_EFFECT_CONFIG,
    DAMAGE_EFFECT_CONFIG,
    HEAL_EFFECT_CONFIG,
    DRAW_CARD_EFFECT_CONFIG,
    SKILL_COLOR_CONFIG,
    IMPACT_EFFECT_CONFIG,
    FLOATING_NUMBER_CONFIG,
    CAMERA_EFFECT_CONFIG,
    BATTLE_EFFECTS_CONFIG,
} from './cl_effects_config';

// =============================================================================
// 粒子特效
// =============================================================================
export { ClBattleParticleEffects } from './cl_battle_particle_effects';

// =============================================================================
// 其他特效模块 (保持兼容)
// =============================================================================

// 技能特效工厂
export { ClSkillEffectFactory, SkillEffectType, SKILL_EFFECT_CONFIG } from './cl_skill_effect_factory';

// UI 特效
export { ClBattleUIEffects, UI_EFFECT_CONFIG } from './cl_battle_ui_effects';

// =============================================================================
// 音效管理
// =============================================================================
export { 
    ClBattleSoundManager, 
    CL_BATTLE_SOUND_CONFIG, 
    getGlobalSoundManager 
} from './cl_battle_sounds';
export type { ClBattleSoundType } from './cl_battle_sounds';
