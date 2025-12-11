"use strict";
/**
 * 玩家相关类型定义
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROFESSION_TALENTS = exports.PROFESSION_BASE_STATS = void 0;
const enums_1 = require("./enums");
// 职业基础属性配置
exports.PROFESSION_BASE_STATS = {
    [enums_1.Profession.KNIGHT]: {
        maxHealth: 150,
        currentHealth: 150,
        attack: 20,
        defense: 30,
        speed: 10,
        critRate: 5,
        critDamage: 1.5,
    },
    [enums_1.Profession.SWORDSMAN]: {
        maxHealth: 120,
        currentHealth: 120,
        attack: 35,
        defense: 20,
        speed: 20,
        critRate: 15,
        critDamage: 1.8,
    },
    [enums_1.Profession.SORCERER]: {
        maxHealth: 80,
        currentHealth: 80,
        attack: 45,
        defense: 10,
        speed: 15,
        critRate: 20,
        critDamage: 2.0,
    },
    [enums_1.Profession.GUNNER]: {
        maxHealth: 90,
        currentHealth: 90,
        attack: 40,
        defense: 15,
        speed: 25,
        critRate: 25,
        critDamage: 1.7,
    },
    [enums_1.Profession.ASSASSIN]: {
        maxHealth: 85,
        currentHealth: 85,
        attack: 50,
        defense: 10,
        speed: 30,
        critRate: 30,
        critDamage: 2.2,
    },
};
// 职业对应天赋
exports.PROFESSION_TALENTS = {
    [enums_1.Profession.KNIGHT]: {
        type: enums_1.Talent.IRON_BASTION,
        name: '坚守壁垒',
        description: '激活后，本回合内为全队提供护盾，吸收等同于骑士防御力50%的伤害',
        level: 1,
        cooldown: 3,
        currentCooldown: 0,
    },
    [enums_1.Profession.SWORDSMAN]: {
        type: enums_1.Talent.SWORD_SPIRIT,
        name: '剑意凝聚',
        description: '激活后，下一次攻击造成双倍伤害，并有50%概率使目标流血',
        level: 1,
        cooldown: 2,
        currentCooldown: 0,
    },
    [enums_1.Profession.SORCERER]: {
        type: enums_1.Talent.ELEMENTAL_MASTERY,
        name: '元素掌控',
        description: '激活后，本回合所有技能牌效果提升100%，且消耗减半',
        level: 1,
        cooldown: 4,
        currentCooldown: 0,
    },
    [enums_1.Profession.GUNNER]: {
        type: enums_1.Talent.PRECISION_SHOT,
        name: '精准射击',
        description: '激活后，下三次攻击必定暴击，且无视30%防御',
        level: 1,
        cooldown: 3,
        currentCooldown: 0,
    },
    [enums_1.Profession.ASSASSIN]: {
        type: enums_1.Talent.SHADOW_STRIKE,
        name: '暗影突袭',
        description: '激活后，进入隐身状态，下一次攻击造成300%伤害并使目标眩晕1回合',
        level: 1,
        cooldown: 4,
        currentCooldown: 0,
    },
};
