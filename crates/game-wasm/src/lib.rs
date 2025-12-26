//! Game WASM 绑定层
//!
//! 这个模块将 game-core 的 Rust 逻辑暴露给 JavaScript/TypeScript。
//! 使用 wasm-bindgen 进行 JS/Rust 互操作。
//!
//! 文档: 文档/02-game-wasm.md
//! 前缀: gw_ (函数) / Gw (类型)

mod gw_bridge;
mod gw_battle;
mod gw_boss;
mod gw_utils;
mod gw_map;
mod gw_profession;
mod gw_equipment;
mod gw_terrain;
mod gw_monster;
mod gw_tavern;

pub use gw_bridge::*;
pub use gw_battle::*;
pub use gw_boss::*;
pub use gw_utils::*;
pub use gw_map::*;
pub use gw_profession::*;
pub use gw_equipment::*;
pub use gw_terrain::*;
pub use gw_monster::*;
pub use gw_tavern::*;

use wasm_bindgen::prelude::*;

/// 初始化 WASM 模块
/// 在 JS 端首次加载时调用
#[wasm_bindgen(start)]
pub fn gw_init() {
    // 设置 panic hook，让 Rust panic 在浏览器 console 显示
    console_error_panic_hook::set_once();
    
    gw_log("🎮 Game WASM 模块已加载");
}

/// 获取 WASM 模块版本
#[wasm_bindgen]
pub fn gw_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// 健康检查
#[wasm_bindgen]
pub fn gw_health_check() -> bool {
    true
}
