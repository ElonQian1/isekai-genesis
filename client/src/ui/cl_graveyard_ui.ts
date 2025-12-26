/**
 * 墓地 UI 面板
 * 
 * 模块: client
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 显示阵亡怪兽列表，支持查看和特殊效果触发
 */

import * as BABYLON from '@babylonjs/core';
import * as GUI from '@babylonjs/gui';
import type { ClTavernMonster } from '../cl_wasm';

// =============================================================================
// 类型定义
// =============================================================================

/** 墓地怪兽显示信息 */
export interface ClGraveyardMonster {
    id: string;
    name: string;
    templateId: string;
    star: number;
    isGolden: boolean;
    goldenLevel: number;
    atk: number;
    def: number;
    deathTurn: number; // 死亡回合
}

/** 墓地 UI 事件 */
export interface ClGraveyardUIEvents {
    /** 点击查看怪兽详情 */
    onMonsterClick?: (monsterId: string) => void;
    /** 点击复活按钮（如果有复活能力） */
    onRevive?: (monsterId: string) => void;
    /** 展开/收起墓地面板 */
    onToggle?: (isExpanded: boolean) => void;
}

// =============================================================================
// 墓地 UI 类
// =============================================================================

export class ClGraveyardUI {
    private advancedTexture: GUI.AdvancedDynamicTexture;
    private iconButton: GUI.Button;
    private panelContainer: GUI.Rectangle;
    private monstersContainer: GUI.StackPanel;
    private scrollViewer: GUI.ScrollViewer;
    private countBadge: GUI.Ellipse;
    private countText: GUI.TextBlock;
    
    private events: ClGraveyardUIEvents = {};
    private isExpanded: boolean = false;
    private monsters: ClGraveyardMonster[] = [];
    
    // 配置
    private readonly ICON_SIZE = 50;
    private readonly PANEL_WIDTH = 280;
    private readonly PANEL_HEIGHT = 350;
    private readonly MONSTER_ITEM_HEIGHT = 60;

    constructor(scene: BABYLON.Scene) {
        this.advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI('GraveyardUI', true, scene);
        
        // 创建墓地图标按钮
        this.iconButton = this.createIconButton();
        this.advancedTexture.addControl(this.iconButton);
        
        // 创建数量徽章
        this.countBadge = this.createCountBadge();
        this.advancedTexture.addControl(this.countBadge);
        
        // 创建展开面板
        this.panelContainer = this.createPanel();
        this.advancedTexture.addControl(this.panelContainer);
        
        // 初始化滚动容器
        this.scrollViewer = new GUI.ScrollViewer('graveyardScroll');
        this.scrollViewer.width = '100%';
        this.scrollViewer.height = '280px';
        this.scrollViewer.top = '30px';
        this.scrollViewer.barSize = 8;
        this.scrollViewer.barColor = '#666';
        this.panelContainer.addControl(this.scrollViewer);
        
        // 初始化怪兽列表容器
        this.monstersContainer = new GUI.StackPanel('monstersContainer');
        this.monstersContainer.isVertical = true;
        this.monstersContainer.width = '100%';
        this.scrollViewer.addControl(this.monstersContainer);
        
        // 初始化数量文本
        this.countText = new GUI.TextBlock('countText', '0');
        this.countText.color = 'white';
        this.countText.fontSize = 12;
        this.countBadge.addControl(this.countText);
    }

    // =========================================================================
    // 创建 UI 组件
    // =========================================================================

    /** 创建墓地图标按钮 */
    private createIconButton(): GUI.Button {
        const button = GUI.Button.CreateSimpleButton('graveyardIcon', '💀');
        button.width = `${this.ICON_SIZE}px`;
        button.height = `${this.ICON_SIZE}px`;
        button.cornerRadius = 10;
        button.thickness = 2;
        button.color = '#8B0000';
        button.background = 'rgba(30, 30, 30, 0.9)';
        button.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        button.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        button.left = '-20px';
        button.top = '-120px';
        button.fontSize = 24;
        
        // 悬停效果
        button.onPointerEnterObservable.add(() => {
            button.background = 'rgba(60, 20, 20, 0.95)';
            button.scaleX = 1.1;
            button.scaleY = 1.1;
        });
        
        button.onPointerOutObservable.add(() => {
            button.background = 'rgba(30, 30, 30, 0.9)';
            button.scaleX = 1;
            button.scaleY = 1;
        });
        
        // 点击展开/收起
        button.onPointerClickObservable.add(() => {
            this.togglePanel();
        });
        
        return button;
    }

    /** 创建数量徽章 */
    private createCountBadge(): GUI.Ellipse {
        const badge = new GUI.Ellipse('countBadge');
        badge.width = '22px';
        badge.height = '22px';
        badge.thickness = 0;
        badge.background = '#FF4444';
        badge.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        badge.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        badge.left = '-15px';
        badge.top = '-155px';
        badge.isVisible = false; // 默认隐藏（数量为0时）
        
        return badge;
    }

    /** 创建展开面板 */
    private createPanel(): GUI.Rectangle {
        const panel = new GUI.Rectangle('graveyardPanel');
        panel.width = `${this.PANEL_WIDTH}px`;
        panel.height = `${this.PANEL_HEIGHT}px`;
        panel.cornerRadius = 12;
        panel.thickness = 2;
        panel.color = '#8B0000';
        panel.background = 'rgba(20, 15, 15, 0.95)';
        panel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        panel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        panel.left = '-20px';
        panel.top = `-${this.ICON_SIZE + 130 + this.PANEL_HEIGHT}px`;
        panel.isVisible = false;
        
        // 标题
        const title = new GUI.TextBlock('panelTitle', '💀 墓地');
        title.height = '35px';
        title.color = '#CC6666';
        title.fontSize = 16;
        title.fontFamily = 'SimHei';
        title.top = '-155px';
        panel.addControl(title);
        
        // 关闭按钮
        const closeBtn = GUI.Button.CreateSimpleButton('closeBtn', '✕');
        closeBtn.width = '28px';
        closeBtn.height = '28px';
        closeBtn.cornerRadius = 5;
        closeBtn.thickness = 0;
        closeBtn.color = '#888';
        closeBtn.background = 'transparent';
        closeBtn.fontSize = 14;
        closeBtn.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        closeBtn.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        closeBtn.left = '-5px';
        closeBtn.top = '5px';
        
        closeBtn.onPointerClickObservable.add(() => {
            this.togglePanel(false);
        });
        
        panel.addControl(closeBtn);
        
        // 空墓地提示
        const emptyText = new GUI.TextBlock('emptyText', '墓地为空');
        emptyText.name = 'emptyHint';
        emptyText.color = '#666';
        emptyText.fontSize = 14;
        emptyText.top = '30px';
        panel.addControl(emptyText);
        
        return panel;
    }

    // =========================================================================
    // 公共方法
    // =========================================================================

    /** 设置事件监听 */
    public setEvents(events: ClGraveyardUIEvents): void {
        this.events = events;
    }

    /** 显示/隐藏整个 UI */
    public setVisible(visible: boolean): void {
        this.iconButton.isVisible = visible;
        this.countBadge.isVisible = visible && this.monsters.length > 0;
        if (!visible) {
            this.panelContainer.isVisible = false;
            this.isExpanded = false;
        }
    }

    /** 展开/收起面板 */
    public togglePanel(expand?: boolean): void {
        this.isExpanded = expand !== undefined ? expand : !this.isExpanded;
        this.panelContainer.isVisible = this.isExpanded;
        this.events.onToggle?.(this.isExpanded);
    }

    /** 更新墓地怪兽列表 */
    public updateMonsters(monsters: ClGraveyardMonster[]): void {
        this.monsters = monsters;
        
        // 更新徽章
        this.countText.text = monsters.length.toString();
        this.countBadge.isVisible = monsters.length > 0;
        
        // 更新空提示
        const emptyHint = this.panelContainer.getChildByName('emptyHint') as GUI.TextBlock;
        if (emptyHint) {
            emptyHint.isVisible = monsters.length === 0;
        }
        
        // 清空并重建列表
        this.rebuildMonsterList();
    }

    /** 添加单个怪兽到墓地 */
    public addMonster(monster: ClGraveyardMonster): void {
        this.monsters.push(monster);
        this.updateMonsters(this.monsters);
    }

    /** 从墓地移除怪兽 */
    public removeMonster(monsterId: string): void {
        this.monsters = this.monsters.filter(m => m.id !== monsterId);
        this.updateMonsters(this.monsters);
    }

    /** 清空墓地 */
    public clear(): void {
        this.monsters = [];
        this.updateMonsters([]);
    }

    /** 获取墓地怪兽数量 */
    public getCount(): number {
        return this.monsters.length;
    }

    /** 销毁 */
    public dispose(): void {
        this.advancedTexture.dispose();
    }

    // =========================================================================
    // 私有方法
    // =========================================================================

    /** 重建怪兽列表 */
    private rebuildMonsterList(): void {
        // 清空现有列表
        const children = [...this.monstersContainer.children];
        children.forEach(child => {
            this.monstersContainer.removeControl(child);
        });
        
        // 创建怪兽项
        this.monsters.forEach(monster => {
            const item = this.createMonsterItem(monster);
            this.monstersContainer.addControl(item);
        });
    }

    /** 创建单个怪兽项 */
    private createMonsterItem(monster: ClGraveyardMonster): GUI.Rectangle {
        const item = new GUI.Rectangle(`monster_${monster.id}`);
        item.width = '260px';
        item.height = `${this.MONSTER_ITEM_HEIGHT}px`;
        item.cornerRadius = 8;
        item.thickness = 1;
        item.color = monster.isGolden ? '#FFD700' : '#555';
        item.background = monster.isGolden 
            ? 'rgba(80, 60, 20, 0.8)' 
            : 'rgba(40, 35, 35, 0.8)';
        item.paddingTop = '5px';
        item.paddingBottom = '5px';
        
        // 星级显示
        const starText = this.getStarDisplay(monster.star, monster.isGolden, monster.goldenLevel);
        const stars = new GUI.TextBlock('stars', starText);
        stars.width = '60px';
        stars.color = monster.isGolden ? '#FFD700' : '#FFE066';
        stars.fontSize = 12;
        stars.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        stars.left = '10px';
        stars.top = '-12px';
        item.addControl(stars);
        
        // 名称
        const name = new GUI.TextBlock('name', monster.name);
        name.width = '150px';
        name.color = monster.isGolden ? '#FFD700' : '#CCC';
        name.fontSize = 14;
        name.fontFamily = 'SimHei';
        name.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        name.left = '10px';
        name.top = '5px';
        item.addControl(name);
        
        // 属性
        const stats = new GUI.TextBlock('stats', `⚔️${monster.atk} 🛡️${monster.def}`);
        stats.width = '100px';
        stats.color = '#AAA';
        stats.fontSize = 11;
        stats.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        stats.left = '10px';
        stats.top = '20px';
        item.addControl(stats);
        
        // 死亡回合
        const turnText = new GUI.TextBlock('turn', `第${monster.deathTurn}回合`);
        turnText.width = '60px';
        turnText.color = '#777';
        turnText.fontSize = 10;
        turnText.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        turnText.left = '-10px';
        turnText.top = '20px';
        item.addControl(turnText);
        
        // 悬停效果
        item.onPointerEnterObservable.add(() => {
            item.background = monster.isGolden 
                ? 'rgba(100, 80, 30, 0.9)' 
                : 'rgba(60, 50, 50, 0.9)';
        });
        
        item.onPointerOutObservable.add(() => {
            item.background = monster.isGolden 
                ? 'rgba(80, 60, 20, 0.8)' 
                : 'rgba(40, 35, 35, 0.8)';
        });
        
        // 点击事件
        item.onPointerClickObservable.add(() => {
            this.events.onMonsterClick?.(monster.id);
        });
        
        return item;
    }

    /** 获取星级显示文本 */
    private getStarDisplay(star: number, isGolden: boolean, goldenLevel: number): string {
        if (isGolden) {
            const goldenStars = '✦'.repeat(Math.min(goldenLevel, 5));
            return `★★★ ${goldenStars}`;
        }
        return '★'.repeat(star);
    }
}
