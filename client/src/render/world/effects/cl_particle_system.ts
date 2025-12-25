/**
 * 粒子特效系统 - 落叶、萤火虫、雾气
 * 
 * 模块: client/render/world/effects
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责：
 * - 环境粒子（落叶、花瓣）
 * - 光效粒子（萤火虫、光点）
 * - 大气效果（雾气、尘埃）
 */

import {
    Scene,
    TransformNode,
    Vector3,
    Color4,
    ParticleSystem,
    MeshBuilder,
    Texture
} from '@babylonjs/core';

/**
 * 粒子特效系统
 */
export class ClParticleSystem {
    private scene: Scene;
    private sceneRoot: TransformNode;
    
    private particleSystems: ParticleSystem[] = [];
    
    // 通用粒子纹理 (Base64) - 一个简单的柔和光点
    private readonly PARTICLE_TEXTURE_DATA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAA7EAAAOxAGVKw4bAAACrElEQVRYhe2X30tTURTHP+fctbv5k6tN09Q009I/wChI6KkH33oIetCD9KDQP9CjHqJ6ChIiCIIeovBM0EwkS9N0Mzdz79zT4t7R3Jt7m27WwQcO95x7z/l87/ecc+/s8F/L8V+D/20A2Ww2FovF4slkMh6LxZKRSCQSi8WSS0tLyeXl5eTq6mpybW0tub6+nlxfX0+ur68nNzc3k1tbW8mtra3k9vZ2cnv7/wF4vV5fKBTyhcPhgM/nC/j9/oDf7w8EAoFAKBSKhEKhSCgUioTD4Ug4HI6Ew+FIOByOhMPhSDgcjoTD4Ug4HI6Ew+FIOByOhMPhyD8B0Ol0vkgk4o1EIt5IJOKNRCLeSCTijUQi3kgk4o1EIt5IJOKNRCLeSCTijUQi3kgk4o1EIt5IJOKNRCLeSCTijUQi3kgk4o1EIt5IJOKNRCLeSCTi/Q6ATqfzRaNRL4BwOOwNh8PecDjsDYfD3nA47A2Hw95wOOwNh8PecDjsDYfD3nA47A2Hw95wOOwNh8PecDjsDYfD3nA47A2Hw95wOOwNh8PecDjsDYfD3u8A6HS6XiwW82Kx2D8A8Xjci8fjXjwe9+LxuBePx714PO7F43EvHo978Xjci8fjXjwe9+LxuBePx714PO7F43EvHo978Xjci8fjXjwe9+LxuBePx714PO7F43HvdwB0Ol0vFot5sVjMi8ViXiwW82KxmBeLxbxYLObFYjEvFot5sVjMi8ViXiwW82KxmBeLxbxYLObFYjEvFot5sVjMi8ViXiwW82KxmBeLxbxYLObFYjHvdwB0Ol0vFot5sVjMi8ViXiwW82KxmBeLxbxYLObFYjEvFot5sVjMi8ViXiwW82KxmBeLxbxYLObFYjEvFot5sVjMi8ViXiwW82KxmBeLxbxYLOb9A/gJc/r5i551AAAAAElFTkSuQmCC";

    constructor(scene: Scene, sceneRoot: TransformNode) {
        this.scene = scene;
        this.sceneRoot = sceneRoot;
    }
    
    /**
     * 初始化粒子系统
     */
    async init(): Promise<void> {
        this.createFallingLeaves();
        this.createFireflies();
        this.createDustMotes();
        
        console.log(`✅ 粒子特效初始化完成 (${this.particleSystems.length}个系统)`);
    }
    
    /**
     * 创建落叶效果
     */
    private createFallingLeaves(): void {
        // 发射器
        const emitter = MeshBuilder.CreateBox('leafEmitter', { size: 0.1 }, this.scene);
        emitter.position = new Vector3(0, 20, 0);
        emitter.isVisible = false;
        emitter.parent = this.sceneRoot;
        
        const ps = new ParticleSystem('leaves', 100, this.scene);
        
        // 使用程序化纹理
        ps.particleTexture = new Texture(this.PARTICLE_TEXTURE_DATA, this.scene);
        
        ps.createPointEmitter(new Vector3(-40, 0, -40), new Vector3(40, 0, 40));
        
        ps.emitter = emitter;
        ps.minEmitBox = new Vector3(-40, 0, -40);
        ps.maxEmitBox = new Vector3(40, 5, 40);
        
        // 颜色：绿色到黄色
        ps.color1 = new Color4(0.4, 0.6, 0.2, 1);
        ps.color2 = new Color4(0.6, 0.5, 0.1, 1);
        ps.colorDead = new Color4(0.3, 0.2, 0.1, 0);
        
        // 大小
        ps.minSize = 0.1;
        ps.maxSize = 0.3;
        
        // 生命周期
        ps.minLifeTime = 5;
        ps.maxLifeTime = 10;
        
        // 发射速率
        ps.emitRate = 10;
        
        // 重力
        ps.gravity = new Vector3(0, -0.5, 0);
        
        // 旋转
        ps.minAngularSpeed = -Math.PI;
        ps.maxAngularSpeed = Math.PI;
        
        // 漂移
        ps.direction1 = new Vector3(-0.5, -1, -0.5);
        ps.direction2 = new Vector3(0.5, -0.5, 0.5);
        
        ps.start();
        this.particleSystems.push(ps);
    }
    
    /**
     * 创建萤火虫效果
     */
    private createFireflies(): void {
        const emitter = MeshBuilder.CreateBox('fireflyEmitter', { size: 0.1 }, this.scene);
        emitter.position = new Vector3(0, 2, 0);
        emitter.isVisible = false;
        emitter.parent = this.sceneRoot;
        
        const ps = new ParticleSystem('fireflies', 50, this.scene);
        
        ps.particleTexture = new Texture(this.PARTICLE_TEXTURE_DATA, this.scene);
        
        ps.emitter = emitter;
        ps.minEmitBox = new Vector3(-30, 0, -30);
        ps.maxEmitBox = new Vector3(30, 5, 30);
        
        // 颜色：暖黄色发光
        ps.color1 = new Color4(1.0, 0.9, 0.4, 1);
        ps.color2 = new Color4(0.8, 1.0, 0.3, 1);
        ps.colorDead = new Color4(0.5, 0.3, 0.1, 0);
        
        // 小光点
        ps.minSize = 0.05;
        ps.maxSize = 0.15;
        
        // 长生命周期（缓慢飘动）
        ps.minLifeTime = 3;
        ps.maxLifeTime = 8;
        
        // 低发射速率
        ps.emitRate = 5;
        
        // 几乎无重力
        ps.gravity = new Vector3(0, 0.1, 0);
        
        // 随机漂移
        ps.direction1 = new Vector3(-0.2, -0.1, -0.2);
        ps.direction2 = new Vector3(0.2, 0.3, 0.2);
        
        // 发光混合模式
        ps.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        ps.start();
        this.particleSystems.push(ps);
    }
    
    /**
     * 创建尘埃效果
     */
    private createDustMotes(): void {
        const emitter = MeshBuilder.CreateBox('dustEmitter', { size: 0.1 }, this.scene);
        emitter.position = new Vector3(0, 5, 0);
        emitter.isVisible = false;
        emitter.parent = this.sceneRoot;
        
        const ps = new ParticleSystem('dust', 200, this.scene);
        ps.particleTexture = new Texture(this.PARTICLE_TEXTURE_DATA, this.scene);
        
        ps.emitter = emitter;
        ps.minEmitBox = new Vector3(-50, -2, -50);
        ps.maxEmitBox = new Vector3(50, 10, 50);
        
        // 颜色：淡白色
        ps.color1 = new Color4(1, 1, 1, 0.3);
        ps.color2 = new Color4(0.9, 0.9, 0.8, 0.2);
        ps.colorDead = new Color4(0.8, 0.8, 0.8, 0);
        
        // 极小
        ps.minSize = 0.02;
        ps.maxSize = 0.05;
        
        // 长生命
        ps.minLifeTime = 10;
        ps.maxLifeTime = 20;
        
        // 持续发射
        ps.emitRate = 20;
        
        // 极慢飘动
        ps.direction1 = new Vector3(-0.05, 0.01, -0.05);
        ps.direction2 = new Vector3(0.05, 0.05, 0.05);
        
        ps.start();
        this.particleSystems.push(ps);
    }
    
    /**
     * 启用/禁用所有粒子
     */
    setEnabled(enabled: boolean): void {
        this.particleSystems.forEach(ps => {
            if (enabled) {
                ps.start();
            } else {
                ps.stop();
            }
        });
    }
    
    /**
     * 清理资源
     */
    dispose(): void {
        this.particleSystems.forEach(ps => ps.dispose());
        this.particleSystems = [];
    }
}

export default ClParticleSystem;
