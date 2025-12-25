/**
 * 玩家进度同步服务
 * 
 * 负责将玩家游戏进度保存到服务器数据库
 * 
 * 模块: client/network
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import { cl_getAuthService } from './cl_auth_service';

// =============================================================================
// 类型定义
// =============================================================================

/** 玩家进度数据 */
export interface ClPlayerProgress {
    world_position_x: number;
    world_position_y: number;
    world_position_z: number;
    current_map: string;
    game_flags: Record<string, boolean>;
    statistics: ClPlayerStatistics;
}

/** 玩家统计数据 */
export interface ClPlayerStatistics {
    battles_won: number;
    battles_lost: number;
    monsters_killed: number;
    total_damage_dealt: number;
    total_damage_taken: number;
    play_time_seconds: number;
}

// =============================================================================
// 进度同步服务
// =============================================================================

class ClProgressSyncService {
    private _baseUrl: string;
    private _autoSaveInterval: number | null = null;
    private _lastProgress: ClPlayerProgress | null = null;
    private _isDirty: boolean = false;

    constructor() {
        this._baseUrl = this._getApiBaseUrl();
    }

    /** 获取 API 基础地址 */
    private _getApiBaseUrl(): string {
        // 优先使用 Vite 环境变量
        if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
            return import.meta.env.VITE_API_URL;
        }
        // 其次使用全局配置
        const globalConfig = (window as unknown as { CL_API_URL?: string }).CL_API_URL;
        if (globalConfig) {
            return globalConfig;
        }
        // 本地开发环境
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        }
        // 生产环境使用同域名
        return window.location.origin;
    }

    /** 获取认证头 */
    private _getAuthHeaders(): Record<string, string> {
        const authService = cl_getAuthService();
        return {
            'Content-Type': 'application/json',
            ...authService.getAuthHeaders(),
        };
    }

    /** 获取当前玩家 ID */
    private _getPlayerId(): string | null {
        const authService = cl_getAuthService();
        return authService.user?.user_id || null;
    }

    // =========================================================================
    // 公共 API
    // =========================================================================

    /** 从服务器加载玩家进度 */
    async loadProgress(): Promise<ClPlayerProgress | null> {
        const playerId = this._getPlayerId();
        if (!playerId) {
            console.warn('[ClProgressSync] 未登录，无法加载进度');
            return null;
        }

        try {
            const response = await fetch(`${this._baseUrl}/api/player/${playerId}/progress`, {
                method: 'GET',
                headers: this._getAuthHeaders(),
            });

            if (!response.ok) {
                if (response.status === 404) {
                    console.log('[ClProgressSync] 玩家进度不存在，使用默认值');
                    return null;
                }
                throw new Error(`加载进度失败: ${response.status}`);
            }

            const data = await response.json();
            if (data) {
                this._lastProgress = {
                    world_position_x: data.world_position_x,
                    world_position_y: data.world_position_y,
                    world_position_z: data.world_position_z,
                    current_map: data.current_map,
                    game_flags: data.game_flags || {},
                    statistics: data.statistics || this._getDefaultStatistics(),
                };
                console.log('[ClProgressSync] 进度加载成功:', this._lastProgress);
                return this._lastProgress;
            }
            return null;
        } catch (e) {
            console.warn('[ClProgressSync] 加载进度失败:', e);
            return null;
        }
    }

    /** 保存玩家进度到服务器 */
    async saveProgress(progress: ClPlayerProgress): Promise<boolean> {
        const playerId = this._getPlayerId();
        if (!playerId) {
            console.warn('[ClProgressSync] 未登录，无法保存进度');
            return false;
        }

        try {
            const response = await fetch(`${this._baseUrl}/api/player/${playerId}/progress`, {
                method: 'POST',
                headers: this._getAuthHeaders(),
                body: JSON.stringify(progress),
            });

            if (!response.ok) {
                throw new Error(`保存进度失败: ${response.status}`);
            }

            this._lastProgress = progress;
            this._isDirty = false;
            console.log('[ClProgressSync] 进度保存成功');
            return true;
        } catch (e) {
            console.warn('[ClProgressSync] 保存进度失败:', e);
            return false;
        }
    }

    /** 标记进度已更改 (等待自动保存) */
    markDirty(progress: ClPlayerProgress): void {
        this._lastProgress = progress;
        this._isDirty = true;
    }

    /** 立即保存 (如果有更改) */
    async flushIfDirty(): Promise<boolean> {
        if (this._isDirty && this._lastProgress) {
            return this.saveProgress(this._lastProgress);
        }
        return true;
    }

    /** 启动自动保存 (每隔指定秒数) */
    startAutoSave(intervalSeconds: number = 30): void {
        this.stopAutoSave();
        
        this._autoSaveInterval = window.setInterval(async () => {
            await this.flushIfDirty();
        }, intervalSeconds * 1000);
        
        console.log(`[ClProgressSync] 自动保存已启动 (每 ${intervalSeconds} 秒)`);
    }

    /** 停止自动保存 */
    stopAutoSave(): void {
        if (this._autoSaveInterval !== null) {
            clearInterval(this._autoSaveInterval);
            this._autoSaveInterval = null;
            console.log('[ClProgressSync] 自动保存已停止');
        }
    }

    /** 获取默认统计数据 */
    private _getDefaultStatistics(): ClPlayerStatistics {
        return {
            battles_won: 0,
            battles_lost: 0,
            monsters_killed: 0,
            total_damage_dealt: 0,
            total_damage_taken: 0,
            play_time_seconds: 0,
        };
    }

    /** 获取默认进度 */
    getDefaultProgress(): ClPlayerProgress {
        return {
            world_position_x: 0,
            world_position_y: 0,
            world_position_z: 0,
            current_map: 'main_world',
            game_flags: {},
            statistics: this._getDefaultStatistics(),
        };
    }
}

// =============================================================================
// 单例导出
// =============================================================================

let _progressSyncInstance: ClProgressSyncService | null = null;

/** 获取进度同步服务实例 */
export function cl_getProgressSyncService(): ClProgressSyncService {
    if (!_progressSyncInstance) {
        _progressSyncInstance = new ClProgressSyncService();
    }
    return _progressSyncInstance;
}
