/**
 * 敌人系统类型定义
 * 
 * 模块: client/render/world/entities
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责：
 * - 敌人类型枚举
 * - 敌人数据接口
 * - 敌人配置常量
 */

import { Vector3, Mesh, TransformNode } from '@babylonjs/core';
import { ClEnemyAI } from './cl_enemy_ai';

// =============================================================================
// 敌人类型枚举
// =============================================================================

/**
 * 敌人类型
 */
export enum EnemyType {
    NORMAL = 'normal',      // 普通怪
    ELITE = 'elite',        // 精英怪
    BOSS = 'boss',          // BOSS
}

// =============================================================================
// 敌人数据接口
// =============================================================================

/**
 * 敌人基础数据 - 用于配置和序列化
 */
export interface EnemyData {
    id: string;
    type: EnemyType;
    name: string;
    level: number;
    position: Vector3;
    patrolRadius?: number;  // 巡逻半径
}

/**
 * 敌人运行时实体 - 包含渲染和 AI 组件
 */
export interface EnemyEntity {
    data: EnemyData;
    mesh: Mesh;
    root: TransformNode;
    indicator: Mesh;        // 头顶指示器
    patrolCenter: Vector3;
    isAggro: boolean;       // 是否被激怒
    ai: ClEnemyAI;          // AI 控制器
}

// =============================================================================
// 敌人配置常量
// =============================================================================

/**
 * 敌人尺寸配置
 */
export const ENEMY_SIZE_CONFIG = {
    [EnemyType.NORMAL]: {
        height: 1.8,
        radius: 0.4,
        indicatorSize: 0.3,
    },
    [EnemyType.ELITE]: {
        height: 2.2,
        radius: 0.5,
        indicatorSize: 0.4,
    },
    [EnemyType.BOSS]: {
        height: 3.0,
        radius: 0.7,
        indicatorSize: 0.5,
    },
};

/**
 * 敌人颜色配置
 */
export const ENEMY_COLOR_CONFIG = {
    [EnemyType.NORMAL]: {
        body: { r: 0.6, g: 0.2, b: 0.2 },       // 暗红色
        indicator: { r: 0.8, g: 0.3, b: 0.3 },   // 红色指示器
        glow: { r: 1.0, g: 0.5, b: 0.5 },        // 发光
    },
    [EnemyType.ELITE]: {
        body: { r: 0.5, g: 0.2, b: 0.6 },       // 紫色
        indicator: { r: 0.7, g: 0.3, b: 0.8 },   // 紫色指示器
        glow: { r: 0.8, g: 0.4, b: 1.0 },        // 发光
    },
    [EnemyType.BOSS]: {
        body: { r: 0.7, g: 0.5, b: 0.1 },       // 金色
        indicator: { r: 1.0, g: 0.8, b: 0.2 },   // 金色指示器
        glow: { r: 1.0, g: 0.9, b: 0.4 },        // 发光
    },
};

/**
 * 敌人行为配置
 */
export const ENEMY_BEHAVIOR_CONFIG = {
    // 巡逻配置
    patrol: {
        defaultRadius: 5,       // 默认巡逻半径
        minWaitTime: 2000,      // 最小等待时间 (ms)
        maxWaitTime: 5000,      // 最大等待时间 (ms)
    },
    
    // 追击配置
    chase: {
        aggroRange: 8,          // 激怒范围
        chaseRange: 15,         // 追击范围
        giveUpRange: 20,        // 放弃追击范围
    },
    
    // 速度配置
    speed: {
        [EnemyType.NORMAL]: 2.0,
        [EnemyType.ELITE]: 2.5,
        [EnemyType.BOSS]: 1.5,
    },
};

/**
 * 敌人战斗数值配置
 */
export const ENEMY_COMBAT_CONFIG = {
    [EnemyType.NORMAL]: {
        baseHp: 6,
        baseDamage: 1,
        expReward: 10,
    },
    [EnemyType.ELITE]: {
        baseHp: 15,
        baseDamage: 2,
        expReward: 30,
    },
    [EnemyType.BOSS]: {
        baseHp: 50,
        baseDamage: 3,
        expReward: 100,
    },
};

// =============================================================================
// 辅助函数
// =============================================================================

/**
 * 根据等级计算敌人 HP
 */
export function calculateEnemyHp(type: EnemyType, level: number): number {
    const base = ENEMY_COMBAT_CONFIG[type].baseHp;
    return Math.floor(base * (1 + (level - 1) * 0.2));
}

/**
 * 根据等级计算敌人伤害
 */
export function calculateEnemyDamage(type: EnemyType, level: number): number {
    const base = ENEMY_COMBAT_CONFIG[type].baseDamage;
    return Math.floor(base * (1 + (level - 1) * 0.15));
}

/**
 * 获取敌人经验值奖励
 */
export function getEnemyExpReward(type: EnemyType, level: number): number {
    const base = ENEMY_COMBAT_CONFIG[type].expReward;
    return Math.floor(base * (1 + (level - 1) * 0.1));
}
