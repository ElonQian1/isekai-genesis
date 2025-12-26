/**
 * 游戏场景管理器 v2
 * 
 * 基于游戏模式系统的场景管理器，支持：
 * - 单人/组队模式切换
 * - 游戏模式选择流程
 * - 玩家进度和解锁系统
 * - 清晰的状态机管理
 * 
 * 模块: client
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import { Scene } from '@babylonjs/core';
import { AdvancedDynamicTexture } from '@babylonjs/gui';

// UI 组件
import { ClLoginUI } from './ui/cl_login_ui';
import { ClAuthUI } from './ui/cl_auth_ui';
import { ClClassSelectUI } from './ui/cl_class_select_ui';
import { ClLobbyUI, ClRoomUI } from './ui/cl_lobby_ui';
import { ClMessageUI } from './ui/cl_message_ui';
import { ClGameModeUI } from './ui/cl_game_mode_ui';

// 核心模块
import {
    ClGameMode,
    ClSessionState,
    cl_getGameModeManager,
    ClGameModeManager,
    cl_getPlayerProgressManager,
    ClPlayerProgressManager,
} from './core';

// 网络 (使用新架构，降级到旧版)
import { 
    ClNetworkBattleManager, 
    cl_getNetworkBattleManager 
} from './network/cl_network_battle';
import { cl_getMcpService } from './network/cl_mcp_service';
import { cl_getWebSocketCore } from './network/cl_websocket_core';
import { cl_getAuthService } from './network/cl_auth_service';
import { cl_getProgressSyncService, ClPlayerProgress } from './network/cl_progress_sync_service';

// 战斗状态类型
import { ClBattleState } from './cl_battle_manager';

// 场景控制器
import { ClWorldSceneController, ClEncounterData } from './scenes/cl_world_scene_controller';
import { ClBattleSceneController } from './scenes/cl_battle_scene_controller';

// 处理器 (使用正式版本，不是占位符)
import { ClAuthHandler, ClRoomHandler } from './scenes/handlers/index';

// =============================================================================
// 游戏阶段 (扩展版)
// =============================================================================

export enum ClGamePhase {
    Loading = 'loading',
    Login = 'login',
    ClassSelect = 'class_select', // 新增：职业选择
    ModeSelect = 'mode_select',   // 新增：模式选择
    Lobby = 'lobby',
    Room = 'room',
    World = 'world',
    Battle = 'battle',
    GameOver = 'gameover',
}

// =============================================================================
// 场景管理器 v2
// =============================================================================

export class ClSceneManagerV2 {
    private scene: Scene;
    private gui: AdvancedDynamicTexture;
    
    // 当前阶段
    private phase: ClGamePhase = ClGamePhase.Loading;
    
    // 游戏模式管理器
    private gameModeManager: ClGameModeManager;
    
    // 玩家进度管理器
    private progressManager: ClPlayerProgressManager;
    
    // UI 组件
    private loginUI: ClLoginUI | null = null;
    private authUI: ClAuthUI | null = null;
    private classSelectUI: ClClassSelectUI | null = null;
    private gameModeUI: ClGameModeUI | null = null;
    private lobbyUI: ClLobbyUI | null = null;
    private roomUI: ClRoomUI | null = null;
    private messageUI: ClMessageUI | null = null;
    
    // 场景控制器
    private worldController: ClWorldSceneController | null = null;
    private battleController: ClBattleSceneController | null = null;
    
    // 处理器
    private authHandler: ClAuthHandler | null = null;
    private roomHandler: ClRoomHandler | null = null;
    
    // 网络
    private networkManager: ClNetworkBattleManager | null = null;
    
    // 玩家信息 (由 authHandler 管理，保留引用以便快速访问)
    private localPlayerId: string = '';
    private localPlayerName: string = '';
    
    // 是否在线
    private isOnline: boolean = false;
    
    // 是否使用数据库认证
    private useDbAuth: boolean = true;
    
    // 服务器进度数据 (由 authHandler 管理，保留引用)
    private serverProgress: ClPlayerProgress | null = null;

    constructor(scene: Scene) {
        this.scene = scene;
        this.gui = AdvancedDynamicTexture.CreateFullscreenUI('mainUI', true, scene);
        this.gameModeManager = cl_getGameModeManager();
        this.progressManager = cl_getPlayerProgressManager();
    }

    // =========================================================================
    // 初始化
    // =========================================================================

    /**
     * 初始化场景管理器
     */
    async init(): Promise<void> {
        console.log('🎮 场景管理器 v2 初始化...');
        
        // 创建 UI 组件
        await this.initUI();
        
        // 初始化场景控制器
        await this.initSceneControllers();
        
        // 初始化网络
        await this.initNetwork();
        
        // 初始化处理器
        this.initHandlers();
        
        // 设置游戏模式管理器回调
        this.setupGameModeCallbacks();
        
        // 设置键盘输入
        this.setupKeyboardInput();
        
        // 显示登录界面
        this.setPhase(ClGamePhase.Login);
        
        console.log('✅ 场景管理器初始化完成');
    }

    /**
     * 初始化 UI 组件
     */
    private async initUI(): Promise<void> {
        this.loginUI = new ClLoginUI(this.gui);
        this.authUI = new ClAuthUI(this.gui);
        this.classSelectUI = new ClClassSelectUI(this.gui);
        this.gameModeUI = new ClGameModeUI(this.gui);
        this.lobbyUI = new ClLobbyUI(this.gui);
        this.roomUI = new ClRoomUI(this.gui);
        this.messageUI = new ClMessageUI(this.gui);
        
        this.setupUICallbacks();
    }
    
    /**
     * 初始化处理器
     */
    private initHandlers(): void {
        // 认证处理器
        this.authHandler = new ClAuthHandler({
            progressManager: this.progressManager,
            gameModeManager: this.gameModeManager,
            networkManager: this.networkManager,
            messageUI: this.messageUI,
            isOnline: this.isOnline,
        });
        
        // 房间处理器
        this.roomHandler = new ClRoomHandler({
            gameModeManager: this.gameModeManager,
            networkManager: this.networkManager,
            lobbyUI: this.lobbyUI,
            roomUI: this.roomUI,
            messageUI: this.messageUI,
            isOnline: this.isOnline,
        });
        
        // 设置房间处理器回调
        this.roomHandler.setCallbacks({
            onPhaseChange: (phase) => {
                switch (phase) {
                    case 'lobby': this.setPhase(ClGamePhase.Lobby); break;
                    case 'room': this.setPhase(ClGamePhase.Room); break;
                    case 'mode_select': this.setPhase(ClGamePhase.ModeSelect); break;
                }
            },
            onStartGame: (mode) => this.startGameWithMode(mode),
        });
    }

    /**
     * 初始化场景控制器
     */
    private async initSceneControllers(): Promise<void> {
        // 大世界控制器
        this.worldController = new ClWorldSceneController(this.scene, this.messageUI);
        await this.worldController.init();
        
        this.worldController.setBattleTriggerCallback((encounter: ClEncounterData) => {
            this.handleBattleTrigger(encounter);
        });
        
        // 战斗控制器
        this.battleController = new ClBattleSceneController(this.scene, this.gui, this.messageUI);
        await this.battleController.init();
        
        this.battleController.setBattleEndCallback((victory, winnerId) => {
            this.handleBattleEnd(victory, winnerId);
        });
    }

    /**
     * 初始化网络
     */
    private async initNetwork(): Promise<void> {
        try {
            this.networkManager = cl_getNetworkBattleManager();
            this.setupNetworkCallbacks();
            
            // 初始化 MCP 服务
            const wsCore = cl_getWebSocketCore();
            const mcpService = cl_getMcpService();
            mcpService.init(wsCore);
            
            this.isOnline = true;
            this.gameModeManager.setOnlineStatus(true);
        } catch (e) {
            console.warn('⚠️ 网络初始化失败，使用离线模式');
            this.isOnline = false;
            this.gameModeManager.setOnlineStatus(false);
        }
    }

    // =========================================================================
    // UI 回调设置
    // =========================================================================

    /**
     * 设置 UI 回调
     */
    private setupUICallbacks(): void {
        // 登录回调 (旧版，快速登录)
        if (this.loginUI) {
            this.loginUI.onLogin = (name) => this.handleQuickLogin(name);
        }
        
        // 认证回调 (新版，数据库登录)
        if (this.authUI) {
            this.authUI.onAuthSuccess = (user) => this.handleAuthSuccess(user.user_id, user.username);
        }

        // 职业选择回调
        if (this.classSelectUI) {
            this.classSelectUI.onClassSelected = (classId) => this.handleClassSelect(classId);
        }

        // 游戏模式选择回调
        if (this.gameModeUI) {
            this.gameModeUI.onModeSelected = (mode) => {
                console.log(`📍 选择模式: ${mode}`);
            };
            
            this.gameModeUI.onStartGame = (mode) => {
                this.handleModeStart(mode);
            };
            
            this.gameModeUI.onBack = () => {
                this.setPhase(ClGamePhase.Lobby);
            };
        }

        // 大厅回调
        if (this.lobbyUI) {
            this.lobbyUI.onCreateRoom = (name) => this.handleCreateRoom(name);
            this.lobbyUI.onJoinRoom = (roomId) => this.handleJoinRoom(roomId);
            this.lobbyUI.onRefresh = () => this.handleRefreshRooms();
            this.lobbyUI.onExploreWorld = () => this.setPhase(ClGamePhase.ModeSelect);
        }

        // 房间回调
        if (this.roomUI) {
            this.roomUI.onLeaveRoom = () => this.handleLeaveRoom();
            this.roomUI.onReady = () => this.handleReady();
            this.roomUI.onStartGame = () => this.handleStartMultiplayerGame();
        }
    }

    /**
     * 设置游戏模式管理器回调
     */
    private setupGameModeCallbacks(): void {
        this.gameModeManager.setEvents({
            onModeChange: (mode, prevMode) => {
                console.log(`🎯 模式变更: ${prevMode} → ${mode}`);
            },
            
            onSessionStateChange: (state, prevState) => {
                console.log(`📍 会话状态: ${prevState} → ${state}`);
                this.handleSessionStateChange(state);
            },
            
            onTeamChange: (members) => {
                console.log(`👥 队伍变更: ${members.length} 人`);
                this.roomUI?.updatePlayers(members.map(m => ({
                    id: m.id,
                    name: m.name,
                    ready: m.isReady,
                })));
            },
            
            onShowRoomUI: (session) => {
                console.log(`🏠 显示房间 UI: ${session.roomId}`);
                this.setPhase(ClGamePhase.Room);
            },
            
            onStartGame: (session) => {
                console.log(`🎮 开始游戏: ${session.mode}`);
                this.startGameWithMode(session.mode);
            },
            
            onError: (code, message) => {
                console.error(`❌ [${code}]: ${message}`);
                this.messageUI?.error(message);
            },
        });
    }

    /**
     * 设置网络回调
     */
    private setupNetworkCallbacks(): void {
        if (!this.networkManager) return;

        this.networkManager.setCallbacks({
            onPhaseChange: (phase) => {
                console.log(`🌐 网络阶段: ${phase}`);
            },
            
            onRoomCreated: (roomId) => {
                this.roomUI?.setRoomId(roomId);
                this.gameModeManager.createRoom(roomId);
            },
            
            onRoomJoined: (roomId) => {
                this.roomUI?.setRoomId(roomId);
                this.gameModeManager.joinRoom(roomId);
            },
            
            onPlayerJoined: (playerId, name) => {
                this.gameModeManager.addTeamMember({
                    id: playerId,
                    name,
                    level: 1,
                    isHost: false,
                    isReady: false,
                    isOnline: true,
                });
            },
            
            onPlayerLeft: (playerId) => {
                this.gameModeManager.removeTeamMember(playerId);
            },
            
            onGameStart: (state) => {
                this.handleNetworkGameStart(state);
            },
            
            onStateUpdate: (_state) => {
                // 网络状态更新
            },
            
            onGameEnd: (winnerId) => {
                this.handleGameEnd(winnerId);
            },
            
            onError: (code, message) => {
                console.error(`🌐 错误 [${code}]: ${message}`);
                this.messageUI?.error(message);
            },
        });
    }

    // =========================================================================
    // 阶段管理
    // =========================================================================

    /**
     * 设置当前阶段
     */
    private setPhase(phase: ClGamePhase): void {
        console.log(`🎮 切换阶段: ${this.phase} → ${phase}`);
        this.phase = phase;
        
        // 隐藏所有 UI
        this.hideAllUI();
        
        // 隐藏所有场景
        this.worldController?.leave();
        this.battleController?.leave();
        
        // 显示对应内容
        switch (phase) {
            case ClGamePhase.Login:
                this.showLoginUI();
                break;

            case ClGamePhase.ClassSelect:
                this.classSelectUI?.show();
                break;
                
            case ClGamePhase.ModeSelect:
                this.gameModeUI?.show(this.isOnline);
                break;
                
            case ClGamePhase.Lobby:
                this.lobbyUI?.show();
                this.handleRefreshRooms();
                break;
                
            case ClGamePhase.Room:
                this.roomUI?.show();
                break;
                
            case ClGamePhase.World:
                this.enterWorld();
                break;
                
            case ClGamePhase.Battle:
                this.battleController?.enter();
                break;
        }
    }
    
    /**
     * 显示登录 UI (根据配置选择认证方式)
     */
    private showLoginUI(): void {
        // 检查是否已有保存的认证状态
        const authService = cl_getAuthService();
        
        if (authService.isAuthenticated && authService.user) {
            // 已登录，直接进入游戏
            console.log(`🔐 检测到已保存的登录状态: ${authService.user.username}`);
            this.handleAuthSuccess(authService.user.user_id, authService.user.username);
            return;
        }
        
        // 根据配置显示不同的登录 UI
        if (this.useDbAuth) {
            // 使用数据库认证 (新版)
            this.authUI?.show();
        } else {
            // 使用快速登录 (旧版)
            this.loginUI?.show();
        }
    }

    /**
     * 隐藏所有 UI
     */
    private hideAllUI(): void {
        this.loginUI?.hide();
        this.authUI?.hide();
        this.classSelectUI?.hide();
        this.gameModeUI?.hide();
        this.lobbyUI?.hide();
        this.roomUI?.hide();
    }

    // =========================================================================
    // 事件处理
    // =========================================================================

    /**
     * 处理快速登录 (旧版，无数据库)
     */
    private async handleQuickLogin(name: string): Promise<void> {
        if (this.authHandler) {
            const result = await this.authHandler.handleQuickLogin(name);
            this.onAuthComplete(result);
        }
    }

    /**
     * 处理认证成功 (新版，数据库登录)
     */
    private async handleAuthSuccess(userId: string, username: string): Promise<void> {
        if (this.authHandler) {
            const result = await this.authHandler.handleAuthSuccess(userId, username);
            this.onAuthComplete(result);
        }
    }
    
    /**
     * 认证完成后的处理
     */
    private onAuthComplete(result: { playerId: string; playerName: string; profession: string | null }): void {
        this.localPlayerId = result.playerId;
        this.localPlayerName = result.playerName;
        this.serverProgress = this.authHandler?.serverProgress || null;
        this.isOnline = this.authHandler?.isOnline || false;
        
        // 更新处理器的在线状态
        this.roomHandler?.setOnline(this.isOnline);
        
        // 检查是否已选择职业
        if (result.profession) {
            this.setPhase(ClGamePhase.ModeSelect);
        } else {
            this.setPhase(ClGamePhase.ClassSelect);
        }
    }

    /**
     * 处理职业选择
     */
    private handleClassSelect(classId: string): void {
        console.log(`🛡️ 选择职业: ${classId}`);
        
        // 保存职业选择
        this.progressManager.setProfession(classId);
        
        this.messageUI?.success(`已选择职业: ${classId}`);
        
        // 进入模式选择
        this.setPhase(ClGamePhase.ModeSelect);
    }

    /**
     * 处理模式开始
     */
    private handleModeStart(mode: ClGameMode): void {
        console.log(`🎯 开始模式: ${mode}`);
        
        // 检查是否解锁
        if (!this.progressManager.isModeUnlocked(mode)) {
            const requirement = this.progressManager.getModeUnlockProgress(mode);
            this.messageUI?.error(`该模式未解锁: ${requirement}`);
            return;
        }
        
        // 选择模式
        if (!this.gameModeManager.selectMode(mode)) {
            return;
        }
        
        // 开始游戏流程
        this.gameModeManager.startGame();
    }

    /**
     * 根据模式开始游戏
     */
    private startGameWithMode(mode: ClGameMode): void {
        // 设置玩家信息
        this.battleController?.setPlayerInfo(this.localPlayerId, this.localPlayerName);
        
        // 根据模式决定流程
        switch (mode) {
            case ClGameMode.SoloExplore:
                // 单人探索 - 直接进入大世界
                this.setPhase(ClGamePhase.World);
                break;
                
            case ClGameMode.TeamExplore:
            case ClGameMode.MiniBoss:
            case ClGameMode.WeeklyBoss:
                // 组队模式 - 进入大世界 (多人同步)
                this.setPhase(ClGamePhase.World);
                break;
                
            case ClGameMode.PvpArena:
                // PVP - 直接进入战斗
                this.setPhase(ClGamePhase.Battle);
                this.battleController?.startBattleWithAI('PVP 对手');
                break;
        }
    }

    /**
     * 处理会话状态变化
     */
    private handleSessionStateChange(state: ClSessionState): void {
        switch (state) {
            case ClSessionState.Waiting:
                // 等待中 - 可能需要显示房间 UI
                break;
                
            case ClSessionState.Exploring:
                // 探索中 - 确保在世界场景
                if (this.phase !== ClGamePhase.World) {
                    this.setPhase(ClGamePhase.World);
                }
                break;
                
            case ClSessionState.InBattle:
                // 战斗中
                if (this.phase !== ClGamePhase.Battle) {
                    this.setPhase(ClGamePhase.Battle);
                }
                break;
        }
    }

    /**
     * 处理战斗触发 (大世界遇敌)
     */
    private handleBattleTrigger(encounter: ClEncounterData): void {
        console.log(`⚔️ 战斗触发: ${encounter.enemyName} (Lv.${encounter.enemyLevel})`);
        
        // 更新模式管理器状态
        this.gameModeManager.enterBattle();
        
        // 离开大世界
        this.worldController?.leave();
        
        // 设置玩家信息
        this.battleController?.setPlayerInfo(this.localPlayerId, this.localPlayerName);
        
        // 进入战斗
        this.setPhase(ClGamePhase.Battle);
        
        // 检查是否为组队模式
        const currentMode = this.gameModeManager.getCurrentMode();
        const isTeamMode = currentMode === ClGameMode.TeamExplore || 
                           currentMode === ClGameMode.MiniBoss ||
                           currentMode === ClGameMode.WeeklyBoss;
        
        if (isTeamMode && this.battleController) {
            // 组队战斗 - 获取队伍成员
            const teamMembers = this.gameModeManager.getTeamMembers().map(m => ({
                id: m.id,
                name: m.name,
                hp: 100,
                maxHp: 100,
                isActive: m.id === this.localPlayerId,
            }));
            
            // 开始组队战斗
            this.battleController.startCoopBattle(encounter.enemyName, teamMembers);
        } else {
            // 单人战斗
            this.battleController?.startBattleWithAI(encounter.enemyName);
        }
    }

    /**
     * 处理战斗结束
     */
    private handleBattleEnd(victory: boolean, _winnerId: string | null): void {
        console.log(`🏆 战斗结束: ${victory ? '胜利' : '失败'}`);
        
        // 记录战斗进度
        const currentMode = this.gameModeManager.getCurrentMode();
        const isPvp = currentMode === ClGameMode.PvpArena;
        const isBoss = currentMode === ClGameMode.MiniBoss || currentMode === ClGameMode.WeeklyBoss;
        
        this.progressManager.recordBattle(victory, victory ? 1 : 0, isBoss, isPvp);
        
        // 胜利奖励经验
        if (victory) {
            const expGain = isBoss ? 200 : (isPvp ? 100 : 50);
            const result = this.progressManager.addExperience(expGain);
            
            if (result.leveledUp) {
                this.messageUI?.info(`🎉 升级了! 当前等级: ${result.newLevel}`);
            } else {
                this.messageUI?.info(`获得 ${expGain} 经验`);
            }
        }
        
        // 更新模式管理器状态
        this.gameModeManager.leaveBattle();
        
        // 离开战斗
        this.battleController?.leave();
        
        // 处理战斗结果
        this.worldController?.handleBattleResult(victory);
        
        // 返回大世界
        this.setPhase(ClGamePhase.World);
    }

    // =========================================================================
    // 房间相关
    // =========================================================================

    /**
     * 处理创建房间
     */
    private handleCreateRoom(name: string): void {
        this.roomHandler?.handleCreateRoom(name);
    }

    /**
     * 处理加入房间
     */
    private handleJoinRoom(roomId: string): void {
        this.roomHandler?.handleJoinRoom(roomId);
    }

    /**
     * 处理刷新房间列表
     */
    private handleRefreshRooms(): void {
        this.roomHandler?.handleRefreshRooms();
    }

    /**
     * 处理离开房间
     */
    private handleLeaveRoom(): void {
        this.roomHandler?.handleLeaveRoom();
    }

    /**
     * 处理准备
     */
    private handleReady(): void {
        this.roomHandler?.handleReady();
    }

    /**
     * 处理开始多人游戏
     */
    private handleStartMultiplayerGame(): void {
        this.roomHandler?.handleStartMultiplayerGame();
    }

    /**
     * 处理网络游戏开始
     */
    private handleNetworkGameStart(_state: ClBattleState): void {
        console.log('⚔️ 网络游戏开始');
        
        const mode = this.gameModeManager.getCurrentMode();
        if (mode) {
            this.startGameWithMode(mode);
        }
    }

    /**
     * 处理游戏结束
     */
    private handleGameEnd(winnerId: string | null): void {
        console.log(`🏁 游戏结束! 获胜者: ${winnerId || '无'}`);
        
        this.gameModeManager.endGame();
        
        setTimeout(() => {
            this.setPhase(ClGamePhase.ModeSelect);
        }, 3000);
    }

    // =========================================================================
    // 键盘输入
    // =========================================================================

    /**
     * 设置键盘输入
     */
    private setupKeyboardInput(): void {
        this.scene.onKeyboardObservable.add((kbInfo) => {
            if (kbInfo.type !== 1) return; // 只处理按下事件
            
            const key = kbInfo.event.key.toLowerCase();
            
            // ESC - 根据当前阶段处理
            if (key === 'escape') {
                this.handleEscapeKey();
            }
        });
    }
    
    /**
     * 进入世界场景
     * 应用服务器进度并进入世界
     */
    private enterWorld(): void {
        // 应用保存的玩家位置
        if (this.serverProgress && this.worldController) {
            const { world_position_x, world_position_y, world_position_z } = this.serverProgress;
            // 如果是默认位置 (0,0,0) 则不强制设置
            if (world_position_x !== 0 || world_position_y !== 0 || world_position_z !== 0) {
                this.worldController.setPlayerPosition(
                    world_position_x,
                    world_position_y,
                    world_position_z
                );
            }
        }
        
        // 进入世界
        this.worldController?.enter();
        
        // 启动位置更新监听
        this.startPositionTracking();
    }
    
    /**
     * 开始追踪玩家位置变化
     */
    private startPositionTracking(): void {
        // 每隔一段时间更新玩家位置到进度数据
        const trackingInterval = window.setInterval(() => {
            if (this.phase !== ClGamePhase.World) {
                clearInterval(trackingInterval);
                return;
            }
            
            const position = this.worldController?.getPlayerPosition();
            if (position && this.serverProgress) {
                // 检测位置是否有显著变化
                const dx = Math.abs(position.x - this.serverProgress.world_position_x);
                const dz = Math.abs(position.z - this.serverProgress.world_position_z);
                
                if (dx > 0.5 || dz > 0.5) {
                    // 更新进度数据
                    this.serverProgress.world_position_x = position.x;
                    this.serverProgress.world_position_y = position.y;
                    this.serverProgress.world_position_z = position.z;
                    
                    // 标记为脏数据，等待自动保存
                    const progressSync = cl_getProgressSyncService();
                    progressSync.markDirty(this.serverProgress);
                }
            }
        }, 2000); // 每 2 秒检查一次
    }

    /**
     * 处理 ESC 键
     */
    private handleEscapeKey(): void {
        switch (this.phase) {
            case ClGamePhase.World:
                this.messageUI?.info('按 ESC 返回模式选择');
                this.gameModeManager.endGame();
                this.setPhase(ClGamePhase.ModeSelect);
                break;
                
            case ClGamePhase.Room:
                this.handleLeaveRoom();
                break;
                
            case ClGamePhase.ModeSelect:
                // 可以返回大厅或留在这里
                break;
        }
    }

    // =========================================================================
    // 公共方法
    // =========================================================================

    /**
     * 获取当前阶段
     */
    getPhase(): ClGamePhase {
        return this.phase;
    }

    /**
     * 获取当前游戏模式
     */
    getCurrentMode(): ClGameMode | null {
        return this.gameModeManager.getCurrentMode();
    }

    /**
     * 是否是单人模式
     */
    isSoloMode(): boolean {
        return this.gameModeManager.isSoloMode();
    }

    /**
     * 是否是多人模式
     */
    isMultiplayerMode(): boolean {
        return this.gameModeManager.isMultiplayerMode();
    }

    /**
     * 获取大世界场景
     */
    getWorldScene() {
        return this.worldController?.getWorldScene() || null;
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.loginUI?.dispose();
        this.gameModeUI?.dispose();
        this.lobbyUI?.dispose();
        this.roomUI?.dispose();
        this.messageUI?.dispose();
        this.worldController?.dispose();
        this.battleController?.dispose();
        this.gui.dispose();
    }
}

// =============================================================================
// 兼容性导出 (保持旧代码可用)
// =============================================================================

/**
 * @deprecated 使用 ClSceneManagerV2 替代
 */
export { ClSceneManager } from './cl_scene_manager';
