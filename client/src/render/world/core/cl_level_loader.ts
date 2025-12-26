/**
 * 关卡加载器 - 数据驱动的核心
 * 
 * 模块: client/render/world/core
 * 前缀: Cl
 * 文档: 文档/11-第5阶段-画质与架构.md
 * 
 * 职责:
 * 1. 读取 map_*.json 配置文件
 * 2. 解析地图设置 (天空盒、光照)
 * 3. 调度各个子系统生成实体 (树木、建筑、怪物)
 */

import { Scene, Vector3, AbstractMesh, Color3, Color4, CubeTexture, HemisphericLight, DirectionalLight } from '@babylonjs/core';
import { ClTreeSystem } from '../vegetation/cl_tree_system';
import { ClStructureSystem } from '../structures/cl_structure_system';
import { ClTerrainManager } from '../terrain/cl_terrain_manager';
import { ClAssetManager } from '../cl_asset_manager';

import { ClEnemySystem } from '../entities/cl_enemy_system';
import { ClWaypointSystem } from '../systems/cl_waypoint_system';

// 数据接口定义
export interface MapData {
    id: string;
    name: string;
    version: string;
    settings: {
        size: number;
        skybox: string;
        ambientColor: number[];
        fogDensity: number;
        fogColor?: number[]; // [r, g, b]
        sunIntensity?: number;
        sunDirection?: number[]; // [x, y, z]
    };
    entities: MapEntityData[];
}

export interface MapEntityData {
    type: 'tree' | 'structure' | 'enemy' | 'npc' | 'waypoint';
    id: string;
    prefab: string; // 预制体名称 (e.g., "pavilion", "tree_pine")
    position: number[]; // [x, y, z]
    rotation?: number[]; // [x, y, z]
    scale?: number | number[];
    properties?: any; // 额外属性
}

export class ClLevelLoader {
    private scene: Scene;
    private treeSystem: ClTreeSystem;
    private structureSystem: ClStructureSystem;
    private terrainManager: ClTerrainManager;
    private assetManager: ClAssetManager;
    private enemySystem: ClEnemySystem | null = null;
    private waypointSystem: ClWaypointSystem | null = null;
    
    // 当前加载的地图数据 (用于保存时作为模板)
    private currentMapData: MapData | null = null;

    constructor(
        scene: Scene,
        treeSystem: ClTreeSystem,
        structureSystem: ClStructureSystem,
        terrainManager: ClTerrainManager,
        assetManager: ClAssetManager,
        enemySystem: ClEnemySystem | null = null,
        waypointSystem: ClWaypointSystem | null = null
    ) {
        this.scene = scene;
        this.treeSystem = treeSystem;
        this.structureSystem = structureSystem;
        this.terrainManager = terrainManager;
        this.assetManager = assetManager;
        this.enemySystem = enemySystem;
        this.waypointSystem = waypointSystem;
    }

    /**
     * 设置路径点系统
     */
    public setWaypointSystem(waypointSystem: ClWaypointSystem): void {
        this.waypointSystem = waypointSystem;
    }

    /**
     * 获取敌人系统
     */
    public getEnemySystem(): ClEnemySystem | null {
        return this.enemySystem;
    }

    /**
     * 获取路径点系统
     */
    public getWaypointSystem(): ClWaypointSystem | null {
        return this.waypointSystem;
    }

    /**
     * 清空当前地图
     */
    public clearMap(): void {
        console.log("🧹 清空地图...");
        
        // 1. 清空树木
        if (this.treeSystem) {
            this.treeSystem.clear();
        }
        
        // 2. 清空建筑
        if (this.structureSystem) {
            this.structureSystem.clear();
        }
        
        // 3. 清空敌人
        if (this.enemySystem) {
            this.enemySystem.clear();
        }
        
        // 4. 清空路径点
        if (this.waypointSystem) {
            // WaypointSystem 的 dispose 实际上是清空
            // 但为了语义清晰，我们假设它有 clear 或者我们调用 dispose 再重新初始化？
            // 检查 WaypointSystem 发现它有 dispose() 清空 waypoints 数组和 mesh
            // 但它没有 clear()。我们可以调用 dispose()，但要注意它是否会销毁系统本身？
            // WaypointSystem.dispose() 只是清空了 waypoints 和 debugLines，没有销毁系统本身。
            // 所以可以安全调用。
            this.waypointSystem.dispose();
        }
        
        console.log("✅ 地图已清空");
    }

    /**
     * 导出当前地图数据
     */
    public exportMapData(): MapData {
        // 1. 基础模板
        const data: MapData = this.currentMapData ? JSON.parse(JSON.stringify(this.currentMapData)) : {
            id: "map_default",
            name: "Custom Map",
            version: "1.0.0",
            settings: {
                size: 500,
                skybox: "sky_day",
                ambientColor: [0.8, 0.8, 0.9],
                fogDensity: 0.002
            },
            entities: []
        };
        
        // 1.5 更新环境设置
        if (this.scene.fogMode !== Scene.FOGMODE_NONE) {
            data.settings.fogDensity = this.scene.fogDensity;
            if (this.scene.fogColor) {
                data.settings.fogColor = [this.scene.fogColor.r, this.scene.fogColor.g, this.scene.fogColor.b];
            }
        }
        
        if (this.scene.clearColor) {
            data.settings.ambientColor = [this.scene.clearColor.r, this.scene.clearColor.g, this.scene.clearColor.b];
        }

        // 2. 清空实体列表，重新生成
        data.entities = [];
        
        // 3. 遍历场景中的所有可保存物体
        // 我们约定：所有可保存物体的 name 格式为 "{type}_{prefab}_{id}"
        // 例如: "tree_pine_123", "structure_pavilion_456"
        
        const allNodes = [...this.scene.meshes, ...this.scene.transformNodes];
        
        allNodes.forEach(node => {
            // 忽略不可见物体、Gizmo、天空盒等
            if (!node.isEnabled() || node.name.startsWith("gizmo") || node.name.includes("ground")) return;
            
            // 忽略作为组件的子节点 (例如敌人的 body mesh)
            // 如果父节点有 metadata，说明父节点是实体根，当前节点只是部件
            if (node.parent && node.parent.metadata && (node.parent.metadata.type === 'enemy' || node.parent.metadata.type === 'structure')) return;
            
            // 1. 优先使用 metadata (新标准)
            if (node.metadata && (node.metadata.type === 'tree' || node.metadata.type === 'structure' || node.metadata.type === 'enemy' || node.metadata.type === 'waypoint')) {
                 const entity: MapEntityData = {
                    type: node.metadata.type,
                    id: node.name,
                    prefab: node.metadata.prefab || "waypoint", // waypoint 可能没有 prefab
                    position: [
                        Number(node.position.x.toFixed(2)), 
                        Number(node.position.y.toFixed(2)), 
                        Number(node.position.z.toFixed(2))
                    ],
                    rotation: [
                        Number((node.rotation?.x || 0).toFixed(2)),
                        Number((node.rotation?.y || 0).toFixed(2)),
                        Number((node.rotation?.z || 0).toFixed(2))
                    ],
                    scale: [
                        Number(node.scaling.x.toFixed(2)),
                        Number(node.scaling.y.toFixed(2)),
                        Number(node.scaling.z.toFixed(2))
                    ],
                    properties: node.metadata.type === 'enemy' ? node.metadata.aiConfig : 
                               (node.metadata.type === 'waypoint' ? { nextWaypointId: node.metadata.nextWaypointId, waitTime: node.metadata.waitTime } : undefined)
                };
                data.entities.push(entity);
                return;
            }

            // 2. 回退到名称解析 (旧标准) - 只针对 Mesh
            if (node instanceof AbstractMesh) {
                // 忽略子网格
                if (node.parent && (node.parent as AbstractMesh).name) return;

                const parts = node.name.split('_');
                if (parts.length >= 3) {
                    const type = parts[0]; // tree, structure
                    const prefab = parts[1]; // pine, pavilion
                    
                    // 简单的类型映射
                    if (type === 'tree' || type === 'structure') {
                        const entity: MapEntityData = {
                            type: type as 'tree' | 'structure',
                            id: node.name,
                            prefab: prefab,
                            position: [
                                Number(node.position.x.toFixed(2)), 
                                Number(node.position.y.toFixed(2)), 
                                Number(node.position.z.toFixed(2))
                            ],
                            rotation: [
                                Number((node.rotation?.x || 0).toFixed(2)),
                                Number((node.rotation?.y || 0).toFixed(2)),
                                Number((node.rotation?.z || 0).toFixed(2))
                            ],
                            scale: [
                                Number(node.scaling.x.toFixed(2)),
                                Number(node.scaling.y.toFixed(2)),
                                Number(node.scaling.z.toFixed(2))
                            ]
                        };
                        data.entities.push(entity);
                    }
                }
            }
            // 处理用户上传的模型 (user_upload_xxx) - 只针对 Mesh
            else if (node instanceof AbstractMesh && node.name.startsWith("user_upload_")) {
                 // 对于用户上传的模型，我们将其视为 structure
                 // prefab 就是文件名 (去掉 user_upload_ 前缀)
                 // 注意：这里需要更严谨的 ID 管理，暂时简化处理
                 const prefab = node.name.replace("user_upload_", "");
                 const entity: MapEntityData = {
                    type: 'structure',
                    id: node.name,
                    prefab: "user_upload_" + prefab, // 保持完整前缀
                    position: [
                        Number(node.position.x.toFixed(2)), 
                        Number(node.position.y.toFixed(2)), 
                        Number(node.position.z.toFixed(2))
                    ],
                    rotation: [
                        Number((node.rotation?.x || 0).toFixed(2)),
                        Number((node.rotation?.y || 0).toFixed(2)),
                        Number((node.rotation?.z || 0).toFixed(2))
                    ],
                    scale: [
                        Number(node.scaling.x.toFixed(2)),
                        Number(node.scaling.y.toFixed(2)),
                        Number(node.scaling.z.toFixed(2))
                    ]
                };
                data.entities.push(entity);
            }
        });
        
        return data;
    }

    /**
     * 加载指定地图
     * @param mapId 地图ID (对应 assets/data/{mapId}.json)
     */
    /**
     * 设置敌人系统
     */
    public setEnemySystem(enemySystem: ClEnemySystem): void {
        this.enemySystem = enemySystem;
    }

    /**
     * 获取指定位置的地形高度 (供编辑器使用)
     */
    public getTerrainHeight(x: number, z: number): number {
        return this.terrainManager.getHeightAt(x, z);
    }

    /**
     * 生成单个实体 (供编辑器使用)
     * 自动贴地处理
     */
    public async spawnEntity(type: 'tree' | 'structure' | 'enemy' | 'waypoint', prefab: string, position: Vector3, rotation?: Vector3, scale?: Vector3): Promise<void> {
        // 自动贴地：如果 y 为 0 或负数，查询地形高度
        if (position.y <= 0) {
            position.y = this.terrainManager.getHeightAt(position.x, position.z);
        }
        switch (type) {
            case 'tree':
                if (this.treeSystem) {
                    // 暂时假设 TreeSystem 有一个 spawnInstance 方法
                    (this.treeSystem as any).spawnInstance?.(prefab, position, scale?.x || 1);
                }
                break;
            case 'structure':
                // 检查是否是用户上传的模型
                if (prefab.startsWith('user_upload_')) {
                    const filename = prefab.replace('user_upload_', '');
                    await this.assetManager.loadUploadedMesh(filename, prefab);
                }

                if (this.structureSystem) {
                    (this.structureSystem as any).spawnInstance?.(prefab, position, rotation ? [rotation.x, rotation.y, rotation.z] : [0, 0, 0]);
                }
                break;
            case 'enemy':
                if (this.enemySystem) {
                    this.enemySystem.spawnInstance(prefab, position, rotation ? [rotation.x, rotation.y, rotation.z] : [0, 0, 0]);
                }
                break;
            case 'waypoint':
                if (this.waypointSystem) {
                    // 生成唯一 ID
                    const id = "waypoint_" + Date.now();
                    this.waypointSystem.createWaypoint(id, position);
                }
                break;
        }
    }

    async loadMap(mapId: string): Promise<void> {
        console.log(`🗺️ 开始加载地图: ${mapId}`);
        
        try {
            // 1. Fetch JSON
            const response = await fetch(`assets/data/${mapId}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load map data: ${response.statusText}`);
            }
            const data: MapData = await response.json();
            await this.loadMapData(data);
        } catch (error) {
            console.error('❌ 地图加载失败:', error);
        }
    }

    /**
     * 直接加载地图数据对象
     */
    public async loadMapData(data: MapData): Promise<void> {
        this.currentMapData = data;
        
        // 2. 应用全局设置
        this.applySettings(data.settings);
        
        // 3. 生成实体
        await this.spawnEntities(data.entities);
        
        console.log(`✅ 地图数据加载完成: ${data.name}`);
    }

    /**
     * 应用地图设置
     */
    private applySettings(settings: MapData['settings']): void {
        // 设置雾效
        if (settings.fogDensity > 0) {
            this.scene.fogMode = Scene.FOGMODE_EXP;
            this.scene.fogDensity = settings.fogDensity;
        }
        
        if (settings.fogColor) {
            this.scene.fogColor = new Color3(settings.fogColor[0], settings.fogColor[1], settings.fogColor[2]);
        }

        // 设置环境光颜色 (Scene Clear Color)
        if (settings.ambientColor) {
            this.scene.clearColor = new Color4(
                settings.ambientColor[0], 
                settings.ambientColor[1], 
                settings.ambientColor[2], 
                1
            );
        }
        
        // 设置天空盒
        if (settings.skybox) {
            this.setupSkybox(settings.skybox);
        }
        
        // 设置太阳光
        if (settings.sunIntensity !== undefined || settings.sunDirection) {
            this.setupSunLight(settings.sunIntensity, settings.sunDirection);
        }
        
        // 设置环境光 (Hemispheric Light)
        this.setupAmbientLight(settings.ambientColor);
    }
    
    /**
     * 设置天空盒
     */
    private setupSkybox(skyboxName: string): void {
        // 检查是否已存在天空盒
        const existingSkybox = this.scene.getMeshByName('skyBox');
        if (existingSkybox) {
            existingSkybox.dispose();
        }
        
        try {
            // 尝试加载天空盒纹理 (假设在 assets/skybox/ 目录下)
            const skyboxPath = `/assets/skybox/${skyboxName}`;
            
            // 创建天空盒材质
            const skyboxTexture = CubeTexture.CreateFromPrefilteredData(
                `${skyboxPath}.env`,
                this.scene
            );
            
            this.scene.environmentTexture = skyboxTexture;
            this.scene.createDefaultSkybox(skyboxTexture, true, 1000);
            
            console.log(`🌅 天空盒已加载: ${skyboxName}`);
        } catch (error) {
            console.warn(`⚠️ 无法加载天空盒 ${skyboxName}:`, error);
            // 使用默认渐变天空
            this.createGradientSky();
        }
    }
    
    /**
     * 创建渐变天空 (备用方案)
     */
    private createGradientSky(): void {
        // 设置简单的天空颜色
        this.scene.clearColor = new Color4(0.5, 0.7, 1.0, 1.0);
        console.log('🌤️ 使用默认渐变天空');
    }
    
    /**
     * 设置太阳光 (方向光)
     */
    private setupSunLight(intensity?: number, direction?: number[]): void {
        // 查找或创建太阳光
        let sunLight = this.scene.getLightByName('sunLight') as DirectionalLight | null;
        
        if (!sunLight) {
            sunLight = new DirectionalLight(
                'sunLight',
                new Vector3(-1, -2, -1).normalize(),
                this.scene
            );
        }
        
        // 设置强度
        if (intensity !== undefined) {
            sunLight.intensity = intensity;
        }
        
        // 设置方向
        if (direction && direction.length >= 3) {
            sunLight.direction = new Vector3(direction[0], direction[1], direction[2]).normalize();
        }
        
        console.log(`☀️ 太阳光设置完成: 强度=${sunLight.intensity}`);
    }
    
    /**
     * 设置环境光 (半球光)
     */
    private setupAmbientLight(ambientColor?: number[]): void {
        // 查找或创建环境光
        let ambientLight = this.scene.getLightByName('ambientLight') as HemisphericLight | null;
        
        if (!ambientLight) {
            ambientLight = new HemisphericLight(
                'ambientLight',
                new Vector3(0, 1, 0),
                this.scene
            );
            ambientLight.intensity = 0.5;
        }
        
        // 设置颜色
        if (ambientColor && ambientColor.length >= 3) {
            ambientLight.diffuse = new Color3(ambientColor[0], ambientColor[1], ambientColor[2]);
            ambientLight.groundColor = new Color3(
                ambientColor[0] * 0.5,
                ambientColor[1] * 0.5,
                ambientColor[2] * 0.5
            );
        }
    }

    /**
     * 生成实体
     */
    private async spawnEntities(entities: MapEntityData[]): Promise<void> {
        for (const entity of entities) {
            const pos = new Vector3(entity.position[0], entity.position[1], entity.position[2]);
            
            // 自动贴地 (如果Y为0或未指定，且不是空中单位)
            // 这里简单处理：如果Y是0，尝试获取地形高度
            // 注意：地形高度获取可能需要地形已经构建完成
            if (pos.y === 0) {
                pos.y = this.terrainManager.getHeightAt(pos.x, pos.z);
            }

            switch (entity.type) {
                case 'tree':
                    // 调用树木系统生成
                    // 需要 ClTreeSystem 支持 spawnTree(prefab, pos, scale)
                    if (this.treeSystem) {
                        // 临时转换：目前 TreeSystem 主要是随机生成，我们需要扩展它
                        // 暂时假设 TreeSystem 有一个 spawnInstance 方法
                        (this.treeSystem as any).spawnInstance?.(entity.prefab, pos, entity.scale);
                    }
                    break;
                    
                case 'structure':
                    // 检查是否是用户上传的模型
                    if (entity.prefab.startsWith('user_upload_')) {
                        const filename = entity.prefab.replace('user_upload_', '');
                        // 确保已加载
                        await this.assetManager.loadUploadedMesh(filename, entity.prefab);
                    }

                    // 调用建筑系统生成
                    if (this.structureSystem) {
                        (this.structureSystem as any).spawnInstance?.(entity.prefab, pos, entity.rotation);
                    }
                    break;

                case 'enemy':
                    // 调用敌人系统生成
                    if (this.enemySystem) {
                        this.enemySystem.spawnInstance(entity.prefab, pos, entity.rotation, entity.properties);
                    }
                    break;

                case 'waypoint':
                    if (this.waypointSystem) {
                        // entity.id 已经是 "waypoint_xxx" 格式，或者我们只取后缀
                        // createWaypoint 需要 ID
                        // 如果 entity.id 包含 "waypoint_" 前缀，我们可以直接用，或者去掉前缀
                        // 这里假设 createWaypoint 接受完整 ID 或者后缀
                        // 为了保持一致性，我们传入 entity.id (例如 "waypoint_123")
                        // 但 createWaypoint 内部可能会再加前缀，所以我们需要检查一下 ClWaypointSystem
                        // ClWaypointSystem.createWaypoint(id) -> MeshBuilder.CreateBox("waypoint_" + id)
                        // 所以我们应该传入去掉前缀的 ID
                        const id = entity.id.replace("waypoint_", "");
                        this.waypointSystem.createWaypoint(id, pos, entity.properties);
                    }
                    break;
            }
        }
    }
}
