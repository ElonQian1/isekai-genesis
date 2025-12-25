/**
 * WebSocket 网络客户端
 * 
 * @deprecated 此文件已废弃，请使用新的模块化网络架构:
 * - ClWebSocketCore: 核心连接管理
 * - ClLobbyService: 大厅服务 (登录、房间管理)
 * - ClBattleService: 战斗服务 (游戏内通信)
 * 
 * 迁移指南:
 * ```typescript
 * // 旧代码
 * const network = cl_getNetworkClient();
 * await network.connect();
 * network.login(playerId, name);
 * 
 * // 新代码
 * const lobby = cl_getLobbyService();
 * await lobby.connectAndLogin(playerId, name);
 * ```
 * 
 * 模块: client/network
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

// =============================================================================
// 消息类型定义 (与 Rust 后端 GsWsMessage 对应)
// =============================================================================

export type ClWsMessageType = 
    // 客户端 -> 服务器
    | 'Login'
    | 'CreateRoom'
    | 'JoinRoom'
    | 'LeaveRoom'
    | 'Ready'
    | 'StartGame'
    | 'PlayCard'
    | 'EndTurn'
    | 'Ping'
    // 服务器 -> 客户端
    | 'LoginSuccess'
    | 'RoomCreated'
    | 'RoomJoined'
    | 'PlayerJoined'
    | 'PlayerLeft'
    | 'GameStarted'
    | 'GameState'
    | 'TurnStart'
    | 'CardPlayed'
    | 'TurnEnded'
    | 'GameEnded'
    | 'Error'
    | 'Pong';

export interface ClWsMessage {
    type: ClWsMessageType;
    data?: unknown;
}

// =============================================================================
// 具体消息类型
// =============================================================================

export interface ClLoginData {
    player_id: string;
    name: string;
}

export interface ClCreateRoomData {
    name: string;
}

export interface ClJoinRoomData {
    room_id: string;
}

export interface ClPlayCardData {
    card_id: string;
    target_id?: string;
}

export interface ClLoginSuccessData {
    player_id: string;
}

export interface ClRoomCreatedData {
    room_id: string;
}

export interface ClPlayerJoinedData {
    player_id: string;
    name: string;
}

export interface ClPlayerLeftData {
    player_id: string;
}

export interface ClGameStartedData {
    battle_state: string;
}

export interface ClGameStateData {
    battle_state: string;
}

export interface ClTurnStartData {
    player_id: string;
}

export interface ClCardPlayedData {
    player_id: string;
    card_id: string;
    result: string;
}

export interface ClTurnEndedData {
    player_id: string;
}

export interface ClGameEndedData {
    winner_id: string | null;
}

export interface ClErrorData {
    code: string;
    message: string;
}

// =============================================================================
// 事件回调类型
// =============================================================================

export interface ClNetworkCallbacks {
    onConnect?: () => void;
    onDisconnect?: (reason: string) => void;
    onError?: (error: Error) => void;
    
    // 登录
    onLoginSuccess?: (data: ClLoginSuccessData) => void;
    
    // 房间
    onRoomCreated?: (data: ClRoomCreatedData) => void;
    onRoomJoined?: (data: ClRoomCreatedData) => void;
    onPlayerJoined?: (data: ClPlayerJoinedData) => void;
    onPlayerLeft?: (data: ClPlayerLeftData) => void;
    
    // 游戏
    onGameStarted?: (data: ClGameStartedData) => void;
    onGameState?: (data: ClGameStateData) => void;
    onTurnStart?: (data: ClTurnStartData) => void;
    onCardPlayed?: (data: ClCardPlayedData) => void;
    onTurnEnded?: (data: ClTurnEndedData) => void;
    onGameEnded?: (data: ClGameEndedData) => void;
    
    // 错误
    onServerError?: (data: ClErrorData) => void;
}

// =============================================================================
// WebSocket 网络客户端
// =============================================================================

export class ClNetworkClient {
    private ws: WebSocket | null = null;
    private serverUrl: string;
    private callbacks: ClNetworkCallbacks = {};
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 2000;
    private heartbeatInterval: number | null = null;
    private isConnecting: boolean = false;

    constructor(serverUrl: string) {
        this.serverUrl = serverUrl;
    }

    /**
     * 设置回调
     */
    setCallbacks(callbacks: ClNetworkCallbacks): void {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * 连接服务器
     */
    async connect(): Promise<void> {
        if (this.ws?.readyState === WebSocket.OPEN) {
            console.log('📡 已经连接到服务器');
            return;
        }

        if (this.isConnecting) {
            console.log('📡 正在连接中...');
            return;
        }

        this.isConnecting = true;

        return new Promise((resolve, reject) => {
            try {
                console.log(`📡 连接服务器: ${this.serverUrl}`);
                this.ws = new WebSocket(this.serverUrl);

                this.ws.onopen = () => {
                    console.log('✅ 服务器连接成功!');
                    this.isConnecting = false;
                    this.reconnectAttempts = 0;
                    this.startHeartbeat();
                    this.callbacks.onConnect?.();
                    resolve();
                };

                this.ws.onclose = (event) => {
                    console.log(`❌ 连接断开: ${event.reason || '未知原因'}`);
                    this.isConnecting = false;
                    this.stopHeartbeat();
                    this.callbacks.onDisconnect?.(event.reason || '连接关闭');
                    this.tryReconnect();
                };

                this.ws.onerror = (event) => {
                    console.error('❌ WebSocket 错误:', event);
                    this.isConnecting = false;
                    const error = new Error('WebSocket 连接错误');
                    this.callbacks.onError?.(error);
                    reject(error);
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

            } catch (error) {
                this.isConnecting = false;
                reject(error);
            }
        });
    }

    /**
     * 断开连接
     */
    disconnect(): void {
        this.stopHeartbeat();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * 发送消息
     */
    send(type: ClWsMessageType, data?: unknown): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('❌ 未连接到服务器');
            return;
        }

        const message: ClWsMessage = { type, data };
        this.ws.send(JSON.stringify(message));
    }

    // =========================================================================
    // 客户端 API
    // =========================================================================

    /**
     * 登录
     */
    login(playerId: string, name: string): void {
        this.send('Login', { player_id: playerId, name });
    }

    /**
     * 创建房间
     */
    createRoom(name: string): void {
        this.send('CreateRoom', { name });
    }

    /**
     * 加入房间
     */
    joinRoom(roomId: string): void {
        this.send('JoinRoom', { room_id: roomId });
    }

    /**
     * 离开房间
     */
    leaveRoom(): void {
        this.send('LeaveRoom');
    }

    /**
     * 准备
     */
    ready(): void {
        this.send('Ready');
    }

    /**
     * 开始游戏
     */
    startGame(): void {
        this.send('StartGame');
    }

    /**
     * 出牌
     */
    playCard(cardId: string, targetId?: string): void {
        this.send('PlayCard', { card_id: cardId, target_id: targetId });
    }

    /**
     * 结束回合
     */
    endTurn(): void {
        this.send('EndTurn');
    }

    // =========================================================================
    // 私有方法
    // =========================================================================

    /**
     * 处理收到的消息
     */
    private handleMessage(data: string): void {
        try {
            const message: ClWsMessage = JSON.parse(data);
            console.log(`📨 收到消息: ${message.type}`, message.data);

            switch (message.type) {
                case 'LoginSuccess':
                    this.callbacks.onLoginSuccess?.(message.data as ClLoginSuccessData);
                    break;
                case 'RoomCreated':
                    this.callbacks.onRoomCreated?.(message.data as ClRoomCreatedData);
                    break;
                case 'RoomJoined':
                    this.callbacks.onRoomJoined?.(message.data as ClRoomCreatedData);
                    break;
                case 'PlayerJoined':
                    this.callbacks.onPlayerJoined?.(message.data as ClPlayerJoinedData);
                    break;
                case 'PlayerLeft':
                    this.callbacks.onPlayerLeft?.(message.data as ClPlayerLeftData);
                    break;
                case 'GameStarted':
                    this.callbacks.onGameStarted?.(message.data as ClGameStartedData);
                    break;
                case 'GameState':
                    this.callbacks.onGameState?.(message.data as ClGameStateData);
                    break;
                case 'TurnStart':
                    this.callbacks.onTurnStart?.(message.data as ClTurnStartData);
                    break;
                case 'CardPlayed':
                    this.callbacks.onCardPlayed?.(message.data as ClCardPlayedData);
                    break;
                case 'TurnEnded':
                    this.callbacks.onTurnEnded?.(message.data as ClTurnEndedData);
                    break;
                case 'GameEnded':
                    this.callbacks.onGameEnded?.(message.data as ClGameEndedData);
                    break;
                case 'Error':
                    this.callbacks.onServerError?.(message.data as ClErrorData);
                    break;
                case 'Pong':
                    // 心跳响应，忽略
                    break;
                default:
                    console.warn(`⚠️ 未知消息类型: ${message.type}`);
            }
        } catch (error) {
            console.error('❌ 解析消息失败:', error);
        }
    }

    /**
     * 尝试重连
     */
    private tryReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ 重连次数已达上限');
            return;
        }

        this.reconnectAttempts++;
        console.log(`🔄 尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

        setTimeout(() => {
            this.connect().catch(() => {
                // 重连失败，会自动再次尝试
            });
        }, this.reconnectDelay);
    }

    /**
     * 开始心跳
     */
    private startHeartbeat(): void {
        this.heartbeatInterval = window.setInterval(() => {
            this.send('Ping');
        }, 30000); // 30秒发送一次心跳
    }

    /**
     * 停止心跳
     */
    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * 是否已连接
     */
    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

// =============================================================================
// 全局单例
// =============================================================================

let networkClientInstance: ClNetworkClient | null = null;

/**
 * 获取网络客户端单例
 */
export function cl_getNetworkClient(serverUrl?: string): ClNetworkClient {
    if (!networkClientInstance) {
        const url = serverUrl || `ws://${window.location.hostname}:3000/ws`;
        networkClientInstance = new ClNetworkClient(url);
    }
    return networkClientInstance;
}
