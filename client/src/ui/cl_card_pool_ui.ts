/**
 * 公共卡池 UI
 * 
 * 模块: client
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 显示公共卡池的展示区，允许玩家花费行动力获取卡牌
 */

import * as BABYLON from '@babylonjs/core';
import * as GUI from '@babylonjs/gui';
import type { ClWasmCard } from '../cl_wasm';

// =============================================================================
// 类型定义
// =============================================================================

/** 卡池 UI 事件 */
export interface ClCardPoolEvents {
    /** 点击获取卡牌 */
    onAcquireCard?: (cardId: string) => void;
    /** 点击刷新卡池 */
    onRefreshPool?: () => void;
}

// =============================================================================
// 卡池 UI 类
// =============================================================================

export class ClCardPoolUI {
    private advancedTexture: GUI.AdvancedDynamicTexture;
    private container: GUI.Rectangle;
    private cardsContainer: GUI.StackPanel;
    private cardButtons: Map<string, GUI.Button> = new Map();
    private refreshButton: GUI.Button;
    private actionPointsText: GUI.TextBlock;
    private poolCountText: GUI.TextBlock;
    
    private events: ClCardPoolEvents = {};
    private isVisible: boolean = false;
    
    // 配置
    private readonly CARD_WIDTH = 120;
    private readonly CARD_HEIGHT = 160;
    private readonly CARD_SPACING = 10;

    constructor(scene: BABYLON.Scene) {
        this.advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI('CardPoolUI', true, scene);
        
        // 创建主容器
        this.container = new GUI.Rectangle('cardPoolContainer');
        this.container.width = '750px';
        this.container.height = '280px';
        this.container.cornerRadius = 15;
        this.container.thickness = 3;
        this.container.color = '#8B4513';
        this.container.background = 'rgba(20, 15, 10, 0.95)';
        this.container.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.container.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        this.container.top = '60px';
        this.container.isVisible = false;
        this.advancedTexture.addControl(this.container);
        
        // 标题
        const title = new GUI.TextBlock('poolTitle', '🃏 公共卡池');
        title.height = '40px';
        title.color = '#FFD700';
        title.fontSize = 20;
        title.fontFamily = 'SimHei';
        title.top = '-100px';
        this.container.addControl(title);
        
        // 行动力和卡池数量显示
        const infoPanel = new GUI.StackPanel('infoPanel');
        infoPanel.isVertical = false;
        infoPanel.height = '30px';
        infoPanel.top = '-60px';
        infoPanel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.container.addControl(infoPanel);
        
        this.actionPointsText = new GUI.TextBlock('apText', '⚡ 行动力: 5/5');
        this.actionPointsText.width = '150px';
        this.actionPointsText.color = '#FFD700';
        this.actionPointsText.fontSize = 16;
        infoPanel.addControl(this.actionPointsText);
        
        this.poolCountText = new GUI.TextBlock('poolCount', '📚 剩余: 45');
        this.poolCountText.width = '150px';
        this.poolCountText.color = '#87CEEB';
        this.poolCountText.fontSize = 16;
        infoPanel.addControl(this.poolCountText);
        
        // 卡牌容器
        this.cardsContainer = new GUI.StackPanel('cardsContainer');
        this.cardsContainer.isVertical = false;
        this.cardsContainer.spacing = this.CARD_SPACING;
        this.cardsContainer.height = `${this.CARD_HEIGHT + 40}px`;
        this.cardsContainer.top = '20px';
        this.container.addControl(this.cardsContainer);
        
        // 刷新按钮
        this.refreshButton = this.createRefreshButton();
        this.container.addControl(this.refreshButton);
    }
    
    // =========================================================================
    // 创建 UI 元素
    // =========================================================================
    
    private createRefreshButton(): GUI.Button {
        const btn = GUI.Button.CreateSimpleButton('refreshBtn', '🔄 刷新 (1⚡)');
        btn.width = '120px';
        btn.height = '35px';
        btn.color = 'white';
        btn.background = '#4a7c59';
        btn.cornerRadius = 8;
        btn.top = '100px';
        btn.thickness = 2;
        btn.hoverCursor = 'pointer';
        
        btn.onPointerEnterObservable.add(() => {
            btn.background = '#5a9c69';
        });
        
        btn.onPointerOutObservable.add(() => {
            btn.background = '#4a7c59';
        });
        
        btn.onPointerClickObservable.add(() => {
            if (this.events.onRefreshPool) {
                this.events.onRefreshPool();
            }
        });
        
        return btn;
    }
    
    private createCardButton(card: ClWasmCard): GUI.Button {
        const btn = GUI.Button.CreateSimpleButton(`card_${card.id}`, '');
        btn.width = `${this.CARD_WIDTH}px`;
        btn.height = `${this.CARD_HEIGHT}px`;
        btn.thickness = 2;
        btn.cornerRadius = 8;
        btn.hoverCursor = 'pointer';
        
        // 根据卡牌类型设置颜色
        const colors = this.getCardColors(card.card_type);
        btn.color = colors.border;
        btn.background = colors.bg;
        
        // 卡牌内容布局
        const content = new GUI.StackPanel('content');
        content.isVertical = true;
        btn.addControl(content);
        
        // 费用
        const cost = new GUI.TextBlock('cost', `${card.cost}⚡`);
        cost.height = '25px';
        cost.color = '#FFD700';
        cost.fontSize = 16;
        cost.fontFamily = 'SimHei';
        content.addControl(cost);
        
        // 卡牌名称
        const name = new GUI.TextBlock('name', card.name);
        name.height = '30px';
        name.color = 'white';
        name.fontSize = 14;
        name.fontFamily = 'SimHei';
        name.textWrapping = true;
        content.addControl(name);
        
        // 类型图标
        const typeIcon = this.getCardTypeIcon(card.card_type);
        const type = new GUI.TextBlock('type', typeIcon);
        type.height = '35px';
        type.color = 'white';
        type.fontSize = 24;
        content.addControl(type);
        
        // 数值
        const value = this.getCardValue(card);
        const valueText = new GUI.TextBlock('value', value);
        valueText.height = '25px';
        valueText.color = '#87CEEB';
        valueText.fontSize = 14;
        content.addControl(valueText);
        
        // 获取按钮
        const acquireText = new GUI.TextBlock('acquire', '点击获取');
        acquireText.height = '25px';
        acquireText.color = '#90EE90';
        acquireText.fontSize = 12;
        acquireText.top = '10px';
        content.addControl(acquireText);
        
        // 悬停效果
        btn.onPointerEnterObservable.add(() => {
            btn.scaleX = 1.05;
            btn.scaleY = 1.05;
            acquireText.color = '#FFFF00';
        });
        
        btn.onPointerOutObservable.add(() => {
            btn.scaleX = 1;
            btn.scaleY = 1;
            acquireText.color = '#90EE90';
        });
        
        // 点击获取
        btn.onPointerClickObservable.add(() => {
            if (this.events.onAcquireCard) {
                this.events.onAcquireCard(card.id);
            }
        });
        
        return btn;
    }
    
    private getCardColors(cardType: string): { border: string; bg: string } {
        switch (cardType) {
            case 'Attack':
                return { border: '#FF4444', bg: 'rgba(139, 0, 0, 0.8)' };
            case 'Defense':
                return { border: '#4444FF', bg: 'rgba(0, 0, 139, 0.8)' };
            case 'Skill':
                return { border: '#44FF44', bg: 'rgba(0, 100, 0, 0.8)' };
            case 'Special':
                return { border: '#FFD700', bg: 'rgba(139, 69, 19, 0.8)' };
            default:
                return { border: '#888888', bg: 'rgba(50, 50, 50, 0.8)' };
        }
    }
    
    private getCardTypeIcon(cardType: string): string {
        switch (cardType) {
            case 'Attack': return '⚔️';
            case 'Defense': return '🛡️';
            case 'Skill': return '💚';
            case 'Special': return '✨';
            default: return '❓';
        }
    }
    
    private getCardValue(card: ClWasmCard): string {
        switch (card.card_type) {
            case 'Attack':
                return `伤害: ${card.base_damage}`;
            case 'Defense':
                return `护盾: ${card.base_defense || 0}`;
            case 'Skill':
                return `治疗: ${card.base_damage}`; // 治疗用 base_damage 存储
            case 'Special':
                return '特殊效果';
            default:
                return '';
        }
    }
    
    // =========================================================================
    // 公共方法
    // =========================================================================
    
    /**
     * 更新卡池显示
     */
    public updateDisplay(cards: ClWasmCard[]): void {
        // 清空现有卡牌
        this.cardButtons.forEach(btn => btn.dispose());
        this.cardButtons.clear();
        
        // 清空容器 - 直接重新创建
        this.cardsContainer.children.slice().forEach(child => {
            this.cardsContainer.removeControl(child);
        });
        
        // 添加新卡牌
        for (const card of cards) {
            const btn = this.createCardButton(card);
            this.cardsContainer.addControl(btn);
            this.cardButtons.set(card.id, btn);
        }
    }
    
    /**
     * 更新行动力显示
     */
    public updateActionPoints(current: number, max: number): void {
        this.actionPointsText.text = `⚡ 行动力: ${current}/${max}`;
        
        // 根据剩余行动力调整颜色
        if (current === 0) {
            this.actionPointsText.color = '#FF4444';
            this.refreshButton.isEnabled = false;
            this.refreshButton.alpha = 0.5;
        } else if (current <= 2) {
            this.actionPointsText.color = '#FFA500';
            this.refreshButton.isEnabled = true;
            this.refreshButton.alpha = 1;
        } else {
            this.actionPointsText.color = '#FFD700';
            this.refreshButton.isEnabled = true;
            this.refreshButton.alpha = 1;
        }
    }
    
    /**
     * 更新卡池数量显示
     */
    public updatePoolCount(drawPile: number, discardPile: number): void {
        this.poolCountText.text = `📚 剩余: ${drawPile} | 弃牌: ${discardPile}`;
    }
    
    /**
     * 设置事件回调
     */
    public setEvents(events: ClCardPoolEvents): void {
        this.events = events;
    }
    
    /**
     * 显示卡池
     */
    public show(): void {
        this.container.isVisible = true;
        this.isVisible = true;
    }
    
    /**
     * 隐藏卡池
     */
    public hide(): void {
        this.container.isVisible = false;
        this.isVisible = false;
    }
    
    /**
     * 切换显示
     */
    public toggle(): void {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * 检查是否可见
     */
    public getIsVisible(): boolean {
        return this.isVisible;
    }
    
    /**
     * 高亮指定卡牌
     */
    public highlightCard(cardId: string, highlight: boolean): void {
        const btn = this.cardButtons.get(cardId);
        if (btn) {
            if (highlight) {
                btn.thickness = 4;
                btn.color = '#FFFF00';
            } else {
                btn.thickness = 2;
                // 恢复原色需要知道卡牌类型，暂时用默认色
            }
        }
    }
    
    /**
     * 播放获取卡牌动画
     */
    public playAcquireAnimation(cardId: string): void {
        const btn = this.cardButtons.get(cardId);
        if (!btn) return;
        
        // 简单的缩放动画
        const originalScaleX = btn.scaleX;
        const originalScaleY = btn.scaleY;
        
        btn.scaleX = 1.2;
        btn.scaleY = 1.2;
        
        setTimeout(() => {
            btn.scaleX = originalScaleX;
            btn.scaleY = originalScaleY;
        }, 200);
    }
    
    /**
     * 销毁 UI
     */
    public dispose(): void {
        this.cardButtons.forEach(btn => btn.dispose());
        this.cardButtons.clear();
        this.container.dispose();
        this.advancedTexture.dispose();
    }
}
