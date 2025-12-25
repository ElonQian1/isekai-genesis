/**
 * 网络模块导出
 * 
 * 模块: client/network
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 架构概览:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                     应用层 (UI/游戏逻辑)                     │
 * ├─────────────────────────────────────────────────────────────┤
 * │  ┌─────────────────┐     ┌─────────────────┐               │
 * │  │  ClLobbyService │     │ ClBattleService │               │
 * │  │   (大厅服务)    │     │   (战斗服务)    │               │
 * │  │  - 登录/登出    │     │  - 出牌/结束    │               │
 * │  │  - 房间管理     │     │  - 状态同步     │               │
 * │  │  - 玩家准备     │     │  - 回合管理     │               │
 * │  └────────┬────────┘     └────────┬────────┘               │
 * │           │                       │                        │
 * │           └───────────┬───────────┘                        │
 * │                       ▼                                    │
 * │           ┌─────────────────────┐                          │
 * │           │   ClWebSocketCore   │                          │
 * │           │    (核心连接层)      │                          │
 * │           │  - 连接管理          │                          │
 * │           │  - 自动重连          │                          │
 * │           │  - 心跳检测          │                          │
 * │           │  - 消息分发          │                          │
 * │           └──────────┬──────────┘                          │
 * │                      ▼                                     │
 * │              WebSocket API                                 │
 * └─────────────────────────────────────────────────────────────┘
 */

// =============================================================================
// 类型定义
// =============================================================================

export {
    ClMessageType,
    ClConnectionState,
    CL_DEFAULT_NETWORK_CONFIG,
} from './cl_network_types';

export type {
    ClMessage,
    ClNetworkConfig,
    ClLoginRequest,
    ClCreateRoomRequest,
    ClJoinRoomRequest,
    ClPlayCardRequest,
    ClLoginSuccessResponse,
    ClRoomCreatedResponse,
    ClRoomJoinedResponse,
    ClPlayerInfo,
    ClRoomListResponse,
    ClRoomSummary,
    ClPlayerJoinedEvent,
    ClPlayerLeftEvent,
    ClGameStartedEvent,
    ClGameStateEvent,
    ClTurnStartEvent,
    ClCardPlayedEvent,
    ClTurnEndedEvent,
    ClGameEndedEvent,
    ClErrorResponse,
} from './cl_network_types';

// =============================================================================
// 核心连接层
// =============================================================================

export {
    ClWebSocketCore,
    cl_getWebSocketCore,
    cl_resetWebSocketCore,
} from './cl_websocket_core';

export type {
    ClMessageHandler,
    ClConnectionHandler,
    ClErrorHandler,
    ClDisconnectHandler,
    ClStateChangeHandler,
    ClConnectionCallbacks,
} from './cl_websocket_core';

// =============================================================================
// 认证服务
// =============================================================================

export {
    cl_getAuthService,
    cl_isAuthenticated,
    cl_getCurrentUser,
    cl_getAuthToken,
} from './cl_auth_service';

export type {
    ClAuthRequest,
    ClAuthResponse,
    ClUserInfo,
    ClAuthState,
} from './cl_auth_service';

// =============================================================================
// 进度同步服务
// =============================================================================

export {
    cl_getProgressSyncService,
} from './cl_progress_sync_service';

export type {
    ClPlayerProgress,
    ClPlayerStatistics,
} from './cl_progress_sync_service';

// =============================================================================
// 大厅服务
// =============================================================================

export {
    ClLobbyService,
    ClLobbyState,
    cl_getLobbyService,
} from './cl_lobby_service';

export type {
    ClLobbyCallbacks,
} from './cl_lobby_service';

// =============================================================================
// 战斗服务
// =============================================================================

export {
    ClBattleService,
    ClBattlePhase,
    cl_getBattleService,
} from './cl_battle_service';

export type {
    ClBattleServiceCallbacks,
} from './cl_battle_service';

// =============================================================================
// 世界同步服务 (组队探索)
// =============================================================================

export {
    ClWorldSyncService,
    cl_getWorldSyncService,
} from './cl_world_sync_service';

export type {
    ClWorldSyncEvents,
    ClRemotePlayer,
} from './cl_world_sync_service';

// 同步类型
export {
    ClSyncMessageType,
} from './cl_sync_types';

export type {
    ClPlayerPositionData,
    ClPlayerMoveData,
    ClPlayerStatusData,
    ClBattleEncounterData,
    ClBattleInviteData,
    ClBattleJoinData,
    ClChatMessageData,
    ClSyncMessage,
} from './cl_sync_types';

// =============================================================================
// MCP 服务
// =============================================================================

export {
    ClMcpService,
    cl_getMcpService,
} from './cl_mcp_service';

export type {
    ClMcpHandler,
} from './cl_mcp_service';

export type {
    ClMcpCommand,
    ClMcpSpawnEntity,
    ClMcpDeleteEntity,
    ClMcpMoveEntity,
    ClMcpClearArea,
    ClMcpSpawnBatch,
    ClMcpUndo,
} from './cl_mcp_types';

// =============================================================================
// 旧版兼容导出 (已废弃，将在未来版本移除)
// =============================================================================

/**
 * @deprecated 使用 cl_getWebSocketCore() + cl_getLobbyService() 代替
 */
export { ClNetworkClient, cl_getNetworkClient } from './cl_network';

/**
 * @deprecated 使用 cl_getBattleService() 代替
 */
export { ClNetworkBattleManager, cl_getNetworkBattleManager } from './cl_network_battle';
