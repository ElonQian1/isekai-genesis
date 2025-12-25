/**
 * 竹林系统 (实例化 + LOD)
 * 
 * 模块: client/render/world/vegetation
 * 前缀: Cl
 * 文档: 文档/08-性能优化.md
 */

import {
    Scene,
    Mesh,
    Matrix,
    MeshBuilder,
    TransformNode,
    Color3,
} from '@babylonjs/core';
import { CL_WORLD_CONFIG, CL_PERFORMANCE_CONFIG } from '../cl_world_config';
import { ClAssetManager } from '../cl_asset_manager';
import { ClMaterialLibrary } from '../cl_material_library';
import { ClTerrainManager } from '../terrain/cl_terrain_manager';

export class ClBambooSystem {
    private scene: Scene;
    private materialLibrary: ClMaterialLibrary;
    private terrainManager: ClTerrainManager;
    
    private bambooMesh: Mesh | null = null;

    constructor(
        scene: Scene, 
        _parent: TransformNode,
        _assetManager: ClAssetManager,
        materialLibrary: ClMaterialLibrary,
        terrainManager: ClTerrainManager
    ) {
        this.scene = scene;
        this.materialLibrary = materialLibrary;
        this.terrainManager = terrainManager;
    }

    async init(): Promise<void> {
        this.initMaterials();
        this.createBambooAssets();
        this.generateBambooInstances();
        
        console.log(`✅ 竹林系统: ${CL_PERFORMANCE_CONFIG.BAMBOO_COUNT}根`);
    }
    
    private initMaterials(): void {
        const bambooMat = this.materialLibrary.getPBRMaterial('mat_bamboo');
        bambooMat.albedoColor = new Color3(0.2, 0.3, 0.2);
        bambooMat.metallic = 0;
        bambooMat.roughness = 0.8;
    }

    private createBambooAssets(): void {
        // 高精度
        const bamboo = MeshBuilder.CreateCylinder(
            'asset_bamboo',
            { diameterTop: 0.15, diameterBottom: 0.2, height: 6, tessellation: 8 },
            this.scene
        );
        bamboo.material = this.materialLibrary.getMaterial('mat_bamboo');
        bamboo.isVisible = false; // 隐藏原始模型
        
        this.bambooMesh = bamboo;
    }

    private generateBambooInstances(): void {
        if (!this.bambooMesh) return;
        
        const { BAMBOO_COUNT } = CL_PERFORMANCE_CONFIG;
        const bambooAreaX = 35;
        const bambooAreaZ = -20;
        const matrices: number[] = [];
        
        for (let i = 0; i < BAMBOO_COUNT; i++) {
            const x = bambooAreaX + (Math.random() - 0.5) * 40;
            const z = bambooAreaZ + (Math.random() - 0.5) * 40;
            
            // 获取地形高度
            const y = this.terrainManager.getHeightAt(x, z);
            
            // 避免在水中
            if (y < CL_WORLD_CONFIG.WATER_LEVEL + 0.5) continue;
            
            const height = 6 + Math.random() * 2;
            const rotation = (Math.random() - 0.5) * 0.2;
            
            // 构建变换矩阵
            const matrix = Matrix.Identity();
            
            // 缩放
            const scaleMatrix = Matrix.Scaling(1, height / 6, 1);
            
            // 旋转
            const rotationMatrix = Matrix.RotationZ(rotation);
            
            // 平移 (注意 y + height/2 因为圆柱体中心在中间)
            const translationMatrix = Matrix.Translation(x, y + height / 2, z);
            
            scaleMatrix.multiplyToRef(rotationMatrix, matrix);
            matrix.multiplyToRef(translationMatrix, matrix);
            
            matrices.push(...matrix.asArray());
        }
        
        // 使用 Thin Instance 渲染大量竹子
        this.bambooMesh.thinInstanceSetBuffer('matrix', new Float32Array(matrices), 16);
        this.bambooMesh.isVisible = true; // 开启可见性（因为是 Thin Instance 的宿主）
        this.bambooMesh.refreshBoundingInfo();
    }

    getMeshes(): Mesh[] {
        return this.bambooMesh ? [this.bambooMesh] : [];
    }

    dispose(): void {
        this.bambooMesh?.dispose();
    }
}

export default ClBambooSystem;
