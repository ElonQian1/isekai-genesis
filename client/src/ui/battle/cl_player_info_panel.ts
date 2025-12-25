/**
 * 玩家信息面板
 * 
 * 模块: client/ui/battle
 * 前缀: Cl
 * 职责: 显示玩家血量、能量、格挡、牌组信息
 */

import {
    Rectangle,
    TextBlock,
    StackPanel,
    Control,
    AdvancedDynamicTexture,
} from '@babylonjs/gui';

import { CL_BATTLE_UI_CONFIG, ClBattlePlayerData } from './cl_battle_ui_types';

// =============================================================================
// 玩家信息面板
// =============================================================================

export class ClPlayerInfoPanel {
    private container: Rectangle;
    private nameText: TextBlock;
    private healthBar: Rectangle;
    private healthFill: Rectangle;
    private healthText: TextBlock;
    private energyText: TextBlock;
    private blockText: TextBlock;
    private deckText: TextBlock;
    private discardText: TextBlock;

    constructor(gui: AdvancedDynamicTexture, isOpponent: boolean) {
        const config = CL_BATTLE_UI_CONFIG;
        
        // 创建主容器
        this.container = new Rectangle('playerPanel');
        this.container.width = config.PLAYER_PANEL_WIDTH;
        this.container.height = config.PLAYER_PANEL_HEIGHT;
        this.container.cornerRadius = config.PLAYER_PANEL_CORNER_RADIUS;
        this.container.color = 'white';
        this.container.thickness = 2;
        this.container.background = 'rgba(0, 0, 0, 0.7)';
        
        // 位置
        this.container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.container.verticalAlignment = isOpponent 
            ? Control.VERTICAL_ALIGNMENT_TOP 
            : Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.container.left = '20px';
        this.container.top = isOpponent ? '20px' : '-20px';
        
        gui.addControl(this.container);

        // 内容栈
        const stack = new StackPanel('contentStack');
        stack.isVertical = true;
        stack.paddingTop = '10px';
        stack.paddingLeft = '15px';
        stack.paddingRight = '15px';
        this.container.addControl(stack);

        // 玩家名称
        this.nameText = new TextBlock('nameText', isOpponent ? '对手' : '玩家');
        this.nameText.color = 'white';
        this.nameText.fontSize = 18;
        this.nameText.fontWeight = 'bold';
        this.nameText.height = '25px';
        this.nameText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        stack.addControl(this.nameText);

        // 生命值条
        this.healthBar = new Rectangle('healthBar');
        this.healthBar.width = '220px';
        this.healthBar.height = '22px';
        this.healthBar.cornerRadius = 5;
        this.healthBar.background = '#333';
        this.healthBar.thickness = 0;
        stack.addControl(this.healthBar);

        this.healthFill = new Rectangle('healthFill');
        this.healthFill.width = '100%';
        this.healthFill.height = '100%';
        this.healthFill.cornerRadius = 5;
        this.healthFill.background = config.HEALTH_COLOR;
        this.healthFill.thickness = 0;
        this.healthFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.healthBar.addControl(this.healthFill);

        this.healthText = new TextBlock('healthText', '100/100');
        this.healthText.color = 'white';
        this.healthText.fontSize = 14;
        this.healthBar.addControl(this.healthText);

        // 状态栏 (能量、格挡、牌组、弃牌堆)
        const statusRow = new StackPanel('statusRow');
        statusRow.isVertical = false;
        statusRow.height = '30px';
        statusRow.paddingTop = '5px';
        stack.addControl(statusRow);

        // 能量
        this.energyText = this.createStatusItem(statusRow, '⚡', config.ENERGY_COLOR, '3/3');
        
        // 格挡
        this.blockText = this.createStatusItem(statusRow, '🛡️', config.BLOCK_COLOR, '0');
        
        // 牌组
        this.deckText = this.createStatusItem(statusRow, '📚', '#aaa', '20');
        
        // 弃牌堆
        this.discardText = this.createStatusItem(statusRow, '🗑️', '#666', '0');
    }

    /**
     * 创建状态项
     */
    private createStatusItem(
        parent: StackPanel,
        icon: string,
        color: string,
        value: string
    ): TextBlock {
        const item = new TextBlock();
        item.text = `${icon} ${value}`;
        item.color = color;
        item.fontSize = 14;
        item.width = '55px';
        item.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        parent.addControl(item);
        return item;
    }

    /**
     * 更新玩家数据
     */
    update(player: ClBattlePlayerData): void {
        this.nameText.text = player.name;
        
        // 生命值 (使用 stats.hp)
        const healthPercent = (player.stats.hp / player.stats.max_hp) * 100;
        this.healthFill.width = `${healthPercent}%`;
        this.healthText.text = `${player.stats.hp}/${player.stats.max_hp}`;
        
        // 根据生命值改变颜色
        if (healthPercent <= 25) {
            this.healthFill.background = '#ff0000';
        } else if (healthPercent <= 50) {
            this.healthFill.background = '#ff6600';
        } else {
            this.healthFill.background = CL_BATTLE_UI_CONFIG.HEALTH_COLOR;
        }
        
        // 状态 (使用 stats)
        this.energyText.text = `⚡ ${player.stats.energy}/${player.stats.max_energy}`;
        this.blockText.text = `🛡️ ${player.stats.defense}`;
        this.deckText.text = `📚 ${player.deck.length}`;
        this.discardText.text = `🗑️ ${player.discard.length}`;
    }

    /**
     * 设置高亮 (当前回合)
     */
    setHighlight(isCurrentTurn: boolean): void {
        if (isCurrentTurn) {
            this.container.color = CL_BATTLE_UI_CONFIG.TURN_INDICATOR_COLOR;
            this.container.thickness = 3;
        } else {
            this.container.color = 'white';
            this.container.thickness = 2;
        }
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.container.dispose();
    }
}
