/**
 * 材质库 - 统一管理 PBR 材质
 * 
 * 模块: client/render/world
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责:
 * 1. 创建和缓存标准材质/PBR材质
 * 2. 统一管理材质参数 (颜色、粗糙度等)
 * 3. 提供预设材质（如：草地、岩石、水面）
 */

import {
    Scene,
    StandardMaterial,
    PBRMaterial,
    Color3,
    Texture
} from '@babylonjs/core';
import { ClAssetManager } from './cl_asset_manager';
import { CL_WORLD_CONFIG } from './cl_world_config';

export class ClMaterialLibrary {
    private scene: Scene;
    private materials: Map<string, PBRMaterial | StandardMaterial> = new Map();

    constructor(scene: Scene, _assetManager: ClAssetManager) {
        this.scene = scene;
    }

    /**
     * 初始化基础材质
     */
    init(): void {
        // 预创建常用材质
        this.createTerrainMaterial('mat_grass', CL_WORLD_CONFIG.GRASS_COLOR);
        this.createTerrainMaterial('mat_mountain', CL_WORLD_CONFIG.MOUNTAIN_COLOR);
        this.createWaterMaterial('mat_water');
        
        // 尝试加载 PBR 材质 (如果存在)
        // 注意：实际项目中，这些路径应该来自配置文件
        this.loadPBRTextureSet('mat_ground_pbr', 'assets/textures/ground/grass', {
            albedo: CL_WORLD_CONFIG.GRASS_COLOR
        });
    }

    /**
     * 加载 PBR 纹理集材质
     * 约定命名:
     * - Albedo/BaseColor: {name}_albedo.jpg
     * - Normal: {name}_normal.jpg
     * - Roughness: {name}_roughness.jpg
     * - Ambient Occlusion: {name}_ao.jpg
     * - Metallic: {name}_metallic.jpg (可选)
     */
    loadPBRTextureSet(
        materialName: string, 
        basePath: string, 
        fallback: { albedo?: Color3, roughness?: number, metallic?: number } = {}
    ): PBRMaterial {
        const mat = this.getPBRMaterial(materialName);
        
        // 默认值
        mat.albedoColor = fallback.albedo || new Color3(0.5, 0.5, 0.5);
        mat.roughness = fallback.roughness !== undefined ? fallback.roughness : 0.8;
        mat.metallic = fallback.metallic !== undefined ? fallback.metallic : 0.0;
        
        // 尝试加载纹理
        // 注意：BabylonJS 的 Texture 加载是异步的，但对象会立即返回
        // 如果图片不存在，控制台会报错 404，但不会崩溃
        
        // 1. Albedo (漫反射)
        const albedoTex = new Texture(`${basePath}_albedo.jpg`, this.scene);
        mat.albedoTexture = albedoTex;
        
        // 2. Normal (法线)
        const normalTex = new Texture(`${basePath}_normal.jpg`, this.scene);
        mat.bumpTexture = normalTex;
        
        // 3. Roughness (粗糙度)
        const roughTex = new Texture(`${basePath}_roughness.jpg`, this.scene);
        mat.microSurfaceTexture = roughTex;
        
        // 4. Ambient Occlusion (环境光遮蔽)
        const aoTex = new Texture(`${basePath}_ao.jpg`, this.scene);
        mat.ambientTexture = aoTex;
        
        // 调整 PBR 参数以适应纹理
        mat.useAmbientOcclusionFromMetallicTextureRed = false;
        mat.useRoughnessFromMetallicTextureAlpha = false;
        mat.useRoughnessFromMetallicTextureGreen = true; // 假设 roughness 在绿色通道
        mat.useMetallnessFromMetallicTextureBlue = true; // 假设 metallic 在蓝色通道
        
        // 开启视差遮挡映射 (增加立体感)
        mat.useParallax = true;
        mat.useParallaxOcclusion = true;
        mat.parallaxScaleBias = 0.05;
        
        return mat;
    }

    /**
     * 获取或创建 PBR 材质
     */
    getPBRMaterial(name: string): PBRMaterial {
        if (this.materials.has(name)) {
            return this.materials.get(name) as PBRMaterial;
        }

        const mat = new PBRMaterial(name, this.scene);
        this.materials.set(name, mat);
        return mat;
    }

    /**
     * 创建基础地形材质 (PBR)
     */
    createTerrainMaterial(name: string, color: Color3): PBRMaterial {
        const mat = this.getPBRMaterial(name);
        mat.albedoColor = color;
        mat.roughness = 0.9; // 粗糙
        mat.metallic = 0.0;  // 非金属
        return mat;
    }
    
    /**
     * 创建水面材质
     */
    createWaterMaterial(name: string): PBRMaterial {
        const mat = this.getPBRMaterial(name);
        mat.albedoColor = CL_WORLD_CONFIG.WATER_COLOR;
        mat.roughness = 0.1; // 光滑
        mat.metallic = 0.1;
        mat.alpha = 0.85;    // 半透明
        
        // 如果有法线贴图，可以在这里添加
        // mat.bumpTexture = this.assetManager.loadTexture("water_normal.png");
        
        return mat;
    }

    /**
     * 获取材质
     */
    getMaterial(name: string): PBRMaterial | StandardMaterial | null {
        return this.materials.get(name) || null;
    }
    
    dispose(): void {
        this.materials.forEach(mat => mat.dispose());
        this.materials.clear();
    }
}
