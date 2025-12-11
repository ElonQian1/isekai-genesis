/**
 * 末日生存卡牌游戏 - 枚举定义
 */
export declare enum Profession {
    KNIGHT = "knight",// 骑士 - 坦克型，高防御
    SWORDSMAN = "swordsman",// 剑士 - 近战输出
    SORCERER = "sorcerer",// 术士 - 魔法输出
    GUNNER = "gunner",// 枪手 - 远程输出
    ASSASSIN = "assassin"
}
export declare enum Talent {
    IRON_BASTION = "iron_bastion",
    SWORD_SPIRIT = "sword_spirit",
    ELEMENTAL_MASTERY = "elemental_mastery",
    PRECISION_SHOT = "precision_shot",
    SHADOW_STRIKE = "shadow_strike"
}
export declare enum CardType {
    ATTACK = "attack",// 攻击牌
    DEFENSE = "defense",// 防御牌
    SKILL = "skill",// 技能牌
    SPECIAL = "special",// 特殊牌
    REDIRECT = "redirect"
}
export declare enum CardRarity {
    COMMON = "common",// 普通
    RARE = "rare",// 稀有
    EPIC = "epic",// 史诗
    LEGENDARY = "legendary"
}
export declare enum EquipmentSlot {
    WEAPON = "weapon",// 武器
    ARMOR = "armor",// 护甲
    HELMET = "helmet",// 头盔
    BOOTS = "boots",// 靴子
    ACCESSORY = "accessory"
}
export declare enum EquipmentRarity {
    COMMON = "common",
    UNCOMMON = "uncommon",
    RARE = "rare",
    EPIC = "epic",
    LEGENDARY = "legendary"
}
export declare enum GameMode {
    SOLO_EXPLORE = "solo_explore",// 个人探索
    TEAM_EXPLORE = "team_explore",// 组队探索
    MINI_BOSS = "mini_boss",// 小型BOSS副本
    WEEKLY_BOSS = "weekly_boss"
}
export declare enum GameState {
    WAITING = "waiting",// 等待玩家
    STARTING = "starting",// 游戏开始
    PLAYER_TURN = "player_turn",// 玩家回合
    BOSS_TURN = "boss_turn",// BOSS回合
    BOSS_RAGE = "boss_rage",// BOSS狂怒（全屏技能）
    BOSS_REVIVE = "boss_revive",// BOSS复活
    BATTLE_END = "battle_end"
}
export declare enum PlayerState {
    ALIVE = "alive",
    DEAD = "dead",
    DISCONNECTED = "disconnected"
}
export declare enum Organization {
    IRON_FORTRESS = "iron_fortress",// 铁壁要塞
    SHADOW_COVENANT = "shadow_covenant",// 暗影盟约
    FLAME_LEGION = "flame_legion",// 烈焰军团
    FROST_SANCTUARY = "frost_sanctuary"
}
