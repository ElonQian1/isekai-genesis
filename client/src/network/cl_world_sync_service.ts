/**
 * 组队世界同步服务
 * 
 * 处理多人大世界探索时的实时同步：
 * - 玩家位置同步
 * - 战斗邀请和加入
 * - 聊天和表情
 * 
 * 模块: client/network
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import { ClWebSocketCore } from './cl_websocket_core';
import { ClMessageType } from './cl_network_types';
import {
    ClPlayerPositionData,
    ClPlayerMoveData,
    ClPlayerStatusData,
    ClBattleEncounterData,
    ClBattleInviteData,
    ClBattleJoinData,
    ClChatMessageData,
} from './cl_sync_types';

// =============================================================================
// 配置
// =============================================================================

const CL_SYNC_CONFIG = {
    /** 位置同步间隔 (ms) */
    positionSyncInterval: 100,
    
    /** 位置插值时长 (ms) */
    positionLerpDuration: 150,
    
    /** 战斗邀请超时 (ms) */
    battleInviteTimeout: 15000,
    
    /** 最大同步玩家数 */
    maxSyncPlayers: 32,
};

// =============================================================================
// 事件回调类型
// =============================================================================

export interface ClWorldSyncEvents {
    /** 其他玩家位置更新 */
    onPlayerPositionUpdate: (data: ClPlayerPositionData) => void;
    
    /** 其他玩家移动 */
    onPlayerMove: (data: ClPlayerMoveData) => void;
    
    /** 玩家状态更新 */
    onPlayerStatusUpdate: (data: ClPlayerStatusData) => void;
    
    /** 玩家加入世界 */
    onPlayerJoinWorld: (data: ClPlayerStatusData) => void;
    
    /** 玩家离开世界 */
    onPlayerLeaveWorld: (playerId: string) => void;
    
    /** 收到战斗遭遇 */
    onBattleEncounter: (data: ClBattleEncounterData) => void;
    
    /** 收到战斗邀请 */
    onBattleInvite: (data: ClBattleInviteData) => void;
    
    /** 玩家加入战斗 */
    onPlayerJoinBattle: (data: ClBattleJoinData) => void;
    
    /** 收到聊天消息 */
    onChatMessage: (data: ClChatMessageData) => void;
}

// =============================================================================
// 远程玩家数据
// =============================================================================

export interface ClRemotePlayer {
    id: string;
    name: string;
    level: number;
    
    // 位置
    position: { x: number; y: number; z: number };
    rotationY: number;
    
    // 插值目标
    targetPosition: { x: number; y: number; z: number };
    targetRotationY: number;
    
    // 状态
    status: 'idle' | 'moving' | 'in_battle' | 'offline';
    lastUpdateTime: number;
}

// =============================================================================
// 组队世界同步服务
// =============================================================================

export class ClWorldSyncService {
    private wsCore: ClWebSocketCore;
    private events: Partial<ClWorldSyncEvents> = {};
    
    // 当前会话
    private sessionId: string = '';
    private localPlayerId: string = '';
    
    // 远程玩家
    private remotePlayers: Map<string, ClRemotePlayer> = new Map();
    
    // 位置同步
    private positionSyncTimer: number | null = null;
    private lastSentPosition: ClPlayerPositionData | null = null;

    constructor(wsCore: ClWebSocketCore) {
        this.wsCore = wsCore;
        this.setupMessageHandlers();
    }

    // =========================================================================
    // 初始化
    // =========================================================================

    /**
     * 设置事件回调
     */
    setEvents(events: Partial<ClWorldSyncEvents>): void {
        this.events = { ...this.events, ...events };
    }

    /**
     * 设置消息处理器
     */
    private setupMessageHandlers(): void {
        // 玩家位置更新
        this.wsCore.on<ClPlayerPositionData>(ClMessageType.PlayerPosition, (data) => {
            if (data && data.playerId !== this.localPlayerId) {
                this.handlePlayerPosition(data);
            }
        });

        // 玩家移动
        this.wsCore.on<ClPlayerMoveData>(ClMessageType.PlayerMove, (data) => {
            if (data && data.playerId !== this.localPlayerId) {
                this.events.onPlayerMove?.(data);
            }
        });

        // 玩家状态
        this.wsCore.on<ClPlayerStatusData>(ClMessageType.PlayerStatus, (data) => {
            if (data) {
                this.handlePlayerStatus(data);
            }
        });

        // 战斗遭遇
        this.wsCore.on<ClBattleEncounterData>(ClMessageType.BattleEncounter, (data) => {
            if (data) {
                this.events.onBattleEncounter?.(data);
            }
        });

        // 战斗邀请
        this.wsCore.on<ClBattleInviteData>(ClMessageType.BattleInvite, (data) => {
            if (data) {
                this.events.onBattleInvite?.(data);
            }
        });

        // 战斗加入
        this.wsCore.on<ClBattleJoinData>(ClMessageType.BattleJoin, (data) => {
            if (data) {
                this.events.onPlayerJoinBattle?.(data);
            }
        });

        // 聊天消息
        this.wsCore.on<ClChatMessageData>(ClMessageType.Chat, (data) => {
            if (data) {
                this.events.onChatMessage?.(data);
            }
        });
    }

    // =========================================================================
    // 会话管理
    // =========================================================================

    /**
     * 加入世界同步
     */
    joinWorld(sessionId: string, playerId: string): void {
        this.sessionId = sessionId;
        this.localPlayerId = playerId;
        
        console.log(`🌍 加入世界同步: ${sessionId}`);
        
        // 开始位置同步
        this.startPositionSync();
    }

    /**
     * 离开世界同步
     */
    leaveWorld(): void {
        console.log('🌍 离开世界同步');
        
        this.stopPositionSync();
        this.remotePlayers.clear();
        this.sessionId = '';
    }

    // =========================================================================
    // 位置同步
    // =========================================================================

    /**
     * 开始位置同步
     */
    private startPositionSync(): void {
        if (this.positionSyncTimer !== null) return;
        
        this.positionSyncTimer = window.setInterval(() => {
            // 位置同步由外部调用 sendPosition 触发
        }, CL_SYNC_CONFIG.positionSyncInterval);
    }

    /**
     * 停止位置同步
     */
    private stopPositionSync(): void {
        if (this.positionSyncTimer !== null) {
            clearInterval(this.positionSyncTimer);
            this.positionSyncTimer = null;
        }
    }

    /**
     * 发送本地玩家位置
     */
    sendPosition(x: number, y: number, z: number, rotationY: number): void {
        if (!this.sessionId) return;

        const data: ClPlayerPositionData = {
            playerId: this.localPlayerId,
            x, y, z,
            rotationY,
            timestamp: Date.now(),
        };

        // 只在位置变化时发送
        if (this.shouldSendPosition(data)) {
            this.wsCore.send(ClMessageType.PlayerPosition, data);
            this.lastSentPosition = data;
        }
    }

    /**
     * 检查是否需要发送位置更新
     */
    private shouldSendPosition(newPos: ClPlayerPositionData): boolean {
        if (!this.lastSentPosition) return true;

        const dx = Math.abs(newPos.x - this.lastSentPosition.x);
        const dz = Math.abs(newPos.z - this.lastSentPosition.z);
        const dr = Math.abs(newPos.rotationY - this.lastSentPosition.rotationY);

        // 位置变化超过阈值才发送
        return dx > 0.1 || dz > 0.1 || dr > 0.1;
    }

    /**
     * 处理其他玩家位置更新
     */
    private handlePlayerPosition(data: ClPlayerPositionData): void {
        let player = this.remotePlayers.get(data.playerId);
        
        if (!player) {
            // 新玩家，创建记录
            player = {
                id: data.playerId,
                name: `Player_${data.playerId.substring(0, 6)}`,
                level: 1,
                position: { x: data.x, y: data.y, z: data.z },
                rotationY: data.rotationY,
                targetPosition: { x: data.x, y: data.y, z: data.z },
                targetRotationY: data.rotationY,
                status: 'idle',
                lastUpdateTime: Date.now(),
            };
            this.remotePlayers.set(data.playerId, player);
        } else {
            // 更新目标位置 (用于插值)
            player.targetPosition = { x: data.x, y: data.y, z: data.z };
            player.targetRotationY = data.rotationY;
            player.lastUpdateTime = Date.now();
        }

        this.events.onPlayerPositionUpdate?.(data);
    }

    /**
     * 处理玩家状态更新
     */
    private handlePlayerStatus(data: ClPlayerStatusData): void {
        let player = this.remotePlayers.get(data.playerId);
        
        if (!player) {
            // 新玩家加入
            player = {
                id: data.playerId,
                name: data.name,
                level: data.level,
                position: { x: 0, y: 0, z: 0 },
                rotationY: 0,
                targetPosition: { x: 0, y: 0, z: 0 },
                targetRotationY: 0,
                status: data.status,
                lastUpdateTime: Date.now(),
            };
            this.remotePlayers.set(data.playerId, player);
            this.events.onPlayerJoinWorld?.(data);
        } else {
            player.name = data.name;
            player.level = data.level;
            player.status = data.status;
            
            if (data.status === 'offline') {
                this.remotePlayers.delete(data.playerId);
                this.events.onPlayerLeaveWorld?.(data.playerId);
            } else {
                this.events.onPlayerStatusUpdate?.(data);
            }
        }
    }

    // =========================================================================
    // 战斗同步
    // =========================================================================

    /**
     * 广播战斗遭遇
     */
    broadcastBattleEncounter(
        encounterId: string,
        enemyId: string,
        enemyName: string,
        enemyLevel: number,
        position: { x: number; y: number; z: number }
    ): void {
        if (!this.sessionId) return;

        const data: ClBattleEncounterData = {
            encounterId,
            triggeredBy: this.localPlayerId,
            enemyId,
            enemyName,
            enemyLevel,
            position,
            timestamp: Date.now(),
        };

        this.wsCore.send(ClMessageType.BattleEncounter, data);
    }

    /**
     * 发送战斗邀请
     */
    sendBattleInvite(encounterId: string, enemyName: string): void {
        if (!this.sessionId) return;

        const data: ClBattleInviteData = {
            encounterId,
            inviterId: this.localPlayerId,
            inviterName: '', // 由服务器填充
            enemyName,
            expiresAt: Date.now() + CL_SYNC_CONFIG.battleInviteTimeout,
        };

        this.wsCore.send(ClMessageType.BattleInvite, data);
    }

    /**
     * 加入战斗
     */
    joinBattle(encounterId: string): void {
        if (!this.sessionId) return;

        const data: ClBattleJoinData = {
            encounterId,
            playerId: this.localPlayerId,
            playerName: '', // 由服务器填充
        };

        this.wsCore.send(ClMessageType.BattleJoin, data);
    }

    // =========================================================================
    // 聊天
    // =========================================================================

    /**
     * 发送聊天消息
     */
    sendChatMessage(message: string, channel: 'team' | 'world' = 'team'): void {
        if (!this.sessionId) return;

        const data: ClChatMessageData = {
            senderId: this.localPlayerId,
            senderName: '', // 由服务器填充
            message,
            channel,
            timestamp: Date.now(),
        };

        this.wsCore.send(ClMessageType.Chat, data);
    }

    // =========================================================================
    // 查询
    // =========================================================================

    /**
     * 获取所有远程玩家
     */
    getRemotePlayers(): ClRemotePlayer[] {
        return Array.from(this.remotePlayers.values());
    }

    /**
     * 获取指定远程玩家
     */
    getRemotePlayer(playerId: string): ClRemotePlayer | undefined {
        return this.remotePlayers.get(playerId);
    }

    /**
     * 获取远程玩家数量
     */
    getRemotePlayerCount(): number {
        return this.remotePlayers.size;
    }

    /**
     * 更新玩家插值位置 (每帧调用)
     */
    updatePlayerInterpolation(deltaTime: number): void {
        const lerpFactor = Math.min(1, deltaTime / CL_SYNC_CONFIG.positionLerpDuration * 1000);
        
        this.remotePlayers.forEach(player => {
            // 位置插值
            player.position.x += (player.targetPosition.x - player.position.x) * lerpFactor;
            player.position.y += (player.targetPosition.y - player.position.y) * lerpFactor;
            player.position.z += (player.targetPosition.z - player.position.z) * lerpFactor;
            
            // 旋转插值
            player.rotationY += (player.targetRotationY - player.rotationY) * lerpFactor;
        });
    }
}

// =============================================================================
// 单例
// =============================================================================

let worldSyncServiceInstance: ClWorldSyncService | null = null;

/**
 * 获取世界同步服务实例
 */
export function cl_getWorldSyncService(wsCore: ClWebSocketCore): ClWorldSyncService {
    if (!worldSyncServiceInstance) {
        worldSyncServiceInstance = new ClWorldSyncService(wsCore);
    }
    return worldSyncServiceInstance;
}
