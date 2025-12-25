/**
 * 加载进度 UI - 显示资源加载进度
 * 
 * 模块: client/render/world/ui
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责:
 * 1. 显示加载进度条
 * 2. 显示当前加载项目
 * 3. 淡入淡出动画
 * 4. 加载完成后自动隐藏
 */

import { 
    AdvancedDynamicTexture,
    Rectangle,
    TextBlock,
    Control,
    StackPanel,
} from '@babylonjs/gui';
import { Scene } from '@babylonjs/core';

// =============================================================================
// 类型定义
// =============================================================================

export interface ClLoadingUIConfig {
    backgroundColor: string;
    progressBarColor: string;
    progressBackgroundColor: string;
    textColor: string;
    fadeInDuration: number;   // ms
    fadeOutDuration: number;  // ms
    minDisplayTime: number;   // 最短显示时间，防止闪烁
}

// =============================================================================
// 加载进度 UI
// =============================================================================

export class ClLoadingUI {
    private scene: Scene;
    private gui: AdvancedDynamicTexture | null = null;
    private config: ClLoadingUIConfig;
    
    // UI 元素
    private container: Rectangle | null = null;
    private progressBarBackground: Rectangle | null = null;
    private progressBarFill: Rectangle | null = null;
    private titleText: TextBlock | null = null;
    private statusText: TextBlock | null = null;
    private percentText: TextBlock | null = null;
    
    // 状态
    private isVisible: boolean = false;
    private showTime: number = 0;
    private currentProgress: number = 0;
    private targetProgress: number = 0;
    private animationFrame: number | null = null;

    constructor(scene: Scene, config?: Partial<ClLoadingUIConfig>) {
        this.scene = scene;
        this.config = {
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            progressBarColor: '#4CAF50',
            progressBackgroundColor: 'rgba(255, 255, 255, 0.2)',
            textColor: '#ffffff',
            fadeInDuration: 200,
            fadeOutDuration: 300,
            minDisplayTime: 500,
            ...config,
        };
    }

    /**
     * 初始化 UI
     */
    init(gui?: AdvancedDynamicTexture): void {
        this.gui = gui || AdvancedDynamicTexture.CreateFullscreenUI('loadingUI', true, this.scene);
        this.createUI();
        console.log('✅ 加载进度 UI 已初始化');
    }

    /**
     * 创建 UI 元素
     */
    private createUI(): void {
        if (!this.gui) return;

        // 主容器（全屏背景）
        this.container = new Rectangle('loadingContainer');
        this.container.width = '100%';
        this.container.height = '100%';
        this.container.background = this.config.backgroundColor;
        this.container.thickness = 0;
        this.container.alpha = 0;
        this.container.isVisible = false;
        this.container.zIndex = 1000; // 确保在最上层
        this.gui.addControl(this.container);

        // 内容面板
        const panel = new StackPanel('loadingPanel');
        panel.width = '400px';
        panel.height = '150px';
        panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        this.container.addControl(panel);

        // 标题
        this.titleText = new TextBlock('loadingTitle', '加载中...');
        this.titleText.height = '40px';
        this.titleText.fontSize = 28;
        this.titleText.fontWeight = 'bold';
        this.titleText.color = this.config.textColor;
        this.titleText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        panel.addControl(this.titleText);

        // 进度条容器
        const progressContainer = new Rectangle('progressContainer');
        progressContainer.width = '100%';
        progressContainer.height = '24px';
        progressContainer.cornerRadius = 12;
        progressContainer.background = this.config.progressBackgroundColor;
        progressContainer.thickness = 0;
        progressContainer.paddingTop = '15px';
        panel.addControl(progressContainer);

        // 进度条背景
        this.progressBarBackground = new Rectangle('progressBg');
        this.progressBarBackground.width = '100%';
        this.progressBarBackground.height = '100%';
        this.progressBarBackground.cornerRadius = 12;
        this.progressBarBackground.background = this.config.progressBackgroundColor;
        this.progressBarBackground.thickness = 0;
        progressContainer.addControl(this.progressBarBackground);

        // 进度条填充
        this.progressBarFill = new Rectangle('progressFill');
        this.progressBarFill.width = '0%';
        this.progressBarFill.height = '100%';
        this.progressBarFill.cornerRadius = 12;
        this.progressBarFill.background = this.config.progressBarColor;
        this.progressBarFill.thickness = 0;
        this.progressBarFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        progressContainer.addControl(this.progressBarFill);

        // 百分比文字
        this.percentText = new TextBlock('percentText', '0%');
        this.percentText.height = '30px';
        this.percentText.fontSize = 18;
        this.percentText.color = this.config.textColor;
        this.percentText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.percentText.paddingTop = '10px';
        panel.addControl(this.percentText);

        // 状态文字
        this.statusText = new TextBlock('statusText', '准备加载资源...');
        this.statusText.height = '30px';
        this.statusText.fontSize = 14;
        this.statusText.color = 'rgba(255, 255, 255, 0.7)';
        this.statusText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        panel.addControl(this.statusText);
    }

    /**
     * 显示加载 UI
     */
    show(title?: string): void {
        if (!this.container) return;
        
        this.isVisible = true;
        this.showTime = performance.now();
        this.currentProgress = 0;
        this.targetProgress = 0;
        
        if (title && this.titleText) {
            this.titleText.text = title;
        }
        
        this.updateProgress(0, '准备加载资源...');
        
        this.container.isVisible = true;
        this.fadeIn();
        this.startProgressAnimation();
    }

    /**
     * 隐藏加载 UI
     */
    hide(): void {
        if (!this.container || !this.isVisible) return;
        
        // 确保至少显示 minDisplayTime
        const elapsed = performance.now() - this.showTime;
        const remaining = this.config.minDisplayTime - elapsed;
        
        if (remaining > 0) {
            setTimeout(() => this.doHide(), remaining);
        } else {
            this.doHide();
        }
    }

    /**
     * 实际隐藏
     */
    private doHide(): void {
        this.fadeOut(() => {
            if (this.container) {
                this.container.isVisible = false;
            }
            this.isVisible = false;
            this.stopProgressAnimation();
        });
    }

    /**
     * 更新进度
     * @param percent 进度百分比 (0-100)
     * @param statusMessage 状态消息
     */
    updateProgress(percent: number, statusMessage?: string): void {
        this.targetProgress = Math.min(100, Math.max(0, percent));
        
        if (this.percentText) {
            this.percentText.text = `${Math.round(this.currentProgress)}%`;
        }
        
        if (statusMessage && this.statusText) {
            this.statusText.text = statusMessage;
        }
    }

    /**
     * 开始进度条动画
     */
    private startProgressAnimation(): void {
        const animate = () => {
            // 平滑过渡到目标进度
            const diff = this.targetProgress - this.currentProgress;
            if (Math.abs(diff) > 0.1) {
                this.currentProgress += diff * 0.1; // 缓动
                
                if (this.progressBarFill) {
                    this.progressBarFill.width = `${this.currentProgress}%`;
                }
                if (this.percentText) {
                    this.percentText.text = `${Math.round(this.currentProgress)}%`;
                }
            }
            
            if (this.isVisible) {
                this.animationFrame = requestAnimationFrame(animate);
            }
        };
        
        this.animationFrame = requestAnimationFrame(animate);
    }

    /**
     * 停止进度条动画
     */
    private stopProgressAnimation(): void {
        if (this.animationFrame !== null) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    /**
     * 淡入动画
     */
    private fadeIn(): void {
        if (!this.container) return;
        
        const duration = this.config.fadeInDuration;
        const startTime = performance.now();
        const startAlpha = this.container.alpha;
        
        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(1, elapsed / duration);
            
            if (this.container) {
                this.container.alpha = startAlpha + (1 - startAlpha) * progress;
            }
            
            if (progress < 1 && this.isVisible) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * 淡出动画
     */
    private fadeOut(onComplete?: () => void): void {
        if (!this.container) return;
        
        const duration = this.config.fadeOutDuration;
        const startTime = performance.now();
        const startAlpha = this.container.alpha;
        
        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(1, elapsed / duration);
            
            if (this.container) {
                this.container.alpha = startAlpha * (1 - progress);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                onComplete?.();
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * 设置标题
     */
    setTitle(title: string): void {
        if (this.titleText) {
            this.titleText.text = title;
        }
    }

    /**
     * 设置进度条颜色
     */
    setProgressColor(color: string): void {
        if (this.progressBarFill) {
            this.progressBarFill.background = color;
        }
    }

    /**
     * 是否正在显示
     */
    isShowing(): boolean {
        return this.isVisible;
    }

    /**
     * 清理资源
     */
    dispose(): void {
        this.stopProgressAnimation();
        this.container?.dispose();
        this.container = null;
        this.progressBarFill = null;
        this.progressBarBackground = null;
        this.titleText = null;
        this.statusText = null;
        this.percentText = null;
    }
}

export default ClLoadingUI;
