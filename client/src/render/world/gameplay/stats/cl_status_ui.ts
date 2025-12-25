/**
 * 角色状态 UI - 显示血条、体力条
 * 
 * 模块: client/render/world/gameplay/stats
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责：
 * - 监听 ClCharacterStats 的数据变化
 * - 更新 UI 显示
 */

import {
    AdvancedDynamicTexture,
    Rectangle,
    TextBlock,
    Control,
    StackPanel
} from '@babylonjs/gui';
import { ClCharacterStats } from './cl_character_stats';

export class ClStatusUI {
    private gui: AdvancedDynamicTexture;
    private stats: ClCharacterStats;
    
    // UI 控件
    private rootContainer: StackPanel | null = null;
    private hpBarInner: Rectangle | null = null;
    private hpText: TextBlock | null = null;
    private staminaBarInner: Rectangle | null = null;

    constructor(gui: AdvancedDynamicTexture, stats: ClCharacterStats) {
        this.gui = gui;
        this.stats = stats;
        
        this.createUI();
        this.bindEvents();
    }

    /**
     * 设置可见性
     */
    public setVisible(visible: boolean): void {
        if (this.rootContainer) {
            this.rootContainer.isVisible = visible;
        }
    }

    /**
     * 创建 UI
     */
    private createUI(): void {
        // 左上角容器
        this.rootContainer = new StackPanel('statusPanel');
        this.rootContainer.width = '250px';
        this.rootContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.rootContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this.rootContainer.top = '20px';
        this.rootContainer.left = '20px';
        this.rootContainer.spacing = 5;
        this.gui.addControl(this.rootContainer);
        
        // 1. HP 条背景
        const hpContainer = new Rectangle('hpContainer');
        hpContainer.width = '100%';
        hpContainer.height = '25px';
        hpContainer.color = 'black';
        hpContainer.thickness = 2;
        hpContainer.background = '#330000';
        this.rootContainer.addControl(hpContainer);
        
        // HP 条前景
        this.hpBarInner = new Rectangle('hpBarInner');
        this.hpBarInner.width = '100%'; // 初始满血
        this.hpBarInner.height = '100%';
        this.hpBarInner.thickness = 0;
        this.hpBarInner.color = 'transparent';
        this.hpBarInner.background = '#cc0000'; // 红色
        this.hpBarInner.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        hpContainer.addControl(this.hpBarInner);
        
        // HP 文字
        this.hpText = new TextBlock('hpText');
        this.hpText.text = `${this.stats.currentHp} / ${this.stats.maxHp}`;
        this.hpText.color = 'white';
        this.hpText.fontSize = 14;
        this.hpText.shadowColor = 'black';
        this.hpText.shadowBlur = 2;
        hpContainer.addControl(this.hpText);
        
        // 2. 体力条背景
        const staminaContainer = new Rectangle('staminaContainer');
        staminaContainer.width = '80%'; // 比血条短一点
        staminaContainer.height = '15px';
        staminaContainer.color = 'black';
        staminaContainer.thickness = 1;
        staminaContainer.background = '#001100';
        staminaContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.rootContainer.addControl(staminaContainer);
        
        // 体力条前景
        this.staminaBarInner = new Rectangle('staminaBarInner');
        this.staminaBarInner.width = '100%';
        this.staminaBarInner.height = '100%';
        this.staminaBarInner.thickness = 0;
        this.staminaBarInner.color = 'transparent';
        this.staminaBarInner.background = '#00cc00'; // 绿色
        this.staminaBarInner.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        staminaContainer.addControl(this.staminaBarInner);
    }

    /**
     * 绑定数据事件
     */
    private bindEvents(): void {
        // 监听 HP 变化
        this.stats.onHpChanged.add((data) => {
            if (this.hpBarInner && this.hpText) {
                const percent = data.current / data.max;
                this.hpBarInner.width = `${percent * 100}%`;
                this.hpText.text = `${Math.ceil(data.current)} / ${data.max}`;
            }
        });
        
        // 监听体力变化
        this.stats.onStaminaChanged.add((data) => {
            if (this.staminaBarInner) {
                const percent = data.current / data.max;
                this.staminaBarInner.width = `${percent * 100}%`;
            }
        });
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.rootContainer?.dispose();
    }
}
