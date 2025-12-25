/**
 * 战斗交互控制器 - 处理单人/离线战斗的完整游戏逻辑
 * 
 * 模块: client
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import { 
    ClBattleManager, 
    cl_getBattleManager,
    ClBattleState,
    ClCardData,
    ClPlayerData,
    ClPlayCardResult,
} from './cl_battle_manager';
import { ClBattleAI, ClAIDifficulty, CL_AI_CONFIG } from './core/cl_battle_ai';

// 重导出 AI 难度 (保持向后兼容)
export { ClAIDifficulty } from './core/cl_battle_ai';

// =============================================================================
// 战斗阶段
// =============================================================================

export enum ClBattlePhase {
    WaitingForTurn = 'waitingForTurn',      // 等待回合
    SelectingCard = 'selectingCard',        // 选择卡牌
    SelectingTarget = 'selectingTarget',    // 选择目标
    Playing = 'playing',                    // 执行出牌
    AITurn = 'aiTurn',                      // AI 回合
    BattleEnded = 'battleEnded',           // 战斗结束
}

// =============================================================================
// 战斗事件回调
// =============================================================================

export interface ClBattleCallbacks {
    onPhaseChange: (phase: ClBattlePhase) => void;
    onStateUpdate: (state: ClBattleState) => void;
    onCardSelected: (card: ClCardData | null) => void;
    onCardPlayed: (result: ClPlayCardResult, card: ClCardData, targetId: string) => void;
    onTurnStart: (playerId: string, turn: number) => void;
    onTurnEnd: (playerId: string) => void;
    onBattleEnd: (winnerId: string | null) => void;
    onMessage: (message: string) => void;
    onPoolUpdate?: (cards: ClCardData[]) => void;
    onCardAcquired?: (card: ClCardData) => void;
    onActionPointsUpdate?: (current: number, max: number) => void;
}

// =============================================================================
// 战斗交互控制器
// =============================================================================

export class ClBattleController {
    private battleManager: ClBattleManager;
    private localPlayerId: string = '';
    private aiPlayerId: string = 'ai-opponent';
    private phase: ClBattlePhase = ClBattlePhase.WaitingForTurn;
    private selectedCard: ClCardData | null = null;
    private callbacks: Partial<ClBattleCallbacks> = {};
    
    // AI 模块
    private ai: ClBattleAI = new ClBattleAI();

    constructor() {
        this.battleManager = cl_getBattleManager();
    }

    /**
     * 初始化战斗
     */
    async init(): Promise<void> {
        await this.battleManager.init();
        
        // 设置战斗管理器回调
        this.battleManager.onStateUpdate = (state) => {
            this.callbacks.onStateUpdate?.(state);
        };
        
        this.battleManager.onCardPlayed = (result, cardId, targetId) => {
            const card = this.getCardById(cardId);
            if (card) {
                this.callbacks.onCardPlayed?.(result, card, targetId);
            }
        };
        
        this.battleManager.onBattleEnd = (winnerId) => {
            this.setPhase(ClBattlePhase.BattleEnded);
            this.callbacks.onBattleEnd?.(winnerId);
        };
    }

    /**
     * 开始新战斗
     */
    startBattle(localPlayerId: string, localPlayerName: string, aiName: string = 'AI 对手'): boolean {
        this.localPlayerId = localPlayerId;
        
        // 创建战斗
        const battleId = `battle_${Date.now()}`;
        this.battleManager.createBattle(battleId);
        
        // 添加玩家
        this.battleManager.addPlayer(localPlayerId, localPlayerName);
        this.battleManager.addPlayer(this.aiPlayerId, aiName);
        
        // 开始战斗
        const success = this.battleManager.startBattle();
        
        if (success) {
            const state = this.battleManager.getState();
            if (state) {
                this.callbacks.onStateUpdate?.(state);
                this.startTurn();
            }
        }
        
        return success;
    }

    /**
     * 设置回调
     */
    setCallbacks(callbacks: Partial<ClBattleCallbacks>): void {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * 设置 AI 难度
     */
    setAIDifficulty(difficulty: ClAIDifficulty): void {
        this.ai.setDifficulty(difficulty);
    }

    /**
     * 开始回合
     */
    private startTurn(): void {
        const state = this.battleManager.getState();
        if (!state) return;
        
        const currentPlayer = state.players[state.current_player_index];
        if (!currentPlayer) return;
        
        this.callbacks.onTurnStart?.(currentPlayer.id, state.turn);
        
        if (currentPlayer.id === this.localPlayerId) {
            // 玩家回合
            this.setPhase(ClBattlePhase.SelectingCard);
            this.callbacks.onMessage?.('你的回合 - 选择卡牌或从卡池获取');
            
            // 更新卡池和行动力显示
            this.refreshPoolDisplay();
            this.updateActionPointsDisplay();
        } else {
            // AI 回合
            this.setPhase(ClBattlePhase.AITurn);
            this.callbacks.onMessage?.('对手回合...');
            this.executeAITurn();
        }
    }

    /**
     * 选择卡牌
     */
    selectCard(cardId: string): boolean {
        if (this.phase !== ClBattlePhase.SelectingCard) {
            console.log('当前不能选择卡牌');
            return false;
        }
        
        const card = this.getCardById(cardId);
        if (!card) {
            console.log('找不到卡牌');
            return false;
        }
        
        // 检查能量是否足够
        const player = this.getLocalPlayer();
        if (!player || player.stats.energy < card.cost) {
            this.callbacks.onMessage?.('能量不足!');
            return false;
        }
        
        this.selectedCard = card;
        this.callbacks.onCardSelected?.(card);
        this.setPhase(ClBattlePhase.SelectingTarget);
        this.callbacks.onMessage?.('选择目标');
        
        return true;
    }

    /**
     * 取消选择
     */
    cancelSelection(): void {
        if (this.phase === ClBattlePhase.SelectingTarget) {
            this.selectedCard = null;
            this.callbacks.onCardSelected?.(null);
            this.setPhase(ClBattlePhase.SelectingCard);
            this.callbacks.onMessage?.('选择一张卡牌');
        }
    }

    /**
     * 选择目标并出牌
     */
    playCardToTarget(targetId: string): boolean {
        if (this.phase !== ClBattlePhase.SelectingTarget || !this.selectedCard) {
            console.log('当前不能出牌');
            return false;
        }
        
        const card = this.selectedCard;
        this.selectedCard = null;
        
        // 执行出牌
        this.setPhase(ClBattlePhase.Playing);
        const result = this.battleManager.playCard(this.localPlayerId, card.id, targetId);
        
        if (result.success) {
            this.callbacks.onCardPlayed?.(result, card, targetId);
            
            // 检查战斗是否结束
            if (this.battleManager.isEnded()) {
                this.setPhase(ClBattlePhase.BattleEnded);
                return true;
            }
            
            // 回到选牌阶段
            this.setPhase(ClBattlePhase.SelectingCard);
            this.callbacks.onMessage?.('继续选择卡牌或结束回合');
        } else {
            this.callbacks.onMessage?.(result.error || '出牌失败');
            this.setPhase(ClBattlePhase.SelectingCard);
        }
        
        return result.success;
    }

    /**
     * 快速出牌 (选择卡牌 + 选择默认目标)
     */
    quickPlayCard(cardId: string): boolean {
        if (!this.selectCard(cardId)) {
            return false;
        }
        
        // 自动选择目标 (对手)
        return this.playCardToTarget(this.aiPlayerId);
    }

    /**
     * 结束回合
     */
    endTurn(): boolean {
        if (this.phase !== ClBattlePhase.SelectingCard && 
            this.phase !== ClBattlePhase.SelectingTarget) {
            console.log('当前不能结束回合');
            return false;
        }
        
        this.selectedCard = null;
        this.callbacks.onCardSelected?.(null);
        this.callbacks.onTurnEnd?.(this.localPlayerId);
        
        const success = this.battleManager.endTurn(this.localPlayerId);
        
        if (success && !this.battleManager.isEnded()) {
            this.startTurn();
        }
        
        return success;
    }

    /**
     * 执行 AI 回合
     */
    private async executeAITurn(): Promise<void> {
        // 延迟让玩家看到 AI 在"思考"
        await ClBattleAI.delay(CL_AI_CONFIG.turnDelay);
        
        const state = this.battleManager.getState();
        if (!state || this.battleManager.isEnded()) return;
        
        const aiPlayer = state.players.find(p => p.id === this.aiPlayerId);
        if (!aiPlayer) return;
        
        // AI 决策：使用 AI 模块选择要打的牌
        const playableCards = aiPlayer.hand.filter(
            (card: ClCardData) => card.cost <= aiPlayer.stats.energy
        );
        const cardsToPlay = this.ai.selectCards(playableCards, aiPlayer.stats.energy);
        
        // 依次打出卡牌
        for (const card of cardsToPlay) {
            await ClBattleAI.delay(CL_AI_CONFIG.cardDelay);
            
            const result = this.battleManager.playCard(this.aiPlayerId, card.id, this.localPlayerId);
            
            if (result.success) {
                this.callbacks.onCardPlayed?.(result, card, this.localPlayerId);
                this.callbacks.onMessage?.(`对手使用了 ${card.name}`);
            }
            
            // 检查战斗是否结束
            if (this.battleManager.isEnded()) {
                return;
            }
        }
        
        // 结束 AI 回合
        await ClBattleAI.delay(CL_AI_CONFIG.endTurnDelay);
        this.callbacks.onTurnEnd?.(this.aiPlayerId);
        this.battleManager.endTurn(this.aiPlayerId);
        
        if (!this.battleManager.isEnded()) {
            this.startTurn();
        }
    }

    /**
     * 设置阶段
     */
    private setPhase(phase: ClBattlePhase): void {
        this.phase = phase;
        this.callbacks.onPhaseChange?.(phase);
    }

    /**
     * 获取本地玩家
     */
    getLocalPlayer(): ClPlayerData | null {
        return this.battleManager.getPlayer(this.localPlayerId);
    }

    /**
     * 获取 AI 玩家
     */
    getAIPlayer(): ClPlayerData | null {
        return this.battleManager.getPlayer(this.aiPlayerId);
    }

    /**
     * 根据 ID 获取卡牌
     */
    private getCardById(cardId: string): ClCardData | null {
        const player = this.getLocalPlayer();
        if (!player) return null;
        return player.hand.find(c => c.id === cardId) ?? null;
    }

    /**
     * 获取当前阶段
     */
    getPhase(): ClBattlePhase {
        return this.phase;
    }

    /**
     * 获取选中的卡牌
     */
    getSelectedCard(): ClCardData | null {
        return this.selectedCard;
    }

    /**
     * 获取战斗状态
     */
    getBattleState(): ClBattleState | null {
        return this.battleManager.getState();
    }
    
    // =========================================================================
    // 公共卡池相关
    // =========================================================================
    
    /**
     * 获取公共卡池展示区
     */
    getPoolDisplay(): ClCardData[] {
        return this.battleManager.getPoolDisplay();
    }
    
    /**
     * 从卡池获取卡牌
     */
    acquireCard(cardId: string): boolean {
        if (this.phase !== ClBattlePhase.SelectingCard && 
            this.phase !== ClBattlePhase.SelectingTarget) {
            this.callbacks.onMessage?.('当前不能获取卡牌');
            return false;
        }
        
        const result = this.battleManager.acquireCard(this.localPlayerId, cardId);
        
        if (result.success && result.card) {
            this.callbacks.onMessage?.(`获取了 ${result.card.name}!`);
            this.callbacks.onCardAcquired?.(result.card);
            
            // 更新行动力显示
            this.updateActionPointsDisplay();
            
            // 刷新卡池显示
            this.refreshPoolDisplay();
            
            return true;
        } else {
            this.callbacks.onMessage?.(result.error || '获取卡牌失败');
            return false;
        }
    }
    
    /**
     * 刷新卡池
     */
    refreshPool(): boolean {
        if (this.phase !== ClBattlePhase.SelectingCard && 
            this.phase !== ClBattlePhase.SelectingTarget) {
            this.callbacks.onMessage?.('当前不能刷新卡池');
            return false;
        }
        
        const result = this.battleManager.refreshPool(this.localPlayerId);
        
        if (result.success) {
            this.callbacks.onMessage?.('卡池已刷新!');
            
            // 更新行动力显示
            this.updateActionPointsDisplay();
            
            // 刷新卡池显示
            this.refreshPoolDisplay();
            
            return true;
        } else {
            this.callbacks.onMessage?.(result.error || '刷新卡池失败');
            return false;
        }
    }
    
    /**
     * 获取当前行动力
     */
    getActionPoints(): { current: number; max: number } {
        const player = this.getLocalPlayer();
        if (!player) {
            return { current: 0, max: 5 };
        }
        return {
            current: player.stats.action_points,
            max: player.stats.max_action_points,
        };
    }
    
    /**
     * 获取卡池统计
     */
    getPoolStats(): { drawPile: number; discardPile: number } {
        return this.battleManager.getPoolStats();
    }
    
    /**
     * 更新行动力显示
     */
    private updateActionPointsDisplay(): void {
        const ap = this.getActionPoints();
        this.callbacks.onActionPointsUpdate?.(ap.current, ap.max);
    }
    
    /**
     * 刷新卡池显示
     */
    private refreshPoolDisplay(): void {
        const cards = this.getPoolDisplay();
        this.callbacks.onPoolUpdate?.(cards);
    }
    
    // =========================================================================
    // 战场部署相关
    // =========================================================================
    
    /**
     * 部署卡牌到战场
     */
    deployCard(cardId: string, slotIndex: number): boolean {
        if (this.phase !== ClBattlePhase.SelectingCard && 
            this.phase !== ClBattlePhase.SelectingTarget) {
            this.callbacks.onMessage?.('当前不能部署卡牌');
            return false;
        }
        
        const result = this.battleManager.deployCard(this.localPlayerId, cardId, slotIndex);
        
        if (result.success) {
            const card = this.getCardById(cardId);
            this.callbacks.onMessage?.(`部署了 ${card?.name ?? '卡牌'} 到槽位 ${slotIndex + 1}!`);
            
            // 更新行动力显示
            this.updateActionPointsDisplay();
            
            // 通知 UI 更新
            this.callbacks.onStateUpdate?.(this.battleManager.getState()!);
            
            return true;
        } else {
            this.callbacks.onMessage?.(result.error || '部署卡牌失败');
            return false;
        }
    }
    
    /**
     * 获取玩家战场状态
     */
    getPlayerBattlefield() {
        return this.battleManager.getBattlefield(this.localPlayerId);
    }
    
    /**
     * 获取对手战场状态
     */
    getOpponentBattlefield() {
        return this.battleManager.getBattlefield(this.aiPlayerId);
    }
    
    /**
     * 获取可部署的空闲槽位
     */
    getEmptySlots(): number[] {
        return this.battleManager.getEmptySlots(this.localPlayerId);
    }

    /**
     * 是否轮到玩家
     */
    isPlayerTurn(): boolean {
        return this.phase === ClBattlePhase.SelectingCard || 
               this.phase === ClBattlePhase.SelectingTarget;
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.battleManager.dispose();
        this.selectedCard = null;
    }
}

// =============================================================================
// 单例
// =============================================================================

let battleControllerInstance: ClBattleController | null = null;

export function cl_getBattleController(): ClBattleController {
    if (!battleControllerInstance) {
        battleControllerInstance = new ClBattleController();
    }
    return battleControllerInstance;
}
