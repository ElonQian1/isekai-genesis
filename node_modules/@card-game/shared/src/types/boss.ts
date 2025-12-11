/**
 * BOSS系统类型定义
 */

import { Organization } from './enums';

// BOSS类型
export enum BossType {
  MINI = 'mini',           // 小型BOSS（组队副本）
  WEEKLY = 'weekly',       // 周本BOSS（8人团队）
  WORLD = 'world',         // 世界BOSS
}

// BOSS状态
export enum BossState {
  IDLE = 'idle',           // 待机
  ATTACKING = 'attacking', // 攻击中
  CHARGING = 'charging',   // 蓄力中
  ENRAGED = 'enraged',     // 狂怒状态
  STUNNED = 'stunned',     // 眩晕
  DEAD = 'dead',           // 死亡
}

// BOSS技能
export interface BossSkill {
  id: string;
  name: string;
  description: string;
  damage: number;
  target: 'single' | 'organization' | 'all';  // 单体/组织/全体
  cooldown: number;
  currentCooldown: number;
  rageRequired?: number;   // 怒气需求（全屏技能）
}

// BOSS定义
export interface Boss {
  id: string;
  name: string;
  type: BossType;
  description: string;
  
  // 属性
  maxHealth: number;
  currentHealth: number;
  baseAttack: number;
  currentAttack: number;   // 当前攻击力（会因复活增加）
  defense: number;
  
  // 怒气系统
  maxRage: number;         // 最大怒气值
  currentRage: number;     // 当前怒气值
  ragePerDamage: number;   // 每点伤害增加的怒气
  
  // 技能
  skills: BossSkill[];
  rageSkill: BossSkill;    // 怒气满时释放的全屏技能
  
  // 状态
  state: BossState;
  
  // 复活机制（周本专用）
  reviveCount: number;     // 已复活次数
  attackBoostPerRevive: number;  // 每次复活增加的攻击力百分比
  
  // 目标选择
  targetOrganization?: Organization;  // 被嫁祸后优先攻击的组织
  
  // 掉落
  drops: BossDrop[];
  
  // 外观
  imageUrl?: string;
}

// BOSS掉落物
export interface BossDrop {
  itemId: string;
  itemName: string;
  dropRate: number;        // 掉落概率 (0-100)
  minQuantity: number;
  maxQuantity: number;
}

// 战斗回合数据
export interface BattleRound {
  roundNumber: number;
  phase: 'player' | 'boss';
  
  // 玩家行动记录
  playerActions: PlayerAction[];
  
  // BOSS行动记录
  bossAction?: BossAction;
  
  // 回合结束时的状态
  bossHealthAfter: number;
  bossRageAfter: number;
  aliveOrganizations: Organization[];
}

// 玩家行动
export interface PlayerAction {
  playerId: string;
  playerName: string;
  organization: Organization;
  cardId: string;
  cardName: string;
  damage: number;
  isCritical: boolean;
  targetType: 'boss' | 'self' | 'ally' | 'organization';
  targetId?: string;
  effects: string[];       // 效果描述列表
}

// BOSS行动
export interface BossAction {
  skillId: string;
  skillName: string;
  targetType: 'single' | 'organization' | 'all';
  targetOrganization?: Organization;
  targetPlayerId?: string;
  damage: number;
  isRageSkill: boolean;
  effects: string[];
}

// ==================== 预定义BOSS ====================

// 小型BOSS
export const MINI_BOSSES: Partial<Boss>[] = [
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
    attackBoostPerRevive: 0,  // 小型BOSS不复活
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
export const WEEKLY_BOSSES: Partial<Boss>[] = [
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
    attackBoostPerRevive: 5,  // 每次复活增加5%攻击力
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
export function getBossById(bossId: string): Partial<Boss> | undefined {
  return [...MINI_BOSSES, ...WEEKLY_BOSSES].find(boss => boss.id === bossId);
}

// 创建BOSS战斗实例
export function createBossInstance(bossTemplate: Partial<Boss>): Boss {
  return {
    id: bossTemplate.id!,
    name: bossTemplate.name!,
    type: bossTemplate.type!,
    description: bossTemplate.description!,
    maxHealth: bossTemplate.maxHealth!,
    currentHealth: bossTemplate.maxHealth!,
    baseAttack: bossTemplate.baseAttack!,
    currentAttack: bossTemplate.baseAttack!,
    defense: bossTemplate.defense!,
    maxRage: bossTemplate.maxRage!,
    currentRage: 0,
    ragePerDamage: bossTemplate.ragePerDamage!,
    skills: bossTemplate.skills!.map(skill => ({ ...skill, currentCooldown: 0 })),
    rageSkill: { ...bossTemplate.rageSkill!, currentCooldown: 0 },
    state: BossState.IDLE,
    reviveCount: 0,
    attackBoostPerRevive: bossTemplate.attackBoostPerRevive!,
    drops: bossTemplate.drops || [],
    targetOrganization: undefined,
  };
}
