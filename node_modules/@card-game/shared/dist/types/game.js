"use strict";
/**
 * 游戏房间和战斗类型定义
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORGANIZATION_INFO = exports.GAME_MODE_CONFIG = void 0;
const enums_1 = require("./enums");
// ==================== 房间配置 ====================
// 游戏模式配置
exports.GAME_MODE_CONFIG = {
    [enums_1.GameMode.SOLO_EXPLORE]: {
        name: '个人探索',
        description: '独自探索野外区域，寻找资源和材料',
        minPlayers: 1,
        maxPlayers: 1,
        organizationsRequired: 1,
        playersPerOrganization: 1,
    },
    [enums_1.GameMode.TEAM_EXPLORE]: {
        name: '组队探索',
        description: '与同组织成员一起探索，效率更高但危险也更大',
        minPlayers: 2,
        maxPlayers: 4,
        organizationsRequired: 1,
        playersPerOrganization: 4,
    },
    [enums_1.GameMode.MINI_BOSS]: {
        name: '小型BOSS副本',
        description: '组队挑战小型凶兽首领，获取稀有装备',
        minPlayers: 2,
        maxPlayers: 4,
        organizationsRequired: 1,
        playersPerOrganization: 4,
    },
    [enums_1.GameMode.WEEKLY_BOSS]: {
        name: '周本BOSS',
        description: '4个组织各派2名精英，共8人合力对抗强大凶兽。但胜利只属于最后存活的组织！',
        minPlayers: 8,
        maxPlayers: 8,
        organizationsRequired: 4,
        playersPerOrganization: 2,
    },
};
// 组织信息
exports.ORGANIZATION_INFO = {
    [enums_1.Organization.IRON_FORTRESS]: {
        name: '铁壁要塞',
        description: '以坚不可摧的防御工事闻名，成员多为经验丰富的战士和工匠',
        color: '#708090', // 钢灰色
        emblem: '🛡️',
    },
    [enums_1.Organization.SHADOW_COVENANT]: {
        name: '暗影盟约',
        description: '行踪神秘的组织，擅长情报收集和暗杀行动',
        color: '#4B0082', // 靛青色
        emblem: '🗡️',
    },
    [enums_1.Organization.FLAME_LEGION]: {
        name: '烈焰军团',
        description: '崇尚力量的战斗集团，以无畏的冲锋著称',
        color: '#DC143C', // 猩红色
        emblem: '🔥',
    },
    [enums_1.Organization.FROST_SANCTUARY]: {
        name: '霜寒圣所',
        description: '掌握古老知识的学者们建立的避难所，精通各种神秘技艺',
        color: '#00CED1', // 深青色
        emblem: '❄️',
    },
};
