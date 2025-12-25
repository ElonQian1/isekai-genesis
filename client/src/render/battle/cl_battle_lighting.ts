/**
 * 战斗场景光照模块
 * 
 * 模块: client/render/battle
 * 前缀: Cl
 * 职责: 管理战斗场景的光照、阴影和辉光效果
 */

import {
    Scene,
    Vector3,
    Color3,
    HemisphericLight,
    DirectionalLight,
    ShadowGenerator,
    GlowLayer,
    AbstractMesh,
} from '@babylonjs/core';

// =============================================================================
// 光照配置
// =============================================================================

export const CL_BATTLE_LIGHTING_CONFIG = {
    // 环境光
    AMBIENT_INTENSITY: 0.5,
    AMBIENT_GROUND_COLOR: new Color3(0.2, 0.2, 0.3),
    
    // 主光源
    MAIN_LIGHT_DIRECTION: new Vector3(-0.5, -1, 0.5),
    MAIN_LIGHT_POSITION: new Vector3(5, 10, -5),
    MAIN_LIGHT_INTENSITY: 0.8,
    
    // 阴影
    SHADOW_MAP_SIZE: 1024,
    SHADOW_BLUR_SCALE: 2,
    
    // 辉光
    GLOW_INTENSITY: 0.8,
};

// =============================================================================
// 战斗光照管理器
// =============================================================================

export class ClBattleLighting {
    // 光源
    private ambientLight: HemisphericLight;
    private mainLight: DirectionalLight;
    
    // 效果
    private shadowGenerator: ShadowGenerator;
    private glowLayer: GlowLayer;

    constructor(scene: Scene) {
        const config = CL_BATTLE_LIGHTING_CONFIG;
        
        // 环境光
        this.ambientLight = new HemisphericLight(
            'battleAmbientLight',
            new Vector3(0, 1, 0),
            scene
        );
        this.ambientLight.intensity = config.AMBIENT_INTENSITY;
        this.ambientLight.groundColor = config.AMBIENT_GROUND_COLOR;
        
        // 主光源 (带阴影)
        this.mainLight = new DirectionalLight(
            'battleMainLight',
            config.MAIN_LIGHT_DIRECTION,
            scene
        );
        this.mainLight.intensity = config.MAIN_LIGHT_INTENSITY;
        this.mainLight.position = config.MAIN_LIGHT_POSITION;
        
        // 阴影生成器
        this.shadowGenerator = new ShadowGenerator(
            config.SHADOW_MAP_SIZE,
            this.mainLight
        );
        this.shadowGenerator.useBlurExponentialShadowMap = true;
        this.shadowGenerator.blurScale = config.SHADOW_BLUR_SCALE;
        
        // 辉光层
        this.glowLayer = new GlowLayer('battleGlowLayer', scene);
        this.glowLayer.intensity = config.GLOW_INTENSITY;
    }

    /**
     * 添加阴影投射者
     */
    addShadowCaster(mesh: AbstractMesh): void {
        this.shadowGenerator.addShadowCaster(mesh);
    }

    /**
     * 移除阴影投射者
     */
    removeShadowCaster(mesh: AbstractMesh): void {
        this.shadowGenerator.removeShadowCaster(mesh);
    }

    /**
     * 设置辉光强度
     */
    setGlowIntensity(intensity: number): void {
        this.glowLayer.intensity = intensity;
    }

    /**
     * 获取阴影生成器
     */
    getShadowGenerator(): ShadowGenerator {
        return this.shadowGenerator;
    }

    /**
     * 获取辉光层
     */
    getGlowLayer(): GlowLayer {
        return this.glowLayer;
    }

    /**
     * 设置光照强度 (用于场景过渡)
     */
    setIntensity(factor: number): void {
        const config = CL_BATTLE_LIGHTING_CONFIG;
        this.ambientLight.intensity = config.AMBIENT_INTENSITY * factor;
        this.mainLight.intensity = config.MAIN_LIGHT_INTENSITY * factor;
    }

    /**
     * 启用/禁用
     */
    setEnabled(enabled: boolean): void {
        this.ambientLight.setEnabled(enabled);
        this.mainLight.setEnabled(enabled);
        this.glowLayer.isEnabled = enabled;
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.shadowGenerator.dispose();
        this.glowLayer.dispose();
        this.mainLight.dispose();
        this.ambientLight.dispose();
    }
}
