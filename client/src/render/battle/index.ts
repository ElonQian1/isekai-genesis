/**
 * 战斗渲染模块导出
 * 
 * 模块: client/render/battle
 * 职责: 统一导出所有战斗场景渲染相关组件
 * 
 * 架构概览:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                     战斗渲染模块                             │
 * ├─────────────────────────────────────────────────────────────┤
 * │  ┌─────────────────┐     ┌─────────────────┐               │
 * │  │ ClBattleLighting│     │  ClBattleField  │               │
 * │  │   (光照系统)    │     │   (战场渲染)    │               │
 * │  └─────────────────┘     └─────────────────┘               │
 * │                                                             │
 * │  ┌─────────────────┐     ┌─────────────────┐               │
 * │  │ ClBattleEffects │     │ ClBattleUIManager│               │
 * │  │   (粒子特效)    │     │   (UI管理器)     │               │
 * │  └─────────────────┘     └─────────────────┘               │
 * │                                                             │
 * │  effects/ 子模块:                                           │
 * │  ├── ClSkillEffectGenerator  (技能特效)                    │
 * │  ├── ClVisualEffectManager   (视觉特效)                    │
 * │  └── ClBattleUIEffects       (UI特效)                      │
 * └─────────────────────────────────────────────────────────────┘
 */

// =============================================================================
// 类型和配置
// =============================================================================
export { CL_BATTLE_CONFIG, ClBattleZone } from './cl_battle_types';

// =============================================================================
// 核心组件
// =============================================================================

// 光照系统
export { ClBattleLighting, CL_BATTLE_LIGHTING_CONFIG } from './cl_battle_lighting';

// 战场渲染
export { ClBattleField } from './cl_battle_field';

// 粒子特效 (主模块)
export { ClBattleEffects, CL_BATTLE_EFFECTS_CONFIG } from './cl_battle_effects';

// =============================================================================
// 特效子模块 (推荐使用这些更细粒度的模块)
// =============================================================================
export * from './effects';

// =============================================================================
// 新版战斗沙盘系统
// =============================================================================

// 战场沙盘渲染 (南北双方 + 地形)
export { ClBattleArenaRenderer, type TerrainType, type BattleArenaConfig } from './cl_battle_arena';

// 怪兽渲染器 (占位几何体 + 名称)
export { ClMonsterMesh, type MonsterAttribute, type MonsterDisplayData, type MonsterPosition } from './cl_monster_renderer';

// 设备检测与相机
export { 
    detectDeviceType, 
    detectOrientation, 
    createBattleCamera, 
    onOrientationChange,
    type DeviceType,
    type Orientation,
    type BattleCameraConfig 
} from './cl_device_camera';

// 新版战斗沙盘场景 (完整封装)
export { ClBattleArenaScene, type ArenaBattleConfig, type TurnPhase, type TurnState } from './cl_battle_arena_scene';

// 祭品召唤系统
export { ClTributeSystem, type TributeSummonTarget, type TributeState } from './cl_tribute_system';

// 地形粒子特效
export { ClTerrainEffects, type PerformanceLevel } from './cl_terrain_effects';

// 怪兽模型加载器
export { ClMonsterModelLoader, type MonsterModelConfig, type ModelLoadResult } from './cl_monster_loader';
