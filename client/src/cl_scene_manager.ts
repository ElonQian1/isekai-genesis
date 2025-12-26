/**
 * 游戏场景管理器 (旧版)
 * 
 * @deprecated 此文件已废弃，请使用 cl_scene_manager_v2.ts
 * 保留此文件仅用于向后兼容，计划在未来版本中删除。
 * 
 * 管理游戏的不同阶段: 登录 → 大厅 → 房间 → 战斗
 * 
 * 模块: client
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import { Scene } from '@babylonjs/core';
import { AdvancedDynamicTexture } from '@babylonjs/gui';

import { ClLoginUI } from './ui/cl_login_ui';
import { ClLobbyUI, ClRoomUI, ClRoomData } from './ui/cl_lobby_ui';
import { ClMessageUI } from './ui/cl_message_ui';
import { 
    ClNetworkBattleManager, 
    cl_getNetworkBattleManager 
} from './network/cl_network_battle';
import { ClLobbyService, cl_getLobbyService } from './network/cl_lobby_service';
import { ClBattleState } from './cl_battle_manager';

// 场景控制器
import { ClWorldSceneController, ClEncounterData } from './scenes/cl_world_scene_controller';
import { ClBattleSceneController } from './scenes/cl_battle_scene_controller';

// =============================================================================
// 游戏阶段
// =============================================================================

export enum ClGamePhase {
    Loading = 'loading',
    Login = 'login',
    Lobby = 'lobby',
    Room = 'room',
    World = 'world',      // 新增：大世界探索
    Battle = 'battle',
    GameOver = 'gameover',
}

// =============================================================================
// 场景管理器
// =============================================================================

export class ClSceneManager {
    private scene: Scene;
    private gui: AdvancedDynamicTexture;
    
    // 当前阶段
    private phase: ClGamePhase = ClGamePhase.Loading;
    
    // UI 组件
    private loginUI: ClLoginUI | null = null;
    private lobbyUI: ClLobbyUI | null = null;
    private roomUI: ClRoomUI | null = null;
    private messageUI: ClMessageUI | null = null;
    
    // 场景控制器 (新架构)
    private worldController: ClWorldSceneController | null = null;
    private battleController: ClBattleSceneController | null = null;
    
    // 网络
    private networkManager: ClNetworkBattleManager | null = null;
    private lobbyService: ClLobbyService | null = null;
    
    // 玩家信息
    private localPlayerId: string = '';
    private localPlayerName: string = '';
    
    // 是否使用离线模式
    private offlineMode: boolean = false;

    constructor(scene: Scene) {
        this.scene = scene;
        this.gui = AdvancedDynamicTexture.CreateFullscreenUI('mainUI', true, scene);
    }

    /**
     * 初始化
     */
    async init(): Promise<void> {
        // 创建 UI 组件
        this.loginUI = new ClLoginUI(this.gui);
        this.lobbyUI = new ClLobbyUI(this.gui);
        this.roomUI = new ClRoomUI(this.gui);
        this.messageUI = new ClMessageUI(this.gui);
        
        // 初始化大世界场景控制器
        this.worldController = new ClWorldSceneController(this.scene, this.messageUI);
        await this.worldController.init();
        
        // 设置战斗触发回调
        this.worldController.setBattleTriggerCallback((encounter: ClEncounterData) => {
            this.handleBattleTrigger(encounter);
        });
        
        // 初始化战斗场景控制器
        this.battleController = new ClBattleSceneController(this.scene, this.gui, this.messageUI);
        await this.battleController.init();
        
        // 设置战斗结束回调
        this.battleController.setBattleEndCallback((victory, winnerId) => {
            this.handleBattleEnd(victory, winnerId);
        });
        
        // 设置 UI 回调
        this.setupUICallbacks();
        
        // 设置键盘输入
        this.setupKeyboardInput();
        
        // 初始化网络 (尝试连接)
        try {
            this.networkManager = cl_getNetworkBattleManager();
            this.setupNetworkCallbacks();
        } catch (e) {
            console.warn('网络初始化失败，使用离线模式');
            this.offlineMode = true;
        }
        
        // 显示登录界面
        this.setPhase(ClGamePhase.Login);
    }
    
    /**
     * 处理战斗触发（大世界遇敌）
     */
    private handleBattleTrigger(encounter: ClEncounterData): void {
        console.log(`⚔️ 战斗触发: ${encounter.enemyName} (Lv.${encounter.enemyLevel})`);
        
        // 离开大世界
        this.worldController?.leave();
        
        // 设置玩家信息
        this.battleController?.setPlayerInfo(this.localPlayerId, this.localPlayerName);
        
        // 进入战斗
        this.setPhase(ClGamePhase.Battle);
        
        // 开始与敌人战斗
        this.battleController?.startBattleWithAI(encounter.enemyName);
    }
    
    /**
     * 处理战斗结束
     */
    private handleBattleEnd(victory: boolean, _winnerId: string | null): void {
        console.log(`战斗结束: ${victory ? '胜利' : '失败'}`);
        
        // 离开战斗
        this.battleController?.leave();
        
        // 处理战斗结果
        this.worldController?.handleBattleResult(victory);
        
        // 返回大世界
        this.setPhase(ClGamePhase.World);
    }

    /**
     * 设置 UI 回调
     */
    private setupUICallbacks(): void {
        // 登录回调
        if (this.loginUI) {
            this.loginUI.onLogin = (name) => {
                this.handleLogin(name);
            };
        }

        // 大厅回调
        if (this.lobbyUI) {
            this.lobbyUI.onCreateRoom = (name) => {
                this.handleCreateRoom(name);
            };
            this.lobbyUI.onJoinRoom = (roomId) => {
                this.handleJoinRoom(roomId);
            };
            this.lobbyUI.onRefresh = () => {
                this.handleRefreshRooms();
            };
            this.lobbyUI.onExploreWorld = () => {
                this.handleExploreWorld();
            };
        }

        // 房间回调
        if (this.roomUI) {
            this.roomUI.onLeaveRoom = () => {
                this.handleLeaveRoom();
            };
            this.roomUI.onReady = () => {
                this.handleReady();
            };
            this.roomUI.onStartGame = () => {
                this.handleStartGame();
            };
        }
    }

    /**
     * 设置键盘输入
     */
    private setupKeyboardInput(): void {
        this.scene.onKeyboardObservable.add((kbInfo) => {
            if (kbInfo.type !== 1) return; // 只处理按下事件
            
            const key = kbInfo.event.key.toLowerCase();
            
            // ESC - 返回大厅
            if (key === 'escape') {
                if (this.phase === ClGamePhase.World) {
                    this.messageUI?.info('返回游戏大厅');
                    this.setPhase(ClGamePhase.Lobby);
                }
            }
            
            // WASD移动已内置到 ClCameraController 中
        });
    }

    /**
     * 设置网络回调
     */
    private setupNetworkCallbacks(): void {
        if (!this.networkManager) return;

        this.networkManager.setCallbacks({
            onPhaseChange: (phase) => {
                console.log(`网络阶段: ${phase}`);
            },
            
            onRoomCreated: (roomId) => {
                this.roomUI?.setRoomId(roomId);
                this.setPhase(ClGamePhase.Room);
            },
            
            onRoomJoined: (roomId) => {
                this.roomUI?.setRoomId(roomId);
                this.setPhase(ClGamePhase.Room);
            },
            
            onPlayerJoined: (_playerId, name) => {
                console.log(`玩家加入: ${name}`);
                this.updateRoomPlayers();
            },
            
            onPlayerLeft: (playerId) => {
                console.log(`玩家离开: ${playerId}`);
                this.updateRoomPlayers();
            },
            
            onGameStart: (state) => {
                this.handleGameStart(state);
            },
            
            onStateUpdate: (state) => {
                this.handleStateUpdate(state);
            },
            
            onGameEnd: (winnerId) => {
                this.handleGameEnd(winnerId);
            },
            
            onError: (code, message) => {
                console.error(`错误 [${code}]: ${message}`);
                this.messageUI?.error(message);
            },
        });
    }
    /**
     * 设置阶段
     */
    private setPhase(phase: ClGamePhase): void {
        console.log(`🎮 切换阶段: ${this.phase} → ${phase}`);
        this.phase = phase;
        
        // 隐藏所有 UI
        this.loginUI?.hide();
        this.lobbyUI?.hide();
        this.roomUI?.hide();
        
        // 隐藏所有场景
        this.worldController?.leave();
        this.battleController?.leave();
        
        // 显示对应 UI/场景
        switch (phase) {
            case ClGamePhase.Login:
                this.loginUI?.show();
                break;
            case ClGamePhase.Lobby:
                this.lobbyUI?.show();
                this.handleRefreshRooms();
                break;
            case ClGamePhase.Room:
                this.roomUI?.show();
                this.updateRoomPlayers();
                break;
            case ClGamePhase.World:
                this.worldController?.enter();
                break;
            case ClGamePhase.Battle:
                this.battleController?.enter();
                break;
        }
    }
    
    /**
     * 进入大世界探索
     */
    enterWorld(): void {
        this.setPhase(ClGamePhase.World);
    }
    
    /**
     * 离开大世界返回大厅
     */
    leaveWorld(): void {
        this.setPhase(ClGamePhase.Lobby);
    }
    
    /**
     * 获取大世界场景
     */
    getWorldScene() {
        return this.worldController?.getWorldScene() || null;
    }

    // =========================================================================
    // 事件处理
    // =========================================================================

    /**
     * 处理登录
     */
    private async handleLogin(name: string): Promise<void> {
        this.localPlayerName = name;
        this.localPlayerId = `player_${Date.now()}`;
        
        console.log(`🎮 登录: ${name} (${this.localPlayerId})`);
        
        if (this.offlineMode) {
            // 离线模式直接进入大厅
            this.setPhase(ClGamePhase.Lobby);
            return;
        }
        
        // 尝试连接服务器
        try {
            await this.networkManager?.connect();
            this.networkManager?.login(this.localPlayerId, name);
            this.setPhase(ClGamePhase.Lobby);
        } catch (e) {
            console.warn('连接服务器失败，使用离线模式');
            this.offlineMode = true;
            this.setPhase(ClGamePhase.Lobby);
        }
    }

    /**
     * 处理创建房间
     */
    private handleCreateRoom(name: string): void {
        console.log(`🏠 创建房间: ${name}`);
        
        if (this.offlineMode) {
            // 离线模式模拟创建房间
            this.roomUI?.setRoomId('offline-room');
            this.roomUI?.updatePlayers([
                { id: this.localPlayerId, name: this.localPlayerName, ready: false }
            ]);
            this.setPhase(ClGamePhase.Room);
            return;
        }
        
        this.networkManager?.createRoom(name);
    }

    /**
     * 处理加入房间
     */
    private handleJoinRoom(roomId: string): void {
        console.log(`🚪 加入房间: ${roomId}`);
        
        if (this.offlineMode) {
            // 离线模式模拟加入
            this.roomUI?.setRoomId(roomId);
            this.setPhase(ClGamePhase.Room);
            return;
        }
        
        this.networkManager?.joinRoom(roomId);
    }

    /**
     * 处理刷新房间列表
     */
    private handleRefreshRooms(): void {
        console.log('🔄 刷新房间列表');
        
        if (this.offlineMode) {
            // 离线模式显示模拟房间
            const mockRooms: ClRoomData[] = [
                { id: 'room1', name: '新手房间', playerCount: 1, maxPlayers: 2, status: 'waiting' },
                { id: 'room2', name: '高手对决', playerCount: 2, maxPlayers: 2, status: 'playing' },
            ];
            this.lobbyUI?.updateRoomList(mockRooms);
            return;
        }
        
        // 使用大厅服务获取房间列表
        if (!this.lobbyService) {
            try {
                this.lobbyService = cl_getLobbyService();
                // 设置房间列表更新回调
                this.lobbyService.setCallbacks({
                    onRoomListUpdate: (rooms) => {
                        const roomData: ClRoomData[] = rooms.map(r => ({
                            id: r.id,
                            name: r.name,
                            playerCount: r.player_count,
                            maxPlayers: r.max_players,
                            status: r.status === 'waiting' ? 'waiting' : 'playing'
                        }));
                        this.lobbyUI?.updateRoomList(roomData);
                    }
                });
            } catch (e) {
                console.warn('大厅服务不可用:', e);
                this.lobbyUI?.updateRoomList([]);
                return;
            }
        }
        
        // 发送刷新请求
        this.lobbyService.refreshRoomList();
        
        // 先显示缓存的列表
        const cachedRooms = this.lobbyService.getRoomList();
        const roomData: ClRoomData[] = cachedRooms.map(r => ({
            id: r.id,
            name: r.name,
            playerCount: r.player_count,
            maxPlayers: r.max_players,
            status: r.status === 'waiting' ? 'waiting' : 'playing'
        }));
        this.lobbyUI?.updateRoomList(roomData);
    }

    /**
     * 处理探索世界
     */
    private handleExploreWorld(): void {
        console.log('🗺️ 进入江湖世界');
        this.messageUI?.info('正在进入江湖世界...');
        this.setPhase(ClGamePhase.World);
    }

    /**
     * 处理离开房间
     */
    private handleLeaveRoom(): void {
        console.log('🚪 离开房间');
        
        if (!this.offlineMode) {
            this.networkManager?.leaveRoom();
        }
        
        this.setPhase(ClGamePhase.Lobby);
    }

    /**
     * 处理准备
     */
    private handleReady(): void {
        console.log('✅ 准备');
        
        if (this.offlineMode) {
            // 离线模式模拟准备和开始
            this.handleOfflineGameStart();
            return;
        }
        
        this.networkManager?.ready();
    }

    /**
     * 处理开始游戏
     */
    private handleStartGame(): void {
        console.log('🎮 开始游戏');
        
        if (this.offlineMode) {
            this.handleOfflineGameStart();
            return;
        }
        
        this.networkManager?.startGame();
    }

    /**
     * 离线模式开始游戏
     */
    private handleOfflineGameStart(): void {
        if (!this.battleController) {
            console.error('战斗控制器未初始化');
            return;
        }
        
        // 设置玩家信息
        this.battleController.setPlayerInfo(this.localPlayerId, this.localPlayerName);
        
        // 进入战斗
        this.setPhase(ClGamePhase.Battle);
        
        // 开始与 AI 战斗
        const success = this.battleController.startBattleWithAI('AI 对手');
        if (!success) {
            this.messageUI?.error('无法开始战斗');
        }
    }

    /**
     * 更新房间玩家列表
     */
    private updateRoomPlayers(): void {
        const room = this.networkManager?.getCurrentRoom();
        if (room) {
            this.roomUI?.updatePlayers(room.players);
        }
    }

    /**
     * 处理游戏开始 (网络模式)
     */
    private handleGameStart(state: ClBattleState): void {
        console.log('⚔️ 游戏开始!', state);
        this.battleController?.setPlayerInfo(this.localPlayerId, this.localPlayerName);
        this.setPhase(ClGamePhase.Battle);
    }

    /**
     * 处理状态更新 (网络模式)
     */
    private handleStateUpdate(_state: ClBattleState): void {
        // 网络模式状态更新由战斗控制器处理
    }

    /**
     * 处理游戏结束 (网络模式)
     */
    private handleGameEnd(winnerId: string | null): void {
        console.log(`🏆 游戏结束! 获胜者: ${winnerId || '平局'}`);
        
        setTimeout(() => {
            this.setPhase(ClGamePhase.Lobby);
        }, 3000);
    }

    /**
     * 获取当前阶段
     */
    getPhase(): ClGamePhase {
        return this.phase;
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.loginUI?.dispose();
        this.lobbyUI?.dispose();
        this.roomUI?.dispose();
        this.messageUI?.dispose();
        this.worldController?.dispose();
        this.battleController?.dispose();
        this.gui.dispose();
    }
}
