/**
 * 前端日志收集器
 * 
 * 模块: client/core
 * 功能: Hook console 方法，收集浏览器日志发送到后端保存
 * 日志路径: 文档/日志/client.log
 * 
 * 重连策略: 指数退避 (Exponential Backoff)
 * - 第1次失败: 等待 2 秒
 * - 第2次失败: 等待 4 秒
 * - 第3次失败: 等待 8 秒
 * - 第N次失败: 等待 min(2^N, 60) 秒
 */

// 日志级别
type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

// 日志条目
interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    args?: unknown[];
}

// 日志缓冲区
const logBuffer: LogEntry[] = [];
const MAX_BUFFER_SIZE = 100;
const FLUSH_INTERVAL = 3000; // 3秒刷新一次

// 服务器地址 (从 Vite 环境变量读取，支持本地开发和生产部署)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const LOG_SERVER_URL = `${API_BASE_URL}/api/logs/client`;

// ============================================================================
// 指数退避 (Exponential Backoff) 配置
// ============================================================================
const BACKOFF_BASE = 2000;      // 基础等待时间: 2秒
const BACKOFF_MAX = 60000;      // 最大等待时间: 60秒
const BACKOFF_MULTIPLIER = 2;   // 每次失败乘以 2

// 连接状态
let serverAvailable = true;
let failCount = 0;
let pauseUntil = 0; // 暂停到这个时间戳

/**
 * 计算退避时间 (指数退避 + 抖动)
 * @param attempt 失败次数
 * @returns 等待时间(毫秒)
 */
function calculateBackoff(attempt: number): number {
    // 指数增长: base * multiplier^(attempt-1)
    const exponentialDelay = BACKOFF_BASE * Math.pow(BACKOFF_MULTIPLIER, attempt - 1);
    // 添加随机抖动 (±25%) 防止多个客户端同时重试
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
    // 限制最大值
    return Math.min(exponentialDelay + jitter, BACKOFF_MAX);
}

// 保存原始 console 方法
const originalConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
};

/**
 * 格式化日志参数
 */
function formatArgs(args: unknown[]): string {
    return args.map(arg => {
        if (typeof arg === 'object') {
            try {
                return JSON.stringify(arg, null, 2);
            } catch {
                return String(arg);
            }
        }
        return String(arg);
    }).join(' ');
}

/**
 * 创建日志拦截器
 */
function createLogInterceptor(level: LogLevel) {
    return function(...args: unknown[]) {
        // 调用原始方法
        originalConsole[level](...args);
        
        // 如果服务器不可用，不添加到缓冲区（避免内存泄漏）
        if (!serverAvailable && logBuffer.length > MAX_BUFFER_SIZE) {
            return;
        }
        
        // 添加到缓冲区
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message: formatArgs(args),
        };
        
        logBuffer.push(entry);
        
        // 如果缓冲区满了且服务器可用，立即刷新
        if (logBuffer.length >= MAX_BUFFER_SIZE && serverAvailable) {
            flushLogs();
        }
    };
}

/**
 * 刷新日志到服务器
 */
async function flushLogs(): Promise<void> {
    if (logBuffer.length === 0) return;
    
    // 检查是否在暂停期
    const now = Date.now();
    if (now < pauseUntil) {
        return;
    }
    
    // 取出当前缓冲区的日志
    const logsToSend = [...logBuffer];
    logBuffer.length = 0;
    
    try {
        const response = await fetch(LOG_SERVER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ logs: logsToSend }),
        });
        
        if (response.ok) {
            // 成功，重置状态
            if (!serverAvailable) {
                originalConsole.info('[Logger] ✅ 服务器连接恢复');
            }
            serverAvailable = true;
            failCount = 0;
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch {
        failCount++;
        
        // 计算指数退避时间
        const backoffTime = calculateBackoff(failCount);
        pauseUntil = now + backoffTime;
        serverAvailable = false;
        
        // 显示友好的等待时间
        const waitSeconds = Math.round(backoffTime / 1000);
        originalConsole.warn(
            `[Logger] ⚠️ 日志服务器不可用 (第${failCount}次失败)，${waitSeconds}秒后重试`
        );
        
        // 失败时把日志放回缓冲区（但限制大小）
        if (logBuffer.length + logsToSend.length <= MAX_BUFFER_SIZE * 2) {
            logBuffer.unshift(...logsToSend);
        } else {
            // 缓冲区满了，丢弃旧日志
            originalConsole.warn('[Logger] 缓冲区已满，丢弃部分日志');
        }
    }
}

/**
 * 初始化日志收集器
 */
export function cl_initLogger(): void {
    // Hook console 方法
    console.log = createLogInterceptor('log');
    console.info = createLogInterceptor('info');
    console.warn = createLogInterceptor('warn');
    console.error = createLogInterceptor('error');
    console.debug = createLogInterceptor('debug');
    
    // 定时刷新日志
    setInterval(flushLogs, FLUSH_INTERVAL);
    
    // 页面卸载时刷新
    window.addEventListener('beforeunload', () => {
        flushLogs();
    });
    
    // 捕获未处理的错误
    window.addEventListener('error', (event) => {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level: 'error',
            message: `[未捕获错误] ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`,
        };
        logBuffer.push(entry);
        flushLogs();
    });
    
    // 捕获未处理的 Promise 拒绝
    window.addEventListener('unhandledrejection', (event) => {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level: 'error',
            message: `[未处理的Promise拒绝] ${event.reason}`,
        };
        logBuffer.push(entry);
        flushLogs();
    });
    
    originalConsole.info('[Logger] 📝 日志收集器已初始化');
}

/**
 * 手动刷新日志
 */
export function cl_flushLogs(): Promise<void> {
    return flushLogs();
}

/**
 * 获取原始 console（用于不需要记录的内部日志）
 */
export const cl_originalConsole = originalConsole;
