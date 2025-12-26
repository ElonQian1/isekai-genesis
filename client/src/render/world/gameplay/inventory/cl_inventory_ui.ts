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
    Button,
    StackPanel,
    Image
} from '@babylonjs/gui';
import { ClInventorySystem, ClInventorySlot, ClItemData } from './cl_inventory_system';
import { Observable } from '@babylonjs/core';

export class ClInventoryUI {
    private gui: AdvancedDynamicTexture;
    private inventory: ClInventorySystem;
    
    // UI 控件
    private mainPanel: Rectangle | null = null;
    private grid: Grid | null = null;
    private slotControls: Map<number, Rectangle> = new Map();
    
    // 物品详情面板
    private detailPanel: Rectangle | null = null;
    private detailTitle: TextBlock | null = null;
    private detailDescription: TextBlock | null = null;
    private detailType: TextBlock | null = null;
    private selectedSlot: ClInventorySlot | null = null;
    
    // 事件
    public onItemUsed: Observable<{ item: ClItemData; count: number }>;
    public onItemDropped: Observable<{ item: ClItemData; count: number }>;
    
    private isVisible: boolean = false;

    constructor(gui: AdvancedDynamicTexture, inventory: ClInventorySystem) {
        this.gui = gui;
        this.inventory = inventory;
        this.onItemUsed = new Observable();
        this.onItemDropped = new Observable();
        
        this.createUI();
        this.createDetailPanel();
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
     * 创建物品详情面板
     */
    private createDetailPanel(): void {
        // 详情面板 (在背包右侧)
        this.detailPanel = new Rectangle('detailPanel');
        this.detailPanel.width = '180px';
        this.detailPanel.height = '200px';
        this.detailPanel.left = '300px';
        this.detailPanel.background = '#1a1a2e';
        this.detailPanel.color = '#4a90d9';
        this.detailPanel.thickness = 2;
        this.detailPanel.cornerRadius = 8;
        this.detailPanel.isVisible = false;
        this.detailPanel.shadowBlur = 10;
        this.detailPanel.shadowColor = 'rgba(0,0,0,0.5)';
        this.gui.addControl(this.detailPanel);

        // 创建布局容器
        const layout = new StackPanel();
        layout.width = '100%';
        layout.height = '100%';
        layout.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        layout.paddingTop = '10px';
        this.detailPanel.addControl(layout);

        // 物品名称
        this.detailTitle = new TextBlock('detailTitle', '');
        this.detailTitle.height = '30px';
        this.detailTitle.color = '#ffd700';
        this.detailTitle.fontSize = 16;
        this.detailTitle.fontWeight = 'bold';
        this.detailTitle.textWrapping = true;
        layout.addControl(this.detailTitle);

        // 物品类型
        this.detailType = new TextBlock('detailType', '');
        this.detailType.height = '20px';
        this.detailType.color = '#888888';
        this.detailType.fontSize = 12;
        layout.addControl(this.detailType);

        // 分隔线
        const divider = new Rectangle('divider');
        divider.width = '90%';
        divider.height = '2px';
        divider.background = '#4a90d9';
        divider.paddingTop = '5px';
        divider.paddingBottom = '5px';
        layout.addControl(divider);

        // 物品描述
        this.detailDescription = new TextBlock('detailDesc', '');
        this.detailDescription.height = '60px';
        this.detailDescription.color = '#cccccc';
        this.detailDescription.fontSize = 11;
        this.detailDescription.textWrapping = true;
        this.detailDescription.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.detailDescription.paddingLeft = '10px';
        this.detailDescription.paddingRight = '10px';
        layout.addControl(this.detailDescription);

        // 按钮容器
        const buttonContainer = new StackPanel();
        buttonContainer.height = '70px';
        buttonContainer.isVertical = false;
        buttonContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        buttonContainer.paddingTop = '10px';
        layout.addControl(buttonContainer);

        // 使用按钮
        const useBtn = Button.CreateSimpleButton('useBtn', '使用');
        useBtn.width = '70px';
        useBtn.height = '30px';
        useBtn.color = 'white';
        useBtn.background = '#2e7d32';
        useBtn.cornerRadius = 5;
        useBtn.paddingLeft = '5px';
        useBtn.paddingRight = '5px';
        useBtn.onPointerEnterObservable.add(() => {
            useBtn.background = '#4caf50';
        });
        useBtn.onPointerOutObservable.add(() => {
            useBtn.background = '#2e7d32';
        });
        useBtn.onPointerClickObservable.add(() => this.useSelectedItem());
        buttonContainer.addControl(useBtn);

        // 丢弃按钮
        const dropBtn = Button.CreateSimpleButton('dropBtn', '丢弃');
        dropBtn.width = '70px';
        dropBtn.height = '30px';
        dropBtn.color = 'white';
        dropBtn.background = '#c62828';
        dropBtn.cornerRadius = 5;
        dropBtn.paddingLeft = '5px';
        dropBtn.onPointerEnterObservable.add(() => {
            dropBtn.background = '#ef5350';
        });
        dropBtn.onPointerOutObservable.add(() => {
            dropBtn.background = '#c62828';
        });
        dropBtn.onPointerClickObservable.add(() => this.dropSelectedItem());
        buttonContainer.addControl(dropBtn);
    }

    /**
     * 显示物品详情
     */
    private showItemDetails(slot: ClInventorySlot): void {
        if (!slot.item || !this.detailPanel) return;

        this.selectedSlot = slot;
        const item = slot.item;

        // 更新详情内容
        if (this.detailTitle) {
            this.detailTitle.text = `${item.name} ${slot.count > 1 ? `x${slot.count}` : ''}`;
        }
        if (this.detailType) {
            const typeNames: Record<string, string> = {
                'consumable': '消耗品',
                'material': '材料',
                'equipment': '装备',
                'quest': '任务物品'
            };
            this.detailType.text = `[${typeNames[item.type] || item.type}]`;
        }
        if (this.detailDescription) {
            this.detailDescription.text = item.description || '没有描述';
        }

        // 显示面板
        this.detailPanel.isVisible = true;
    }

    /**
     * 隐藏物品详情
     */
    private hideItemDetails(): void {
        if (this.detailPanel) {
            this.detailPanel.isVisible = false;
        }
        this.selectedSlot = null;
    }

    /**
     * 使用选中的物品
     */
    private useSelectedItem(): void {
        if (!this.selectedSlot?.item) return;

        const item = this.selectedSlot.item;
        
        // 只有消耗品可以使用
        if (item.type !== 'consumable') {
            console.log(`${item.name} 无法使用`);
            return;
        }

        // 移除物品并触发事件
        const removed = this.inventory.removeItem(item.id, 1);
        if (removed) {
            console.log(`使用了物品: ${item.name}`);
            this.onItemUsed.notifyObservers({ item, count: 1 });
            
            // 如果物品用完了，隐藏详情
            if (this.inventory.getItemCount(item.id) === 0) {
                this.hideItemDetails();
            } else {
                // 更新显示
                this.refreshSlots();
            }
        }
    }

    /**
     * 丢弃选中的物品
     */
    private dropSelectedItem(): void {
        if (!this.selectedSlot?.item) return;

        const item = this.selectedSlot.item;
        
        // 任务物品不能丢弃
        if (item.type === 'quest') {
            console.log(`${item.name} 无法丢弃`);
            return;
        }

        // 移除物品并触发事件
        const removed = this.inventory.removeItem(item.id, 1);
        if (removed) {
            console.log(`丢弃了物品: ${item.name}`);
            this.onItemDropped.notifyObservers({ item, count: 1 });
            
            // 如果物品丢完了，隐藏详情
            if (this.inventory.getItemCount(item.id) === 0) {
                this.hideItemDetails();
            } else {
                this.refreshSlots();
            }
        }
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
            // 悬停效果
            container.onPointerEnterObservable.add(() => {
                container.background = '#444444';
                container.color = '#4a90d9';
                container.thickness = 2;
            });
            container.onPointerOutObservable.add(() => {
                container.background = '#333333';
                container.color = '#555555';
                container.thickness = 1;
            });

            // 物品名称 (暂时代替图标)
            const text = new TextBlock();
            text.text = slot.item.name;
            text.color = 'white';
            text.fontSize = 12;
            text.textWrapping = true;
            container.addControl(text);
            
            // 根据物品类型设置颜色
            const typeColors: Record<string, string> = {
                'consumable': '#98fb98',  // 淡绿色
                'material': '#b0c4de',     // 淡蓝色
                'equipment': '#ffa500',    // 橙色
                'quest': '#ff69b4'         // 粉色
            };
            text.color = typeColors[slot.item.type] || 'white';
            
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
            
            // 点击事件 - 显示物品详情
            container.onPointerClickObservable.add(() => {
                this.showItemDetails(slot);
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
        
        // 隐藏时也隐藏详情面板
        if (!this.isVisible) {
            this.hideItemDetails();
        }
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.mainPanel?.dispose();
        this.detailPanel?.dispose();
        this.onItemUsed.clear();
        this.onItemDropped.clear();
    }
}
