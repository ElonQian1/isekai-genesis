/**
 * 战斗粒子特效模块
 * 
 * 模块: client/render/battle/effects
 * 前缀: Cl
 * 
 * 职责：
 * - 攻击特效（能量球飞行+命中爆发）
 * - 伤害特效（红色粒子爆发）
 * - 治疗特效（绿色上升粒子）
 * - 命中特效（爆发效果）
 */

import {
    Scene,
    Vector3,
    Color3,
    Color4,
    ParticleSystem,
    MeshBuilder,
    TransformNode,
    StandardMaterial,
} from '@babylonjs/core';

import {
    ATTACK_EFFECT_CONFIG,
    DAMAGE_EFFECT_CONFIG,
    HEAL_EFFECT_CONFIG,
    IMPACT_EFFECT_CONFIG,
    SKILL_COLOR_CONFIG,
} from './cl_effects_config';

// =============================================================================
// 战斗粒子特效管理器
// =============================================================================

export class ClBattleParticleEffects {
    private scene: Scene;
    private root: TransformNode;

    constructor(scene: Scene, root: TransformNode) {
        this.scene = scene;
        this.root = root;
    }

    /**
     * 播放攻击特效 - 能量球从攻击者飞向目标
     */
    playAttackEffect(
        from: Vector3, 
        to: Vector3, 
        onImpact?: (position: Vector3) => void
    ): void {
        const config = ATTACK_EFFECT_CONFIG;
        
        // 创建能量球
        const projectile = MeshBuilder.CreateSphere('attackProjectile', { 
            diameter: config.projectileSize 
        }, this.scene);
        projectile.position = from.clone();
        projectile.parent = this.root;
        
        // 发光材质
        const mat = new StandardMaterial('attackMat', this.scene);
        mat.emissiveColor = new Color3(config.color.r, config.color.g, config.color.b);
        mat.disableLighting = true;
        projectile.material = mat;
        
        // 创建拖尾粒子
        const trail = this.createTrailParticles(projectile, config);
        trail.start();
        
        // 飞行动画
        const startTime = performance.now();
        
        const animateProjectile = () => {
            const elapsed = performance.now() - startTime;
            const t = Math.min(elapsed / config.duration, 1);
            
            // 缓动函数 (ease-out cubic)
            const easeT = 1 - Math.pow(1 - t, 3);
            
            projectile.position = Vector3.Lerp(from, to, easeT);
            
            if (t < 1) {
                requestAnimationFrame(animateProjectile);
            } else {
                // 到达目标 - 播放命中效果
                this.playImpactEffect(to, config.color);
                onImpact?.(to);
                
                // 清理
                trail.stop();
                setTimeout(() => {
                    trail.dispose();
                    projectile.dispose();
                    mat.dispose();
                }, 300);
            }
        };
        
        requestAnimationFrame(animateProjectile);
    }

    /**
     * 创建拖尾粒子系统
     */
    private createTrailParticles(emitter: any, config: typeof ATTACK_EFFECT_CONFIG): ParticleSystem {
        const trail = new ParticleSystem('attackTrail', config.trailParticleCount, this.scene);
        trail.emitter = emitter;
        trail.minEmitBox = Vector3.Zero();
        trail.maxEmitBox = Vector3.Zero();
        trail.color1 = config.color;
        trail.color2 = config.color.scale(0.5);
        trail.colorDead = new Color4(config.color.r, config.color.g, config.color.b, 0);
        trail.minSize = config.trailMinSize;
        trail.maxSize = config.trailMaxSize;
        trail.minLifeTime = config.trailLifeTime;
        trail.maxLifeTime = config.trailLifeTime * 2;
        trail.emitRate = config.trailEmitRate;
        trail.direction1 = new Vector3(-0.5, -0.5, -0.5);
        trail.direction2 = new Vector3(0.5, 0.5, 0.5);
        trail.minEmitPower = 0.5;
        trail.maxEmitPower = 1;
        return trail;
    }

    /**
     * 播放命中爆发效果
     */
    playImpactEffect(position: Vector3, color: Color4 = SKILL_COLOR_CONFIG.default): void {
        const config = IMPACT_EFFECT_CONFIG;
        const impact = new ParticleSystem('impact', config.particleCount, this.scene);
        
        const emitter = MeshBuilder.CreateSphere('impactEmitter', { diameter: 0.01 }, this.scene);
        emitter.position = position;
        emitter.parent = this.root;
        emitter.isVisible = false;
        impact.emitter = emitter;
        
        impact.minEmitBox = Vector3.Zero();
        impact.maxEmitBox = Vector3.Zero();
        impact.color1 = color;
        impact.color2 = color.scale(0.7);
        impact.colorDead = new Color4(color.r, color.g, color.b, 0);
        impact.minSize = config.minSize;
        impact.maxSize = config.maxSize;
        impact.minLifeTime = config.minLifeTime;
        impact.maxLifeTime = config.maxLifeTime;
        impact.emitRate = 200;
        impact.direction1 = new Vector3(-1, -1, -1);
        impact.direction2 = new Vector3(1, 1, 1);
        impact.minEmitPower = config.minEmitPower;
        impact.maxEmitPower = config.maxEmitPower;
        impact.gravity = config.gravity;
        
        impact.targetStopDuration = config.stopDuration;
        impact.start();
        
        setTimeout(() => {
            impact.dispose();
            emitter.dispose();
        }, config.duration);
    }

    /**
     * 播放治疗特效 - 绿色上升粒子
     */
    playHealParticles(position: Vector3): void {
        const config = HEAL_EFFECT_CONFIG;
        
        const heal = new ParticleSystem('healEffect', config.particleCount, this.scene);
        
        const emitter = MeshBuilder.CreateSphere('healEmitter', { diameter: 0.01 }, this.scene);
        emitter.position = position;
        emitter.parent = this.root;
        emitter.isVisible = false;
        heal.emitter = emitter;
        
        // 发射范围 (圆形区域)
        heal.minEmitBox = new Vector3(-0.5, 0, -0.5);
        heal.maxEmitBox = new Vector3(0.5, 0, 0.5);
        
        // 颜色 - 绿色渐变
        heal.color1 = config.color;
        heal.color2 = config.colorSecondary;
        heal.colorDead = new Color4(config.color.r, config.color.g, config.color.b, 0);
        
        // 大小
        heal.minSize = config.minSize;
        heal.maxSize = config.maxSize;
        
        // 生命周期
        heal.minLifeTime = config.minLifeTime;
        heal.maxLifeTime = config.maxLifeTime;
        
        // 向上发射
        heal.direction1 = new Vector3(-0.2, 1, -0.2);
        heal.direction2 = new Vector3(0.2, 1, 0.2);
        heal.minEmitPower = config.minEmitPower;
        heal.maxEmitPower = config.maxEmitPower;
        
        // 轻微反重力效果
        heal.gravity = config.gravity;
        
        heal.emitRate = 30;
        heal.targetStopDuration = config.duration / 2000;
        heal.start();
        
        // 清理
        setTimeout(() => {
            heal.dispose();
            emitter.dispose();
        }, config.duration + 500);
    }

    /**
     * 播放伤害特效 - 红色粒子爆发
     */
    playDamageParticles(position: Vector3): void {
        const config = DAMAGE_EFFECT_CONFIG;
        
        const damage = new ParticleSystem('damageEffect', config.particleCount, this.scene);
        
        const emitter = MeshBuilder.CreateSphere('damageEmitter', { diameter: 0.01 }, this.scene);
        emitter.position = position;
        emitter.parent = this.root;
        emitter.isVisible = false;
        damage.emitter = emitter;
        
        damage.minEmitBox = Vector3.Zero();
        damage.maxEmitBox = Vector3.Zero();
        
        // 颜色 - 红色到橙色
        damage.color1 = config.color;
        damage.color2 = new Color4(1, 0.4, 0.1, 1);
        damage.colorDead = new Color4(0.5, 0, 0, 0);
        
        // 大小
        damage.minSize = config.minSize;
        damage.maxSize = config.maxSize;
        
        // 生命周期
        damage.minLifeTime = config.minLifeTime;
        damage.maxLifeTime = config.maxLifeTime;
        
        // 爆发式发射
        damage.direction1 = new Vector3(-1, 0.5, -1);
        damage.direction2 = new Vector3(1, 1.5, 1);
        damage.minEmitPower = config.minEmitPower;
        damage.maxEmitPower = config.maxEmitPower;
        
        // 重力
        damage.gravity = config.gravity;
        
        // 短促爆发
        damage.manualEmitCount = config.particleCount;
        damage.start();
        
        // 清理
        setTimeout(() => {
            damage.dispose();
            emitter.dispose();
        }, config.duration);
    }

    /**
     * 销毁
     */
    dispose(): void {
        // 由父级管理 root 节点
    }
}
