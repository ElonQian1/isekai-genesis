/**
 * 战斗视觉效果模块
 * 
 * 职责：
 * - 浮动数字显示
 * - 相机抖动效果
 * - 屏幕闪烁效果
 * - 屏幕后处理效果
 * 
 * 模块: client/render/battle/effects
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import {
    Scene,
    Vector3,
    Color4,
} from '@babylonjs/core';

// =============================================================================
// 视觉效果配置
// =============================================================================

export const CL_VISUAL_EFFECT_CONFIG = {
    // 浮动数字
    FLOAT_DURATION_MS: 1000,
    FLOAT_FONT_SIZE: 24,
    FLOAT_OFFSET_Y: -50,
    
    // 相机抖动
    SHAKE_DEFAULT_INTENSITY: 0.3,
    SHAKE_DEFAULT_DURATION_MS: 200,
    
    // 屏幕闪烁
    FLASH_DEFAULT_DURATION_MS: 150,
    FLASH_OPACITY: 0.3,
};

// =============================================================================
// 视觉效果管理器
// =============================================================================

export class ClVisualEffectManager {
    private scene: Scene;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    // =========================================================================
    // 浮动数字
    // =========================================================================

    /**
     * 显示浮动数字
     */
    showFloatingNumber(position: Vector3, text: string, color: Color4): void {
        const config = CL_VISUAL_EFFECT_CONFIG;
        
        const div = document.createElement('div');
        div.textContent = text;
        div.style.cssText = `
            position: fixed;
            font-size: ${config.FLOAT_FONT_SIZE}px;
            font-weight: bold;
            color: rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)});
            text-shadow: 0 0 4px rgba(0,0,0,0.8), 0 0 8px currentColor;
            pointer-events: none;
            z-index: 1000;
            transition: transform ${config.FLOAT_DURATION_MS}ms ease-out, opacity ${config.FLOAT_DURATION_MS}ms ease-out;
        `;
        
        // 将 3D 位置转换为屏幕位置
        const screenPos = this.worldToScreen(position);
        div.style.left = `${screenPos.x}px`;
        div.style.top = `${screenPos.y}px`;
        
        document.body.appendChild(div);
        
        // 动画
        requestAnimationFrame(() => {
            div.style.transform = `translateY(${config.FLOAT_OFFSET_Y}px)`;
            div.style.opacity = '0';
        });
        
        // 清理
        setTimeout(() => {
            div.remove();
        }, config.FLOAT_DURATION_MS);
    }

    /**
     * 显示伤害数字
     */
    showDamage(position: Vector3, amount: number): void {
        const color = new Color4(1, 0.2, 0.2, 1);
        this.showFloatingNumber(position, `-${amount}`, color);
    }

    /**
     * 显示治疗数字
     */
    showHeal(position: Vector3, amount: number): void {
        const color = new Color4(0.2, 1, 0.4, 1);
        this.showFloatingNumber(position, `+${amount}`, color);
    }

    /**
     * 显示文字提示
     */
    showText(position: Vector3, text: string, color?: Color4): void {
        this.showFloatingNumber(position, text, color || new Color4(1, 1, 1, 1));
    }

    // =========================================================================
    // 相机抖动
    // =========================================================================

    /**
     * 相机抖动效果
     */
    shakeCamera(intensity?: number, durationMs?: number): void {
        const config = CL_VISUAL_EFFECT_CONFIG;
        const camera = this.scene.activeCamera;
        if (!camera) return;
        
        const shakeIntensity = intensity ?? config.SHAKE_DEFAULT_INTENSITY;
        const shakeDuration = durationMs ?? config.SHAKE_DEFAULT_DURATION_MS;
        
        const originalPos = camera.position.clone();
        const startTime = performance.now();
        
        const shake = () => {
            const elapsed = performance.now() - startTime;
            if (elapsed < shakeDuration) {
                const t = elapsed / shakeDuration;
                const decay = 1 - t;
                
                camera.position.x = originalPos.x + (Math.random() - 0.5) * shakeIntensity * decay;
                camera.position.y = originalPos.y + (Math.random() - 0.5) * shakeIntensity * decay;
                
                requestAnimationFrame(shake);
            } else {
                camera.position = originalPos;
            }
        };
        
        shake();
    }

    /**
     * 轻微抖动 (适用于轻击)
     */
    shakeCameraLight(): void {
        this.shakeCamera(0.1, 100);
    }

    /**
     * 强烈抖动 (适用于重击/暴击)
     */
    shakeCameraHeavy(): void {
        this.shakeCamera(0.5, 300);
    }

    // =========================================================================
    // 屏幕闪烁
    // =========================================================================

    /**
     * 屏幕闪烁效果
     */
    flashScreen(color: Color4, durationMs?: number): void {
        const config = CL_VISUAL_EFFECT_CONFIG;
        const duration = durationMs ?? config.FLASH_DEFAULT_DURATION_MS;
        
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, ${config.FLASH_OPACITY});
            pointer-events: none;
            z-index: 999;
            transition: opacity ${duration}ms;
        `;
        
        document.body.appendChild(overlay);
        
        requestAnimationFrame(() => {
            overlay.style.opacity = '0';
        });
        
        setTimeout(() => {
            overlay.remove();
        }, duration);
    }

    /**
     * 红色闪烁 (受伤)
     */
    flashDamage(): void {
        this.flashScreen(new Color4(1, 0, 0, 1), 100);
    }

    /**
     * 绿色闪烁 (治疗)
     */
    flashHeal(): void {
        this.flashScreen(new Color4(0, 1, 0.3, 1), 150);
    }

    /**
     * 白色闪烁 (暴击/特效)
     */
    flashCritical(): void {
        this.flashScreen(new Color4(1, 1, 1, 1), 80);
    }

    // =========================================================================
    // 辅助方法
    // =========================================================================

    /**
     * 世界坐标转屏幕坐标
     */
    private worldToScreen(position: Vector3): { x: number; y: number } {
        const camera = this.scene.activeCamera;
        if (!camera) return { x: 0, y: 0 };
        
        const screenPos = Vector3.Project(
            position,
            this.scene.getTransformMatrix(),
            camera.getProjectionMatrix(),
            camera.viewport.toGlobal(
                this.scene.getEngine().getRenderWidth(),
                this.scene.getEngine().getRenderHeight()
            )
        );
        
        return { x: screenPos.x, y: screenPos.y };
    }
}
