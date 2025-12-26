/**
 * UI 模块导出
 * 
 * 模块: client/ui
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

export * from './cl_battle_ui';
export * from './cl_login_ui';
export * from './cl_auth_ui';
export * from './cl_lobby_ui';
export * from './cl_target_selector';
export * from './cl_message_ui';
export * from './cl_card_pool_ui';
export * from './cl_battlefield_ui';
export * from './cl_game_mode_ui';
export * from './cl_tavern_shop_ui';
export * from './cl_bench_ui';
export * from './cl_tavern_arena_ui';

// 战斗 UI 模块 (新模块化版本，单独导出避免冲突)
export * as BattleUI from './battle';

// 大厅 UI 模块 (新模块化版本，单独导出避免冲突)
export * as LobbyUI from './lobby';
