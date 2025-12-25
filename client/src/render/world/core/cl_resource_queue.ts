/**
 * 资源加载队列 - 异步预加载与进度跟踪
 * 
 * 模块: client/render/world/core
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责:
 * 1. 管理资源加载队列
 * 2. 提供加载进度回调
 * 3. 支持优先级加载
 * 4. 错误处理与重试
 */

// =============================================================================
// 类型定义
// =============================================================================

export enum ClResourceType {
    Model = 'model',
    Texture = 'texture',
    Audio = 'audio',
    Data = 'data',
}

export enum ClResourcePriority {
    Critical = 0,   // 必须立即加载（如主角模型）
    High = 1,       // 高优先级（如当前场景的核心资源）
    Normal = 2,     // 正常优先级
    Low = 3,        // 低优先级（如远处的装饰物）
    Preload = 4,    // 预加载（可能用到的资源）
}

export interface ClResourceRequest {
    id: string;
    type: ClResourceType;
    url: string;
    priority: ClResourcePriority;
    retryCount?: number;
}

export interface ClLoadProgress {
    loaded: number;
    total: number;
    percent: number;
    currentItem: string;
    failedItems: string[];
}

export type ClProgressCallback = (progress: ClLoadProgress) => void;
export type ClCompleteCallback = (success: boolean, errors: string[]) => void;

// =============================================================================
// 资源加载队列
// =============================================================================

export class ClResourceQueue {
    private queue: ClResourceRequest[] = [];
    private loading: boolean = false;
    private progress: ClLoadProgress = {
        loaded: 0,
        total: 0,
        percent: 0,
        currentItem: '',
        failedItems: [],
    };
    
    // 回调
    private onProgress: ClProgressCallback | null = null;
    private onComplete: ClCompleteCallback | null = null;
    
    // 配置
    private maxRetries: number = 3;
    private concurrentLoads: number = 4;
    private activeLoads: number = 0;
    
    // 加载函数 (由外部注入)
    private loaders: Map<ClResourceType, (url: string, id: string) => Promise<boolean>> = new Map();

    constructor() {
        // 默认配置
    }

    /**
     * 注册资源加载器
     */
    registerLoader(
        type: ClResourceType, 
        loader: (url: string, id: string) => Promise<boolean>
    ): void {
        this.loaders.set(type, loader);
    }

    /**
     * 添加资源到加载队列
     */
    enqueue(request: ClResourceRequest): void {
        // 检查是否已在队列中
        const existing = this.queue.find(r => r.id === request.id);
        if (existing) {
            // 如果新请求优先级更高，更新优先级
            if (request.priority < existing.priority) {
                existing.priority = request.priority;
                this.sortQueue();
            }
            return;
        }
        
        this.queue.push({ ...request, retryCount: 0 });
        this.progress.total++;
        this.sortQueue();
    }

    /**
     * 批量添加资源
     */
    enqueueMultiple(requests: ClResourceRequest[]): void {
        for (const request of requests) {
            this.enqueue(request);
        }
    }

    /**
     * 按优先级排序队列
     */
    private sortQueue(): void {
        this.queue.sort((a, b) => a.priority - b.priority);
    }

    /**
     * 设置进度回调
     */
    setProgressCallback(callback: ClProgressCallback): void {
        this.onProgress = callback;
    }

    /**
     * 设置完成回调
     */
    setCompleteCallback(callback: ClCompleteCallback): void {
        this.onComplete = callback;
    }

    /**
     * 开始加载队列
     */
    async start(): Promise<void> {
        if (this.loading) return;
        this.loading = true;
        
        console.log(`📦 开始加载资源队列 (${this.queue.length} 项)`);
        
        // 启动并发加载
        const loadPromises: Promise<void>[] = [];
        
        while (this.queue.length > 0 || this.activeLoads > 0) {
            // 启动新的加载任务
            while (this.activeLoads < this.concurrentLoads && this.queue.length > 0) {
                const request = this.queue.shift()!;
                loadPromises.push(this.loadItem(request));
            }
            
            // 等待一个任务完成
            if (this.activeLoads > 0) {
                await Promise.race(loadPromises.filter(p => p !== undefined));
            }
        }
        
        // 等待所有任务完成
        await Promise.all(loadPromises);
        
        this.loading = false;
        
        const success = this.progress.failedItems.length === 0;
        console.log(success 
            ? `✅ 资源加载完成` 
            : `⚠️ 资源加载完成，${this.progress.failedItems.length} 项失败`
        );
        
        this.onComplete?.(success, this.progress.failedItems);
    }

    /**
     * 加载单个资源
     */
    private async loadItem(request: ClResourceRequest): Promise<void> {
        this.activeLoads++;
        this.progress.currentItem = request.id;
        
        try {
            const loader = this.loaders.get(request.type);
            if (!loader) {
                throw new Error(`No loader registered for type: ${request.type}`);
            }
            
            const success = await loader(request.url, request.id);
            
            if (!success) {
                throw new Error(`Loader returned false for: ${request.id}`);
            }
            
            this.progress.loaded++;
        } catch (error) {
            console.warn(`⚠️ 加载失败: ${request.id}`, error);
            
            // 重试逻辑
            if ((request.retryCount || 0) < this.maxRetries) {
                request.retryCount = (request.retryCount || 0) + 1;
                console.log(`🔄 重试 (${request.retryCount}/${this.maxRetries}): ${request.id}`);
                this.queue.unshift(request); // 放回队列头部
            } else {
                this.progress.failedItems.push(request.id);
                this.progress.loaded++; // 仍然计入进度
            }
        }
        
        this.activeLoads--;
        this.updateProgress();
    }

    /**
     * 更新进度
     */
    private updateProgress(): void {
        this.progress.percent = this.progress.total > 0 
            ? (this.progress.loaded / this.progress.total) * 100 
            : 0;
        
        this.onProgress?.(this.progress);
    }

    /**
     * 获取当前进度
     */
    getProgress(): ClLoadProgress {
        return { ...this.progress };
    }

    /**
     * 是否正在加载
     */
    isLoading(): boolean {
        return this.loading;
    }

    /**
     * 清空队列
     */
    clear(): void {
        this.queue = [];
        this.progress = {
            loaded: 0,
            total: 0,
            percent: 0,
            currentItem: '',
            failedItems: [],
        };
    }
}
