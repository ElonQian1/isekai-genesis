/**
 * 玩家实体 - 大世界中的玩家角色
 * 
 * 模块: client/render/world/entities
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责：
 * - 玩家角色显示
 * - 移动控制
 * - 位置追踪
 * - 动画状态
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

// =============================================================================
// 玩家实体
// =============================================================================

export class ClPlayerEntity {
    private scene: Scene;
    
    private playerRoot: TransformNode;
    private bodyMesh: Mesh | null = null;
    private glowLayer: GlowLayer | null = null;
    
    // 移动状态
    private isMoving: boolean = false;
    private moveDirection: Vector3 = Vector3.Zero();
    private moveSpeed: number = 0.15;
    
    // 边界限制
    private bounds = {
        minX: -50,
        maxX: 50,
        minZ: -50,
        maxZ: 50,
    };
    
    constructor(scene: Scene, sceneRoot: TransformNode) {
        this.scene = scene;
        this.playerRoot = new TransformNode('playerRoot', scene);
        this.playerRoot.parent = sceneRoot;
    }
    
    /**
     * 初始化玩家实体
     */
    async init(): Promise<void> {
        this.createPlayerMesh();
        this.createGlowEffect();
        this.setupMovementLoop();
        
        console.log('✅ 玩家实体初始化完成');
    }
    
    /**
     * 创建玩家模型
     */
    private createPlayerMesh(): void {
        // 身体（胶囊形状）
        this.bodyMesh = MeshBuilder.CreateCapsule('playerBody', {
            height: 1.8,
            radius: 0.35,
        }, this.scene);
        this.bodyMesh.position.y = 0.9;
        this.bodyMesh.parent = this.playerRoot;
        
        // 材质 - 蓝色英雄风格
        const bodyMat = new PBRMaterial('playerBodyMat', this.scene);
        bodyMat.albedoColor = new Color3(0.2, 0.4, 0.8);
        bodyMat.metallic = 0.4;
        bodyMat.roughness = 0.5;
        bodyMat.emissiveColor = new Color3(0.05, 0.1, 0.2);
        this.bodyMesh.material = bodyMat;
        
        // 头部指示器（光环）
        const halo = MeshBuilder.CreateTorus('playerHalo', {
            diameter: 0.8,
            thickness: 0.05,
        }, this.scene);
        halo.position.y = 2.2;
        halo.rotation.x = Math.PI / 2;
        halo.parent = this.playerRoot;
        
        const haloMat = new PBRMaterial('playerHaloMat', this.scene);
        haloMat.emissiveColor = new Color3(0.3, 0.6, 1.0);
        haloMat.alpha = 0.7;
        halo.material = haloMat;
        
        // 光环旋转动画
        const rotateAnim = new Animation(
            'haloRotate',
            'rotation.z',
            30,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        rotateAnim.setKeys([
            { frame: 0, value: 0 },
            { frame: 120, value: Math.PI * 2 },
        ]);
        halo.animations.push(rotateAnim);
        this.scene.beginAnimation(halo, 0, 120, true);
    }
    
    /**
     * 创建发光效果
     */
    private createGlowEffect(): void {
        this.glowLayer = new GlowLayer('playerGlow', this.scene);
        this.glowLayer.intensity = 0.3;
        
        if (this.bodyMesh) {
            this.glowLayer.addIncludedOnlyMesh(this.bodyMesh);
        }
    }
    
    /**
     * 设置移动循环
     */
    private setupMovementLoop(): void {
        this.scene.registerBeforeRender(() => {
            this.updateMovement();
        });
    }
    
    /**
     * 更新移动
     */
    private updateMovement(): void {
        if (!this.isMoving) return;
        
        // 应用移动
        const newPos = this.playerRoot.position.add(this.moveDirection.scale(this.moveSpeed));
        
        // 边界限制
        newPos.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, newPos.x));
        newPos.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, newPos.z));
        
        this.playerRoot.position = newPos;
        
        // 面向移动方向
        if (this.moveDirection.length() > 0.01) {
            const angle = Math.atan2(this.moveDirection.x, this.moveDirection.z);
            this.playerRoot.rotation.y = angle;
        }
    }
    
    /**
     * 设置移动方向
     */
    setMoveDirection(direction: Vector3): void {
        this.moveDirection = direction.normalize();
        this.isMoving = direction.length() > 0.01;
    }
    
    /**
     * 停止移动
     */
    stopMoving(): void {
        this.isMoving = false;
        this.moveDirection = Vector3.Zero();
    }
    
    /**
     * 获取位置
     */
    getPosition(): Vector3 {
        return this.playerRoot.position.clone();
    }
    
    /**
     * 设置位置
     */
    setPosition(position: Vector3): void {
        this.playerRoot.position = position.clone();
    }
    
    /**
     * 设置边界
     */
    setBounds(minX: number, maxX: number, minZ: number, maxZ: number): void {
        this.bounds = { minX, maxX, minZ, maxZ };
    }
    
    /**
     * 获取玩家网格
     */
    getMesh(): Mesh | null {
        return this.bodyMesh;
    }
    
    /**
     * 清理资源
     */
    dispose(): void {
        this.bodyMesh?.dispose();
        this.glowLayer?.dispose();
        this.playerRoot.dispose();
    }
}

export default ClPlayerEntity;
