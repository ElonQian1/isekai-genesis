/**
 * 组队同步消息类型
 * 
 * 定义多人大世界探索时的同步消息格式
 * 
 * 模块: client/network
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

// =============================================================================
// 同步消息类型
// =============================================================================

/**
 * 同步消息类型枚举
 */
export enum ClSyncMessageType {
    // 玩家移动
    PlayerMove = 'player_move',
    PlayerPosition = 'player_position',
    
    // 战斗相关
    BattleEncounter = 'battle_encounter',
    BattleInvite = 'battle_invite',
    BattleJoin = 'battle_join',
    BattleStart = 'battle_start',
    BattleEnd = 'battle_end',
    
    // 交互
    Interact = 'interact',
    Chat = 'chat',
    Emote = 'emote',
    
    // 状态同步
    PlayerStatus = 'player_status',
    WorldState = 'world_state',
}

// =============================================================================
// 玩家同步数据
// =============================================================================

/**
 * 玩家位置数据
 */
export interface ClPlayerPositionData {
    playerId: string;
    x: number;
    y: number;
    z: number;
    rotationY: number;
    timestamp: number;
}

/**
 * 玩家移动数据 (增量)
 */
export interface ClPlayerMoveData {
    playerId: string;
    dx: number;  // x方向速度
    dz: number;  // z方向速度
    isMoving: boolean;
    timestamp: number;
}

/**
 * 玩家状态数据
 */
export interface ClPlayerStatusData {
    playerId: string;
    name: string;
    level: number;
    hp: number;
    maxHp: number;
    status: 'idle' | 'moving' | 'in_battle' | 'offline';
}

// =============================================================================
// 战斗同步数据
// =============================================================================

/**
 * 遭遇战数据
 */
export interface ClBattleEncounterData {
    encounterId: string;
    triggeredBy: string;  // 触发玩家ID
    enemyId: string;
    enemyName: string;
    enemyLevel: number;
    position: { x: number; y: number; z: number };
    timestamp: number;
}

/**
 * 战斗邀请数据
 */
export interface ClBattleInviteData {
    encounterId: string;
    inviterId: string;
    inviterName: string;
    enemyName: string;
    expiresAt: number;  // 邀请过期时间
}

/**
 * 战斗加入数据
 */
export interface ClBattleJoinData {
    encounterId: string;
    playerId: string;
    playerName: string;
}

// =============================================================================
// 交互数据
// =============================================================================

/**
 * 聊天消息数据
 */
export interface ClChatMessageData {
    senderId: string;
    senderName: string;
    message: string;
    channel: 'team' | 'world' | 'system';
    timestamp: number;
}

/**
 * 表情数据
 */
export interface ClEmoteData {
    playerId: string;
    emoteId: string;
    timestamp: number;
}

// =============================================================================
// 同步消息基础结构
// =============================================================================

/**
 * 同步消息基础接口
 */
export interface ClSyncMessage<T = unknown> {
    type: ClSyncMessageType;
    sessionId: string;
    senderId: string;
    data: T;
    timestamp: number;
}

/**
 * 创建同步消息
 */
export function cl_createSyncMessage<T>(
    type: ClSyncMessageType,
    sessionId: string,
    senderId: string,
    data: T
): ClSyncMessage<T> {
    return {
        type,
        sessionId,
        senderId,
        data,
        timestamp: Date.now(),
    };
}
