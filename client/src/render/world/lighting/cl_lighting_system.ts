/**
 * 光照系统 - 太阳光、环境光、阴影
 * 
 * 模块: client/render/world/lighting
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责：
 * - 太阳光（DirectionalLight + ShadowGenerator）
 * - 环境光（HemisphericLight）
 * - 点光源（装饰灯笼）
 * - 动态光影效果
 */

import {
    Scene,
    TransformNode,
    Vector3,
    Color3,
    HemisphericLight,
    DirectionalLight,
    PointLight,
    ShadowGenerator,
    GlowLayer,
} from '@babylonjs/core';

/**
 * 光照系统
 */
export class ClLightingSystem {
    private scene: Scene;
    private sceneRoot: TransformNode;
    
    // 光源
    private ambientLight: HemisphericLight | null = null;
    private sunLight: DirectionalLight | null = null;
    private shadowGenerator: ShadowGenerator | null = null;
    private glowLayer: GlowLayer | null = null;
    private decorativeLights: PointLight[] = [];
    
    constructor(scene: Scene, sceneRoot: TransformNode) {
        this.scene = scene;
        this.sceneRoot = sceneRoot;
    }
    
    /**
     * 初始化光照系统
     */
    async init(): Promise<void> {
        this.createAmbientLight();
        this.createSunLight();
        this.createShadowSystem();
        this.createGlowLayer();
        
        console.log('✅ 光照系统初始化完成');
    }
    
    /**
     * 创建环境光
     */
    private createAmbientLight(): void {
        // 天空环境光
        this.ambientLight = new HemisphericLight(
            'ambientLight',
            new Vector3(0, 1, 0),
            this.scene
        );
        this.ambientLight.intensity = 0.4;
        this.ambientLight.diffuse = new Color3(0.9, 0.95, 1.0); // 微蓝天光
        this.ambientLight.groundColor = new Color3(0.4, 0.3, 0.2); // 暖色地面反射
        this.ambientLight.parent = this.sceneRoot;
    }
    
    /**
     * 创建太阳光（主光源）
     */
    private createSunLight(): void {
        // 方向光模拟太阳
        this.sunLight = new DirectionalLight(
            'sunLight',
            new Vector3(-1, -2, -1), // 斜射角度
            this.scene
        );
        this.sunLight.intensity = 1.2;
        this.sunLight.diffuse = new Color3(1.0, 0.98, 0.9); // 暖白阳光
        this.sunLight.specular = new Color3(1.0, 0.95, 0.8);
        
        // 定位光源（用于阴影计算）
        this.sunLight.position = new Vector3(40, 80, 40);
        this.sunLight.parent = this.sceneRoot;
    }

    /**
     * 设置太阳光强度
     */
    public setSunIntensity(intensity: number): void {
        if (this.sunLight) {
            this.sunLight.intensity = intensity;
        }
    }

    /**
     * 设置太阳光方向
     */
    public setSunDirection(direction: Vector3): void {
        if (this.sunLight) {
            this.sunLight.direction = direction;
        }
    }

    /**
     * 获取太阳光强度
     */
    public getSunIntensity(): number {
        return this.sunLight ? this.sunLight.intensity : 0;
    }
    
    /**
     * 创建阴影系统
     */
    private createShadowSystem(): void {
        if (!this.sunLight) return;
        
        // 阴影生成器
        this.shadowGenerator = new ShadowGenerator(2048, this.sunLight);
        // 使用 PCF 软阴影 (性能较好且效果不错)
        this.shadowGenerator.usePercentageCloserFiltering = true;
        this.shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_HIGH;
        // 或者使用模糊指数阴影 (更柔和但可能漏光)
        // this.shadowGenerator.useBlurExponentialShadowMap = true;
        // this.shadowGenerator.blurKernel = 32;
        
        this.shadowGenerator.darkness = 0.3; // 柔和阴影
        this.shadowGenerator.bias = 0.00005; // 减少阴影波纹
        this.shadowGenerator.normalBias = 0.001; // 减少自我阴影伪影
    }

    /**
     * 创建辉光层 (用于自发光物体，如灯笼、魔法)
     */
    private createGlowLayer(): void {
        this.glowLayer = new GlowLayer("glow", this.scene, {
            mainTextureFixedSize: 1024,
            blurKernelSize: 64
        });
        this.glowLayer.intensity = 0.6;
    }
    
    /**
     * 添加装饰点光源（灯笼、火把等）
     */
    addDecorativeLight(position: Vector3, color: Color3 = new Color3(1, 0.8, 0.5)): PointLight {
        const light = new PointLight(
            `decorativeLight_${this.decorativeLights.length}`,
            position,
            this.scene
        );
        light.intensity = 2;
        light.range = 15;
        light.diffuse = color;
        light.parent = this.sceneRoot;
        
        this.decorativeLights.push(light);
        return light;
    }
    
    /**
     * 获取阴影生成器（供其他系统注册投影物体）
     */
    getShadowGenerator(): ShadowGenerator | null {
        return this.shadowGenerator;
    }
    
    /**
     * 动态调整光照（昼夜循环）
     */
    updateTimeOfDay(timeRatio: number): void {
        if (!this.sunLight || !this.ambientLight) return;
        
        // timeRatio: 0=午夜, 0.25=日出, 0.5=正午, 0.75=日落, 1=午夜
        
        // 太阳角度
        const angle = timeRatio * Math.PI * 2;
        this.sunLight.direction = new Vector3(
            Math.sin(angle),
            -Math.cos(angle) - 0.5,
            Math.cos(angle)
        );
        
        // 光照强度（正午最强）
        const dayFactor = Math.max(0, Math.cos(angle));
        this.sunLight.intensity = 0.5 + dayFactor * 0.7;
        this.ambientLight.intensity = 0.2 + dayFactor * 0.2;
        
        // 光照颜色（日出日落偏暖）
        const warmth = Math.abs(Math.sin(angle * 2)) * 0.3;
        this.sunLight.diffuse = new Color3(
            1.0,
            0.98 - warmth,
            0.9 - warmth * 2
        );
    }
    
    /**
     * 清理资源
     */
    dispose(): void {
        this.ambientLight?.dispose();
        this.sunLight?.dispose();
        this.shadowGenerator?.dispose();
        this.decorativeLights.forEach(light => light.dispose());
        this.decorativeLights = [];
    }
}

export default ClLightingSystem;
