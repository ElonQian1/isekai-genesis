/**
 * 场景处理器模块索引
 * 
 * 模块: client/scenes/handlers
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

// 认证处理器
export { ClAuthHandler } from './cl_auth_handler';
export type { ClAuthHandlerConfig } from './cl_auth_handler';

// 房间处理器
export { ClRoomHandler } from './cl_room_handler';
export type { ClRoomHandlerConfig, ClRoomHandlerCallbacks } from './cl_room_handler';
