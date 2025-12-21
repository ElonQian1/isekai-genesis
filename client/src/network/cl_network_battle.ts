/**
 * 网络战斗管理器 - 处理多人对战
 * 
 * 模块: client/network
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import {
    ClNetworkClient,
    cl_getNetworkClient,
} from './cl_network';
import { ClBattleState } from '../cl_battle_manager';

// =============================================================================
// 网络战斗状态
// =============================================================================

export enum ClNetworkBattlePhase {
    Disconnected = 'disconnected',
    Connecting = 'connecting',
    Connected = 'connected',
    InLobby = 'inLobby',
    InRoom = 'inRoom',
    WaitingPlayers = 'waitingPlayers',
    Playing = 'playing',
    GameOver = 'gameOver',
}

export interface ClRoomInfo {
    roomId: string;
    name: string;
    players: { id: string; name: string; ready: boolean }[];
    maxPlayers: number;
}

// =============================================================================
// 事件回调
// =============================================================================

export interface ClNetworkBattleCallbacks {
    // 连接状态
    onPhaseChange?: (phase: ClNetworkBattlePhase) => void;
    onConnectionError?: (error: string) => void;
    
    // 房间事件
    onRoomCreated?: (roomId: string) => void;
    onRoomJoined?: (roomId: string) => void;
    onPlayerJoined?: (playerId: string, name: string) => void;
    onPlayerLeft?: (playerId: string) => void;
    
    // 游戏事件
    onGameStart?: (state: ClBattleState) => void;
    onStateUpdate?: (state: ClBattleState) => void;
    onTurnStart?: (playerId: string) => void;
    onCardPlayed?: (playerId: string, cardId: string) => void;
    onGameEnd?: (winnerId: string | null) => void;
    
    // 错误
    onError?: (code: string, message: string) => void;
}

// =============================================================================
// 网络战斗管理器
// =============================================================================

export class ClNetworkBattleManager {
    private network: ClNetworkClient;
    private phase: ClNetworkBattlePhase = ClNetworkBattlePhase.Disconnected;
    private callbacks: ClNetworkBattleCallbacks = {};
    
    // 玩家信息
    private localPlayerId: string = '';
    private localPlayerName: string = '';
    
    // 房间信息
    private currentRoom: ClRoomInfo | null = null;
    
    // 战斗状态
    private battleState: ClBattleState | null = null;

    constructor(serverUrl?: string) {
        this.network = cl_getNetworkClient(serverUrl);
        this.setupNetworkCallbacks();
    }

    /**
     * 设置回调
     */
    setCallbacks(callbacks: ClNetworkBattleCallbacks): void {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * 连接服务器
     */
    async connect(): Promise<void> {
        this.setPhase(ClNetworkBattlePhase.Connecting);
        
        try {
            await this.network.connect();
            this.setPhase(ClNetworkBattlePhase.Connected);
        } catch (error) {
            this.setPhase(ClNetworkBattlePhase.Disconnected);
            this.callbacks.onConnectionError?.(error instanceof Error ? error.message : '连接失败');
            throw error;
        }
    }

    /**
     * 断开连接
     */
    disconnect(): void {
        this.network.disconnect();
        this.setPhase(ClNetworkBattlePhase.Disconnected);
    }

    /**
     * 登录
     */
    login(playerId: string, name: string): void {
        this.localPlayerId = playerId;
        this.localPlayerName = name;
        this.network.login(playerId, name);
    }

    /**
     * 创建房间
     */
    createRoom(name: string): void {
        this.network.createRoom(name);
    }

    /**
     * 加入房间
     */
    joinRoom(roomId: string): void {
        this.network.joinRoom(roomId);
    }

    /**
     * 离开房间
     */
    leaveRoom(): void {
        this.network.leaveRoom();
        this.currentRoom = null;
        this.setPhase(ClNetworkBattlePhase.InLobby);
    }

    /**
     * 准备
     */
    ready(): void {
        this.network.ready();
    }

    /**
     * 开始游戏 (房主)
     */
    startGame(): void {
        this.network.startGame();
    }

    /**
     * 出牌
     */
    playCard(cardId: string, targetId?: string): void {
        if (this.phase !== ClNetworkBattlePhase.Playing) {
            console.error('❌ 不在游戏中');
            return;
        }
        
        if (!this.isMyTurn()) {
            console.error('❌ 不是你的回合');
            return;
        }
        
        this.network.playCard(cardId, targetId);
    }

    /**
     * 结束回合
     */
    endTurn(): void {
        if (this.phase !== ClNetworkBattlePhase.Playing) {
            console.error('❌ 不在游戏中');
            return;
        }
        
        if (!this.isMyTurn()) {
            console.error('❌ 不是你的回合');
            return;
        }
        
        this.network.endTurn();
    }

    // =========================================================================
    // 状态查询
    // =========================================================================

    /**
     * 获取当前阶段
     */
    getPhase(): ClNetworkBattlePhase {
        return this.phase;
    }

    /**
     * 获取本地玩家 ID
     */
    getLocalPlayerId(): string {
        return this.localPlayerId;
    }

    /**
     * 获取当前房间
     */
    getCurrentRoom(): ClRoomInfo | null {
        return this.currentRoom;
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
        if (!this.battleState) return false;
        const currentPlayer = this.battleState.players[this.battleState.current_player_index];
        return currentPlayer?.id === this.localPlayerId;
    }

    /**
     * 是否已连接
     */
    isConnected(): boolean {
        return this.network.isConnected();
    }

    // =========================================================================
    // 私有方法
    // =========================================================================

    /**
     * 设置阶段
     */
    private setPhase(phase: ClNetworkBattlePhase): void {
        if (this.phase !== phase) {
            console.log(`🎮 阶段变更: ${this.phase} -> ${phase}`);
            this.phase = phase;
            this.callbacks.onPhaseChange?.(phase);
        }
    }

    /**
     * 设置网络回调
     */
    private setupNetworkCallbacks(): void {
        this.network.setCallbacks({
            onConnect: () => {
                console.log('✅ 网络连接成功');
            },
            
            onDisconnect: (reason) => {
                console.log(`❌ 网络断开: ${reason}`);
                this.setPhase(ClNetworkBattlePhase.Disconnected);
            },
            
            onLoginSuccess: (data) => {
                console.log(`✅ 登录成功: ${data.player_id}`);
                this.setPhase(ClNetworkBattlePhase.InLobby);
            },
            
            onRoomCreated: (data) => {
                console.log(`🏠 房间创建成功: ${data.room_id}`);
                this.currentRoom = {
                    roomId: data.room_id,
                    name: '',
                    players: [{ id: this.localPlayerId, name: this.localPlayerName, ready: false }],
                    maxPlayers: 2,
                };
                this.setPhase(ClNetworkBattlePhase.InRoom);
                this.callbacks.onRoomCreated?.(data.room_id);
            },
            
            onRoomJoined: (data) => {
                console.log(`🚪 加入房间: ${data.room_id}`);
                this.currentRoom = {
                    roomId: data.room_id,
                    name: '',
                    players: [],
                    maxPlayers: 2,
                };
                this.setPhase(ClNetworkBattlePhase.InRoom);
                this.callbacks.onRoomJoined?.(data.room_id);
            },
            
            onPlayerJoined: (data) => {
                console.log(`👋 玩家加入: ${data.name}`);
                if (this.currentRoom) {
                    this.currentRoom.players.push({
                        id: data.player_id,
                        name: data.name,
                        ready: false,
                    });
                }
                this.callbacks.onPlayerJoined?.(data.player_id, data.name);
            },
            
            onPlayerLeft: (data) => {
                console.log(`👋 玩家离开: ${data.player_id}`);
                if (this.currentRoom) {
                    this.currentRoom.players = this.currentRoom.players.filter(
                        p => p.id !== data.player_id
                    );
                }
                this.callbacks.onPlayerLeft?.(data.player_id);
            },
            
            onGameStarted: (data) => {
                console.log('⚔️ 游戏开始!');
                this.battleState = JSON.parse(data.battle_state);
                this.setPhase(ClNetworkBattlePhase.Playing);
                this.callbacks.onGameStart?.(this.battleState!);
            },
            
            onGameState: (data) => {
                this.battleState = JSON.parse(data.battle_state);
                this.callbacks.onStateUpdate?.(this.battleState!);
            },
            
            onTurnStart: (data) => {
                console.log(`🎯 回合开始: ${data.player_id}`);
                this.callbacks.onTurnStart?.(data.player_id);
            },
            
            onCardPlayed: (data) => {
                console.log(`🃏 卡牌打出: ${data.card_id}`);
                this.callbacks.onCardPlayed?.(data.player_id, data.card_id);
            },
            
            onTurnEnded: (data) => {
                console.log(`⏭️ 回合结束: ${data.player_id}`);
            },
            
            onGameEnded: (data) => {
                console.log(`🏆 游戏结束! 获胜者: ${data.winner_id || '平局'}`);
                this.setPhase(ClNetworkBattlePhase.GameOver);
                this.callbacks.onGameEnd?.(data.winner_id);
            },
            
            onServerError: (data) => {
                console.error(`❌ 服务器错误: [${data.code}] ${data.message}`);
                this.callbacks.onError?.(data.code, data.message);
            },
        });
    }
}

// =============================================================================
// 全局单例
// =============================================================================

let networkBattleManagerInstance: ClNetworkBattleManager | null = null;

/**
 * 获取网络战斗管理器单例
 */
export function cl_getNetworkBattleManager(serverUrl?: string): ClNetworkBattleManager {
    if (!networkBattleManagerInstance) {
        networkBattleManagerInstance = new ClNetworkBattleManager(serverUrl);
    }
    return networkBattleManagerInstance;
}
