/**
 * 后处理效果系统 - SSAO、HDR、Bloom、色调映射
 * 
 * 模块: client/render/world/effects
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责：
 * - SSAO（屏幕空间环境光遮蔽）
 * - HDR（高动态范围）
 * - Bloom（泛光）
 * - Tone Mapping（色调映射）
 * - Color Grading（调色）
 */

import {
    Scene,
    DefaultRenderingPipeline,
    SSAO2RenderingPipeline,
    Camera,
} from '@babylonjs/core';

/**
 * 后处理效果质量级别
 */
export enum PostProcessingQuality {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    ULTRA = 'ultra',
}

/**
 * 后处理效果系统
 */
export class ClPostProcessing {
    private scene: Scene;
    private camera: Camera;
    
    private pipeline: DefaultRenderingPipeline | null = null;
    private ssaoPipeline: SSAO2RenderingPipeline | null = null;
    
    private currentQuality: PostProcessingQuality = PostProcessingQuality.HIGH;
    
    constructor(scene: Scene, camera: Camera) {
        this.scene = scene;
        this.camera = camera;
    }
    
    /**
     * 初始化后处理管线
     */
    async init(quality: PostProcessingQuality = PostProcessingQuality.HIGH): Promise<void> {
        this.currentQuality = quality;
        
        this.createDefaultPipeline();
        this.createSSAOPipeline();
        this.applyQualitySettings();
        
        console.log(`✅ 后处理效果初始化完成 (${quality})`);
    }
    
    /**
     * 创建默认渲染管线
     */
    private createDefaultPipeline(): void {
        this.pipeline = new DefaultRenderingPipeline(
            'defaultPipeline',
            true, // HDR
            this.scene,
            [this.camera]
        );
        
        // 基础设置
        this.pipeline.samples = 4; // MSAA 抗锯齿
        
        // Bloom 泛光
        this.pipeline.bloomEnabled = true;
        this.pipeline.bloomThreshold = 0.8;
        this.pipeline.bloomWeight = 0.3;
        this.pipeline.bloomKernel = 64;
        this.pipeline.bloomScale = 0.5;
        
        // Tone Mapping 色调映射
        this.pipeline.imageProcessingEnabled = true;
        this.pipeline.imageProcessing.toneMappingEnabled = true;
        this.pipeline.imageProcessing.toneMappingType = 1; // ACES
        this.pipeline.imageProcessing.exposure = 1.2;
        
        // Color Grading 调色
        this.pipeline.imageProcessing.contrast = 1.2; // 增强对比度
        this.pipeline.imageProcessing.exposure = 1.1;
        this.pipeline.imageProcessing.vignetteEnabled = true;
        this.pipeline.imageProcessing.vignetteWeight = 1.5;
        this.pipeline.imageProcessing.vignetteCameraFov = 0.5;
        
        // 电影感效果
        this.pipeline.chromaticAberrationEnabled = true; // 色差
        this.pipeline.chromaticAberration.aberrationAmount = 5; // 轻微色差
        this.pipeline.chromaticAberration.radialIntensity = 0.5;
        
        this.pipeline.grainEnabled = true; // 胶片颗粒
        this.pipeline.grain.intensity = 5; // 轻微颗粒感
        this.pipeline.grain.animated = true;
        
        this.pipeline.sharpenEnabled = true; // 锐化
        this.pipeline.sharpen.edgeAmount = 0.2;
        this.pipeline.sharpen.colorAmount = 1.0;
        
        // 景深（可选）
        // this.pipeline.depthOfFieldEnabled = true;
        // this.pipeline.depthOfFieldBlurLevel = 0;
    }
    
    /**
     * 创建 SSAO 管线（屏幕空间环境光遮蔽）
     */
    private createSSAOPipeline(): void {
        this.ssaoPipeline = new SSAO2RenderingPipeline(
            'ssao',
            this.scene,
            {
                ssaoRatio: 0.75, // 提高分辨率以获得更好质量
                blurRatio: 1,
            },
            [this.camera]
        );
        
        // SSAO 参数 - 增强立体感
        this.ssaoPipeline.radius = 3.0; // 增大半径
        this.ssaoPipeline.totalStrength = 1.5; // 增强强度
        this.ssaoPipeline.base = 0.1; // 降低基础亮度
        this.ssaoPipeline.samples = 16;
        this.ssaoPipeline.maxZ = 200;
        this.ssaoPipeline.expensiveBlur = true; // 高质量模糊
    }
    
    /**
     * 应用质量设置
     */
    private applyQualitySettings(): void {
        if (!this.pipeline || !this.ssaoPipeline) return;
        
        switch (this.currentQuality) {
            case PostProcessingQuality.LOW:
                this.pipeline.samples = 1;
                this.pipeline.bloomEnabled = false;
                this.ssaoPipeline.samples = 8;
                break;
                
            case PostProcessingQuality.MEDIUM:
                this.pipeline.samples = 2;
                this.pipeline.bloomEnabled = true;
                this.pipeline.bloomKernel = 32;
                this.ssaoPipeline.samples = 12;
                break;
                
            case PostProcessingQuality.HIGH:
                this.pipeline.samples = 4;
                this.pipeline.bloomEnabled = true;
                this.pipeline.bloomKernel = 64;
                this.ssaoPipeline.samples = 16;
                break;
                
            case PostProcessingQuality.ULTRA:
                this.pipeline.samples = 8;
                this.pipeline.bloomEnabled = true;
                this.pipeline.bloomKernel = 128;
                this.ssaoPipeline.samples = 32;
                break;
        }
    }
    
    /**
     * 切换质量级别
     */
    setQuality(quality: PostProcessingQuality): void {
        this.currentQuality = quality;
        this.applyQualitySettings();
        console.log(`🎨 后处理质量切换到: ${quality}`);
    }
    
    /**
     * 启用/禁用 Bloom
     */
    setBloomEnabled(enabled: boolean): void {
        if (this.pipeline) {
            this.pipeline.bloomEnabled = enabled;
        }
    }
    
    /**
     * 启用/禁用 SSAO
     */
    setSSAOEnabled(enabled: boolean): void {
        if (this.ssaoPipeline) {
            this.ssaoPipeline.scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline(
                'ssao',
                [this.camera]
            );
            if (enabled) {
                this.ssaoPipeline.scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline(
                    'ssao',
                    [this.camera]
                );
            }
        }
    }
    
    /**
     * 调整曝光度
     */
    setExposure(value: number): void {
        if (this.pipeline?.imageProcessing) {
            this.pipeline.imageProcessing.exposure = value;
        }
    }
    
    /**
     * 清理资源
     */
    dispose(): void {
        this.pipeline?.dispose();
        this.ssaoPipeline?.dispose();
        this.pipeline = null;
        this.ssaoPipeline = null;
    }
}

export default ClPostProcessing;
