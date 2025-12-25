/// <reference types="vite/client" />

/**
 * Vite 环境变量类型定义
 * 
 * 模块: client
 * 文档: 文档/04-client.md
 */

interface ImportMetaEnv {
    /** 后端 API 地址 */
    readonly VITE_API_URL?: string;
    /** WebSocket 服务器地址 */
    readonly VITE_WS_URL?: string;
    /** 启用调试模式 */
    readonly VITE_DEBUG_MODE?: string;
    /** 启用 WebGPU */
    readonly VITE_ENABLE_WEBGPU?: string;
    /** 启用 AI 编辑器 */
    readonly VITE_ENABLE_EDITOR?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
