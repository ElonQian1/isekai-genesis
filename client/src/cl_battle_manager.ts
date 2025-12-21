/**
 * 战斗管理器 - 连接 WASM 和 3D 渲染
 * 
 * 模块: client
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import { GwBattle } from 'game-wasm';
import { cl_initWasm, cl_isWasmReady } from './cl_wasm';

// =============================================================================
// 类型定义 (从 WASM 获取的数据结构)
// =============================================================================

export interface ClCardData {
    id: string;
    name: string;
    cost: number;
    description: string;
    card_type: 'attack' | 'skill' | 'power';
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    damage?: number;
    block?: number;
    effects?: ClEffectData[];
}

export interface ClEffectData {
    effect_type: string;
    value: number;
    duration?: number;
}

export interface ClPlayerData {
    id: string;
    name: string;
    health: number;
    max_health: number;
    energy: number;
    max_energy: number;
    block: number;
    hand: ClCardData[];
    deck_count: number;
    discard_count: number;
}

export interface ClBattleState {
    battle_id: string;
    turn: number;
    current_player_index: number;
    phase: 'waiting' | 'playing' | 'finished';
    players: ClPlayerData[];
    winner_id?: string;
}

export interface ClPlayCardResult {
    success: boolean;
    damage_dealt?: number;
    block_gained?: number;
    effects_applied?: string[];
    error?: string;
}

// =============================================================================
// 战斗管理器
// =============================================================================

export class ClBattleManager {
    private battle: GwBattle | null = null;
    private state: ClBattleState | null = null;
    
    // 事件回调
    public onStateUpdate: ((state: ClBattleState) => void) | null = null;
    public onCardPlayed: ((result: ClPlayCardResult, cardId: string, targetId: string) => void) | null = null;
    public onTurnChange: ((playerId: string, turn: number) => void) | null = null;
    public onBattleEnd: ((winnerId: string | null) => void) | null = null;

    /**
     * 初始化战斗管理器
     */
    async init(): Promise<void> {
        if (!cl_isWasmReady()) {
            await cl_initWasm();
        }
    }

    /**
     * 创建新战斗
     */
    createBattle(battleId: string): void {
        this.battle = new GwBattle(battleId);
        console.log(`🎮 创建战斗: ${battleId}`);
    }

    /**
     * 添加玩家
     */
    addPlayer(playerId: string, playerName: string): boolean {
        if (!this.battle) {
            console.error('战斗未创建');
            return false;
        }
        
        const success = this.battle.add_player(playerId, playerName);
        if (success) {
            console.log(`👤 玩家加入: ${playerName}`);
        }
        return success;
    }

    /**
     * 开始战斗
     */
    startBattle(): boolean {
        if (!this.battle) {
            console.error('战斗未创建');
            return false;
        }
        
        const success = this.battle.start();
        if (success) {
            this.refreshState();
            console.log('⚔️ 战斗开始!');
        }
        return success;
    }

    /**
     * 出牌
     */
    playCard(playerId: string, cardId: string, targetId: string): ClPlayCardResult {
        if (!this.battle) {
            return { success: false, error: '战斗未创建' };
        }

        try {
            const resultJson = this.battle.play_card(playerId, cardId, targetId);
            const result: ClPlayCardResult = JSON.parse(resultJson);
            
            // 刷新状态
            this.refreshState();
            
            // 触发回调
            this.onCardPlayed?.(result, cardId, targetId);
            
            // 检查战斗是否结束
            if (this.battle.is_ended) {
                this.onBattleEnd?.(this.battle.winner_id ?? null);
            }
            
            return result;
        } catch (e) {
            const error = e instanceof Error ? e.message : String(e);
            return { success: false, error };
        }
    }

    /**
     * 结束回合
     */
    endTurn(playerId: string): boolean {
        if (!this.battle) {
            console.error('战斗未创建');
            return false;
        }

        try {
            this.battle.end_turn(playerId);
            this.refreshState();
            
            // 触发回合变更回调
            if (this.state) {
                const currentPlayer = this.state.players[this.state.current_player_index];
                this.onTurnChange?.(currentPlayer?.id ?? '', this.state.turn);
            }
            
            return true;
        } catch (e) {
            console.error('结束回合失败:', e);
            return false;
        }
    }

    /**
     * 刷新战斗状态
     */
    refreshState(): void {
        if (!this.battle) return;

        try {
            const stateJson = this.battle.get_state_json();
            this.state = JSON.parse(stateJson);
            
            // 触发状态更新回调
            if (this.state) {
                this.onStateUpdate?.(this.state);
            }
        } catch (e) {
            console.error('刷新状态失败:', e);
        }
    }

    /**
     * 获取当前状态
     */
    getState(): ClBattleState | null {
        return this.state;
    }

    /**
     * 获取当前玩家
     */
    getCurrentPlayer(): ClPlayerData | null {
        if (!this.state) return null;
        return this.state.players[this.state.current_player_index] ?? null;
    }

    /**
     * 获取指定玩家
     */
    getPlayer(playerId: string): ClPlayerData | null {
        if (!this.state) return null;
        return this.state.players.find(p => p.id === playerId) ?? null;
    }

    /**
     * 是否轮到指定玩家
     */
    isPlayerTurn(playerId: string): boolean {
        const current = this.getCurrentPlayer();
        return current?.id === playerId;
    }

    /**
     * 战斗是否已结束
     */
    isEnded(): boolean {
        return this.battle?.is_ended ?? false;
    }

    /**
     * 获取获胜者
     */
    getWinnerId(): string | null {
        return this.battle?.winner_id ?? null;
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.battle = null;
        this.state = null;
    }
}

// 全局单例
let battleManagerInstance: ClBattleManager | null = null;

/**
 * 获取战斗管理器单例
 */
export function cl_getBattleManager(): ClBattleManager {
    if (!battleManagerInstance) {
        battleManagerInstance = new ClBattleManager();
    }
    return battleManagerInstance;
}
