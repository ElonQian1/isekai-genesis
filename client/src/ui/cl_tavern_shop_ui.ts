/**
 * 酒馆商店 UI
 * 
 * 模块: client
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 显示酒馆商店的5个槽位，支持购买、冻结、刷新
 */

import * as BABYLON from '@babylonjs/core';
import * as GUI from '@babylonjs/gui';
import type { ClTavernShopSlot, ClTavernEconomy } from '../cl_wasm';

// =============================================================================
// 类型定义
// =============================================================================

/** 商店 UI 事件 */
export interface ClTavernShopEvents {
    /** 点击购买怪兽 */
    onBuyMonster?: (slotIndex: number) => void;
    /** 点击冻结槽位 */
    onToggleFreeze?: (slotIndex: number) => void;
    /** 点击刷新商店 */
    onRefresh?: () => void;
    /** 点击购买经验 */
    onBuyXp?: () => void;
}

// =============================================================================
// 商店 UI 类
// =============================================================================

export class ClTavernShopUI {
    private advancedTexture: GUI.AdvancedDynamicTexture;
    private container: GUI.Rectangle;
    private slotsContainer: GUI.StackPanel;
    private slotPanels: GUI.Rectangle[] = [];
    private refreshButton!: GUI.Button;
    private buyXpButton!: GUI.Button;
    private goldText!: GUI.TextBlock;
    private levelText!: GUI.TextBlock;
    private xpBar!: GUI.Rectangle;
    private xpFill!: GUI.Rectangle;
    
    private events: ClTavernShopEvents = {};
    private isVisible: boolean = false;
    private currentSlots: ClTavernShopSlot[] = [];
    
    // 配置
    private readonly SLOT_WIDTH = 130;
    private readonly SLOT_HEIGHT = 180;
    private readonly SLOT_SPACING = 10;

    constructor(scene: BABYLON.Scene) {
        this.advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI('TavernShopUI', true, scene);
        
        // 创建主容器
        this.container = new GUI.Rectangle('tavernShopContainer');
        this.container.width = '800px';
        this.container.height = '320px';
        this.container.cornerRadius = 15;
        this.container.thickness = 3;
        this.container.color = '#CD853F';
        this.container.background = 'rgba(30, 20, 10, 0.95)';
        this.container.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.container.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        this.container.top = '60px';
        this.container.isVisible = false;
        this.advancedTexture.addControl(this.container);
        
        // 标题
        const title = new GUI.TextBlock('shopTitle', '🍺 酒馆商店');
        title.height = '40px';
        title.color = '#FFD700';
        title.fontSize = 22;
        title.fontFamily = 'SimHei';
        title.top = '-120px';
        this.container.addControl(title);
        
        // 经济信息面板
        this.createEconomyPanel();
        
        // 创建槽位容器
        this.slotsContainer = new GUI.StackPanel('slotsContainer');
        this.slotsContainer.isVertical = false;
        this.slotsContainer.height = `${this.SLOT_HEIGHT + 20}px`;
        this.slotsContainer.top = '10px';
        this.container.addControl(this.slotsContainer);
        
        // 创建5个槽位
        for (let i = 0; i < 5; i++) {
            this.createSlotPanel(i);
        }
        
        // 创建底部按钮
        this.createBottomButtons();
    }
    
    /** 创建经济信息面板 */
    private createEconomyPanel(): void {
        const panel = new GUI.StackPanel('economyPanel');
        panel.isVertical = false;
        panel.height = '35px';
        panel.top = '-80px';
        this.container.addControl(panel);
        
        // 金币显示
        this.goldText = new GUI.TextBlock('goldText', '💰 0');
        this.goldText.width = '100px';
        this.goldText.color = '#FFD700';
        this.goldText.fontSize = 18;
        this.goldText.fontFamily = 'SimHei';
        panel.addControl(this.goldText);
        
        // 等级显示
        this.levelText = new GUI.TextBlock('levelText', '⭐ Lv.1');
        this.levelText.width = '100px';
        this.levelText.color = '#87CEEB';
        this.levelText.fontSize = 18;
        this.levelText.fontFamily = 'SimHei';
        panel.addControl(this.levelText);
        
        // 经验条容器
        const xpContainer = new GUI.Rectangle('xpContainer');
        xpContainer.width = '150px';
        xpContainer.height = '20px';
        xpContainer.cornerRadius = 5;
        xpContainer.thickness = 1;
        xpContainer.color = '#666';
        xpContainer.background = '#333';
        panel.addControl(xpContainer);
        
        // 经验条填充
        this.xpFill = new GUI.Rectangle('xpFill');
        this.xpFill.width = '0%';
        this.xpFill.height = '100%';
        this.xpFill.cornerRadius = 5;
        this.xpFill.thickness = 0;
        this.xpFill.background = '#4CAF50';
        this.xpFill.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        xpContainer.addControl(this.xpFill);
        
        this.xpBar = xpContainer;
    }
    
    /** 创建单个槽位面板 */
    private createSlotPanel(index: number): void {
        const slot = new GUI.Rectangle(`slot_${index}`);
        slot.width = `${this.SLOT_WIDTH}px`;
        slot.height = `${this.SLOT_HEIGHT}px`;
        slot.cornerRadius = 10;
        slot.thickness = 2;
        slot.color = '#666';
        slot.background = 'rgba(50, 40, 30, 0.9)';
        slot.paddingLeft = '5px';
        slot.paddingRight = '5px';
        this.slotsContainer.addControl(slot);
        this.slotPanels.push(slot);
        
        // 空槽位提示
        const emptyText = new GUI.TextBlock(`empty_${index}`, '空');
        emptyText.color = '#666';
        emptyText.fontSize = 24;
        slot.addControl(emptyText);
        
        // 冻结按钮 (右上角)
        const freezeBtn = GUI.Button.CreateSimpleButton(`freeze_${index}`, '❄');
        freezeBtn.width = '30px';
        freezeBtn.height = '30px';
        freezeBtn.cornerRadius = 15;
        freezeBtn.thickness = 1;
        freezeBtn.color = '#87CEEB';
        freezeBtn.background = 'rgba(0, 0, 0, 0.5)';
        freezeBtn.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        freezeBtn.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        freezeBtn.top = '5px';
        freezeBtn.left = '-5px';
        freezeBtn.onPointerClickObservable.add(() => {
            this.events.onToggleFreeze?.(index);
        });
        slot.addControl(freezeBtn);
        
        // 购买按钮 (底部)
        const buyBtn = GUI.Button.CreateSimpleButton(`buy_${index}`, '购买');
        buyBtn.width = '80px';
        buyBtn.height = '30px';
        buyBtn.cornerRadius = 5;
        buyBtn.thickness = 1;
        buyBtn.color = '#FFF';
        buyBtn.background = '#2E7D32';
        buyBtn.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        buyBtn.top = '-10px';
        buyBtn.onPointerClickObservable.add(() => {
            this.events.onBuyMonster?.(index);
        });
        slot.addControl(buyBtn);
    }
    
    /** 创建底部按钮 */
    private createBottomButtons(): void {
        const panel = new GUI.StackPanel('bottomPanel');
        panel.isVertical = false;
        panel.height = '45px';
        panel.top = '120px';
        this.container.addControl(panel);
        
        // 刷新按钮
        this.refreshButton = GUI.Button.CreateSimpleButton('refreshBtn', '🔄 刷新 (2金)');
        this.refreshButton.width = '140px';
        this.refreshButton.height = '40px';
        this.refreshButton.cornerRadius = 8;
        this.refreshButton.thickness = 2;
        this.refreshButton.color = '#FFF';
        this.refreshButton.background = '#1976D2';
        this.refreshButton.paddingLeft = '10px';
        this.refreshButton.paddingRight = '10px';
        this.refreshButton.onPointerClickObservable.add(() => {
            this.events.onRefresh?.();
        });
        panel.addControl(this.refreshButton);
        
        // 购买经验按钮
        this.buyXpButton = GUI.Button.CreateSimpleButton('buyXpBtn', '📈 升级 (4金)');
        this.buyXpButton.width = '140px';
        this.buyXpButton.height = '40px';
        this.buyXpButton.cornerRadius = 8;
        this.buyXpButton.thickness = 2;
        this.buyXpButton.color = '#FFF';
        this.buyXpButton.background = '#7B1FA2';
        this.buyXpButton.paddingLeft = '10px';
        this.buyXpButton.paddingRight = '10px';
        this.buyXpButton.onPointerClickObservable.add(() => {
            this.events.onBuyXp?.();
        });
        panel.addControl(this.buyXpButton);
    }
    
    // =========================================================================
    // 公共方法
    // =========================================================================
    
    /** 设置事件监听 */
    public setEvents(events: ClTavernShopEvents): void {
        this.events = events;
    }
    
    /** 显示/隐藏 */
    public setVisible(visible: boolean): void {
        this.isVisible = visible;
        this.container.isVisible = visible;
    }
    
    /** 更新商店槽位 */
    public updateSlots(slots: ClTavernShopSlot[]): void {
        this.currentSlots = slots;
        
        for (let i = 0; i < 5; i++) {
            const slot = slots[i];
            const panel = this.slotPanels[i];
            
            if (!panel) continue;
            
            // 清除现有内容 (保留按钮)
            const children = panel.children.slice();
            for (const child of children) {
                if (child.name?.startsWith('monster_') || child.name?.startsWith('empty_')) {
                    panel.removeControl(child);
                }
            }
            
            if (slot?.monster) {
                const m = slot.monster;
                
                // 怪兽名称
                const nameText = new GUI.TextBlock(`monster_name_${i}`, m.name);
                nameText.color = m.golden_level > 0 ? '#FFD700' : '#FFF';
                nameText.fontSize = 14;
                nameText.top = '-50px';
                panel.addControl(nameText);
                
                // 星级
                const starText = new GUI.TextBlock(`monster_star_${i}`, '⭐'.repeat(m.star));
                starText.color = '#FFD700';
                starText.fontSize = 12;
                starText.top = '-30px';
                panel.addControl(starText);
                
                // 属性
                const statsText = new GUI.TextBlock(`monster_stats_${i}`, `⚔${m.atk} 🛡${m.def}`);
                statsText.color = '#AAA';
                statsText.fontSize = 12;
                statsText.top = '-10px';
                panel.addControl(statsText);
                
                // 价格
                const priceText = new GUI.TextBlock(`monster_price_${i}`, `💰${m.buy_price}`);
                priceText.color = '#FFD700';
                priceText.fontSize = 14;
                priceText.top = '15px';
                panel.addControl(priceText);
                
                // 冻结状态边框
                panel.color = slot.frozen ? '#87CEEB' : '#666';
                panel.thickness = slot.frozen ? 3 : 2;
            } else {
                // 空槽位
                const emptyText = new GUI.TextBlock(`empty_${i}`, '空');
                emptyText.color = '#666';
                emptyText.fontSize = 24;
                panel.addControl(emptyText);
                
                panel.color = '#666';
                panel.thickness = 2;
            }
        }
    }
    
    /** 更新经济信息 */
    public updateEconomy(economy: ClTavernEconomy): void {
        this.goldText.text = `💰 ${economy.gold}`;
        this.levelText.text = `⭐ Lv.${economy.level}`;
        
        // 更新经验条
        const progress = economy.xp_to_next > 0 
            ? Math.min(100, (economy.xp / economy.xp_to_next) * 100) 
            : 100;
        this.xpFill.width = `${progress}%`;
        
        // 更新按钮状态
        this.refreshButton.isEnabled = economy.gold >= 2;
        this.refreshButton.background = economy.gold >= 2 ? '#1976D2' : '#666';
        
        this.buyXpButton.isEnabled = economy.gold >= 4;
        this.buyXpButton.background = economy.gold >= 4 ? '#7B1FA2' : '#666';
    }
    
    /** 销毁 */
    public dispose(): void {
        this.advancedTexture.dispose();
    }
}
