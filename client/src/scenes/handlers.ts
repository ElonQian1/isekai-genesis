/**
 * 场景处理器 - 占位符
 */

export interface ClAuthHandlerConfig {
    progressManager?: any;
    gameModeManager?: any;
    networkManager?: any;
    messageUI?: any;
    isOnline?: boolean;
    onSuccess?: (user: { user_id: string; username: string }) => void;
}

export interface ClRoomHandlerConfig {
    gameModeManager?: any;
    networkManager?: any;
    lobbyUI?: any;
    roomUI?: any;
    messageUI?: any;
    isOnline?: boolean;
    onRoomJoined?: (roomId: string) => void;
}

export interface ClRoomHandlerCallbacks {
    onPhaseChange?: (phase: string) => void;
    onStartGame?: (mode: string) => void;
}

export class ClAuthHandler {
    public serverProgress: any = null;
    public isOnline: boolean = false;
    
    constructor(_config?: ClAuthHandlerConfig) {}
    
    async authenticate(_username: string, _password: string): Promise<boolean> {
        return true;
    }
    
    async handleQuickLogin(name: string): Promise<{ user_id: string; username: string } | null> {
        console.log(`🎮 快速登录: ${name}`);
        return { user_id: `player_${Date.now()}`, username: name };
    }
    
    async handleAuthSuccess(userId: string, username: string): Promise<void> {
        console.log(`✅ 认证成功: ${username} (${userId})`);
    }
}

export class ClRoomHandler {
    private callbacks: ClRoomHandlerCallbacks = {};
    
    constructor(_config?: ClRoomHandlerConfig) {}
    
    setCallbacks(callbacks: ClRoomHandlerCallbacks): void {
        this.callbacks = callbacks;
    }
    
    setOnline(_online: boolean): void {}
    
    async createRoom(_name: string): Promise<string | null> {
        return 'room_1';
    }
    
    async joinRoom(_roomId: string): Promise<boolean> {
        return true;
    }
    
    handleCreateRoom(_name: string): void {}
    handleJoinRoom(_roomId: string): void {}
    handleRefreshRooms(): void {}
    handleLeaveRoom(): void {}
    handleReady(): void {}
    handleStartMultiplayerGame(): void {}
}
