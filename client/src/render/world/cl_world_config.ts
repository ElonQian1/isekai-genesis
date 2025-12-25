/**
 * 大世界配置常量
 * 
 * 模块: client/render/world
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 集中管理所有世界场景的配置参数
 */

import { Color3 } from '@babylonjs/core';

// =============================================================================
// 世界场景配置
// =============================================================================

export const CL_WORLD_CONFIG = {
    // 场地尺寸 - 适合俯视图
    WORLD_SIZE: 120,
    TILE_SIZE: 4,
    
    // 地形高度
    MAX_HEIGHT: 8,
    MOUNTAIN_HEIGHT: 20,
    WATER_LEVEL: 0,
    
    // 雾效 - 暗黑风格
    FOG_DENSITY: 0.025,
    FOG_COLOR: new Color3(0.05, 0.05, 0.08),
    
    // 环境光 - 幽暗
    AMBIENT_COLOR: new Color3(0.1, 0.1, 0.15),
    SUN_COLOR: new Color3(0.8, 0.7, 0.6),
    
    // 颜色主题 - 暗黑破坏神/神界原罪风格
    GRASS_COLOR: new Color3(0.15, 0.18, 0.15),
    MOUNTAIN_COLOR: new Color3(0.15, 0.15, 0.18),
    WATER_COLOR: new Color3(0.05, 0.1, 0.15),
    WOOD_COLOR: new Color3(0.2, 0.15, 0.1),
    ROOF_COLOR: new Color3(0.25, 0.1, 0.1),
    BAMBOO_COLOR: new Color3(0.2, 0.3, 0.2),
    GLOW_COLOR: new Color3(1.0, 0.6, 0.2),
};

// =============================================================================
// LOD 配置
// =============================================================================

export const CL_LOD_CONFIG = {
    // 树木LOD距离
    TREE_LOD_HIGH: 30,      // 30米内高精度
    TREE_LOD_MID: 80,       // 80米内中精度
    TREE_LOD_LOW: 150,      // 150米内低精度
    
    // 竹子LOD距离
    BAMBOO_LOD_HIGH: 40,
    BAMBOO_LOD_LOW: 100,
    
    // 建筑LOD距离
    BUILDING_LOD_HIGH: 50,
    BUILDING_LOD_MID: 120,
    BUILDING_LOD_LOW: 200,
};

// =============================================================================
// 性能配置
// =============================================================================

export const CL_PERFORMANCE_CONFIG = {
    // 实例化数量
    TREE_COUNT: 300,
    BAMBOO_COUNT: 400,
    ROCK_COUNT: 50,
    
    // 视锥剔除
    CULLING_ENABLED: true,
    CULLING_INTERVAL: 100,  // 100ms更新一次
    
    // 阴影质量
    SHADOW_MAP_SIZE: 2048,
    SHADOW_BIAS: 0.00001,
    
    // 后处理
    SSAO_ENABLED: true,
    BLOOM_ENABLED: true,
    DOF_ENABLED: true,
};

// =============================================================================
// 相机配置
// =============================================================================

import { Vector3 } from '@babylonjs/core';

export const CAMERA_CONFIG = {
    // 初始位置（俯视图角度）
    ALPHA: 45,              // 水平旋转角度
    BETA: 50,               // 垂直角度（60° 类似神界原罪2）
    RADIUS: 40,             // 距离目标的距离
    TARGET: new Vector3(0, 0, 0),
    
    // 缩放限制
    MIN_RADIUS: 20,
    MAX_RADIUS: 80,
    
    // 移动速度
    MOVE_SPEED: 0.5,
    ZOOM_SPEED: 5,
};

// =============================================================================
// 导出
// =============================================================================

export default CL_WORLD_CONFIG;
