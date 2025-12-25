/**
 * 资源系统集成控制器 - 统一管理资源加载、LOD、纹理流
 * 
 * 模块: client/render/world/core
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责:
 * 1. 统一协调 ResourceQueue, LODManager, TextureStreaming
 * 2. 提供场景级别的资源管理接口
 * 3. 性能监控与自动调节
 * 4. 加载进度报告
 */

import { Scene, Mesh, Vector3, TransformNode, Camera } from '@babylonjs/core';
import { ClResourceQueue, ClResourceType, ClResourcePriority, ClLoadProgress } from './cl_resource_queue';
import { ClTextureStreaming, ClTextureQuality } from './cl_texture_streaming';
import { ClLODManager, ClLODLevel } from '../optimization/cl_lod_manager';
import { ClAssetManager } from '../cl_asset_manager';

// =============================================================================
// 类型定义
// =============================================================================

export interface ClResourceIntegrationConfig {
    enableLOD: boolean;
    enableTextureStreaming: boolean;
    enableResourceQueue: boolean;
    maxTextureMemoryMB: number;
    defaultTextureQuality: ClTextureQuality;
    lodUpdateInterval: number;
}

export interface ClResourceStats {
    loadingProgress: ClLoadProgress | null;
    lodStats: {
        totalGroups: number;
        byLevel: { [key: number]: number };
    } | null;
    textureMemoryMB: number;
    isLoading: boolean;
}

export type ClLoadingStateCallback = (isLoading: boolean, progress: number) => void;

// =============================================================================
// 资源系统集成控制器
// =============================================================================

export class ClResourceIntegration {
    private scene: Scene;
    private assetManager: ClAssetManager;
    
    // 子系统
    private resourceQueue: ClResourceQueue | null = null;
    private lodManager: ClLODManager | null = null;
    private textureStreaming: ClTextureStreaming | null = null;
    
    // 配置
    private config: ClResourceIntegrationConfig;
    
    // 状态
    private isInitialized: boolean = false;
    private isLoading: boolean = false;
    private currentProgress: ClLoadProgress | null = null;
    
    // 回调
    private onLoadingStateChange: ClLoadingStateCallback | null = null;

    constructor(scene: Scene, assetManager: ClAssetManager, config?: Partial<ClResourceIntegrationConfig>) {
        this.scene = scene;
        this.assetManager = assetManager;
        this.config = {
            enableLOD: true,
            enableTextureStreaming: true,
            enableResourceQueue: true,
            maxTextureMemoryMB: 512,
            defaultTextureQuality: ClTextureQuality.Medium,
            lodUpdateInterval: 200,
            ...config,
        };
    }

    /**
     * 初始化资源系统
     */
    init(): void {
        if (this.isInitialized) {
            console.warn('⚠️ 资源集成系统已初始化');
            return;
        }

        console.log('🔧 初始化资源集成系统...');

        // 1. 资源加载队列
        if (this.config.enableResourceQueue) {
            this.initResourceQueue();
        }

        // 2. LOD 管理器
        if (this.config.enableLOD) {
            this.initLODManager();
        }

        // 3. 纹理流式加载
        if (this.config.enableTextureStreaming) {
            this.initTextureStreaming();
        }

        this.isInitialized = true;
        console.log('✅ 资源集成系统初始化完成');
    }

    /**
     * 初始化资源加载队列
     */
    private initResourceQueue(): void {
        this.resourceQueue = new ClResourceQueue();

        // 注册模型加载器
        this.resourceQueue.registerLoader(ClResourceType.Model, async (url: string, id: string) => {
            try {
                const mesh = await this.assetManager.loadMesh(url, id);
                return mesh !== null;
            } catch (error) {
                console.error(`模型加载失败: ${url}`, error);
                return false;
            }
        });

        // 注册纹理加载器
        this.resourceQueue.registerLoader(ClResourceType.Texture, async (url: string, _id: string) => {
            try {
                this.assetManager.loadTexture(url);
                return true;
            } catch (error) {
                console.error(`纹理加载失败: ${url}`, error);
                return false;
            }
        });

        // 设置进度回调
        this.resourceQueue.setProgressCallback((progress) => {
            this.currentProgress = progress;
            this.notifyLoadingState(true, progress.percent);
        });

        // 设置完成回调
        this.resourceQueue.setCompleteCallback((_success, errors) => {
            this.isLoading = false;
            this.notifyLoadingState(false, 100);
            
            if (errors.length > 0) {
                console.warn(`⚠️ ${errors.length} 个资源加载失败:`, errors);
            }
        });

        console.log('  📦 资源队列已启用');
    }

    /**
     * 初始化 LOD 管理器
     */
    private initLODManager(): void {
        this.lodManager = new ClLODManager(this.scene);
        this.lodManager.init();
        console.log('  🎚️ LOD 管理器已启用');
    }

    /**
     * 初始化纹理流式加载
     */
    private initTextureStreaming(): void {
        this.textureStreaming = new ClTextureStreaming(this.scene, {
            maxTextureMemoryMB: this.config.maxTextureMemoryMB,
            defaultQuality: this.config.defaultTextureQuality,
            autoAdjustQuality: true,
        });
        this.textureStreaming.init();
        console.log('  🖼️ 纹理流式加载已启用');
    }

    // =========================================================================
    // 资源加载 API
    // =========================================================================

    /**
     * 预加载资源列表
     * @param resources 资源列表
     */
    async preloadResources(resources: Array<{
        id: string;
        type: ClResourceType;
        url: string;
        priority?: ClResourcePriority;
    }>): Promise<void> {
        if (!this.resourceQueue) {
            // 降级：直接加载
            for (const res of resources) {
                if (res.type === ClResourceType.Model) {
                    await this.assetManager.loadMesh(res.url, res.id);
                } else if (res.type === ClResourceType.Texture) {
                    this.assetManager.loadTexture(res.url);
                }
            }
            return;
        }

        this.isLoading = true;
        this.notifyLoadingState(true, 0);

        // 添加到队列
        for (const res of resources) {
            this.resourceQueue.enqueue({
                id: res.id,
                type: res.type,
                url: res.url,
                priority: res.priority ?? ClResourcePriority.Normal,
            });
        }

        // 开始加载
        await this.resourceQueue.start();
    }

    /**
     * 快速加载单个资源（高优先级）
     */
    async loadImmediate(id: string, type: ClResourceType, url: string): Promise<void> {
        if (!this.resourceQueue) {
            if (type === ClResourceType.Model) {
                await this.assetManager.loadMesh(url, id);
            } else if (type === ClResourceType.Texture) {
                this.assetManager.loadTexture(url);
            }
            return;
        }

        this.resourceQueue.enqueue({
            id,
            type,
            url,
            priority: ClResourcePriority.Critical,
        });

        if (!this.isLoading) {
            this.isLoading = true;
            await this.resourceQueue.start();
        }
    }

    // =========================================================================
    // LOD 管理 API
    // =========================================================================

    /**
     * 注册 LOD 网格组
     * @param id 唯一标识
     * @param position 世界位置
     * @param meshes LOD 级别对应的网格
     * @param distances 切换距离阈值
     */
    registerLODGroup(
        id: string,
        position: Vector3,
        meshes: { [key in ClLODLevel]?: Mesh | TransformNode },
        distances?: number[]
    ): void {
        if (!this.lodManager) {
            console.warn('⚠️ LOD 管理器未启用');
            return;
        }
        this.lodManager.registerGroup(id, position, meshes, distances);
    }

    /**
     * 批量注册 LOD 组（用于植被等大量物体）
     */
    registerLODGroups(groups: Array<{
        id: string;
        position: Vector3;
        meshes: { [key in ClLODLevel]?: Mesh | TransformNode };
        distances?: number[];
    }>): void {
        for (const group of groups) {
            this.registerLODGroup(group.id, group.position, group.meshes, group.distances);
        }
    }

    /**
     * 移除 LOD 组
     */
    unregisterLODGroup(id: string): void {
        this.lodManager?.unregisterGroup(id);
    }

    /**
     * 强制更新 LOD
     */
    forceLODUpdate(): void {
        this.lodManager?.forceUpdate();
    }

    // =========================================================================
    // 纹理质量 API
    // =========================================================================

    /**
     * 加载纹理集
     * @param id 唯一标识
     * @param basePath 基础路径 (不含质量后缀)
     * @param quality 纹理质量
     */
    loadTextureSet(id: string, basePath: string, quality?: ClTextureQuality): void {
        if (!this.textureStreaming) {
            console.warn('⚠️ 纹理流式加载未启用');
            return;
        }
        this.textureStreaming.loadTextureSet(id, basePath, quality);
    }

    /**
     * 更改纹理集质量
     */
    changeTextureQuality(setId: string, quality: ClTextureQuality): void {
        this.textureStreaming?.changeQuality(setId, quality);
    }

    /**
     * 清理未使用的纹理
     */
    cleanupUnusedTextures(maxAgeMs?: number): void {
        this.textureStreaming?.cleanup(maxAgeMs);
    }

    // =========================================================================
    // 状态与统计
    // =========================================================================

    /**
     * 获取资源统计
     */
    getStats(): ClResourceStats {
        return {
            loadingProgress: this.currentProgress,
            lodStats: this.lodManager?.getStats() ?? null,
            textureMemoryMB: this.textureStreaming?.getEstimatedMemoryMB() ?? 0,
            isLoading: this.isLoading,
        };
    }

    /**
     * 设置加载状态回调
     */
    setLoadingStateCallback(callback: ClLoadingStateCallback): void {
        this.onLoadingStateChange = callback;
    }

    /**
     * 通知加载状态变化
     */
    private notifyLoadingState(isLoading: boolean, progress: number): void {
        if (this.onLoadingStateChange) {
            this.onLoadingStateChange(isLoading, progress);
        }
    }

    // =========================================================================
    // 性能优化
    // =========================================================================

    /**
     * 释放未使用的资源
     */
    releaseUnusedResources(maxAgeMs?: number): void {
        this.textureStreaming?.cleanup(maxAgeMs);
        // 未来可以添加模型缓存清理
    }

    /**
     * 设置相机引用（用于自动 LOD 和纹理质量调节）
     * LOD 系统自动使用 scene.activeCamera
     */
    setActiveCamera(_camera: Camera): void {
        // LOD 管理器自动使用 scene.activeCamera，无需手动设置
        // 如果需要指定相机，可以扩展 LOD 管理器
    }

    /**
     * 暂停/恢复 LOD 更新
     */
    setLODEnabled(enabled: boolean): void {
        this.lodManager?.setEnabled(enabled);
    }

    /**
     * 获取 LOD 管理器（高级用途）
     */
    getLODManager(): ClLODManager | null {
        return this.lodManager;
    }

    /**
     * 获取纹理流加载器（高级用途）
     */
    getTextureStreaming(): ClTextureStreaming | null {
        return this.textureStreaming;
    }

    /**
     * 获取资源队列（高级用途）
     */
    getResourceQueue(): ClResourceQueue | null {
        return this.resourceQueue;
    }

    /**
     * 清理资源
     */
    dispose(): void {
        this.resourceQueue?.clear();
        this.lodManager?.dispose();
        this.textureStreaming?.dispose();
        
        this.resourceQueue = null;
        this.lodManager = null;
        this.textureStreaming = null;
        this.isInitialized = false;
    }
}

export default ClResourceIntegration;
