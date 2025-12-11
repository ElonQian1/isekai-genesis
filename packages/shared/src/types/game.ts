/**
 * 游戏房间和战斗类型定义
 */

import { GameMode, GameState, Organization } from './enums';
import { BattlePlayer } from './player';
import { Boss, BattleRound } from './boss';
import { CardInstance } from './card';

// 组织阵型（周本中每个组织2名玩家）
export interface OrganizationFormation {
  organization: Organization;
  players: BattlePlayer[];
  isAlive: boolean;         // 该组织是否还有存活玩家
  totalDamageDealt: number; // 该组织造成的总伤害
}

// 游戏房间
export interface GameRoom {
  id: string;
  name: string;
  mode: GameMode;
  state: GameState;
  
  // 房主
  hostId: string;
  
  // 玩家配置
  maxPlayers: number;
  minPlayers: number;
  
  // 周本模式：4个组织各2人
  formations: OrganizationFormation[];
  
  // 所有玩家（快速查找用）
  players: Map<string, BattlePlayer>;
  
  // 战斗数据
  battle?: BattleData;
  
  // 房间设置
  isPrivate: boolean;
  password?: string;
  
  // 时间戳
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
}

// 战斗数据
export interface BattleData {
  boss: Boss;
  
  // 回合管理
  currentRound: number;
  maxRounds: number;        // 最大回合数限制
  
  // 回合阶段
  phase: 'draw' | 'action' | 'boss_attack' | 'round_end';
  
  // 当前行动玩家（按速度排序）
  turnOrder: string[];      // 玩家ID列表
  currentTurnIndex: number;
  
  // 卡牌池
  drawPile: CardInstance[]; // 抽牌堆
  discardPile: CardInstance[]; // 弃牌堆
  
  // 嫁祸目标
  redirectTarget?: Organization;
  
  // 回合历史
  rounds: BattleRound[];
  
  // 战斗结果
  result?: BattleResult;
}

// 战斗结果
export interface BattleResult {
  isVictory: boolean;
  
  // 获胜组织（周本模式）
  winningOrganization?: Organization;
  
  // 战斗统计
  totalRounds: number;
  totalDamageDealt: number;
  bossReviveCount: number;
  
  // 玩家统计
  playerStats: PlayerBattleStats[];
  
  // 奖励
  rewards: BattleReward[];
}

// 玩家战斗统计
export interface PlayerBattleStats {
  playerId: string;
  playerName: string;
  organization: Organization;
  
  damageDealt: number;
  damageTaken: number;
  healingDone: number;
  cardsPlayed: number;
  
  isAlive: boolean;
  
  // MVP标记
  isMVP: boolean;
  mvpReason?: string;
}

// 战斗奖励
export interface BattleReward {
  playerId: string;
  
  // 基础奖励
  experience: number;
  gold: number;
  survivalPoints: number;
  
  // 额外奖励（MVP等）
  bonusExperience: number;
  bonusGold: number;
  
  // 掉落物品
  items: {
    itemId: string;
    itemName: string;
    quantity: number;
  }[];
}

// ==================== 房间配置 ====================

// 游戏模式配置
export const GAME_MODE_CONFIG: Record<GameMode, {
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  organizationsRequired: number;
  playersPerOrganization: number;
}> = {
  [GameMode.SOLO_EXPLORE]: {
    name: '个人探索',
    description: '独自探索野外区域，寻找资源和材料',
    minPlayers: 1,
    maxPlayers: 1,
    organizationsRequired: 1,
    playersPerOrganization: 1,
  },
  [GameMode.TEAM_EXPLORE]: {
    name: '组队探索',
    description: '与同组织成员一起探索，效率更高但危险也更大',
    minPlayers: 2,
    maxPlayers: 4,
    organizationsRequired: 1,
    playersPerOrganization: 4,
  },
  [GameMode.MINI_BOSS]: {
    name: '小型BOSS副本',
    description: '组队挑战小型凶兽首领，获取稀有装备',
    minPlayers: 2,
    maxPlayers: 4,
    organizationsRequired: 1,
    playersPerOrganization: 4,
  },
  [GameMode.WEEKLY_BOSS]: {
    name: '周本BOSS',
    description: '4个组织各派2名精英，共8人合力对抗强大凶兽。但胜利只属于最后存活的组织！',
    minPlayers: 8,
    maxPlayers: 8,
    organizationsRequired: 4,
    playersPerOrganization: 2,
  },
};

// 组织信息
export const ORGANIZATION_INFO: Record<Organization, {
  name: string;
  description: string;
  color: string;
  emblem: string;
}> = {
  [Organization.IRON_FORTRESS]: {
    name: '铁壁要塞',
    description: '以坚不可摧的防御工事闻名，成员多为经验丰富的战士和工匠',
    color: '#708090',  // 钢灰色
    emblem: '🛡️',
  },
  [Organization.SHADOW_COVENANT]: {
    name: '暗影盟约',
    description: '行踪神秘的组织，擅长情报收集和暗杀行动',
    color: '#4B0082',  // 靛青色
    emblem: '🗡️',
  },
  [Organization.FLAME_LEGION]: {
    name: '烈焰军团',
    description: '崇尚力量的战斗集团，以无畏的冲锋著称',
    color: '#DC143C',  // 猩红色
    emblem: '🔥',
  },
  [Organization.FROST_SANCTUARY]: {
    name: '霜寒圣所',
    description: '掌握古老知识的学者们建立的避难所，精通各种神秘技艺',
    color: '#00CED1',  // 深青色
    emblem: '❄️',
  },
};
