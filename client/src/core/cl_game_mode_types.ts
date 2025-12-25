/**
 * 游戏模式类型定义
 * 
 * 定义所有游戏模式的类型、配置和状态
 * 
 * 模块: client/core
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

// =============================================================================
// 游戏模式枚举
// =============================================================================

/**
 * 游戏模式类型
 */
export enum ClGameMode {
    /** 单人探索 - 独自闯荡江湖 */
    SoloExplore = 'solo_explore',
    
    /** 组队探索 - 与好友结伴探索 */
    TeamExplore = 'team_explore',
    
    /** 小型BOSS - 2-4人副本 */
    MiniBoss = 'mini_boss',
    
    /** 周本BOSS - 8人跨组织团战 */
    WeeklyBoss = 'weekly_boss',
    
    /** PVP竞技 - 1v1对战 */
    PvpArena = 'pvp_arena',
}

/**
 * 游戏模式分类
 */
export enum ClGameModeCategory {
    /** PVE - 玩家对抗环境 */
    PVE = 'pve',
    
    /** PVP - 玩家对抗玩家 */
    PVP = 'pvp',
    
    /** 混合 - PVP+PVE */
    Mixed = 'mixed',
}

// =============================================================================
// 游戏模式配置
// =============================================================================

/**
 * 游戏模式配置接口
 */
export interface ClGameModeConfig {
    /** 模式ID */
    id: ClGameMode;
    
    /** 显示名称 */
    name: string;
    
    /** 描述 */
    description: string;
    
    /** 图标 (emoji 或资源路径) */
    icon: string;
    
    /** 分类 */
    category: ClGameModeCategory;
    
    /** 最小玩家数 */
    minPlayers: number;
    
    /** 最大玩家数 */
    maxPlayers: number;
    
    /** 是否需要联网 */
    requiresNetwork: boolean;
    
    /** 是否支持匹配 */
    supportsMatchmaking: boolean;
    
    /** 是否支持私人房间 */
    supportsPrivateRoom: boolean;
    
    /** 推荐等级范围 */
    recommendedLevel: { min: number; max: number };
    
    /** 预计时长 (分钟) */
    estimatedDuration: number;
    
    /** 是否已解锁 (默认true, 可根据玩家进度动态设置) */
    unlocked: boolean;
    
    /** 解锁条件描述 */
    unlockRequirement?: string;
}

// =============================================================================
// 游戏模式配置表
// =============================================================================

/**
 * 所有游戏模式的配置
 */
export const CL_GAME_MODE_CONFIGS: Record<ClGameMode, ClGameModeConfig> = {
    [ClGameMode.SoloExplore]: {
        id: ClGameMode.SoloExplore,
        name: '单人探索',
        description: '独自闯荡江湖，探索未知区域，挑战各路敌人',
        icon: '🗡️',
        category: ClGameModeCategory.PVE,
        minPlayers: 1,
        maxPlayers: 1,
        requiresNetwork: false,
        supportsMatchmaking: false,
        supportsPrivateRoom: false,
        recommendedLevel: { min: 1, max: 100 },
        estimatedDuration: 30,
        unlocked: true,
    },
    
    [ClGameMode.TeamExplore]: {
        id: ClGameMode.TeamExplore,
        name: '组队探索',
        description: '与志同道合的侠客结伴而行，共同面对江湖险恶',
        icon: '👥',
        category: ClGameModeCategory.PVE,
        minPlayers: 2,
        maxPlayers: 4,
        requiresNetwork: true,
        supportsMatchmaking: true,
        supportsPrivateRoom: true,
        recommendedLevel: { min: 5, max: 100 },
        estimatedDuration: 45,
        unlocked: true,
    },
    
    [ClGameMode.MiniBoss]: {
        id: ClGameMode.MiniBoss,
        name: '小型BOSS副本',
        description: '挑战强大的江湖BOSS，获取珍稀装备和材料',
        icon: '👹',
        category: ClGameModeCategory.PVE,
        minPlayers: 2,
        maxPlayers: 4,
        requiresNetwork: true,
        supportsMatchmaking: true,
        supportsPrivateRoom: true,
        recommendedLevel: { min: 15, max: 100 },
        estimatedDuration: 20,
        unlocked: false,
        unlockRequirement: '通关「初入江湖」章节',
    },
    
    [ClGameMode.WeeklyBoss]: {
        id: ClGameMode.WeeklyBoss,
        name: '周本BOSS',
        description: '四大组织联合围剿传说级BOSS，每周限定挑战',
        icon: '🐉',
        category: ClGameModeCategory.Mixed,
        minPlayers: 8,
        maxPlayers: 8,
        requiresNetwork: true,
        supportsMatchmaking: true,
        supportsPrivateRoom: false,
        recommendedLevel: { min: 30, max: 100 },
        estimatedDuration: 60,
        unlocked: false,
        unlockRequirement: '达到30级并加入一个组织',
    },
    
    [ClGameMode.PvpArena]: {
        id: ClGameMode.PvpArena,
        name: 'PVP竞技',
        description: '与其他玩家一决高下，证明你的江湖地位',
        icon: '⚔️',
        category: ClGameModeCategory.PVP,
        minPlayers: 2,
        maxPlayers: 2,
        requiresNetwork: true,
        supportsMatchmaking: true,
        supportsPrivateRoom: true,
        recommendedLevel: { min: 10, max: 100 },
        estimatedDuration: 15,
        unlocked: false,
        unlockRequirement: '达到10级',
    },
};

// =============================================================================
// 会话状态
// =============================================================================

/**
 * 游戏会话状态
 */
export enum ClSessionState {
    /** 空闲 - 未进入任何模式 */
    Idle = 'idle',
    
    /** 等待中 - 在房间等待其他玩家 */
    Waiting = 'waiting',
    
    /** 匹配中 - 正在匹配队友 */
    Matchmaking = 'matchmaking',
    
    /** 探索中 - 在大世界探索 */
    Exploring = 'exploring',
    
    /** 战斗中 - 正在战斗 */
    InBattle = 'in_battle',
    
    /** 结算中 - 战斗结束结算 */
    Settling = 'settling',
}

/**
 * 游戏会话信息
 */
export interface ClGameSession {
    /** 会话ID */
    id: string;
    
    /** 当前模式 */
    mode: ClGameMode;
    
    /** 当前状态 */
    state: ClSessionState;
    
    /** 房间ID (组队模式) */
    roomId?: string;
    
    /** 队伍成员 */
    teamMembers: ClTeamMember[];
    
    /** 创建时间 */
    createdAt: number;
    
    /** 是否是房主 */
    isHost: boolean;
}

/**
 * 队伍成员信息
 */
export interface ClTeamMember {
    /** 玩家ID */
    id: string;
    
    /** 玩家名称 */
    name: string;
    
    /** 头像 */
    avatar?: string;
    
    /** 等级 */
    level: number;
    
    /** 所属组织 */
    organization?: string;
    
    /** 是否房主 */
    isHost: boolean;
    
    /** 是否准备 */
    isReady: boolean;
    
    /** 是否在线 */
    isOnline: boolean;
}

// =============================================================================
// 辅助函数
// =============================================================================

/**
 * 获取游戏模式配置
 */
export function cl_getGameModeConfig(mode: ClGameMode): ClGameModeConfig {
    return CL_GAME_MODE_CONFIGS[mode];
}

/**
 * 获取所有已解锁的游戏模式
 */
export function cl_getUnlockedModes(): ClGameModeConfig[] {
    return Object.values(CL_GAME_MODE_CONFIGS).filter(config => config.unlocked);
}

/**
 * 按分类获取游戏模式
 */
export function cl_getModesByCategory(category: ClGameModeCategory): ClGameModeConfig[] {
    return Object.values(CL_GAME_MODE_CONFIGS).filter(
        config => config.category === category
    );
}

/**
 * 检查模式是否可用
 */
export function cl_isModeAvailable(mode: ClGameMode, isOnline: boolean): boolean {
    const config = CL_GAME_MODE_CONFIGS[mode];
    if (!config.unlocked) return false;
    if (config.requiresNetwork && !isOnline) return false;
    return true;
}

/**
 * 生成会话ID
 */
export function cl_generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 创建新会话
 */
export function cl_createSession(mode: ClGameMode, playerId: string, playerName: string): ClGameSession {
    return {
        id: cl_generateSessionId(),
        mode,
        state: ClSessionState.Idle,
        teamMembers: [{
            id: playerId,
            name: playerName,
            level: 1,
            isHost: true,
            isReady: false,
            isOnline: true,
        }],
        createdAt: Date.now(),
        isHost: true,
    };
}
