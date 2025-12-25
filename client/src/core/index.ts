/**
 * 核心模块导出
 * 
 * 包含游戏核心类型、配置和管理器
 * 
 * 模块: client/core
 * 文档: 文档/04-client.md
 */

// =============================================================================
// 架构说明
// =============================================================================
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │                         Core 核心模块架构                                │
// ├─────────────────────────────────────────────────────────────────────────┤
// │                                                                         │
// │  ┌─────────────────────┐    ┌─────────────────────┐                     │
// │  │  cl_game_mode_types │    │  cl_game_mode_manager│                    │
// │  │  ─────────────────  │    │  ──────────────────  │                    │
// │  │  • ClGameMode       │───▶│  • 模式选择/切换     │                    │
// │  │  • ClSessionState   │    │  • 会话生命周期     │                    │
// │  │  • ClGameSession    │    │  • 队伍管理        │                    │
// │  │  • ClTeamMember     │    │  • 事件分发        │                    │
// │  │  • 配置表           │    │                    │                    │
// │  └─────────────────────┘    └─────────────────────┘                    │
// │           ▲                          │                                  │
// │           │                          ▼                                  │
// │  ┌─────────────────────────────────────────────────────────┐           │
// │  │                   ClSceneManager                         │           │
// │  │  • 根据 GameMode 决定进入 World 还是 Room               │           │
// │  │  • 管理 UI 显示/隐藏                                    │           │
// │  └─────────────────────────────────────────────────────────┘           │
// │                                                                         │
// └─────────────────────────────────────────────────────────────────────────┘
//
// 使用方式:
// 1. 玩家登录后显示 ClGameModeUI 选择模式
// 2. ClGameModeManager.selectMode() 设置当前模式
// 3. ClGameModeManager.startGame() 根据模式类型:
//    - 单人模式 → 直接进入 World
//    - 多人模式 → 显示 Room UI → 等待玩家 → 开始
// 4. 游戏结束后 ClGameModeManager.endGame() 重置
//
// =============================================================================

// 类型定义
export {
    ClGameMode,
    ClGameModeCategory,
    ClSessionState,
    CL_GAME_MODE_CONFIGS,
    cl_getGameModeConfig,
    cl_getUnlockedModes,
    cl_getModesByCategory,
    cl_isModeAvailable,
    cl_generateSessionId,
    cl_createSession,
} from './cl_game_mode_types';

export type {
    ClGameModeConfig,
    ClGameSession,
    ClTeamMember,
} from './cl_game_mode_types';

// 管理器
export {
    ClGameModeManager,
    cl_getGameModeManager,
    cl_resetGameModeManager,
} from './cl_game_mode_manager';

export type {
    ClGameModeEvents,
} from './cl_game_mode_manager';

// 玩家进度系统
export {
    ClPlayerProgressManager,
    cl_getPlayerProgressManager,
    CL_MODE_UNLOCK_CONDITIONS,
} from './cl_player_progress';

export type {
    ClPlayerProgress,
    ClPlayerStats,
    ClLevelConfig,
    ClUnlockCondition,
} from './cl_player_progress';
