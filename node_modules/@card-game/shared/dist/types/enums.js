"use strict";
/**
 * 末日生存卡牌游戏 - 枚举定义
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Organization = exports.PlayerState = exports.GameState = exports.GameMode = exports.EquipmentRarity = exports.EquipmentSlot = exports.CardRarity = exports.CardType = exports.Talent = exports.Profession = void 0;
// 职业类型
var Profession;
(function (Profession) {
    Profession["KNIGHT"] = "knight";
    Profession["SWORDSMAN"] = "swordsman";
    Profession["SORCERER"] = "sorcerer";
    Profession["GUNNER"] = "gunner";
    Profession["ASSASSIN"] = "assassin";
})(Profession || (exports.Profession = Profession = {}));
// 天赋类型（每个职业的专属天赋）
var Talent;
(function (Talent) {
    // 骑士天赋 - 坚守壁垒
    Talent["IRON_BASTION"] = "iron_bastion";
    // 剑士天赋 - 剑意凝聚
    Talent["SWORD_SPIRIT"] = "sword_spirit";
    // 术士天赋 - 元素掌控
    Talent["ELEMENTAL_MASTERY"] = "elemental_mastery";
    // 枪手天赋 - 精准射击
    Talent["PRECISION_SHOT"] = "precision_shot";
    // 刺客天赋 - 暗影突袭
    Talent["SHADOW_STRIKE"] = "shadow_strike";
})(Talent || (exports.Talent = Talent = {}));
// 卡牌类型
var CardType;
(function (CardType) {
    CardType["ATTACK"] = "attack";
    CardType["DEFENSE"] = "defense";
    CardType["SKILL"] = "skill";
    CardType["SPECIAL"] = "special";
    CardType["REDIRECT"] = "redirect";
})(CardType || (exports.CardType = CardType = {}));
// 卡牌稀有度
var CardRarity;
(function (CardRarity) {
    CardRarity["COMMON"] = "common";
    CardRarity["RARE"] = "rare";
    CardRarity["EPIC"] = "epic";
    CardRarity["LEGENDARY"] = "legendary";
})(CardRarity || (exports.CardRarity = CardRarity = {}));
// 装备部位
var EquipmentSlot;
(function (EquipmentSlot) {
    EquipmentSlot["WEAPON"] = "weapon";
    EquipmentSlot["ARMOR"] = "armor";
    EquipmentSlot["HELMET"] = "helmet";
    EquipmentSlot["BOOTS"] = "boots";
    EquipmentSlot["ACCESSORY"] = "accessory";
})(EquipmentSlot || (exports.EquipmentSlot = EquipmentSlot = {}));
// 装备稀有度
var EquipmentRarity;
(function (EquipmentRarity) {
    EquipmentRarity["COMMON"] = "common";
    EquipmentRarity["UNCOMMON"] = "uncommon";
    EquipmentRarity["RARE"] = "rare";
    EquipmentRarity["EPIC"] = "epic";
    EquipmentRarity["LEGENDARY"] = "legendary";
})(EquipmentRarity || (exports.EquipmentRarity = EquipmentRarity = {}));
// 游戏模式
var GameMode;
(function (GameMode) {
    GameMode["SOLO_EXPLORE"] = "solo_explore";
    GameMode["TEAM_EXPLORE"] = "team_explore";
    GameMode["MINI_BOSS"] = "mini_boss";
    GameMode["WEEKLY_BOSS"] = "weekly_boss";
})(GameMode || (exports.GameMode = GameMode = {}));
// 游戏状态
var GameState;
(function (GameState) {
    GameState["WAITING"] = "waiting";
    GameState["STARTING"] = "starting";
    GameState["PLAYER_TURN"] = "player_turn";
    GameState["BOSS_TURN"] = "boss_turn";
    GameState["BOSS_RAGE"] = "boss_rage";
    GameState["BOSS_REVIVE"] = "boss_revive";
    GameState["BATTLE_END"] = "battle_end";
})(GameState || (exports.GameState = GameState = {}));
// 玩家状态
var PlayerState;
(function (PlayerState) {
    PlayerState["ALIVE"] = "alive";
    PlayerState["DEAD"] = "dead";
    PlayerState["DISCONNECTED"] = "disconnected";
})(PlayerState || (exports.PlayerState = PlayerState = {}));
// 组织阵营（地区生存组织）
var Organization;
(function (Organization) {
    Organization["IRON_FORTRESS"] = "iron_fortress";
    Organization["SHADOW_COVENANT"] = "shadow_covenant";
    Organization["FLAME_LEGION"] = "flame_legion";
    Organization["FROST_SANCTUARY"] = "frost_sanctuary";
})(Organization || (exports.Organization = Organization = {}));
