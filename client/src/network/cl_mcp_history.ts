/**
 * MCP 命令历史管理器 - 支持撤销/重做
 * 
 * 模块: client/network
 * 前缀: Cl
 * 文档: 文档/12-MCP-API.md
 */

import { Vector3 } from "@babylonjs/core";

/**
 * 历史记录条目类型
 */
export type ClMcpHistoryAction = 
    | ClMcpHistorySpawn
    | ClMcpHistoryDelete
    | ClMcpHistoryMove
    | ClMcpHistoryClearArea
    | ClMcpHistorySpawnBatch;

/**
 * 生成实体的历史记录
 */
export interface ClMcpHistorySpawn {
    type: 'spawn';
    entityId: string;
    entityType: string;
    prefabId: string;
    position: Vector3;
    rotation?: Vector3;
    scale?: Vector3;
}

/**
 * 删除实体的历史记录
 */
export interface ClMcpHistoryDelete {
    type: 'delete';
    entityId: string;
    entityType: string;
    prefabId: string;
    position: Vector3;
    rotation?: Vector3;
    scale?: Vector3;
}

/**
 * 移动实体的历史记录
 */
export interface ClMcpHistoryMove {
    type: 'move';
    entityId: string;
    oldPosition: Vector3;
    newPosition: Vector3;
}

/**
 * 清除区域的历史记录
 */
export interface ClMcpHistoryClearArea {
    type: 'clear_area';
    deletedEntities: Array<{
        entityId: string;
        entityType: string;
        prefabId: string;
        position: Vector3;
        rotation?: Vector3;
        scale?: Vector3;
    }>;
}

/**
 * 批量生成的历史记录
 */
export interface ClMcpHistorySpawnBatch {
    type: 'spawn_batch';
    entityIds: string[];
}

/**
 * MCP 命令历史管理器
 */
export class ClMcpCommandHistory {
    private undoStack: ClMcpHistoryAction[] = [];
    private redoStack: ClMcpHistoryAction[] = [];
    private maxHistorySize: number = 100;

    /**
     * 记录一个操作
     */
    push(action: ClMcpHistoryAction): void {
        this.undoStack.push(action);
        // 新操作会清空 redo 栈
        this.redoStack = [];
        
        // 限制历史记录大小
        if (this.undoStack.length > this.maxHistorySize) {
            this.undoStack.shift();
        }
        
        console.log(`📝 MCP 历史记录: ${action.type} (撤销栈: ${this.undoStack.length})`);
    }

    /**
     * 获取最后一个操作（用于撤销）
     */
    popUndo(): ClMcpHistoryAction | undefined {
        const action = this.undoStack.pop();
        if (action) {
            this.redoStack.push(action);
        }
        return action;
    }

    /**
     * 获取最后一个撤销的操作（用于重做）
     */
    popRedo(): ClMcpHistoryAction | undefined {
        const action = this.redoStack.pop();
        if (action) {
            this.undoStack.push(action);
        }
        return action;
    }

    /**
     * 是否可以撤销
     */
    canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    /**
     * 是否可以重做
     */
    canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    /**
     * 清空历史记录
     */
    clear(): void {
        this.undoStack = [];
        this.redoStack = [];
    }

    /**
     * 获取撤销栈大小
     */
    getUndoCount(): number {
        return this.undoStack.length;
    }

    /**
     * 获取重做栈大小
     */
    getRedoCount(): number {
        return this.redoStack.length;
    }
}

// 全局单例
let _mcpHistory: ClMcpCommandHistory | null = null;

export function getMcpHistory(): ClMcpCommandHistory {
    if (!_mcpHistory) {
        _mcpHistory = new ClMcpCommandHistory();
    }
    return _mcpHistory;
}
