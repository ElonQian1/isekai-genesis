/**
 * 登录界面 UI
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
    Button,
    StackPanel,
    Control,
} from '@babylonjs/gui';

// =============================================================================
// 登录 UI 配置
// =============================================================================

const CL_LOGIN_CONFIG = {
    PANEL_WIDTH: '400px',
    PANEL_HEIGHT: '350px',
    TITLE_COLOR: '#ffd700',
    BUTTON_COLOR: '#4a90d9',
    BUTTON_HOVER: '#5aa0e9',
};

// =============================================================================
// 登录界面
// =============================================================================

export class ClLoginUI {
    private gui: AdvancedDynamicTexture;
    private container: Rectangle;
    private _nameInput: InputText;
    
    public onLogin: ((playerName: string) => void) | null = null;

    constructor(gui: AdvancedDynamicTexture) {
        this.gui = gui;
        this.container = this.createContainer();
        this._nameInput = this.createLoginForm();
    }

    /**
     * 创建容器
     */
    private createContainer(): Rectangle {
        const container = new Rectangle('loginContainer');
        container.width = CL_LOGIN_CONFIG.PANEL_WIDTH;
        container.height = CL_LOGIN_CONFIG.PANEL_HEIGHT;
        container.cornerRadius = 20;
        container.thickness = 0;  // 完全禁用边框避免残影
        container.background = 'rgba(20, 20, 40, 0.98)';
        container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        container.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        
        this.gui.addControl(container);
        return container;
    }

    /**
     * 创建登录表单
     */
    private createLoginForm(): InputText {
        const stack = new StackPanel('loginStack');
        stack.isVertical = true;
        stack.width = '90%';
        stack.paddingTop = '30px';
        this.container.addControl(stack);

        // 标题
        const title = new TextBlock('loginTitle', '🎴 卡牌对战');
        title.color = CL_LOGIN_CONFIG.TITLE_COLOR;
        title.fontSize = 36;
        title.fontWeight = 'bold';
        title.height = '60px';
        stack.addControl(title);

        // 副标题
        const subtitle = new TextBlock('loginSubtitle', '3D WebGPU Card Game');
        subtitle.color = '#aaa';
        subtitle.fontSize = 14;
        subtitle.height = '30px';
        stack.addControl(subtitle);

        // 间隔
        const spacer1 = new Rectangle('spacer1');
        spacer1.height = '30px';
        spacer1.thickness = 0;
        spacer1.background = 'transparent';
        stack.addControl(spacer1);

        // 名称标签
        const nameLabel = new TextBlock('nameLabel', '玩家昵称');
        nameLabel.color = 'white';
        nameLabel.fontSize = 16;
        nameLabel.height = '30px';
        nameLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        stack.addControl(nameLabel);

        // 名称输入框
        const nameInput = new InputText('nameInput');
        nameInput.width = '100%';
        nameInput.height = '45px';
        nameInput.color = 'white';
        nameInput.background = 'rgba(255, 255, 255, 0.1)';
        nameInput.focusedBackground = 'rgba(255, 255, 255, 0.2)';
        nameInput.thickness = 2;
        nameInput.placeholderText = '输入你的昵称...';
        nameInput.placeholderColor = '#666';
        nameInput.text = `玩家${Math.floor(Math.random() * 10000)}`;
        stack.addControl(nameInput);

        // 间隔
        const spacer2 = new Rectangle('spacer2');
        spacer2.height = '30px';
        spacer2.thickness = 0;
        spacer2.background = 'transparent';
        stack.addControl(spacer2);

        // 登录按钮
        const loginButton = Button.CreateSimpleButton('loginButton', '进入游戏');
        loginButton.width = '100%';
        loginButton.height = '50px';
        loginButton.color = 'white';
        loginButton.fontSize = 18;
        loginButton.fontWeight = 'bold';
        loginButton.background = CL_LOGIN_CONFIG.BUTTON_COLOR;
        loginButton.cornerRadius = 10;
        loginButton.thickness = 0;
        
        loginButton.onPointerEnterObservable.add(() => {
            loginButton.background = CL_LOGIN_CONFIG.BUTTON_HOVER;
        });
        loginButton.onPointerOutObservable.add(() => {
            loginButton.background = CL_LOGIN_CONFIG.BUTTON_COLOR;
        });
        loginButton.onPointerClickObservable.add(() => {
            const name = nameInput.text.trim();
            if (name) {
                this.onLogin?.(name);
            }
        });
        stack.addControl(loginButton);

        // 版本信息
        const version = new TextBlock('version', 'v0.1.0 - Rust + WebGPU');
        version.color = '#555';
        version.fontSize = 12;
        version.height = '40px';
        version.paddingTop = '20px';
        stack.addControl(version);

        return nameInput;
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
     * 获取输入的名称
     */
    getInputName(): string {
        return this._nameInput.text;
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.container.dispose();
    }
}
