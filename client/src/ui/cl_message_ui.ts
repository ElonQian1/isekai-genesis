/**
 * 消息提示 UI
 * 
 * 模块: client/ui
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import {
    AdvancedDynamicTexture,
    Rectangle,
    TextBlock,
    Control,
    StackPanel,
} from '@babylonjs/gui';

// =============================================================================
// 消息类型
// =============================================================================

export type ClMessageType = 'info' | 'success' | 'warning' | 'error';

interface ClMessageItem {
    id: number;
    text: string;
    type: ClMessageType;
    container: Rectangle;
    expiresAt: number;
    isRemoving: boolean;  // 标记是否正在移除中
}

// =============================================================================
// 消息配置
// =============================================================================

const CL_MESSAGE_CONFIG = {
    MAX_MESSAGES: 5,
    DEFAULT_DURATION: 3000, // ms
    ANIMATION_DURATION: 300, // ms
    
    COLORS: {
        info: { bg: 'rgba(0, 150, 255, 0.9)', text: 'white' },
        success: { bg: 'rgba(40, 180, 40, 0.9)', text: 'white' },
        warning: { bg: 'rgba(255, 180, 0, 0.9)', text: 'black' },
        error: { bg: 'rgba(220, 50, 50, 0.9)', text: 'white' },
    },
};

// =============================================================================
// 消息提示管理器
// =============================================================================

export class ClMessageUI {
    private gui: AdvancedDynamicTexture;
    private container: StackPanel;
    private messages: ClMessageItem[] = [];
    private nextId: number = 1;
    private cleanupTimer: number | null = null;

    constructor(gui: AdvancedDynamicTexture) {
        this.gui = gui;
        
        // 创建消息容器
        this.container = new StackPanel('messageContainer');
        this.container.isVertical = true;
        this.container.spacing = 10;
        this.container.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this.container.top = '150px';
        this.container.width = '400px';
        this.gui.addControl(this.container);
        
        // 启动清理定时器
        this.startCleanupTimer();
    }
    
    /**
     * 启动清理定时器
     */
    private startCleanupTimer(): void {
        if (this.cleanupTimer !== null) return;
        
        this.cleanupTimer = window.setInterval(() => {
            this.cleanupExpiredMessages();
        }, 100);
    }

    /**
     * 显示消息
     */
    show(text: string, type: ClMessageType = 'info', duration: number = CL_MESSAGE_CONFIG.DEFAULT_DURATION): void {
        // 限制消息数量
        while (this.messages.length >= CL_MESSAGE_CONFIG.MAX_MESSAGES) {
            this.removeMessage(this.messages[0].id);
        }
        
        const colors = CL_MESSAGE_CONFIG.COLORS[type];
        
        // 创建消息容器
        const msgContainer = new Rectangle(`msg_${this.nextId}`);
        msgContainer.width = '380px';
        msgContainer.height = '40px';
        msgContainer.cornerRadius = 8;
        msgContainer.thickness = 0;
        msgContainer.background = colors.bg;
        msgContainer.alpha = 0;
        
        // 消息文本
        const msgText = new TextBlock(`msgText_${this.nextId}`, text);
        msgText.color = colors.text;
        msgText.fontSize = 16;
        msgText.textWrapping = true;
        msgText.paddingLeft = '15px';
        msgText.paddingRight = '15px';
        msgContainer.addControl(msgText);
        
        // 添加到容器
        this.container.addControl(msgContainer);
        
        // 创建消息项
        const item: ClMessageItem = {
            id: this.nextId++,
            text,
            type,
            container: msgContainer,
            expiresAt: Date.now() + duration,
            isRemoving: false,
        };
        
        this.messages.push(item);
        
        // 淡入动画
        this.animateIn(msgContainer);
        
        // 设置定时器在 duration 后自动移除此消息
        setTimeout(() => {
            this.removeMessageById(item.id);
        }, duration);
    }

    /**
     * 显示信息
     */
    info(text: string, duration?: number): void {
        this.show(text, 'info', duration);
    }

    /**
     * 显示成功
     */
    success(text: string, duration?: number): void {
        this.show(text, 'success', duration);
    }

    /**
     * 显示警告
     */
    warning(text: string, duration?: number): void {
        this.show(text, 'warning', duration);
    }

    /**
     * 显示错误
     */
    error(text: string, duration?: number): void {
        this.show(text, 'error', duration);
    }

    /**
     * 淡入动画
     */
    private animateIn(container: Rectangle): void {
        let startTime = Date.now();
        const duration = CL_MESSAGE_CONFIG.ANIMATION_DURATION;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            container.alpha = progress;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    /**
     * 淡出动画
     */
    private animateOut(container: Rectangle): Promise<void> {
        return new Promise((resolve) => {
            let startTime = Date.now();
            const duration = CL_MESSAGE_CONFIG.ANIMATION_DURATION;
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                container.alpha = 1 - progress;
                
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
     * 移除消息（通过ID）
     */
    private removeMessageById(id: number): void {
        const index = this.messages.findIndex(m => m.id === id);
        if (index === -1) return;
        
        const item = this.messages[index];
        
        // 防止重复移除
        if (item.isRemoving) return;
        item.isRemoving = true;
        
        // 淡出动画
        this.animateOut(item.container).then(() => {
            // 再次查找索引（可能已经变了）
            const currentIndex = this.messages.findIndex(m => m.id === id);
            if (currentIndex !== -1) {
                this.container.removeControl(item.container);
                item.container.dispose();
                this.messages.splice(currentIndex, 1);
            }
        });
    }

    /**
     * 移除消息（旧接口，保持兼容）
     */
    private async removeMessage(id: number): Promise<void> {
        this.removeMessageById(id);
    }

    /**
     * 清理过期消息
     */
    private cleanupExpiredMessages(): void {
        const now = Date.now();
        const expired = this.messages.filter(m => m.expiresAt <= now && !m.isRemoving);
        
        for (const item of expired) {
            this.removeMessageById(item.id);
        }
    }

    /**
     * 清除所有消息
     */
    clear(): void {
        for (const item of [...this.messages]) {
            this.removeMessage(item.id);
        }
    }

    /**
     * 销毁
     */
    dispose(): void {
        // 清理定时器
        if (this.cleanupTimer !== null) {
            window.clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.clear();
        this.container.dispose();
    }
}
