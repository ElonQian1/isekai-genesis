/**
 * 卡牌 3D 网格生成器
 * 
 * 模块: client/render
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import {
    Scene,
    Mesh,
    MeshBuilder,
    Vector3,
} from '@babylonjs/core';

// =============================================================================
// 卡牌尺寸常量
// =============================================================================

export const CL_CARD_CONFIG = {
    // 标准卡牌比例 (扑克牌 2.5:3.5)
    WIDTH: 2.0,
    HEIGHT: 2.8,
    DEPTH: 0.04,
    
    // 圆角参数
    CORNER_RADIUS: 0.12,
    CORNER_SEGMENTS: 8,
    
    // 边框
    BORDER_WIDTH: 0.08,
    
    // 间距
    CARD_SPACING: 0.5,
};

// =============================================================================
// 卡牌网格类
// =============================================================================

/**
 * 创建带圆角的卡牌网格
 */
export class ClCardMesh {
    private scene: Scene;
    private mesh: Mesh;

    constructor(scene: Scene, name: string) {
        this.scene = scene;
        this.mesh = this.createRoundedCardMesh(name);
    }

    /**
     * 创建圆角矩形卡牌
     */
    private createRoundedCardMesh(name: string): Mesh {
        const { WIDTH, HEIGHT, DEPTH, CORNER_RADIUS, CORNER_SEGMENTS } = CL_CARD_CONFIG;
        
        // 创建圆角矩形的 2D 轮廓点
        const shape = this.createRoundedRectShape(
            WIDTH, 
            HEIGHT, 
            CORNER_RADIUS, 
            CORNER_SEGMENTS
        );
        
        // 使用多边形挤出创建 3D 卡牌
        const card = MeshBuilder.ExtrudePolygon(name, {
            shape: shape,
            depth: DEPTH,
            sideOrientation: Mesh.DOUBLESIDE,
        }, this.scene);
        
        // 调整位置，使中心点在底部中央
        card.position.y = DEPTH / 2;
        
        return card;
    }

    /**
     * 生成圆角矩形的顶点路径
     */
    private createRoundedRectShape(
        width: number, 
        height: number, 
        radius: number, 
        segments: number
    ): Vector3[] {
        const points: Vector3[] = [];
        const halfW = width / 2;
        const halfH = height / 2;
        
        // 四个角的圆心位置
        const corners = [
            { cx: halfW - radius, cy: halfH - radius, startAngle: 0 },           // 右上
            { cx: -halfW + radius, cy: halfH - radius, startAngle: Math.PI / 2 }, // 左上
            { cx: -halfW + radius, cy: -halfH + radius, startAngle: Math.PI },    // 左下
            { cx: halfW - radius, cy: -halfH + radius, startAngle: 3 * Math.PI / 2 }, // 右下
        ];
        
        // 生成每个圆角的点
        for (const corner of corners) {
            for (let i = 0; i <= segments; i++) {
                const angle = corner.startAngle + (i / segments) * (Math.PI / 2);
                const x = corner.cx + Math.cos(angle) * radius;
                const y = corner.cy + Math.sin(angle) * radius;
                points.push(new Vector3(x, 0, y)); // 注意：Y 和 Z 交换，因为挤出是沿 Y 轴
            }
        }
        
        return points;
    }

    /**
     * 获取网格
     */
    getMesh(): Mesh {
        return this.mesh;
    }

    /**
     * 设置位置
     */
    setPosition(x: number, y: number, z: number): void {
        this.mesh.position.set(x, y, z);
    }

    /**
     * 设置旋转
     */
    setRotation(x: number, y: number, z: number): void {
        this.mesh.rotation.set(x, y, z);
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.mesh.dispose();
    }
}

// =============================================================================
// 简化版卡牌（使用 Box，性能更好）
// =============================================================================

/**
 * 创建简单的盒子卡牌（高性能版本）
 */
export function cl_createSimpleCardMesh(scene: Scene, name: string): Mesh {
    const { WIDTH, HEIGHT, DEPTH } = CL_CARD_CONFIG;
    
    const card = MeshBuilder.CreateBox(name, {
        width: WIDTH,
        height: DEPTH,
        depth: HEIGHT,
    }, scene);
    
    // 旋转使卡面朝上
    card.rotation.x = -Math.PI / 2;
    
    return card;
}

/**
 * 创建卡牌组（用于手牌显示）
 */
export function cl_createCardGroup(
    scene: Scene, 
    count: number, 
    namePrefix: string = 'card'
): Mesh[] {
    const cards: Mesh[] = [];
    
    for (let i = 0; i < count; i++) {
        const card = cl_createSimpleCardMesh(scene, `${namePrefix}_${i}`);
        cards.push(card);
    }
    
    return cards;
}
