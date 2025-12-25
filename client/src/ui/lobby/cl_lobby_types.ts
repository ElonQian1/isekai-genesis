/**
 * 大厅 UI 共享配置和类型
 * 
 * 模块: client/ui/lobby
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

// =============================================================================
// 大厅 UI 配置
// =============================================================================

export const CL_LOBBY_CONFIG = {
    PANEL_WIDTH: '600px',
    PANEL_HEIGHT: '500px',
    BUTTON_COLOR: '#4a90d9',
    BUTTON_HOVER: '#5aa0e9',
    ROOM_ITEM_HEIGHT: '60px',
};

// =============================================================================
// 房间数据
// =============================================================================

export interface ClRoomData {
    id: string;
    name: string;
    playerCount: number;
    maxPlayers: number;
    status: 'waiting' | 'playing';
}

// =============================================================================
// 玩家数据
// =============================================================================

export interface ClPlayerData {
    id: string;
    name: string;
    ready: boolean;
}
