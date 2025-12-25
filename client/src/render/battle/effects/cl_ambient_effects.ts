/**
 * 环境特效模块
 * 
 * 职责：
 * - 环境粒子系统（漂浮光点）
 * - 背景颜色设置
 * 
 * 模块: client/render/battle/effects
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import {
    Scene,
    Vector3,
    Color4,
    ParticleSystem,
    MeshBuilder,
    TransformNode,
} from '@babylonjs/core';

// =============================================================================
// 环境特效配置
// =============================================================================

export const CL_AMBIENT_EFFECT_CONFIG = {
    // 环境粒子
    PARTICLE_COUNT: 100,
    EMIT_RATE: 10,
    MIN_SIZE: 0.02,
    MAX_SIZE: 0.08,
    MIN_LIFETIME: 3,
    MAX_LIFETIME: 6,
    GRAVITY: new Vector3(0, -0.1, 0),
    
    // 发射范围
    EMIT_BOX_MIN: new Vector3(-6, 0, -8),
    EMIT_BOX_MAX: new Vector3(6, 0, 8),
    EMIT_HEIGHT: 5,
    
    // 颜色
    COLOR_1: new Color4(1, 0.9, 0.7, 0.1),
    COLOR_2: new Color4(0.7, 0.8, 1, 0.05),
    COLOR_DEAD: new Color4(0, 0, 0, 0),
    
    // 背景颜色
    CLEAR_COLOR: new Color4(0.05, 0.05, 0.1, 1),
};

// =============================================================================
// 环境特效管理器
// =============================================================================

export class ClAmbientEffectManager {
    private scene: Scene;
    private root: TransformNode;
    private ambientParticles: ParticleSystem | null = null;

    constructor(scene: Scene, root: TransformNode) {
        this.scene = scene;
        this.root = root;
    }

    /**
     * 初始化环境特效
     */
    initialize(): void {
        this.setupAmbientParticles();
        this.setupBackground();
    }

    /**
     * 设置环境粒子系统
     */
    private setupAmbientParticles(): void {
        const config = CL_AMBIENT_EFFECT_CONFIG;
        
        // 创建发射器
        const emitter = MeshBuilder.CreateSphere('ambientEmitter', { diameter: 0.01 }, this.scene);
        emitter.position = new Vector3(0, config.EMIT_HEIGHT, 0);
        emitter.parent = this.root;
        emitter.isVisible = false;
        
        // 创建粒子系统
        this.ambientParticles = new ParticleSystem('ambientParticles', config.PARTICLE_COUNT, this.scene);
        this.ambientParticles.emitter = emitter;
        
        // 发射范围
        this.ambientParticles.minEmitBox = config.EMIT_BOX_MIN;
        this.ambientParticles.maxEmitBox = config.EMIT_BOX_MAX;
        
        // 颜色
        this.ambientParticles.color1 = config.COLOR_1;
        this.ambientParticles.color2 = config.COLOR_2;
        this.ambientParticles.colorDead = config.COLOR_DEAD;
        
        // 大小
        this.ambientParticles.minSize = config.MIN_SIZE;
        this.ambientParticles.maxSize = config.MAX_SIZE;
        
        // 生命周期
        this.ambientParticles.minLifeTime = config.MIN_LIFETIME;
        this.ambientParticles.maxLifeTime = config.MAX_LIFETIME;
        
        // 发射速率和方向
        this.ambientParticles.emitRate = config.EMIT_RATE;
        this.ambientParticles.direction1 = new Vector3(-0.5, -1, -0.5);
        this.ambientParticles.direction2 = new Vector3(0.5, -0.5, 0.5);
        this.ambientParticles.minEmitPower = 0.2;
        this.ambientParticles.maxEmitPower = 0.5;
        
        // 重力
        this.ambientParticles.gravity = config.GRAVITY;
    }

    /**
     * 设置背景颜色
     */
    private setupBackground(): void {
        this.scene.clearColor = CL_AMBIENT_EFFECT_CONFIG.CLEAR_COLOR;
    }

    /**
     * 启动环境粒子
     */
    start(): void {
        this.ambientParticles?.start();
    }

    /**
     * 停止环境粒子
     */
    stop(): void {
        this.ambientParticles?.stop();
    }

    /**
     * 检查是否正在运行
     */
    isRunning(): boolean {
        return this.ambientParticles?.isStarted() ?? false;
    }

    /**
     * 设置启用状态
     */
    setEnabled(enabled: boolean): void {
        if (enabled) {
            this.start();
        } else {
            this.stop();
        }
    }

    /**
     * 设置背景颜色
     */
    setBackgroundColor(color: Color4): void {
        this.scene.clearColor = color;
    }

    /**
     * 获取当前背景颜色
     */
    getBackgroundColor(): Color4 {
        return this.scene.clearColor as Color4;
    }

    /**
     * 设置粒子发射率
     */
    setEmitRate(rate: number): void {
        if (this.ambientParticles) {
            this.ambientParticles.emitRate = rate;
        }
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.ambientParticles?.dispose();
        this.ambientParticles = null;
    }
}
