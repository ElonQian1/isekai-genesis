/**
 * 战斗 UI 类型和配置
 * 
 * 模块: client/ui/battle
 * 前缀: Cl
 * 职责: 定义战斗 UI 共享类型、配置常量
 */

// =============================================================================
// UI 配置
// =============================================================================

export const CL_BATTLE_UI_CONFIG = {
    // 颜色
    HEALTH_COLOR: '#00ff44',
    ENERGY_COLOR: '#ffcc00',
    BLOCK_COLOR: '#4488ff',
    TURN_INDICATOR_COLOR: '#ffd700',
    
    // 玩家面板
    PLAYER_PANEL_WIDTH: '260px',
    PLAYER_PANEL_HEIGHT: '100px',
    PLAYER_PANEL_CORNER_RADIUS: 10,
    
    // 结束回合按钮
    END_TURN_BUTTON_WIDTH: '120px',
    END_TURN_BUTTON_HEIGHT: '50px',
    
    // 回合指示器
    TURN_INDICATOR_WIDTH: '200px',
    TURN_INDICATOR_HEIGHT: '60px',
};

// =============================================================================
// 玩家数据类型
// =============================================================================

export interface ClBattlePlayerStats {
    hp: number;
    max_hp: number;
    energy: number;
    max_energy: number;
    defense: number;
}

export interface ClBattlePlayerData {
    id: string;
    name: string;
    stats: ClBattlePlayerStats;
    deck: unknown[];
    discard: unknown[];
}

// =============================================================================
// 战斗状态类型
// =============================================================================

export interface ClBattleStateData {
    players: ClBattlePlayerData[];
    current_player_index: number;
    turn: number;
    phase: string;
}
