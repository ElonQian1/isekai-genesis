/**
 * 树木系统 (实例化 + LOD)
 * 
 * 模块: client/render/world/vegetation
 * 前缀: Cl
 * 文档: 文档/08-性能优化.md
 * 
 * 职责：
 * - 批量生成树木（实例化渲染）
 * - 管理树木的LOD级别
 * - 提供树木材质和配置
 */

import {
    Scene,
    Mesh,
    MeshBuilder,
    Color3,
    TransformNode,
    ShadowGenerator,
    Vector3,
} from '@babylonjs/core';
import { ClAssetManager } from '../cl_asset_manager';
import { ClMaterialLibrary } from '../cl_material_library';
import { ClTerrainManager } from '../terrain/cl_terrain_manager';

export class ClTreeSystem {
    private scene: Scene;
    private parent: TransformNode;
    private root: TransformNode;
    private shadowGenerator: ShadowGenerator | null;
    private assetManager: ClAssetManager;
    private materialLibrary: ClMaterialLibrary;
    
    // 树木实例
    private trunkMesh: Mesh | null = null;
    private leavesMesh: Mesh | null = null;

    constructor(
        scene: Scene, 
        parent: TransformNode, 
        shadowGenerator: ShadowGenerator | null,
        assetManager: ClAssetManager,
        materialLibrary: ClMaterialLibrary,
        _terrainManager: ClTerrainManager
    ) {
        this.scene = scene;
        this.parent = parent;
        this.root = new TransformNode("TreeSystemRoot", scene);
        this.root.parent = parent;
        
        this.shadowGenerator = shadowGenerator;
        this.assetManager = assetManager;
        this.materialLibrary = materialLibrary;
    }

    /**
     * 清空所有树木
     */
    public clear(): void {
        this.root.dispose();
        this.root = new TransformNode("TreeSystemRoot", this.scene);
        this.root.parent = this.parent;
    }

    /**
     * 初始化树木系统
     */
    async init(): Promise<void> {
        // 1. 准备材质
        this.initMaterials();
        
        // 2. 尝试加载外部模型
        // 使用 nature/ 目录下已有的松树模型
        const pineTree = await this.assetManager.loadMesh("nature/Pine_1.gltf", "tree_pine");
        
        if (!pineTree) {
            // 如果加载失败，回退到程序化生成
            console.log("⚠️ 未找到外部树木模型，使用程序化生成作为回退");
            this.createProceduralTreeAssets();
        } else {
            console.log("🌲 已加载外部树木模型: Pine_1.gltf");
        }
        
        console.log(`✅ 树木系统初始化完成`);
    }

    /**
     * 生成单个树木实例 (供数据驱动加载器使用)
     */
    spawnInstance(prefab: string, position: Vector3, scale: number | number[] = 1): void {
        // 1. 尝试从 AssetManager 获取实例 (优先使用外部模型)
        // 注意：createInstance 会返回一个新的克隆或实例
        const instance = this.assetManager.createInstance(prefab, `tree_${prefab}_${Math.random()}`);
        
        if (instance) {
            instance.position = position.clone();
            instance.parent = this.root;
            
            // 处理缩放
            let scaleVec = new Vector3(1, 1, 1);
            if (typeof scale === 'number') {
                scaleVec.set(scale, scale, scale);
            } else if (Array.isArray(scale) && scale.length === 3) {
                scaleVec.set(scale[0], scale[1], scale[2]);
            }
            instance.scaling = scaleVec;
            
            // 随机旋转
            instance.rotation.y = Math.random() * Math.PI * 2;
            
            // 启用阴影和碰撞
            if (this.shadowGenerator) {
                instance.getChildMeshes().forEach(m => {
                    if (m instanceof Mesh) {
                        this.shadowGenerator?.addShadowCaster(m);
                        m.receiveShadows = true;
                        // 树木通常只需要树干有碰撞，但这里简单起见全部启用
                        // 更好的做法是只对 LOD0 或特定的碰撞体启用
                        m.checkCollisions = true;
                    }
                });
            } else {
                instance.getChildMeshes().forEach(m => {
                    if (m instanceof Mesh) {
                        m.checkCollisions = true;
                    }
                });
            }
            
            if (instance instanceof Mesh) {
                instance.checkCollisions = true;
            }
            
            // 设置元数据，以便编辑器识别和保存
            instance.metadata = {
                type: 'tree',
                prefab: prefab
            };
            
            // 确保它是可见的 (因为模板是隐藏的)
            instance.setEnabled(true);
            return;
        }

        // 2. 回退逻辑 (如果没有找到外部模型，且有程序化资源)
        if (!this.trunkMesh || !this.leavesMesh) return;

        // 1. 树干实例
        const trunkInstance = this.trunkMesh.createInstance(`tree_${prefab}_trunk_${Math.random()}`);
        trunkInstance.position = position.clone();
        trunkInstance.parent = this.root;
        
        // 处理缩放
        let scaleVec = new Vector3(1, 1, 1);
        if (typeof scale === 'number') {
            scaleVec.set(scale, scale, scale);
        } else if (Array.isArray(scale) && scale.length === 3) {
            scaleVec.set(scale[0], scale[1], scale[2]);
        }
        trunkInstance.scaling = scaleVec;
        
        // 随机旋转
        trunkInstance.rotation.y = Math.random() * Math.PI * 2;

        // 2. 树叶实例
        const leavesInstance = this.leavesMesh.createInstance(`tree_${prefab}_leaves_${Math.random()}`);
        leavesInstance.parent = trunkInstance; // 绑定到树干
        // 本地坐标归零，因为父级已经是正确位置
        leavesInstance.position.set(0, 0, 0); 
        leavesInstance.rotation.set(0, 0, 0);
        
        // 阴影
        if (this.shadowGenerator) {
            this.shadowGenerator.addShadowCaster(trunkInstance);
            this.shadowGenerator.addShadowCaster(leavesInstance);
        }
    }

    /**
     * 初始化材质
     */
    private initMaterials(): void {
        // 树干材质
        const trunkMat = this.materialLibrary.getPBRMaterial('mat_tree_trunk');
        trunkMat.albedoColor = new Color3(0.4, 0.3, 0.2);
        trunkMat.roughness = 0.9;
        trunkMat.metallic = 0;
        
        // 树叶材质
        const leavesMat = this.materialLibrary.getPBRMaterial('mat_tree_leaves');
        leavesMat.albedoColor = new Color3(0.1, 0.4, 0.1);
        leavesMat.roughness = 0.8;
        leavesMat.metallic = 0;
        leavesMat.transparencyMode = 2; // Alpha Test
    }

    /**
     * 创建程序化树木资源 (作为占位符)
     */
    private createProceduralTreeAssets(): void {
        // 树干
        const trunk = MeshBuilder.CreateCylinder('asset_tree_trunk', {
            height: 4,
            diameterTop: 0.4,
            diameterBottom: 0.8,
            tessellation: 8
        }, this.scene);
        trunk.material = this.materialLibrary.getMaterial('mat_tree_trunk');
        trunk.isVisible = false; // 隐藏原始模型
        
        // 注册到资源管理器
        // 这是一个 hack，我们需要让 AssetManager 支持注册已有的 Mesh
        // 但为了简单，我们直接在这里持有引用，或者扩展 AssetManager
        // 这里我们暂时直接使用 createInstance
        this.trunkMesh = trunk;

        // 树叶
        const leaves = MeshBuilder.CreateSphere('asset_tree_leaves', {
            diameter: 4,
            segments: 8
        }, this.scene);
        leaves.position.y = 3;
        leaves.scaling.y = 0.8;
        leaves.material = this.materialLibrary.getMaterial('mat_tree_leaves');
        leaves.isVisible = false;
        
        this.leavesMesh = leaves;
    }

    /**
     * 生成树木实例 (已弃用)
     */
    // private generateTreeInstances(): void {
    // }



    /**
     * 获取树木网格（用于剔除系统）
     */
    getMeshes(): Mesh[] {
        const meshes: Mesh[] = [];
        if (this.trunkMesh) meshes.push(this.trunkMesh);
        if (this.leavesMesh) meshes.push(this.leavesMesh);
        return meshes;
    }

    /**
     * 清理资源
     */
    dispose(): void {
        this.trunkMesh?.dispose();
        this.leavesMesh?.dispose();
    }
}

export default ClTreeSystem;
