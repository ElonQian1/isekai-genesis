/**
 * 大厅网络服务 - 处理登录、房间管理
 * 
 * 模块: client/network
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责:
 * 1. 用户登录/登出
 * 2. 房间列表获取
 * 3. 房间创建/加入/离开
 * 4. 玩家准备状态
 * 
 * 设计原则:
 * - 高层业务逻辑封装
 * - 状态管理与事件通知
 * - 依赖 ClWebSocketCore
 */

import {
    ClMessageType,
    ClLoginRequest,
    ClCreateRoomRequest,
    ClJoinRoomRequest,
    ClLoginSuccessResponse,
    ClRoomCreatedResponse,
    ClRoomJoinedResponse,
    ClPlayerInfo,
    ClPlayerJoinedEvent,
    ClPlayerLeftEvent,
    ClRoomListResponse,
    ClRoomSummary,
    ClErrorResponse,
} from './cl_network_types';
import { ClWebSocketCore, cl_getWebSocketCore } from './cl_websocket_core';

// =============================================================================
// 大厅状态
// =============================================================================

export enum ClLobbyState {
    Offline = 'offline',           // 未连接
    Connecting = 'connecting',     // 连接中
    NotLoggedIn = 'notLoggedIn',   // 已连接但未登录
    InLobby = 'inLobby',           // 在大厅
    InRoom = 'inRoom',             // 在房间中
}

// =============================================================================
// 事件回调
// =============================================================================

export interface ClLobbyCallbacks {
    // 状态变化
    onStateChange?: (state: ClLobbyState) => void;
    
    // 登录
    onLoginSuccess?: (playerId: string) => void;
    onLoginFailed?: (error: string) => void;
    
    // 房间列表
    onRoomListUpdate?: (rooms: ClRoomSummary[]) => void;
    
    // 房间事件
    onRoomCreated?: (roomId: string) => void;
    onRoomJoined?: (roomId: string, players: ClPlayerInfo[]) => void;
    onRoomLeft?: () => void;
    
    // 房间内事件
    onPlayerJoined?: (playerId: string, name: string) => void;
    onPlayerLeft?: (playerId: string) => void;
    onPlayerReady?: (playerId: string) => void;
    onPlayerUnready?: (playerId: string) => void;
    
    // 游戏开始（转交给战斗服务）
    onGameStarting?: () => void;
    
    // 错误
    onError?: (code: string, message: string) => void;
}

// =============================================================================
// 大厅网络服务
// =============================================================================

export class ClLobbyService {
    private wsCore: ClWebSocketCore;
    private state: ClLobbyState = ClLobbyState.Offline;
    private callbacks: ClLobbyCallbacks = {};
    
    // 玩家信息
    private playerId: string = '';
    private playerName: string = '';
    
    // 房间信息
    private currentRoomId: string | null = null;
    private roomPlayers: ClPlayerInfo[] = [];
    private roomList: ClRoomSummary[] = [];

    constructor(wsCore?: ClWebSocketCore) {
        this.wsCore = wsCore || cl_getWebSocketCore();
        this.setupMessageHandlers();
    }

    // =========================================================================
    // 公共 API - 连接与登录
    // =========================================================================

    /**
     * 连接并登录
     */
    async connectAndLogin(playerId: string, playerName: string): Promise<void> {
        this.playerId = playerId;
        this.playerName = playerName;
        
        this.setState(ClLobbyState.Connecting);
        
        try {
            await this.wsCore.connect();
            this.setState(ClLobbyState.NotLoggedIn);
            this.login(playerId, playerName);
        } catch (error) {
            this.setState(ClLobbyState.Offline);
            throw error;
        }
    }

    /**
     * 登录（连接后调用）
     */
    login(playerId: string, playerName: string): void {
        this.playerId = playerId;
        this.playerName = playerName;
        
        const request: ClLoginRequest = {
            player_id: playerId,
            name: playerName,
        };
        
        this.wsCore.send(ClMessageType.Login, request);
    }

    /**
     * 断开连接
     */
    disconnect(): void {
        this.wsCore.disconnect();
        this.reset();
        this.setState(ClLobbyState.Offline);
    }

    // =========================================================================
    // 公共 API - 房间管理
    // =========================================================================

    /**
     * 获取房间列表
     */
    refreshRoomList(): void {
        this.wsCore.send(ClMessageType.GetRoomList);
    }

    /**
     * 创建房间
     */
    createRoom(name: string, maxPlayers: number = 2): void {
        const request: ClCreateRoomRequest = {
            name,
            max_players: maxPlayers,
        };
        
        this.wsCore.send(ClMessageType.CreateRoom, request);
    }

    /**
     * 加入房间
     */
    joinRoom(roomId: string, password?: string): void {
        const request: ClJoinRoomRequest = {
            room_id: roomId,
            password,
        };
        
        this.wsCore.send(ClMessageType.JoinRoom, request);
    }

    /**
     * 离开房间
     */
    leaveRoom(): void {
        this.wsCore.send(ClMessageType.LeaveRoom);
        this.currentRoomId = null;
        this.roomPlayers = [];
        this.setState(ClLobbyState.InLobby);
        this.callbacks.onRoomLeft?.();
    }

    /**
     * 准备
     */
    ready(): void {
        this.wsCore.send(ClMessageType.Ready);
    }

    /**
     * 取消准备
     */
    unready(): void {
        this.wsCore.send(ClMessageType.Unready);
    }

    /**
     * 开始游戏（房主）
     */
    startGame(): void {
        this.wsCore.send(ClMessageType.StartGame);
    }

    // =========================================================================
    // 公共 API - 状态查询
    // =========================================================================

    /**
     * 获取当前状态
     */
    getState(): ClLobbyState {
        return this.state;
    }

    /**
     * 获取玩家 ID
     */
    getPlayerId(): string {
        return this.playerId;
    }

    /**
     * 获取玩家名称
     */
    getPlayerName(): string {
        return this.playerName;
    }

    /**
     * 获取当前房间 ID
     */
    getCurrentRoomId(): string | null {
        return this.currentRoomId;
    }

    /**
     * 获取房间玩家列表
     */
    getRoomPlayers(): ClPlayerInfo[] {
        return [...this.roomPlayers];
    }

    /**
     * 获取房间列表
     */
    getRoomList(): ClRoomSummary[] {
        return [...this.roomList];
    }

    /**
     * 是否是房主
     */
    isHost(): boolean {
        const self = this.roomPlayers.find(p => p.id === this.playerId);
        return self?.is_host ?? false;
    }

    /**
     * 所有玩家是否都准备好了
     */
    allPlayersReady(): boolean {
        return this.roomPlayers.length >= 2 && 
               this.roomPlayers.every(p => p.ready || p.is_host);
    }

    // =========================================================================
    // 回调设置
    // =========================================================================

    /**
     * 设置回调
     */
    setCallbacks(callbacks: ClLobbyCallbacks): void {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    // =========================================================================
    // 私有方法 - 消息处理
    // =========================================================================

    private setupMessageHandlers(): void {
        // 登录成功
        this.wsCore.on<ClLoginSuccessResponse>(ClMessageType.LoginSuccess, (data) => {
            console.log(`✅ 登录成功: ${data.player_id}`);
            this.setState(ClLobbyState.InLobby);
            this.callbacks.onLoginSuccess?.(data.player_id);
        });

        // 登录失败
        this.wsCore.on<ClErrorResponse>(ClMessageType.LoginFailed, (data) => {
            console.error(`❌ 登录失败: ${data.message}`);
            this.callbacks.onLoginFailed?.(data.message);
        });

        // 房间列表
        this.wsCore.on<ClRoomListResponse>(ClMessageType.RoomList, (data) => {
            this.roomList = data.rooms;
            this.callbacks.onRoomListUpdate?.(data.rooms);
        });

        // 房间创建成功
        this.wsCore.on<ClRoomCreatedResponse>(ClMessageType.RoomCreated, (data) => {
            console.log(`🏠 房间创建成功: ${data.room_id}`);
            this.currentRoomId = data.room_id;
            this.roomPlayers = [{
                id: this.playerId,
                name: this.playerName,
                ready: false,
                is_host: true,
            }];
            this.setState(ClLobbyState.InRoom);
            this.callbacks.onRoomCreated?.(data.room_id);
        });

        // 加入房间成功
        this.wsCore.on<ClRoomJoinedResponse>(ClMessageType.RoomJoined, (data) => {
            console.log(`🚪 加入房间: ${data.room_id}`);
            this.currentRoomId = data.room_id;
            this.roomPlayers = data.players;
            this.setState(ClLobbyState.InRoom);
            this.callbacks.onRoomJoined?.(data.room_id, data.players);
        });

        // 玩家加入
        this.wsCore.on<ClPlayerJoinedEvent>(ClMessageType.PlayerJoined, (data) => {
            console.log(`👋 玩家加入: ${data.name}`);
            this.roomPlayers.push({
                id: data.player_id,
                name: data.name,
                ready: false,
                is_host: false,
            });
            this.callbacks.onPlayerJoined?.(data.player_id, data.name);
        });

        // 玩家离开
        this.wsCore.on<ClPlayerLeftEvent>(ClMessageType.PlayerLeft, (data) => {
            console.log(`👋 玩家离开: ${data.player_id}`);
            this.roomPlayers = this.roomPlayers.filter(p => p.id !== data.player_id);
            this.callbacks.onPlayerLeft?.(data.player_id);
        });

        // 玩家准备
        this.wsCore.on<{ player_id: string }>(ClMessageType.PlayerReady, (data) => {
            const player = this.roomPlayers.find(p => p.id === data.player_id);
            if (player) player.ready = true;
            this.callbacks.onPlayerReady?.(data.player_id);
        });

        // 玩家取消准备
        this.wsCore.on<{ player_id: string }>(ClMessageType.PlayerUnready, (data) => {
            const player = this.roomPlayers.find(p => p.id === data.player_id);
            if (player) player.ready = false;
            this.callbacks.onPlayerUnready?.(data.player_id);
        });

        // 游戏开始
        this.wsCore.on(ClMessageType.GameStarted, () => {
            console.log('⚔️ 游戏开始!');
            this.callbacks.onGameStarting?.();
        });

        // 错误
        this.wsCore.on<ClErrorResponse>(ClMessageType.Error, (data) => {
            console.error(`❌ 服务器错误: [${data.code}] ${data.message}`);
            this.callbacks.onError?.(data.code, data.message);
        });
    }

    // =========================================================================
    // 私有方法 - 状态管理
    // =========================================================================

    private setState(newState: ClLobbyState): void {
        if (this.state !== newState) {
            console.log(`🏠 大厅状态: ${this.state} -> ${newState}`);
            this.state = newState;
            this.callbacks.onStateChange?.(newState);
        }
    }

    private reset(): void {
        this.playerId = '';
        this.playerName = '';
        this.currentRoomId = null;
        this.roomPlayers = [];
        this.roomList = [];
    }

    // =========================================================================
    // 清理
    // =========================================================================

    dispose(): void {
        this.reset();
        this.callbacks = {};
    }
}

// =============================================================================
// 全局单例
// =============================================================================

let lobbyService: ClLobbyService | null = null;

/**
 * 获取大厅服务单例
 */
export function cl_getLobbyService(): ClLobbyService {
    if (!lobbyService) {
        lobbyService = new ClLobbyService();
    }
    return lobbyService;
}
