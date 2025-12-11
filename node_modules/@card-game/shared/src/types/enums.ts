/**
 * 末日生存卡牌游戏 - 枚举定义
 */

// 职业类型
export enum Profession {
  KNIGHT = 'knight',      // 骑士 - 坦克型，高防御
  SWORDSMAN = 'swordsman', // 剑士 - 近战输出
  SORCERER = 'sorcerer',   // 术士 - 魔法输出
  GUNNER = 'gunner',       // 枪手 - 远程输出
  ASSASSIN = 'assassin',   // 刺客 - 爆发输出
}

// 天赋类型（每个职业的专属天赋）
export enum Talent {
  // 骑士天赋 - 坚守壁垒
  IRON_BASTION = 'iron_bastion',
  // 剑士天赋 - 剑意凝聚
  SWORD_SPIRIT = 'sword_spirit',
  // 术士天赋 - 元素掌控
  ELEMENTAL_MASTERY = 'elemental_mastery',
  // 枪手天赋 - 精准射击
  PRECISION_SHOT = 'precision_shot',
  // 刺客天赋 - 暗影突袭
  SHADOW_STRIKE = 'shadow_strike',
}

// 卡牌类型
export enum CardType {
  ATTACK = 'attack',       // 攻击牌
  DEFENSE = 'defense',     // 防御牌
  SKILL = 'skill',         // 技能牌
  SPECIAL = 'special',     // 特殊牌
  REDIRECT = 'redirect',   // 嫁祸牌（让BOSS攻击指定组织）
}

// 卡牌稀有度
export enum CardRarity {
  COMMON = 'common',       // 普通
  RARE = 'rare',           // 稀有
  EPIC = 'epic',           // 史诗
  LEGENDARY = 'legendary', // 传说
}

// 装备部位
export enum EquipmentSlot {
  WEAPON = 'weapon',       // 武器
  ARMOR = 'armor',         // 护甲
  HELMET = 'helmet',       // 头盔
  BOOTS = 'boots',         // 靴子
  ACCESSORY = 'accessory', // 饰品
}

// 装备稀有度
export enum EquipmentRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

// 游戏模式
export enum GameMode {
  SOLO_EXPLORE = 'solo_explore',     // 个人探索
  TEAM_EXPLORE = 'team_explore',     // 组队探索
  MINI_BOSS = 'mini_boss',           // 小型BOSS副本
  WEEKLY_BOSS = 'weekly_boss',       // 周本BOSS（4组织8人）
}

// 游戏状态
export enum GameState {
  WAITING = 'waiting',               // 等待玩家
  STARTING = 'starting',             // 游戏开始
  PLAYER_TURN = 'player_turn',       // 玩家回合
  BOSS_TURN = 'boss_turn',           // BOSS回合
  BOSS_RAGE = 'boss_rage',           // BOSS狂怒（全屏技能）
  BOSS_REVIVE = 'boss_revive',       // BOSS复活
  BATTLE_END = 'battle_end',         // 战斗结束
}

// 玩家状态
export enum PlayerState {
  ALIVE = 'alive',
  DEAD = 'dead',
  DISCONNECTED = 'disconnected',
}

// 组织阵营（地区生存组织）
export enum Organization {
  IRON_FORTRESS = 'iron_fortress',       // 铁壁要塞
  SHADOW_COVENANT = 'shadow_covenant',   // 暗影盟约
  FLAME_LEGION = 'flame_legion',         // 烈焰军团
  FROST_SANCTUARY = 'frost_sanctuary',   // 霜寒圣所
}
