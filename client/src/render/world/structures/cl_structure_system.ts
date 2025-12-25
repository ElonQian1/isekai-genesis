/**
 * 建筑系统 - 亭台楼阁、桥梁、装饰物
 * 
 * 模块: client/render/world/structures
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责：
 * - 古风建筑（凉亭、塔楼）
 * - 桥梁、石阶
 * - 装饰物（石灯、栏杆）
 */

import {
    Scene,
    TransformNode,
    Mesh,
    MeshBuilder,
    Vector3,
    Color3,
    ShadowGenerator,
} from '@babylonjs/core';

import { CL_WORLD_CONFIG } from '../cl_world_config';
import { ClAssetManager } from '../cl_asset_manager';
import { ClMaterialLibrary } from '../cl_material_library';
import { ClTerrainManager } from '../terrain/cl_terrain_manager';

/**
 * 建筑配置
 */
interface StructureConfig {
    position: Vector3;
    rotation?: number;
    scale?: number;
}

/**
 * 建筑系统
 */
export class ClStructureSystem {
    private scene: Scene;
    private shadowGenerator: ShadowGenerator | null;
    private assetManager: ClAssetManager;
    private materialLibrary: ClMaterialLibrary;
    // private terrainManager: ClTerrainManager;
    
    private structuresRoot: TransformNode;
    private allMeshes: Mesh[] = [];
    
    constructor(
        scene: Scene, 
        sceneRoot: TransformNode, 
        shadowGenerator: ShadowGenerator | null,
        assetManager: ClAssetManager,
        materialLibrary: ClMaterialLibrary,
        _terrainManager: ClTerrainManager
    ) {
        this.scene = scene;
        this.shadowGenerator = shadowGenerator;
        this.assetManager = assetManager;
        this.materialLibrary = materialLibrary;
        // this.terrainManager = terrainManager;
        
        this.structuresRoot = new TransformNode('structuresRoot', scene);
        this.structuresRoot.parent = sceneRoot;
    }
    
    /**
     * 清空所有建筑
     */
    public clear(): void {
        this.allMeshes.forEach(mesh => {
            mesh.dispose();
        });
        this.allMeshes = [];
        
        // 同时清理 structuresRoot 下的所有子节点
        this.structuresRoot.getChildren().forEach(child => {
            child.dispose();
        });
    }

    /**
     * 生成建筑实例 (供数据驱动加载器使用)
     */
    spawnInstance(prefab: string, position: Vector3, rotation: number[] = [0, 0, 0]): void {
        // 1. 尝试从 AssetManager 获取实例 (优先使用外部模型)
        const instance = this.assetManager.createInstance(prefab, `structure_${prefab}_${Math.random()}`);
        
        if (instance) {
            instance.position = position.clone();
            instance.parent = this.structuresRoot;
            
            // 处理旋转
            if (rotation && rotation.length === 3) {
                instance.rotation = new Vector3(
                    rotation[0] * (Math.PI / 180),
                    rotation[1] * (Math.PI / 180),
                    rotation[2] * (Math.PI / 180)
                );
            }
            
            // 启用阴影和碰撞
            if (this.shadowGenerator) {
                instance.getChildMeshes().forEach(m => {
                    if (m instanceof Mesh) {
                        this.shadowGenerator?.addShadowCaster(m);
                        m.receiveShadows = true;
                        // 启用碰撞
                        m.checkCollisions = true;
                    }
                });
            } else {
                // 即使没有阴影生成器，也要启用碰撞
                instance.getChildMeshes().forEach(m => {
                    if (m instanceof Mesh) {
                        m.checkCollisions = true;
                    }
                });
            }
            
            // 如果根节点本身是 Mesh，也启用碰撞
            if (instance instanceof Mesh) {
                instance.checkCollisions = true;
            }
            
            // 设置元数据，以便编辑器识别和保存
            instance.metadata = {
                type: 'structure',
                prefab: prefab
            };

            instance.setEnabled(true);
            return;
        }

        // 2. 回退到程序化生成
        const config: StructureConfig = {
            position: position
        };
        
        // 处理旋转 (这里简化处理，只取Y轴旋转)
        if (rotation && rotation.length >= 2) {
            config.rotation = rotation[1] * (Math.PI / 180);
        }

        switch (prefab) {
            case 'pavilion':
                this.createPavilion(config);
                break;
            case 'bridge':
                this.createBridge(config);
                break;
            default:
                console.warn(`Unknown structure prefab: ${prefab}`);
        }
    }
    
    /**
     * 初始化建筑系统
     */
    async init(): Promise<void> {
        this.initMaterials();
        
        // 注意：pavilion 和 bridge 模型文件不存在
        // 这些建筑使用程序化生成（createPavilion/createBridge）
        // 如果未来有外部模型，可以在这里加载：
        // await this.assetManager.loadMesh("structures/pavilion.glb", "pavilion");
        // await this.assetManager.loadMesh("structures/bridge.glb", "bridge");
        
        // 注意：现在改为由 ClLevelLoader 驱动生成
        // 旧的硬编码生成逻辑已移除，或者可以保留作为默认回退
        // this.createDefaultStructures();
        
        console.log(`✅ 建筑系统初始化完成`);
    }

    // private createDefaultStructures(): void {
    //     // 在地形上放置建筑
    //     const pavilionPos = new Vector3(15, 0, 15);
    //     pavilionPos.y = this.terrainManager.getHeightAt(pavilionPos.x, pavilionPos.z);
    //     this.createPavilion({ position: pavilionPos });
        
    //     const bridgePos = new Vector3(0, 0, -10);
    //     // 桥通常在水面上，高度可能需要手动调整或基于水面高度
    //     bridgePos.y = CL_WORLD_CONFIG.WATER_LEVEL + 1; 
    //     this.createBridge({ position: bridgePos });
        
    //     this.createStoneLanterns();
    // }
    
    /**
     * 初始化材质
     */
    private initMaterials(): void {
        // 确保材质库中有这些材质
        const woodMat = this.materialLibrary.getPBRMaterial('mat_wood');
        woodMat.albedoColor = CL_WORLD_CONFIG.WOOD_COLOR;
        woodMat.roughness = 0.8;
        
        const stoneMat = this.materialLibrary.getPBRMaterial('mat_stone');
        stoneMat.albedoColor = new Color3(0.4, 0.4, 0.45);
        stoneMat.roughness = 0.9;
        
        const roofMat = this.materialLibrary.getPBRMaterial('mat_roof');
        roofMat.albedoColor = CL_WORLD_CONFIG.ROOF_COLOR;
        roofMat.roughness = 0.7;
    }
    
    /**
     * 创建凉亭
     */
    private createPavilion(config: StructureConfig): void {
        const { position, rotation = 0, scale = 1 } = config;
        const root = new TransformNode('pavilion', this.scene);
        root.parent = this.structuresRoot;
        root.position = position;
        root.rotation.y = rotation;
        root.scaling.setAll(scale);
        
        // 基座
        const base = MeshBuilder.CreateCylinder('pavilionBase', {
            height: 0.3,
            diameter: 6,
            tessellation: 8,
        }, this.scene);
        base.position.y = 0.15;
        base.material = this.materialLibrary.getMaterial('mat_stone');
        base.parent = root;
        base.receiveShadows = true;
        
        // 添加交互元数据 (只在基座上添加即可，或者在所有部件上添加)
        base.metadata = {
            name: '观景亭',
            type: 'interactable',
            description: '一座古朴的石基木亭，适合休憩观景。'
        };
        
        this.allMeshes.push(base);
        
        // 柱子 (4根)
        const pillarPositions = [
            new Vector3(2, 0, 2),
            new Vector3(-2, 0, 2),
            new Vector3(2, 0, -2),
            new Vector3(-2, 0, -2),
        ];
        
        pillarPositions.forEach((pos, i) => {
            const pillar = MeshBuilder.CreateCylinder(`pillar${i}`, {
                height: 3,
                diameter: 0.3,
            }, this.scene);
            pillar.position = pos.add(new Vector3(0, 1.8, 0));
            pillar.material = this.materialLibrary.getMaterial('mat_wood');
            pillar.parent = root;
            this.registerShadowCaster(pillar);
            this.allMeshes.push(pillar);
        });
        
        // 屋顶
        const roof = MeshBuilder.CreateCylinder('roof', {
            height: 1.5,
            diameterTop: 0,
            diameterBottom: 7,
            tessellation: 8,
        }, this.scene);
        roof.position.y = 4;
        roof.material = this.materialLibrary.getMaterial('mat_roof');
        roof.parent = root;
        this.registerShadowCaster(roof);
        this.allMeshes.push(roof);
    }
    
    /**
     * 创建桥梁
     */
    private createBridge(config: StructureConfig): void {
        const { position, rotation = 0 } = config;
        const root = new TransformNode('bridge', this.scene);
        root.parent = this.structuresRoot;
        root.position = position;
        root.rotation.y = rotation;
        
        // 桥面（拱形）
        const bridgeDeck = MeshBuilder.CreateBox('bridgeDeck', {
            width: 3,
            height: 0.2,
            depth: 8,
        }, this.scene);
        bridgeDeck.position.y = 0.5;
        bridgeDeck.material = this.materialLibrary.getMaterial('mat_wood');
        bridgeDeck.parent = root;
        bridgeDeck.receiveShadows = true;
        
        bridgeDeck.metadata = {
            name: '木桥',
            type: 'interactable',
            description: '横跨水面的木桥。'
        };
        
        this.allMeshes.push(bridgeDeck);
        
        // 栏杆
        [-1.3, 1.3].forEach((x, i) => {
            const rail = MeshBuilder.CreateBox(`rail${i}`, {
                width: 0.1,
                height: 0.8,
                depth: 8,
            }, this.scene);
            rail.position.set(x, 1, 0);
            rail.material = this.materialLibrary.getMaterial('mat_wood');
            rail.parent = root;
            this.registerShadowCaster(rail);
            this.allMeshes.push(rail);
        });
    }
    
    /**
     * 创建石灯笼
     */
    // private createStoneLanterns(): void {
    //     const positions = [
    //         new Vector3(10, 0, 5),
    //         new Vector3(-10, 0, 5),
    //         new Vector3(20, 0, -15),
    //     ];
        
    //     positions.forEach((pos, i) => {
    //         // 调整高度
    //         pos.y = this.terrainManager.getHeightAt(pos.x, pos.z);
            
    //         const lantern = this.createStoneLantern(`lantern${i}`);
    //         lantern.position = pos;
    //         lantern.parent = this.structuresRoot;
    //     });
    // }
    
    /**
     * 创建单个石灯笼
     */
    // private createStoneLantern(name: string): TransformNode {
    //     const root = new TransformNode(name, this.scene);
        
    //     // 底座
    //     const base = MeshBuilder.CreateCylinder(`${name}_base`, {
    //         height: 0.3,
    //         diameter: 0.8,
    //     }, this.scene);
    //     base.position.y = 0.15;
    //     base.material = this.materialLibrary.getMaterial('mat_stone');
    //     base.parent = root;
    //     this.allMeshes.push(base);
        
    //     // 柱子
    //     const pole = MeshBuilder.CreateCylinder(`${name}_pole`, {
    //         height: 1.5,
    //         diameter: 0.2,
    //     }, this.scene);
    //     pole.position.y = 1.05;
    //     pole.material = this.materialLibrary.getMaterial('mat_stone');
    //     pole.parent = root;
    //     this.allMeshes.push(pole);
        
    //     // 灯罩
    //     const hood = MeshBuilder.CreateBox(`${name}_hood`, {
    //         width: 0.6,
    //         height: 0.6,
    //         depth: 0.6,
    //     }, this.scene);
    //     hood.position.y = 2;
    //     hood.material = this.materialLibrary.getMaterial('mat_stone');
    //     hood.parent = root;
    //     this.registerShadowCaster(hood);
    //     this.allMeshes.push(hood);
        
    //     return root;
    // }
    
    /**
     * 注册阴影投射
     */
    private registerShadowCaster(mesh: Mesh): void {
        if (this.shadowGenerator) {
            this.shadowGenerator.addShadowCaster(mesh);
        }
    }
    
    /**
     * 获取所有网格（供优化系统使用）
     */
    getMeshes(): Mesh[] {
        return this.allMeshes;
    }
    
    /**
     * 清理资源
     */
    dispose(): void {
        this.allMeshes.forEach(mesh => mesh.dispose());
        this.allMeshes = [];
        this.structuresRoot.dispose();
    }
}

export default ClStructureSystem;
