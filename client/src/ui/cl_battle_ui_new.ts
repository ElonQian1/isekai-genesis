/**
 * 战斗 UI 组件 (向后兼容重导出)
 * 
 * 模块: client/ui
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * ⚠️ 此文件已重构，请使用 ./battle/ 模块
 * 保留此文件以支持现有导入
 */

// 重导出所有战斗 UI 组件
export {
    CL_BATTLE_UI_CONFIG as CL_UI_CONFIG,
    ClPlayerInfoPanel,
    ClTurnIndicator,
    ClEndTurnButton,
    ClBattleUIManager as ClBattleUI,
    type ClBattleUIEvents,
    type ClBattlePlayerData as ClPlayerData,
    type ClBattleStateData as ClBattleState,
} from './battle';
