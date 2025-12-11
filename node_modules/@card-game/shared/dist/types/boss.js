"use strict";
/**
 * BOSS系统类型定义
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WEEKLY_BOSSES = exports.MINI_BOSSES = exports.BossState = exports.BossType = void 0;
exports.getBossById = getBossById;
exports.createBossInstance = createBossInstance;
// BOSS类型
var BossType;
(function (BossType) {
    BossType["MINI"] = "mini";
    BossType["WEEKLY"] = "weekly";
    BossType["WORLD"] = "world";
})(BossType || (exports.BossType = BossType = {}));
// BOSS状态
var BossState;
(function (BossState) {
    BossState["IDLE"] = "idle";
    BossState["ATTACKING"] = "attacking";
    BossState["CHARGING"] = "charging";
    BossState["ENRAGED"] = "enraged";
    BossState["STUNNED"] = "stunned";
    BossState["DEAD"] = "dead";
})(BossState || (exports.BossState = BossState = {}));
// ==================== 预定义BOSS ====================
// 小型BOSS
exports.MINI_BOSSES = [
    {
        id: 'boss_shadow_lurker',
        name: '暗影潜伏者',
        type: BossType.MINI,
        description: '在地底深处游荡的凶兽，专门伏击落单的幸存者',
        maxHealth: 500,
        baseAttack: 25,
        defense: 10,
        maxRage: 100,
        ragePerDamage: 0.5,
        skills: [
            {
                id: 'skill_shadow_claw',
                name: '暗影利爪',
                description: '用锋利的爪子攻击单个目标',
                damage: 30,
                target: 'single',
                cooldown: 0,
                currentCooldown: 0,
            },
            {
                id: 'skill_dark_screech',
                name: '黑暗尖啸',
                description: '发出刺耳的尖叫，攻击所有玩家',
                damage: 15,
                target: 'all',
                cooldown: 3,
                currentCooldown: 0,
            },
        ],
        rageSkill: {
            id: 'skill_shadow_storm',
            name: '暗影风暴',
            description: '释放暗影能量，对全体造成大量伤害',
            damage: 50,
            target: 'all',
            cooldown: 0,
            currentCooldown: 0,
            rageRequired: 100,
        },
        attackBoostPerRevive: 0, // 小型BOSS不复活
    },
    {
        id: 'boss_toxic_crawler',
        name: '剧毒爬行者',
        type: BossType.MINI,
        description: '全身覆盖剧毒鳞片的巨型虫类凶兽',
        maxHealth: 400,
        baseAttack: 20,
        defense: 15,
        maxRage: 80,
        ragePerDamage: 0.6,
        skills: [
            {
                id: 'skill_poison_bite',
                name: '毒牙撕咬',
                description: '用毒牙攻击目标，造成持续毒伤',
                damage: 25,
                target: 'single',
                cooldown: 0,
                currentCooldown: 0,
            },
        ],
        rageSkill: {
            id: 'skill_toxic_explosion',
            name: '毒雾爆发',
            description: '释放剧毒雾气，对全体造成伤害并施加中毒',
            damage: 35,
            target: 'all',
            cooldown: 0,
            currentCooldown: 0,
            rageRequired: 80,
        },
        attackBoostPerRevive: 0,
    },
];
// 周本BOSS（需要4个组织8人击杀）
exports.WEEKLY_BOSSES = [
    {
        id: 'boss_abyssal_titan',
        name: '深渊泰坦',
        type: BossType.WEEKLY,
        description: '从地底深渊爬出的巨型凶兽，是毁灭地表文明的元凶之一',
        maxHealth: 3000,
        baseAttack: 40,
        defense: 25,
        maxRage: 150,
        ragePerDamage: 0.3,
        skills: [
            {
                id: 'skill_titan_slam',
                name: '泰坦重击',
                description: '用巨拳砸向一个组织的所有玩家',
                damage: 35,
                target: 'organization',
                cooldown: 0,
                currentCooldown: 0,
            },
            {
                id: 'skill_earthquake',
                name: '地震波',
                description: '引发地震，对所有玩家造成伤害',
                damage: 25,
                target: 'all',
                cooldown: 4,
                currentCooldown: 0,
            },
            {
                id: 'skill_focus_crush',
                name: '集中碾压',
                description: '锁定单个目标进行致命攻击',
                damage: 80,
                target: 'single',
                cooldown: 5,
                currentCooldown: 0,
            },
        ],
        rageSkill: {
            id: 'skill_apocalypse',
            name: '末日降临',
            description: '释放毁灭性能量，对全体玩家造成巨量伤害',
            damage: 100,
            target: 'all',
            cooldown: 0,
            currentCooldown: 0,
            rageRequired: 150,
        },
        attackBoostPerRevive: 5, // 每次复活增加5%攻击力
    },
    {
        id: 'boss_void_serpent',
        name: '虚空巨蟒',
        type: BossType.WEEKLY,
        description: '穿梭于虚空裂隙的恐怖存在，能吞噬一切生命',
        maxHealth: 2500,
        baseAttack: 50,
        defense: 15,
        maxRage: 120,
        ragePerDamage: 0.4,
        skills: [
            {
                id: 'skill_void_bite',
                name: '虚空噬咬',
                description: '瞬间吞噬一个组织的玩家',
                damage: 45,
                target: 'organization',
                cooldown: 0,
                currentCooldown: 0,
            },
            {
                id: 'skill_dimension_tear',
                name: '维度撕裂',
                description: '撕裂空间，对全体造成伤害',
                damage: 30,
                target: 'all',
                cooldown: 3,
                currentCooldown: 0,
            },
        ],
        rageSkill: {
            id: 'skill_void_devour',
            name: '虚空吞噬',
            description: '打开虚空之口，对全体玩家造成致命伤害',
            damage: 120,
            target: 'all',
            cooldown: 0,
            currentCooldown: 0,
            rageRequired: 120,
        },
        attackBoostPerRevive: 5,
    },
];
// 根据ID获取BOSS
function getBossById(bossId) {
    return [...exports.MINI_BOSSES, ...exports.WEEKLY_BOSSES].find(boss => boss.id === bossId);
}
// 创建BOSS战斗实例
function createBossInstance(bossTemplate) {
    return {
        id: bossTemplate.id,
        name: bossTemplate.name,
        type: bossTemplate.type,
        description: bossTemplate.description,
        maxHealth: bossTemplate.maxHealth,
        currentHealth: bossTemplate.maxHealth,
        baseAttack: bossTemplate.baseAttack,
        currentAttack: bossTemplate.baseAttack,
        defense: bossTemplate.defense,
        maxRage: bossTemplate.maxRage,
        currentRage: 0,
        ragePerDamage: bossTemplate.ragePerDamage,
        skills: bossTemplate.skills.map(skill => ({ ...skill, currentCooldown: 0 })),
        rageSkill: { ...bossTemplate.rageSkill, currentCooldown: 0 },
        state: BossState.IDLE,
        reviveCount: 0,
        attackBoostPerRevive: bossTemplate.attackBoostPerRevive,
        drops: bossTemplate.drops || [],
        targetOrganization: undefined,
    };
}
