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
mod gc_battle;
mod gc_effect;
mod gc_error;

// 公开导出
pub use gc_types::*;
pub use gc_player::*;
pub use gc_card::*;
pub use gc_battle::*;
pub use gc_effect::*;
pub use gc_error::*;
