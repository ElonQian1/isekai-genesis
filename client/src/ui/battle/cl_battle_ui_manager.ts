/**
 * 战斗 UI 管理器
 * 
 * 模块: client/ui/battle
 * 前缀: Cl
 * 职责: 协调所有战斗 UI 组件
 */

import { Scene } from '@babylonjs/core';
import { AdvancedDynamicTexture } from '@babylonjs/gui';

import { ClPlayerInfoPanel } from './cl_player_info_panel';
import { ClTurnIndicator } from './cl_turn_indicator';
import { ClEndTurnButton } from './cl_end_turn_button';
import type { ClBattleStateData } from './cl_battle_ui_types';

// 导入外部 UI 组件 (保持向后兼容)
import { ClCardPoolUI } from '../cl_card_pool_ui';
import { ClBattlefieldUI } from '../cl_battlefield_ui';
import type { ClWasmCard, ClWasmBattlefield } from '../../cl_wasm';

// =============================================================================
// 事件接口
// =============================================================================

export interface ClBattleUIEvents {
    onEndTurn?: () => void;
    onAcquireCard?: (cardId: string) => void;
    onRefreshPool?: () => void;
    onDeployCard?: (cardId: string, slotIndex: number) => void;
    onSlotClick?: (slotIndex: number) => void;
}

// =============================================================================
// 战斗 UI 管理器
// =============================================================================

export class ClBattleUIManager {
    private gui: AdvancedDynamicTexture;
    private playerPanel: ClPlayerInfoPanel;
    private opponentPanel: ClPlayerInfoPanel;
    private turnIndicator: ClTurnIndicator;
    private endTurnButton: ClEndTurnButton;
    
    // 外部 UI 组件
    private cardPoolUI: ClCardPoolUI | null = null;
    private battlefieldUI: ClBattlefieldUI | null = null;
    
    // 事件
    private events: ClBattleUIEvents = {};

    constructor(scene: Scene) {
        // 创建全屏 GUI
        this.gui = AdvancedDynamicTexture.CreateFullscreenUI('battleUI', true, scene);
        
        // 创建 UI 组件
        this.playerPanel = new ClPlayerInfoPanel(this.gui, false);
        this.opponentPanel = new ClPlayerInfoPanel(this.gui, true);
        this.turnIndicator = new ClTurnIndicator(this.gui);
        this.endTurnButton = new ClEndTurnButton(this.gui);
        
        // 初始化卡池和战场 UI
        this.cardPoolUI = new ClCardPoolUI(scene);
        this.battlefieldUI = new ClBattlefieldUI(scene);
        
        // 绑定事件
        this.bindEvents();
    }
    
    /**
     * 绑定内部事件到外部事件
     */
    private bindEvents(): void {
        // 结束回合按钮
        this.endTurnButton.onClick = () => {
            this.events.onEndTurn?.();
        };
        
        // 卡池事件
        if (this.cardPoolUI) {
            this.cardPoolUI.setEvents({
                onAcquireCard: (cardId) => {
                    this.events.onAcquireCard?.(cardId);
                },
                onRefreshPool: () => {
                    this.events.onRefreshPool?.();
                }
            });
        }
        
        // 战场事件
        if (this.battlefieldUI) {
            this.battlefieldUI.setEvents({
                onSlotClick: (slotIndex) => {
                    this.events.onSlotClick?.(slotIndex);
                },
                onCardDrop: (cardId, slotIndex) => {
                    this.events.onDeployCard?.(cardId, slotIndex);
                }
            });
        }
    }
    
    /**
     * 设置事件回调
     */
    setEvents(events: ClBattleUIEvents): void {
        this.events = { ...this.events, ...events };
    }

    /**
     * 更新战斗状态
     */
    updateBattleState(state: ClBattleStateData, localPlayerId: string): void {
        // 找到本地玩家和对手
        const localPlayer = state.players.find(p => p.id === localPlayerId);
        const opponent = state.players.find(p => p.id !== localPlayerId);
        
        if (localPlayer) {
            this.playerPanel.update(localPlayer);
            this.playerPanel.setHighlight(
                state.players[state.current_player_index]?.id === localPlayerId
            );
        }
        
        if (opponent) {
            this.opponentPanel.update(opponent);
            this.opponentPanel.setHighlight(
                state.players[state.current_player_index]?.id === opponent.id
            );
        }
        
        // 更新回合指示器
        const isPlayerTurn = state.players[state.current_player_index]?.id === localPlayerId;
        this.turnIndicator.update(state.turn, isPlayerTurn);
        
        // 更新结束回合按钮
        this.endTurnButton.setEnabled(isPlayerTurn && state.phase === 'Playing');
    }
    
    /**
     * 更新卡池显示
     */
    updateCardPool(
        cards: ClWasmCard[], 
        actionPoints: number, 
        maxActionPoints: number, 
        drawPile: number, 
        discardPile: number
    ): void {
        if (this.cardPoolUI) {
            this.cardPoolUI.updateDisplay(cards);
            this.cardPoolUI.updateActionPoints(actionPoints, maxActionPoints);
            this.cardPoolUI.updatePoolCount(drawPile, discardPile);
        }
    }
    
    /**
     * 显示/隐藏卡池
     */
    setCardPoolVisible(visible: boolean): void {
        if (visible) {
            this.cardPoolUI?.show();
        } else {
            this.cardPoolUI?.hide();
        }
    }
    
    /**
     * 更新战场显示
     */
    updateBattlefields(
        playerBattlefield: ClWasmBattlefield, 
        opponentBattlefield: ClWasmBattlefield
    ): void {
        this.battlefieldUI?.updatePlayerBattlefield(playerBattlefield);
        this.battlefieldUI?.updateOpponentBattlefield(opponentBattlefield);
    }
    
    /**
     * 高亮可部署槽位
     */
    highlightDeployableSlots(): void {
        this.battlefieldUI?.highlightEmptySlots(true);
    }
    
    /**
     * 清除槽位高亮
     */
    clearSlotHighlights(): void {
        this.battlefieldUI?.highlightEmptySlots(false);
    }

    /**
     * 设置结束回合回调 (保留向后兼容)
     */
    setEndTurnCallback(callback: () => void): void {
        this.events.onEndTurn = callback;
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.playerPanel.dispose();
        this.opponentPanel.dispose();
        this.turnIndicator.dispose();
        this.endTurnButton.dispose();
        this.cardPoolUI?.dispose();
        this.battlefieldUI?.dispose();
        this.gui.dispose();
    }
}
