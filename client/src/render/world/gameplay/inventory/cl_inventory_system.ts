/**
 * 背包物品系统 (纯数据层)
 * 
 * 模块: client/render/world/gameplay/inventory
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责：
 * - 管理物品数据 (Item Data)
 * - 处理物品的添加、移除、使用
 * - 提供背包变更的通知
 */

import { Observable } from '@babylonjs/core';

// 物品定义接口
export interface ClItemData {
    id: string;
    name: string;
    description: string;
    icon?: string; // 图标路径或名称
    type: 'consumable' | 'material' | 'equipment' | 'quest';
    stackable: boolean;
    maxStack?: number;
    effect?: any; // 物品效果定义
}

// 背包格子接口
export interface ClInventorySlot {
    slotIndex: number;
    item: ClItemData | null;
    count: number;
}

export class ClInventorySystem {
    // 背包容量
    private capacity: number;
    // 物品槽位
    private slots: ClInventorySlot[] = [];
    
    // 事件通知
    public onInventoryChanged: Observable<void>;
    public onItemAdded: Observable<{item: ClItemData, count: number}>;
    public onItemRemoved: Observable<{item: ClItemData, count: number}>;

    constructor(capacity: number = 20) {
        this.capacity = capacity;
        this.onInventoryChanged = new Observable();
        this.onItemAdded = new Observable();
        this.onItemRemoved = new Observable();
        
        // 初始化空槽位
        for (let i = 0; i < capacity; i++) {
            this.slots.push({
                slotIndex: i,
                item: null,
                count: 0
            });
        }
    }

    /**
     * 添加物品
     * @returns 剩余未添加的数量 (0表示全部添加成功)
     */
    addItem(item: ClItemData, count: number = 1): number {
        let remaining = count;

        // 1. 尝试堆叠到现有槽位
        if (item.stackable) {
            for (const slot of this.slots) {
                if (remaining <= 0) break;
                
                if (slot.item && slot.item.id === item.id) {
                    const maxStack = item.maxStack || 99;
                    const space = maxStack - slot.count;
                    
                    if (space > 0) {
                        const add = Math.min(remaining, space);
                        slot.count += add;
                        remaining -= add;
                    }
                }
            }
        }

        // 2. 放入空槽位
        if (remaining > 0) {
            for (const slot of this.slots) {
                if (remaining <= 0) break;
                
                if (!slot.item) {
                    slot.item = item;
                    const maxStack = item.maxStack || 99;
                    const add = Math.min(remaining, maxStack);
                    slot.count = add;
                    remaining -= add;
                }
            }
        }

        // 如果有变动，发送通知
        if (remaining < count) {
            this.onItemAdded.notifyObservers({ item, count: count - remaining });
            this.onInventoryChanged.notifyObservers();
        }

        return remaining;
    }

    /**
     * 移除物品
     */
    removeItem(itemId: string, count: number = 1): boolean {
        // 检查数量是否足够
        const total = this.getItemCount(itemId);
        if (total < count) return false;

        let remainingToRemove = count;
        let removedItem: ClItemData | null = null;

        // 从后往前移除 (优先移除堆叠较少的? 或者从最后一个格子开始)
        for (let i = this.slots.length - 1; i >= 0; i--) {
            const slot = this.slots[i];
            if (slot.item && slot.item.id === itemId) {
                removedItem = slot.item;
                
                if (slot.count >= remainingToRemove) {
                    slot.count -= remainingToRemove;
                    remainingToRemove = 0;
                    if (slot.count === 0) {
                        slot.item = null;
                    }
                    break;
                } else {
                    remainingToRemove -= slot.count;
                    slot.count = 0;
                    slot.item = null;
                }
            }
        }

        if (removedItem) {
            this.onItemRemoved.notifyObservers({ item: removedItem, count });
            this.onInventoryChanged.notifyObservers();
        }
        
        return true;
    }

    /**
     * 获取某物品的总数量
     */
    getItemCount(itemId: string): number {
        let count = 0;
        for (const slot of this.slots) {
            if (slot.item && slot.item.id === itemId) {
                count += slot.count;
            }
        }
        return count;
    }

    /**
     * 获取所有槽位数据 (用于 UI 渲染)
     */
    getSlots(): ReadonlyArray<ClInventorySlot> {
        return this.slots;
    }
    
    /**
     * 扩充背包
     */
    expandCapacity(newSize: number): void {
        if (newSize <= this.capacity) return;
        
        const diff = newSize - this.capacity;
        for (let i = 0; i < diff; i++) {
            this.slots.push({
                slotIndex: this.capacity + i,
                item: null,
                count: 0
            });
        }
        this.capacity = newSize;
        this.onInventoryChanged.notifyObservers();
    }
}
