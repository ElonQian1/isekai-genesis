/**
 * 大世界场景模块导出
 * 
 * 模块: client/render/world
 * 职责: 统一导出大世界场景渲染相关的所有组件
 * 
 * 架构概览:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    ClWorldSceneModular                       │
 * │              (主场景协调器 - 组合所有子系统)                   │
 * ├─────────────────────────────────────────────────────────────┤
 * │  资源管理层                                                  │
 * │  ├── ClAssetManager      模型/纹理加载与缓存                 │
 * │  ├── ClMaterialLibrary   PBR材质创建与管理                   │
 * │  ├── ClResourceQueue     异步预加载队列                      │
 * │  └── ClTextureStreaming  纹理流式加载                        │
 * ├─────────────────────────────────────────────────────────────┤
 * │  场景内容层                                                  │
 * │  ├── ClTerrainManager    地形管理                            │
 * │  ├── ClTreeSystem        树木系统                            │
 * │  ├── ClBambooSystem      竹子系统                            │
 * │  ├── ClStructureSystem   建筑结构                            │
 * │  └── ClLevelLoader       JSON数据驱动关卡加载                │
 * ├─────────────────────────────────────────────────────────────┤
 * │  实体系统层                                                  │
 * │  ├── ClPlayerEntity      玩家实体                            │
 * │  ├── ClEnemySystem       敌人系统                            │
 * │  └── ClInteractionSystem 交互系统                            │
 * ├─────────────────────────────────────────────────────────────┤
 * │  渲染效果层                                                  │
 * │  ├── ClLightingSystem    光照系统                            │
 * │  ├── ClPostProcessing    后处理效果                          │
 * │  └── ClParticleSystem    粒子系统                            │
 * ├─────────────────────────────────────────────────────────────┤
 * │  性能优化层                                                  │
 * │  ├── ClCullingSystem     视锥剔除                            │
 * │  ├── ClOctreeSystem      八叉树空间分割                      │
 * │  └── ClLODManager        LOD级别管理                         │
 * ├─────────────────────────────────────────────────────────────┤
 * │  相机与UI层                                                  │
 * │  ├── ClCameraController  相机控制                            │
 * │  ├── ClEditorUI          编辑器UI                            │
 * │  └── ClFeedbackSystem    反馈系统                            │
 * └─────────────────────────────────────────────────────────────┘
 */

// =============================================================================
// 配置
// =============================================================================

export { 
    CL_WORLD_CONFIG, 
    CL_LOD_CONFIG, 
    CL_PERFORMANCE_CONFIG,
    CAMERA_CONFIG,
} from './cl_world_config';

// =============================================================================
// 资源管理
// =============================================================================

export { ClAssetManager } from './cl_asset_manager';
export { ClMaterialLibrary } from './cl_material_library';

// 核心资源模块
export * from './core';

// =============================================================================
// 性能优化
// =============================================================================

export * from './optimization';

// =============================================================================
// 场景内容
// =============================================================================

// 地形
export { ClTerrainManager } from './terrain/cl_terrain_manager';

// 植被
export { ClTreeSystem } from './vegetation/cl_tree_system';
export { ClBambooSystem } from './vegetation/cl_bamboo_system';

// 建筑
export { ClStructureSystem } from './structures/cl_structure_system';

// =============================================================================
// 实体系统
// =============================================================================

export { ClPlayerEntity } from './entities/cl_player_entity';
export { ClEnemySystem } from './entities/cl_enemy_system';

// =============================================================================
// 交互系统
// =============================================================================

export { ClInteractionSystem } from './interaction/cl_interaction_system';

// =============================================================================
// 渲染效果
// =============================================================================

export { ClLightingSystem } from './lighting/cl_lighting_system';
export { ClPostProcessing } from './effects/cl_post_processing';
export { ClParticleSystem } from './effects/cl_particle_system';

// =============================================================================
// 相机
// =============================================================================

export { ClCameraController } from './camera/cl_camera_controller';

// =============================================================================
// UI
// =============================================================================

export { ClEditorUI } from './ui/index';
export { ClFeedbackSystem } from './ui/cl_feedback_system';
export { ClLoadingUI } from './ui/cl_loading_ui';
export type { ClLoadingUIConfig } from './ui/cl_loading_ui';

// =============================================================================
// 游戏系统
// =============================================================================

// 角色状态
export { ClCharacterStats } from './gameplay/stats/cl_character_stats';
export { ClStatusUI } from './gameplay/stats/cl_status_ui';

// 背包系统
export { ClInventorySystem } from './gameplay/inventory/cl_inventory_system';
export { ClInventoryUI } from './gameplay/inventory/cl_inventory_ui';

// 玩家控制
export { ClPlayerController } from './gameplay/cl_player_controller';

// =============================================================================
// 主场景
// =============================================================================

export { ClWorldSceneModular } from './cl_world_scene_modular';
