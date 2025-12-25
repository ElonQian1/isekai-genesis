/**
 * 认证服务模块
 * 
 * 负责用户登录、注册、Token 管理
 * 
 * 模块: client/network
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

// =============================================================================
// 类型定义
// =============================================================================

/** 认证请求 */
export interface ClAuthRequest {
    username: string;
    password: string;
}

/** 认证响应 */
export interface ClAuthResponse {
    token: string;
    user_id: string;
    username: string;
}

/** 用户信息 */
export interface ClUserInfo {
    user_id: string;
    username: string;
}

/** 认证状态 */
export type ClAuthState = 'idle' | 'loading' | 'authenticated' | 'error';

// =============================================================================
// 本地存储 Key
// =============================================================================

const CL_AUTH_TOKEN_KEY = 'cl_auth_token';
const CL_USER_INFO_KEY = 'cl_user_info';

// =============================================================================
// 认证服务类
// =============================================================================

class ClAuthService {
    private _state: ClAuthState = 'idle';
    private _token: string | null = null;
    private _user: ClUserInfo | null = null;
    private _listeners: Set<(state: ClAuthState) => void> = new Set();
    private _baseUrl: string;

    constructor() {
        // 根据环境自动选择 API 地址
        this._baseUrl = this._getApiBaseUrl();
        // 尝试从本地存储恢复登录状态
        this._restoreSession();
    }

    /** 获取 API 基础地址 */
    private _getApiBaseUrl(): string {
        // 优先使用 Vite 环境变量
        if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
            return import.meta.env.VITE_API_URL;
        }
        // 其次使用全局配置
        const globalConfig = (window as unknown as { CL_API_URL?: string }).CL_API_URL;
        if (globalConfig) {
            return globalConfig;
        }
        // 本地开发环境
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        }
        // 生产环境使用同域名
        return window.location.origin;
    }

    /** 从本地存储恢复会话 */
    private _restoreSession(): void {
        try {
            const token = localStorage.getItem(CL_AUTH_TOKEN_KEY);
            const userJson = localStorage.getItem(CL_USER_INFO_KEY);
            
            if (token && userJson) {
                this._token = token;
                this._user = JSON.parse(userJson);
                this._state = 'authenticated';
                console.log('[ClAuthService] 会话已恢复:', this._user?.username);
            }
        } catch (e) {
            console.warn('[ClAuthService] 恢复会话失败:', e);
            this._clearSession();
        }
    }

    /** 保存会话到本地存储 */
    private _saveSession(token: string, user: ClUserInfo): void {
        localStorage.setItem(CL_AUTH_TOKEN_KEY, token);
        localStorage.setItem(CL_USER_INFO_KEY, JSON.stringify(user));
    }

    /** 清除会话 */
    private _clearSession(): void {
        localStorage.removeItem(CL_AUTH_TOKEN_KEY);
        localStorage.removeItem(CL_USER_INFO_KEY);
        this._token = null;
        this._user = null;
    }

    /** 设置状态并通知监听器 */
    private _setState(state: ClAuthState): void {
        this._state = state;
        this._listeners.forEach(listener => listener(state));
    }

    // =============================================================================
    // 公共 API
    // =============================================================================

    /** 当前状态 */
    get state(): ClAuthState {
        return this._state;
    }

    /** 当前 Token */
    get token(): string | null {
        return this._token;
    }

    /** 当前用户信息 */
    get user(): ClUserInfo | null {
        return this._user;
    }

    /** 是否已登录 */
    get isAuthenticated(): boolean {
        return this._state === 'authenticated' && this._token !== null;
    }

    /** 添加状态变化监听器 */
    onStateChange(listener: (state: ClAuthState) => void): () => void {
        this._listeners.add(listener);
        return () => this._listeners.delete(listener);
    }

    /** 用户注册 */
    async register(username: string, password: string): Promise<ClAuthResponse> {
        this._setState('loading');
        
        try {
            const response = await fetch(`${this._baseUrl}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password } as ClAuthRequest),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || '注册失败');
            }

            const data: ClAuthResponse = await response.json();
            
            // 保存会话
            this._token = data.token;
            this._user = { user_id: data.user_id, username: data.username };
            this._saveSession(data.token, this._user);
            this._setState('authenticated');
            
            console.log('[ClAuthService] 注册成功:', data.username);
            return data;
        } catch (e) {
            this._setState('error');
            throw e;
        }
    }

    /** 用户登录 */
    async login(username: string, password: string): Promise<ClAuthResponse> {
        this._setState('loading');
        
        try {
            const response = await fetch(`${this._baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password } as ClAuthRequest),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || '登录失败');
            }

            const data: ClAuthResponse = await response.json();
            
            // 保存会话
            this._token = data.token;
            this._user = { user_id: data.user_id, username: data.username };
            this._saveSession(data.token, this._user);
            this._setState('authenticated');
            
            console.log('[ClAuthService] 登录成功:', data.username);
            return data;
        } catch (e) {
            this._setState('error');
            throw e;
        }
    }

    /** 登出 */
    logout(): void {
        this._clearSession();
        this._setState('idle');
        console.log('[ClAuthService] 已登出');
    }

    /** 验证当前 Token (从服务器获取用户信息) */
    async validateToken(): Promise<ClUserInfo | null> {
        if (!this._token) {
            return null;
        }

        try {
            const response = await fetch(`${this._baseUrl}/api/auth/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this._token}`,
                },
            });

            if (!response.ok) {
                this._clearSession();
                this._setState('idle');
                return null;
            }

            const data: ClUserInfo = await response.json();
            this._user = data;
            this._setState('authenticated');
            return data;
        } catch (e) {
            console.warn('[ClAuthService] Token 验证失败:', e);
            this._clearSession();
            this._setState('idle');
            return null;
        }
    }

    /** 获取带认证的请求头 */
    getAuthHeaders(): Record<string, string> {
        if (!this._token) {
            return {};
        }
        return {
            'Authorization': `Bearer ${this._token}`,
        };
    }
}

// =============================================================================
// 单例导出
// =============================================================================

let _authServiceInstance: ClAuthService | null = null;

/** 获取认证服务实例 */
export function cl_getAuthService(): ClAuthService {
    if (!_authServiceInstance) {
        _authServiceInstance = new ClAuthService();
    }
    return _authServiceInstance;
}

/** 便捷方法：检查是否已登录 */
export function cl_isAuthenticated(): boolean {
    return cl_getAuthService().isAuthenticated;
}

/** 便捷方法：获取当前用户 */
export function cl_getCurrentUser(): ClUserInfo | null {
    return cl_getAuthService().user;
}

/** 便捷方法：获取 Token */
export function cl_getAuthToken(): string | null {
    return cl_getAuthService().token;
}
