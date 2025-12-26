/**
 * 手牌区 (备战席) UI
 * 
 * 模块: client
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 显示手牌区的怪兽，支持部署到战场和出售
 */

import * as BABYLON from '@babylonjs/core';
import * as GUI from '@babylonjs/gui';
import type { ClTavernMonster } from '../cl_wasm';

// =============================================================================
// 类型定义
// =============================================================================

/** 手牌区 UI 事件 */
export interface ClBenchUIEvents {
    /** 点击部署怪兽 */
    onDeploy?: (monsterId: string) => void;
    /** 点击出售怪兽 */
    onSell?: (monsterId: string) => void;
    /** 点击选中怪兽 */
    onSelect?: (monsterId: string) => void;
}

// =============================================================================
// 手牌区 UI 类
// =============================================================================

export class ClBenchUI {
    private advancedTexture: GUI.AdvancedDynamicTexture;
    private container: GUI.Rectangle;
    private monstersContainer: GUI.StackPanel;
    private monsterPanels: Map<string, GUI.Rectangle> = new Map();
    private countText!: GUI.TextBlock;
    
    private events: ClBenchUIEvents = {};
    private isVisible: boolean = false;
    private selectedMonsterId: string | null = null;
    
    // 配置
    private readonly MONSTER_WIDTH = 100;
    private readonly MONSTER_HEIGHT = 130;

    constructor(scene: BABYLON.Scene) {
        this.advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI('BenchUI', true, scene);
        
        // 创建主容器
        this.container = new GUI.Rectangle('benchContainer');
        this.container.width = '700px';
        this.container.height = '180px';
        this.container.cornerRadius = 10;
        this.container.thickness = 2;
        this.container.color = '#4A4A4A';
        this.container.background = 'rgba(20, 20, 30, 0.9)';
        this.container.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.container.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.container.top = '-100px';
        this.container.isVisible = false;
        this.advancedTexture.addControl(this.container);
        
        // 标题
        const titlePanel = new GUI.StackPanel('titlePanel');
        titlePanel.isVertical = false;
        titlePanel.height = '30px';
        titlePanel.top = '-55px';
        this.container.addControl(titlePanel);
        
        const title = new GUI.TextBlock('benchTitle', '📦 手牌区');
        title.width = '100px';
        title.color = '#87CEEB';
        title.fontSize = 16;
        title.fontFamily = 'SimHei';
        titlePanel.addControl(title);
        
        this.countText = new GUI.TextBlock('countText', '(0/∞)');
        this.countText.width = '80px';
        this.countText.color = '#888';
        this.countText.fontSize = 14;
        titlePanel.addControl(this.countText);
        
        // 创建怪兽容器
        this.monstersContainer = new GUI.StackPanel('monstersContainer');
        this.monstersContainer.isVertical = false;
        this.monstersContainer.height = `${this.MONSTER_HEIGHT}px`;
        this.monstersContainer.top = '15px';
        this.container.addControl(this.monstersContainer);
    }
    
    // =========================================================================
    // 公共方法
    // =========================================================================
    
    /** 设置事件监听 */
    public setEvents(events: ClBenchUIEvents): void {
        this.events = events;
    }
    
    /** 显示/隐藏 */
    public setVisible(visible: boolean): void {
        this.isVisible = visible;
        this.container.isVisible = visible;
    }
    
    /** 更新手牌区怪兽 */
    public updateMonsters(monsters: ClTavernMonster[]): void {
        // 清除现有面板
        for (const panel of this.monsterPanels.values()) {
            this.monstersContainer.removeControl(panel);
        }
        this.monsterPanels.clear();
        
        // 更新数量显示
        this.countText.text = `(${monsters.length}/∞)`;
        
        // 创建新面板
        for (const monster of monsters) {
            this.createMonsterPanel(monster);
        }
    }
    
    /** 设置选中的怪兽 */
    public setSelected(monsterId: string | null): void {
        // 取消之前的选中
        if (this.selectedMonsterId) {
            const prevPanel = this.monsterPanels.get(this.selectedMonsterId);
            if (prevPanel) {
                prevPanel.color = '#666';
                prevPanel.thickness = 2;
            }
        }
        
        this.selectedMonsterId = monsterId;
        
        // 设置新选中
        if (monsterId) {
            const panel = this.monsterPanels.get(monsterId);
            if (panel) {
                panel.color = '#4CAF50';
                panel.thickness = 3;
            }
        }
    }
    
    /** 销毁 */
    public dispose(): void {
        this.advancedTexture.dispose();
    }
    
    // =========================================================================
    // 私有方法
    // =========================================================================
    
    /** 创建怪兽面板 */
    private createMonsterPanel(monster: ClTavernMonster): void {
        const panel = new GUI.Rectangle(`bench_${monster.id}`);
        panel.width = `${this.MONSTER_WIDTH}px`;
        panel.height = `${this.MONSTER_HEIGHT}px`;
        panel.cornerRadius = 8;
        panel.thickness = 2;
        panel.color = '#666';
        panel.background = monster.golden_level > 0 
            ? 'rgba(255, 215, 0, 0.2)' 
            : 'rgba(40, 40, 50, 0.9)';
        panel.paddingLeft = '5px';
        panel.paddingRight = '5px';
        this.monstersContainer.addControl(panel);
        this.monsterPanels.set(monster.id, panel);
        
        // 点击选中
        panel.onPointerClickObservable.add(() => {
            this.events.onSelect?.(monster.id);
        });
        
        // 怪兽名称
        const nameText = new GUI.TextBlock(`name_${monster.id}`, monster.name);
        nameText.color = monster.golden_level > 0 ? '#FFD700' : '#FFF';
        nameText.fontSize = 12;
        nameText.top = '-40px';
        nameText.textWrapping = true;
        panel.addControl(nameText);
        
        // 星级
        const starText = new GUI.TextBlock(`star_${monster.id}`, '⭐'.repeat(monster.star));
        starText.color = '#FFD700';
        starText.fontSize = 10;
        starText.top = '-20px';
        panel.addControl(starText);
        
        // 属性
        const statsText = new GUI.TextBlock(`stats_${monster.id}`, `⚔${monster.atk} 🛡${monster.def}`);
        statsText.color = '#AAA';
        statsText.fontSize = 11;
        statsText.top = '0px';
        panel.addControl(statsText);
        
        // 出售价格
        const sellText = new GUI.TextBlock(`sell_${monster.id}`, `💰${monster.sell_price}`);
        sellText.color = '#4CAF50';
        sellText.fontSize = 11;
        sellText.top = '20px';
        panel.addControl(sellText);
        
        // 出售按钮
        const sellBtn = GUI.Button.CreateSimpleButton(`sellBtn_${monster.id}`, '出售');
        sellBtn.width = '50px';
        sellBtn.height = '22px';
        sellBtn.cornerRadius = 4;
        sellBtn.thickness = 1;
        sellBtn.color = '#FFF';
        sellBtn.background = '#D32F2F';
        sellBtn.fontSize = 11;
        sellBtn.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        sellBtn.top = '-8px';
        sellBtn.onPointerClickObservable.add(() => {
            this.events.onSell?.(monster.id);
        });
        panel.addControl(sellBtn);
    }
}
