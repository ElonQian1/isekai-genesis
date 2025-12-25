/**
 * 背包 UI - 显示物品格子
 * 
 * 模块: client/render/world/gameplay/inventory
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责：
 * - 监听 ClInventorySystem 的数据变化
 * - 渲染物品格子
 * - 处理物品点击/拖拽 (暂未实现拖拽)
 */

import {
    AdvancedDynamicTexture,
    Rectangle,
    TextBlock,
    Control,
    Grid,
    Button
} from '@babylonjs/gui';
import { ClInventorySystem, ClInventorySlot } from './cl_inventory_system';

export class ClInventoryUI {
    private gui: AdvancedDynamicTexture;
    private inventory: ClInventorySystem;
    
    // UI 控件
    private mainPanel: Rectangle | null = null;
    private grid: Grid | null = null;
    private slotControls: Map<number, Rectangle> = new Map();
    
    private isVisible: boolean = false;

    constructor(gui: AdvancedDynamicTexture, inventory: ClInventorySystem) {
        this.gui = gui;
        this.inventory = inventory;
        
        this.createUI();
        this.bindEvents();
    }

    /**
     * 设置可见性
     */
    public setVisible(visible: boolean): void {
        this.isVisible = visible;
        if (this.mainPanel) {
            this.mainPanel.isVisible = visible;
        }
    }

    /**
     * 创建 UI
     */
    private createUI(): void {
        // 主面板 (居中)
        this.mainPanel = new Rectangle('inventoryPanel');
        this.mainPanel.width = '400px';
        this.mainPanel.height = '300px';
        this.mainPanel.background = '#222222';
        this.mainPanel.color = '#aaaaaa';
        this.mainPanel.thickness = 2;
        this.mainPanel.cornerRadius = 5;
        this.mainPanel.isVisible = false;
        this.gui.addControl(this.mainPanel);
        
        // 标题
        const title = new TextBlock('invTitle', '背包');
        title.height = '30px';
        title.color = 'white';
        title.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        title.top = '5px';
        this.mainPanel.addControl(title);
        
        // 关闭按钮
        const closeBtn = Button.CreateSimpleButton('closeInv', 'X');
        closeBtn.width = '30px';
        closeBtn.height = '30px';
        closeBtn.color = 'white';
        closeBtn.background = 'red';
        closeBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        closeBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        closeBtn.onPointerClickObservable.add(() => this.toggle());
        this.mainPanel.addControl(closeBtn);
        
        // 物品网格
        this.grid = new Grid();
        this.grid.width = '360px';
        this.grid.height = '240px';
        this.grid.top = '20px';
        
        // 4列 x 5行
        for (let i = 0; i < 5; i++) {
            this.grid.addRowDefinition(1);
        }
        for (let i = 0; i < 4; i++) {
            this.grid.addColumnDefinition(1);
        }
        
        this.mainPanel.addControl(this.grid);
        
        // 初始化格子
        this.refreshSlots();
    }

    /**
     * 刷新所有格子
     */
    private refreshSlots(): void {
        if (!this.grid) return;
        
        // 清理旧格子
        this.slotControls.forEach(control => control.dispose());
        this.slotControls.clear();
        
        const slots = this.inventory.getSlots();
        
        slots.forEach((slot, index) => {
            const row = Math.floor(index / 4);
            const col = index % 4;
            
            if (row >= 5) return; // 超过显示范围
            
            const slotControl = this.createSlotControl(slot);
            this.grid!.addControl(slotControl, row, col);
            this.slotControls.set(index, slotControl);
        });
    }

    /**
     * 创建单个格子控件
     */
    private createSlotControl(slot: ClInventorySlot): Rectangle {
        const container = new Rectangle(`slot_${slot.slotIndex}`);
        container.width = '80px';
        container.height = '80px';
        container.thickness = 1;
        container.color = '#555555';
        container.background = '#333333';
        container.paddingLeft = '5px';
        container.paddingRight = '5px';
        container.paddingTop = '5px';
        container.paddingBottom = '5px';
        
        if (slot.item) {
            // 物品名称 (暂时代替图标)
            const text = new TextBlock();
            text.text = slot.item.name;
            text.color = 'white';
            text.fontSize = 12;
            text.textWrapping = true;
            container.addControl(text);
            
            // 数量
            if (slot.count > 1) {
                const countText = new TextBlock();
                countText.text = slot.count.toString();
                countText.color = 'yellow';
                countText.fontSize = 14;
                countText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
                countText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
                countText.paddingRight = '5px';
                countText.paddingBottom = '5px';
                container.addControl(countText);
            }
            
            // 点击事件
            container.onPointerClickObservable.add(() => {
                console.log(`点击了物品: ${slot.item?.name}`);
                // TODO: 显示物品详情或使用物品
            });
        }
        
        return container;
    }

    /**
     * 绑定事件
     */
    private bindEvents(): void {
        this.inventory.onInventoryChanged.add(() => {
            this.refreshSlots();
        });
    }

    /**
     * 切换显示/隐藏
     */
    toggle(): void {
        if (!this.mainPanel) return;
        this.isVisible = !this.isVisible;
        this.mainPanel.isVisible = this.isVisible;
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.mainPanel?.dispose();
    }
}
