/**
 * 战斗网络服务 - 处理游戏内战斗通信
 * 
 * 模块: client/network
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责:
 * 1. 战斗状态同步
 * 2. 卡牌操作发送
 * 3. 回合管理
 * 4. 游戏结束处理
 * 
 * 设计原则:
 * - 专注战斗逻辑
 * - 与大厅服务解耦
 * - 状态机管理战斗流程
 */

import {
    ClMessageType,
    ClPlayCardRequest,
    ClGameStartedEvent,
    ClGameStateEvent,
    ClTurnStartEvent,
    ClCardPlayedEvent,
    ClTurnEndedEvent,
    ClGameEndedEvent,
    ClErrorResponse,
} from './cl_network_types';
import { ClWebSocketCore, cl_getWebSocketCore } from './cl_websocket_core';
import { ClBattleState } from '../cl_battle_manager';

// =============================================================================
// 战斗阶段
// =============================================================================

export enum ClBattlePhase {
    Idle = 'idle',               // 未开始
    Starting = 'starting',       // 开始中
    MyTurn = 'myTurn',           // 我的回合
    OpponentTurn = 'opponentTurn', // 对手回合
    Animating = 'animating',     // 播放动画中
    GameOver = 'gameOver',       // 游戏结束
}

// =============================================================================
// 事件回调
// =============================================================================

export interface ClBattleServiceCallbacks {
    // 阶段变化
    onPhaseChange?: (phase: ClBattlePhase) => void;
    
    // 游戏事件
    onGameStart?: (state: ClBattleState) => void;
    onStateUpdate?: (state: ClBattleState) => void;
    onTurnStart?: (playerId: string, isMyTurn: boolean) => void;
    onCardPlayed?: (playerId: string, cardId: string, isMyCard: boolean) => void;
    onTurnEnd?: (playerId: string) => void;
    onGameEnd?: (winnerId: string | null, isWinner: boolean) => void;
    
    // 错误
    onError?: (code: string, message: string) => void;
}

// =============================================================================
// 战斗网络服务
// =============================================================================

export class ClBattleService {
    private wsCore: ClWebSocketCore;
    private phase: ClBattlePhase = ClBattlePhase.Idle;
    private callbacks: ClBattleServiceCallbacks = {};
    
    // 玩家信息（从大厅服务获取）
    private localPlayerId: string = '';
    
    // 战斗状态
    private battleState: ClBattleState | null = null;
    private turnNumber: number = 0;

    constructor(wsCore?: ClWebSocketCore) {
        this.wsCore = wsCore || cl_getWebSocketCore();
        this.setupMessageHandlers();
    }

    // =========================================================================
    // 公共 API - 初始化
    // =========================================================================

    /**
     * 设置本地玩家 ID（从大厅服务获取）
     */
    setLocalPlayerId(playerId: string): void {
        this.localPlayerId = playerId;
    }

    /**
     * 准备开始战斗
     */
    prepare(): void {
        this.setPhase(ClBattlePhase.Starting);
    }

    // =========================================================================
    // 公共 API - 游戏操作
    // =========================================================================

    /**
     * 出牌
     */
    playCard(cardId: string, targetId?: string, targetPosition?: number): boolean {
        if (this.phase !== ClBattlePhase.MyTurn) {
            console.error('❌ 不是你的回合');
            return false;
        }
        
        const request: ClPlayCardRequest = {
            card_id: cardId,
            target_id: targetId,
            target_position: targetPosition,
        };
        
        // 进入动画状态，等待服务器确认
        this.setPhase(ClBattlePhase.Animating);
        return this.wsCore.send(ClMessageType.PlayCard, request);
    }

    /**
     * 结束回合
     */
    endTurn(): boolean {
        if (this.phase !== ClBattlePhase.MyTurn) {
            console.error('❌ 不是你的回合');
            return false;
        }
        
        return this.wsCore.send(ClMessageType.EndTurn);
    }

    /**
     * 投降
     */
    surrender(): boolean {
        if (this.phase === ClBattlePhase.Idle || this.phase === ClBattlePhase.GameOver) {
            console.error('❌ 不在游戏中');
            return false;
        }
        
        this.setPhase(ClBattlePhase.GameOver);
        return this.wsCore.send(ClMessageType.Surrender);
    }

    // =========================================================================
    // 公共 API - 状态查询
    // =========================================================================

    /**
     * 获取当前阶段
     */
    getPhase(): ClBattlePhase {
        return this.phase;
    }

    /**
     * 获取战斗状态
     */
    getBattleState(): ClBattleState | null {
        return this.battleState;
    }

    /**
     * 是否是我的回合
     */
    isMyTurn(): boolean {
        return this.phase === ClBattlePhase.MyTurn;
    }

    /**
     * 获取当前回合玩家 ID
     */
    getCurrentPlayerId(): string | null {
        if (!this.battleState) return null;
        const currentPlayer = this.battleState.players[this.battleState.current_player_index];
        return currentPlayer?.id ?? null;
    }

    /**
     * 获取本地玩家在战斗中的数据
     */
    getLocalPlayer(): unknown | null {
        if (!this.battleState) return null;
        return this.battleState.players.find(p => p.id === this.localPlayerId);
    }

    /**
     * 获取对手在战斗中的数据
     */
    getOpponentPlayer(): unknown | null {
        if (!this.battleState) return null;
        return this.battleState.players.find(p => p.id !== this.localPlayerId);
    }

    /**
     * 获取回合数
     */
    getTurnNumber(): number {
        return this.turnNumber;
    }

    // =========================================================================
    // 回调设置
    // =========================================================================

    /**
     * 设置回调
     */
    setCallbacks(callbacks: ClBattleServiceCallbacks): void {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    // =========================================================================
    // 私有方法 - 消息处理
    // =========================================================================

    private setupMessageHandlers(): void {
        // 游戏开始
        this.wsCore.on<ClGameStartedEvent>(ClMessageType.GameStarted, (data) => {
            console.log('⚔️ 战斗开始!');
            this.battleState = JSON.parse(data.battle_state);
            this.turnNumber = 1;
            
            // 判断是谁的回合
            const isMyTurn = this.getCurrentPlayerId() === this.localPlayerId;
            this.setPhase(isMyTurn ? ClBattlePhase.MyTurn : ClBattlePhase.OpponentTurn);
            
            this.callbacks.onGameStart?.(this.battleState!);
        });

        // 状态更新
        this.wsCore.on<ClGameStateEvent>(ClMessageType.GameState, (data) => {
            this.battleState = JSON.parse(data.battle_state);
            this.callbacks.onStateUpdate?.(this.battleState!);
        });

        // 回合开始
        this.wsCore.on<ClTurnStartEvent>(ClMessageType.TurnStart, (data) => {
            console.log(`🎯 回合开始: ${data.player_id}`);
            this.turnNumber = data.turn_number;
            
            const isMyTurn = data.player_id === this.localPlayerId;
            this.setPhase(isMyTurn ? ClBattlePhase.MyTurn : ClBattlePhase.OpponentTurn);
            
            this.callbacks.onTurnStart?.(data.player_id, isMyTurn);
        });

        // 卡牌打出
        this.wsCore.on<ClCardPlayedEvent>(ClMessageType.CardPlayed, (data) => {
            console.log(`🃏 卡牌打出: ${data.card_id} by ${data.player_id}`);
            
            const isMyCard = data.player_id === this.localPlayerId;
            
            // 如果是我打的牌，恢复到我的回合状态
            if (isMyCard) {
                this.setPhase(ClBattlePhase.MyTurn);
            }
            
            this.callbacks.onCardPlayed?.(data.player_id, data.card_id, isMyCard);
        });

        // 回合结束
        this.wsCore.on<ClTurnEndedEvent>(ClMessageType.TurnEnded, (data) => {
            console.log(`⏭️ 回合结束: ${data.player_id}`);
            this.callbacks.onTurnEnd?.(data.player_id);
        });

        // 游戏结束
        this.wsCore.on<ClGameEndedEvent>(ClMessageType.GameEnded, (data) => {
            console.log(`🏆 游戏结束! 获胜者: ${data.winner_id || '平局'}`);
            this.setPhase(ClBattlePhase.GameOver);
            
            const isWinner = data.winner_id === this.localPlayerId;
            this.callbacks.onGameEnd?.(data.winner_id, isWinner);
        });

        // 错误
        this.wsCore.on<ClErrorResponse>(ClMessageType.Error, (data) => {
            console.error(`❌ 战斗错误: [${data.code}] ${data.message}`);
            
            // 如果在动画状态收到错误，恢复到我的回合
            if (this.phase === ClBattlePhase.Animating) {
                this.setPhase(ClBattlePhase.MyTurn);
            }
            
            this.callbacks.onError?.(data.code, data.message);
        });
    }

    // =========================================================================
    // 私有方法 - 状态管理
    // =========================================================================

    private setPhase(newPhase: ClBattlePhase): void {
        if (this.phase !== newPhase) {
            console.log(`⚔️ 战斗阶段: ${this.phase} -> ${newPhase}`);
            this.phase = newPhase;
            this.callbacks.onPhaseChange?.(newPhase);
        }
    }

    // =========================================================================
    // 清理
    // =========================================================================

    /**
     * 重置战斗状态
     */
    reset(): void {
        this.phase = ClBattlePhase.Idle;
        this.battleState = null;
        this.turnNumber = 0;
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.reset();
        this.callbacks = {};
    }
}

// =============================================================================
// 全局单例
// =============================================================================

let battleService: ClBattleService | null = null;

/**
 * 获取战斗服务单例
 */
export function cl_getBattleService(): ClBattleService {
    if (!battleService) {
        battleService = new ClBattleService();
    }
    return battleService;
}
