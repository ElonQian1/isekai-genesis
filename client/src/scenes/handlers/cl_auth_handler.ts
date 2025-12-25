/**
 * 认证处理器
 * 
 * 职责：
 * - 处理登录/注册认证
 * - 加载/保存玩家进度
 * - 会话管理
 * 
 * 模块: client/scenes/handlers
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import { cl_getAuthService } from '../../network/cl_auth_service';
import { cl_getProgressSyncService, ClPlayerProgress } from '../../network/cl_progress_sync_service';
import { ClPlayerProgressManager } from '../../core/cl_player_progress';
import { ClGameModeManager } from '../../core/cl_game_mode_manager';
import { ClNetworkBattleManager } from '../../network/cl_network_battle';
import { ClMessageUI } from '../../ui/cl_message_ui';

// =============================================================================
// 认证处理器配置
// =============================================================================

export interface ClAuthHandlerConfig {
    progressManager: ClPlayerProgressManager;
    gameModeManager: ClGameModeManager;
    networkManager: ClNetworkBattleManager | null;
    messageUI: ClMessageUI | null;
    isOnline: boolean;
}

// =============================================================================
// 认证处理器
// =============================================================================

export class ClAuthHandler {
    private progressManager: ClPlayerProgressManager;
    private gameModeManager: ClGameModeManager;
    private networkManager: ClNetworkBattleManager | null;
    private messageUI: ClMessageUI | null;
    
    private _isOnline: boolean;
    private _serverProgress: ClPlayerProgress | null = null;
    private _localPlayerId: string = '';
    private _localPlayerName: string = '';
    private _beforeUnloadSetup: boolean = false;

    constructor(config: ClAuthHandlerConfig) {
        this.progressManager = config.progressManager;
        this.gameModeManager = config.gameModeManager;
        this.networkManager = config.networkManager;
        this.messageUI = config.messageUI;
        this._isOnline = config.isOnline;
    }

    // =========================================================================
    // 公共方法
    // =========================================================================

    /** 获取服务器进度 */
    get serverProgress(): ClPlayerProgress | null {
        return this._serverProgress;
    }

    /** 获取本地玩家 ID */
    get localPlayerId(): string {
        return this._localPlayerId;
    }

    /** 获取本地玩家名称 */
    get localPlayerName(): string {
        return this._localPlayerName;
    }

    /** 是否在线 */
    get isOnline(): boolean {
        return this._isOnline;
    }

    /** 设置在线状态 */
    setOnline(online: boolean): void {
        this._isOnline = online;
    }

    /**
     * 检查是否已认证
     */
    checkSavedAuth(): { userId: string; username: string } | null {
        const authService = cl_getAuthService();
        if (authService.isAuthenticated && authService.user) {
            return {
                userId: authService.user.user_id,
                username: authService.user.username,
            };
        }
        return null;
    }

    /**
     * 处理快速登录 (无数据库)
     */
    async handleQuickLogin(name: string): Promise<{ playerId: string; playerName: string; profession: string | null }> {
        const tempId = `player_${Date.now()}`;
        return this.handleAuthSuccess(tempId, name);
    }

    /**
     * 处理认证成功
     */
    async handleAuthSuccess(userId: string, username: string): Promise<{ playerId: string; playerName: string; profession: string | null }> {
        this._localPlayerId = userId;
        this._localPlayerName = username;
        
        console.log(`🎮 认证成功: ${username} (${userId})`);
        
        // 从服务器加载玩家进度
        const progressSync = cl_getProgressSyncService();
        this._serverProgress = await progressSync.loadProgress();
        if (this._serverProgress) {
            console.log(`📥 已加载服务器进度: 位置(${this._serverProgress.world_position_x}, ${this._serverProgress.world_position_y}, ${this._serverProgress.world_position_z})`);
        } else {
            this._serverProgress = progressSync.getDefaultProgress();
            console.log('📥 使用默认进度');
        }
        
        // 启动自动保存 (每 30 秒)
        progressSync.startAutoSave(30);
        
        // 设置页面关闭时保存进度
        this.setupBeforeUnloadHandler();
        
        // 初始化玩家进度
        this.progressManager.initPlayer(userId, username);
        const playerLevel = this.progressManager.getLevel();
        
        // 设置玩家信息 (包含等级)
        this.gameModeManager.setPlayerInfo(userId, username, playerLevel);
        
        // 尝试连接服务器 (可选，单人模式不需要)
        if (!this._isOnline) {
            try {
                await this.networkManager?.connect();
                this.networkManager?.login(userId, username);
                this._isOnline = true;
                this.gameModeManager.setOnlineStatus(true);
            } catch (e) {
                console.warn('⚠️ 连接服务器失败，使用离线模式 (单人游玩可用)');
                this._isOnline = false;
                this.gameModeManager.setOnlineStatus(false);
            }
        }
        
        // 显示欢迎消息
        this.messageUI?.info(`欢迎回来, ${username}! 等级: ${playerLevel}`);
        
        // 获取职业
        const profession = this.progressManager.getProfession();
        
        return {
            playerId: userId,
            playerName: username,
            profession,
        };
    }

    /**
     * 设置页面关闭前保存进度
     */
    private setupBeforeUnloadHandler(): void {
        if (this._beforeUnloadSetup) return;
        this._beforeUnloadSetup = true;
        
        window.addEventListener('beforeunload', () => {
            const progressSync = cl_getProgressSyncService();
            progressSync.flushIfDirty();
        });
        
        // 页面隐藏时也尝试保存 (移动端支持)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                const progressSync = cl_getProgressSyncService();
                progressSync.flushIfDirty();
            }
        });
        
        console.log('📦 已设置页面关闭前自动保存');
    }

    /**
     * 更新服务器进度
     */
    updateServerProgress(progress: Partial<ClPlayerProgress>): void {
        if (this._serverProgress) {
            this._serverProgress = { ...this._serverProgress, ...progress };
            const progressSync = cl_getProgressSyncService();
            progressSync.markDirty(this._serverProgress);
        }
    }
}
