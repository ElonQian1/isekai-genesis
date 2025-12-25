/**
 * 游戏模式管理器
 * 
 * 负责游戏模式的生命周期管理，包括：
 * - 模式切换和状态管理
 * - 单人/组队模式流程控制
 * - 会话管理和事件分发
 * 
 * 模块: client/core
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import {
    ClGameMode,
    ClGameModeConfig,
    ClSessionState,
    ClGameSession,
    ClTeamMember,
    CL_GAME_MODE_CONFIGS,
    cl_createSession,
    cl_isModeAvailable,
} from './cl_game_mode_types';

// =============================================================================
// 事件类型
// =============================================================================

/**
 * 游戏模式管理器事件
 */
export interface ClGameModeEvents {
    /** 模式变更 */
    onModeChange: (mode: ClGameMode | null, prevMode: ClGameMode | null) => void;
    
    /** 会话状态变更 */
    onSessionStateChange: (state: ClSessionState, prevState: ClSessionState) => void;
    
    /** 队伍成员变更 */
    onTeamChange: (members: ClTeamMember[]) => void;
    
    /** 需要显示房间 UI */
    onShowRoomUI: (session: ClGameSession) => void;
    
    /** 需要开始游戏 */
    onStartGame: (session: ClGameSession) => void;
    
    /** 错误 */
    onError: (code: string, message: string) => void;
}

// =============================================================================
// 游戏模式管理器
// =============================================================================

export class ClGameModeManager {
    // 当前状态
    private currentMode: ClGameMode | null = null;
    private currentSession: ClGameSession | null = null;
    
    // 玩家信息
    private playerId: string = '';
    private playerName: string = '';
    private playerLevel: number = 1;
    
    // 网络状态
    private isOnline: boolean = false;
    
    // 事件回调
    private events: Partial<ClGameModeEvents> = {};

    constructor() {
        console.log('🎮 游戏模式管理器初始化');
    }

    // =========================================================================
    // 初始化
    // =========================================================================

    /**
     * 设置玩家信息
     */
    setPlayerInfo(playerId: string, playerName: string, level: number = 1): void {
        this.playerId = playerId;
        this.playerName = playerName;
        this.playerLevel = level;
        console.log(`👤 玩家信息: ${playerName} (Lv.${level})`);
    }

    /**
     * 设置网络状态
     */
    setOnlineStatus(isOnline: boolean): void {
        this.isOnline = isOnline;
        console.log(`🌐 网络状态: ${isOnline ? '在线' : '离线'}`);
    }

    /**
     * 设置事件回调
     */
    setEvents(events: Partial<ClGameModeEvents>): void {
        this.events = { ...this.events, ...events };
    }

    // =========================================================================
    // 模式选择
    // =========================================================================

    /**
     * 选择游戏模式
     */
    selectMode(mode: ClGameMode): boolean {
        // 检查模式是否可用
        if (!cl_isModeAvailable(mode, this.isOnline)) {
            const config = CL_GAME_MODE_CONFIGS[mode];
            const reason = !config.unlocked 
                ? config.unlockRequirement || '未解锁'
                : '需要联网';
            this.events.onError?.('MODE_UNAVAILABLE', `无法选择该模式: ${reason}`);
            return false;
        }

        const prevMode = this.currentMode;
        this.currentMode = mode;
        
        console.log(`🎯 选择模式: ${CL_GAME_MODE_CONFIGS[mode].name}`);
        this.events.onModeChange?.(mode, prevMode);
        
        return true;
    }

    /**
     * 开始游戏 (根据当前模式)
     */
    startGame(): boolean {
        if (!this.currentMode) {
            this.events.onError?.('NO_MODE', '请先选择游戏模式');
            return false;
        }

        const config = CL_GAME_MODE_CONFIGS[this.currentMode];
        
        // 创建会话
        this.currentSession = cl_createSession(
            this.currentMode,
            this.playerId,
            this.playerName
        );

        // 根据模式类型决定流程
        if (config.minPlayers === 1 && config.maxPlayers === 1) {
            // 单人模式 - 直接开始
            return this.startSoloGame();
        } else if (config.requiresNetwork) {
            // 多人模式 - 进入房间流程
            return this.startMultiplayerFlow();
        } else {
            // 离线多人 (不应该发生)
            this.events.onError?.('INVALID_MODE', '模式配置错误');
            return false;
        }
    }

    // =========================================================================
    // 单人模式
    // =========================================================================

    /**
     * 开始单人游戏
     */
    private startSoloGame(): boolean {
        if (!this.currentSession) return false;

        console.log('🗡️ 开始单人游戏');
        
        // 直接设置为探索状态
        this.updateSessionState(ClSessionState.Exploring);
        
        // 触发开始游戏
        this.events.onStartGame?.(this.currentSession);
        
        return true;
    }

    // =========================================================================
    // 多人模式
    // =========================================================================

    /**
     * 开始多人流程 (显示房间 UI)
     */
    private startMultiplayerFlow(): boolean {
        if (!this.currentSession) return false;

        console.log('👥 进入多人模式流程');
        
        // 设置为等待状态
        this.updateSessionState(ClSessionState.Waiting);
        
        // 显示房间 UI
        this.events.onShowRoomUI?.(this.currentSession);
        
        return true;
    }

    /**
     * 创建房间
     */
    createRoom(roomName: string): void {
        if (!this.currentSession) {
            this.events.onError?.('NO_SESSION', '会话未创建');
            return;
        }

        console.log(`🏠 创建房间: ${roomName}`);
        
        // 生成房间 ID
        this.currentSession.roomId = `room_${Date.now()}`;
        this.currentSession.isHost = true;
        
        // 更新会话状态
        this.updateSessionState(ClSessionState.Waiting);
    }

    /**
     * 加入房间
     */
    joinRoom(roomId: string): void {
        if (!this.currentSession) {
            this.events.onError?.('NO_SESSION', '会话未创建');
            return;
        }

        console.log(`🚪 加入房间: ${roomId}`);
        
        this.currentSession.roomId = roomId;
        this.currentSession.isHost = false;
        
        this.updateSessionState(ClSessionState.Waiting);
    }

    /**
     * 离开房间
     */
    leaveRoom(): void {
        if (!this.currentSession) return;

        console.log('🚪 离开房间');
        
        this.currentSession.roomId = undefined;
        this.currentSession.teamMembers = [{
            id: this.playerId,
            name: this.playerName,
            level: this.playerLevel,
            isHost: true,
            isReady: false,
            isOnline: true,
        }];
        
        this.updateSessionState(ClSessionState.Idle);
    }

    /**
     * 玩家准备
     */
    setReady(isReady: boolean): void {
        if (!this.currentSession) return;

        const self = this.currentSession.teamMembers.find(m => m.id === this.playerId);
        if (self) {
            self.isReady = isReady;
            this.events.onTeamChange?.(this.currentSession.teamMembers);
        }
    }

    /**
     * 开始多人游戏 (房主调用)
     */
    startMultiplayerGame(): boolean {
        if (!this.currentSession) {
            this.events.onError?.('NO_SESSION', '会话未创建');
            return false;
        }

        if (!this.currentSession.isHost) {
            this.events.onError?.('NOT_HOST', '只有房主可以开始游戏');
            return false;
        }

        const config = CL_GAME_MODE_CONFIGS[this.currentSession.mode];

        // 检查人数
        if (this.currentSession.teamMembers.length < config.minPlayers) {
            this.events.onError?.('NOT_ENOUGH_PLAYERS', 
                `需要至少 ${config.minPlayers} 名玩家`);
            return false;
        }

        // 检查准备状态 (房主不需要准备)
        const otherPlayers = this.currentSession.teamMembers.filter(m => m.id !== this.playerId);
        const allReady = otherPlayers.every(m => m.isReady);
        
        if (!allReady && otherPlayers.length > 0) {
            this.events.onError?.('NOT_ALL_READY', '还有玩家未准备');
            return false;
        }

        console.log('⚔️ 开始多人游戏');
        
        this.updateSessionState(ClSessionState.Exploring);
        this.events.onStartGame?.(this.currentSession);
        
        return true;
    }

    // =========================================================================
    // 队伍管理
    // =========================================================================

    /**
     * 添加队伍成员 (收到服务器通知)
     */
    addTeamMember(member: ClTeamMember): void {
        if (!this.currentSession) return;

        // 检查是否已存在
        const exists = this.currentSession.teamMembers.some(m => m.id === member.id);
        if (!exists) {
            this.currentSession.teamMembers.push(member);
            console.log(`👤+ 玩家加入: ${member.name}`);
            this.events.onTeamChange?.(this.currentSession.teamMembers);
        }
    }

    /**
     * 移除队伍成员
     */
    removeTeamMember(memberId: string): void {
        if (!this.currentSession) return;

        const index = this.currentSession.teamMembers.findIndex(m => m.id === memberId);
        if (index >= 0) {
            const member = this.currentSession.teamMembers[index];
            this.currentSession.teamMembers.splice(index, 1);
            console.log(`👤- 玩家离开: ${member.name}`);
            this.events.onTeamChange?.(this.currentSession.teamMembers);
        }
    }

    /**
     * 更新队伍成员状态
     */
    updateTeamMember(memberId: string, updates: Partial<ClTeamMember>): void {
        if (!this.currentSession) return;

        const member = this.currentSession.teamMembers.find(m => m.id === memberId);
        if (member) {
            Object.assign(member, updates);
            this.events.onTeamChange?.(this.currentSession.teamMembers);
        }
    }

    // =========================================================================
    // 状态管理
    // =========================================================================

    /**
     * 更新会话状态
     */
    private updateSessionState(newState: ClSessionState): void {
        if (!this.currentSession) return;

        const prevState = this.currentSession.state;
        this.currentSession.state = newState;
        
        console.log(`📍 会话状态: ${prevState} → ${newState}`);
        this.events.onSessionStateChange?.(newState, prevState);
    }

    /**
     * 进入战斗状态
     */
    enterBattle(): void {
        this.updateSessionState(ClSessionState.InBattle);
    }

    /**
     * 离开战斗状态
     */
    leaveBattle(): void {
        if (!this.currentSession) return;

        // 回到探索状态
        this.updateSessionState(ClSessionState.Exploring);
    }

    /**
     * 结束游戏
     */
    endGame(): void {
        console.log('🏁 结束游戏');
        
        const prevMode = this.currentMode;
        this.currentMode = null;
        this.currentSession = null;
        
        this.events.onModeChange?.(null, prevMode);
    }

    // =========================================================================
    // Getters
    // =========================================================================

    getCurrentMode(): ClGameMode | null {
        return this.currentMode;
    }

    getCurrentModeConfig(): ClGameModeConfig | null {
        return this.currentMode ? CL_GAME_MODE_CONFIGS[this.currentMode] : null;
    }

    getCurrentSession(): ClGameSession | null {
        return this.currentSession;
    }

    getSessionState(): ClSessionState {
        return this.currentSession?.state ?? ClSessionState.Idle;
    }

    getTeamMembers(): ClTeamMember[] {
        return this.currentSession?.teamMembers ?? [];
    }

    isHost(): boolean {
        return this.currentSession?.isHost ?? false;
    }

    isSoloMode(): boolean {
        if (!this.currentMode) return false;
        const config = CL_GAME_MODE_CONFIGS[this.currentMode];
        return config.maxPlayers === 1;
    }

    isMultiplayerMode(): boolean {
        if (!this.currentMode) return false;
        const config = CL_GAME_MODE_CONFIGS[this.currentMode];
        return config.maxPlayers > 1;
    }

    getIsOnline(): boolean {
        return this.isOnline;
    }
}

// =============================================================================
// 单例
// =============================================================================

let gameModeManagerInstance: ClGameModeManager | null = null;

/**
 * 获取游戏模式管理器实例
 */
export function cl_getGameModeManager(): ClGameModeManager {
    if (!gameModeManagerInstance) {
        gameModeManagerInstance = new ClGameModeManager();
    }
    return gameModeManagerInstance;
}

/**
 * 重置游戏模式管理器 (测试用)
 */
export function cl_resetGameModeManager(): void {
    gameModeManagerInstance = null;
}
