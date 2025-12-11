"use strict";
/**
 * 卡牌系统类型定义
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_CARDS = exports.ASSASSIN_CARDS = exports.GUNNER_CARDS = exports.SORCERER_CARDS = exports.SWORDSMAN_CARDS = exports.KNIGHT_CARDS = exports.REDIRECT_CARDS = exports.COMMON_CARDS = void 0;
exports.getCardById = getCardById;
exports.getCardsForProfession = getCardsForProfession;
const enums_1 = require("./enums");
// ==================== 预定义卡牌 ====================
// 通用攻击牌
exports.COMMON_CARDS = [
    {
        id: 'card_basic_attack',
        name: '普通攻击',
        type: enums_1.CardType.ATTACK,
        rarity: enums_1.CardRarity.COMMON,
        cost: 1,
        effects: [{ type: 'damage', target: 'boss', value: 10 }],
        description: '对BOSS造成10点伤害',
    },
    {
        id: 'card_heavy_strike',
        name: '重击',
        type: enums_1.CardType.ATTACK,
        rarity: enums_1.CardRarity.COMMON,
        cost: 2,
        effects: [{ type: 'damage', target: 'boss', value: 25 }],
        description: '对BOSS造成25点伤害',
    },
    {
        id: 'card_basic_defense',
        name: '防御姿态',
        type: enums_1.CardType.DEFENSE,
        rarity: enums_1.CardRarity.COMMON,
        cost: 1,
        effects: [{ type: 'shield', target: 'self', value: 15 }],
        description: '获得15点护盾',
    },
    {
        id: 'card_heal',
        name: '治疗术',
        type: enums_1.CardType.SKILL,
        rarity: enums_1.CardRarity.COMMON,
        cost: 2,
        effects: [{ type: 'heal', target: 'self', value: 20 }],
        description: '恢复20点生命值',
    },
    {
        id: 'card_team_heal',
        name: '团队治疗',
        type: enums_1.CardType.SKILL,
        rarity: enums_1.CardRarity.RARE,
        cost: 3,
        effects: [{ type: 'heal', target: 'all_allies', value: 10 }],
        description: '为所有同组织队友恢复10点生命值',
    },
];
// 嫁祸牌（让BOSS攻击其他组织）
exports.REDIRECT_CARDS = [
    {
        id: 'card_redirect_iron',
        name: '嫁祸铁壁要塞',
        type: enums_1.CardType.REDIRECT,
        rarity: enums_1.CardRarity.RARE,
        cost: 2,
        effects: [{ type: 'redirect', target: 'organization', value: 0 }],
        description: '让BOSS下回合优先攻击铁壁要塞的玩家',
        redirectTarget: enums_1.Organization.IRON_FORTRESS,
    },
    {
        id: 'card_redirect_shadow',
        name: '嫁祸暗影盟约',
        type: enums_1.CardType.REDIRECT,
        rarity: enums_1.CardRarity.RARE,
        cost: 2,
        effects: [{ type: 'redirect', target: 'organization', value: 0 }],
        description: '让BOSS下回合优先攻击暗影盟约的玩家',
        redirectTarget: enums_1.Organization.SHADOW_COVENANT,
    },
    {
        id: 'card_redirect_flame',
        name: '嫁祸烈焰军团',
        type: enums_1.CardType.REDIRECT,
        rarity: enums_1.CardRarity.RARE,
        cost: 2,
        effects: [{ type: 'redirect', target: 'organization', value: 0 }],
        description: '让BOSS下回合优先攻击烈焰军团的玩家',
        redirectTarget: enums_1.Organization.FLAME_LEGION,
    },
    {
        id: 'card_redirect_frost',
        name: '嫁祸霜寒圣所',
        type: enums_1.CardType.REDIRECT,
        rarity: enums_1.CardRarity.RARE,
        cost: 2,
        effects: [{ type: 'redirect', target: 'organization', value: 0 }],
        description: '让BOSS下回合优先攻击霜寒圣所的玩家',
        redirectTarget: enums_1.Organization.FROST_SANCTUARY,
    },
];
// 骑士专属卡牌
exports.KNIGHT_CARDS = [
    {
        id: 'card_knight_shield_wall',
        name: '盾墙',
        type: enums_1.CardType.DEFENSE,
        rarity: enums_1.CardRarity.RARE,
        cost: 2,
        professionRequired: enums_1.Profession.KNIGHT,
        effects: [
            { type: 'shield', target: 'self', value: 30 },
            { type: 'buff', target: 'self', value: 20, duration: 2 },
        ],
        description: '获得30点护盾，并在2回合内提升20%防御',
    },
    {
        id: 'card_knight_taunt',
        name: '嘲讽',
        type: enums_1.CardType.SKILL,
        rarity: enums_1.CardRarity.EPIC,
        cost: 3,
        professionRequired: enums_1.Profession.KNIGHT,
        effects: [
            { type: 'special', target: 'self', value: 0 },
        ],
        description: '强制BOSS下回合攻击自己，获得50%减伤',
    },
];
// 剑士专属卡牌
exports.SWORDSMAN_CARDS = [
    {
        id: 'card_swordsman_slash',
        name: '连斩',
        type: enums_1.CardType.ATTACK,
        rarity: enums_1.CardRarity.RARE,
        cost: 2,
        professionRequired: enums_1.Profession.SWORDSMAN,
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
        type: enums_1.CardType.ATTACK,
        rarity: enums_1.CardRarity.EPIC,
        cost: 4,
        professionRequired: enums_1.Profession.SWORDSMAN,
        effects: [
            { type: 'damage', target: 'boss', value: 60 },
        ],
        description: '释放剑气风暴，对BOSS造成60点伤害',
    },
];
// 术士专属卡牌
exports.SORCERER_CARDS = [
    {
        id: 'card_sorcerer_fireball',
        name: '火球术',
        type: enums_1.CardType.ATTACK,
        rarity: enums_1.CardRarity.RARE,
        cost: 2,
        professionRequired: enums_1.Profession.SORCERER,
        effects: [
            { type: 'damage', target: 'boss', value: 35 },
            { type: 'debuff', target: 'boss', value: 5, duration: 2 },
        ],
        description: '发射火球造成35点伤害，并使BOSS灼烧2回合',
    },
    {
        id: 'card_sorcerer_arcane_blast',
        name: '奥术爆破',
        type: enums_1.CardType.ATTACK,
        rarity: enums_1.CardRarity.EPIC,
        cost: 4,
        professionRequired: enums_1.Profession.SORCERER,
        effects: [
            { type: 'damage', target: 'boss', value: 70 },
        ],
        description: '释放奥术能量，对BOSS造成70点伤害',
    },
];
// 枪手专属卡牌
exports.GUNNER_CARDS = [
    {
        id: 'card_gunner_rapid_fire',
        name: '速射',
        type: enums_1.CardType.ATTACK,
        rarity: enums_1.CardRarity.RARE,
        cost: 2,
        professionRequired: enums_1.Profession.GUNNER,
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
        type: enums_1.CardType.ATTACK,
        rarity: enums_1.CardRarity.EPIC,
        cost: 3,
        professionRequired: enums_1.Profession.GUNNER,
        effects: [
            { type: 'damage', target: 'boss', value: 50 },
        ],
        description: '精准狙击，造成50点伤害，必定暴击',
    },
];
// 刺客专属卡牌
exports.ASSASSIN_CARDS = [
    {
        id: 'card_assassin_backstab',
        name: '背刺',
        type: enums_1.CardType.ATTACK,
        rarity: enums_1.CardRarity.RARE,
        cost: 2,
        professionRequired: enums_1.Profession.ASSASSIN,
        effects: [
            { type: 'damage', target: 'boss', value: 40 },
        ],
        description: '从暗影中突袭，造成40点伤害（目标生命值越低伤害越高）',
    },
    {
        id: 'card_assassin_death_mark',
        name: '死亡印记',
        type: enums_1.CardType.SKILL,
        rarity: enums_1.CardRarity.EPIC,
        cost: 3,
        professionRequired: enums_1.Profession.ASSASSIN,
        effects: [
            { type: 'debuff', target: 'boss', value: 30, duration: 3 },
        ],
        description: '标记目标，使其在3回合内受到的伤害增加30%',
    },
];
// 所有卡牌合集
exports.ALL_CARDS = [
    ...exports.COMMON_CARDS,
    ...exports.REDIRECT_CARDS,
    ...exports.KNIGHT_CARDS,
    ...exports.SWORDSMAN_CARDS,
    ...exports.SORCERER_CARDS,
    ...exports.GUNNER_CARDS,
    ...exports.ASSASSIN_CARDS,
];
// 根据ID获取卡牌
function getCardById(cardId) {
    return exports.ALL_CARDS.find(card => card.id === cardId);
}
// 根据职业获取可用卡牌
function getCardsForProfession(profession) {
    return exports.ALL_CARDS.filter(card => !card.professionRequired || card.professionRequired === profession);
}
