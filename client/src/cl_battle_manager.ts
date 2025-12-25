/**
 * 战斗管理器 - 连接 WASM 和 3D 渲染
 * 
 * 模块: client
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import { GwBattle } from 'game-wasm';
import { 
    cl_initWasm, 
    cl_isWasmReady, 
    ClWasmBattleState,
    ClWasmPlayer,
    ClWasmCard,
    ClWasmPlayCardResult,
} from './cl_wasm';

// =============================================================================
// 类型别名 - 使用 WASM 类型
// =============================================================================

export type ClCardData = ClWasmCard;
export type ClPlayerData = ClWasmPlayer;
export type ClBattleState = ClWasmBattleState;
export type ClPlayCardResult = ClWasmPlayCardResult;

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
            return { 
                success: false, 
                error: '战斗未创建',
                damage_dealt: 0,
                effects_triggered: [],
                target_killed: false,
            };
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
            return { 
                success: false, 
                error,
                damage_dealt: 0,
                effects_triggered: [],
                target_killed: false,
            };
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
    
    // =========================================================================
    // 公共卡池相关
    // =========================================================================
    
    /**
     * 获取公共卡池展示区
     */
    getPoolDisplay(): ClCardData[] {
        if (!this.battle) return [];
        
        try {
            const displayJson = this.battle.get_pool_display_json();
            return JSON.parse(displayJson);
        } catch (e) {
            console.error('获取卡池失败:', e);
            return [];
        }
    }
    
    /**
     * 从卡池获取卡牌
     */
    acquireCard(playerId: string, cardId: string): { success: boolean; card?: ClCardData; error?: string } {
        if (!this.battle) {
            return { success: false, error: '战斗未创建' };
        }
        
        try {
            const cardJson = this.battle.acquire_card(playerId, cardId);
            const card: ClCardData = JSON.parse(cardJson);
            
            // 刷新状态
            this.refreshState();
            
            return { success: true, card };
        } catch (e) {
            const error = e instanceof Error ? e.message : String(e);
            return { success: false, error };
        }
    }
    
    /**
     * 刷新卡池
     */
    refreshPool(playerId: string): { success: boolean; error?: string } {
        if (!this.battle) {
            return { success: false, error: '战斗未创建' };
        }
        
        try {
            this.battle.refresh_pool(playerId);
            
            // 刷新状态
            this.refreshState();
            
            return { success: true };
        } catch (e) {
            const error = e instanceof Error ? e.message : String(e);
            return { success: false, error };
        }
    }
    
    /**
     * 获取玩家行动力
     */
    getActionPoints(playerId: string): number {
        if (!this.battle) return 0;
        return this.battle.get_action_points(playerId);
    }
    
    /**
     * 获取卡池统计
     */
    getPoolStats(): { drawPile: number; discardPile: number } {
        if (!this.battle) {
            return { drawPile: 0, discardPile: 0 };
        }
        
        return {
            drawPile: this.battle.get_pool_draw_count(),
            discardPile: this.battle.get_pool_discard_count(),
        };
    }
    
    // =========================================================================
    // 战场部署相关
    // =========================================================================
    
    /**
     * 部署卡牌到战场
     */
    deployCard(playerId: string, cardId: string, slotIndex: number): { success: boolean; error?: string } {
        if (!this.battle) {
            return { success: false, error: '战斗未创建' };
        }
        
        try {
            this.battle.deploy_card(playerId, cardId, slotIndex);
            
            // 刷新状态
            this.refreshState();
            
            return { success: true };
        } catch (e) {
            const error = e instanceof Error ? e.message : String(e);
            return { success: false, error };
        }
    }
    
    /**
     * 获取玩家战场状态
     */
    getBattlefield(playerId: string): import('./cl_wasm').ClWasmBattlefield | null {
        if (!this.battle) return null;
        
        try {
            const bfJson = this.battle.get_battlefield_json(playerId);
            return JSON.parse(bfJson);
        } catch (e) {
            console.error('获取战场失败:', e);
            return null;
        }
    }
    
    /**
     * 获取玩家战场空闲槽位
     */
    getEmptySlots(playerId: string): number[] {
        if (!this.battle) return [];
        
        try {
            return this.battle.get_empty_slots(playerId) as number[];
        } catch (e) {
            console.error('获取空闲槽位失败:', e);
            return [];
        }
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
