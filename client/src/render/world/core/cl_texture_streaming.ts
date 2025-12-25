/**
 * 纹理流式加载器 - 渐进式纹理加载
 * 
 * 模块: client/render/world/core
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责:
 * 1. 支持 mipmap 级别的渐进加载
 * 2. 根据距离决定纹理分辨率
 * 3. 内存使用监控与自动降级
 * 4. 纹理压缩格式支持 (KTX2/Basis)
 */

import {
    Scene,
    Texture,
    Material,
    PBRMaterial,
} from '@babylonjs/core';

// =============================================================================
// 类型定义
// =============================================================================

export enum ClTextureQuality {
    Ultra = 0,    // 4K (4096x4096)
    High = 1,     // 2K (2048x2048)
    Medium = 2,   // 1K (1024x1024)
    Low = 3,      // 512x512
    VeryLow = 4,  // 256x256
}

export interface ClTextureSet {
    id: string;
    basePath: string;
    currentQuality: ClTextureQuality;
    textures: {
        albedo?: Texture;
        normal?: Texture;
        roughness?: Texture;
        metallic?: Texture;
        ao?: Texture;
    };
    materials: Material[]; // 使用此纹理集的材质
    lastAccessTime: number;
}

export interface ClTextureStreamingConfig {
    maxTextureMemoryMB: number;
    defaultQuality: ClTextureQuality;
    autoAdjustQuality: boolean;
    qualityDistances: number[]; // [ultra, high, medium, low]
}

// =============================================================================
// 纹理流式加载器
// =============================================================================

export class ClTextureStreaming {
    private scene: Scene;
    private textureSets: Map<string, ClTextureSet> = new Map();
    private config: ClTextureStreamingConfig;
    
    // 内存跟踪
    private estimatedMemoryMB: number = 0;
    
    // 质量后缀映射
    private readonly QUALITY_SUFFIX: { [key in ClTextureQuality]: string } = {
        [ClTextureQuality.Ultra]: '_4k',
        [ClTextureQuality.High]: '_2k',
        [ClTextureQuality.Medium]: '_1k',
        [ClTextureQuality.Low]: '_512',
        [ClTextureQuality.VeryLow]: '_256',
    };
    
    // 质量对应的估算内存 (MB，假设 RGBA 格式)
    private readonly QUALITY_MEMORY: { [key in ClTextureQuality]: number } = {
        [ClTextureQuality.Ultra]: 64,    // 4096^2 * 4 bytes = 64MB
        [ClTextureQuality.High]: 16,     // 2048^2 * 4 bytes = 16MB
        [ClTextureQuality.Medium]: 4,    // 1024^2 * 4 bytes = 4MB
        [ClTextureQuality.Low]: 1,       // 512^2 * 4 bytes = 1MB
        [ClTextureQuality.VeryLow]: 0.25, // 256^2 * 4 bytes = 0.25MB
    };

    constructor(scene: Scene, config?: Partial<ClTextureStreamingConfig>) {
        this.scene = scene;
        this.config = {
            maxTextureMemoryMB: 512,
            defaultQuality: ClTextureQuality.Medium,
            autoAdjustQuality: true,
            qualityDistances: [20, 50, 100, 200],
            ...config,
        };
    }

    /**
     * 初始化
     */
    init(): void {
        console.log(`🖼️ 纹理流式加载器已启用 (最大内存: ${this.config.maxTextureMemoryMB}MB)`);
        
        // 定期检查和调整纹理质量
        if (this.config.autoAdjustQuality) {
            setInterval(() => this.autoAdjustQuality(), 2000);
        }
    }

    /**
     * 加载纹理集
     * @param id 唯一标识
     * @param basePath 基础路径 (不含后缀，如 "assets/textures/ground/grass")
     * @param quality 初始质量
     */
    loadTextureSet(
        id: string,
        basePath: string,
        quality?: ClTextureQuality
    ): ClTextureSet {
        // 检查是否已存在
        if (this.textureSets.has(id)) {
            const existing = this.textureSets.get(id)!;
            existing.lastAccessTime = Date.now();
            return existing;
        }
        
        const targetQuality = quality ?? this.config.defaultQuality;
        const suffix = this.QUALITY_SUFFIX[targetQuality];
        
        const set: ClTextureSet = {
            id,
            basePath,
            currentQuality: targetQuality,
            textures: {},
            materials: [],
            lastAccessTime: Date.now(),
        };
        
        // 加载纹理
        this.loadTexturesForSet(set, suffix);
        
        // 更新内存估算
        this.estimatedMemoryMB += this.QUALITY_MEMORY[targetQuality] * 4; // 4种贴图
        
        this.textureSets.set(id, set);
        return set;
    }

    /**
     * 加载纹理集的实际纹理
     */
    private loadTexturesForSet(set: ClTextureSet, suffix: string): void {
        const basePath = set.basePath;
        
        // 尝试加载各种贴图
        set.textures.albedo = this.tryLoadTexture(`${basePath}_albedo${suffix}.jpg`);
        set.textures.normal = this.tryLoadTexture(`${basePath}_normal${suffix}.jpg`);
        set.textures.roughness = this.tryLoadTexture(`${basePath}_roughness${suffix}.jpg`);
        set.textures.ao = this.tryLoadTexture(`${basePath}_ao${suffix}.jpg`);
    }

    /**
     * 尝试加载纹理，失败时返回 undefined
     */
    private tryLoadTexture(url: string): Texture | undefined {
        try {
            const texture = new Texture(url, this.scene);
            // 设置纹理采样参数
            texture.updateSamplingMode(Texture.TRILINEAR_SAMPLINGMODE);
            return texture;
        } catch {
            return undefined;
        }
    }

    /**
     * 将纹理集应用到材质
     */
    applyToMaterial(setId: string, material: PBRMaterial): void {
        const set = this.textureSets.get(setId);
        if (!set) {
            console.warn(`⚠️ 纹理集未找到: ${setId}`);
            return;
        }
        
        // 应用纹理
        if (set.textures.albedo) material.albedoTexture = set.textures.albedo;
        if (set.textures.normal) material.bumpTexture = set.textures.normal;
        if (set.textures.roughness) material.microSurfaceTexture = set.textures.roughness;
        if (set.textures.ao) material.ambientTexture = set.textures.ao;
        
        // 记录使用此纹理集的材质
        if (!set.materials.includes(material)) {
            set.materials.push(material);
        }
        
        set.lastAccessTime = Date.now();
    }

    /**
     * 更改纹理集质量
     */
    changeQuality(setId: string, newQuality: ClTextureQuality): void {
        const set = this.textureSets.get(setId);
        if (!set || set.currentQuality === newQuality) return;
        
        // 释放旧纹理
        const oldMemory = this.QUALITY_MEMORY[set.currentQuality] * 4;
        this.disposeSetTextures(set);
        
        // 加载新纹理
        const suffix = this.QUALITY_SUFFIX[newQuality];
        this.loadTexturesForSet(set, suffix);
        set.currentQuality = newQuality;
        
        // 更新材质引用
        for (const material of set.materials) {
            if (material instanceof PBRMaterial) {
                this.applyToMaterial(setId, material);
            }
        }
        
        // 更新内存估算
        const newMemory = this.QUALITY_MEMORY[newQuality] * 4;
        this.estimatedMemoryMB += (newMemory - oldMemory);
        
        console.log(`🖼️ 纹理质量更改: ${setId} -> ${ClTextureQuality[newQuality]}`);
    }

    /**
     * 自动调整质量（基于内存使用）
     */
    private autoAdjustQuality(): void {
        if (this.estimatedMemoryMB <= this.config.maxTextureMemoryMB) {
            return;
        }
        
        // 内存超限，降低最久未使用的纹理集质量
        const sortedSets = Array.from(this.textureSets.values())
            .filter(s => s.currentQuality < ClTextureQuality.VeryLow)
            .sort((a, b) => a.lastAccessTime - b.lastAccessTime);
        
        for (const set of sortedSets) {
            if (this.estimatedMemoryMB <= this.config.maxTextureMemoryMB) {
                break;
            }
            
            const newQuality = (set.currentQuality + 1) as ClTextureQuality;
            this.changeQuality(set.id, newQuality);
        }
    }

    /**
     * 释放纹理集的纹理
     */
    private disposeSetTextures(set: ClTextureSet): void {
        for (const texture of Object.values(set.textures)) {
            texture?.dispose();
        }
        set.textures = {};
    }

    /**
     * 获取内存使用估算
     */
    getEstimatedMemoryMB(): number {
        return this.estimatedMemoryMB;
    }

    /**
     * 获取统计信息
     */
    getStats(): { totalSets: number, memoryMB: number, byQuality: Record<string, number> } {
        const byQuality: Record<string, number> = {};
        for (const quality of Object.values(ClTextureQuality)) {
            if (typeof quality === 'number') {
                byQuality[ClTextureQuality[quality]] = 0;
            }
        }
        
        for (const set of this.textureSets.values()) {
            byQuality[ClTextureQuality[set.currentQuality]]++;
        }
        
        return {
            totalSets: this.textureSets.size,
            memoryMB: this.estimatedMemoryMB,
            byQuality,
        };
    }

    /**
     * 清理未使用的纹理集
     */
    cleanup(maxAgeMs: number = 60000): void {
        const now = Date.now();
        const toRemove: string[] = [];
        
        for (const [id, set] of this.textureSets) {
            if (now - set.lastAccessTime > maxAgeMs && set.materials.length === 0) {
                toRemove.push(id);
            }
        }
        
        for (const id of toRemove) {
            this.unload(id);
        }
        
        if (toRemove.length > 0) {
            console.log(`🧹 清理了 ${toRemove.length} 个未使用的纹理集`);
        }
    }

    /**
     * 卸载纹理集
     */
    unload(setId: string): void {
        const set = this.textureSets.get(setId);
        if (!set) return;
        
        this.disposeSetTextures(set);
        this.estimatedMemoryMB -= this.QUALITY_MEMORY[set.currentQuality] * 4;
        this.textureSets.delete(setId);
    }

    /**
     * 销毁
     */
    dispose(): void {
        for (const set of this.textureSets.values()) {
            this.disposeSetTextures(set);
        }
        this.textureSets.clear();
        this.estimatedMemoryMB = 0;
    }
}
