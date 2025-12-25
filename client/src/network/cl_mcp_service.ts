/**
 * MCP 服务
 * 
 * 模块: client/network
 * 前缀: Cl
 * 文档: 文档/12-MCP-API.md
 * 
 * 职责:
 * 1. 监听 MCP WebSocket 消息
 * 2. 分发 MCP 命令给注册的处理器 (通常是编辑器)
 */

import { ClWebSocketCore } from './cl_websocket_core';
import { ClMessageType } from './cl_network_types';
import { ClMcpCommand } from './cl_mcp_types';

export interface ClMcpHandler {
    handleMcpCommand(command: ClMcpCommand): void;
}

export class ClMcpService {
    private static instance: ClMcpService;
    private wsCore: ClWebSocketCore | null = null;
    private handler: ClMcpHandler | null = null;
    
    private constructor() {}
    
    static getInstance(): ClMcpService {
        if (!ClMcpService.instance) {
            ClMcpService.instance = new ClMcpService();
        }
        return ClMcpService.instance;
    }
    
    /**
     * 初始化
     */
    init(wsCore: ClWebSocketCore): void {
        this.wsCore = wsCore;
        
        // 注册消息处理器
        this.wsCore.on(ClMessageType.McpCommand, (data: any) => {
            this.onMcpMessage(data);
        });
        
        console.log('🤖 MCP 服务已初始化');
    }
    
    /**
     * 注册命令处理器 (通常是 WorldScene 或 EditorManager)
     */
    registerHandler(handler: ClMcpHandler): void {
        this.handler = handler;
        console.log('🤖 MCP 命令处理器已注册');
    }
    
    /**
     * 处理 MCP 消息
     */
    private onMcpMessage(data: any): void {
        if (!this.handler) {
            console.warn('⚠️ 收到 MCP 命令但未注册处理器');
            return;
        }
        
        const command = data.command as ClMcpCommand;
        if (command) {
            console.log('🤖 收到 MCP 命令:', command);
            this.handler.handleMcpCommand(command);
        }
    }
}

export const cl_getMcpService = () => ClMcpService.getInstance();
