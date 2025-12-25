/**
 * 认证界面 UI (登录/注册)
 * 
 * 支持用户登录和注册功能，与后端 API 集成
 * 
 * 模块: client/ui
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import {
    AdvancedDynamicTexture,
    Rectangle,
    TextBlock,
    InputText,
    InputPassword,
    Button,
    StackPanel,
    Control,
} from '@babylonjs/gui';
import { cl_getAuthService, ClUserInfo } from '../network/cl_auth_service';

// =============================================================================
// 配置
// =============================================================================

const CL_AUTH_CONFIG = {
    PANEL_WIDTH: '420px',
    PANEL_HEIGHT: '480px',
    TITLE_COLOR: '#ffd700',
    BUTTON_COLOR: '#4a90d9',
    BUTTON_HOVER: '#5aa0e9',
    BUTTON_SUCCESS: '#4caf50',
    BUTTON_SUCCESS_HOVER: '#66bb6a',
    ERROR_COLOR: '#ff6b6b',
    LINK_COLOR: '#64b5f6',
};

type AuthMode = 'login' | 'register';

// =============================================================================
// 认证界面
// =============================================================================

export class ClAuthUI {
    private gui: AdvancedDynamicTexture;
    private container: Rectangle;
    private _usernameInput!: InputText;
    private _passwordInput: InputText;
    private _errorText!: TextBlock;
    private _submitButton!: Button;
    private _switchText!: TextBlock;
    private _mode: AuthMode = 'login';
    private _formStack!: StackPanel;
    
    public onAuthSuccess: ((user: ClUserInfo) => void) | null = null;

    constructor(gui: AdvancedDynamicTexture) {
        this.gui = gui;
        this.container = this._createContainer();
        this._passwordInput = new InputText(); // 占位，稍后创建
        this._createAuthForm();
    }

    /**
     * 创建容器
     */
    private _createContainer(): Rectangle {
        const container = new Rectangle('authContainer');
        container.width = CL_AUTH_CONFIG.PANEL_WIDTH;
        container.height = CL_AUTH_CONFIG.PANEL_HEIGHT;
        container.cornerRadius = 20;
        container.thickness = 0;
        container.background = 'rgba(20, 20, 40, 0.98)';
        container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        container.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        container.shadowColor = 'rgba(0, 0, 0, 0.5)';
        container.shadowBlur = 20;
        container.shadowOffsetX = 0;
        container.shadowOffsetY = 10;
        
        this.gui.addControl(container);
        return container;
    }

    /**
     * 创建认证表单
     */
    private _createAuthForm(): void {
        this._formStack = new StackPanel('authStack');
        this._formStack.isVertical = true;
        this._formStack.width = '85%';
        this._formStack.paddingTop = '30px';
        this.container.addControl(this._formStack);

        // 标题
        const title = new TextBlock('authTitle', '🎴 卡牌对战');
        title.color = CL_AUTH_CONFIG.TITLE_COLOR;
        title.fontSize = 36;
        title.fontWeight = 'bold';
        title.height = '60px';
        this._formStack.addControl(title);

        // 副标题
        const subtitle = new TextBlock('authSubtitle', 'Rust + WebGPU 驱动');
        subtitle.color = '#aaa';
        subtitle.fontSize = 14;
        subtitle.height = '25px';
        this._formStack.addControl(subtitle);

        // 间隔
        this._addSpacer(20);

        // 用户名
        this._addLabel('用户名');
        this._usernameInput = this._createInput('username', '输入用户名...');
        this._formStack.addControl(this._usernameInput);

        this._addSpacer(15);

        // 密码
        this._addLabel('密码');
        this._passwordInput = this._createInput('password', '输入密码...', true);
        this._formStack.addControl(this._passwordInput);

        this._addSpacer(15);

        // 错误提示
        this._errorText = new TextBlock('errorText', '');
        this._errorText.color = CL_AUTH_CONFIG.ERROR_COLOR;
        this._errorText.fontSize = 14;
        this._errorText.height = '25px';
        this._errorText.textWrapping = true;
        this._formStack.addControl(this._errorText);

        this._addSpacer(10);

        // 提交按钮
        this._submitButton = this._createButton('登录', CL_AUTH_CONFIG.BUTTON_COLOR, CL_AUTH_CONFIG.BUTTON_HOVER);
        this._submitButton.onPointerClickObservable.add(() => this._handleSubmit());
        this._formStack.addControl(this._submitButton);

        this._addSpacer(15);

        // 切换模式按钮
        this._switchText = new TextBlock('switchMode', '没有账号？点击注册');
        this._switchText.color = CL_AUTH_CONFIG.LINK_COLOR;
        this._switchText.fontSize = 14;
        this._switchText.height = '30px';
        // 使用包装的 Rectangle 来处理点击
        const switchWrapper = new Rectangle('switchWrapper');
        switchWrapper.height = '30px';
        switchWrapper.thickness = 0;
        switchWrapper.background = 'transparent';
        switchWrapper.onPointerClickObservable.add(() => this._toggleMode());
        switchWrapper.onPointerEnterObservable.add(() => {
            this._switchText.color = '#90caf9';
            document.body.style.cursor = 'pointer';
        });
        switchWrapper.onPointerOutObservable.add(() => {
            this._switchText.color = CL_AUTH_CONFIG.LINK_COLOR;
            document.body.style.cursor = 'default';
        });
        switchWrapper.addControl(this._switchText);
        this._formStack.addControl(switchWrapper);

        // 版本信息
        this._addSpacer(20);
        const version = new TextBlock('version', 'v0.1.0 - PostgreSQL + JWT');
        version.color = '#555';
        version.fontSize = 12;
        version.height = '25px';
        this._formStack.addControl(version);
    }

    /**
     * 添加标签
     */
    private _addLabel(text: string): void {
        const label = new TextBlock(`label_${text}`, text);
        label.color = 'white';
        label.fontSize = 14;
        label.height = '25px';
        label.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this._formStack.addControl(label);
    }

    /**
     * 添加间隔
     */
    private _addSpacer(height: number): void {
        const spacer = new Rectangle(`spacer_${Math.random()}`);
        spacer.height = `${height}px`;
        spacer.thickness = 0;
        spacer.background = 'transparent';
        this._formStack.addControl(spacer);
    }

    /**
     * 创建输入框
     */
    private _createInput(name: string, placeholder: string, isPassword = false): InputText {
        const input = isPassword ? new InputPassword(name) : new InputText(name);
        input.width = '100%';
        input.height = '45px';
        input.color = 'white';
        input.background = 'rgba(255, 255, 255, 0.1)';
        input.focusedBackground = 'rgba(255, 255, 255, 0.2)';
        input.thickness = 2;
        input.placeholderText = placeholder;
        input.placeholderColor = '#666';
        return input;
    }

    /**
     * 创建按钮
     */
    private _createButton(text: string, bgColor: string, hoverColor: string): Button {
        const button = Button.CreateSimpleButton(`btn_${text}`, text);
        button.width = '100%';
        button.height = '50px';
        button.color = 'white';
        button.fontSize = 18;
        button.fontWeight = 'bold';
        button.background = bgColor;
        button.cornerRadius = 10;
        button.thickness = 0;
        
        button.onPointerEnterObservable.add(() => {
            button.background = hoverColor;
        });
        button.onPointerOutObservable.add(() => {
            button.background = bgColor;
        });
        
        return button;
    }

    /**
     * 切换登录/注册模式
     */
    private _toggleMode(): void {
        this._mode = this._mode === 'login' ? 'register' : 'login';
        this._errorText.text = '';
        
        if (this._mode === 'register') {
            (this._submitButton.children[0] as TextBlock).text = '注册';
            this._switchText.text = '已有账号？点击登录';
        } else {
            (this._submitButton.children[0] as TextBlock).text = '登录';
            this._switchText.text = '没有账号？点击注册';
        }
    }

    /**
     * 处理提交
     */
    private async _handleSubmit(): Promise<void> {
        const username = this._usernameInput.text.trim();
        const password = this._passwordInput.text;

        // 验证
        if (!username || username.length < 3) {
            this._showError('用户名至少需要3个字符');
            return;
        }
        if (!password || password.length < 6) {
            this._showError('密码至少需要6个字符');
            return;
        }

        // 禁用按钮
        this._submitButton.isEnabled = false;
        (this._submitButton.children[0] as TextBlock).text = '处理中...';

        try {
            const authService = cl_getAuthService();
            
            if (this._mode === 'register') {
                await authService.register(username, password);
            } else {
                await authService.login(username, password);
            }

            // 成功
            this._errorText.text = '';
            const user = authService.user;
            if (user) {
                console.log('[ClAuthUI] 认证成功:', user.username);
                this.onAuthSuccess?.(user);
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : '操作失败';
            this._showError(message);
        } finally {
            // 恢复按钮
            this._submitButton.isEnabled = true;
            (this._submitButton.children[0] as TextBlock).text = this._mode === 'login' ? '登录' : '注册';
        }
    }

    /**
     * 显示错误
     */
    private _showError(message: string): void {
        this._errorText.text = message;
    }

    /**
     * 显示
     */
    show(): void {
        this.container.isVisible = true;
    }

    /**
     * 隐藏
     */
    hide(): void {
        this.container.isVisible = false;
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.container.dispose();
    }
}
