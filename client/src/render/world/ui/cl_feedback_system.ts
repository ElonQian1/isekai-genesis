/**
 * 反馈系统 - 处理浮动文字、伤害数字等视觉反馈
 * 
 * 模块: client/render/world/ui
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责：
 * - 显示浮动文字 (Floating Text)
 * - 显示伤害/治疗数字
 * - 管理文字的生命周期和动画
 */

import {
    Scene,
    Vector3,
    Observer,
    Matrix
} from '@babylonjs/core';
import {
    AdvancedDynamicTexture,
    TextBlock
} from '@babylonjs/gui';

interface FloatingText {
    control: TextBlock;
    worldPosition: Vector3;
    offsetY: number;
    lifeTime: number;
    maxLifeTime: number;
    velocity: number;
}

export class ClFeedbackSystem {
    private scene: Scene;
    private gui: AdvancedDynamicTexture;
    
    private activeTexts: FloatingText[] = [];
    private renderObserver: Observer<Scene> | null = null;

    constructor(scene: Scene) {
        this.scene = scene;
        // 创建全屏 UI，但用于投射 3D 坐标
        this.gui = AdvancedDynamicTexture.CreateFullscreenUI('feedbackUI', true, scene);
    }

    /**
     * 初始化
     */
    init(): void {
        this.renderObserver = this.scene.onBeforeRenderObservable.add(() => {
            this.update();
        });
        console.log('✅ 反馈系统初始化完成');
    }

    /**
     * 显示普通浮动文字
     */
    showFloatingText(position: Vector3, text: string, color: string = '#ffffff'): void {
        this.createFloatingText(position, text, color, 24);
    }

    /**
     * 显示伤害数字
     */
    showDamage(position: Vector3, amount: number, isCrit: boolean = false): void {
        const text = `-${Math.floor(amount)}`;
        const color = isCrit ? '#ff0000' : '#ffaa00';
        const size = isCrit ? 36 : 28;
        this.createFloatingText(position, text, color, size);
    }

    /**
     * 显示治疗数字
     */
    showHeal(position: Vector3, amount: number): void {
        const text = `+${Math.floor(amount)}`;
        const color = '#00ff00';
        this.createFloatingText(position, text, color, 28);
    }

    /**
     * 创建浮动文字实例
     */
    private createFloatingText(position: Vector3, text: string, color: string, fontSize: number): void {
        const block = new TextBlock();
        block.text = text;
        block.color = color;
        block.fontSize = fontSize;
        block.fontWeight = 'bold';
        block.outlineWidth = 2;
        block.outlineColor = 'black';
        block.shadowColor = 'rgba(0,0,0,0.5)';
        block.shadowBlur = 2;
        block.shadowOffsetX = 2;
        block.shadowOffsetY = 2;
        
        this.gui.addControl(block);
        
        this.activeTexts.push({
            control: block,
            worldPosition: position.clone(),
            offsetY: 0,
            lifeTime: 0,
            maxLifeTime: 1.5, // 1.5秒消失
            velocity: 1.0 // 上升速度
        });
    }

    /**
     * 每帧更新
     */
    private update(): void {
        const dt = this.scene.getEngine().getDeltaTime() / 1000;
        
        for (let i = this.activeTexts.length - 1; i >= 0; i--) {
            const ft = this.activeTexts[i];
            
            // 更新生命周期
            ft.lifeTime += dt;
            if (ft.lifeTime >= ft.maxLifeTime) {
                // 销毁
                ft.control.dispose();
                this.activeTexts.splice(i, 1);
                continue;
            }
            
            // 更新位置 (向上飘动)
            ft.offsetY += ft.velocity * dt;
            
            // 更新透明度 (最后 0.5秒 渐隐)
            if (ft.lifeTime > ft.maxLifeTime - 0.5) {
                ft.control.alpha = 1 - (ft.lifeTime - (ft.maxLifeTime - 0.5)) / 0.5;
            }
            
            // 投影 3D 坐标到 2D 屏幕
            const projectedPos = Vector3.Project(
                ft.worldPosition.add(new Vector3(0, 2 + ft.offsetY, 0)), // 基础高度 + 飘动偏移
                Matrix.Identity(),
                this.scene.getTransformMatrix(),
                this.scene.activeCamera!.viewport.toGlobal(
                    this.scene.getEngine().getRenderWidth(),
                    this.scene.getEngine().getRenderHeight()
                )
            );
            
            // 检查是否在屏幕内 (Z > 0 && Z < 1)
            if (projectedPos.z < 0 || projectedPos.z > 1) {
                ft.control.isVisible = false;
            } else {
                ft.control.isVisible = true;
                ft.control.left = projectedPos.x - this.scene.getEngine().getRenderWidth() / 2;
                ft.control.top = projectedPos.y - this.scene.getEngine().getRenderHeight() / 2;
            }
        }
    }

    /**
     * 销毁
     */
    dispose(): void {
        if (this.renderObserver) {
            this.scene.onBeforeRenderObservable.remove(this.renderObserver);
            this.renderObserver = null;
        }
        this.gui.dispose();
    }
}
