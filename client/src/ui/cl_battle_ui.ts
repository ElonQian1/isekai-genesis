/**
 * 战斗 UI 组件
 * 
 * 模块: client/ui
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import {
    Scene,
} from '@babylonjs/core';
import {
    AdvancedDynamicTexture,
    Rectangle,
    TextBlock,
    StackPanel,
    Control,
} from '@babylonjs/gui';

import { ClPlayerData, ClBattleState } from '../cl_battle_manager';

// =============================================================================
// UI 配置
// =============================================================================

const CL_UI_CONFIG = {
    // 颜色
    HEALTH_COLOR: '#e94560',
    ENERGY_COLOR: '#00d9ff',
    BLOCK_COLOR: '#4a90d9',
    TURN_INDICATOR_COLOR: '#ffd700',
    
    // 尺寸
    HEALTH_BAR_WIDTH: 200,
    HEALTH_BAR_HEIGHT: 20,
    
    // 位置
    PLAYER_UI_Y: 50,
    OPPONENT_UI_Y: 50,
};

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

    constructor(
        gui: AdvancedDynamicTexture,
        isOpponent: boolean = false
    ) {
        // 创建容器
        this.container = new Rectangle('playerInfoPanel');
        this.container.width = '250px';
        this.container.height = '120px';
        this.container.cornerRadius = 10;
        this.container.color = 'white';
        this.container.thickness = 2;
        this.container.background = 'rgba(0, 0, 0, 0.7)';
        
        // 位置
        this.container.horizontalAlignment = isOpponent 
            ? Control.HORIZONTAL_ALIGNMENT_RIGHT 
            : Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.container.verticalAlignment = isOpponent
            ? Control.VERTICAL_ALIGNMENT_TOP
            : Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.container.left = isOpponent ? '-20px' : '20px';
        this.container.top = isOpponent ? '20px' : '-20px';
        
        gui.addControl(this.container);

        // 创建堆栈面板
        const stack = new StackPanel('playerInfoStack');
        stack.isVertical = true;
        stack.paddingTop = '10px';
        stack.paddingLeft = '10px';
        stack.paddingRight = '10px';
        this.container.addControl(stack);

        // 玩家名称
        this.nameText = new TextBlock('playerName', '玩家');
        this.nameText.color = 'white';
        this.nameText.fontSize = 18;
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
        this.healthFill.background = CL_UI_CONFIG.HEALTH_COLOR;
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
        this.energyText = this.createStatusItem(statusRow, '⚡', CL_UI_CONFIG.ENERGY_COLOR, '3/3');
        
        // 格挡
        this.blockText = this.createStatusItem(statusRow, '🛡️', CL_UI_CONFIG.BLOCK_COLOR, '0');
        
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
    update(player: ClPlayerData): void {
        this.nameText.text = player.name;
        
        // 生命值
        const healthPercent = (player.health / player.max_health) * 100;
        this.healthFill.width = `${healthPercent}%`;
        this.healthText.text = `${player.health}/${player.max_health}`;
        
        // 根据生命值改变颜色
        if (healthPercent <= 25) {
            this.healthFill.background = '#ff0000';
        } else if (healthPercent <= 50) {
            this.healthFill.background = '#ff6600';
        } else {
            this.healthFill.background = CL_UI_CONFIG.HEALTH_COLOR;
        }
        
        // 状态
        this.energyText.text = `⚡ ${player.energy}/${player.max_energy}`;
        this.blockText.text = `🛡️ ${player.block}`;
        this.deckText.text = `📚 ${player.deck_count}`;
        this.discardText.text = `🗑️ ${player.discard_count}`;
    }

    /**
     * 设置高亮 (当前回合)
     */
    setHighlight(isCurrentTurn: boolean): void {
        if (isCurrentTurn) {
            this.container.color = CL_UI_CONFIG.TURN_INDICATOR_COLOR;
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

// =============================================================================
// 回合指示器
// =============================================================================

export class ClTurnIndicator {
    private container: Rectangle;
    private turnText: TextBlock;
    private phaseText: TextBlock;

    constructor(gui: AdvancedDynamicTexture) {
        // 创建容器
        this.container = new Rectangle('turnIndicator');
        this.container.width = '200px';
        this.container.height = '60px';
        this.container.cornerRadius = 10;
        this.container.color = CL_UI_CONFIG.TURN_INDICATOR_COLOR;
        this.container.thickness = 2;
        this.container.background = 'rgba(0, 0, 0, 0.8)';
        this.container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.container.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this.container.top = '20px';
        
        gui.addControl(this.container);

        // 回合数
        this.turnText = new TextBlock('turnText', '回合 1');
        this.turnText.color = CL_UI_CONFIG.TURN_INDICATOR_COLOR;
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

// =============================================================================
// 结束回合按钮
// =============================================================================

export class ClEndTurnButton {
    private container: Rectangle;
    private buttonText: TextBlock;
    private isEnabled: boolean = true;
    
    public onClick: (() => void) | null = null;

    constructor(gui: AdvancedDynamicTexture) {
        // 创建容器
        this.container = new Rectangle('endTurnButton');
        this.container.width = '120px';
        this.container.height = '50px';
        this.container.cornerRadius = 25;
        this.container.color = '#ffd700';
        this.container.thickness = 3;
        this.container.background = 'rgba(255, 215, 0, 0.3)';
        this.container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        this.container.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        this.container.left = '-30px';
        
        gui.addControl(this.container);

        // 按钮文字
        this.buttonText = new TextBlock('endTurnText', '结束回合');
        this.buttonText.color = '#ffd700';
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
        
        if (enabled) {
            this.container.color = '#ffd700';
            this.container.background = 'rgba(255, 215, 0, 0.3)';
            this.buttonText.color = '#ffd700';
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

// =============================================================================
// 战斗 UI 管理器
// =============================================================================

export class ClBattleUI {
    private gui: AdvancedDynamicTexture;
    private playerPanel: ClPlayerInfoPanel;
    private opponentPanel: ClPlayerInfoPanel;
    private turnIndicator: ClTurnIndicator;
    private endTurnButton: ClEndTurnButton;

    constructor(scene: Scene) {
        // 创建全屏 GUI
        this.gui = AdvancedDynamicTexture.CreateFullscreenUI('battleUI', true, scene);
        
        // 创建 UI 组件
        this.playerPanel = new ClPlayerInfoPanel(this.gui, false);
        this.opponentPanel = new ClPlayerInfoPanel(this.gui, true);
        this.turnIndicator = new ClTurnIndicator(this.gui);
        this.endTurnButton = new ClEndTurnButton(this.gui);
    }

    /**
     * 更新战斗状态
     */
    updateBattleState(state: ClBattleState, localPlayerId: string): void {
        // 找到本地玩家和对手
        const localPlayer = state.players.find(p => p.id === localPlayerId);
        const opponent = state.players.find(p => p.id !== localPlayerId);
        
        if (localPlayer) {
            this.playerPanel.update(localPlayer);
            this.playerPanel.setHighlight(
                state.players[state.current_player_index]?.id === localPlayerId
            );
        }
        
        if (opponent) {
            this.opponentPanel.update(opponent);
            this.opponentPanel.setHighlight(
                state.players[state.current_player_index]?.id === opponent.id
            );
        }
        
        // 更新回合指示器
        const isPlayerTurn = state.players[state.current_player_index]?.id === localPlayerId;
        this.turnIndicator.update(state.turn, isPlayerTurn);
        
        // 更新结束回合按钮
        this.endTurnButton.setEnabled(isPlayerTurn && state.phase === 'playing');
    }

    /**
     * 设置结束回合回调
     */
    setEndTurnCallback(callback: () => void): void {
        this.endTurnButton.onClick = callback;
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.playerPanel.dispose();
        this.opponentPanel.dispose();
        this.turnIndicator.dispose();
        this.endTurnButton.dispose();
        this.gui.dispose();
    }
}
