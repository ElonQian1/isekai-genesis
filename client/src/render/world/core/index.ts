/**
 * 核心资源管理模块导出
 * 
 * 模块: client/render/world/core
 * 职责: 统一导出资源加载和管理相关组件
 */

// 关卡加载器
export { ClLevelLoader } from './cl_level_loader';
export type { MapData, MapEntityData } from './cl_level_loader';

// 资源加载队列
export { 
    ClResourceQueue,
    ClResourceType,
    ClResourcePriority,
} from './cl_resource_queue';
export type {
    ClResourceRequest,
    ClLoadProgress,
    ClProgressCallback,
    ClCompleteCallback,
} from './cl_resource_queue';

// 纹理流式加载
export {
    ClTextureStreaming,
    ClTextureQuality,
} from './cl_texture_streaming';
export type {
    ClTextureSet,
    ClTextureStreamingConfig,
} from './cl_texture_streaming';

// 资源系统集成控制器
export { ClResourceIntegration } from './cl_resource_integration';
export type {
    ClResourceIntegrationConfig,
    ClResourceStats,
    ClLoadingStateCallback,
} from './cl_resource_integration';
