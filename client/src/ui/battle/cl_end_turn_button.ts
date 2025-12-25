/**
 * 结束回合按钮
 * 
 * 模块: client/ui/battle
 * 前缀: Cl
 * 职责: 结束回合按钮及交互
 */

import {
    Rectangle,
    TextBlock,
    Control,
    AdvancedDynamicTexture,
} from '@babylonjs/gui';

import { CL_BATTLE_UI_CONFIG } from './cl_battle_ui_types';

// =============================================================================
// 结束回合按钮
// =============================================================================

export class ClEndTurnButton {
    private container: Rectangle;
    private buttonText: TextBlock;
    private isEnabled: boolean = true;
    
    public onClick: (() => void) | null = null;

    constructor(gui: AdvancedDynamicTexture) {
        const config = CL_BATTLE_UI_CONFIG;
        
        // 创建容器
        this.container = new Rectangle('endTurnButton');
        this.container.width = config.END_TURN_BUTTON_WIDTH;
        this.container.height = config.END_TURN_BUTTON_HEIGHT;
        this.container.cornerRadius = 25;
        this.container.color = config.TURN_INDICATOR_COLOR;
        this.container.thickness = 3;
        this.container.background = 'rgba(255, 215, 0, 0.3)';
        this.container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        this.container.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        this.container.left = '-30px';
        
        gui.addControl(this.container);

        // 按钮文字
        this.buttonText = new TextBlock('endTurnText', '结束回合');
        this.buttonText.color = config.TURN_INDICATOR_COLOR;
        this.buttonText.fontSize = 16;
        this.buttonText.fontWeight = 'bold';
        this.container.addControl(this.buttonText);

        // 点击事件
        this.container.onPointerClickObservable.add(() => {
            if (this.isEnabled && this.onClick) {
                this.onClick();
            }
        });

        // 悬停效果
        this.container.onPointerEnterObservable.add(() => {
            if (this.isEnabled) {
                this.container.background = 'rgba(255, 215, 0, 0.5)';
            }
        });

        this.container.onPointerOutObservable.add(() => {
            this.container.background = this.isEnabled 
                ? 'rgba(255, 215, 0, 0.3)'
                : 'rgba(100, 100, 100, 0.3)';
        });
    }

    /**
     * 设置启用状态
     */
    setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
        const config = CL_BATTLE_UI_CONFIG;
        
        if (enabled) {
            this.container.color = config.TURN_INDICATOR_COLOR;
            this.container.background = 'rgba(255, 215, 0, 0.3)';
            this.buttonText.color = config.TURN_INDICATOR_COLOR;
        } else {
            this.container.color = '#666';
            this.container.background = 'rgba(100, 100, 100, 0.3)';
            this.buttonText.color = '#666';
        }
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.container.dispose();
    }
}
