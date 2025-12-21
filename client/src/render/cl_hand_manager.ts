/**
 * 手牌管理器 - 扇形布局
 * 
 * 模块: client/render
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import {
    Scene,
    Mesh,
    Vector3,
    TransformNode,
    PointerEventTypes,
    AbstractMesh,
} from '@babylonjs/core';

import { cl_createSimpleCardMesh } from './cl_card_mesh';
import { cl_createHoverAnimation, cl_playAnimationGroup, cl_createPlayCardAnimation } from './cl_card_animation';

// =============================================================================
// 手牌配置
// =============================================================================

export const CL_HAND_CONFIG = {
    // 扇形参数
    FAN_ANGLE: 40,              // 扇形总角度 (度)
    FAN_RADIUS: 8,              // 扇形半径
    CARD_TILT: 5,               // 每张牌的倾斜角度 (度)
    
    // 位置
    HAND_Y: 0.5,                // 手牌 Y 位置
    HAND_Z: -5,                 // 手牌 Z 位置 (靠近玩家)
    
    // 悬停效果
    HOVER_HEIGHT: 0.8,          // 悬停抬起高度
    HOVER_SCALE: 1.2,           // 悬停缩放
    HOVER_FORWARD: 1.0,         // 悬停前移距离
    
    // 最大手牌
    MAX_HAND_SIZE: 10,
};

// =============================================================================
// 卡牌数据接口
// =============================================================================

export interface ClHandCard {
    id: string;
    mesh: Mesh;
    index: number;
    isHovered: boolean;
    originalPosition: Vector3;
    originalRotation: Vector3;
}

// =============================================================================
// 手牌管理器
// =============================================================================

export class ClHandManager {
    private scene: Scene;
    private handRoot: TransformNode;
    private cards: ClHandCard[] = [];
    private hoveredCard: ClHandCard | null = null;
    private selectedCard: ClHandCard | null = null;
    
    // 回调
    public onCardHover: ((card: ClHandCard | null) => void) | null = null;
    public onCardSelect: ((card: ClHandCard) => void) | null = null;
    public onCardPlay: ((card: ClHandCard, target: Vector3) => void) | null = null;

    constructor(scene: Scene) {
        this.scene = scene;
        
        // 创建手牌根节点
        this.handRoot = new TransformNode('handRoot', scene);
        this.handRoot.position = new Vector3(0, CL_HAND_CONFIG.HAND_Y, CL_HAND_CONFIG.HAND_Z);
        
        // 设置交互
        this.setupInteraction();
    }

    /**
     * 添加卡牌到手牌
     */
    addCard(cardId: string): ClHandCard {
        if (this.cards.length >= CL_HAND_CONFIG.MAX_HAND_SIZE) {
            throw new Error('手牌已满');
        }
        
        // 创建卡牌网格
        const mesh = cl_createSimpleCardMesh(this.scene, `handCard_${cardId}`);
        mesh.parent = this.handRoot;
        
        const card: ClHandCard = {
            id: cardId,
            mesh: mesh,
            index: this.cards.length,
            isHovered: false,
            originalPosition: Vector3.Zero(),
            originalRotation: Vector3.Zero(),
        };
        
        this.cards.push(card);
        
        // 重新布局所有卡牌
        this.layoutCards();
        
        return card;
    }

    /**
     * 移除卡牌
     */
    removeCard(cardId: string): void {
        const index = this.cards.findIndex(c => c.id === cardId);
        if (index === -1) return;
        
        const card = this.cards[index];
        card.mesh.dispose();
        this.cards.splice(index, 1);
        
        // 更新索引并重新布局
        this.cards.forEach((c, i) => c.index = i);
        this.layoutCards();
    }

    /**
     * 扇形布局卡牌
     */
    private layoutCards(): void {
        const count = this.cards.length;
        if (count === 0) return;
        
        const { FAN_ANGLE, FAN_RADIUS, CARD_TILT } = CL_HAND_CONFIG;
        
        // 计算每张牌的角度
        const totalAngle = Math.min(FAN_ANGLE, count * 8); // 动态调整扇形角度
        const angleStep = count > 1 ? totalAngle / (count - 1) : 0;
        const startAngle = -totalAngle / 2;
        
        for (let i = 0; i < count; i++) {
            const card = this.cards[i];
            const angle = (startAngle + angleStep * i) * (Math.PI / 180);
            
            // 扇形位置
            const x = Math.sin(angle) * FAN_RADIUS;
            const z = -Math.cos(angle) * FAN_RADIUS + FAN_RADIUS;
            const y = 0;
            
            // 卡牌倾斜 (边缘的牌稍微倾斜)
            const tilt = ((i - (count - 1) / 2) / count) * CARD_TILT * (Math.PI / 180);
            
            card.originalPosition = new Vector3(x, y, z);
            card.originalRotation = new Vector3(-Math.PI / 2, angle, tilt);
            
            // 如果没有悬停，应用位置
            if (!card.isHovered) {
                card.mesh.position = card.originalPosition.clone();
                card.mesh.rotation = card.originalRotation.clone();
            }
        }
    }

    /**
     * 设置交互
     */
    private setupInteraction(): void {
        this.scene.onPointerObservable.add((pointerInfo) => {
            switch (pointerInfo.type) {
                case PointerEventTypes.POINTERMOVE:
                    this.handlePointerMove(pointerInfo.pickInfo?.pickedMesh);
                    break;
                case PointerEventTypes.POINTERDOWN:
                    this.handlePointerDown(pointerInfo.pickInfo?.pickedMesh);
                    break;
                case PointerEventTypes.POINTERUP:
                    this.handlePointerUp();
                    break;
            }
        });
    }

    /**
     * 处理指针移动
     */
    private handlePointerMove(pickedMesh: AbstractMesh | null | undefined): void {
        // 查找悬停的卡牌
        const hoveredCard = this.cards.find(c => c.mesh === pickedMesh) || null;
        
        // 如果悬停卡牌改变
        if (hoveredCard !== this.hoveredCard) {
            // 恢复之前悬停的卡牌
            if (this.hoveredCard) {
                this.unhoverCard(this.hoveredCard);
            }
            
            // 悬停新卡牌
            if (hoveredCard) {
                this.hoverCard(hoveredCard);
            }
            
            this.hoveredCard = hoveredCard;
            this.onCardHover?.(hoveredCard);
        }
    }

    /**
     * 悬停卡牌效果
     */
    private hoverCard(card: ClHandCard): void {
        card.isHovered = true;
        
        const { HOVER_HEIGHT, HOVER_SCALE, HOVER_FORWARD } = CL_HAND_CONFIG;
        
        // 抬起并放大
        const targetPos = card.originalPosition.clone();
        targetPos.y += HOVER_HEIGHT;
        targetPos.z -= HOVER_FORWARD;
        
        // 使用动画
        const anim = cl_createHoverAnimation(card.mesh, HOVER_HEIGHT, HOVER_SCALE);
        cl_playAnimationGroup(anim);
        
        // 简单移动 (动画可能有延迟，先直接设置)
        card.mesh.position = targetPos;
        card.mesh.scaling.setAll(HOVER_SCALE);
        
        // 旋转为平放便于查看
        card.mesh.rotation = new Vector3(-Math.PI / 2, 0, 0);
    }

    /**
     * 取消悬停
     */
    private unhoverCard(card: ClHandCard): void {
        card.isHovered = false;
        
        // 恢复原位
        card.mesh.position = card.originalPosition.clone();
        card.mesh.rotation = card.originalRotation.clone();
        card.mesh.scaling.setAll(1);
    }

    /**
     * 处理点击
     */
    private handlePointerDown(pickedMesh: AbstractMesh | null | undefined): void {
        const clickedCard = this.cards.find(c => c.mesh === pickedMesh);
        
        if (clickedCard) {
            this.selectedCard = clickedCard;
            this.onCardSelect?.(clickedCard);
        }
    }

    /**
     * 处理释放
     */
    private handlePointerUp(): void {
        if (this.selectedCard) {
            // TODO: 检测是否拖到了有效目标
            // 暂时打出到场地中央
            this.playCard(this.selectedCard, new Vector3(0, 1, 0));
            this.selectedCard = null;
        }
    }

    /**
     * 打出卡牌
     */
    async playCard(card: ClHandCard, targetPosition: Vector3): Promise<void> {
        // 播放打出动画
        const anim = cl_createPlayCardAnimation(card.mesh, targetPosition);
        await cl_playAnimationGroup(anim);
        
        // 通知回调
        this.onCardPlay?.(card, targetPosition);
        
        // 移除卡牌
        this.removeCard(card.id);
    }

    /**
     * 获取手牌数量
     */
    getCardCount(): number {
        return this.cards.length;
    }

    /**
     * 获取所有卡牌
     */
    getCards(): ClHandCard[] {
        return [...this.cards];
    }

    /**
     * 清空手牌
     */
    clear(): void {
        for (const card of this.cards) {
            card.mesh.dispose();
        }
        this.cards = [];
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.clear();
        this.handRoot.dispose();
    }
}
