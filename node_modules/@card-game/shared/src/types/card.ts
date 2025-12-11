/**
 * 卡牌系统类型定义
 */

import { CardType, CardRarity, Profession, Organization } from './enums';

// 卡牌效果
export interface CardEffect {
  type: 'damage' | 'heal' | 'shield' | 'buff' | 'debuff' | 'redirect' | 'draw' | 'special';
  target: 'self' | 'ally' | 'enemy' | 'all_allies' | 'all_enemies' | 'boss' | 'organization';
  value: number;
  duration?: number;        // 持续回合数（用于buff/debuff）
  additionalEffects?: CardEffect[];
}

// 卡牌定义
export interface Card {
  id: string;
  name: string;
  type: CardType;
  rarity: CardRarity;
  
  // 卡牌消耗
  cost: number;             // 行动点消耗
  
  // 职业限制（为空表示通用卡）
  professionRequired?: Profession;
  
  // 卡牌效果
  effects: CardEffect[];
  
  // 描述
  description: string;
  flavorText?: string;      // 风味文本
  
  // 嫁祸牌特殊属性
  redirectTarget?: Organization;  // 让BOSS攻击指定组织
  
  // 卡牌图片
  imageUrl?: string;
}

// 卡牌实例（玩家手中的卡牌）
export interface CardInstance {
  instanceId: string;       // 唯一实例ID
  cardId: string;           // 卡牌模板ID
  card: Card;               // 卡牌数据
  isPlayable: boolean;      // 是否可使用
  isEnhanced: boolean;      // 是否被强化
  enhanceLevel: number;     // 强化等级
}

// 卡组
export interface Deck {
  id: string;
  name: string;
  playerId: string;
  cards: string[];          // 卡牌ID列表
  maxSize: number;
  profession: Profession;
  isActive: boolean;
}

// ==================== 预定义卡牌 ====================

// 通用攻击牌
export const COMMON_CARDS: Card[] = [
  {
    id: 'card_basic_attack',
    name: '普通攻击',
    type: CardType.ATTACK,
    rarity: CardRarity.COMMON,
    cost: 1,
    effects: [{ type: 'damage', target: 'boss', value: 10 }],
    description: '对BOSS造成10点伤害',
  },
  {
    id: 'card_heavy_strike',
    name: '重击',
    type: CardType.ATTACK,
    rarity: CardRarity.COMMON,
    cost: 2,
    effects: [{ type: 'damage', target: 'boss', value: 25 }],
    description: '对BOSS造成25点伤害',
  },
  {
    id: 'card_basic_defense',
    name: '防御姿态',
    type: CardType.DEFENSE,
    rarity: CardRarity.COMMON,
    cost: 1,
    effects: [{ type: 'shield', target: 'self', value: 15 }],
    description: '获得15点护盾',
  },
  {
    id: 'card_heal',
    name: '治疗术',
    type: CardType.SKILL,
    rarity: CardRarity.COMMON,
    cost: 2,
    effects: [{ type: 'heal', target: 'self', value: 20 }],
    description: '恢复20点生命值',
  },
  {
    id: 'card_team_heal',
    name: '团队治疗',
    type: CardType.SKILL,
    rarity: CardRarity.RARE,
    cost: 3,
    effects: [{ type: 'heal', target: 'all_allies', value: 10 }],
    description: '为所有同组织队友恢复10点生命值',
  },
];

// 嫁祸牌（让BOSS攻击其他组织）
export const REDIRECT_CARDS: Card[] = [
  {
    id: 'card_redirect_iron',
    name: '嫁祸铁壁要塞',
    type: CardType.REDIRECT,
    rarity: CardRarity.RARE,
    cost: 2,
    effects: [{ type: 'redirect', target: 'organization', value: 0 }],
    description: '让BOSS下回合优先攻击铁壁要塞的玩家',
    redirectTarget: Organization.IRON_FORTRESS,
  },
  {
    id: 'card_redirect_shadow',
    name: '嫁祸暗影盟约',
    type: CardType.REDIRECT,
    rarity: CardRarity.RARE,
    cost: 2,
    effects: [{ type: 'redirect', target: 'organization', value: 0 }],
    description: '让BOSS下回合优先攻击暗影盟约的玩家',
    redirectTarget: Organization.SHADOW_COVENANT,
  },
  {
    id: 'card_redirect_flame',
    name: '嫁祸烈焰军团',
    type: CardType.REDIRECT,
    rarity: CardRarity.RARE,
    cost: 2,
    effects: [{ type: 'redirect', target: 'organization', value: 0 }],
    description: '让BOSS下回合优先攻击烈焰军团的玩家',
    redirectTarget: Organization.FLAME_LEGION,
  },
  {
    id: 'card_redirect_frost',
    name: '嫁祸霜寒圣所',
    type: CardType.REDIRECT,
    rarity: CardRarity.RARE,
    cost: 2,
    effects: [{ type: 'redirect', target: 'organization', value: 0 }],
    description: '让BOSS下回合优先攻击霜寒圣所的玩家',
    redirectTarget: Organization.FROST_SANCTUARY,
  },
];

// 骑士专属卡牌
export const KNIGHT_CARDS: Card[] = [
  {
    id: 'card_knight_shield_wall',
    name: '盾墙',
    type: CardType.DEFENSE,
    rarity: CardRarity.RARE,
    cost: 2,
    professionRequired: Profession.KNIGHT,
    effects: [
      { type: 'shield', target: 'self', value: 30 },
      { type: 'buff', target: 'self', value: 20, duration: 2 },
    ],
    description: '获得30点护盾，并在2回合内提升20%防御',
  },
  {
    id: 'card_knight_taunt',
    name: '嘲讽',
    type: CardType.SKILL,
    rarity: CardRarity.EPIC,
    cost: 3,
    professionRequired: Profession.KNIGHT,
    effects: [
      { type: 'special', target: 'self', value: 0 },
    ],
    description: '强制BOSS下回合攻击自己，获得50%减伤',
  },
];

// 剑士专属卡牌
export const SWORDSMAN_CARDS: Card[] = [
  {
    id: 'card_swordsman_slash',
    name: '连斩',
    type: CardType.ATTACK,
    rarity: CardRarity.RARE,
    cost: 2,
    professionRequired: Profession.SWORDSMAN,
    effects: [
      { type: 'damage', target: 'boss', value: 15 },
      { type: 'damage', target: 'boss', value: 15 },
      { type: 'damage', target: 'boss', value: 15 },
    ],
    description: '对BOSS进行3次连续攻击，每次造成15点伤害',
  },
  {
    id: 'card_swordsman_blade_storm',
    name: '剑刃风暴',
    type: CardType.ATTACK,
    rarity: CardRarity.EPIC,
    cost: 4,
    professionRequired: Profession.SWORDSMAN,
    effects: [
      { type: 'damage', target: 'boss', value: 60 },
    ],
    description: '释放剑气风暴，对BOSS造成60点伤害',
  },
];

// 术士专属卡牌
export const SORCERER_CARDS: Card[] = [
  {
    id: 'card_sorcerer_fireball',
    name: '火球术',
    type: CardType.ATTACK,
    rarity: CardRarity.RARE,
    cost: 2,
    professionRequired: Profession.SORCERER,
    effects: [
      { type: 'damage', target: 'boss', value: 35 },
      { type: 'debuff', target: 'boss', value: 5, duration: 2 },
    ],
    description: '发射火球造成35点伤害，并使BOSS灼烧2回合',
  },
  {
    id: 'card_sorcerer_arcane_blast',
    name: '奥术爆破',
    type: CardType.ATTACK,
    rarity: CardRarity.EPIC,
    cost: 4,
    professionRequired: Profession.SORCERER,
    effects: [
      { type: 'damage', target: 'boss', value: 70 },
    ],
    description: '释放奥术能量，对BOSS造成70点伤害',
  },
];

// 枪手专属卡牌
export const GUNNER_CARDS: Card[] = [
  {
    id: 'card_gunner_rapid_fire',
    name: '速射',
    type: CardType.ATTACK,
    rarity: CardRarity.RARE,
    cost: 2,
    professionRequired: Profession.GUNNER,
    effects: [
      { type: 'damage', target: 'boss', value: 12 },
      { type: 'damage', target: 'boss', value: 12 },
      { type: 'damage', target: 'boss', value: 12 },
      { type: 'damage', target: 'boss', value: 12 },
    ],
    description: '快速射击4次，每次造成12点伤害',
  },
  {
    id: 'card_gunner_snipe',
    name: '狙击',
    type: CardType.ATTACK,
    rarity: CardRarity.EPIC,
    cost: 3,
    professionRequired: Profession.GUNNER,
    effects: [
      { type: 'damage', target: 'boss', value: 50 },
    ],
    description: '精准狙击，造成50点伤害，必定暴击',
  },
];

// 刺客专属卡牌
export const ASSASSIN_CARDS: Card[] = [
  {
    id: 'card_assassin_backstab',
    name: '背刺',
    type: CardType.ATTACK,
    rarity: CardRarity.RARE,
    cost: 2,
    professionRequired: Profession.ASSASSIN,
    effects: [
      { type: 'damage', target: 'boss', value: 40 },
    ],
    description: '从暗影中突袭，造成40点伤害（目标生命值越低伤害越高）',
  },
  {
    id: 'card_assassin_death_mark',
    name: '死亡印记',
    type: CardType.SKILL,
    rarity: CardRarity.EPIC,
    cost: 3,
    professionRequired: Profession.ASSASSIN,
    effects: [
      { type: 'debuff', target: 'boss', value: 30, duration: 3 },
    ],
    description: '标记目标，使其在3回合内受到的伤害增加30%',
  },
];

// 所有卡牌合集
export const ALL_CARDS: Card[] = [
  ...COMMON_CARDS,
  ...REDIRECT_CARDS,
  ...KNIGHT_CARDS,
  ...SWORDSMAN_CARDS,
  ...SORCERER_CARDS,
  ...GUNNER_CARDS,
  ...ASSASSIN_CARDS,
];

// 根据ID获取卡牌
export function getCardById(cardId: string): Card | undefined {
  return ALL_CARDS.find(card => card.id === cardId);
}

// 根据职业获取可用卡牌
export function getCardsForProfession(profession: Profession): Card[] {
  return ALL_CARDS.filter(card => 
    !card.professionRequired || card.professionRequired === profession
  );
}
