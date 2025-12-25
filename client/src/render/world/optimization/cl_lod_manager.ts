/**
 * LOD 管理器 - 运行时细节层次切换
 * 
 * 模块: client/render/world/optimization
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责:
 * 1. 根据距离自动切换 LOD 级别
 * 2. 管理 LOD 网格组
 * 3. 平滑过渡动画
 * 4. 性能统计
 */

import { Scene, Mesh, Vector3, Camera, TransformNode } from '@babylonjs/core';
import { CL_LOD_CONFIG } from '../cl_world_config';

// =============================================================================
// 类型定义
// =============================================================================

export enum ClLODLevel {
    High = 0,
    Medium = 1,
    Low = 2,
    Billboard = 3,  // 最远距离使用广告牌
    Hidden = 4,     // 超出范围隐藏
}

export interface ClLODMeshGroup {
    id: string;
    position: Vector3;
    meshes: {
        [key in ClLODLevel]?: Mesh | TransformNode;
    };
    currentLevel: ClLODLevel;
    distances: number[]; // [high→mid, mid→low, low→billboard, billboard→hidden]
}

export interface ClLODStats {
    totalGroups: number;
    byLevel: { [key in ClLODLevel]: number };
    lastUpdateTime: number;
}

// =============================================================================
// LOD 管理器
// =============================================================================

export class ClLODManager {
    private scene: Scene;
    private groups: Map<string, ClLODMeshGroup> = new Map();
    private camera: Camera | null = null;
    
    // 更新配置
    private updateInterval: number = 200; // 200ms 更新一次
    private lastUpdate: number = 0;
    private enabled: boolean = true;
    
    // 统计
    private stats: ClLODStats = {
        totalGroups: 0,
        byLevel: {
            [ClLODLevel.High]: 0,
            [ClLODLevel.Medium]: 0,
            [ClLODLevel.Low]: 0,
            [ClLODLevel.Billboard]: 0,
            [ClLODLevel.Hidden]: 0,
        },
        lastUpdateTime: 0,
    };

    constructor(scene: Scene) {
        this.scene = scene;
    }

    /**
     * 初始化 LOD 系统
     */
    init(): void {
        if (!this.enabled) {
            console.log('⚠️ LOD 系统已禁用');
            return;
        }
        
        this.camera = this.scene.activeCamera;
        
        // 注册更新回调
        this.scene.onBeforeRenderObservable.add(() => {
            this.update();
        });
        
        console.log('✅ LOD 管理器已启用');
    }

    /**
     * 注册 LOD 网格组
     * @param id 唯一标识
     * @param position 世界位置
     * @param meshes LOD 级别对应的网格
     * @param distances 切换距离数组 [high→mid, mid→low, low→billboard, billboard→hidden]
     */
    registerGroup(
        id: string,
        position: Vector3,
        meshes: { [key in ClLODLevel]?: Mesh | TransformNode },
        distances?: number[]
    ): void {
        // 默认距离配置
        const defaultDistances = [
            CL_LOD_CONFIG.TREE_LOD_HIGH,
            CL_LOD_CONFIG.TREE_LOD_MID,
            CL_LOD_CONFIG.TREE_LOD_LOW,
            CL_LOD_CONFIG.TREE_LOD_LOW + 50,
        ];
        
        const group: ClLODMeshGroup = {
            id,
            position,
            meshes,
            currentLevel: ClLODLevel.High,
            distances: distances || defaultDistances,
        };
        
        this.groups.set(id, group);
        this.stats.totalGroups++;
        
        // 初始化所有 LOD 级别为隐藏
        for (const level of Object.values(ClLODLevel)) {
            if (typeof level === 'number' && meshes[level]) {
                meshes[level]!.setEnabled(false);
            }
        }
    }

    /**
     * 批量注册（适用于实例化的树木等）
     */
    registerTreeLOD(
        id: string,
        position: Vector3,
        highMesh?: Mesh,
        midMesh?: Mesh,
        lowMesh?: Mesh
    ): void {
        this.registerGroup(id, position, {
            [ClLODLevel.High]: highMesh,
            [ClLODLevel.Medium]: midMesh,
            [ClLODLevel.Low]: lowMesh,
        }, [
            CL_LOD_CONFIG.TREE_LOD_HIGH,
            CL_LOD_CONFIG.TREE_LOD_MID,
            CL_LOD_CONFIG.TREE_LOD_LOW,
            CL_LOD_CONFIG.TREE_LOD_LOW + 100,
        ]);
    }

    /**
     * 注销 LOD 组
     */
    unregisterGroup(id: string): void {
        if (this.groups.has(id)) {
            this.groups.delete(id);
            this.stats.totalGroups--;
        }
    }

    /**
     * 更新所有 LOD 组
     */
    private update(): void {
        if (!this.enabled) return;
        
        const now = performance.now();
        if (now - this.lastUpdate < this.updateInterval) {
            return;
        }
        this.lastUpdate = now;
        
        if (!this.camera) {
            this.camera = this.scene.activeCamera;
            if (!this.camera) return;
        }
        
        const startTime = performance.now();
        const cameraPos = this.camera.position;
        
        // 重置统计
        for (const level of Object.values(ClLODLevel)) {
            if (typeof level === 'number') {
                this.stats.byLevel[level] = 0;
            }
        }
        
        // 更新每个组
        for (const group of this.groups.values()) {
            const distance = Vector3.Distance(cameraPos, group.position);
            const newLevel = this.calculateLevel(distance, group.distances);
            
            if (newLevel !== group.currentLevel) {
                this.switchLevel(group, newLevel);
            }
            
            this.stats.byLevel[group.currentLevel]++;
        }
        
        this.stats.lastUpdateTime = performance.now() - startTime;
    }

    /**
     * 计算应该使用的 LOD 级别
     */
    private calculateLevel(distance: number, distances: number[]): ClLODLevel {
        if (distance < distances[0]) return ClLODLevel.High;
        if (distance < distances[1]) return ClLODLevel.Medium;
        if (distance < distances[2]) return ClLODLevel.Low;
        if (distance < distances[3]) return ClLODLevel.Billboard;
        return ClLODLevel.Hidden;
    }

    /**
     * 切换 LOD 级别
     */
    private switchLevel(group: ClLODMeshGroup, newLevel: ClLODLevel): void {
        // 隐藏当前级别
        const currentMesh = group.meshes[group.currentLevel];
        if (currentMesh) {
            currentMesh.setEnabled(false);
        }
        
        // 显示新级别
        const newMesh = group.meshes[newLevel];
        if (newMesh) {
            newMesh.setEnabled(true);
        }
        
        group.currentLevel = newLevel;
    }

    /**
     * 强制更新所有 LOD
     */
    forceUpdate(): void {
        this.lastUpdate = 0;
        this.update();
    }

    /**
     * 获取统计信息
     */
    getStats(): ClLODStats {
        return { ...this.stats };
    }

    /**
     * 启用/禁用系统
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * 设置更新间隔
     */
    setUpdateInterval(ms: number): void {
        this.updateInterval = Math.max(50, ms);
    }

    /**
     * 清理
     */
    dispose(): void {
        this.groups.clear();
        this.stats.totalGroups = 0;
    }
}
