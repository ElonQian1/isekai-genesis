/**
 * 战斗 UI 特效 - 浮动数字、相机抖动、屏幕闪烁
 * 
 * 模块: client/render/battle/effects
 * 前缀: Cl
 * 文档: 文档/09-模块化架构.md
 * 
 * 职责：
 * - 浮动伤害/治疗数字
 * - 相机抖动效果
 * - 屏幕闪烁效果
 */

import {
    Scene,
    Vector3,
    Color4,
    ArcRotateCamera,
} from '@babylonjs/core';

// =============================================================================
// 配置
// =============================================================================

export const UI_EFFECT_CONFIG = {
    // 浮动数字
    floatingText: {
        fontSize: 24,
        animationDuration: 1000,
        riseDistance: 50,
    },
    
    // 相机抖动
    cameraShake: {
        defaultIntensity: 0.3,
        defaultDuration: 200,
        frequency: 50,
    },
    
    // 屏幕闪烁
    screenFlash: {
        defaultDuration: 100,
        defaultOpacity: 0.3,
    }
};

// =============================================================================
// UI 特效管理器
// =============================================================================

export class ClBattleUIEffects {
    private scene: Scene;
    private flashOverlay: HTMLDivElement | null = null;
    
    constructor(scene: Scene) {
        this.scene = scene;
        this.createFlashOverlay();
    }
    
    /**
     * 创建屏幕闪烁覆盖层
     */
    private createFlashOverlay(): void {
        this.flashOverlay = document.createElement('div');
        this.flashOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.05s ease-out;
        `;
        document.body.appendChild(this.flashOverlay);
    }
    
    /**
     * 显示浮动数字
     */
    showFloatingNumber(position: Vector3, text: string, color: Color4): void {
        const config = UI_EFFECT_CONFIG.floatingText;
        
        const div = document.createElement('div');
        div.textContent = text;
        div.style.cssText = `
            position: fixed;
            font-size: ${config.fontSize}px;
            font-weight: bold;
            color: rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)});
            text-shadow: 0 0 4px rgba(0,0,0,0.8), 0 0 8px currentColor;
            pointer-events: none;
            z-index: 1000;
            transition: transform ${config.animationDuration}ms ease-out, opacity ${config.animationDuration}ms ease-out;
        `;
        
        // 将 3D 位置转换为屏幕位置
        const screenPos = this.worldToScreen(position);
        if (!screenPos) {
            div.remove();
            return;
        }
        
        div.style.left = `${screenPos.x}px`;
        div.style.top = `${screenPos.y}px`;
        div.style.transform = 'translate(-50%, -50%)';
        
        document.body.appendChild(div);
        
        // 触发动画
        requestAnimationFrame(() => {
            div.style.transform = `translate(-50%, -50%) translateY(-${config.riseDistance}px)`;
            div.style.opacity = '0';
        });
        
        // 清理
        setTimeout(() => div.remove(), config.animationDuration);
    }
    
    /**
     * 相机抖动
     */
    shakeCamera(intensity?: number, duration?: number): void {
        const config = UI_EFFECT_CONFIG.cameraShake;
        const shakeIntensity = intensity ?? config.defaultIntensity;
        const shakeDuration = duration ?? config.defaultDuration;
        
        const camera = this.scene.activeCamera as ArcRotateCamera;
        if (!camera) return;
        
        const originalTarget = camera.target.clone();
        const startTime = performance.now();
        
        const shake = () => {
            const elapsed = performance.now() - startTime;
            if (elapsed >= shakeDuration) {
                camera.target = originalTarget;
                return;
            }
            
            const progress = elapsed / shakeDuration;
            const currentIntensity = shakeIntensity * (1 - progress);
            
            camera.target = originalTarget.add(new Vector3(
                (Math.random() - 0.5) * 2 * currentIntensity,
                (Math.random() - 0.5) * 2 * currentIntensity,
                (Math.random() - 0.5) * 2 * currentIntensity
            ));
            
            requestAnimationFrame(shake);
        };
        
        shake();
    }
    
    /**
     * 屏幕闪烁
     */
    flashScreen(color: Color4, duration?: number): void {
        if (!this.flashOverlay) return;
        
        const flashDuration = duration ?? UI_EFFECT_CONFIG.screenFlash.defaultDuration;
        
        this.flashOverlay.style.backgroundColor = `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, ${UI_EFFECT_CONFIG.screenFlash.defaultOpacity})`;
        this.flashOverlay.style.opacity = '1';
        
        setTimeout(() => {
            if (this.flashOverlay) {
                this.flashOverlay.style.opacity = '0';
            }
        }, flashDuration);
    }
    
    /**
     * 显示连击数字
     */
    showComboNumber(comboCount: number, position: Vector3): void {
        const color = this.getComboColor(comboCount);
        const text = `${comboCount} COMBO!`;
        this.showFloatingNumber(position, text, color);
    }
    
    /**
     * 显示暴击效果
     */
    showCriticalHit(position: Vector3, damage: number): void {
        const color = new Color4(1, 0.8, 0, 1); // 金色
        this.showFloatingNumber(position, `暴击! ${damage}`, color);
        this.shakeCamera(0.5, 300);
        this.flashScreen(color, 80);
    }
    
    // =========================================================================
    // 辅助方法
    // =========================================================================
    
    private worldToScreen(position: Vector3): { x: number; y: number } | null {
        const camera = this.scene.activeCamera;
        if (!camera) return null;
        
        const engine = this.scene.getEngine();
        const screenPos = Vector3.Project(
            position,
            this.scene.getTransformMatrix(),
            camera.getProjectionMatrix(),
            camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
        );
        
        return { x: screenPos.x, y: screenPos.y };
    }
    
    private getComboColor(combo: number): Color4 {
        if (combo >= 10) return new Color4(1, 0.2, 0.8, 1);  // 紫色
        if (combo >= 7) return new Color4(1, 0.5, 0, 1);     // 橙色
        if (combo >= 5) return new Color4(1, 0.8, 0, 1);     // 金色
        if (combo >= 3) return new Color4(0.2, 0.8, 1, 1);   // 青色
        return new Color4(1, 1, 1, 1);                       // 白色
    }
    
    /**
     * 销毁
     */
    dispose(): void {
        if (this.flashOverlay) {
            this.flashOverlay.remove();
            this.flashOverlay = null;
        }
    }
}
