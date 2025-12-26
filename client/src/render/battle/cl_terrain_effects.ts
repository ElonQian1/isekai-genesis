/**
 * 地形粒子特效系统
 * 
 * 根据不同地形类型渲染对应的粒子特效
 * 带有性能检测和自动降级功能
 */

import { 
    Scene, 
    Vector3, 
    Color4, 
    ParticleSystem, 
    Texture, 
    TransformNode,
    AbstractMesh
} from '@babylonjs/core';

import { TerrainType } from './cl_battle_arena';

// 性能等级
export type PerformanceLevel = 'high' | 'medium' | 'low';

// 地形特效配置
interface TerrainEffectConfig {
    particleCount: number;
    emitRate: number;
    minLifeTime: number;
    maxLifeTime: number;
    minSize: number;
    maxSize: number;
    color1: Color4;
    color2: Color4;
    colorDead: Color4;
    gravity: Vector3;
    direction1: Vector3;
    direction2: Vector3;
    minEmitPower: number;
    maxEmitPower: number;
}

// 各地形的粒子配置
const TERRAIN_EFFECT_CONFIGS: Record<TerrainType, TerrainEffectConfig> = {
    plain: {
        particleCount: 100,
        emitRate: 10,
        minLifeTime: 2,
        maxLifeTime: 4,
        minSize: 0.05,
        maxSize: 0.15,
        color1: new Color4(0.4, 0.8, 0.4, 0.5),      // 绿色草叶
        color2: new Color4(0.6, 0.9, 0.5, 0.3),
        colorDead: new Color4(0.3, 0.6, 0.3, 0),
        gravity: new Vector3(0.1, -0.1, 0.1),
        direction1: new Vector3(-1, 1, -1),
        direction2: new Vector3(1, 2, 1),
        minEmitPower: 0.2,
        maxEmitPower: 0.5
    },
    volcano: {
        particleCount: 200,
        emitRate: 30,
        minLifeTime: 1,
        maxLifeTime: 2,
        minSize: 0.1,
        maxSize: 0.3,
        color1: new Color4(1, 0.5, 0, 1),            // 火焰橙
        color2: new Color4(1, 0.2, 0, 0.8),
        colorDead: new Color4(0.3, 0.1, 0, 0),
        gravity: new Vector3(0, 1, 0),               // 向上飘
        direction1: new Vector3(-0.5, 1, -0.5),
        direction2: new Vector3(0.5, 2, 0.5),
        minEmitPower: 1,
        maxEmitPower: 2
    },
    glacier: {
        particleCount: 150,
        emitRate: 20,
        minLifeTime: 3,
        maxLifeTime: 5,
        minSize: 0.03,
        maxSize: 0.1,
        color1: new Color4(0.8, 0.95, 1, 0.6),       // 冰蓝
        color2: new Color4(0.6, 0.85, 0.95, 0.4),
        colorDead: new Color4(0.9, 0.95, 1, 0),
        gravity: new Vector3(0, -0.2, 0),
        direction1: new Vector3(-1, 0.5, -1),
        direction2: new Vector3(1, 1, 1),
        minEmitPower: 0.1,
        maxEmitPower: 0.3
    },
    ocean: {
        particleCount: 120,
        emitRate: 15,
        minLifeTime: 2,
        maxLifeTime: 3,
        minSize: 0.08,
        maxSize: 0.2,
        color1: new Color4(0.2, 0.5, 0.9, 0.5),      // 海蓝
        color2: new Color4(0.3, 0.6, 0.95, 0.3),
        colorDead: new Color4(0.1, 0.3, 0.6, 0),
        gravity: new Vector3(0.2, 0.5, 0),
        direction1: new Vector3(-0.5, 0.3, -0.3),
        direction2: new Vector3(0.5, 0.8, 0.3),
        minEmitPower: 0.3,
        maxEmitPower: 0.6
    },
    swamp: {
        particleCount: 80,
        emitRate: 8,
        minLifeTime: 3,
        maxLifeTime: 5,
        minSize: 0.1,
        maxSize: 0.25,
        color1: new Color4(0.4, 0.5, 0.2, 0.4),      // 沼泽绿
        color2: new Color4(0.3, 0.4, 0.15, 0.3),
        colorDead: new Color4(0.2, 0.25, 0.1, 0),
        gravity: new Vector3(0, 0.3, 0),
        direction1: new Vector3(-0.3, 0.5, -0.3),
        direction2: new Vector3(0.3, 1, 0.3),
        minEmitPower: 0.1,
        maxEmitPower: 0.2
    },
    shadow: {
        particleCount: 100,
        emitRate: 12,
        minLifeTime: 2,
        maxLifeTime: 4,
        minSize: 0.15,
        maxSize: 0.35,
        color1: new Color4(0.3, 0.1, 0.4, 0.6),      // 暗紫
        color2: new Color4(0.15, 0.05, 0.25, 0.4),
        colorDead: new Color4(0.1, 0, 0.15, 0),
        gravity: new Vector3(0, 0.2, 0),
        direction1: new Vector3(-0.5, 0.2, -0.5),
        direction2: new Vector3(0.5, 0.8, 0.5),
        minEmitPower: 0.2,
        maxEmitPower: 0.4
    },
    holy: {
        particleCount: 150,
        emitRate: 20,
        minLifeTime: 2,
        maxLifeTime: 3,
        minSize: 0.05,
        maxSize: 0.12,
        color1: new Color4(1, 1, 0.8, 0.8),          // 金光
        color2: new Color4(1, 0.95, 0.7, 0.5),
        colorDead: new Color4(1, 1, 0.9, 0),
        gravity: new Vector3(0, 0.5, 0),
        direction1: new Vector3(-0.3, 0.5, -0.3),
        direction2: new Vector3(0.3, 1.5, 0.3),
        minEmitPower: 0.3,
        maxEmitPower: 0.6
    },
    forest: {
        particleCount: 120,
        emitRate: 15,
        minLifeTime: 3,
        maxLifeTime: 5,
        minSize: 0.04,
        maxSize: 0.12,
        color1: new Color4(0.2, 0.7, 0.3, 0.5),      // 森林绿
        color2: new Color4(0.15, 0.6, 0.25, 0.3),
        colorDead: new Color4(0.5, 0.4, 0.2, 0),
        gravity: new Vector3(0.1, -0.3, 0.1),
        direction1: new Vector3(-1, 0.5, -1),
        direction2: new Vector3(1, 1.5, 1),
        minEmitPower: 0.1,
        maxEmitPower: 0.3
    },
    mountain: {
        particleCount: 60,
        emitRate: 6,
        minLifeTime: 4,
        maxLifeTime: 6,
        minSize: 0.08,
        maxSize: 0.2,
        color1: new Color4(0.6, 0.6, 0.6, 0.4),      // 岩石灰
        color2: new Color4(0.5, 0.5, 0.5, 0.3),
        colorDead: new Color4(0.4, 0.4, 0.4, 0),
        gravity: new Vector3(0.05, -0.1, 0.05),
        direction1: new Vector3(-0.5, 0.3, -0.5),
        direction2: new Vector3(0.5, 0.8, 0.5),
        minEmitPower: 0.1,
        maxEmitPower: 0.2
    }
};

/**
 * 地形粒子特效管理器
 */
export class ClTerrainEffects {
    private scene: Scene;
    private playerParticles: ParticleSystem | null = null;
    private enemyParticles: ParticleSystem | null = null;
    private performanceLevel: PerformanceLevel = 'high';
    private isEnabled: boolean = true;
    private fpsHistory: number[] = [];
    private lastFpsCheck: number = 0;

    constructor(scene: Scene) {
        this.scene = scene;
        this.detectPerformance();
    }

    /**
     * 检测设备性能等级
     */
    private detectPerformance(): void {
        // 检查 WebGPU 支持
        const hasWebGPU = 'gpu' in navigator;
        
        // 检查硬件并发数
        const cores = navigator.hardwareConcurrency || 4;
        
        // 检查设备内存 (如果可用)
        const memory = (navigator as any).deviceMemory || 4;
        
        // 综合判断性能等级
        if (hasWebGPU && cores >= 8 && memory >= 8) {
            this.performanceLevel = 'high';
        } else if (cores >= 4 && memory >= 4) {
            this.performanceLevel = 'medium';
        } else {
            this.performanceLevel = 'low';
        }
        
        console.log(`🎮 性能检测: ${this.performanceLevel} (WebGPU: ${hasWebGPU}, 核心: ${cores}, 内存: ${memory}GB)`);
    }

    /**
     * 运行时 FPS 监控和自动降级
     */
    public updatePerformanceMonitor(): void {
        const now = performance.now();
        
        // 每秒检查一次
        if (now - this.lastFpsCheck < 1000) return;
        this.lastFpsCheck = now;
        
        const fps = this.scene.getEngine().getFps();
        this.fpsHistory.push(fps);
        
        // 保持最近10秒的记录
        if (this.fpsHistory.length > 10) {
            this.fpsHistory.shift();
        }
        
        // 计算平均 FPS
        const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
        
        // 自动降级
        if (avgFps < 25 && this.performanceLevel !== 'low') {
            console.warn(`⚠️ FPS 过低 (${avgFps.toFixed(1)}), 降低粒子特效`);
            this.performanceLevel = this.performanceLevel === 'high' ? 'medium' : 'low';
            this.refreshParticles();
        }
    }

    /**
     * 获取根据性能等级调整的配置
     */
    private getAdjustedConfig(config: TerrainEffectConfig): TerrainEffectConfig {
        const multiplier = this.performanceLevel === 'high' ? 1 : 
                          this.performanceLevel === 'medium' ? 0.5 : 0.25;
        
        return {
            ...config,
            particleCount: Math.floor(config.particleCount * multiplier),
            emitRate: config.emitRate * multiplier
        };
    }

    /**
     * 创建地形粒子特效
     */
    public create(
        playerTerrain: TerrainType, 
        enemyTerrain: TerrainType,
        playerEmitter: AbstractMesh | Vector3,
        enemyEmitter: AbstractMesh | Vector3
    ): void {
        if (!this.isEnabled) return;
        
        this.dispose();
        
        // 保存当前地形类型用于刷新
        this.currentPlayerTerrain = playerTerrain;
        this.currentEnemyTerrain = enemyTerrain;
        this.currentPlayerEmitter = playerEmitter;
        this.currentEnemyEmitter = enemyEmitter;
        
        // 创建玩家区域粒子
        this.playerParticles = this.createParticleSystem(
            'player_terrain_fx',
            playerTerrain,
            playerEmitter
        );
        
        // 创建敌方区域粒子
        this.enemyParticles = this.createParticleSystem(
            'enemy_terrain_fx',
            enemyTerrain,
            enemyEmitter
        );
        
        // 启动粒子系统
        if (this.playerParticles) this.playerParticles.start();
        if (this.enemyParticles) this.enemyParticles.start();
        
        console.log(`✨ 地形特效已创建: 玩家[${playerTerrain}] 敌方[${enemyTerrain}] (性能等级: ${this.performanceLevel})`);
    }
    
    /** 当前玩家发射器 */
    private currentPlayerEmitter: AbstractMesh | Vector3 | null = null;
    /** 当前敌方发射器 */
    private currentEnemyEmitter: AbstractMesh | Vector3 | null = null;

    /**
     * 创建单个粒子系统
     */
    private createParticleSystem(
        name: string,
        terrain: TerrainType,
        emitter: AbstractMesh | Vector3
    ): ParticleSystem | null {
        if (this.performanceLevel === 'low' && !this.isImportantTerrain(terrain)) {
            return null; // 低性能模式下跳过非重要地形
        }
        
        const baseConfig = TERRAIN_EFFECT_CONFIGS[terrain];
        const config = this.getAdjustedConfig(baseConfig);
        
        const particleSystem = new ParticleSystem(name, config.particleCount, this.scene);
        
        // 使用默认粒子纹理
        particleSystem.particleTexture = new Texture(
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGElEQVQYV2NkYGD4z4AHMP7//58BH2ZEOACPMAQH+HAhcwAAAABJRU5ErkJggg==',
            this.scene
        );
        
        particleSystem.emitter = emitter;
        
        // 发射区域
        if (emitter instanceof Vector3) {
            particleSystem.minEmitBox = new Vector3(-4, 0, -2);
            particleSystem.maxEmitBox = new Vector3(4, 0.5, 2);
        }
        
        // 粒子生命周期
        particleSystem.minLifeTime = config.minLifeTime;
        particleSystem.maxLifeTime = config.maxLifeTime;
        
        // 粒子大小
        particleSystem.minSize = config.minSize;
        particleSystem.maxSize = config.maxSize;
        
        // 发射率
        particleSystem.emitRate = config.emitRate;
        
        // 颜色渐变
        particleSystem.color1 = config.color1;
        particleSystem.color2 = config.color2;
        particleSystem.colorDead = config.colorDead;
        
        // 重力
        particleSystem.gravity = config.gravity;
        
        // 发射方向
        particleSystem.direction1 = config.direction1;
        particleSystem.direction2 = config.direction2;
        
        // 发射力度
        particleSystem.minEmitPower = config.minEmitPower;
        particleSystem.maxEmitPower = config.maxEmitPower;
        
        // 混合模式
        particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        return particleSystem;
    }

    /**
     * 判断是否为重要地形 (低性能模式下仍显示)
     */
    private isImportantTerrain(terrain: TerrainType): boolean {
        return terrain === 'volcano' || terrain === 'holy' || terrain === 'shadow';
    }

    /**
     * 刷新粒子系统 (性能降级后)
     */
    private refreshParticles(): void {
        // 如果有保存的发射器，重新创建粒子系统
        if (this.currentPlayerEmitter && this.currentEnemyEmitter) {
            this.dispose();
            this.create(
                this.currentPlayerTerrain,
                this.currentEnemyTerrain,
                this.currentPlayerEmitter,
                this.currentEnemyEmitter
            );
        }
        
        console.log(`🔄 粒子系统已刷新 (性能等级: ${this.performanceLevel})`);
    }
    
    /** 当前玩家地形 */
    private currentPlayerTerrain: TerrainType = 'plain';
    /** 当前敌方地形 */
    private currentEnemyTerrain: TerrainType = 'plain';

    /**
     * 启用/禁用粒子特效
     */
    public setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
        
        if (!enabled) {
            this.dispose();
        }
    }

    /**
     * 获取当前性能等级
     */
    public getPerformanceLevel(): PerformanceLevel {
        return this.performanceLevel;
    }

    /**
     * 手动设置性能等级
     */
    public setPerformanceLevel(level: PerformanceLevel): void {
        this.performanceLevel = level;
        this.refreshParticles();
    }

    /**
     * 清理资源
     */
    public dispose(): void {
        if (this.playerParticles) {
            this.playerParticles.stop();
            this.playerParticles.dispose();
            this.playerParticles = null;
        }
        
        if (this.enemyParticles) {
            this.enemyParticles.stop();
            this.enemyParticles.dispose();
            this.enemyParticles = null;
        }
    }
}
