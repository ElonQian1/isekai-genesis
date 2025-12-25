/**
 * 大厅和房间 UI (向后兼容导出)
 * 
 * ⚠️ 此文件已模块化，请使用新的导入路径：
 * import { ClLobbyUI } from './ui/lobby/cl_lobby_panel';
 * import { ClRoomUI } from './ui/lobby/cl_room_panel';
 * import { ClRoomData } from './ui/lobby/cl_lobby_types';
 * 
 * 模块: client/ui
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

// 重新导出所有内容，保持向后兼容
export type { ClRoomData, ClPlayerData } from './lobby/cl_lobby_types';
export { CL_LOBBY_CONFIG } from './lobby/cl_lobby_types';
export { ClLobbyUI } from './lobby/cl_lobby_panel';
export { ClRoomUI } from './lobby/cl_room_panel';
