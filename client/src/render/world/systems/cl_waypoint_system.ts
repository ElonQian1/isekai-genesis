/**
 * 路径点系统 - 管理 AI 巡逻路径
 * 
 * 模块: client/render/world/systems
 * 前缀: Cl
 * 
 * 职责:
 * 1. 管理所有路径点实体
 * 2. 维护路径点之间的连接关系
 * 3. 提供可视化调试 (绘制连接线)
 * 4. 为 AI 提供路径查询接口
 */

import { Scene, Vector3, Mesh, MeshBuilder, StandardMaterial, Color3, LinesMesh } from '@babylonjs/core';

export interface WaypointConfig {
    nextWaypointId?: string;
    waitTime?: number; // 到达后停留时间
}

export class ClWaypointSystem {
    private scene: Scene;
    private waypoints: Map<string, Mesh> = new Map();
    private debugLines: LinesMesh[] = [];
    private isDebugVisible: boolean = true;

    // 材质缓存
    private waypointMaterial: StandardMaterial;

    constructor(scene: Scene) {
        this.scene = scene;
        
        // 初始化材质
        this.waypointMaterial = new StandardMaterial("mat_waypoint", scene);
        this.waypointMaterial.diffuseColor = new Color3(0.2, 0.8, 1.0); // 青色
        this.waypointMaterial.alpha = 0.6;
    }

    /**
     * 创建或注册一个路径点
     */
    public createWaypoint(id: string, position: Vector3, config: WaypointConfig = {}): Mesh {
        // 创建可视化 Mesh (编辑器中可见，游戏中隐藏)
        const mesh = MeshBuilder.CreateBox("waypoint_" + id, { size: 0.5 }, this.scene);
        mesh.position = position.clone();
        mesh.material = this.waypointMaterial;
        mesh.metadata = {
            type: 'waypoint',
            id: id,
            ...config
        };

        // 注册
        this.waypoints.set(id, mesh);
        
        // 刷新连线
        this.updateDebugLines();

        return mesh;
    }

    /**
     * 获取路径点位置
     */
    public getWaypointPosition(id: string): Vector3 | null {
        const wp = this.waypoints.get(id);
        return wp ? wp.position.clone() : null;
    }

    /**
     * 获取路径点配置
     */
    public getWaypointConfig(id: string): WaypointConfig | null {
        const wp = this.waypoints.get(id);
        return wp ? wp.metadata : null;
    }

    /**
     * 获取下一个路径点 ID
     */
    public getNextWaypointId(currentId: string): string | null {
        const wp = this.waypoints.get(currentId);
        if (wp && wp.metadata && wp.metadata.nextWaypointId) {
            return wp.metadata.nextWaypointId;
        }
        return null;
    }

    /**
     * 更新路径点配置 (通常由编辑器调用)
     */
    public updateWaypointConfig(id: string, config: Partial<WaypointConfig>): void {
        const wp = this.waypoints.get(id);
        if (wp) {
            wp.metadata = { ...wp.metadata, ...config };
            this.updateDebugLines();
        }
    }

    /**
     * 移除路径点
     */
    public removeWaypoint(id: string): void {
        const wp = this.waypoints.get(id);
        if (wp) {
            wp.dispose();
            this.waypoints.delete(id);
            this.updateDebugLines();
        }
    }

    /**
     * 刷新调试连线
     */
    public updateDebugLines(): void {
        // 清除旧线
        this.debugLines.forEach(l => l.dispose());
        this.debugLines = [];

        if (!this.isDebugVisible) return;

        // 遍历所有点，画线到 nextWaypoint
        this.waypoints.forEach((mesh, id) => {
            const nextId = mesh.metadata.nextWaypointId;
            if (nextId) {
                const nextMesh = this.waypoints.get(nextId);
                if (nextMesh) {
                    // 画箭头线
                    const points = [mesh.position, nextMesh.position];
                    const line = MeshBuilder.CreateLines("line_" + id + "_" + nextId, {
                        points: points,
                        updatable: false
                    }, this.scene);
                    line.color = new Color3(0.2, 0.8, 1.0);
                    this.debugLines.push(line);
                }
            }
        });
    }

    /**
     * 设置调试显示状态
     */
    public setDebugVisibility(visible: boolean): void {
        this.isDebugVisible = visible;
        this.waypoints.forEach(m => m.isVisible = visible);
        this.updateDebugLines();
    }
    
    /**
     * 清理所有
     */
    public dispose(): void {
        this.waypoints.forEach(m => m.dispose());
        this.waypoints.clear();
        this.debugLines.forEach(l => l.dispose());
        this.debugLines = [];
    }
}
