/**
 * 技能特效工厂 - 创建各种技能视觉效果
 * 
 * 模块: client/render/battle/effects
 * 前缀: Cl
 * 文档: 文档/09-模块化架构.md
 * 
 * 职责：
 * - 火焰特效
 * - 冰霜特效
 * - 闪电特效
 * - 通用技能特效
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
// 技能类型
// =============================================================================

export enum SkillEffectType {
    Fire = 'fire',
    Ice = 'ice',
    Lightning = 'lightning',
    Poison = 'poison',
    Generic = 'generic'
}

// =============================================================================
// 技能特效配置
// =============================================================================

export const SKILL_EFFECT_CONFIG = {
    // 火焰
    fire: {
        particleCount: 80,
        emitRate: 100,
        duration: 1000,
        color1: new Color4(1, 0.4, 0.1, 1),
        color2: new Color4(1, 0.2, 0, 1),
        colorDead: new Color4(0.3, 0, 0, 0),
        minSize: 0.2,
        maxSize: 0.5,
        minLifeTime: 0.3,
        maxLifeTime: 0.6,
        gravity: new Vector3(0, 2, 0),
    },
    
    // 冰霜
    ice: {
        particleCount: 60,
        emitRate: 80,
        duration: 1200,
        color1: new Color4(0.4, 0.8, 1, 1),
        color2: new Color4(0.8, 0.95, 1, 0.8),
        colorDead: new Color4(0.5, 0.7, 1, 0),
        minSize: 0.1,
        maxSize: 0.3,
        minLifeTime: 0.5,
        maxLifeTime: 1.0,
        gravity: new Vector3(0, -1, 0),
    },
    
    // 闪电
    lightning: {
        boltCount: 3,
        particleCount: 40,
        boltDelay: 80,
        duration: 200,
        color1: new Color4(1, 1, 0.3, 1),
        color2: new Color4(1, 1, 0.8, 1),
        colorDead: new Color4(1, 1, 0.5, 0),
        minSize: 0.05,
        maxSize: 0.15,
    },
    
    // 毒素
    poison: {
        particleCount: 50,
        emitRate: 40,
        duration: 1500,
        color1: new Color4(0.5, 1, 0.3, 1),
        color2: new Color4(0.3, 0.8, 0.2, 0.8),
        colorDead: new Color4(0.2, 0.5, 0.1, 0),
    },
    
    // 通用
    generic: {
        particleCount: 40,
        emitRate: 60,
        duration: 1500,
        color1: new Color4(0.8, 0.5, 1, 1),
    }
};

// =============================================================================
// 技能特效工厂
// =============================================================================

export class ClSkillEffectFactory {
    private scene: Scene;
    private root: TransformNode;
    private flashCallback: ((color: Color4, duration: number) => void) | null = null;
    
    constructor(scene: Scene, root: TransformNode) {
        this.scene = scene;
        this.root = root;
    }
    
    /**
     * 设置屏幕闪烁回调
     */
    setFlashCallback(callback: (color: Color4, duration: number) => void): void {
        this.flashCallback = callback;
    }
    
    /**
     * 播放技能特效
     */
    playSkillEffect(type: SkillEffectType, position: Vector3, customColor?: Color4): void {
        switch (type) {
            case SkillEffectType.Fire:
                this.playFireEffect(position, customColor);
                break;
            case SkillEffectType.Ice:
                this.playIceEffect(position, customColor);
                break;
            case SkillEffectType.Lightning:
                this.playLightningEffect(position, customColor);
                break;
            case SkillEffectType.Poison:
                this.playPoisonEffect(position, customColor);
                break;
            default:
                this.playGenericEffect(position, customColor);
        }
    }
    
    /**
     * 火焰特效
     */
    private playFireEffect(position: Vector3, customColor?: Color4): void {
        const config = SKILL_EFFECT_CONFIG.fire;
        const color = customColor || config.color1;
        
        const fire = new ParticleSystem('fireSkill', config.particleCount, this.scene);
        
        const emitter = this.createEmitter('fireEmitter', position);
        fire.emitter = emitter;
        
        fire.minEmitBox = new Vector3(-0.3, 0, -0.3);
        fire.maxEmitBox = new Vector3(0.3, 0, 0.3);
        
        fire.color1 = color;
        fire.color2 = config.color2;
        fire.colorDead = config.colorDead;
        
        fire.minSize = config.minSize;
        fire.maxSize = config.maxSize;
        fire.minLifeTime = config.minLifeTime;
        fire.maxLifeTime = config.maxLifeTime;
        
        fire.direction1 = new Vector3(-0.3, 1, -0.3);
        fire.direction2 = new Vector3(0.3, 2, 0.3);
        fire.minEmitPower = 2;
        fire.maxEmitPower = 4;
        fire.gravity = config.gravity;
        
        fire.emitRate = config.emitRate;
        fire.targetStopDuration = 0.3;
        fire.start();
        
        this.cleanupAfter(fire, emitter, config.duration);
    }
    
    /**
     * 冰霜特效
     */
    private playIceEffect(position: Vector3, customColor?: Color4): void {
        const config = SKILL_EFFECT_CONFIG.ice;
        const color = customColor || config.color1;
        
        const ice = new ParticleSystem('iceSkill', config.particleCount, this.scene);
        
        const emitter = this.createEmitter('iceEmitter', position);
        ice.emitter = emitter;
        
        ice.minEmitBox = new Vector3(-0.5, 0, -0.5);
        ice.maxEmitBox = new Vector3(0.5, 0.5, 0.5);
        
        ice.color1 = color;
        ice.color2 = config.color2;
        ice.colorDead = config.colorDead;
        
        ice.minSize = config.minSize;
        ice.maxSize = config.maxSize;
        ice.minLifeTime = config.minLifeTime;
        ice.maxLifeTime = config.maxLifeTime;
        
        ice.direction1 = new Vector3(-1, 0.5, -1);
        ice.direction2 = new Vector3(1, 1, 1);
        ice.minEmitPower = 1;
        ice.maxEmitPower = 2;
        ice.gravity = config.gravity;
        
        ice.emitRate = config.emitRate;
        ice.targetStopDuration = 0.4;
        ice.start();
        
        this.cleanupAfter(ice, emitter, config.duration);
    }
    
    /**
     * 闪电特效
     */
    private playLightningEffect(position: Vector3, customColor?: Color4): void {
        const config = SKILL_EFFECT_CONFIG.lightning;
        const color = customColor || config.color1;
        
        for (let i = 0; i < config.boltCount; i++) {
            setTimeout(() => {
                const bolt = new ParticleSystem(`lightningBolt${i}`, config.particleCount, this.scene);
                
                const offsetPos = position.add(new Vector3(
                    (Math.random() - 0.5) * 0.5,
                    Math.random() * 0.5,
                    (Math.random() - 0.5) * 0.5
                ));
                const emitter = this.createEmitter(`boltEmitter${i}`, offsetPos);
                bolt.emitter = emitter;
                
                bolt.minEmitBox = Vector3.Zero();
                bolt.maxEmitBox = Vector3.Zero();
                
                bolt.color1 = color;
                bolt.color2 = config.color2;
                bolt.colorDead = config.colorDead;
                
                bolt.minSize = config.minSize;
                bolt.maxSize = config.maxSize;
                bolt.minLifeTime = 0.05;
                bolt.maxLifeTime = 0.1;
                
                bolt.direction1 = new Vector3(-0.5, -2, -0.5);
                bolt.direction2 = new Vector3(0.5, 0, 0.5);
                bolt.minEmitPower = 5;
                bolt.maxEmitPower = 10;
                
                bolt.manualEmitCount = config.particleCount;
                bolt.start();
                
                // 屏幕闪白
                if (this.flashCallback) {
                    this.flashCallback(color, 50);
                }
                
                this.cleanupAfter(bolt, emitter, config.duration);
            }, i * config.boltDelay);
        }
    }
    
    /**
     * 毒素特效
     */
    private playPoisonEffect(position: Vector3, customColor?: Color4): void {
        const config = SKILL_EFFECT_CONFIG.poison;
        const color = customColor || config.color1;
        
        const poison = new ParticleSystem('poisonSkill', config.particleCount, this.scene);
        
        const emitter = this.createEmitter('poisonEmitter', position);
        poison.emitter = emitter;
        
        poison.minEmitBox = new Vector3(-0.4, 0, -0.4);
        poison.maxEmitBox = new Vector3(0.4, 0.2, 0.4);
        
        poison.color1 = color;
        poison.color2 = config.color2!;
        poison.colorDead = config.colorDead!;
        
        poison.minSize = 0.15;
        poison.maxSize = 0.35;
        poison.minLifeTime = 0.8;
        poison.maxLifeTime = 1.5;
        
        poison.direction1 = new Vector3(-0.5, 0.5, -0.5);
        poison.direction2 = new Vector3(0.5, 1.5, 0.5);
        poison.minEmitPower = 0.5;
        poison.maxEmitPower = 1.5;
        poison.gravity = new Vector3(0, 0.5, 0);
        
        poison.emitRate = config.emitRate;
        poison.targetStopDuration = 0.5;
        poison.start();
        
        this.cleanupAfter(poison, emitter, config.duration);
    }
    
    /**
     * 通用技能特效 - 螺旋上升
     */
    private playGenericEffect(position: Vector3, customColor?: Color4): void {
        const config = SKILL_EFFECT_CONFIG.generic;
        const color = customColor || config.color1;
        
        const skill = new ParticleSystem('genericSkill', config.particleCount, this.scene);
        
        const emitter = this.createEmitter('skillEmitter', position);
        skill.emitter = emitter;
        
        skill.minEmitBox = new Vector3(-0.2, 0, -0.2);
        skill.maxEmitBox = new Vector3(0.2, 0, 0.2);
        
        skill.color1 = color;
        skill.color2 = color.scale(0.7);
        skill.colorDead = new Color4(color.r, color.g, color.b, 0);
        
        skill.minSize = 0.1;
        skill.maxSize = 0.25;
        skill.minLifeTime = 0.5;
        skill.maxLifeTime = 1.0;
        
        skill.direction1 = new Vector3(-0.5, 1, -0.5);
        skill.direction2 = new Vector3(0.5, 2, 0.5);
        skill.minEmitPower = 1;
        skill.maxEmitPower = 3;
        skill.gravity = new Vector3(0, 1, 0);
        
        skill.minAngularSpeed = -Math.PI;
        skill.maxAngularSpeed = Math.PI;
        
        skill.emitRate = config.emitRate;
        skill.targetStopDuration = 0.5;
        skill.start();
        
        this.cleanupAfter(skill, emitter, config.duration);
    }
    
    // =========================================================================
    // 辅助方法
    // =========================================================================
    
    private createEmitter(name: string, position: Vector3): any {
        const emitter = MeshBuilder.CreateSphere(name, { diameter: 0.01 }, this.scene);
        emitter.position = position;
        emitter.parent = this.root;
        emitter.isVisible = false;
        return emitter;
    }
    
    private cleanupAfter(particles: ParticleSystem, emitter: any, duration: number): void {
        setTimeout(() => {
            particles.dispose();
            emitter.dispose();
        }, duration);
    }
}
