/**
 * 酒馆战场 UI
 * 
 * 模块: client
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 显示战场5个槽位，支持部署、召回、换位
 */

import * as BABYLON from '@babylonjs/core';
import * as GUI from '@babylonjs/gui';
import type { ClTavernMonster } from '../cl_wasm';

// =============================================================================
// 类型定义
// =============================================================================

/** 战场槽位信息 */
export interface ClArenaSlot {
    index: number;
    monster: ClTavernMonster | null;
}

/** 战场 UI 事件 */
export interface ClTavernArenaEvents {
    /** 点击槽位 (部署目标) */
    onSlotClick?: (slotIndex: number) => void;
    /** 点击召回怪兽 */
    onRecall?: (slotIndex: number) => void;
    /** 换位 */
    onSwap?: (slotA: number, slotB: number) => void;
}

// =============================================================================
// 战场 UI 类
// =============================================================================

export class ClTavernArenaUI {
    private advancedTexture: GUI.AdvancedDynamicTexture;
    private container: GUI.Rectangle;
    private slotsContainer: GUI.StackPanel;
    private slotPanels: GUI.Rectangle[] = [];
    private maxSlotsText!: GUI.TextBlock;
    
    private events: ClTavernArenaEvents = {};
    private isVisible: boolean = false;
    private currentSlots: ClArenaSlot[] = [];
    private maxSlots: number = 3;
    private selectedSlot: number | null = null;
    
    // 配置
    private readonly SLOT_WIDTH = 120;
    private readonly SLOT_HEIGHT = 150;

    constructor(scene: BABYLON.Scene) {
        this.advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI('TavernArenaUI', true, scene);
        
        // 创建主容器
        this.container = new GUI.Rectangle('arenaContainer');
        this.container.width = '750px';
        this.container.height = '220px';
        this.container.cornerRadius = 12;
        this.container.thickness = 3;
        this.container.color = '#8B0000';
        this.container.background = 'rgba(40, 20, 20, 0.9)';
        this.container.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.container.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        this.container.top = '50px';
        this.container.isVisible = false;
        this.advancedTexture.addControl(this.container);
        
        // 标题面板
        const titlePanel = new GUI.StackPanel('titlePanel');
        titlePanel.isVertical = false;
        titlePanel.height = '35px';
        titlePanel.top = '-75px';
        this.container.addControl(titlePanel);
        
        const title = new GUI.TextBlock('arenaTitle', '⚔️ 战场');
        title.width = '100px';
        title.color = '#FF6B6B';
        title.fontSize = 18;
        title.fontFamily = 'SimHei';
        titlePanel.addControl(title);
        
        this.maxSlotsText = new GUI.TextBlock('maxSlots', '(0/3)');
        this.maxSlotsText.width = '80px';
        this.maxSlotsText.color = '#888';
        this.maxSlotsText.fontSize = 14;
        titlePanel.addControl(this.maxSlotsText);
        
        // 提示文字
        const hintText = new GUI.TextBlock('hint', '点击槽位部署 | 右键召回');
        hintText.height = '20px';
        hintText.color = '#666';
        hintText.fontSize = 12;
        hintText.top = '-50px';
        this.container.addControl(hintText);
        
        // 创建槽位容器
        this.slotsContainer = new GUI.StackPanel('slotsContainer');
        this.slotsContainer.isVertical = false;
        this.slotsContainer.height = `${this.SLOT_HEIGHT + 10}px`;
        this.slotsContainer.top = '20px';
        this.container.addControl(this.slotsContainer);
        
        // 创建5个槽位
        for (let i = 0; i < 5; i++) {
            this.createSlotPanel(i);
        }
    }
    
    /** 创建单个槽位面板 */
    private createSlotPanel(index: number): void {
        const slot = new GUI.Rectangle(`arenaSlot_${index}`);
        slot.width = `${this.SLOT_WIDTH}px`;
        slot.height = `${this.SLOT_HEIGHT}px`;
        slot.cornerRadius = 8;
        slot.thickness = 2;
        slot.color = '#555';
        slot.background = 'rgba(60, 40, 40, 0.8)';
        slot.paddingLeft = '8px';
        slot.paddingRight = '8px';
        this.slotsContainer.addControl(slot);
        this.slotPanels.push(slot);
        
        // 槽位编号
        const numText = new GUI.TextBlock(`num_${index}`, `${index + 1}`);
        numText.color = '#444';
        numText.fontSize = 40;
        numText.alpha = 0.3;
        slot.addControl(numText);
        
        // 左键点击 - 部署或选中
        slot.onPointerClickObservable.add((info) => {
            if (info.buttonIndex === 0) { // 左键
                if (this.selectedSlot !== null && this.selectedSlot !== index) {
                    // 换位
                    this.events.onSwap?.(this.selectedSlot, index);
                    this.setSelectedSlot(null);
                } else {
                    this.events.onSlotClick?.(index);
                }
            } else if (info.buttonIndex === 2) { // 右键
                this.events.onRecall?.(index);
            }
        });
        
        // 悬停效果
        slot.onPointerEnterObservable.add(() => {
            if (index < this.maxSlots) {
                slot.background = 'rgba(80, 60, 60, 0.9)';
            }
        });
        
        slot.onPointerOutObservable.add(() => {
            const isLocked = index >= this.maxSlots;
            slot.background = isLocked 
                ? 'rgba(30, 30, 30, 0.5)' 
                : 'rgba(60, 40, 40, 0.8)';
        });
    }
    
    // =========================================================================
    // 公共方法
    // =========================================================================
    
    /** 设置事件监听 */
    public setEvents(events: ClTavernArenaEvents): void {
        this.events = events;
    }
    
    /** 显示/隐藏 */
    public setVisible(visible: boolean): void {
        this.isVisible = visible;
        this.container.isVisible = visible;
    }
    
    /** 设置最大槽位数 */
    public setMaxSlots(max: number): void {
        this.maxSlots = max;
        this.updateSlotStates();
    }
    
    /** 更新战场槽位 */
    public updateSlots(slots: ClArenaSlot[]): void {
        this.currentSlots = slots;
        
        let occupiedCount = 0;
        
        for (let i = 0; i < 5; i++) {
            const slot = slots.find(s => s.index === i);
            const panel = this.slotPanels[i];
            
            if (!panel) continue;
            
            // 清除现有内容 (保留编号)
            const children = panel.children.slice();
            for (const child of children) {
                if (child.name?.startsWith('monster_')) {
                    panel.removeControl(child);
                }
            }
            
            const isLocked = i >= this.maxSlots;
            
            if (slot?.monster) {
                occupiedCount++;
                const m = slot.monster;
                
                // 怪兽名称
                const nameText = new GUI.TextBlock(`monster_name_${i}`, m.name);
                nameText.color = m.golden_level > 0 ? '#FFD700' : '#FFF';
                nameText.fontSize = 13;
                nameText.top = '-45px';
                nameText.textWrapping = true;
                panel.addControl(nameText);
                
                // 星级
                const starText = new GUI.TextBlock(`monster_star_${i}`, '⭐'.repeat(m.star));
                starText.color = '#FFD700';
                starText.fontSize = 11;
                starText.top = '-25px';
                panel.addControl(starText);
                
                // 属性
                const statsText = new GUI.TextBlock(`monster_stats_${i}`, `⚔${m.atk} 🛡${m.def}`);
                statsText.color = '#CCC';
                statsText.fontSize = 12;
                statsText.top = '-5px';
                panel.addControl(statsText);
                
                // HP
                const hpText = new GUI.TextBlock(`monster_hp_${i}`, `❤${m.hp}`);
                hpText.color = '#FF6B6B';
                hpText.fontSize = 12;
                hpText.top = '15px';
                panel.addControl(hpText);
                
                // 召回按钮
                const recallBtn = GUI.Button.CreateSimpleButton(`recall_${i}`, '↩');
                recallBtn.width = '28px';
                recallBtn.height = '28px';
                recallBtn.cornerRadius = 14;
                recallBtn.thickness = 1;
                recallBtn.color = '#FFF';
                recallBtn.background = '#666';
                recallBtn.fontSize = 14;
                recallBtn.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
                recallBtn.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
                recallBtn.top = '5px';
                recallBtn.left = '-5px';
                recallBtn.onPointerClickObservable.add(() => {
                    this.events.onRecall?.(i);
                });
                panel.addControl(recallBtn);
                
                panel.color = m.golden_level > 0 ? '#FFD700' : '#8B0000';
                panel.background = m.golden_level > 0 
                    ? 'rgba(255, 215, 0, 0.15)' 
                    : 'rgba(60, 40, 40, 0.8)';
            } else {
                // 空槽位
                panel.color = isLocked ? '#333' : '#555';
                panel.background = isLocked 
                    ? 'rgba(30, 30, 30, 0.5)' 
                    : 'rgba(60, 40, 40, 0.8)';
            }
            
            // 锁定状态
            if (isLocked) {
                let lockText = panel.children.find(c => c.name === `lock_${i}`) as GUI.TextBlock;
                if (!lockText) {
                    lockText = new GUI.TextBlock(`lock_${i}`, '🔒');
                    lockText.fontSize = 24;
                    lockText.top = '40px';
                    panel.addControl(lockText);
                }
            } else {
                const lockText = panel.children.find(c => c.name === `lock_${i}`);
                if (lockText) {
                    panel.removeControl(lockText);
                }
            }
        }
        
        this.maxSlotsText.text = `(${occupiedCount}/${this.maxSlots})`;
    }
    
    /** 设置选中的槽位 (用于换位) */
    public setSelectedSlot(slotIndex: number | null): void {
        // 取消之前的选中
        if (this.selectedSlot !== null) {
            const prevPanel = this.slotPanels[this.selectedSlot];
            if (prevPanel) {
                prevPanel.thickness = 2;
            }
        }
        
        this.selectedSlot = slotIndex;
        
        // 设置新选中
        if (slotIndex !== null) {
            const panel = this.slotPanels[slotIndex];
            if (panel) {
                panel.thickness = 4;
                panel.color = '#4CAF50';
            }
        }
    }
    
    /** 销毁 */
    public dispose(): void {
        this.advancedTexture.dispose();
    }
    
    // =========================================================================
    // 私有方法
    // =========================================================================
    
    /** 更新槽位状态 */
    private updateSlotStates(): void {
        for (let i = 0; i < 5; i++) {
            const panel = this.slotPanels[i];
            const isLocked = i >= this.maxSlots;
            
            panel.isEnabled = !isLocked;
            panel.alpha = isLocked ? 0.5 : 1;
        }
    }
}
