/**
 * 玩家控制器 - 角色移动、交互
 * 
 * 模块: client/render/world/gameplay
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责：
 * - 创建玩家角色 (目前是胶囊体，未来替换为模型)
 * - 处理移动输入 (WASD)
 * - 地形贴合 (使用 TerrainManager)
 * - 简单的碰撞检测
 */

import {
    Scene,
    Mesh,
    MeshBuilder,
    Vector3,
    TransformNode,
    ActionManager,
    ExecuteCodeAction,
    Scalar,
    Color3,
    Observer
} from '@babylonjs/core';

import { ClTerrainManager } from '../terrain/cl_terrain_manager';
import { ClMaterialLibrary } from '../cl_material_library';

export class ClPlayerController {
    private scene: Scene;
    private parent: TransformNode;
    private terrainManager: ClTerrainManager;
    private materialLibrary: ClMaterialLibrary;
    
    // 玩家网格
    private playerMesh: Mesh | null = null;
    
    // 移动参数
    private moveSpeed: number = 8.0;
    private rotateSpeed: number = 5.0;
    
    // 输入状态
    private inputMap: { [key: string]: boolean } = {};
    
    // 鼠标移动目标
    private targetPosition: Vector3 | null = null;
    private targetMarker: Mesh | null = null;
    
    // 观察者
    private renderObserver: Observer<Scene> | null = null;
    
    // 状态
    private isEnabled: boolean = true;

    constructor(
        scene: Scene, 
        parent: TransformNode,
        terrainManager: ClTerrainManager,
        materialLibrary: ClMaterialLibrary
    ) {
        this.scene = scene;
        this.parent = parent;
        this.terrainManager = terrainManager;
        this.materialLibrary = materialLibrary;
    }

    /**
     * 启用/禁用玩家控制
     */
    public setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
        if (!enabled) {
            // 清除移动状态
            this.targetPosition = null;
            if (this.targetMarker) this.targetMarker.isVisible = false;
            this.inputMap = {};
        }
    }

    /**
     * 初始化玩家
     */
    async init(): Promise<void> {
        this.createPlayerMesh();
        this.createTargetMarker();
        this.setupInputs();
        
        // 注册更新循环
        this.renderObserver = this.scene.onBeforeRenderObservable.add(() => {
            this.update();
        });
        
        console.log('✅ 玩家控制器初始化完成');
    }

    /**
     * 创建目标标记
     */
    private createTargetMarker(): void {
        this.targetMarker = MeshBuilder.CreateDisc("targetMarker", {radius: 0.5}, this.scene);
        this.targetMarker.rotation.x = Math.PI / 2;
        this.targetMarker.position.y = 0.1;
        
        const mat = this.materialLibrary.getPBRMaterial('mat_marker');
        mat.albedoColor = new Color3(0, 1, 0);
        mat.emissiveColor = new Color3(0, 1, 0);
        mat.alpha = 0.5;
        mat.zOffset = -1; // 防止Z-fighting
        this.targetMarker.material = mat;
        
        this.targetMarker.isVisible = false;
    }

    /**
     * 创建玩家网格 (胶囊体)
     */
    private createPlayerMesh(): void {
        // 胶囊体代表角色
        this.playerMesh = MeshBuilder.CreateCapsule('player', {
            height: 2.0,
            radius: 0.4,
            subdivisions: 8
        }, this.scene);
        
        // 启用碰撞
        this.playerMesh.checkCollisions = true;
        this.playerMesh.ellipsoid = new Vector3(0.4, 1.0, 0.4); // 碰撞椭球体
        this.playerMesh.ellipsoidOffset = new Vector3(0, 1.0, 0); // 偏移，使中心在脚底

        // 初始位置
        const startX = 0;
        const startZ = 0;
        const startY = this.terrainManager.getHeightAt(startX, startZ);
        this.playerMesh.position = new Vector3(startX, startY + 1.0, startZ);
        
        // 材质
        const mat = this.materialLibrary.getPBRMaterial('mat_player');
        mat.albedoColor = new Color3(0.2, 0.6, 1.0); // 亮蓝色
        mat.metallic = 0.5;
        mat.roughness = 0.4;
        mat.emissiveColor = new Color3(0.05, 0.15, 0.25); // 微弱自发光
        this.playerMesh.material = mat;
        
        this.playerMesh.parent = this.parent;
        
        // 添加一个指示方向的小盒子
        const nose = MeshBuilder.CreateBox('player_nose', {
            width: 0.2, height: 0.2, depth: 0.5
        }, this.scene);
        nose.position.z = 0.4;
        nose.position.y = 0.5;
        nose.parent = this.playerMesh;
        nose.material = mat;
    }

    /**
     * 设置输入监听
     */
    private setupInputs(): void {
        this.scene.actionManager = new ActionManager(this.scene);
        
        this.scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (evt) => {
            this.inputMap[evt.sourceEvent.key.toLowerCase()] = true;
            // 按下 WASD 时取消鼠标移动目标
            if (['w', 'a', 's', 'd'].includes(evt.sourceEvent.key.toLowerCase())) {
                this.targetPosition = null;
                if (this.targetMarker) this.targetMarker.isVisible = false;
            }
        }));
        
        this.scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, (evt) => {
            this.inputMap[evt.sourceEvent.key.toLowerCase()] = false;
        }));

        // 鼠标点击移动
        this.scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === 1) { // POINTERDOWN
                // 只有左键点击才移动 (button 0)
                if (pointerInfo.event.button !== 0) return;
                
                // 如果点击到了 UI，不移动 (Babylon GUI 通常会拦截，但为了保险)
                // 这里假设 pickInfo.hit 为 true 且 pickedMesh 是地形
                if (pointerInfo.pickInfo && pointerInfo.pickInfo.hit && pointerInfo.pickInfo.pickedMesh) {
                    const mesh = pointerInfo.pickInfo.pickedMesh;
                    const meshName = mesh.name.toLowerCase();
                    
                    console.log("🖱️ Clicked mesh:", meshName); // Debug log

                    // 排除 Gizmo、标记和天空盒
                    if (meshName.startsWith("gizmo") || 
                        meshName.includes("marker") || 
                        meshName.includes("sky")) {
                        return;
                    }
                    
                    // 只要是场景中的物体，都允许点击移动
                    const point = pointerInfo.pickInfo.pickedPoint;
                    if (point) {
                        this.setMoveTarget(point);
                    }
                }
            }
        });
    }

    /**
     * 设置移动目标
     */
    public setMoveTarget(point: Vector3): void {
        this.targetPosition = point.clone();
        
        // 显示标记
        if (this.targetMarker) {
            this.targetMarker.position.copyFrom(point);
            this.targetMarker.position.y = this.terrainManager.getHeightAt(point.x, point.z) + 0.1;
            this.targetMarker.isVisible = true;
        }
    }

    /**
     * 每帧更新
     */
    private update(): void {
        if (!this.playerMesh || !this.isEnabled) return;
        
        const dt = this.scene.getEngine().getDeltaTime() / 1000;
        
        // 1. 处理输入 -> 移动向量
        let moveDir = Vector3.Zero();
        let isMoving = false;

        // 优先处理键盘输入
        const camera = this.scene.activeCamera;
        if (camera) {
            // 获取相机水平方向
            const forward = camera.getForwardRay().direction;
            forward.y = 0;
            forward.normalize();
            
            // 获取相机右侧方向 (Up x Forward = Right)
            const right = Vector3.Cross(Vector3.Up(), forward).normalize();

            if (this.inputMap['w']) moveDir.addInPlace(forward);
            if (this.inputMap['s']) moveDir.subtractInPlace(forward);
            if (this.inputMap['d']) moveDir.addInPlace(right);
            if (this.inputMap['a']) moveDir.subtractInPlace(right);
        } else {
            // 如果没有相机，回退到世界坐标
            if (this.inputMap['w']) moveDir.z += 1;
            if (this.inputMap['s']) moveDir.z -= 1;
            if (this.inputMap['a']) moveDir.x -= 1;
            if (this.inputMap['d']) moveDir.x += 1;
        }
        
        if (moveDir.lengthSquared() > 0.001) {
            isMoving = true;
            // 键盘移动时，清除鼠标目标
            this.targetPosition = null;
            if (this.targetMarker) this.targetMarker.isVisible = false;
        } else if (this.targetPosition) {
            // 处理鼠标点击移动
            const currentPos = this.playerMesh.position;
            // 只计算水平方向的距离
            const diff = this.targetPosition.subtract(currentPos);
            diff.y = 0;
            
            if (diff.lengthSquared() > 0.1) {
                moveDir = diff.normalize();
                isMoving = true;
            } else {
                // 到达目标
                this.targetPosition = null;
                if (this.targetMarker) this.targetMarker.isVisible = false;
            }
        }

        // 2. 移动逻辑
        if (isMoving) {
            moveDir.normalize();
            
            // 旋转角色朝向移动方向
            const targetRotation = Math.atan2(moveDir.x, moveDir.z);
            // 平滑旋转 (处理角度跳变问题)
            let currentRotation = this.playerMesh.rotation.y;
            // 确保旋转角度在 -PI 到 PI 之间，防止 359 -> 1 度的反向旋转
            while (targetRotation - currentRotation > Math.PI) currentRotation += Math.PI * 2;
            while (targetRotation - currentRotation < -Math.PI) currentRotation -= Math.PI * 2;
            
            this.playerMesh.rotation.y = Scalar.Lerp(currentRotation, targetRotation, this.rotateSpeed * dt);
            
            // 计算位移 (使用 moveWithCollisions)
            const moveDist = moveDir.scale(this.moveSpeed * dt);
            
            this.playerMesh.moveWithCollisions(moveDist);
        }
        
        // 3. 地形贴合 (简单的重力/吸附)
        // 即使使用了 moveWithCollisions，我们仍然强制贴合地形以保证平滑
        // 除非我们实现完整的重力系统
        const currentPos = this.playerMesh.position;
        const groundHeight = this.terrainManager.getHeightAt(currentPos.x, currentPos.z);
        
        // 简单的平滑高度跟随
        const targetY = groundHeight + 1.0; // 胶囊体中心高度
        
        // 只有当当前高度低于地形高度时才强制拉起，或者稍微平滑一下
        // 如果我们完全依赖 moveWithCollisions，需要给 moveDist 添加一个向下的分量
        // 这里混合使用：水平碰撞靠 moveWithCollisions，垂直高度靠 Lerp
        this.playerMesh.position.y = Scalar.Lerp(this.playerMesh.position.y, targetY, 10 * dt);
        
        // 4. 边界限制 (防止跑出地图)
        const limit = 55; // 假设地图大小的一半稍小一点
        this.playerMesh.position.x = Scalar.Clamp(this.playerMesh.position.x, -limit, limit);
        this.playerMesh.position.z = Scalar.Clamp(this.playerMesh.position.z, -limit, limit);
    }
    
    /**
     * 获取玩家网格
     */
    getMesh(): Mesh | null {
        return this.playerMesh;
    }

    /**
     * 获取玩家位置
     */
    getPosition(): Vector3 {
        return this.playerMesh ? this.playerMesh.position : Vector3.Zero();
    }

    /**
     * 销毁
     */
    dispose(): void {
        if (this.playerMesh) {
            this.playerMesh.dispose();
            this.playerMesh = null;
        }
        
        if (this.renderObserver) {
            this.scene.onBeforeRenderObservable.remove(this.renderObserver);
            this.renderObserver = null;
        }
    }
}
