/**
 * 地形管理系统
 * 
 * 模块: client/render/world/terrain
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责：
 * - 统一管理地形相关的所有元素
 * - 包括地面、水面、山脉等
 * - 提供统一的初始化和资源管理接口
 */

import {
    Scene,
    Mesh,
    Vector3,
    MeshBuilder,
    PBRMaterial,
    NoiseProceduralTexture,
    TransformNode,
    Ray,
} from '@babylonjs/core';
import { CL_WORLD_CONFIG } from '../cl_world_config';
import { ClMaterialLibrary } from '../cl_material_library';

export class ClTerrainManager {
    private scene: Scene;
    private parent: TransformNode;
    private materialLibrary: ClMaterialLibrary;
    
    private ground: Mesh | null = null;
    private waterPlane: Mesh | null = null;
    private mountains: Mesh[] = [];

    constructor(scene: Scene, parent: TransformNode, materialLibrary: ClMaterialLibrary) {
        this.scene = scene;
        this.parent = parent;
        this.materialLibrary = materialLibrary;
    }

    /**
     * 初始化地形系统
     */
    async init(): Promise<void> {
        await this.createGround();
        await this.createWater();
        await this.createMountains();
        
        console.log('✅ 地形系统初始化完成');
    }

    /**
     * 创建地面
     */
    private async createGround(): Promise<void> {
        const { WORLD_SIZE } = CL_WORLD_CONFIG;
        
        this.ground = MeshBuilder.CreateGround(
            'worldGround',
            { width: WORLD_SIZE, height: WORLD_SIZE, subdivisions: 100 },
            this.scene
        );
        this.ground.parent = this.parent;
        this.ground.receiveShadows = true;
        
        // 启用碰撞
        this.ground.checkCollisions = true;
        
        // 尝试获取 PBR 材质
        let groundMat = this.materialLibrary.getMaterial('mat_ground_pbr') as PBRMaterial;
        
        // 如果没有 PBR 材质，回退到基础材质
        if (!groundMat) {
            groundMat = this.materialLibrary.getMaterial('mat_grass') as PBRMaterial;
        }
        
        // 过程化噪声 (仅当没有纹理时使用)
        // 注意：loadPBRTextureSet 会创建 Texture 对象，即使文件不存在
        // 所以这里我们主要依赖 PBR 材质的加载结果
        // 如果是 mat_grass (基础材质)，则添加噪声
        if (groundMat.name === 'mat_grass' && !groundMat.albedoTexture) {
            const noiseTexture = new NoiseProceduralTexture('groundNoise', 512, this.scene);
            noiseTexture.octaves = 4;
            noiseTexture.persistence = 0.8;
            noiseTexture.animationSpeedFactor = 0;
            noiseTexture.brightness = 0.5;
            groundMat.albedoTexture = noiseTexture;
            
            // 凹凸贴图
            const bumpNoise = new NoiseProceduralTexture('groundBump', 512, this.scene);
            bumpNoise.octaves = 6;
            bumpNoise.persistence = 0.8;
            bumpNoise.animationSpeedFactor = 0;
            groundMat.bumpTexture = bumpNoise;
            groundMat.bumpTexture.level = 0.5;
            
            groundMat.microSurface = 0.8;
            groundMat.specularIntensity = 0.2;
        }
        
        this.ground.material = groundMat;
        
        // 添加地形起伏
        this.addTerrainHeight();
    }

    /**
     * 添加地形高度变化
     */
    private addTerrainHeight(): void {
        if (!this.ground) return;
        
        const positions = this.ground.getVerticesData('position');
        if (!positions) return;
        
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 2];
            
            const height = 
                Math.sin(x * 0.08) * Math.cos(z * 0.08) * 2 +
                Math.sin(x * 0.03 + 2) * Math.sin(z * 0.03 + 1) * 3 +
                Math.sin(x * 0.015) * 1.5;
            
            positions[i + 1] = Math.max(height, 0);
        }
        
        this.ground.setVerticesData('position', positions);
        this.ground.createNormals(false);
    }

    /**
     * 创建水面
     */
    private async createWater(): Promise<void> {
        const { WATER_LEVEL } = CL_WORLD_CONFIG;
        
        this.waterPlane = MeshBuilder.CreateGround(
            'waterPlane',
            { width: 30, height: 25 },
            this.scene
        );
        this.waterPlane.position.y = WATER_LEVEL;
        this.waterPlane.position.x = -25;
        this.waterPlane.position.z = 15;
        this.waterPlane.parent = this.parent;
        
        // 水面材质
        const waterMat = this.materialLibrary.getMaterial('mat_water') as PBRMaterial;
        
        // 动态波纹 (如果材质库未设置)
        if (!waterMat.bumpTexture) {
            const waterBump = new NoiseProceduralTexture('waterBump', 256, this.scene);
            waterBump.octaves = 2;
            waterBump.persistence = 0.8;
            waterBump.animationSpeedFactor = 1.0;
            waterMat.bumpTexture = waterBump;
            waterMat.bumpTexture.level = 0.3;
        }
        
        this.waterPlane.material = waterMat;
    }

    /**
     * 创建山脉
     */
    private async createMountains(): Promise<void> {
        // 山脉材质
        const mountainMat = this.materialLibrary.getMaterial('mat_mountain') as PBRMaterial;
        
        // 岩石纹理
        if (!mountainMat.albedoTexture) {
            const rockNoise = new NoiseProceduralTexture('rockNoise', 256, this.scene);
            rockNoise.octaves = 5;
            rockNoise.persistence = 0.9;
            rockNoise.animationSpeedFactor = 0;
            mountainMat.bumpTexture = rockNoise;
            mountainMat.bumpTexture.level = 1.5;
            mountainMat.albedoTexture = rockNoise;
            mountainMat.microSurface = 0.6;
        }
        
        // 创建山脉
        const mountainPositions = [
            { pos: new Vector3(-80, 0, -55), scale: new Vector3(25, 20, 15) },
            { pos: new Vector3(50, 0, -60), scale: new Vector3(30, 22, 18) },
            { pos: new Vector3(0, 0, 60), scale: new Vector3(35, 18, 20) },
        ];
        
        for (const data of mountainPositions) {
            const mountain = MeshBuilder.CreateSphere(
                `mountain_${this.mountains.length}`,
                { diameter: 2, segments: 32 },
                this.scene
            );
            mountain.position = data.pos;
            mountain.scaling = data.scale;
            mountain.material = mountainMat;
            mountain.parent = this.parent;
            this.mountains.push(mountain);
        }
    }

    /**
     * 获取所有地形网格（用于剔除和Octree）
     */
    getMeshes(): Mesh[] {
        const meshes: Mesh[] = [];
        if (this.ground) meshes.push(this.ground);
        if (this.waterPlane) meshes.push(this.waterPlane);
        meshes.push(...this.mountains);
        return meshes;
    }

    /**
     * 获取地面高度（用于放置物体）
     */
    getHeightAt(x: number, z: number): number {
        if (!this.ground) return 0;
        
        const pickInfo = this.scene.pickWithRay(
            new Ray(
                new Vector3(x, 100, z),
                new Vector3(0, -1, 0),
                200
            ),
            (mesh) => mesh === this.ground
        );
        
        return pickInfo?.pickedPoint?.y || 0;
    }

    /**
     * 清理资源
     */
    dispose(): void {
        this.ground?.dispose();
        this.waterPlane?.dispose();
        this.mountains.forEach(m => m.dispose());
        this.mountains = [];
    }
}

export default ClTerrainManager;
