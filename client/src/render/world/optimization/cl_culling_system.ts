/**
 * 视锥剔除系统
 * 
 * 模块: client/render/world/optimization
 * 前缀: Cl
 * 文档: 文档/08-性能优化.md
 * 
 * 职责：
 * - 管理场景中所有需要剔除的物体
 * - 根据摄像机视野判断物体可见性
 * - 自动隐藏视野外的物体以节省GPU资源
 */

import { Scene, Mesh } from '@babylonjs/core';
import { CL_PERFORMANCE_CONFIG } from '../cl_world_config';

export class ClCullingSystem {
    private scene: Scene;
    private enabled: boolean = CL_PERFORMANCE_CONFIG.CULLING_ENABLED;
    private cullableObjects: Mesh[] = [];
    private lastCullTime: number = 0;
    private cullInterval: number = CL_PERFORMANCE_CONFIG.CULLING_INTERVAL;
    
    // 统计数据
    private stats = {
        visibleCount: 0,
        culledCount: 0,
    };

    constructor(scene: Scene) {
        this.scene = scene;
    }

    /**
     * 初始化剔除系统
     */
    init(): void {
        if (!this.enabled) {
            console.log('⚠️ 视锥剔除系统已禁用');
            return;
        }
        
        // 注册渲染前回调
        this.scene.onBeforeRenderObservable.add(() => {
            this.update();
        });
        
        console.log(`✅ 视锥剔除系统已启用`);
    }

    /**
     * 注册可剔除的物体
     */
    registerCullable(mesh: Mesh): void {
        if (!this.cullableObjects.includes(mesh)) {
            this.cullableObjects.push(mesh);
        }
    }

    /**
     * 批量注册可剔除物体
     */
    registerMultiple(meshes: Mesh[]): void {
        for (const mesh of meshes) {
            this.registerCullable(mesh);
        }
    }

    /**
     * 取消注册
     */
    unregister(mesh: Mesh): void {
        const index = this.cullableObjects.indexOf(mesh);
        if (index !== -1) {
            this.cullableObjects.splice(index, 1);
        }
    }

    /**
     * 更新剔除状态 (带节流优化)
     */
    private update(): void {
        if (!this.enabled) return;
        
        const now = performance.now();
        
        // 节流：每100ms更新一次
        if (now - this.lastCullTime < this.cullInterval) {
            return;
        }
        this.lastCullTime = now;
        
        const camera = this.scene.activeCamera;
        if (!camera) return;
        
        // 获取视锥体平面
        const frustumPlanes = this.scene.frustumPlanes;
        if (!frustumPlanes || frustumPlanes.length === 0) return;
        
        this.stats.visibleCount = 0;
        this.stats.culledCount = 0;
        
        // 检查每个物体
        for (const mesh of this.cullableObjects) {
            if (!mesh) continue;
            
            // 使用Babylon.js内置的视锥体检测
            const isInFrustum = mesh.isInFrustum(frustumPlanes);
            
            if (isInFrustum) {
                mesh.isVisible = true;
                this.stats.visibleCount++;
            } else {
                mesh.isVisible = false;
                this.stats.culledCount++;
            }
        }
    }

    /**
     * 设置特定物体始终可见
     */
    setAlwaysVisible(mesh: Mesh, alwaysVisible: boolean): void {
        if (alwaysVisible) {
            this.unregister(mesh);
            mesh.isVisible = true;
        } else {
            this.registerCullable(mesh);
        }
    }

    /**
     * 启用/禁用剔除系统
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) {
            // 禁用时，所有物体设为可见
            for (const mesh of this.cullableObjects) {
                if (mesh) mesh.isVisible = true;
            }
        }
    }

    /**
     * 获取统计数据
     */
    getStats() {
        return {
            totalObjects: this.cullableObjects.length,
            visible: this.stats.visibleCount,
            culled: this.stats.culledCount,
            enabled: this.enabled,
        };
    }

    /**
     * 打印统计信息
     */
    logStats(): void {
        const stats = this.getStats();
        console.log(`🎯 剔除统计: ${stats.visible}可见 / ${stats.culled}剔除 (总${stats.totalObjects})`);
    }

    /**
     * 清理资源
     */
    dispose(): void {
        this.cullableObjects = [];
    }
}

export default ClCullingSystem;
