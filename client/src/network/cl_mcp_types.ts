/**
 * MCP (Model Context Protocol) 类型定义
 * 
 * 模块: client/network
 * 前缀: Cl
 * 文档: 文档/12-MCP-API.md
 */

export interface ClMcpCommand {
    type: string;
    data: any;
}

export interface ClMcpSpawnEntity {
    entity_type: string;
    prefab_id: string;
    position: { x: number; y: number };
    rotation: number;
    scale: number;
}

export interface ClMcpDeleteEntity {
    entity_id: string;
}

export interface ClMcpMoveEntity {
    entity_id: string;
    position: { x: number; y: number };
}

export interface ClMcpClearArea {
    center: { x: number; y: number };
    radius: number;
}

export interface ClMcpSpawnBatch {
    entity_type: string;
    prefab_ids: string[];
    center: { x: number; y: number };
    radius: number;
    count: number;
}

export interface ClMcpUndo {
    // 空
}
