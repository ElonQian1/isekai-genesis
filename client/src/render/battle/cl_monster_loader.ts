/**
 * 怪兽模型加载器
 * 
 * 负责加载 3D 怪兽模型，支持：
 * 1. 异步加载 glTF/glb 模型
 * 2. 自动降级到占位几何体
 * 3. 模型缓存管理
 * 4. 加载进度回调
 */

import { 
    Scene, 
    Vector3, 
    TransformNode,
    Mesh,
    MeshBuilder,
    StandardMaterial,
    Color3,
    AbstractMesh,
    SceneLoader
} from '@babylonjs/core';

// 使用动态导入以支持 tree-shaking
// import '@babylonjs/loaders/glTF';

// 模型配置
export interface MonsterModelConfig {
    modelPath?: string;          // 模型文件路径 (可选)
    fallbackColor?: Color3;      // 降级占位体颜色
    scale?: number;              // 模型缩放
    rotationY?: number;          // Y轴旋转 (弧度)
}

// 加载结果
export interface ModelLoadResult {
    success: boolean;
    mesh: AbstractMesh | null;
    error?: string;
}

// 模型缓存条目
interface CacheEntry {
    mesh: AbstractMesh;
    lastUsed: number;
}

// 属性对应颜色
const ATTRIBUTE_COLORS: Record<string, Color3> = {
    fire: new Color3(1, 0.3, 0.1),
    water: new Color3(0.2, 0.5, 1),
    earth: new Color3(0.6, 0.4, 0.2),
    wind: new Color3(0.3, 0.9, 0.4),
    light: new Color3(1, 1, 0.6),
    dark: new Color3(0.3, 0.1, 0.4),
    divine: new Color3(1, 0.85, 0.3),
    none: new Color3(0.5, 0.5, 0.5)
};

/**
 * 怪兽模型加载器
 */
export class ClMonsterModelLoader {
    private scene: Scene;
    private modelCache: Map<string, CacheEntry> = new Map();
    private loadingPromises: Map<string, Promise<ModelLoadResult>> = new Map();
    private maxCacheSize: number = 20;
    
    // 加载器是否已初始化
    private loaderInitialized: boolean = false;

    constructor(scene: Scene) {
        this.scene = scene;
        this.initLoader();
    }

    /**
     * 初始化 glTF 加载器
     */
    private async initLoader(): Promise<void> {
        try {
            // 动态导入 glTF 加载器
            await import('@babylonjs/loaders/glTF');
            this.loaderInitialized = true;
            console.log('✅ glTF 加载器已初始化');
        } catch (err) {
            console.warn('⚠️ glTF 加载器初始化失败，将使用占位几何体:', err);
            this.loaderInitialized = false;
        }
    }

    /**
     * 加载怪兽模型
     * @param monsterId 怪兽唯一标识
     * @param config 模型配置
     * @param parent 父节点
     * @param position 位置
     * @returns 加载结果
     */
    public async loadModel(
        monsterId: string,
        config: MonsterModelConfig,
        parent: TransformNode,
        position: Vector3
    ): Promise<ModelLoadResult> {
        // 检查缓存
        if (this.modelCache.has(monsterId)) {
            const cached = this.modelCache.get(monsterId)!;
            cached.lastUsed = Date.now();
            
            // 克隆缓存的模型
            const cloned = this.cloneMesh(cached.mesh, monsterId, parent, position);
            return { success: true, mesh: cloned };
        }
        
        // 检查是否正在加载
        if (this.loadingPromises.has(monsterId)) {
            return this.loadingPromises.get(monsterId)!;
        }
        
        // 开始加载
        const loadPromise = this.doLoadModel(monsterId, config, parent, position);
        this.loadingPromises.set(monsterId, loadPromise);
        
        const result = await loadPromise;
        this.loadingPromises.delete(monsterId);
        
        return result;
    }

    /**
     * 执行模型加载
     */
    private async doLoadModel(
        monsterId: string,
        config: MonsterModelConfig,
        parent: TransformNode,
        position: Vector3
    ): Promise<ModelLoadResult> {
        // 如果有模型路径且加载器可用，尝试加载
        if (config.modelPath && this.loaderInitialized) {
            try {
                const result = await this.loadGltfModel(monsterId, config, parent, position);
                
                if (result.success && result.mesh) {
                    // 添加到缓存
                    this.addToCache(monsterId, result.mesh);
                }
                
                return result;
            } catch (err) {
                console.warn(`⚠️ 模型加载失败 [${monsterId}]:`, err);
                // 降级到占位几何体
            }
        }
        
        // 创建占位几何体
        const fallbackMesh = this.createFallbackMesh(monsterId, config, parent, position);
        return { success: true, mesh: fallbackMesh };
    }

    /**
     * 加载 glTF 模型
     */
    private async loadGltfModel(
        monsterId: string,
        config: MonsterModelConfig,
        parent: TransformNode,
        position: Vector3
    ): Promise<ModelLoadResult> {
        const modelPath = config.modelPath!;
        
        // 解析路径
        const lastSlash = modelPath.lastIndexOf('/');
        const rootUrl = lastSlash >= 0 ? modelPath.substring(0, lastSlash + 1) : '';
        const fileName = lastSlash >= 0 ? modelPath.substring(lastSlash + 1) : modelPath;
        
        console.log(`📦 加载模型: ${fileName}`);
        
        const result = await SceneLoader.ImportMeshAsync('', rootUrl, fileName, this.scene);
        
        if (result.meshes.length === 0) {
            throw new Error('模型不包含网格');
        }
        
        // 创建根节点
        const root = new TransformNode(`monster_model_${monsterId}`, this.scene);
        root.parent = parent;
        root.position = position;
        
        // 应用变换
        const scale = config.scale || 1;
        root.scaling = new Vector3(scale, scale, scale);
        
        if (config.rotationY) {
            root.rotation.y = config.rotationY;
        }
        
        // 将所有网格附加到根节点
        result.meshes.forEach(mesh => {
            if (mesh !== result.meshes[0]) {
                mesh.parent = root;
            }
        });
        
        // 返回第一个网格作为主网格
        const mainMesh = result.meshes[0];
        mainMesh.parent = root;
        
        console.log(`✅ 模型加载成功: ${fileName}`);
        
        return { success: true, mesh: mainMesh };
    }

    /**
     * 创建降级占位几何体
     */
    private createFallbackMesh(
        monsterId: string,
        config: MonsterModelConfig,
        parent: TransformNode,
        position: Vector3
    ): Mesh {
        // 创建一个简单的胶囊体作为占位
        const capsule = MeshBuilder.CreateCapsule(`fallback_${monsterId}`, {
            radius: 0.4,
            height: 1.2,
            tessellation: 12,
            subdivisions: 1
        }, this.scene);
        
        capsule.parent = parent;
        capsule.position = position.add(new Vector3(0, 0.6, 0));  // 抬高使底部在地面
        
        // 应用颜色
        const material = new StandardMaterial(`mat_fallback_${monsterId}`, this.scene);
        material.diffuseColor = config.fallbackColor || ATTRIBUTE_COLORS.none;
        material.emissiveColor = material.diffuseColor.scale(0.3);
        material.specularColor = new Color3(0.2, 0.2, 0.2);
        capsule.material = material;
        
        // 应用缩放
        if (config.scale) {
            capsule.scaling.scaleInPlace(config.scale);
        }
        
        console.log(`🔷 创建占位几何体: ${monsterId}`);
        
        return capsule;
    }

    /**
     * 克隆已缓存的网格
     */
    private cloneMesh(
        original: AbstractMesh,
        monsterId: string,
        parent: TransformNode,
        position: Vector3
    ): AbstractMesh {
        const cloned = original.clone(`clone_${monsterId}_${Date.now()}`, parent);
        if (cloned) {
            cloned.position = position;
            return cloned;
        }
        
        // 克隆失败，创建占位体
        return this.createFallbackMesh(monsterId, {}, parent, position);
    }

    /**
     * 添加到缓存
     */
    private addToCache(monsterId: string, mesh: AbstractMesh): void {
        // 如果缓存已满，移除最老的条目
        if (this.modelCache.size >= this.maxCacheSize) {
            let oldestKey = '';
            let oldestTime = Date.now();
            
            this.modelCache.forEach((entry, key) => {
                if (entry.lastUsed < oldestTime) {
                    oldestTime = entry.lastUsed;
                    oldestKey = key;
                }
            });
            
            if (oldestKey) {
                const oldEntry = this.modelCache.get(oldestKey);
                oldEntry?.mesh.dispose();
                this.modelCache.delete(oldestKey);
                console.log(`🗑️ 缓存淘汰: ${oldestKey}`);
            }
        }
        
        this.modelCache.set(monsterId, {
            mesh,
            lastUsed: Date.now()
        });
    }

    /**
     * 预加载模型
     */
    public async preloadModels(configs: { id: string; config: MonsterModelConfig }[]): Promise<void> {
        console.log(`📦 预加载 ${configs.length} 个模型...`);
        
        const dummyParent = new TransformNode('preload_parent', this.scene);
        const dummyPosition = new Vector3(0, -1000, 0);  // 在视野外
        
        const promises = configs.map(({ id, config }) => 
            this.loadModel(id, config, dummyParent, dummyPosition)
        );
        
        await Promise.all(promises);
        
        dummyParent.dispose();
        console.log(`✅ 预加载完成`);
    }

    /**
     * 根据怪兽属性获取颜色
     */
    public getAttributeColor(attribute: string): Color3 {
        return ATTRIBUTE_COLORS[attribute.toLowerCase()] || ATTRIBUTE_COLORS.none;
    }

    /**
     * 清理缓存
     */
    public clearCache(): void {
        this.modelCache.forEach(entry => entry.mesh.dispose());
        this.modelCache.clear();
        console.log('🗑️ 模型缓存已清空');
    }

    /**
     * 获取缓存状态
     */
    public getCacheStats(): { size: number; maxSize: number; ids: string[] } {
        return {
            size: this.modelCache.size,
            maxSize: this.maxCacheSize,
            ids: Array.from(this.modelCache.keys())
        };
    }

    /**
     * 释放资源
     */
    public dispose(): void {
        this.clearCache();
        this.loadingPromises.clear();
    }
}
