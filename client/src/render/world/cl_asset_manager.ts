/**
 * 资源管理器 - 统一管理模型、纹理、材质的加载与缓存
 *
 * 模块: client/render/world
 * 前缀: Cl
 * 文档: 文档/04-client.md
 *
 * 职责:
 * 1. 异步加载资源 (Mesh, Texture)
 * 2. 缓存已加载资源，避免重复加载
 * 3. 提供资源实例 (Instancing) 以优化性能
 */

import {
    Scene,
    Mesh,
    AbstractMesh,
    Texture,
    SceneLoader,
} from '@babylonjs/core';

// 必须导入 loaders 以激活 GLTF/GLB 文件加载支持
import '@babylonjs/loaders/glTF';

// 自然素材预制体配置类型
export interface ClNaturePrefab {
    id: string;
    file: string;
    name: string;
    scale: number;
}

export interface ClNaturePrefabCategory {
    name: string;
    models: ClNaturePrefab[];
}

export interface ClNaturePrefabConfig {
    version: string;
    description: string;
    license: string;
    categories: Record<string, ClNaturePrefabCategory>;
}

export class ClAssetManager {
    private scene: Scene;
    
    // 资源缓存
    private meshCache: Map<string, AbstractMesh> = new Map();
    private textureCache: Map<string, Texture> = new Map();
    
    // 自然素材预制体配置
    private naturePrefabs: ClNaturePrefabConfig | null = null;
    
    // 基础路径 - 使用前导斜杠确保相对于站点根目录
    private readonly MODEL_BASE_URL = "/assets/models/";
    private readonly NATURE_MODEL_URL = "/assets/models/nature/";
    private readonly TEXTURE_BASE_URL = "/assets/textures/";

    constructor(scene: Scene) {
        this.scene = scene;
    }

    /**
     * 初始化资源管理器
     */
    async init(): Promise<void> {
        console.log('📦 初始化资源管理器...');
        // 可以在这里预加载核心资源
        // await this.preloadCoreAssets();
    }

    /**
     * 加载模型文件
     * @param fileName 文件名 (e.g., "tree_01.glb" 或 "nature/Pine_1.gltf")
     * @param id 资源唯一标识 ID
     */
    async loadMesh(fileName: string, id: string): Promise<AbstractMesh | null> {
        // 如果已缓存，直接返回克隆
        if (this.meshCache.has(id)) {
            return this.createInstance(id, id + "_clone_" + Date.now());
        }

        try {
            // 解析目录路径和文件名
            // 例如 "nature/Pine_1.gltf" -> rootUrl="/assets/models/nature/", actualFileName="Pine_1.gltf"
            const lastSlash = fileName.lastIndexOf('/');
            let rootUrl = this.MODEL_BASE_URL;
            let actualFileName = fileName;
            
            if (lastSlash >= 0) {
                rootUrl = this.MODEL_BASE_URL + fileName.substring(0, lastSlash + 1);
                actualFileName = fileName.substring(lastSlash + 1);
            }
            
            // 使用正确的 rootUrl 确保相对路径（如 .bin 文件）能正确解析
            const result = await SceneLoader.ImportMeshAsync("", rootUrl, actualFileName, this.scene);
            
            if (result.meshes.length === 0) return null;

            // 获取根节点
            // Babylon 加载 GLB 通常会创建一个 __root__ 节点
            const root = result.meshes[0];
            root.name = id;
            
            // 递归设置碰撞
            root.getChildMeshes().forEach(m => {
                if (m instanceof Mesh) {
                    m.checkCollisions = true;
                }
            });
            
            // 隐藏原始模型，作为模板
            // 必须保留在场景中但不可见，以便后续克隆或实例化
            root.setEnabled(false);
            
            // 存入缓存
            this.meshCache.set(id, root);
            
            console.log(`✅ 模型加载成功: ${fileName}`);
            return this.createInstance(id, id + "_first");
        } catch (e: unknown) {
            // 尝试获取更详细的错误信息
            const err = e as { message?: string; innerError?: { message?: string }; stack?: string };
            console.error(`❌ 模型加载失败: ${fileName}`, {
                message: err.message,
                innerError: err.innerError?.message,
                stack: err.stack?.split('\n').slice(0, 5).join('\n')
            });
            return null;
        }
    }

    /**
     * 加载用户上传的模型
     */
    async loadUploadedMesh(fileName: string, id: string): Promise<AbstractMesh | null> {
        // 如果已缓存，直接返回克隆
        if (this.meshCache.has(id)) {
            return this.createInstance(id, id + "_clone_" + Date.now());
        }

        try {
            const UPLOAD_BASE_URL = "assets/uploads/";
            const result = await SceneLoader.ImportMeshAsync("", UPLOAD_BASE_URL, fileName, this.scene);
            
            if (result.meshes.length === 0) return null;

            const root = result.meshes[0];
            root.name = id;
            root.setEnabled(false);
            
            // 递归设置碰撞
            root.getChildMeshes().forEach(m => {
                if (m instanceof Mesh) {
                    m.checkCollisions = true;
                }
            });
            
            this.meshCache.set(id, root);
            
            console.log(`✅ 上传模型加载成功: ${fileName}`);
            return this.createInstance(id, id + "_first");
        } catch (e) {
            console.error(`❌ 上传模型加载失败: ${fileName}`, e);
            return null;
        }
    }

    /**
     * 获取模型的实例化对象 (高性能)
     * @param id 资源ID
     * @param name 新实例名称
     */
    createInstance(id: string, name: string): AbstractMesh | null {
        const template = this.meshCache.get(id);
        if (!template) {
            console.warn(`⚠️ 资源未找到: ${id}`);
            return null;
        }

        // 优先使用 createInstance (InstancedMesh) 以获得最佳性能
        // InstancedMesh 共享几何体，只改变变换矩阵，非常适合大量重复物体（如树木、石头）
        if (template instanceof Mesh) {
             const instance = template.createInstance(name);
             instance.setEnabled(true);
             return instance;
        } else {
            // 如果根节点不是 Mesh (可能是 TransformNode)，则回退到 Clone
            // Clone 会复制几何体引用，但每个对象有独立的材质和骨骼
            const clone = template.clone(name, null);
            if (clone) clone.setEnabled(true);
            return clone;
        }
    }

    /**
     * 加载纹理
     */
    loadTexture(fileName: string): Texture {
        if (this.textureCache.has(fileName)) {
            return this.textureCache.get(fileName)!;
        }

        const texture = new Texture(this.TEXTURE_BASE_URL + fileName, this.scene);
        this.textureCache.set(fileName, texture);
        return texture;
    }

    // =========================================================================
    // 自然素材系统 (Quaternius Stylized Nature MegaKit)
    // =========================================================================

    /**
     * 加载自然素材预制体配置
     */
    async loadNaturePrefabConfig(): Promise<ClNaturePrefabConfig | null> {
        if (this.naturePrefabs) {
            return this.naturePrefabs;
        }

        try {
            const response = await fetch('assets/data/nature_prefabs.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            this.naturePrefabs = await response.json();
            console.log('🌲 自然素材配置加载成功:', this.naturePrefabs);
            return this.naturePrefabs;
        } catch (e) {
            console.error('❌ 自然素材配置加载失败:', e);
            return null;
        }
    }

    /**
     * 获取自然素材分类列表
     */
    getNatureCategories(): string[] {
        if (!this.naturePrefabs) return [];
        return Object.keys(this.naturePrefabs.categories);
    }

    /**
     * 获取指定分类的模型列表
     */
    getNatureModels(category: string): ClNaturePrefab[] {
        if (!this.naturePrefabs) return [];
        return this.naturePrefabs.categories[category]?.models || [];
    }

    /**
     * 获取所有自然素材模型
     */
    getAllNatureModels(): ClNaturePrefab[] {
        if (!this.naturePrefabs) return [];
        const all: ClNaturePrefab[] = [];
        for (const category of Object.values(this.naturePrefabs.categories)) {
            all.push(...category.models);
        }
        return all;
    }

    /**
     * 加载自然素材模型
     * @param prefabId 预制体 ID (如 "common_tree_1")
     */
    async loadNatureMesh(prefabId: string): Promise<AbstractMesh | null> {
        // 确保配置已加载
        if (!this.naturePrefabs) {
            await this.loadNaturePrefabConfig();
        }

        // 如果已缓存，直接返回克隆
        const cacheKey = `nature_${prefabId}`;
        if (this.meshCache.has(cacheKey)) {
            return this.createInstance(cacheKey, cacheKey + "_clone_" + Date.now());
        }

        // 查找预制体配置
        const prefab = this.findNaturePrefab(prefabId);
        if (!prefab) {
            console.error(`❌ 未找到自然素材预制体: ${prefabId}`);
            return null;
        }

        try {
            const result = await SceneLoader.ImportMeshAsync(
                "", 
                this.NATURE_MODEL_URL, 
                prefab.file, 
                this.scene
            );
            
            if (result.meshes.length === 0) return null;

            const root = result.meshes[0];
            root.name = cacheKey;
            
            // 应用缩放
            if (prefab.scale !== 1.0) {
                root.scaling.scaleInPlace(prefab.scale);
            }
            
            // 递归设置碰撞
            root.getChildMeshes().forEach(m => {
                if (m instanceof Mesh) {
                    m.checkCollisions = true;
                }
            });
            
            // 隐藏原始模型，作为模板
            root.setEnabled(false);
            
            // 存入缓存
            this.meshCache.set(cacheKey, root);
            
            console.log(`🌲 自然素材加载成功: ${prefab.name} (${prefab.file})`);
            return this.createInstance(cacheKey, cacheKey + "_first");
        } catch (e) {
            console.error(`❌ 自然素材加载失败: ${prefab.file}`, e);
            return null;
        }
    }

    /**
     * 查找自然素材预制体配置
     */
    private findNaturePrefab(prefabId: string): ClNaturePrefab | null {
        if (!this.naturePrefabs) return null;
        
        for (const category of Object.values(this.naturePrefabs.categories)) {
            const found = category.models.find(m => m.id === prefabId);
            if (found) return found;
        }
        return null;
    }

    /**
     * 批量预加载自然素材
     * @param prefabIds 要预加载的预制体 ID 列表
     */
    async preloadNatureAssets(prefabIds: string[]): Promise<void> {
        console.log(`🌲 预加载 ${prefabIds.length} 个自然素材...`);
        const promises = prefabIds.map(id => this.loadNatureMesh(id));
        await Promise.all(promises);
        console.log('✅ 自然素材预加载完成');
    }
    
    /**
     * 释放资源
     */
    dispose(): void {
        this.meshCache.forEach(mesh => mesh.dispose());
        this.textureCache.forEach(tex => tex.dispose());
        this.meshCache.clear();
        this.textureCache.clear();
        this.naturePrefabs = null;
    }
}
