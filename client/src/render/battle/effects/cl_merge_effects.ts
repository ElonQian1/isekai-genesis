/**
 * 合成升星特效模块
 * 
 * 职责：
 * - 3合1合成动画（怪兽聚拢 + 光效爆发）
 * - 星级提升特效（★图标上浮）
 * - 金色单位特效（金光环绕 + 闪烁）
 * - 高级金色强化特效（更强烈光效 + 拖尾）
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
    Animation,
    EasingFunction,
    QuadraticEase,
    Texture,
    GlowLayer,
    AbstractMesh,
} from '@babylonjs/core';

// =============================================================================
// 合成特效配置
// =============================================================================

export const CL_MERGE_EFFECT_CONFIG = {
    // 聚拢动画
    CONVERGE_DURATION_MS: 600,
    CONVERGE_HEIGHT_OFFSET: 0.5,
    
    // 爆发光效
    BURST_COLOR_NORMAL: new Color4(1, 0.9, 0.3, 1),      // 普通升星：金黄色
    BURST_COLOR_GOLDEN: new Color4(1, 0.75, 0, 1),       // 金色单位：纯金色
    BURST_COLOR_ENHANCED: new Color4(1, 0.5, 0.8, 1),    // 高级金色：粉金色
    BURST_PARTICLE_COUNT: 100,
    BURST_DURATION_MS: 400,
    
    // 星级图标
    STAR_FLOAT_HEIGHT: 1.5,
    STAR_FLOAT_DURATION_MS: 800,
    STAR_SIZE: 0.3,
    STAR_COLOR: new Color3(1, 0.85, 0),
    
    // 金色光环
    GOLDEN_AURA_INTENSITY: 2.0,
    GOLDEN_PULSE_SPEED: 2.0,
    
    // 高级金色拖尾
    TRAIL_PARTICLE_COUNT: 30,
    TRAIL_LIFETIME: 0.8,
};

// =============================================================================
// 合成特效管理器
// =============================================================================

export class ClMergeEffectManager {
    private scene: Scene;
    private root: TransformNode;
    private glowLayer: GlowLayer | null = null;
    private activeEffects: Map<string, TransformNode> = new Map();

    constructor(scene: Scene, root: TransformNode) {
        this.scene = scene;
        this.root = root;
        
        // 初始化辉光层
        this.initGlowLayer();
    }

    // =========================================================================
    // 初始化
    // =========================================================================

    private initGlowLayer(): void {
        this.glowLayer = new GlowLayer('mergeGlow', this.scene);
        this.glowLayer.intensity = 0.5;
    }

    // =========================================================================
    // 主要合成动画
    // =========================================================================

    /**
     * 播放完整合成动画
     * @param sourcePositions 3个源怪兽的位置
     * @param targetPosition 合成结果的目标位置
     * @param newStar 合成后的星级 (2, 3, 或 golden level)
     * @param isGolden 是否是金色单位
     * @param goldenLevel 金色等级 (0=非金色, 1+=金色强化次数)
     */
    async playMergeAnimation(
        sourcePositions: Vector3[],
        targetPosition: Vector3,
        newStar: number,
        isGolden: boolean,
        goldenLevel: number = 0
    ): Promise<void> {
        const config = CL_MERGE_EFFECT_CONFIG;
        
        // 阶段1: 创建聚拢特效节点
        const convergeEffects = await this.playConvergePhase(sourcePositions, targetPosition);
        
        // 阶段2: 爆发光效
        await this.playBurstPhase(targetPosition, isGolden, goldenLevel);
        
        // 阶段3: 星级提升特效
        await this.playStarUpgradePhase(targetPosition, newStar, isGolden);
        
        // 阶段4: 金色光环（如果是金色单位）
        if (isGolden) {
            this.startGoldenAura(targetPosition, goldenLevel);
        }
        
        // 清理临时特效
        convergeEffects.forEach(effect => effect.dispose());
    }

    // =========================================================================
    // 阶段1: 聚拢动画
    // =========================================================================

    /**
     * 播放怪兽聚拢动画
     */
    private playConvergePhase(
        sourcePositions: Vector3[],
        targetPosition: Vector3
    ): Promise<TransformNode[]> {
        const config = CL_MERGE_EFFECT_CONFIG;
        
        return new Promise((resolve) => {
            const effects: TransformNode[] = [];
            
            sourcePositions.forEach((pos, index) => {
                // 创建光球代表怪兽
                const orb = this.createMergeOrb(pos, index);
                effects.push(orb);
                
                // 创建聚拢动画
                const animation = new Animation(
                    `converge_${index}`,
                    'position',
                    60,
                    Animation.ANIMATIONTYPE_VECTOR3,
                    Animation.ANIMATIONLOOPMODE_CONSTANT
                );
                
                // 添加抛物线路径
                const midPoint = Vector3.Lerp(pos, targetPosition, 0.5);
                midPoint.y += config.CONVERGE_HEIGHT_OFFSET;
                
                const keyframes = [
                    { frame: 0, value: pos },
                    { frame: 18, value: midPoint },
                    { frame: 36, value: targetPosition },
                ];
                animation.setKeys(keyframes);
                
                // 缓动函数
                const easing = new QuadraticEase();
                easing.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
                animation.setEasingFunction(easing);
                
                orb.animations.push(animation);
                this.scene.beginAnimation(orb, 0, 36, false);
            });
            
            // 等待动画完成
            setTimeout(() => resolve(effects), config.CONVERGE_DURATION_MS);
        });
    }

    /**
     * 创建合成光球
     */
    private createMergeOrb(position: Vector3, index: number): TransformNode {
        const orb = MeshBuilder.CreateSphere(`mergeOrb_${index}`, { diameter: 0.4 }, this.scene);
        orb.position = position.clone();
        orb.parent = this.root;
        
        // 发光材质
        const mat = new StandardMaterial(`mergeOrbMat_${index}`, this.scene);
        const burstColor = CL_MERGE_EFFECT_CONFIG.BURST_COLOR_NORMAL;
        mat.emissiveColor = new Color3(burstColor.r, burstColor.g, burstColor.b);
        mat.disableLighting = true;
        mat.alpha = 0.8;
        orb.material = mat;
        
        // 添加到辉光层
        if (this.glowLayer) {
            this.glowLayer.addIncludedOnlyMesh(orb);
        }
        
        // 添加拖尾粒子
        this.attachTrailParticles(orb);
        
        return orb;
    }

    /**
     * 附加拖尾粒子
     */
    private attachTrailParticles(orb: Mesh): ParticleSystem {
        const config = CL_MERGE_EFFECT_CONFIG;
        
        const particles = new ParticleSystem('mergeTrail', config.TRAIL_PARTICLE_COUNT, this.scene);
        particles.emitter = orb;
        particles.minEmitBox = new Vector3(0, 0, 0);
        particles.maxEmitBox = new Vector3(0, 0, 0);
        
        // 颜色
        particles.color1 = config.BURST_COLOR_NORMAL;
        particles.color2 = new Color4(1, 1, 1, 0.5);
        particles.colorDead = new Color4(1, 0.8, 0.3, 0);
        
        // 大小
        particles.minSize = 0.05;
        particles.maxSize = 0.15;
        
        // 生命周期
        particles.minLifeTime = 0.2;
        particles.maxLifeTime = config.TRAIL_LIFETIME;
        
        // 发射速度
        particles.minEmitPower = 0.1;
        particles.maxEmitPower = 0.3;
        particles.emitRate = 30;
        
        // 重力
        particles.gravity = new Vector3(0, -0.5, 0);
        
        particles.start();
        return particles;
    }

    // =========================================================================
    // 阶段2: 爆发光效
    // =========================================================================

    /**
     * 播放爆发光效
     */
    private playBurstPhase(
        position: Vector3,
        isGolden: boolean,
        goldenLevel: number
    ): Promise<void> {
        const config = CL_MERGE_EFFECT_CONFIG;
        
        return new Promise((resolve) => {
            // 选择颜色
            let burstColor: Color4;
            if (!isGolden) {
                burstColor = config.BURST_COLOR_NORMAL;
            } else if (goldenLevel <= 1) {
                burstColor = config.BURST_COLOR_GOLDEN;
            } else {
                burstColor = config.BURST_COLOR_ENHANCED;
            }
            
            // 创建爆发粒子系统
            const burst = new ParticleSystem('mergeBurst', config.BURST_PARTICLE_COUNT, this.scene);
            burst.emitter = position.clone();
            burst.minEmitBox = new Vector3(-0.1, -0.1, -0.1);
            burst.maxEmitBox = new Vector3(0.1, 0.1, 0.1);
            
            // 颜色
            burst.color1 = burstColor;
            burst.color2 = new Color4(1, 1, 1, 1);
            burst.colorDead = new Color4(burstColor.r, burstColor.g, burstColor.b, 0);
            
            // 大小
            burst.minSize = 0.1;
            burst.maxSize = 0.4;
            
            // 生命周期
            burst.minLifeTime = 0.3;
            burst.maxLifeTime = 0.6;
            
            // 发射 - 向外爆发
            burst.minEmitPower = 2;
            burst.maxEmitPower = 5;
            burst.emitRate = 200;
            burst.direction1 = new Vector3(-1, -1, -1);
            burst.direction2 = new Vector3(1, 1, 1);
            
            // 手动发射一次性爆发
            burst.manualEmitCount = config.BURST_PARTICLE_COUNT;
            burst.start();
            
            // 创建闪光球
            this.createFlashOrb(position, burstColor, goldenLevel);
            
            // 停止并清理
            setTimeout(() => {
                burst.stop();
                setTimeout(() => burst.dispose(), 1000);
                resolve();
            }, config.BURST_DURATION_MS);
        });
    }

    /**
     * 创建中心闪光球
     */
    private createFlashOrb(position: Vector3, color: Color4, goldenLevel: number): void {
        const orb = MeshBuilder.CreateSphere('flashOrb', { diameter: 0.8 }, this.scene);
        orb.position = position.clone();
        orb.parent = this.root;
        
        const mat = new StandardMaterial('flashMat', this.scene);
        mat.emissiveColor = new Color3(color.r, color.g, color.b);
        mat.disableLighting = true;
        mat.alpha = 0.9;
        orb.material = mat;
        
        if (this.glowLayer) {
            this.glowLayer.addIncludedOnlyMesh(orb);
        }
        
        // 缩放动画（爆发后消失）
        const scaleAnim = new Animation(
            'flashScale',
            'scaling',
            60,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        const maxScale = 1.5 + goldenLevel * 0.3; // 金色等级越高，爆发越大
        scaleAnim.setKeys([
            { frame: 0, value: new Vector3(0.5, 0.5, 0.5) },
            { frame: 6, value: new Vector3(maxScale, maxScale, maxScale) },
            { frame: 18, value: new Vector3(0, 0, 0) },
        ]);
        
        orb.animations.push(scaleAnim);
        this.scene.beginAnimation(orb, 0, 18, false, 1, () => {
            orb.dispose();
        });
    }

    // =========================================================================
    // 阶段3: 星级提升特效
    // =========================================================================

    /**
     * 播放星级提升特效
     */
    private playStarUpgradePhase(
        position: Vector3,
        newStar: number,
        isGolden: boolean
    ): Promise<void> {
        const config = CL_MERGE_EFFECT_CONFIG;
        
        return new Promise((resolve) => {
            // 创建星星图标
            const starCount = isGolden ? 3 : newStar;
            
            for (let i = 0; i < starCount; i++) {
                const delay = i * 100;
                
                setTimeout(() => {
                    this.createFloatingStar(
                        position,
                        i - (starCount - 1) / 2,
                        isGolden
                    );
                }, delay);
            }
            
            // 金色单位额外显示金色标记
            if (isGolden) {
                setTimeout(() => {
                    this.createGoldenLabel(position);
                }, starCount * 100);
            }
            
            setTimeout(resolve, config.STAR_FLOAT_DURATION_MS);
        });
    }

    /**
     * 创建上浮的星星
     */
    private createFloatingStar(position: Vector3, offsetX: number, isGolden: boolean): void {
        const config = CL_MERGE_EFFECT_CONFIG;
        
        // 使用扁平球体模拟星星
        const star = MeshBuilder.CreateSphere('star', { diameter: config.STAR_SIZE }, this.scene);
        star.position = position.clone();
        star.position.x += offsetX * 0.4;
        star.parent = this.root;
        
        // 材质
        const mat = new StandardMaterial('starMat', this.scene);
        mat.emissiveColor = isGolden 
            ? new Color3(1, 0.7, 0) 
            : config.STAR_COLOR;
        mat.disableLighting = true;
        star.material = mat;
        
        if (this.glowLayer) {
            this.glowLayer.addIncludedOnlyMesh(star);
        }
        
        // 上浮动画
        const floatAnim = new Animation(
            'starFloat',
            'position.y',
            60,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        floatAnim.setKeys([
            { frame: 0, value: position.y },
            { frame: 30, value: position.y + config.STAR_FLOAT_HEIGHT },
            { frame: 48, value: position.y + config.STAR_FLOAT_HEIGHT + 0.2 },
        ]);
        
        // 透明度动画
        const alphaAnim = new Animation(
            'starAlpha',
            'material.alpha',
            60,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        alphaAnim.setKeys([
            { frame: 0, value: 1 },
            { frame: 30, value: 1 },
            { frame: 48, value: 0 },
        ]);
        
        star.animations.push(floatAnim, alphaAnim);
        this.scene.beginAnimation(star, 0, 48, false, 1, () => {
            star.dispose();
        });
    }

    /**
     * 创建金色标签
     */
    private createGoldenLabel(position: Vector3): void {
        // 创建 "GOLDEN" 文字特效（使用 HTML overlay）
        const div = document.createElement('div');
        div.textContent = '✦ GOLDEN ✦';
        div.style.cssText = `
            position: fixed;
            font-size: 18px;
            font-weight: bold;
            color: #FFD700;
            text-shadow: 0 0 10px #FFD700, 0 0 20px #FFA500;
            pointer-events: none;
            z-index: 1000;
            transition: transform 1s ease-out, opacity 1s ease-out;
        `;
        
        // 转换3D位置到屏幕位置
        const screenPos = this.worldToScreen(position);
        div.style.left = `${screenPos.x - 50}px`;
        div.style.top = `${screenPos.y - 60}px`;
        
        document.body.appendChild(div);
        
        // 动画
        requestAnimationFrame(() => {
            div.style.transform = 'translateY(-30px) scale(1.2)';
            div.style.opacity = '0';
        });
        
        // 清理
        setTimeout(() => div.remove(), 1000);
    }

    // =========================================================================
    // 阶段4: 金色光环
    // =========================================================================

    /**
     * 为金色单位启动持续光环效果
     */
    startGoldenAura(position: Vector3, goldenLevel: number): void {
        const config = CL_MERGE_EFFECT_CONFIG;
        const effectId = `golden_${Date.now()}`;
        
        // 创建光环容器（使用不可见球体作为发射器）
        const auraEmitter = MeshBuilder.CreateSphere(effectId, { diameter: 0.1 }, this.scene);
        auraEmitter.position = position.clone();
        auraEmitter.parent = this.root;
        auraEmitter.isVisible = false;
        
        // 创建环绕粒子
        const auraParticles = new ParticleSystem('goldenAura', 50, this.scene);
        auraParticles.emitter = auraEmitter;
        
        // 圆形发射
        auraParticles.createCylinderEmitter(0.6, 0.1, 0, 0);
        
        // 颜色 - 根据金色等级调整
        const intensity = 1 + goldenLevel * 0.2;
        auraParticles.color1 = new Color4(1 * intensity, 0.8 * intensity, 0, 0.8);
        auraParticles.color2 = new Color4(1, 0.9, 0.5, 0.6);
        auraParticles.colorDead = new Color4(1, 0.7, 0, 0);
        
        // 大小
        auraParticles.minSize = 0.05;
        auraParticles.maxSize = 0.12 + goldenLevel * 0.02;
        
        // 生命周期
        auraParticles.minLifeTime = 0.5;
        auraParticles.maxLifeTime = 1.0;
        
        // 向上漂浮
        auraParticles.minEmitPower = 0.2;
        auraParticles.maxEmitPower = 0.5;
        auraParticles.direction1 = new Vector3(-0.2, 1, -0.2);
        auraParticles.direction2 = new Vector3(0.2, 1, 0.2);
        
        auraParticles.emitRate = 15 + goldenLevel * 5;
        auraParticles.start();
        
        this.activeEffects.set(effectId, auraEmitter);
    }

    /**
     * 停止金色光环
     */
    stopGoldenAura(effectId: string): void {
        const effect = this.activeEffects.get(effectId);
        if (effect) {
            effect.dispose();
            this.activeEffects.delete(effectId);
        }
    }

    // =========================================================================
    // 工具方法
    // =========================================================================

    /**
     * 3D 世界坐标转屏幕坐标
     */
    private worldToScreen(position: Vector3): { x: number; y: number } {
        const engine = this.scene.getEngine();
        const camera = this.scene.activeCamera;
        
        if (!camera) {
            return { x: 0, y: 0 };
        }
        
        const viewport = camera.viewport.toGlobal(
            engine.getRenderWidth(),
            engine.getRenderHeight()
        );
        const screenPos = Vector3.Project(
            position,
            camera.getWorldMatrix(),
            this.scene.getTransformMatrix(),
            viewport
        );
        
        return { x: screenPos.x, y: screenPos.y };
    }

    // =========================================================================
    // 快捷方法
    // =========================================================================

    /**
     * 播放1★升2★动画
     */
    async playUpgradeTo2Star(
        sourcePositions: Vector3[],
        targetPosition: Vector3
    ): Promise<void> {
        await this.playMergeAnimation(sourcePositions, targetPosition, 2, false, 0);
    }

    /**
     * 播放2★升3★动画
     */
    async playUpgradeTo3Star(
        sourcePositions: Vector3[],
        targetPosition: Vector3
    ): Promise<void> {
        await this.playMergeAnimation(sourcePositions, targetPosition, 3, false, 0);
    }

    /**
     * 播放3★升金色动画
     */
    async playUpgradeToGolden(
        sourcePositions: Vector3[],
        targetPosition: Vector3,
        goldenLevel: number = 1
    ): Promise<void> {
        await this.playMergeAnimation(sourcePositions, targetPosition, 3, true, goldenLevel);
    }

    // =========================================================================
    // 清理
    // =========================================================================

    dispose(): void {
        // 清理所有活动特效
        this.activeEffects.forEach(effect => effect.dispose());
        this.activeEffects.clear();
        
        // 清理辉光层
        if (this.glowLayer) {
            this.glowLayer.dispose();
            this.glowLayer = null;
        }
    }
}

// =============================================================================
// 导出类型
// =============================================================================

export interface ClMergeAnimationOptions {
    sourcePositions: Vector3[];
    targetPosition: Vector3;
    newStar: number;
    isGolden: boolean;
    goldenLevel?: number;
}
