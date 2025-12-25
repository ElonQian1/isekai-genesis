/**
 * 战场部署 UI
 * 
 * 模块: client
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 显示 5 槽位战场，允许玩家部署和管理卡牌
 */

import * as BABYLON from '@babylonjs/core';
import * as GUI from '@babylonjs/gui';
import type { ClWasmBattlefield, ClWasmBattlefieldSlot } from '../cl_wasm';

// =============================================================================
// 类型定义
// =============================================================================

/** 战场 UI 事件 */
export interface ClBattlefieldEvents {
    /** 点击槽位 (用于部署或选择攻击源) */
    onSlotClick?: (slotIndex: number, slot: ClWasmBattlefieldSlot) => void;
    /** 拖拽卡牌到槽位 */
    onCardDrop?: (cardId: string, slotIndex: number) => void;
}

// =============================================================================
// 战场 UI 类
// =============================================================================

export class ClBattlefieldUI {
    private advancedTexture: GUI.AdvancedDynamicTexture;
    private playerContainer: GUI.Rectangle;
    private opponentContainer: GUI.Rectangle;
    private playerSlots: GUI.Button[] = [];
    private opponentSlots: GUI.Button[] = [];
    
    private events: ClBattlefieldEvents = {};
    
    // 配置
    private readonly SLOT_SIZE = 100;
    private readonly SLOT_SPACING = 15;
    private readonly SLOT_COUNT = 5;

    constructor(scene: BABYLON.Scene) {
        this.advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI('BattlefieldUI', true, scene);
        
        // 创建对手战场容器 (上方)
        this.opponentContainer = this.createBattlefieldContainer('opponentBattlefield', -150);
        this.advancedTexture.addControl(this.opponentContainer);
        
        // 创建玩家战场容器 (下方)
        this.playerContainer = this.createBattlefieldContainer('playerBattlefield', 150);
        this.advancedTexture.addControl(this.playerContainer);
        
        // 创建槽位
        this.createSlots();
    }
    
    // =========================================================================
    // 创建 UI 元素
    // =========================================================================
    
    private createBattlefieldContainer(name: string, topOffset: number): GUI.Rectangle {
        const container = new GUI.Rectangle(name);
        container.width = `${(this.SLOT_SIZE + this.SLOT_SPACING) * this.SLOT_COUNT + 20}px`;
        container.height = `${this.SLOT_SIZE + 40}px`;
        container.cornerRadius = 10;
        container.thickness = 2;
        container.color = '#4a4a4a';
        container.background = 'rgba(30, 30, 30, 0.7)';
        container.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        container.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        container.top = `${topOffset}px`;
        return container;
    }
    
    private createSlots(): void {
        // 玩家槽位
        for (let i = 0; i < this.SLOT_COUNT; i++) {
            const slot = this.createSlotButton(i, true);
            this.playerContainer.addControl(slot);
            this.playerSlots.push(slot);
        }
        
        // 对手槽位
        for (let i = 0; i < this.SLOT_COUNT; i++) {
            const slot = this.createSlotButton(i, false);
            this.opponentContainer.addControl(slot);
            this.opponentSlots.push(slot);
        }
    }
    
    private createSlotButton(index: number, isPlayer: boolean): GUI.Button {
        const btn = GUI.Button.CreateSimpleButton(
            `slot_${isPlayer ? 'player' : 'opponent'}_${index}`,
            ''
        );
        
        // 计算位置 (居中排列)
        const totalWidth = (this.SLOT_SIZE + this.SLOT_SPACING) * this.SLOT_COUNT - this.SLOT_SPACING;
        const startX = -totalWidth / 2 + this.SLOT_SIZE / 2;
        const x = startX + index * (this.SLOT_SIZE + this.SLOT_SPACING);
        
        btn.width = `${this.SLOT_SIZE}px`;
        btn.height = `${this.SLOT_SIZE}px`;
        btn.left = `${x}px`;
        btn.cornerRadius = 8;
        btn.thickness = 2;
        btn.color = isPlayer ? '#4CAF50' : '#F44336';
        btn.background = 'rgba(50, 50, 50, 0.8)';
        btn.hoverCursor = 'pointer';
        
        // 槽位号码
        const indexText = new GUI.TextBlock('indexText', `${index + 1}`);
        indexText.color = 'rgba(255,255,255,0.3)';
        indexText.fontSize = 40;
        indexText.fontFamily = 'Arial';
        btn.addControl(indexText);
        
        // 悬停效果
        btn.onPointerEnterObservable.add(() => {
            btn.thickness = 4;
            btn.background = 'rgba(70, 70, 70, 0.9)';
        });
        
        btn.onPointerOutObservable.add(() => {
            btn.thickness = 2;
            btn.background = 'rgba(50, 50, 50, 0.8)';
        });
        
        // 点击事件 (只对玩家槽位生效)
        if (isPlayer) {
            btn.onPointerClickObservable.add(() => {
                const slotData = this.getSlotData(index, true);
                if (slotData && this.events.onSlotClick) {
                    this.events.onSlotClick(index, slotData);
                }
            });
        }
        
        return btn;
    }
    
    private getSlotData(index: number, _isPlayer: boolean): ClWasmBattlefieldSlot {
        // 返回空槽位数据作为默认值
        return {
            index,
            card: null,
            can_attack: false,
            remaining_hp: 0,
        };
    }
    
    // =========================================================================
    // 更新显示
    // =========================================================================
    
    /**
     * 更新玩家战场
     */
    public updatePlayerBattlefield(battlefield: ClWasmBattlefield): void {
        for (let i = 0; i < this.SLOT_COUNT; i++) {
            const slot = battlefield.slots[i];
            const btn = this.playerSlots[i];
            if (slot && btn) {
                this.updateSlotDisplay(btn, slot, true);
            }
        }
    }
    
    /**
     * 更新对手战场
     */
    public updateOpponentBattlefield(battlefield: ClWasmBattlefield): void {
        for (let i = 0; i < this.SLOT_COUNT; i++) {
            const slot = battlefield.slots[i];
            const btn = this.opponentSlots[i];
            if (slot && btn) {
                this.updateSlotDisplay(btn, slot, false);
            }
        }
    }
    
    private updateSlotDisplay(btn: GUI.Button, slot: ClWasmBattlefieldSlot, isPlayer: boolean): void {
        // 清空现有内容
        btn.children.slice().forEach(child => btn.removeControl(child));
        
        if (slot.card) {
            // 显示卡牌
            const card = slot.card;
            
            // 根据卡牌类型设置背景色
            btn.background = this.getCardBackground(card.card_type, isPlayer);
            
            // 卡牌名称
            const nameText = new GUI.TextBlock('name', card.name);
            nameText.color = 'white';
            nameText.fontSize = 12;
            nameText.fontFamily = 'SimHei';
            nameText.top = '-30px';
            btn.addControl(nameText);
            
            // 类型图标
            const icon = this.getCardIcon(card.card_type);
            const iconText = new GUI.TextBlock('icon', icon);
            iconText.fontSize = 28;
            iconText.top = '-5px';
            btn.addControl(iconText);
            
            // HP 显示
            const hpText = new GUI.TextBlock('hp', `❤️ ${slot.remaining_hp}`);
            hpText.color = '#FF6B6B';
            hpText.fontSize = 14;
            hpText.top = '25px';
            btn.addControl(hpText);
            
            // 攻击力显示
            const atkText = new GUI.TextBlock('atk', `⚔️ ${card.base_damage}`);
            atkText.color = '#FFD700';
            atkText.fontSize = 12;
            atkText.top = '40px';
            btn.addControl(atkText);
            
            // 可攻击指示器
            if (slot.can_attack && isPlayer) {
                btn.color = '#FFFF00';
                btn.thickness = 3;
            } else {
                btn.color = isPlayer ? '#4CAF50' : '#F44336';
                btn.thickness = 2;
            }
        } else {
            // 空槽位
            btn.background = 'rgba(50, 50, 50, 0.8)';
            btn.color = isPlayer ? '#4CAF50' : '#F44336';
            btn.thickness = 2;
            
            // 显示槽位号码
            const indexText = new GUI.TextBlock('indexText', `${slot.index + 1}`);
            indexText.color = 'rgba(255,255,255,0.3)';
            indexText.fontSize = 40;
            btn.addControl(indexText);
            
            // 玩家空槽位显示部署提示
            if (isPlayer) {
                const hintText = new GUI.TextBlock('hint', '拖拽部署');
                hintText.color = 'rgba(255,255,255,0.5)';
                hintText.fontSize = 10;
                hintText.top = '35px';
                btn.addControl(hintText);
            }
        }
    }
    
    private getCardBackground(cardType: string, isPlayer: boolean): string {
        const alpha = isPlayer ? '0.9' : '0.7';
        switch (cardType) {
            case 'Attack':
                return `rgba(139, 0, 0, ${alpha})`;
            case 'Defense':
                return `rgba(0, 0, 139, ${alpha})`;
            case 'Skill':
                return `rgba(0, 100, 0, ${alpha})`;
            case 'Special':
                return `rgba(139, 69, 19, ${alpha})`;
            default:
                return `rgba(50, 50, 50, ${alpha})`;
        }
    }
    
    private getCardIcon(cardType: string): string {
        switch (cardType) {
            case 'Attack': return '⚔️';
            case 'Defense': return '🛡️';
            case 'Skill': return '💚';
            case 'Special': return '✨';
            default: return '❓';
        }
    }
    
    // =========================================================================
    // 公共方法
    // =========================================================================
    
    /**
     * 设置事件回调
     */
    public setEvents(events: ClBattlefieldEvents): void {
        this.events = events;
    }
    
    /**
     * 高亮指定槽位
     */
    public highlightSlot(slotIndex: number, isPlayer: boolean, highlight: boolean): void {
        const slots = isPlayer ? this.playerSlots : this.opponentSlots;
        const btn = slots[slotIndex];
        if (!btn) return;
        
        if (highlight) {
            btn.thickness = 4;
            btn.color = '#FFFF00';
        } else {
            btn.thickness = 2;
            btn.color = isPlayer ? '#4CAF50' : '#F44336';
        }
    }
    
    /**
     * 高亮所有空槽位 (用于部署时)
     */
    public highlightEmptySlots(highlight: boolean): void {
        for (let i = 0; i < this.SLOT_COUNT; i++) {
            const btn = this.playerSlots[i];
            // 检查是否为空（通过检查背景色判断）
            if (btn.background?.includes('50, 50, 50')) {
                this.highlightSlot(i, true, highlight);
            }
        }
    }
    
    /**
     * 显示 UI
     */
    public show(): void {
        this.playerContainer.isVisible = true;
        this.opponentContainer.isVisible = true;
    }
    
    /**
     * 隐藏 UI
     */
    public hide(): void {
        this.playerContainer.isVisible = false;
        this.opponentContainer.isVisible = false;
    }
    
    /**
     * 播放部署动画
     */
    public playDeployAnimation(slotIndex: number, isPlayer: boolean): void {
        const slots = isPlayer ? this.playerSlots : this.opponentSlots;
        const btn = slots[slotIndex];
        if (!btn) return;
        
        // 简单的缩放动画
        btn.scaleX = 1.2;
        btn.scaleY = 1.2;
        
        setTimeout(() => {
            btn.scaleX = 1;
            btn.scaleY = 1;
        }, 200);
    }
    
    /**
     * 播放攻击动画
     */
    public playAttackAnimation(fromSlot: number, toSlot: number, isPlayerAttacking: boolean): void {
        const attackerSlots = isPlayerAttacking ? this.playerSlots : this.opponentSlots;
        const targetSlots = isPlayerAttacking ? this.opponentSlots : this.playerSlots;
        
        const attacker = attackerSlots[fromSlot];
        const target = targetSlots[toSlot];
        
        if (!attacker || !target) return;
        
        // 攻击者闪烁
        attacker.background = '#FFFF00';
        setTimeout(() => {
            attacker.background = this.getCardBackground('Attack', isPlayerAttacking);
        }, 200);
        
        // 目标受击效果
        setTimeout(() => {
            target.background = '#FF0000';
            setTimeout(() => {
                // 刷新显示会恢复正确颜色
            }, 200);
        }, 100);
    }
    
    /**
     * 销毁 UI
     */
    public dispose(): void {
        this.playerSlots.forEach(slot => slot.dispose());
        this.opponentSlots.forEach(slot => slot.dispose());
        this.playerContainer.dispose();
        this.opponentContainer.dispose();
        this.advancedTexture.dispose();
    }
}
