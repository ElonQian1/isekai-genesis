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
        // 转换卡牌类型 - ClWasmCard 使用 Pascal 风格
        const typeMap: Record<string, ClCardType> = {
            'Attack': 'attack',
            'Defense': 'attack',  // 防御卡也使用攻击样式
            'Skill': 'skill',
            'Special': 'power',
        };
        
        // 根据卡牌类型推断稀有度（ClWasmCard 没有稀有度属性）
        const inferRarity = (cost: number): ClCardRarity => {
            if (cost >= 4) return 'epic';
            if (cost >= 3) return 'rare';
            if (cost >= 2) return 'uncommon';
            return 'common';
        };

        // 生成描述文本
        const generateDescription = (): string => {
            if (data.card_type === 'Attack') {
                return `对敌人造成 ${data.base_damage} 点伤害`;
            } else if (data.card_type === 'Defense') {
                return `获得 ${data.base_damage} 点护盾`;
            }
            return data.effects.map(e => `${e.effect_type}: ${e.value}`).join('\n');
        };

        return {
            name: data.id,
            cardType: typeMap[data.card_type] || 'attack',
            rarity: inferRarity(data.cost),
            title: data.name,
            cost: data.cost,
            description: generateDescription(),
            attack: data.card_type === 'Attack' ? data.base_damage : undefined,
            defense: data.card_type === 'Defense' ? data.base_damage : undefined,
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
    const cardTypes: ClCardData['card_type'][] = ['Attack', 'Defense', 'Skill', 'Special'];
    
    const names = [
        '火球术', '冰霜护盾', '治愈之光', '雷击', '暗影箭',
        '战斗怒吼', '魔法屏障', '生命汲取', '烈焰风暴', '神圣打击'
    ];
    
    const cardType = cardTypes[index % cardTypes.length];
    const baseDamage = cardType === 'Attack' ? 4 + index : (cardType === 'Defense' ? 3 + index : 0);

    return {
        id: `card_${index}`,
        template_id: `template_${index}`,
        name: names[index % names.length],
        cost: (index % 4) + 1,
        card_type: cardType,
        base_damage: baseDamage,
        effects: [],
    };
}
