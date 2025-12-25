/**
 * 战斗 UI 模块导出
 * 
 * 模块: client/ui/battle
 * 职责: 统一导出所有战斗 UI 组件
 */

// 类型和配置
export { 
    CL_BATTLE_UI_CONFIG,
    type ClBattlePlayerStats,
    type ClBattlePlayerData,
    type ClBattleStateData,
} from './cl_battle_ui_types';

// 组件
export { ClPlayerInfoPanel } from './cl_player_info_panel';
export { ClTurnIndicator } from './cl_turn_indicator';
export { ClEndTurnButton } from './cl_end_turn_button';

// 管理器
export { ClBattleUIManager, type ClBattleUIEvents } from './cl_battle_ui_manager';
