/**
 * 战斗动作特效模块
 * 
 * 职责：
 * - 攻击特效（能量球飞行 + 命中爆发）
 * - 伤害特效（红色粒子爆发 + 伤害数字）
 * - 治疗特效（绿色上升粒子 + 治疗数字）
 * - 抽卡特效（卡牌光效飞行）
 * 
 * 模块: client/render/battle/effects
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import {
    Scene,
    Vector3,
    Color3,
    Color4,
    ParticleSystem,
    Mesh,
    MeshBuilder,
    TransformNode,
    StandardMaterial,
} from '@babylonjs/core';
import { ClVisualEffectManager } from './cl_visual_effects';

// =============================================================================
// 战斗动作特效配置
// =============================================================================

export const CL_COMBAT_EFFECT_CONFIG = {
    // 攻击特效
    ATTACK_COLOR: new Color4(1, 0.6, 0.2, 1),
    ATTACK_TRAIL_COUNT: 50,
    ATTACK_DURATION: 0.4,
    
    // 伤害特效
    DAMAGE_COLOR: new Color4(1, 0.2, 0.2, 1),
    DAMAGE_PARTICLE_COUNT: 30,
    DAMAGE_DURATION: 0.6,
    
    // 治疗特效
    HEAL_COLOR: new Color4(0.2, 1, 0.4, 1),
    HEAL_PARTICLE_COUNT: 25,
    HEAL_DURATION: 1.0,
    
    // 抽卡特效
    DRAW_CARD_COLOR: new Color4(0.8, 0.9, 1, 1),
    DRAW_CARD_DURATION: 0.3,
};

// =============================================================================
// 战斗动作特效管理器
// =============================================================================

export class ClCombatEffectManager {
    private scene: Scene;
    private root: TransformNode;
    private visualEffects: ClVisualEffectManager;

    constructor(scene: Scene, root: TransformNode) {
        this.scene = scene;
        this.root = root;
        this.visualEffects = new ClVisualEffectManager(scene);
    }

    // =========================================================================
    // 攻击特效
    // =========================================================================

    /**
     * 播放攻击特效 - 能量球从攻击者飞向目标
     */
    playAttackEffect(from: Vector3, to: Vector3): void {
        const config = CL_COMBAT_EFFECT_CONFIG;
        
        // 创建能量球
        const projectile = MeshBuilder.CreateSphere('attackProjectile', { diameter: 0.3 }, this.scene);
        projectile.position = from.clone();
        projectile.parent = this.root;
        
        // 发光材质
        const mat = new StandardMaterial('attackMat', this.scene);
        mat.emissiveColor = new Color3(config.ATTACK_COLOR.r, config.ATTACK_COLOR.g, config.ATTACK_COLOR.b);
        mat.disableLighting = true;
        projectile.material = mat;
        
        // 创建拖尾粒子
        const trail = new ParticleSystem('attackTrail', config.ATTACK_TRAIL_COUNT, this.scene);
        this.setupTrailParticles(trail, projectile, config.ATTACK_COLOR);
        trail.start();
        
        // 飞行动画
        this.animateProjectile(projectile, trail, mat, from, to, config.ATTACK_DURATION);
    }

    /**
     * 设置拖尾粒子系统
     */
    private setupTrailParticles(particles: ParticleSystem, emitter: Mesh, color: Color4): void {
        particles.emitter = emitter;
        particles.minEmitBox = Vector3.Zero();
        particles.maxEmitBox = Vector3.Zero();
        particles.color1 = color;
        particles.color2 = color.scale(0.5);
        particles.colorDead = new Color4(color.r, color.g, color.b, 0);
        particles.minSize = 0.1;
        particles.maxSize = 0.2;
        particles.minLifeTime = 0.1;
        particles.maxLifeTime = 0.2;
        particles.emitRate = 100;
        particles.direction1 = new Vector3(-0.5, -0.5, -0.5);
        particles.direction2 = new Vector3(0.5, 0.5, 0.5);
        particles.minEmitPower = 0.5;
        particles.maxEmitPower = 1;
    }

    /**
     * 动画能量球飞行
     */
    private animateProjectile(
        projectile: Mesh,
        trail: ParticleSystem,
        mat: StandardMaterial,
        from: Vector3,
        to: Vector3,
        duration: number
    ): void {
        const durationMs = duration * 1000;
        const startTime = performance.now();
        
        const animate = () => {
            const elapsed = performance.now() - startTime;
            const t = Math.min(elapsed / durationMs, 1);
            
            // 缓动函数 (ease-out)
            const easeT = 1 - Math.pow(1 - t, 3);
            projectile.position = Vector3.Lerp(from, to, easeT);
            
            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                // 到达目标 - 播放命中效果
                this.playImpactEffect(to, CL_COMBAT_EFFECT_CONFIG.ATTACK_COLOR);
                
                // 清理
                trail.stop();
                setTimeout(() => {
                    trail.dispose();
                    projectile.dispose();
                    mat.dispose();
                }, 300);
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * 播放命中爆发效果
     */
    playImpactEffect(position: Vector3, color: Color4): void {
        const impact = new ParticleSystem('impact', 50, this.scene);
        
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
        impact.minSize = 0.1;
        impact.maxSize = 0.3;
        impact.minLifeTime = 0.2;
        impact.maxLifeTime = 0.4;
        impact.direction1 = new Vector3(-1, -1, -1);
        impact.direction2 = new Vector3(1, 1, 1);
        impact.minEmitPower = 2;
        impact.maxEmitPower = 4;
        impact.gravity = Vector3.Zero();
        
        impact.manualEmitCount = 50;
        impact.start();
        
        // 清理
        setTimeout(() => {
            impact.dispose();
            emitter.dispose();
        }, 500);
    }

    // =========================================================================
    // 伤害特效
    // =========================================================================

    /**
     * 播放伤害特效 - 红色粒子爆发 + 伤害数字
     */
    playDamageEffect(position: Vector3, amount: number): void {
        const config = CL_COMBAT_EFFECT_CONFIG;
        
        // 创建伤害粒子
        const damage = new ParticleSystem('damageEffect', config.DAMAGE_PARTICLE_COUNT, this.scene);
        
        const emitter = MeshBuilder.CreateSphere('damageEmitter', { diameter: 0.01 }, this.scene);
        emitter.position = position;
        emitter.parent = this.root;
        emitter.isVisible = false;
        damage.emitter = emitter;
        
        this.setupDamageParticles(damage, config);
        
        // 短促爆发
        damage.manualEmitCount = config.DAMAGE_PARTICLE_COUNT;
        damage.start();
        
        // 显示伤害数字
        this.visualEffects.showDamage(position, amount);
        
        // 屏幕震动效果 (轻微)
        this.visualEffects.shakeCameraLight();
        
        // 清理
        setTimeout(() => {
            damage.dispose();
            emitter.dispose();
        }, config.DAMAGE_DURATION * 1000);
    }

    /**
     * 设置伤害粒子参数
     */
    private setupDamageParticles(particles: ParticleSystem, config: typeof CL_COMBAT_EFFECT_CONFIG): void {
        particles.minEmitBox = Vector3.Zero();
        particles.maxEmitBox = Vector3.Zero();
        
        // 颜色 - 红色到橙色
        particles.color1 = config.DAMAGE_COLOR;
        particles.color2 = new Color4(1, 0.4, 0.1, 1);
        particles.colorDead = new Color4(0.5, 0, 0, 0);
        
        // 大小
        particles.minSize = 0.08;
        particles.maxSize = 0.2;
        
        // 生命周期
        particles.minLifeTime = 0.3;
        particles.maxLifeTime = 0.5;
        
        // 爆发式发射
        particles.direction1 = new Vector3(-1, 0.5, -1);
        particles.direction2 = new Vector3(1, 1.5, 1);
        particles.minEmitPower = 3;
        particles.maxEmitPower = 5;
        
        // 重力
        particles.gravity = new Vector3(0, -8, 0);
    }

    // =========================================================================
    // 治疗特效
    // =========================================================================

    /**
     * 播放治疗特效 - 绿色上升粒子 + 治疗数字
     */
    playHealEffect(position: Vector3, amount: number): void {
        const config = CL_COMBAT_EFFECT_CONFIG;
        
        // 创建治疗粒子
        const heal = new ParticleSystem('healEffect', config.HEAL_PARTICLE_COUNT, this.scene);
        
        const emitter = MeshBuilder.CreateSphere('healEmitter', { diameter: 0.01 }, this.scene);
        emitter.position = position;
        emitter.parent = this.root;
        emitter.isVisible = false;
        heal.emitter = emitter;
        
        this.setupHealParticles(heal, config);
        
        heal.emitRate = 30;
        heal.targetStopDuration = config.HEAL_DURATION * 0.5;
        heal.start();
        
        // 显示治疗数字
        this.visualEffects.showHeal(position, amount);
        
        // 清理
        setTimeout(() => {
            heal.dispose();
            emitter.dispose();
        }, config.HEAL_DURATION * 1000 + 500);
    }

    /**
     * 设置治疗粒子参数
     */
    private setupHealParticles(particles: ParticleSystem, config: typeof CL_COMBAT_EFFECT_CONFIG): void {
        // 发射范围 (圆形区域)
        particles.minEmitBox = new Vector3(-0.5, 0, -0.5);
        particles.maxEmitBox = new Vector3(0.5, 0, 0.5);
        
        // 颜色 - 绿色渐变
        particles.color1 = config.HEAL_COLOR;
        particles.color2 = new Color4(0.4, 1, 0.6, 0.8);
        particles.colorDead = new Color4(0.2, 1, 0.4, 0);
        
        // 大小
        particles.minSize = 0.1;
        particles.maxSize = 0.25;
        
        // 生命周期
        particles.minLifeTime = 0.8;
        particles.maxLifeTime = 1.2;
        
        // 向上发射
        particles.direction1 = new Vector3(-0.2, 1, -0.2);
        particles.direction2 = new Vector3(0.2, 1, 0.2);
        particles.minEmitPower = 1;
        particles.maxEmitPower = 2;
        
        // 轻微反重力效果
        particles.gravity = new Vector3(0, 0.5, 0);
    }

    // =========================================================================
    // 抽卡特效
    // =========================================================================

    /**
     * 播放卡牌抽取特效 - 光效飞行
     */
    playDrawCardEffect(from: Vector3, to: Vector3): void {
        const config = CL_COMBAT_EFFECT_CONFIG;
        
        // 创建卡牌光效
        const card = MeshBuilder.CreatePlane('drawCardEffect', { width: 0.5, height: 0.7 }, this.scene);
        card.position = from.clone();
        card.parent = this.root;
        card.billboardMode = Mesh.BILLBOARDMODE_ALL;
        
        // 发光材质
        const mat = new StandardMaterial('drawCardMat', this.scene);
        mat.emissiveColor = new Color3(
            config.DRAW_CARD_COLOR.r, 
            config.DRAW_CARD_COLOR.g, 
            config.DRAW_CARD_COLOR.b
        );
        mat.disableLighting = true;
        mat.alpha = 0.8;
        card.material = mat;
        
        // 拖尾粒子
        const trail = new ParticleSystem('cardTrail', 30, this.scene);
        this.setupCardTrailParticles(trail, card, config.DRAW_CARD_COLOR);
        trail.start();
        
        // 飞行动画
        this.animateCard(card, trail, mat, from, to, config.DRAW_CARD_DURATION);
    }

    /**
     * 设置卡牌拖尾粒子
     */
    private setupCardTrailParticles(particles: ParticleSystem, emitter: Mesh, color: Color4): void {
        particles.emitter = emitter;
        particles.minEmitBox = Vector3.Zero();
        particles.maxEmitBox = Vector3.Zero();
        particles.color1 = color;
        particles.color2 = new Color4(0.6, 0.7, 1, 0.5);
        particles.colorDead = new Color4(0.5, 0.6, 1, 0);
        particles.minSize = 0.05;
        particles.maxSize = 0.15;
        particles.minLifeTime = 0.1;
        particles.maxLifeTime = 0.2;
        particles.emitRate = 60;
    }

    /**
     * 动画卡牌飞行
     */
    private animateCard(
        card: Mesh,
        trail: ParticleSystem,
        mat: StandardMaterial,
        from: Vector3,
        to: Vector3,
        duration: number
    ): void {
        const durationMs = duration * 1000;
        const startTime = performance.now();
        
        const animate = () => {
            const elapsed = performance.now() - startTime;
            const t = Math.min(elapsed / durationMs, 1);
            
            // 抛物线轨迹
            const easeT = 1 - Math.pow(1 - t, 2);
            const arcHeight = 1.5 * Math.sin(t * Math.PI);
            
            const pos = Vector3.Lerp(from, to, easeT);
            pos.y += arcHeight;
            card.position = pos;
            
            // 旋转效果
            card.rotation.z = t * Math.PI * 2;
            
            // 缩放淡入淡出
            const scale = t < 0.5 ? t * 2 : 2 - t * 2;
            card.scaling.setAll(0.5 + scale * 0.5);
            
            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                // 到达手牌 - 闪烁效果
                this.playImpactEffect(to, CL_COMBAT_EFFECT_CONFIG.DRAW_CARD_COLOR);
                
                // 清理
                trail.stop();
                setTimeout(() => {
                    trail.dispose();
                    card.dispose();
                    mat.dispose();
                }, 200);
            }
        };
        
        requestAnimationFrame(animate);
    }

    // =========================================================================
    // 暴击特效
    // =========================================================================

    /**
     * 播放暴击特效 - 加强版伤害效果
     */
    playCriticalEffect(position: Vector3, amount: number): void {
        // 双倍粒子
        this.playDamageEffect(position, amount);
        
        // 额外的闪烁
        this.playImpactEffect(position, new Color4(1, 1, 0, 1));
        
        // 更强烈的屏幕震动
        this.visualEffects.shakeCameraHeavy();
        
        // 暴击闪烁
        this.visualEffects.flashCritical();
    }

    /**
     * 获取视觉效果管理器（用于外部访问）
     */
    getVisualEffects(): ClVisualEffectManager {
        return this.visualEffects;
    }

    /**
     * 销毁
     */
    dispose(): void {
        // ClVisualEffectManager 不需要 dispose，它只使用 DOM 和 Scene 对象
    }
}
