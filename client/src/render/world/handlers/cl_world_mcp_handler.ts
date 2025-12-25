/**
 * 世界场景 MCP 命令处理器
 * 
 * 模块: client/render/world/handlers
 * 前缀: Cl
 * 文档: 文档/12-MCP-API.md
 * 
 * 职责：
 * - 处理 AI 代理发送的 MCP 命令
 * - 管理命令历史（撤销/重做）
 * - 委托给具体的子系统执行命令
 */

import { Scene, Vector3 } from '@babylonjs/core';
import { 
    ClMcpCommand, 
    ClMcpSpawnEntity, 
    ClMcpDeleteEntity, 
    ClMcpMoveEntity,
    ClMcpClearArea, 
    ClMcpSpawnBatch 
} from '../../../network';
import { 
    getMcpHistory, 
    ClMcpHistorySpawn, 
    ClMcpHistoryDelete, 
    ClMcpHistoryMove,
    ClMcpHistoryClearArea, 
    ClMcpHistorySpawnBatch 
} from '../../../network/cl_mcp_history';
import { ClLevelLoader } from '../core/cl_level_loader';
import { ClEditorManager } from '../editor/cl_editor_manager';

/**
 * MCP 命令处理器
 */
export class ClWorldMcpHandler {
    private scene: Scene;
    private levelLoader: ClLevelLoader | null = null;
    private editorManager: ClEditorManager | null = null;
    
    constructor(scene: Scene) {
        this.scene = scene;
    }
    
    /**
     * 设置关卡加载器
     */
    setLevelLoader(loader: ClLevelLoader): void {
        this.levelLoader = loader;
    }
    
    /**
     * 设置编辑器管理器
     */
    setEditorManager(manager: ClEditorManager): void {
        this.editorManager = manager;
    }
    
    /**
     * 处理 MCP 命令
     */
    handleCommand(command: ClMcpCommand): void {
        console.log('🤖 处理 MCP 命令:', command);
        const history = getMcpHistory();
        
        switch (command.type) {
            case 'SpawnEntity':
                this.handleSpawnEntity(command.data as ClMcpSpawnEntity, history);
                break;
            case 'DeleteEntity':
                this.handleDeleteEntity(command.data as ClMcpDeleteEntity, history);
                break;
            case 'MoveEntity':
                this.handleMoveEntity(command.data as ClMcpMoveEntity, history);
                break;
            case 'ClearArea':
                this.handleClearArea(command.data as ClMcpClearArea, history);
                break;
            case 'SpawnBatch':
                this.handleSpawnBatch(command.data as ClMcpSpawnBatch, history);
                break;
            case 'Undo':
                this.handleUndo();
                break;
        }
    }
    
    /**
     * 处理生成实体
     */
    private handleSpawnEntity(data: ClMcpSpawnEntity, history: ReturnType<typeof getMcpHistory>): void {
        if (!this.levelLoader) return;
        
        const position = new Vector3(data.position.x, 0, data.position.y);
        const rotation = new Vector3(0, data.rotation, 0);
        const scale = new Vector3(data.scale, data.scale, data.scale);
        
        // 记录到历史
        const historyAction: ClMcpHistorySpawn = {
            type: 'spawn',
            entityId: `mcp_${data.prefab_id}_${Date.now()}`,
            entityType: data.entity_type,
            prefabId: data.prefab_id,
            position: position.clone(),
            rotation: rotation.clone(),
            scale: scale.clone()
        };
        history.push(historyAction);
        
        // 生成实体
        this.levelLoader.spawnEntity(
            data.entity_type as any,
            data.prefab_id,
            position,
            rotation,
            scale
        );
    }
    
    /**
     * 处理删除实体
     */
    private handleDeleteEntity(data: ClMcpDeleteEntity, history: ReturnType<typeof getMcpHistory>): void {
        const mesh = this.scene.getMeshByName(data.entity_id);
        if (mesh && mesh.metadata) {
            const historyAction: ClMcpHistoryDelete = {
                type: 'delete',
                entityId: data.entity_id,
                entityType: mesh.metadata.type || 'unknown',
                prefabId: mesh.metadata.prefab || 'unknown',
                position: mesh.position.clone(),
                rotation: mesh.rotation?.clone(),
                scale: mesh.scaling?.clone()
            };
            history.push(historyAction);
        }
        
        this.editorManager?.deleteById(data.entity_id);
    }
    
    /**
     * 处理移动实体
     */
    private handleMoveEntity(data: ClMcpMoveEntity, history: ReturnType<typeof getMcpHistory>): void {
        const mesh = this.scene.getMeshByName(data.entity_id);
        if (mesh) {
            // 记录移动历史
            const historyAction: ClMcpHistoryMove = {
                type: 'move',
                entityId: data.entity_id,
                oldPosition: mesh.position.clone(),
                newPosition: new Vector3(data.position.x, mesh.position.y, data.position.y)
            };
            history.push(historyAction);
            
            // 执行移动
            mesh.position.x = data.position.x;
            mesh.position.z = data.position.y;
            console.log(`🚚 移动实体 ${data.entity_id} 到 (${data.position.x}, ${data.position.y})`);
        } else {
            console.warn(`⚠️ 未找到实体: ${data.entity_id}`);
        }
    }
    
    /**
     * 处理清除区域
     */
    private handleClearArea(data: ClMcpClearArea, history: ReturnType<typeof getMcpHistory>): void {
        const centerX = data.center.x;
        const centerZ = data.center.y;
        const radius = data.radius;
        
        // 收集要删除的物体信息
        const deletedEntities: ClMcpHistoryClearArea['deletedEntities'] = [];
        const meshesToDelete: string[] = [];
        
        this.scene.meshes.forEach(mesh => {
            if (mesh.metadata && mesh.metadata.type) {
                const distance = Math.sqrt(
                    Math.pow(mesh.position.x - centerX, 2) + 
                    Math.pow(mesh.position.z - centerZ, 2)
                );
                if (distance <= radius) {
                    meshesToDelete.push(mesh.name);
                    deletedEntities.push({
                        entityId: mesh.name,
                        entityType: mesh.metadata.type || 'unknown',
                        prefabId: mesh.metadata.prefab || 'unknown',
                        position: mesh.position.clone(),
                        rotation: mesh.rotation?.clone(),
                        scale: mesh.scaling?.clone()
                    });
                }
            }
        });
        
        // 记录历史
        if (deletedEntities.length > 0) {
            const historyAction: ClMcpHistoryClearArea = {
                type: 'clear_area',
                deletedEntities
            };
            history.push(historyAction);
        }
        
        // 删除物体
        meshesToDelete.forEach(name => {
            this.editorManager?.deleteById(name);
        });
        
        console.log(`🧹 清理区域: 删除了 ${meshesToDelete.length} 个物体`);
    }
    
    /**
     * 处理批量生成
     */
    private handleSpawnBatch(data: ClMcpSpawnBatch, history: ReturnType<typeof getMcpHistory>): void {
        if (!this.levelLoader || data.prefab_ids.length === 0) return;
        
        const centerX = data.center.x;
        const centerZ = data.center.y;
        const batchStartTime = Date.now();
        const estimatedIds: string[] = [];
        
        for (let i = 0; i < data.count; i++) {
            const prefabId = data.prefab_ids[Math.floor(Math.random() * data.prefab_ids.length)];
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * data.radius;
            const x = centerX + Math.cos(angle) * distance;
            const z = centerZ + Math.sin(angle) * distance;
            const rotation = Math.random() * Math.PI * 2;
            const scale = 0.8 + Math.random() * 0.4;
            
            estimatedIds.push(`mcp_batch_${batchStartTime}_${i}`);
            
            this.levelLoader.spawnEntity(
                data.entity_type as any,
                prefabId,
                new Vector3(x, 0, z),
                new Vector3(0, rotation, 0),
                new Vector3(scale, scale, scale)
            );
        }
        
        // 记录历史
        const historyAction: ClMcpHistorySpawnBatch = {
            type: 'spawn_batch',
            entityIds: estimatedIds
        };
        history.push(historyAction);
        
        console.log(`🌲 批量生成: 创建了 ${data.count} 个 ${data.entity_type}`);
    }
    
    /**
     * 处理撤销
     */
    private handleUndo(): void {
        const history = getMcpHistory();
        if (!history.canUndo()) {
            console.log('⚠️ 没有可撤销的操作');
            return;
        }
        
        const action = history.popUndo();
        if (!action) return;
        
        console.log(`↩️ 撤销操作: ${action.type}`);
        
        switch (action.type) {
            case 'spawn': {
                const mesh = this.findMeshNearPosition(action.prefabId, action.position);
                if (mesh) {
                    this.editorManager?.deleteById(mesh.name);
                }
                break;
            }
            case 'delete': {
                if (this.levelLoader) {
                    this.levelLoader.spawnEntity(
                        action.entityType as any,
                        action.prefabId,
                        action.position,
                        action.rotation,
                        action.scale
                    );
                }
                break;
            }
            case 'clear_area': {
                if (this.levelLoader) {
                    action.deletedEntities.forEach(entity => {
                        this.levelLoader!.spawnEntity(
                            entity.entityType as any,
                            entity.prefabId,
                            entity.position,
                            entity.rotation,
                            entity.scale
                        );
                    });
                }
                break;
            }
            case 'spawn_batch': {
                console.warn('⚠️ 批量生成的撤销建议使用 clear_area 命令');
                break;
            }
        }
    }
    
    /**
     * 根据预制体ID和位置查找最近的mesh
     */
    private findMeshNearPosition(prefabId: string, position: Vector3): any | null {
        let nearestMesh: any = null;
        let nearestDistance = Infinity;
        
        this.scene.meshes.forEach(mesh => {
            if (mesh.metadata && mesh.metadata.prefab === prefabId) {
                const distance = Vector3.Distance(mesh.position, position);
                if (distance < nearestDistance && distance < 2) {
                    nearestDistance = distance;
                    nearestMesh = mesh;
                }
            }
        });
        
        return nearestMesh;
    }
}
