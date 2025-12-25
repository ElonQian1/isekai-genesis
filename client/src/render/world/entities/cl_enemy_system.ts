/**
 * 敌人实体系统 - 大世界中的敌人显示和管理
 * 
 * 模块: client/render/world/entities
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责：
 * - 敌人生成和显示
 * - 敌人巡逻行为
 * - 敌人状态管理
 * - 提供碰撞检测数据
 * 
 * 重构说明：
 * - 类型定义移至 cl_enemy_types.ts
 * - 配置常量移至 cl_enemy_types.ts
 */

import {
    Scene,
    TransformNode,
    Mesh,
    MeshBuilder,
    Vector3,
    Color3,
    PBRMaterial,
    GlowLayer,
    Animation,
} from '@babylonjs/core';
import { ClEnemyAI, EnemyState } from './cl_enemy_ai';
import { ClWaypointSystem } from '../systems/cl_waypoint_system';
import { 
    EnemyType, 
    EnemyData, 
    EnemyEntity,
    ENEMY_COLOR_CONFIG,
} from './cl_enemy_types';

// 重新导出类型供外部使用
export { EnemyType } from './cl_enemy_types';
export type { EnemyData } from './cl_enemy_types';

// =============================================================================
// 敌人系统
// =============================================================================

export class ClEnemySystem {
    private scene: Scene;
    
    private enemiesRoot: TransformNode;
    private enemies: Map<string, EnemyEntity> = new Map();
    private glowLayer: GlowLayer | null = null;
    
    // 材质缓存
    private normalMaterial: PBRMaterial | null = null;
    private eliteMaterial: PBRMaterial | null = null;
    private bossMaterial: PBRMaterial | null = null;
    
    // 检测回调
    private onEnemyEncounter: ((enemy: EnemyData) => void) | null = null;
    
    // 调试可视化
    private debugMeshes: Map<string, Mesh[]> = new Map();
    
    // 路径点系统引用
    private waypointSystem: ClWaypointSystem | null = null;
    
    // 地形高度检测回调
    private getTerrainHeight: ((x: number, z: number) => number) | null = null;
    
    // 重生队列 (敌人数据, 重生时间戳)
    private respawnQueue: Array<{ data: EnemyData; respawnTime: number; properties?: any }> = [];
    
    // 重生间隔 (毫秒)
    private static readonly RESPAWN_DELAY = 10000; // 10秒

    constructor(scene: Scene, sceneRoot: TransformNode) {
        this.scene = scene;
        this.enemiesRoot = new TransformNode('enemiesRoot', scene);
        this.enemiesRoot.parent = sceneRoot;
    }
    
    /**
     * 清空所有敌人
     */
    public clear(): void {
        this.enemies.forEach(entity => {
            entity.root.dispose();
            // AI 可能需要清理
        });
        this.enemies.clear();
        
        // 清理调试网格
        this.debugMeshes.forEach(meshes => {
            meshes.forEach(m => m.dispose());
        });
        this.debugMeshes.clear();
    }

    /**
     * 设置路径点系统
     */
    public setWaypointSystem(system: ClWaypointSystem): void {
        this.waypointSystem = system;
        // 更新现有的 AI
        this.enemies.forEach(e => {
            if (e.ai) {
                e.ai.setWaypointSystem(system);
            }
        });
    }
    
    /**
     * 设置地形高度检测回调
     */
    public setTerrainHeightCallback(callback: (x: number, z: number) => number): void {
        this.getTerrainHeight = callback;
        // 更新现有 AI 的回调，并立即修正高度
        this.enemies.forEach(e => {
            if (e.ai) {
                e.ai.setTerrainHeightCallback(callback);
            }
            // 立即修正敌人高度，防止初始位置被埋在地下
            const x = e.root.position.x;
            const z = e.root.position.z;
            const terrainY = callback(x, z);
            e.root.position.y = terrainY;
            console.log(`🔧 敌人 ${e.data.name} 高度修正: Y=${terrainY.toFixed(2)} at (${x.toFixed(1)}, ${z.toFixed(1)})`);
        });
    }
    
    /**
     * 初始化敌人系统
     */
    async init(): Promise<void> {
        this.createMaterials();
        this.createGlowLayer();
        this.spawnInitialEnemies();
        // this.startPatrolBehavior(); // 移除旧的巡逻逻辑
        
        console.log(`✅ 敌人系统初始化完成 (${this.enemies.size}个敌人)`);
    }

    /**
     * 每帧更新
     * @param deltaTime 秒
     * @param playerPosition 玩家位置
     */
    public update(deltaTime: number, playerPosition: Vector3 | null): void {
        this.enemies.forEach(entity => {
            entity.ai.update(deltaTime, playerPosition);
            
            // 更新指示器状态
            const state = entity.ai.getState();
            
            // 同步 Aggro 状态，用于防止被其他逻辑打断 (虽然目前没有其他逻辑)
            if (state === EnemyState.CHASE || state === EnemyState.ATTACK) {
                entity.isAggro = true;
            } else if (state === EnemyState.IDLE || state === EnemyState.PATROL) {
                entity.isAggro = false;
            }
        });
        
        // 处理重生队列
        this.processRespawnQueue();
    }
    
    /**
     * 处理重生队列
     */
    private processRespawnQueue(): void {
        const now = Date.now();
        const toRespawn: typeof this.respawnQueue = [];
        
        // 找出需要重生的敌人
        this.respawnQueue = this.respawnQueue.filter(item => {
            if (now >= item.respawnTime) {
                toRespawn.push(item);
                return false;
            }
            return true;
        });
        
        // 执行重生
        toRespawn.forEach(item => {
            // 随机新位置 (在原出生点附近 ±20 范围)
            const range = 20;
            const newX = item.data.position.x + (Math.random() - 0.5) * 2 * range;
            const newZ = item.data.position.z + (Math.random() - 0.5) * 2 * range;
            const newY = this.getTerrainHeight ? this.getTerrainHeight(newX, newZ) : 0;
            
            const newData: EnemyData = {
                ...item.data,
                id: `${item.data.id}_respawn_${Date.now()}`,
                position: new Vector3(newX, newY, newZ)
            };
            
            this.spawnEnemy(newData, item.properties);
            console.log(`🔄 敌人 ${newData.name} 重生于 (${newX.toFixed(1)}, ${newY.toFixed(1)}, ${newZ.toFixed(1)})`);
        });
    }
    
    /**
     * 设置遭遇回调
     */
    setEncounterCallback(callback: (enemy: EnemyData) => void): void {
        this.onEnemyEncounter = callback;
    }
    
    /**
     * 创建材质
     */
    private createMaterials(): void {
        // 普通怪 - 暗红色
        this.normalMaterial = new PBRMaterial('enemyNormalMat', this.scene);
        this.normalMaterial.albedoColor = new Color3(0.6, 0.2, 0.2);
        this.normalMaterial.metallic = 0.3;
        this.normalMaterial.roughness = 0.7;
        this.normalMaterial.emissiveColor = new Color3(0.2, 0.05, 0.05);
        
        // 精英怪 - 紫色
        this.eliteMaterial = new PBRMaterial('enemyEliteMat', this.scene);
        this.eliteMaterial.albedoColor = new Color3(0.5, 0.2, 0.6);
        this.eliteMaterial.metallic = 0.5;
        this.eliteMaterial.roughness = 0.5;
        this.eliteMaterial.emissiveColor = new Color3(0.15, 0.05, 0.2);
        
        // BOSS - 金色
        this.bossMaterial = new PBRMaterial('enemyBossMat', this.scene);
        this.bossMaterial.albedoColor = new Color3(0.8, 0.6, 0.2);
        this.bossMaterial.metallic = 0.8;
        this.bossMaterial.roughness = 0.3;
        this.bossMaterial.emissiveColor = new Color3(0.3, 0.2, 0.05);
    }
    
    /**
     * 创建发光层
     */
    private createGlowLayer(): void {
        this.glowLayer = new GlowLayer('enemyGlow', this.scene);
        this.glowLayer.intensity = 0.5;
    }
    
    /**
     * 生成初始敌人
     */
    private spawnInitialEnemies(): void {
        // 初始敌人现在由 LevelLoader 加载，这里不再硬编码生成
        // 但为了兼容旧代码，如果 LevelLoader 没有加载任何敌人，我们可以在这里生成一些
        
        // 临时：在野外随机位置生成两个怪物
        console.log("生成野外随机怪物...");
        const range = 30; // 范围 +/- 30
        
        for (let i = 0; i < 2; i++) {
            // 随机位置
            const x = (Math.random() - 0.5) * 2 * range;
            const z = (Math.random() - 0.5) * 2 * range;
            
            const id = `wild_enemy_${i}_${Date.now()}`;
            
            const data: EnemyData = {
                id: id,
                type: EnemyType.NORMAL,
                name: `Wild Monster ${i+1}`,
                level: 1,
                position: new Vector3(x, 0, z),
                patrolRadius: 8
            };
            
            this.spawnEnemy(data);
            console.log(`已生成怪物: ${data.name} at (${x.toFixed(1)}, 0, ${z.toFixed(1)})`);
        }
    }

    /**
     * 生成敌人实例 (供数据驱动加载器使用)
     */
    spawnInstance(prefab: string, position: Vector3, rotation: number[] = [0, 0, 0], properties?: any): void {
        // 解析 prefab 字符串，例如 "enemy_normal_goblin"
        // 暂时简化：prefab 包含类型信息，如 "normal", "elite", "boss"
        
        let type = EnemyType.NORMAL;
        if (prefab.includes('elite')) type = EnemyType.ELITE;
        if (prefab.includes('boss')) type = EnemyType.BOSS;
        
        const id = `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        const data: EnemyData = {
            id: id,
            type: type,
            name: prefab, // 暂时用 prefab 名作为名字
            level: 1,
            position: position,
            patrolRadius: properties?.patrolRadius || 5
        };
        
        this.spawnEnemy(data, properties);
        
        // 找到刚刚生成的敌人根节点，应用旋转
        const root = this.enemiesRoot.getChildren().find(n => n.name === `enemy_${id}`) as TransformNode;
        if (root) {
            if (rotation && rotation.length === 3) {
                root.rotation = new Vector3(
                    rotation[0] * (Math.PI / 180),
                    rotation[1] * (Math.PI / 180),
                    rotation[2] * (Math.PI / 180)
                );
            }
            
            // 设置元数据，以便编辑器识别和保存
            // 我们在 root 节点上设置 metadata
            root.metadata = {
                type: 'enemy',
                prefab: prefab,
                aiConfig: properties // 保存 AI 配置
            };
            
            // 查找 body mesh 开启碰撞
            const body = root.getChildMeshes().find(m => m.name.endsWith('_body'));
            if (body) {
                // 确保碰撞开启
                body.checkCollisions = true;
            }
        }
    }
    
    /**
     * 生成单个敌人
     */
    spawnEnemy(data: EnemyData, properties?: any): void {
        const root = new TransformNode(`enemy_${data.id}`, this.scene);
        root.position = data.position.clone();
        root.parent = this.enemiesRoot;
        
        // 根据类型选择大小和材质
        let size = 1;
        let material: PBRMaterial | null = null;
        
        switch (data.type) {
            case EnemyType.NORMAL:
                size = 0.8;
                material = this.normalMaterial;
                break;
            case EnemyType.ELITE:
                size = 1.2;
                material = this.eliteMaterial;
                break;
            case EnemyType.BOSS:
                size = 2.0;
                material = this.bossMaterial;
                break;
        }
        
        // 创建敌人身体（简单的胶囊形状）
        const body = MeshBuilder.CreateCapsule(`${data.id}_body`, {
            height: size * 2,
            radius: size * 0.4,
        }, this.scene);
        body.position.y = size;
        body.material = material;
        body.parent = root;
        
        // 创建头顶指示器（感叹号形状的菱形）
        const indicator = MeshBuilder.CreatePolyhedron(`${data.id}_indicator`, {
            type: 1, // 八面体
            size: 0.2,
        }, this.scene);
        indicator.position.y = size * 2.5;
        indicator.parent = root;
        
        // 指示器材质
        const indicatorMat = new PBRMaterial(`${data.id}_indicatorMat`, this.scene);
        indicatorMat.emissiveColor = this.getIndicatorColor(data.type);
        indicator.material = indicatorMat;
        
        // 添加到发光层
        if (this.glowLayer) {
            this.glowLayer.addIncludedOnlyMesh(indicator);
        }
        
        // 指示器旋转动画
        this.addIndicatorAnimation(indicator);
        
        // 初始化 AI
        const ai = new ClEnemyAI(root, {
            patrolRadius: properties?.patrolRadius || data.patrolRadius || 5,
            aggroRadius: properties?.aggroRadius || 6,
            // 根据类型调整 AI 参数
            moveSpeed: data.type === EnemyType.BOSS ? 1.5 : 2.0,
            chaseSpeed: data.type === EnemyType.BOSS ? 3.0 : 3.5,
            attackRange: data.type === EnemyType.BOSS ? 3.0 : 1.5,
            // 传递其他属性 (patrolType, nextWaypointId)
            ...properties
        }, this.waypointSystem);
        
        // 设置地形高度回调
        if (this.getTerrainHeight) {
            ai.setTerrainHeightCallback(this.getTerrainHeight);
        }

        // 存储敌人实体
        const entity: EnemyEntity = {
            data,
            mesh: body,
            root,
            indicator,
            patrolCenter: data.position.clone(),
            isAggro: false,
            ai: ai
        };
        
        this.enemies.set(data.id, entity);
    }
    
    /**
     * 获取指示器颜色
     */
    private getIndicatorColor(type: EnemyType): Color3 {
        const colorConfig = ENEMY_COLOR_CONFIG[type].indicator;
        return new Color3(colorConfig.r, colorConfig.g, colorConfig.b);
    }
    
    /**
     * 添加指示器旋转动画
     */
    private addIndicatorAnimation(indicator: Mesh): void {
        const rotateAnim = new Animation(
            'indicatorRotate',
            'rotation.y',
            30,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        rotateAnim.setKeys([
            { frame: 0, value: 0 },
            { frame: 60, value: Math.PI * 2 },
        ]);
        
        indicator.animations.push(rotateAnim);
        this.scene.beginAnimation(indicator, 0, 60, true);
        
        // 上下浮动
        const floatAnim = new Animation(
            'indicatorFloat',
            'position.y',
            30,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        const baseY = indicator.position.y;
        floatAnim.setKeys([
            { frame: 0, value: baseY },
            { frame: 30, value: baseY + 0.2 },
            { frame: 60, value: baseY },
        ]);
        
        indicator.animations.push(floatAnim);
        this.scene.beginAnimation(indicator, 0, 60, true);
    }
    

    
    /**
     * 检测玩家碰撞
     */
    checkPlayerCollision(playerPosition: Vector3): EnemyData | null {
        const detectionRadius = 2.5; // 检测半径
        
        for (const [, entity] of this.enemies) {
            const distance = Vector3.Distance(playerPosition, entity.root.position);
            
            if (distance < detectionRadius) {
                // 触发遭遇
                entity.isAggro = true;
                
                if (this.onEnemyEncounter) {
                    this.onEnemyEncounter(entity.data);
                }
                
                return entity.data;
            }
        }
        
        return null;
    }
    
    /**
     * 移除敌人（战斗胜利后）
     * @param enemyId 敌人ID
     * @param shouldRespawn 是否应该重生，默认为 true
     */
    removeEnemy(enemyId: string, shouldRespawn: boolean = true): void {
        const entity = this.enemies.get(enemyId);
        if (entity) {
            // 保存重生数据
            if (shouldRespawn) {
                this.respawnQueue.push({
                    data: { ...entity.data },
                    respawnTime: Date.now() + ClEnemySystem.RESPAWN_DELAY,
                    properties: entity.ai.getConfig()
                });
                console.log(`🗡️ 敌人 ${entity.data.name} 被击败，将在 10 秒后重生`);
            } else {
                console.log(`🗡️ 敌人 ${entity.data.name} 被永久击败`);
            }
            
            entity.root.dispose();
            this.enemies.delete(enemyId);
        }
    }
    
    /**
     * 重置敌人状态（战斗逃跑后）
     */
    resetEnemy(enemyId: string): void {
        const entity = this.enemies.get(enemyId);
        if (entity) {
            entity.isAggro = false;
        }
    }
    
    /**
     * 获取所有敌人网格（供优化系统使用）
     */
    getMeshes(): Mesh[] {
        const meshes: Mesh[] = [];
        this.enemies.forEach(entity => {
            meshes.push(entity.mesh);
            meshes.push(entity.indicator);
        });
        return meshes;
    }
    
    /**
     * 获取敌人数量
     */
    getEnemyCount(): number {
        return this.enemies.size;
    }
    
    /**
     * 更新敌人配置 (实时)
     */
    updateEnemyConfig(enemyId: string, config: any): void {
        // enemyId 可能是 "enemy_123" 或者 mesh name
        // 我们的 map key 是 data.id
        
        // 尝试通过 ID 查找
        let entity = this.enemies.get(enemyId);
        
        // 如果找不到，尝试遍历查找 (因为传入的可能是 mesh name)
        if (!entity) {
            for (const e of this.enemies.values()) {
                if (e.root.name === enemyId || e.mesh.name === enemyId) {
                    entity = e;
                    break;
                }
            }
        }

        if (entity) {
            entity.ai.setConfig(config);
            // 如果正在显示调试信息，刷新它
            if (this.debugMeshes.has(entity.data.id)) {
                this.hideDebugGizmos(entity.data.id);
                this.showDebugGizmos(entity.data.id);
            }
        }
    }

    /**
     * 显示调试 Gizmos (巡逻范围、警戒范围)
     */
    showDebugGizmos(enemyId: string): void {
        // 查找实体
        let entity = this.enemies.get(enemyId);
        if (!entity) {
            for (const e of this.enemies.values()) {
                if (e.root.name === enemyId || e.mesh.name === enemyId) {
                    entity = e;
                    break;
                }
            }
        }

        if (!entity) return;
        
        const id = entity.data.id;
        
        // 如果已存在，先清除
        this.hideDebugGizmos(id);

        const config = entity.ai.getConfig();
        const spawnPoint = entity.ai.getSpawnPoint();
        const meshes: Mesh[] = [];

        // 1. 巡逻范围 (黄色圆圈)
        const patrolCircle = MeshBuilder.CreateDisc(`debug_patrol_${id}`, {
            radius: config.patrolRadius,
            tessellation: 64
        }, this.scene);
        patrolCircle.rotation.x = Math.PI / 2;
        patrolCircle.position = spawnPoint.clone();
        patrolCircle.position.y += 0.1; // 稍微抬高
        
        const patrolMat = new PBRMaterial(`debug_patrol_mat_${id}`, this.scene);
        patrolMat.albedoColor = new Color3(1, 1, 0);
        patrolMat.alpha = 0.2;
        patrolMat.unlit = true;
        patrolCircle.material = patrolMat;
        patrolCircle.isPickable = false;
        meshes.push(patrolCircle);

        // 2. 警戒范围 (红色圆圈) - 跟随怪物移动
        const aggroCircle = MeshBuilder.CreateDisc(`debug_aggro_${id}`, {
            radius: config.aggroRadius,
            tessellation: 64
        }, this.scene);
        aggroCircle.rotation.x = Math.PI / 2;
        aggroCircle.parent = entity.root; // 绑定到怪物身上
        aggroCircle.position.y = 0.15;
        
        const aggroMat = new PBRMaterial(`debug_aggro_mat_${id}`, this.scene);
        aggroMat.albedoColor = new Color3(1, 0, 0);
        aggroMat.alpha = 0.1;
        aggroMat.unlit = true;
        aggroCircle.material = aggroMat;
        aggroCircle.isPickable = false;
        meshes.push(aggroCircle);

        this.debugMeshes.set(id, meshes);
    }

    /**
     * 隐藏调试 Gizmos
     */
    hideDebugGizmos(enemyId: string): void {
        // 查找实体 ID
        let id = enemyId;
        if (!this.enemies.has(id)) {
             for (const [eid, e] of this.enemies) {
                if (e.root.name === enemyId || e.mesh.name === enemyId) {
                    id = eid;
                    break;
                }
            }
        }

        const meshes = this.debugMeshes.get(id);
        if (meshes) {
            meshes.forEach(m => m.dispose());
            this.debugMeshes.delete(id);
        }
    }

    /**
     * 清理资源
     */
    dispose(): void {
        this.debugMeshes.forEach(meshes => meshes.forEach(m => m.dispose()));
        this.debugMeshes.clear();
        
        this.enemies.forEach(entity => entity.root.dispose());
        this.enemies.clear();
        this.normalMaterial?.dispose();
        this.eliteMaterial?.dispose();
        this.bossMaterial?.dispose();
        this.glowLayer?.dispose();
        this.enemiesRoot.dispose();
    }
}

export default ClEnemySystem;
