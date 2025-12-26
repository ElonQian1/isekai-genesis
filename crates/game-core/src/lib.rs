//! # 🦀 game-core - 共享核心逻辑
//!
//! 模块前缀: `gc_` / `Gc`
//! 编译目标: WASM + Native (双端共享)
//! 文档: 文档/01-game-core.md
//!
//! ## 职责
//! - 定义游戏数据结构 (GcPlayer, GcCard, GcBattle)
//! - 实现游戏规则 (伤害计算、胜负判定)
//! - 验证游戏操作 (出牌合法性)
//!
//! ## 禁止
//! - 网络请求
//! - 文件读写
//! - 随机数生成 (由调用方提供)
//! - 任何 IO 操作

// 模块声明
mod gc_types;
mod gc_player;
mod gc_card;
mod gc_card_pool;
mod gc_battlefield;
mod gc_battle;
mod gc_effect;
mod gc_error;
mod gc_boss;
mod gc_organization;
mod gc_map;
mod gc_map_entity;
mod gc_map_player;
mod gc_map_templates;
mod gc_profession;
mod gc_talent;
mod gc_talent_templates;
mod gc_equipment;
mod gc_inventory;
mod gc_equipment_templates;
mod gc_card_templates;
mod gc_mcp;
mod gc_battle_terrain;
mod gc_monster;
mod gc_summon;
mod gc_turn;
mod gc_combat;

// 酒馆模式新增模块
mod gc_economy;
mod gc_level_system;
mod gc_merge;
mod gc_graveyard;
mod gc_tavern_shop;
mod gc_season;

// 公开导出
pub use gc_types::*;
pub use gc_player::*;
pub use gc_card::*;
pub use gc_card_pool::*;
pub use gc_battlefield::*;
pub use gc_battle::*;
pub use gc_effect::*;
pub use gc_error::*;
pub use gc_boss::*;
pub use gc_mcp::*;
pub use gc_equipment::*;
pub use gc_inventory::*;
pub use gc_equipment_templates::*;
pub use gc_card_templates::*;
pub use gc_organization::*;
pub use gc_map::*;
pub use gc_map_entity::*;
pub use gc_map_player::*;
pub use gc_map_templates::*;
pub use gc_profession::*;
pub use gc_talent::*;
pub use gc_talent_templates::*;
pub use gc_battle_terrain::*;
pub use gc_monster::*;
pub use gc_summon::*;
pub use gc_turn::*;
pub use gc_combat::*;

// 酒馆模式导出
pub use gc_economy::*;
pub use gc_level_system::*;
pub use gc_merge::*;
pub use gc_graveyard::*;
pub use gc_tavern_shop::*;
pub use gc_season::*;

