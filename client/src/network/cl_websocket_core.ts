/**
 * WebSocket 核心连接管理器
 * 
 * 模块: client/network
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责:
 * 1. 管理 WebSocket 连接生命周期
 * 2. 自动重连与心跳
 * 3. 消息发送与接收
 * 4. 事件分发
 * 
 * 设计原则:
 * - 单一职责：只负责连接管理，不处理业务逻辑
 * - 事件驱动：通过回调/事件通知上层
 * - 可测试性：支持依赖注入
 */

import {
    ClMessage,
    ClMessageType,
    ClConnectionState,
    ClNetworkConfig,
    CL_DEFAULT_NETWORK_CONFIG,
} from './cl_network_types';

// =============================================================================
// 事件回调类型
// =============================================================================

export type ClMessageHandler<T = unknown> = (data: T) => void;
export type ClConnectionHandler = () => void;
export type ClErrorHandler = (error: Error) => void;
export type ClDisconnectHandler = (reason: string) => void;
export type ClStateChangeHandler = (state: ClConnectionState) => void;

export interface ClConnectionCallbacks {
    onConnect?: ClConnectionHandler;
    onDisconnect?: ClDisconnectHandler;
    onError?: ClErrorHandler;
    onStateChange?: ClStateChangeHandler;
}

// =============================================================================
// WebSocket 核心管理器
// =============================================================================

export class ClWebSocketCore {
    private ws: WebSocket | null = null;
    private config: ClNetworkConfig;
    private state: ClConnectionState = ClConnectionState.Disconnected;
    
    // 重连状态
    private reconnectAttempts: number = 0;
    private reconnectTimer: number | null = null;
    
    // 心跳
    private heartbeatTimer: number | null = null;
    private lastPongTime: number = 0;
    
    // 回调
    private connectionCallbacks: ClConnectionCallbacks = {};
    private messageHandlers: Map<ClMessageType, ClMessageHandler[]> = new Map();
    private globalMessageHandler: ((message: ClMessage) => void) | null = null;
    
    // 连接 Promise (用于 await connect())
    private connectPromise: {
        resolve: () => void;
        reject: (error: Error) => void;
    } | null = null;

    constructor(config?: Partial<ClNetworkConfig>) {
        this.config = { ...CL_DEFAULT_NETWORK_CONFIG, ...config };
    }

    // =========================================================================
    // 公共 API - 连接管理
    // =========================================================================

    /**
     * 连接服务器
     */
    async connect(): Promise<void> {
        if (this.state === ClConnectionState.Connected) {
            console.log('📡 已连接到服务器');
            return;
        }

        if (this.state === ClConnectionState.Connecting) {
            console.log('📡 正在连接中...');
            return;
        }

        return new Promise((resolve, reject) => {
            this.connectPromise = { resolve, reject };
            this.setState(ClConnectionState.Connecting);
            this.createWebSocket();
        });
    }

    /**
     * 断开连接
     */
    disconnect(): void {
        this.stopReconnect();
        this.stopHeartbeat();
        
        if (this.ws) {
            // 避免触发 onclose 的重连逻辑
            this.ws.onclose = null;
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
        
        this.setState(ClConnectionState.Disconnected);
    }

    /**
     * 发送消息
     */
    send<T>(type: ClMessageType, data?: T): boolean {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('❌ 未连接到服务器');
            return false;
        }

        const message: ClMessage<T> = {
            type,
            data,
            timestamp: Date.now(),
        };

        try {
            this.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('❌ 发送消息失败:', error);
            return false;
        }
    }

    // =========================================================================
    // 公共 API - 事件订阅
    // =========================================================================

    /**
     * 设置连接回调
     */
    setConnectionCallbacks(callbacks: ClConnectionCallbacks): void {
        this.connectionCallbacks = { ...this.connectionCallbacks, ...callbacks };
    }

    /**
     * 订阅特定消息类型
     */
    on<T>(type: ClMessageType, handler: ClMessageHandler<T>): () => void {
        if (!this.messageHandlers.has(type)) {
            this.messageHandlers.set(type, []);
        }
        
        this.messageHandlers.get(type)!.push(handler as ClMessageHandler);
        
        // 返回取消订阅函数
        return () => this.off(type, handler as ClMessageHandler);
    }

    /**
     * 取消订阅
     */
    off(type: ClMessageType, handler: ClMessageHandler): void {
        const handlers = this.messageHandlers.get(type);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index !== -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * 设置全局消息处理器（调试用）
     */
    setGlobalMessageHandler(handler: ((message: ClMessage) => void) | null): void {
        this.globalMessageHandler = handler;
    }

    // =========================================================================
    // 公共 API - 状态查询
    // =========================================================================

    /**
     * 获取当前连接状态
     */
    getState(): ClConnectionState {
        return this.state;
    }

    /**
     * 是否已连接
     */
    isConnected(): boolean {
        return this.state === ClConnectionState.Connected;
    }

    /**
     * 获取服务器 URL
     */
    getServerUrl(): string {
        return this.config.serverUrl;
    }

    // =========================================================================
    // 私有方法 - WebSocket 管理
    // =========================================================================

    private createWebSocket(): void {
        try {
            console.log(`📡 连接服务器: ${this.config.serverUrl}`);
            this.ws = new WebSocket(this.config.serverUrl);
            
            this.ws.onopen = this.handleOpen.bind(this);
            this.ws.onclose = this.handleClose.bind(this);
            this.ws.onerror = this.handleError.bind(this);
            this.ws.onmessage = this.handleMessage.bind(this);
            
            // 连接超时
            setTimeout(() => {
                if (this.state === ClConnectionState.Connecting) {
                    console.error('❌ 连接超时');
                    this.ws?.close();
                    this.connectPromise?.reject(new Error('连接超时'));
                    this.connectPromise = null;
                }
            }, this.config.connectionTimeout);
            
        } catch (error) {
            console.error('❌ 创建 WebSocket 失败:', error);
            this.setState(ClConnectionState.Failed);
            this.connectPromise?.reject(error as Error);
            this.connectPromise = null;
        }
    }

    private handleOpen(): void {
        console.log('✅ 服务器连接成功!');
        this.setState(ClConnectionState.Connected);
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        
        this.connectionCallbacks.onConnect?.();
        this.connectPromise?.resolve();
        this.connectPromise = null;
    }

    private handleClose(event: CloseEvent): void {
        console.log(`❌ 连接断开: ${event.reason || '未知原因'} (code: ${event.code})`);
        this.stopHeartbeat();
        
        const wasConnected = this.state === ClConnectionState.Connected;
        
        // 正常关闭不重连
        if (event.code === 1000) {
            this.setState(ClConnectionState.Disconnected);
        } else if (wasConnected) {
            // 异常断开尝试重连
            this.tryReconnect();
        }
        
        this.connectionCallbacks.onDisconnect?.(event.reason || '连接关闭');
    }

    private handleError(event: Event): void {
        console.error('❌ WebSocket 错误:', event);
        const error = new Error('WebSocket 连接错误');
        this.connectionCallbacks.onError?.(error);
        
        if (this.connectPromise) {
            this.connectPromise.reject(error);
            this.connectPromise = null;
        }
    }

    private handleMessage(event: MessageEvent): void {
        try {
            const message: ClMessage = JSON.parse(event.data);
            
            // 调试日志
            if (message.type !== ClMessageType.Pong) {
                console.log(`📨 收到消息: ${message.type}`, message.data);
            }
            
            // 全局处理器
            this.globalMessageHandler?.(message);
            
            // 特殊处理: Pong
            if (message.type === ClMessageType.Pong) {
                this.lastPongTime = Date.now();
                return;
            }
            
            // 分发到订阅者
            const handlers = this.messageHandlers.get(message.type);
            if (handlers) {
                for (const handler of handlers) {
                    try {
                        handler(message.data);
                    } catch (error) {
                        console.error(`❌ 消息处理器错误 [${message.type}]:`, error);
                    }
                }
            }
        } catch (error) {
            console.error('❌ 解析消息失败:', error);
        }
    }

    // =========================================================================
    // 私有方法 - 重连
    // =========================================================================

    private tryReconnect(): void {
        if (this.reconnectAttempts >= this.config.reconnectAttempts) {
            console.error('❌ 重连次数已达上限');
            this.setState(ClConnectionState.Failed);
            return;
        }

        this.reconnectAttempts++;
        this.setState(ClConnectionState.Reconnecting);
        
        console.log(`🔄 尝试重连 (${this.reconnectAttempts}/${this.config.reconnectAttempts})...`);

        this.reconnectTimer = window.setTimeout(() => {
            this.createWebSocket();
        }, this.config.reconnectDelay);
    }

    private stopReconnect(): void {
        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.reconnectAttempts = 0;
    }

    // =========================================================================
    // 私有方法 - 心跳
    // =========================================================================

    private startHeartbeat(): void {
        this.lastPongTime = Date.now();
        
        this.heartbeatTimer = window.setInterval(() => {
            // 检查心跳超时
            if (Date.now() - this.lastPongTime > this.config.heartbeatInterval * 2) {
                console.warn('⚠️ 心跳超时，重新连接...');
                this.ws?.close();
                return;
            }
            
            this.send(ClMessageType.Ping);
        }, this.config.heartbeatInterval);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatTimer !== null) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    // =========================================================================
    // 私有方法 - 状态管理
    // =========================================================================

    private setState(newState: ClConnectionState): void {
        if (this.state !== newState) {
            console.log(`📡 连接状态: ${this.state} -> ${newState}`);
            this.state = newState;
            this.connectionCallbacks.onStateChange?.(newState);
        }
    }

    // =========================================================================
    // 清理
    // =========================================================================

    /**
     * 销毁实例
     */
    dispose(): void {
        this.disconnect();
        this.messageHandlers.clear();
        this.connectionCallbacks = {};
        this.globalMessageHandler = null;
    }
}

// =============================================================================
// 全局单例
// =============================================================================

let wsCore: ClWebSocketCore | null = null;

/**
 * 获取 WebSocket 核心单例
 */
export function cl_getWebSocketCore(config?: Partial<ClNetworkConfig>): ClWebSocketCore {
    if (!wsCore) {
        wsCore = new ClWebSocketCore(config);
    }
    return wsCore;
}

/**
 * 重置 WebSocket 核心（用于测试）
 */
export function cl_resetWebSocketCore(): void {
    wsCore?.dispose();
    wsCore = null;
}
