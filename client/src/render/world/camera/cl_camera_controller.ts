/**
 * 相机控制系统 - 俯视图相机、平滑移动、缩放
 * 
 * 模块: client/render/world/camera
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责：
 * - WASD 移动控制
 * - 鼠标滚轮缩放
 * - 相机跟随目标
 * - 平滑过渡动画
 */

import {
    Scene,
    ArcRotateCamera,
    Vector3,
    Angle,
    AbstractMesh,
    MeshBuilder,
} from '@babylonjs/core';

import { CAMERA_CONFIG } from '../cl_world_config';

/**
 * 相机控制器
 */
export class ClCameraController {
    private scene: Scene;
    private camera: ArcRotateCamera;
    
    // 移动控制
    private moveSpeed: number = CAMERA_CONFIG.MOVE_SPEED;
    
    // 跟随目标
    private lockedTarget: AbstractMesh | null = null;
    private isLocked: boolean = false;
    
    // 平滑移动
    private targetPosition: Vector3 = Vector3.Zero();
    
    // 边缘滚动
    private edgeScrollEnabled: boolean = true;
    private edgeScrollThreshold: number = 20; // 像素
    private edgeScrollSpeed: number = 1.5; // 边缘滚动速度倍率
    private mouseX: number = 0;
    private mouseY: number = 0;

    // 边界限制
    private moveBounds = {
        minX: -50,
        maxX: 50,
        minZ: -50,
        maxZ: 50,
    };
    
    // 键盘状态
    private keys = {
        w: false,
        a: false,
        s: false,
        d: false,
    };
    
    // 虚拟目标点 (相机实际跟随这个点)
    private dummyTarget: AbstractMesh;

    constructor(scene: Scene) {
        this.scene = scene;
        
        // 创建虚拟目标
        this.dummyTarget = MeshBuilder.CreateBox("cameraDummyTarget", {size: 0.1}, this.scene);
        this.dummyTarget.isVisible = false;
        this.dummyTarget.position = CAMERA_CONFIG.TARGET.clone();
        
        this.camera = this.createCamera();
        this.camera.lockedTarget = this.dummyTarget;
    }
    
    /**
     * 创建俯视图相机
     */
    private createCamera(): ArcRotateCamera {
        const camera = new ArcRotateCamera(
            'worldCamera',
            Angle.FromDegrees(CAMERA_CONFIG.ALPHA).radians(),
            Angle.FromDegrees(CAMERA_CONFIG.BETA).radians(),
            CAMERA_CONFIG.RADIUS,
            CAMERA_CONFIG.TARGET,
            this.scene
        );
        
        // 相机设置
        camera.minZ = 0.1;
        camera.maxZ = 500;
        
        // 缩放限制
        camera.lowerRadiusLimit = CAMERA_CONFIG.MIN_RADIUS;
        camera.upperRadiusLimit = CAMERA_CONFIG.MAX_RADIUS;
        
        // 角度限制（锁定俯视图）
        camera.lowerBetaLimit = Angle.FromDegrees(40).radians();
        camera.upperBetaLimit = Angle.FromDegrees(70).radians();
        
        // 惯性设置
        camera.inertia = 0.8;
        camera.wheelPrecision = 20;
        camera.panningSensibility = 0;
        
        return camera;
    }
    
    /**
     * 初始化控制系统
     */
    init(canvas: HTMLCanvasElement): void {
        this.camera.attachControl(canvas, true);
        this.targetPosition = this.dummyTarget.position.clone();
        
        this.setupKeyboardControls();
        this.setupMouseControls();
        
        // 监听鼠标位置
        canvas.addEventListener('mousemove', (evt) => {
            this.mouseX = evt.clientX;
            this.mouseY = evt.clientY;
        });
        
        // 注册渲染循环
        this.scene.registerBeforeRender(() => {
            this.update();
        });
        
        console.log('✅ 相机控制系统初始化完成');
    }
    
    /**
     * 设置键盘控制
     */
    private setupKeyboardControls(): void {
        const canvas = this.scene.getEngine().getRenderingCanvas();
        if (!canvas) return;
        
        // 键盘按下
        canvas.addEventListener('keydown', (evt) => {
            const key = evt.key.toLowerCase();
            if (key === 'w') this.keys.w = true;
            if (key === 'a') this.keys.a = true;
            if (key === 's') this.keys.s = true;
            if (key === 'd') this.keys.d = true;
        });
        
        // 键盘释放
        canvas.addEventListener('keyup', (evt) => {
            const key = evt.key.toLowerCase();
            if (key === 'w') this.keys.w = false;
            if (key === 'a') this.keys.a = false;
            if (key === 's') this.keys.s = false;
            if (key === 'd') this.keys.d = false;
        });
    }
    
    /**
     * 设置鼠标控制
     */
    private setupMouseControls(): void {
        // 禁用右键平移（通过移除平移输入）
        this.camera.panningSensibility = 0;
    }
    
    /**
     * 锁定目标
     */
    lockTarget(target: AbstractMesh | null): void {
        this.lockedTarget = target;
        this.isLocked = !!target;
        if (target) {
            // 立即跳转还是平滑过渡？这里选择平滑过渡
            // this.targetPosition.copyFrom(target.position);
        }
    }

    /**
     * 更新相机位置（每帧调用）
     */
    private update(): void {
        const dt = this.scene.getEngine().getDeltaTime() / 1000;
        
        // 如果锁定了目标，直接更新目标位置
        if (this.isLocked && this.lockedTarget) {
            // 获取目标位置 (如果是 TransformNode，使用 absolutePosition)
            const targetPos = this.lockedTarget.absolutePosition ? this.lockedTarget.absolutePosition : this.lockedTarget.position;
            this.targetPosition.copyFrom(targetPos);
            
            // 平滑跟随
            const lerpFactor = 0.1; // 跟随延迟感
            this.dummyTarget.position = Vector3.Lerp(this.dummyTarget.position, this.targetPosition, lerpFactor);
            return; // 锁定模式下忽略手动控制
        }

        // 1. 计算输入向量 (WASD)
        const inputVector = Vector3.Zero();
        const cameraForward = this.camera.getForwardRay().direction;
        cameraForward.y = 0;
        cameraForward.normalize();
        
        const cameraRight = Vector3.Cross(cameraForward, Vector3.Up()).normalize();
        
        if (this.keys.w) inputVector.addInPlace(cameraForward);
        if (this.keys.s) inputVector.addInPlace(cameraForward.scale(-1));
        if (this.keys.a) inputVector.addInPlace(cameraRight.scale(-1));
        if (this.keys.d) inputVector.addInPlace(cameraRight);
        
        // 2. 计算边缘滚动向量
        if (this.edgeScrollEnabled) {
            const width = this.scene.getEngine().getRenderWidth();
            const height = this.scene.getEngine().getRenderHeight();
            
            // 只有在窗口激活时才启用边缘滚动
            if (document.hasFocus()) {
                if (this.mouseX < this.edgeScrollThreshold) inputVector.addInPlace(cameraRight.scale(-this.edgeScrollSpeed));
                if (this.mouseX > width - this.edgeScrollThreshold) inputVector.addInPlace(cameraRight.scale(this.edgeScrollSpeed));
                if (this.mouseY < this.edgeScrollThreshold) inputVector.addInPlace(cameraForward.scale(this.edgeScrollSpeed));
                if (this.mouseY > height - this.edgeScrollThreshold) inputVector.addInPlace(cameraForward.scale(-this.edgeScrollSpeed));
            }
        }

        // 如果有输入，更新目标位置
        if (inputVector.lengthSquared() > 0.001) {
            inputVector.normalize().scaleInPlace(this.moveSpeed * dt * 60); // 归一化并应用速度
            this.targetPosition.addInPlace(inputVector);
            
            // 边界限制
            this.targetPosition.x = Math.max(this.moveBounds.minX, Math.min(this.moveBounds.maxX, this.targetPosition.x));
            this.targetPosition.z = Math.max(this.moveBounds.minZ, Math.min(this.moveBounds.maxZ, this.targetPosition.z));
        }
        
        // 3. 平滑插值移动相机
        // 使用 Lerp 实现平滑阻尼效果
        const currentTarget = this.dummyTarget.position;
        if (Vector3.DistanceSquared(currentTarget, this.targetPosition) > 0.001) {
            // 帧率无关的 Lerp: lerpFactor = 1 - exp(-lambda * dt)
            // 这里简化处理，smoothTime 越小越快
            const lerpFactor = 0.15; 
            this.dummyTarget.position = Vector3.Lerp(currentTarget, this.targetPosition, lerpFactor);
        }
    }
    
    /**
     * 设置移动边界
     */
    setMoveBounds(minX: number, maxX: number, minZ: number, maxZ: number): void {
        this.moveBounds = { minX, maxX, minZ, maxZ };
    }
    
    /**
     * 平滑移动到目标位置
     */
    moveTo(target: Vector3, duration: number = 1000): Promise<void> {
        return new Promise((resolve) => {
            const startTarget = this.dummyTarget.position.clone();
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // 缓动函数（ease-out）
                const eased = 1 - Math.pow(1 - progress, 3);
                
                this.dummyTarget.position = Vector3.Lerp(startTarget, target, eased);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            
            animate();
        });
    }
    
    /**
     * 获取相机对象
     */
    getCamera(): ArcRotateCamera {
        return this.camera;
    }
    
    /**
     * 清理资源
     */
    dispose(): void {
        this.camera.dispose();
    }
}

export default ClCameraController;
