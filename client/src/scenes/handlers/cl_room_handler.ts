/**
 * 房间处理器
 * 
 * 职责：
 * - 创建/加入房间
 * - 房间成员管理
 * - 准备状态同步
 * 
 * 模块: client/scenes/handlers
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import { ClGameModeManager, ClGameMode } from '../../core';
import { ClNetworkBattleManager } from '../../network/cl_network_battle';
import { ClLobbyUI, ClRoomUI, ClRoomData } from '../../ui/cl_lobby_ui';
import { ClMessageUI } from '../../ui/cl_message_ui';

// =============================================================================
// 房间处理器配置
// =============================================================================

export interface ClRoomHandlerConfig {
    gameModeManager: ClGameModeManager;
    networkManager: ClNetworkBattleManager | null;
    lobbyUI: ClLobbyUI | null;
    roomUI: ClRoomUI | null;
    messageUI: ClMessageUI | null;
    isOnline: boolean;
}

// =============================================================================
// 房间回调
// =============================================================================

export interface ClRoomHandlerCallbacks {
    onPhaseChange: (phase: 'lobby' | 'room' | 'mode_select') => void;
    onStartGame: (mode: ClGameMode) => void;
}

// =============================================================================
// 房间处理器
// =============================================================================

export class ClRoomHandler {
    private gameModeManager: ClGameModeManager;
    private networkManager: ClNetworkBattleManager | null;
    private lobbyUI: ClLobbyUI | null;
    private roomUI: ClRoomUI | null;
    private messageUI: ClMessageUI | null;
    private isOnline: boolean;
    private callbacks: ClRoomHandlerCallbacks | null = null;

    constructor(config: ClRoomHandlerConfig) {
        this.gameModeManager = config.gameModeManager;
        this.networkManager = config.networkManager;
        this.lobbyUI = config.lobbyUI;
        this.roomUI = config.roomUI;
        this.messageUI = config.messageUI;
        this.isOnline = config.isOnline;
    }

    // =========================================================================
    // 设置
    // =========================================================================

    /** 设置回调 */
    setCallbacks(callbacks: ClRoomHandlerCallbacks): void {
        this.callbacks = callbacks;
    }

    /** 更新在线状态 */
    setOnline(online: boolean): void {
        this.isOnline = online;
    }

    // =========================================================================
    // 房间操作
    // =========================================================================

    /**
     * 处理创建房间
     */
    handleCreateRoom(name: string): void {
        console.log(`🏠 创建房间: ${name}`);
        
        if (!this.isOnline) {
            // 离线模式模拟
            const roomId = `offline_${Date.now()}`;
            this.roomUI?.setRoomId(roomId);
            this.gameModeManager.createRoom(roomId);
            this.callbacks?.onPhaseChange('room');
            return;
        }
        
        this.networkManager?.createRoom(name);
    }

    /**
     * 处理加入房间
     */
    handleJoinRoom(roomId: string): void {
        console.log(`🚪 加入房间: ${roomId}`);
        
        if (!this.isOnline) {
            this.messageUI?.error('离线模式无法加入房间');
            return;
        }
        
        this.networkManager?.joinRoom(roomId);
    }

    /**
     * 处理离开房间
     */
    handleLeaveRoom(): void {
        console.log('🚶 离开房间');
        
        this.gameModeManager.leaveRoom();
        this.callbacks?.onPhaseChange('lobby');
        
        if (this.isOnline) {
            this.networkManager?.leaveRoom();
        }
    }

    /**
     * 处理准备
     */
    handleReady(): void {
        console.log('✅ 玩家准备');
        
        this.gameModeManager.setReady(true);
        
        // 网络同步在 GameModeManager 的回调中处理
    }

    /**
     * 刷新房间列表
     */
    handleRefreshRooms(): void {
        console.log('🔄 刷新房间列表');
        
        if (!this.isOnline) {
            // 离线模式显示空列表
            this.lobbyUI?.updateRoomList([]);
            return;
        }
        
        // TODO: 实际从服务器获取房间列表
        const mockRooms: ClRoomData[] = [
            { id: 'room_1', name: '测试房间 1', playerCount: 2, maxPlayers: 4, status: 'waiting' },
            { id: 'room_2', name: '新手欢迎', playerCount: 1, maxPlayers: 4, status: 'waiting' },
        ];
        
        this.lobbyUI?.updateRoomList(mockRooms);
    }

    /**
     * 处理开始多人游戏
     */
    handleStartMultiplayerGame(): void {
        console.log('🎮 开始多人游戏');
        
        const session = this.gameModeManager.getCurrentSession();
        if (!session) {
            this.messageUI?.error('没有活动的游戏会话');
            return;
        }
        
        // 检查是否是房主
        if (!session.isHost) {
            this.messageUI?.error('只有房主可以开始游戏');
            return;
        }
        
        // 检查所有玩家是否准备
        const allReady = session.teamMembers.every(m => m.isReady || m.isHost);
        if (!allReady) {
            this.messageUI?.warning('等待所有玩家准备...');
            return;
        }
        
        // 开始游戏
        if (this.isOnline) {
            this.networkManager?.startGame();
        } else {
            this.callbacks?.onStartGame(session.mode);
        }
    }
}
