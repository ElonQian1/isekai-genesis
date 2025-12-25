/**
 * 回合指示器
 * 
 * 模块: client/ui/battle
 * 前缀: Cl
 * 职责: 显示当前回合数和阶段信息
 */

import {
    Rectangle,
    TextBlock,
    Control,
    AdvancedDynamicTexture,
} from '@babylonjs/gui';

import { CL_BATTLE_UI_CONFIG } from './cl_battle_ui_types';

// =============================================================================
// 回合指示器
// =============================================================================

export class ClTurnIndicator {
    private container: Rectangle;
    private turnText: TextBlock;
    private phaseText: TextBlock;

    constructor(gui: AdvancedDynamicTexture) {
        const config = CL_BATTLE_UI_CONFIG;
        
        // 创建容器
        this.container = new Rectangle('turnIndicator');
        this.container.width = config.TURN_INDICATOR_WIDTH;
        this.container.height = config.TURN_INDICATOR_HEIGHT;
        this.container.cornerRadius = 10;
        this.container.color = config.TURN_INDICATOR_COLOR;
        this.container.thickness = 2;
        this.container.background = 'rgba(0, 0, 0, 0.8)';
        this.container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.container.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this.container.top = '20px';
        
        gui.addControl(this.container);

        // 回合数
        this.turnText = new TextBlock('turnText', '回合 1');
        this.turnText.color = config.TURN_INDICATOR_COLOR;
        this.turnText.fontSize = 24;
        this.turnText.fontWeight = 'bold';
        this.turnText.top = '-8px';
        this.container.addControl(this.turnText);

        // 阶段
        this.phaseText = new TextBlock('phaseText', '你的回合');
        this.phaseText.color = 'white';
        this.phaseText.fontSize = 14;
        this.phaseText.top = '15px';
        this.container.addControl(this.phaseText);
    }

    /**
     * 更新回合信息
     */
    update(turn: number, isPlayerTurn: boolean): void {
        this.turnText.text = `回合 ${turn}`;
        this.phaseText.text = isPlayerTurn ? '你的回合' : '对手回合';
        this.phaseText.color = isPlayerTurn ? '#00ff00' : '#ff6600';
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.container.dispose();
    }
}
