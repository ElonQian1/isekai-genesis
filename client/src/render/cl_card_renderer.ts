/**
 * 3D 卡牌渲染器 - 将卡牌数据渲染为 3D 网格
 * 
 * 模块: client/render
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import {
    Scene,
    Mesh,
} from '@babylonjs/core';

import { cl_createSimpleCardMesh } from './cl_card_mesh';
import { 
    cl_createCardMaterial, 
    ClCardMaterialConfig,
    ClCardRarity,
    ClCardType,
} from './cl_card_material';
import { ClCardData } from '../cl_battle_manager';

// =============================================================================
// 卡牌实体
// =============================================================================

export interface ClCardEntity {
    id: string;
    data: ClCardData;
    mesh: Mesh;
    isPlayable: boolean;
    isSelected: boolean;
}

// =============================================================================
// 卡牌渲染器
// =============================================================================

export class ClCardRenderer {
    private scene: Scene;
    private cardCache: Map<string, ClCardEntity> = new Map();

    constructor(scene: Scene) {
        this.scene = scene;
    }

    /**
     * 创建卡牌 3D 实体
     */
    createCard(cardData: ClCardData): ClCardEntity {
        // 检查缓存
        if (this.cardCache.has(cardData.id)) {
            return this.cardCache.get(cardData.id)!;
        }

        // 创建网格
        const mesh = cl_createSimpleCardMesh(this.scene, `card_${cardData.id}`);

        // 创建材质
        const materialConfig = this.dataToMaterialConfig(cardData);
        const material = cl_createCardMaterial(this.scene, materialConfig);
        mesh.material = material;

        // 创建实体
        const entity: ClCardEntity = {
            id: cardData.id,
            data: cardData,
            mesh: mesh,
            isPlayable: true,
            isSelected: false,
        };

        // 缓存
        this.cardCache.set(cardData.id, entity);

        return entity;
    }

    /**
     * 转换卡牌数据为材质配置
     */
    private dataToMaterialConfig(data: ClCardData): ClCardMaterialConfig {
        // 转换卡牌类型
        const typeMap: Record<string, ClCardType> = {
            'attack': 'attack',
            'skill': 'skill',
            'power': 'power',
        };
        
        // 转换稀有度
        const rarityMap: Record<string, ClCardRarity> = {
            'common': 'common',
            'uncommon': 'uncommon',
            'rare': 'rare',
            'epic': 'epic',
            'legendary': 'legendary',
        };

        return {
            name: data.id,
            cardType: typeMap[data.card_type] || 'attack',
            rarity: rarityMap[data.rarity] || 'common',
            title: data.name,
            cost: data.cost,
            description: data.description,
            attack: data.damage,
            defense: data.block,
        };
    }

    /**
     * 更新卡牌可用状态
     */
    setCardPlayable(cardId: string, playable: boolean): void {
        const entity = this.cardCache.get(cardId);
        if (!entity) return;

        entity.isPlayable = playable;
        
        // 视觉反馈
        if (playable) {
            entity.mesh.visibility = 1;
        } else {
            entity.mesh.visibility = 0.5;
        }
    }

    /**
     * 设置卡牌选中状态
     */
    setCardSelected(cardId: string, selected: boolean): void {
        const entity = this.cardCache.get(cardId);
        if (!entity) return;

        entity.isSelected = selected;
        
        // 视觉反馈 (抬起选中的卡牌)
        if (selected) {
            entity.mesh.position.y += 0.5;
        } else {
            // 恢复原位
        }
    }

    /**
     * 获取卡牌实体
     */
    getCard(cardId: string): ClCardEntity | undefined {
        return this.cardCache.get(cardId);
    }

    /**
     * 移除卡牌
     */
    removeCard(cardId: string): void {
        const entity = this.cardCache.get(cardId);
        if (entity) {
            entity.mesh.dispose();
            this.cardCache.delete(cardId);
        }
    }

    /**
     * 清空所有卡牌
     */
    clear(): void {
        for (const entity of this.cardCache.values()) {
            entity.mesh.dispose();
        }
        this.cardCache.clear();
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.clear();
    }
}

// =============================================================================
// 便捷函数：创建测试卡牌数据
// =============================================================================

export function cl_createTestCardData(index: number): ClCardData {
    const cardTypes: ClCardData['card_type'][] = ['attack', 'skill', 'power'];
    const rarities: ClCardData['rarity'][] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    
    const names = [
        '火球术', '冰霜护盾', '治愈之光', '雷击', '暗影箭',
        '战斗怒吼', '魔法屏障', '生命汲取', '烈焰风暴', '神圣打击'
    ];
    
    const descriptions = [
        '对敌人造成6点伤害',
        '获得5点格挡',
        '恢复4点生命值',
        '对敌人造成4点伤害，抽1张牌',
        '对敌人造成8点伤害',
        '下回合攻击力+3',
        '获得8点格挡',
        '造成3点伤害，恢复等量生命',
        '对所有敌人造成4点伤害',
        '造成10点伤害'
    ];

    return {
        id: `card_${index}`,
        name: names[index % names.length],
        cost: (index % 4) + 1,
        description: descriptions[index % descriptions.length],
        card_type: cardTypes[index % cardTypes.length],
        rarity: rarities[Math.min(index, rarities.length - 1)],
        damage: index % 2 === 0 ? 4 + index : undefined,
        block: index % 2 === 1 ? 3 + index : undefined,
    };
}
