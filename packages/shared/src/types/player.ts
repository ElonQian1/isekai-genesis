/**
 * 玩家相关类型定义
 */

import { Profession, Talent, PlayerState, Organization, EquipmentSlot, EquipmentRarity } from './enums';

// 装备属性
export interface Equipment {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: EquipmentRarity;
  level: number;
  stats: {
    attack?: number;
    defense?: number;
    health?: number;
    critRate?: number;      // 暴击率
    critDamage?: number;    // 暴击伤害
    speed?: number;         // 速度
  };
  description: string;
}

// 玩家属性
export interface PlayerStats {
  maxHealth: number;        // 最大生命值
  currentHealth: number;    // 当前生命值
  attack: number;           // 攻击力
  defense: number;          // 防御力
  speed: number;            // 速度（决定出牌顺序）
  critRate: number;         // 暴击率 (0-100)
  critDamage: number;       // 暴击伤害倍率 (默认1.5)
}

// 玩家经验和等级
export interface PlayerProgression {
  level: number;
  experience: number;
  experienceToNextLevel: number;
  totalExperience: number;
}

// 天赋数据
export interface TalentData {
  type: Talent;
  name: string;
  description: string;
  level: number;            // 天赋等级
  cooldown: number;         // 冷却回合数
  currentCooldown: number;  // 当前冷却
}

// 玩家基础信息
export interface Player {
  id: string;
  odAccountId: string;      // 关联的账号ID
  username: string;
  
  // 职业和天赋
  profession: Profession;
  talent: TalentData;
  
  // 所属组织
  organization: Organization;
  
  // 属性
  stats: PlayerStats;
  baseStats: PlayerStats;   // 基础属性（不含装备加成）
  
  // 成长
  progression: PlayerProgression;
  
  // 装备
  equipment: Partial<Record<EquipmentSlot, Equipment>>;
  
  // 状态
  state: PlayerState;
  
  // 资源
  gold: number;             // 金币
  survivalPoints: number;   // 生存点数（特殊货币）
  
  // 统计
  statistics: PlayerStatistics;
  
  createdAt: Date;
  lastLoginAt: Date;
}

// 玩家统计数据
export interface PlayerStatistics {
  totalBattles: number;
  wins: number;
  losses: number;
  bossKills: number;
  weeklyBossKills: number;
  playerKills: number;      // PVP击杀
  deaths: number;
  damageDealt: number;
  damageTaken: number;
  healingDone: number;
}

// 战斗中的玩家状态
export interface BattlePlayer {
  playerId: string;
  username: string;
  profession: Profession;
  talent: TalentData;
  organization: Organization;
  
  // 战斗属性
  maxHealth: number;
  currentHealth: number;
  attack: number;
  defense: number;
  speed: number;
  
  // 状态
  state: PlayerState;
  isReady: boolean;
  
  // 手牌
  handCards: string[];      // 手牌ID列表
  maxHandSize: number;
  
  // Buff/Debuff
  buffs: Buff[];
  debuffs: Debuff[];
  
  // 本回合数据
  turnData: {
    hasActed: boolean;
    cardsPlayed: number;
    damageDealt: number;
    damageTaken: number;
  };
}

// Buff效果
export interface Buff {
  id: string;
  name: string;
  type: 'attack' | 'defense' | 'speed' | 'heal' | 'shield';
  value: number;
  duration: number;         // 剩余回合数
  stackable: boolean;
  stacks: number;
}

// Debuff效果
export interface Debuff {
  id: string;
  name: string;
  type: 'poison' | 'burn' | 'slow' | 'weaken' | 'vulnerable';
  value: number;
  duration: number;
  stackable: boolean;
  stacks: number;
}

// 职业基础属性配置
export const PROFESSION_BASE_STATS: Record<Profession, PlayerStats> = {
  [Profession.KNIGHT]: {
    maxHealth: 150,
    currentHealth: 150,
    attack: 20,
    defense: 30,
    speed: 10,
    critRate: 5,
    critDamage: 1.5,
  },
  [Profession.SWORDSMAN]: {
    maxHealth: 120,
    currentHealth: 120,
    attack: 35,
    defense: 20,
    speed: 20,
    critRate: 15,
    critDamage: 1.8,
  },
  [Profession.SORCERER]: {
    maxHealth: 80,
    currentHealth: 80,
    attack: 45,
    defense: 10,
    speed: 15,
    critRate: 20,
    critDamage: 2.0,
  },
  [Profession.GUNNER]: {
    maxHealth: 90,
    currentHealth: 90,
    attack: 40,
    defense: 15,
    speed: 25,
    critRate: 25,
    critDamage: 1.7,
  },
  [Profession.ASSASSIN]: {
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
export const PROFESSION_TALENTS: Record<Profession, TalentData> = {
  [Profession.KNIGHT]: {
    type: Talent.IRON_BASTION,
    name: '坚守壁垒',
    description: '激活后，本回合内为全队提供护盾，吸收等同于骑士防御力50%的伤害',
    level: 1,
    cooldown: 3,
    currentCooldown: 0,
  },
  [Profession.SWORDSMAN]: {
    type: Talent.SWORD_SPIRIT,
    name: '剑意凝聚',
    description: '激活后，下一次攻击造成双倍伤害，并有50%概率使目标流血',
    level: 1,
    cooldown: 2,
    currentCooldown: 0,
  },
  [Profession.SORCERER]: {
    type: Talent.ELEMENTAL_MASTERY,
    name: '元素掌控',
    description: '激活后，本回合所有技能牌效果提升100%，且消耗减半',
    level: 1,
    cooldown: 4,
    currentCooldown: 0,
  },
  [Profession.GUNNER]: {
    type: Talent.PRECISION_SHOT,
    name: '精准射击',
    description: '激活后，下三次攻击必定暴击，且无视30%防御',
    level: 1,
    cooldown: 3,
    currentCooldown: 0,
  },
  [Profession.ASSASSIN]: {
    type: Talent.SHADOW_STRIKE,
    name: '暗影突袭',
    description: '激活后，进入隐身状态，下一次攻击造成300%伤害并使目标眩晕1回合',
    level: 1,
    cooldown: 4,
    currentCooldown: 0,
  },
};
