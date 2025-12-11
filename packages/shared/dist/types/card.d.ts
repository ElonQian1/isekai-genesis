/**
 * 卡牌系统类型定义
 */
import { CardType, CardRarity, Profession, Organization } from './enums';
export interface CardEffect {
    type: 'damage' | 'heal' | 'shield' | 'buff' | 'debuff' | 'redirect' | 'draw' | 'special';
    target: 'self' | 'ally' | 'enemy' | 'all_allies' | 'all_enemies' | 'boss' | 'organization';
    value: number;
    duration?: number;
    additionalEffects?: CardEffect[];
}
export interface Card {
    id: string;
    name: string;
    type: CardType;
    rarity: CardRarity;
    cost: number;
    professionRequired?: Profession;
    effects: CardEffect[];
    description: string;
    flavorText?: string;
    redirectTarget?: Organization;
    imageUrl?: string;
}
export interface CardInstance {
    instanceId: string;
    cardId: string;
    card: Card;
    isPlayable: boolean;
    isEnhanced: boolean;
    enhanceLevel: number;
}
export interface Deck {
    id: string;
    name: string;
    playerId: string;
    cards: string[];
    maxSize: number;
    profession: Profession;
    isActive: boolean;
}
export declare const COMMON_CARDS: Card[];
export declare const REDIRECT_CARDS: Card[];
export declare const KNIGHT_CARDS: Card[];
export declare const SWORDSMAN_CARDS: Card[];
export declare const SORCERER_CARDS: Card[];
export declare const GUNNER_CARDS: Card[];
export declare const ASSASSIN_CARDS: Card[];
export declare const ALL_CARDS: Card[];
export declare function getCardById(cardId: string): Card | undefined;
export declare function getCardsForProfession(profession: Profession): Card[];
