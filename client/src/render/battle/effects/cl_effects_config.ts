/**
 * 战斗特效配置
 * 
 * 模块: client/render/battle/effects
 * 前缀: Cl
 * 文档: 文档/09-模块化架构.md
 * 
 * 职责：
 * - 所有战斗特效的配置常量
 * - 颜色、大小、持续时间等参数
 */

import { Vector3, Color4 } from '@babylonjs/core';

// =============================================================================
// 环境特效配置
// =============================================================================

export const AMBIENT_EFFECT_CONFIG = {
    // 粒子数量
    particleCount: 100,
    emitRate: 10,
    
    // 大小
    minSize: 0.02,
    maxSize: 0.08,
    
    // 生命周期
    minLifeTime: 3,
    maxLifeTime: 6,
    
    // 物理
    gravity: new Vector3(0, -0.1, 0),
    
    // 发射范围
    emitBoxMin: new Vector3(-6, 0, -8),
    emitBoxMax: new Vector3(6, 0, 8),
    emitHeight: 5,
    
    // 颜色
    color1: new Color4(1, 0.9, 0.7, 0.1),
    color2: new Color4(0.7, 0.8, 1, 0.05),
    colorDead: new Color4(0, 0, 0, 0),
    
    // 背景
    clearColor: new Color4(0.05, 0.05, 0.1, 1),
};

// =============================================================================
// 攻击特效配置
// =============================================================================

export const ATTACK_EFFECT_CONFIG = {
    // 投射物
    projectileSize: 0.3,
    trailParticleCount: 50,
    duration: 400, // ms
    
    // 颜色
    color: new Color4(1, 0.6, 0.2, 1),
    
    // 拖尾
    trailMinSize: 0.1,
    trailMaxSize: 0.2,
    trailLifeTime: 0.1,
    trailEmitRate: 100,
};

// =============================================================================
// 伤害特效配置
// =============================================================================

export const DAMAGE_EFFECT_CONFIG = {
    particleCount: 30,
    duration: 600, // ms
    
    // 颜色
    color: new Color4(1, 0.2, 0.2, 1),
    
    // 粒子属性
    minSize: 0.1,
    maxSize: 0.3,
    minLifeTime: 0.3,
    maxLifeTime: 0.6,
    
    // 物理
    minEmitPower: 2,
    maxEmitPower: 5,
    gravity: new Vector3(0, -8, 0),
};

// =============================================================================
// 治疗特效配置
// =============================================================================

export const HEAL_EFFECT_CONFIG = {
    particleCount: 25,
    duration: 1000, // ms
    
    // 颜色
    color: new Color4(0.2, 1, 0.4, 1),
    colorSecondary: new Color4(0.5, 1, 0.7, 0.6),
    
    // 粒子属性
    minSize: 0.1,
    maxSize: 0.25,
    minLifeTime: 0.5,
    maxLifeTime: 1.2,
    
    // 物理 - 向上飘
    minEmitPower: 1,
    maxEmitPower: 2,
    gravity: new Vector3(0, 2, 0),
};

// =============================================================================
// 抽卡特效配置
// =============================================================================

export const DRAW_CARD_EFFECT_CONFIG = {
    particleCount: 20,
    duration: 300, // ms
    
    // 颜色
    color: new Color4(0.8, 0.9, 1, 1),
    
    // 卡牌
    cardSize: { width: 0.3, height: 0.4 },
    flySpeed: 0.3, // 秒
};

// =============================================================================
// 技能特效颜色配置
// =============================================================================

export const SKILL_COLOR_CONFIG = {
    fire: new Color4(1, 0.4, 0.1, 1),
    ice: new Color4(0.4, 0.8, 1, 1),
    lightning: new Color4(1, 1, 0.3, 1),
    poison: new Color4(0.5, 1, 0.3, 1),
    holy: new Color4(1, 0.95, 0.7, 1),
    dark: new Color4(0.3, 0.1, 0.4, 1),
    default: new Color4(0.8, 0.5, 1, 1),
};

// =============================================================================
// 命中特效配置
// =============================================================================

export const IMPACT_EFFECT_CONFIG = {
    particleCount: 50,
    duration: 600, // ms
    
    // 粒子属性
    minSize: 0.1,
    maxSize: 0.3,
    minLifeTime: 0.2,
    maxLifeTime: 0.4,
    
    // 物理
    minEmitPower: 2,
    maxEmitPower: 4,
    gravity: new Vector3(0, -5, 0),
    
    // 停止时间
    stopDuration: 0.1,
};

// =============================================================================
// 浮动数字配置
// =============================================================================

export const FLOATING_NUMBER_CONFIG = {
    fontSize: 24,
    fontWeight: 'bold',
    animationDuration: 1000, // ms
    riseDistance: 50, // px
    
    // 颜色预设
    colors: {
        damage: new Color4(1, 0.2, 0.2, 1),
        heal: new Color4(0.2, 1, 0.4, 1),
        shield: new Color4(0.3, 0.7, 1, 1),
        critical: new Color4(1, 0.8, 0, 1),
        miss: new Color4(0.7, 0.7, 0.7, 1),
    },
};

// =============================================================================
// 相机特效配置
// =============================================================================

export const CAMERA_EFFECT_CONFIG = {
    // 相机抖动
    shake: {
        defaultIntensity: 0.3,
        defaultDuration: 200, // ms
        frequency: 50, // ms
    },
    
    // 屏幕闪烁
    flash: {
        defaultDuration: 100, // ms
        defaultOpacity: 0.3,
    },
};

// =============================================================================
// 导出所有配置
// =============================================================================

export const BATTLE_EFFECTS_CONFIG = {
    ambient: AMBIENT_EFFECT_CONFIG,
    attack: ATTACK_EFFECT_CONFIG,
    damage: DAMAGE_EFFECT_CONFIG,
    heal: HEAL_EFFECT_CONFIG,
    drawCard: DRAW_CARD_EFFECT_CONFIG,
    skillColors: SKILL_COLOR_CONFIG,
    impact: IMPACT_EFFECT_CONFIG,
    floatingNumber: FLOATING_NUMBER_CONFIG,
    camera: CAMERA_EFFECT_CONFIG,
};
