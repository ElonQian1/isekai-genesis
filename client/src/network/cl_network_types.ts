/**
 * 网络模块类型定义
 * 
 * 模块: client/network
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责:
 * 1. 定义所有网络消息类型
 * 2. 定义数据传输对象 (DTO)
 * 3. 与 Rust 后端 GsWsMessage 对应
 */

// =============================================================================
// 消息类型枚举
// =============================================================================

/**
 * WebSocket 消息类型
 * 与 Rust 后端 GsWsMessageType 完全对应
 */
export enum ClMessageType {
    // =========================================================================
    // 客户端 -> 服务器
    // =========================================================================
    
    // 认证
    Login = 'Login',
    Logout = 'Logout',
    
    // 大厅
    CreateRoom = 'CreateRoom',
    JoinRoom = 'JoinRoom',
    LeaveRoom = 'LeaveRoom',
    GetRoomList = 'GetRoomList',
    
    // 房间内
    Ready = 'Ready',
    Unready = 'Unready',
    StartGame = 'StartGame',
    
    // 游戏内
    PlayCard = 'PlayCard',
    EndTurn = 'EndTurn',
    Surrender = 'Surrender',
    
    // 心跳
    Ping = 'Ping',
    
    // MCP
    McpCommand = 'McpCommand',
    
    // =========================================================================
    // 服务器 -> 客户端
    // =========================================================================
    
    // 认证响应
    LoginSuccess = 'LoginSuccess',
    LoginFailed = 'LoginFailed',
    
    // 大厅响应
    RoomList = 'RoomList',
    RoomCreated = 'RoomCreated',
    RoomJoined = 'RoomJoined',
    
    // 房间事件
    PlayerJoined = 'PlayerJoined',
    PlayerLeft = 'PlayerLeft',
    PlayerReady = 'PlayerReady',
    PlayerUnready = 'PlayerUnready',
    
    // 游戏事件
    GameStarted = 'GameStarted',
    GameState = 'GameState',
    TurnStart = 'TurnStart',
    CardPlayed = 'CardPlayed',
    TurnEnded = 'TurnEnded',
    GameEnded = 'GameEnded',
    
    // 通用
    Error = 'Error',
    Pong = 'Pong',
    
    // =========================================================================
    // 世界同步 (多人探索)
    // =========================================================================
    
    // 玩家移动
    PlayerPosition = 'PlayerPosition',
    PlayerMove = 'PlayerMove',
    PlayerStatus = 'PlayerStatus',
    
    // 战斗遭遇
    BattleEncounter = 'BattleEncounter',
    BattleInvite = 'BattleInvite',
    BattleJoin = 'BattleJoin',
    BattleStart = 'BattleStart',
    BattleEnd = 'BattleEnd',
    
    // 交互
    Interact = 'Interact',
    Chat = 'Chat',
    Emote = 'Emote',
    
    // 世界状态
    WorldState = 'WorldState',
}

// =============================================================================
// 基础消息结构
// =============================================================================

/**
 * WebSocket 消息基础结构
 */
export interface ClMessage<T = unknown> {
    type: ClMessageType;
    data?: T;
    timestamp?: number;
}

// =============================================================================
// 请求数据类型 (客户端 -> 服务器)
// =============================================================================

export interface ClLoginRequest {
    player_id: string;
    name: string;
    token?: string; // 可选的认证 token
}

export interface ClCreateRoomRequest {
    name: string;
    max_players?: number;
    password?: string;
}

export interface ClJoinRoomRequest {
    room_id: string;
    password?: string;
}

export interface ClPlayCardRequest {
    card_id: string;
    target_id?: string;
    target_position?: number;
}

// =============================================================================
// 响应数据类型 (服务器 -> 客户端)
// =============================================================================

export interface ClLoginSuccessResponse {
    player_id: string;
    session_id?: string;
}

export interface ClRoomCreatedResponse {
    room_id: string;
}

export interface ClRoomJoinedResponse {
    room_id: string;
    players: ClPlayerInfo[];
}

export interface ClPlayerInfo {
    id: string;
    name: string;
    ready: boolean;
    is_host: boolean;
}

export interface ClRoomListResponse {
    rooms: ClRoomSummary[];
}

export interface ClRoomSummary {
    id: string;
    name: string;
    player_count: number;
    max_players: number;
    has_password: boolean;
    status: 'waiting' | 'playing';
}

export interface ClPlayerJoinedEvent {
    player_id: string;
    name: string;
}

export interface ClPlayerLeftEvent {
    player_id: string;
    reason?: string;
}

export interface ClGameStartedEvent {
    battle_state: string; // JSON 序列化的战斗状态
}

export interface ClGameStateEvent {
    battle_state: string;
}

export interface ClTurnStartEvent {
    player_id: string;
    turn_number: number;
}

export interface ClCardPlayedEvent {
    player_id: string;
    card_id: string;
    target_id?: string;
    result?: string;
}

export interface ClTurnEndedEvent {
    player_id: string;
}

export interface ClGameEndedEvent {
    winner_id: string | null;
    reason: 'victory' | 'surrender' | 'disconnect' | 'timeout';
}

export interface ClErrorResponse {
    code: string;
    message: string;
}

// =============================================================================
// 连接状态
// =============================================================================

export enum ClConnectionState {
    Disconnected = 'disconnected',
    Connecting = 'connecting',
    Connected = 'connected',
    Reconnecting = 'reconnecting',
    Failed = 'failed',
}

// =============================================================================
// 网络配置
// =============================================================================

export interface ClNetworkConfig {
    serverUrl: string;
    reconnectAttempts: number;
    reconnectDelay: number;
    heartbeatInterval: number;
    connectionTimeout: number;
}

export const CL_DEFAULT_NETWORK_CONFIG: ClNetworkConfig = {
    serverUrl: `ws://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3000/ws`,
    reconnectAttempts: 5,
    reconnectDelay: 2000,
    heartbeatInterval: 30000,
    connectionTimeout: 10000,
};
