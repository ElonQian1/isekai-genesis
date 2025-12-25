/**
 * 技能特效模块
 * 
 * 职责：
 * - 火焰技能特效
 * - 冰霜技能特效
 * - 闪电技能特效
 * - 通用技能特效
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
// 技能类型
// =============================================================================

export type ClSkillEffectType = 'fire' | 'ice' | 'lightning' | 'poison' | 'default';

// =============================================================================
// 技能特效配置
// =============================================================================

export const CL_SKILL_EFFECT_CONFIG = {
    FIRE_COLOR: new Color4(1, 0.4, 0.1, 1),
    ICE_COLOR: new Color4(0.4, 0.8, 1, 1),
    LIGHTNING_COLOR: new Color4(1, 1, 0.3, 1),
    POISON_COLOR: new Color4(0.5, 1, 0.3, 1),
    DEFAULT_COLOR: new Color4(0.8, 0.5, 1, 1),
};

// =============================================================================
// 技能特效生成器
// =============================================================================

export class ClSkillEffectGenerator {
    private scene: Scene;
    private root: TransformNode;

    constructor(scene: Scene, root: TransformNode) {
        this.scene = scene;
        this.root = root;
    }

    /**
     * 播放技能特效
     */
    playSkillEffect(type: ClSkillEffectType, position: Vector3, color?: Color4): void {
        const effectColor = color || this.getDefaultColor(type);
        
        switch (type) {
            case 'fire':
                this.playFireEffect(position, effectColor);
                break;
            case 'ice':
                this.playIceEffect(position, effectColor);
                break;
            case 'lightning':
                this.playLightningEffect(position, effectColor);
                break;
            case 'poison':
                this.playGenericEffect(position, effectColor, 40);
                break;
            default:
                this.playGenericEffect(position, effectColor, 30);
        }
    }

    /**
     * 获取默认颜色
     */
    private getDefaultColor(type: ClSkillEffectType): Color4 {
        const config = CL_SKILL_EFFECT_CONFIG;
        switch (type) {
            case 'fire': return config.FIRE_COLOR;
            case 'ice': return config.ICE_COLOR;
            case 'lightning': return config.LIGHTNING_COLOR;
            case 'poison': return config.POISON_COLOR;
            default: return config.DEFAULT_COLOR;
        }
    }

    // =========================================================================
    // 火焰特效
    // =========================================================================

    private playFireEffect(position: Vector3, color: Color4): void {
        const fire = new ParticleSystem('fireSkill', 80, this.scene);
        
        const emitter = MeshBuilder.CreateSphere('fireEmitter', { diameter: 0.01 }, this.scene);
        emitter.position = position;
        emitter.parent = this.root;
        emitter.isVisible = false;
        fire.emitter = emitter;
        
        fire.minEmitBox = new Vector3(-0.3, 0, -0.3);
        fire.maxEmitBox = new Vector3(0.3, 0, 0.3);
        
        fire.color1 = color;
        fire.color2 = new Color4(1, 0.2, 0, 1);
        fire.colorDead = new Color4(0.3, 0, 0, 0);
        
        fire.minSize = 0.2;
        fire.maxSize = 0.5;
        fire.minLifeTime = 0.3;
        fire.maxLifeTime = 0.6;
        
        fire.direction1 = new Vector3(-0.3, 1, -0.3);
        fire.direction2 = new Vector3(0.3, 2, 0.3);
        fire.minEmitPower = 2;
        fire.maxEmitPower = 4;
        fire.gravity = new Vector3(0, 2, 0);
        
        fire.emitRate = 100;
        fire.targetStopDuration = 0.3;
        fire.start();
        
        setTimeout(() => {
            fire.dispose();
            emitter.dispose();
        }, 1000);
    }

    // =========================================================================
    // 冰霜特效
    // =========================================================================

    private playIceEffect(position: Vector3, color: Color4): void {
        const ice = new ParticleSystem('iceSkill', 60, this.scene);
        
        const emitter = MeshBuilder.CreateSphere('iceEmitter', { diameter: 0.01 }, this.scene);
        emitter.position = position;
        emitter.parent = this.root;
        emitter.isVisible = false;
        ice.emitter = emitter;
        
        ice.minEmitBox = new Vector3(-0.5, 0, -0.5);
        ice.maxEmitBox = new Vector3(0.5, 0, 0.5);
        
        ice.color1 = color;
        ice.color2 = new Color4(0.8, 0.9, 1, 1);
        ice.colorDead = new Color4(0.5, 0.7, 1, 0);
        
        ice.minSize = 0.1;
        ice.maxSize = 0.3;
        ice.minLifeTime = 0.5;
        ice.maxLifeTime = 1.0;
        
        ice.direction1 = new Vector3(-1, 0.5, -1);
        ice.direction2 = new Vector3(1, 1, 1);
        ice.minEmitPower = 1;
        ice.maxEmitPower = 2;
        ice.gravity = new Vector3(0, -0.5, 0);
        
        ice.emitRate = 80;
        ice.targetStopDuration = 0.4;
        ice.start();
        
        setTimeout(() => {
            ice.dispose();
            emitter.dispose();
        }, 1200);
    }

    // =========================================================================
    // 闪电特效
    // =========================================================================

    private playLightningEffect(position: Vector3, color: Color4): void {
        const lightning = new ParticleSystem('lightningSkill', 100, this.scene);
        
        const emitter = MeshBuilder.CreateSphere('lightningEmitter', { diameter: 0.01 }, this.scene);
        emitter.position = position.add(new Vector3(0, 3, 0));
        emitter.parent = this.root;
        emitter.isVisible = false;
        lightning.emitter = emitter;
        
        lightning.minEmitBox = new Vector3(-0.1, 0, -0.1);
        lightning.maxEmitBox = new Vector3(0.1, 0, 0.1);
        
        lightning.color1 = color;
        lightning.color2 = new Color4(1, 1, 1, 1);
        lightning.colorDead = new Color4(0.5, 0.5, 1, 0);
        
        lightning.minSize = 0.05;
        lightning.maxSize = 0.15;
        lightning.minLifeTime = 0.1;
        lightning.maxLifeTime = 0.2;
        
        lightning.direction1 = new Vector3(-0.2, -1, -0.2);
        lightning.direction2 = new Vector3(0.2, -1, 0.2);
        lightning.minEmitPower = 10;
        lightning.maxEmitPower = 15;
        lightning.gravity = new Vector3(0, 0, 0);
        
        lightning.emitRate = 200;
        lightning.targetStopDuration = 0.15;
        lightning.start();
        
        // 闪烁效果 - 多次快速发射
        let flashCount = 0;
        const flashInterval = setInterval(() => {
            flashCount++;
            if (flashCount >= 3) {
                clearInterval(flashInterval);
                return;
            }
            
            const flash = new ParticleSystem(`lightningFlash_${flashCount}`, 50, this.scene);
            flash.emitter = emitter;
            flash.color1 = color;
            flash.color2 = new Color4(1, 1, 1, 1);
            flash.colorDead = new Color4(0, 0, 0, 0);
            flash.minSize = 0.03;
            flash.maxSize = 0.1;
            flash.minLifeTime = 0.05;
            flash.maxLifeTime = 0.1;
            flash.direction1 = new Vector3(-0.5, -1, -0.5);
            flash.direction2 = new Vector3(0.5, -1, 0.5);
            flash.minEmitPower = 8;
            flash.maxEmitPower = 12;
            flash.emitRate = 150;
            flash.targetStopDuration = 0.05;
            flash.start();
            
            setTimeout(() => flash.dispose(), 200);
        }, 100);
        
        setTimeout(() => {
            lightning.dispose();
            emitter.dispose();
        }, 800);
    }

    // =========================================================================
    // 通用特效
    // =========================================================================

    private playGenericEffect(position: Vector3, color: Color4, count: number): void {
        const ps = new ParticleSystem('genericSkill', count, this.scene);
        
        const emitter = MeshBuilder.CreateSphere('genericEmitter', { diameter: 0.01 }, this.scene);
        emitter.position = position;
        emitter.parent = this.root;
        emitter.isVisible = false;
        ps.emitter = emitter;
        
        ps.minEmitBox = new Vector3(-0.3, -0.1, -0.3);
        ps.maxEmitBox = new Vector3(0.3, 0.1, 0.3);
        
        ps.color1 = color;
        ps.color2 = new Color4(color.r * 0.7, color.g * 0.7, color.b * 0.7, 1);
        ps.colorDead = new Color4(0, 0, 0, 0);
        
        ps.minSize = 0.1;
        ps.maxSize = 0.25;
        ps.minLifeTime = 0.4;
        ps.maxLifeTime = 0.8;
        
        ps.direction1 = new Vector3(-1, 1, -1);
        ps.direction2 = new Vector3(1, 2, 1);
        ps.minEmitPower = 1.5;
        ps.maxEmitPower = 3;
        ps.gravity = new Vector3(0, -1, 0);
        
        ps.emitRate = 60;
        ps.targetStopDuration = 0.3;
        ps.start();
        
        setTimeout(() => {
            ps.dispose();
            emitter.dispose();
        }, 1000);
    }
}
