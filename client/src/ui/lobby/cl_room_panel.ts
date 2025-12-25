/**
 * 房间等待界面 - 玩家列表和准备状态
 * 
 * 模块: client/ui/lobby
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责：
 * - 显示房间内玩家
 * - 准备/开始游戏
 * - 离开房间
 * - 支持游戏模式人数限制
 */

import {
    AdvancedDynamicTexture,
    Rectangle,
    TextBlock,
    Button,
    StackPanel,
    Control,
} from '@babylonjs/gui';

import { ClPlayerData } from './cl_lobby_types';
import { ClGameMode, CL_GAME_MODE_CONFIGS, ClGameModeConfig } from '../../core/cl_game_mode_types';

// =============================================================================
// 房间等待界面
// =============================================================================

export class ClRoomUI {
    private gui: AdvancedDynamicTexture;
    private container: Rectangle;
    private playerList: StackPanel;
    private startButton: Button;
    private roomIdText: TextBlock;
    private modeInfoText: TextBlock | null = null;
    private playerCountText: TextBlock | null = null;
    
    // 当前游戏模式 (用于人数限制)
    private currentMode: ClGameMode | null = null;
    private modeConfig: ClGameModeConfig | null = null;
    
    public onLeaveRoom: (() => void) | null = null;
    public onReady: (() => void) | null = null;
    public onStartGame: (() => void) | null = null;

    constructor(gui: AdvancedDynamicTexture) {
        this.gui = gui;
        const elements = this.createRoomUI();
        this.container = elements.container;
        this.playerList = elements.playerList;
        this.startButton = elements.startButton;
        this.roomIdText = elements.roomIdText;
    }

    /**
     * 创建房间 UI
     */
    private createRoomUI(): {
        container: Rectangle;
        playerList: StackPanel;
        startButton: Button;
        roomIdText: TextBlock;
    } {
        const container = new Rectangle('roomContainer');
        container.width = '450px';
        container.height = '450px';
        container.cornerRadius = 20;
        container.color = '#ffd700';
        container.thickness = 3;
        container.background = 'rgba(20, 20, 40, 0.95)';
        container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        container.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        container.isVisible = false;
        
        this.gui.addControl(container);

        const stack = new StackPanel('roomStack');
        stack.isVertical = true;
        stack.width = '90%';
        stack.paddingTop = '20px';
        container.addControl(stack);

        // 标题
        const title = new TextBlock('roomTitle', '⚔️ 等待对手');
        title.color = '#ffd700';
        title.fontSize = 28;
        title.fontWeight = 'bold';
        title.height = '50px';
        stack.addControl(title);

        // 模式信息行
        const modeRow = new StackPanel('modeRow');
        modeRow.isVertical = false;
        modeRow.height = '30px';
        modeRow.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        stack.addControl(modeRow);

        // 游戏模式显示
        const modeInfoText = new TextBlock('modeInfoText', '🎮 游戏模式');
        modeInfoText.color = '#88CCFF';
        modeInfoText.fontSize = 14;
        modeInfoText.width = '150px';
        modeRow.addControl(modeInfoText);
        this.modeInfoText = modeInfoText;

        // 人数显示
        const playerCountText = new TextBlock('playerCountText', '👥 0/2');
        playerCountText.color = '#88FF88';
        playerCountText.fontSize = 14;
        playerCountText.width = '80px';
        modeRow.addControl(playerCountText);
        this.playerCountText = playerCountText;

        // 房间 ID
        const roomIdText = new TextBlock('roomIdText', '房间 ID: ---');
        roomIdText.color = '#aaa';
        roomIdText.fontSize = 14;
        roomIdText.height = '30px';
        stack.addControl(roomIdText);

        // 玩家列表
        const playerList = new StackPanel('playerList');
        playerList.isVertical = true;
        playerList.height = '150px';
        playerList.paddingTop = '20px';
        stack.addControl(playerList);

        // 按钮区域
        const buttonPanel = new StackPanel('buttonPanel');
        buttonPanel.isVertical = false;
        buttonPanel.height = '60px';
        buttonPanel.paddingTop = '20px';
        stack.addControl(buttonPanel);

        // 准备按钮
        const readyBtn = Button.CreateSimpleButton('readyBtn', '✅ 准备');
        readyBtn.width = '120px';
        readyBtn.height = '45px';
        readyBtn.color = 'white';
        readyBtn.fontSize = 16;
        readyBtn.background = '#28a745';
        readyBtn.cornerRadius = 10;
        readyBtn.onPointerClickObservable.add(() => {
            this.onReady?.();
        });
        buttonPanel.addControl(readyBtn);

        const spacer = new Rectangle('spacer');
        spacer.width = '20px';
        spacer.thickness = 0;
        spacer.background = 'transparent';
        buttonPanel.addControl(spacer);

        // 开始游戏按钮 (房主)
        const startButton = Button.CreateSimpleButton('startBtn', '🎮 开始游戏');
        startButton.width = '140px';
        startButton.height = '45px';
        startButton.color = 'white';
        startButton.fontSize = 16;
        startButton.background = '#4a90d9';
        startButton.cornerRadius = 10;
        startButton.isEnabled = false;
        startButton.onPointerClickObservable.add(() => {
            this.onStartGame?.();
        });
        buttonPanel.addControl(startButton);

        // 离开按钮
        const leaveBtn = Button.CreateSimpleButton('leaveBtn', '🚪 离开房间');
        leaveBtn.width = '120px';
        leaveBtn.height = '40px';
        leaveBtn.color = 'white';
        leaveBtn.fontSize = 14;
        leaveBtn.background = '#dc3545';
        leaveBtn.cornerRadius = 8;
        leaveBtn.top = '20px';
        leaveBtn.onPointerClickObservable.add(() => {
            this.onLeaveRoom?.();
        });
        stack.addControl(leaveBtn);

        return { container, playerList, startButton, roomIdText };
    }

    /**
     * 设置房间 ID
     */
    setRoomId(roomId: string): void {
        this.roomIdText.text = `房间 ID: ${roomId}`;
    }

    /**
     * 设置游戏模式 (用于人数限制)
     */
    setGameMode(mode: ClGameMode): void {
        this.currentMode = mode;
        this.modeConfig = CL_GAME_MODE_CONFIGS[mode];
        
        // 更新模式信息显示
        if (this.modeInfoText && this.modeConfig) {
            this.modeInfoText.text = `${this.modeConfig.icon} ${this.modeConfig.name}`;
        }
    }

    /**
     * 更新玩家列表
     */
    updatePlayers(players: ClPlayerData[]): void {
        this.playerList.clearControls();

        // 使用模式配置的最大人数，默认为 2
        const maxPlayers = this.modeConfig?.maxPlayers ?? 2;
        const minPlayers = this.modeConfig?.minPlayers ?? 2;

        for (let i = 0; i < maxPlayers; i++) {
            const player = players[i];
            const slot = this.createPlayerSlot(i + 1, player);
            this.playerList.addControl(slot);
        }

        // 更新人数显示
        if (this.playerCountText) {
            this.playerCountText.text = `👥 ${players.length}/${maxPlayers}`;
        }

        // 检查是否可以开始 (人数满足要求且全部准备)
        const hasEnoughPlayers = players.length >= minPlayers;
        const allReady = players.every(p => p.ready);
        const canStart = hasEnoughPlayers && allReady;
        
        this.startButton.isEnabled = canStart;
        this.startButton.background = canStart ? '#4a90d9' : '#666';
        
        // 更新开始按钮提示
        if (!canStart) {
            if (!hasEnoughPlayers) {
                this.startButton.textBlock!.text = `🎮 需要 ${minPlayers} 人`;
            } else if (!allReady) {
                this.startButton.textBlock!.text = '🎮 等待准备';
            }
        } else {
            this.startButton.textBlock!.text = '🎮 开始游戏';
        }
    }

    /**
     * 创建玩家槽位
     */
    private createPlayerSlot(index: number, player?: ClPlayerData): Rectangle {
        const slot = new Rectangle(`playerSlot_${index}`);
        slot.width = '100%';
        slot.height = '50px';
        slot.cornerRadius = 8;
        slot.thickness = 2;
        slot.color = player ? (player.ready ? '#28a745' : '#ffd700') : '#444';
        slot.background = 'rgba(255, 255, 255, 0.05)';
        slot.paddingTop = '5px';
        slot.paddingBottom = '5px';

        const stack = new StackPanel(`slotStack_${index}`);
        stack.isVertical = false;
        stack.width = '95%';
        slot.addControl(stack);

        // 玩家图标
        const icon = new TextBlock(`slotIcon_${index}`, player ? '👤' : '❓');
        icon.fontSize = 24;
        icon.width = '40px';
        stack.addControl(icon);

        // 玩家名称
        const nameText = new TextBlock(
            `slotName_${index}`,
            player ? player.name : '等待玩家...'
        );
        nameText.color = player ? 'white' : '#666';
        nameText.fontSize = 18;
        nameText.width = '200px';
        nameText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        stack.addControl(nameText);

        // 准备状态
        if (player) {
            const statusText = new TextBlock(
                `slotStatus_${index}`,
                player.ready ? '✅ 已准备' : '⏳ 未准备'
            );
            statusText.color = player.ready ? '#28a745' : '#ffd700';
            statusText.fontSize = 14;
            statusText.width = '100px';
            stack.addControl(statusText);
        }

        return slot;
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
     * 获取当前游戏模式
     */
    getGameMode(): ClGameMode | null {
        return this.currentMode;
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.container.dispose();
    }
}
