//! 类型桥接层
//!
//! 将 game-core 的类型包装成 WASM 友好的形式导出
//!
//! 模块: game-wasm
//! 前缀: Gw
//! 文档: 文档/02-game-wasm.md

use wasm_bindgen::prelude::*;
use game_core::*;
use crate::gw_utils::*;

// =============================================================================
// GwPlayer - 玩家包装
// =============================================================================

/// WASM 导出的玩家类型
#[wasm_bindgen]
pub struct GwPlayer {
    inner: GcPlayer,
}

#[wasm_bindgen]
impl GwPlayer {
    /// 创建新玩家
    #[wasm_bindgen(constructor)]
    pub fn new(id: &str, name: &str) -> Self {
        Self {
            inner: GcPlayer::gc_new(id.to_string(), name.to_string()),
        }
    }

    /// 获取玩家 ID
    #[wasm_bindgen(getter)]
    pub fn id(&self) -> String {
        self.inner.id.clone()
    }

    /// 获取玩家名称
    #[wasm_bindgen(getter)]
    pub fn name(&self) -> String {
        self.inner.name.clone()
    }

    /// 获取当前生命值
    #[wasm_bindgen(getter)]
    pub fn hp(&self) -> u32 {
        self.inner.stats.hp
    }

    /// 获取最大生命值
    #[wasm_bindgen(getter)]
    pub fn max_hp(&self) -> u32 {
        self.inner.stats.max_hp
    }

    /// 获取当前能量
    #[wasm_bindgen(getter)]
    pub fn energy(&self) -> u32 {
        self.inner.stats.energy
    }

    /// 获取最大能量
    #[wasm_bindgen(getter)]
    pub fn max_energy(&self) -> u32 {
        self.inner.stats.max_energy
    }

    /// 获取攻击力
    #[wasm_bindgen(getter)]
    pub fn attack(&self) -> u32 {
        self.inner.stats.attack
    }

    /// 获取防御力
    #[wasm_bindgen(getter)]
    pub fn defense(&self) -> u32 {
        self.inner.stats.defense
    }

    /// 是否存活
    #[wasm_bindgen(getter)]
    pub fn is_alive(&self) -> bool {
        self.inner.stats.gc_is_alive()
    }

    /// 获取手牌数量
    #[wasm_bindgen(getter)]
    pub fn hand_size(&self) -> usize {
        self.inner.hand.len()
    }

    /// 获取牌库数量
    #[wasm_bindgen(getter)]
    pub fn deck_size(&self) -> usize {
        self.inner.deck.len()
    }

    /// 是否可以行动
    pub fn can_act(&self) -> bool {
        self.inner.gc_can_act()
    }

    /// 导出为 JSON
    pub fn to_json(&self) -> Result<String, JsValue> {
        gw_to_json(&self.inner)
    }

    /// 导出为 JS 对象
    pub fn to_js(&self) -> Result<JsValue, JsValue> {
        gw_to_js_value(&self.inner)
    }
}

// 内部方法 (不导出到 WASM)
impl GwPlayer {
    pub fn inner(&self) -> &GcPlayer {
        &self.inner
    }

    pub fn inner_mut(&mut self) -> &mut GcPlayer {
        &mut self.inner
    }
}

// =============================================================================
// GwCard - 卡牌包装
// =============================================================================

/// WASM 导出的卡牌类型
#[wasm_bindgen]
pub struct GwCard {
    inner: GcCard,
}

#[wasm_bindgen]
impl GwCard {
    /// 创建攻击卡
    pub fn new_attack(id: &str, name: &str, cost: u32, damage: u32) -> Self {
        Self {
            inner: GcCard::gc_new_attack(id.to_string(), name.to_string(), cost, damage),
        }
    }

    /// 创建防御卡
    pub fn new_defense(id: &str, name: &str, cost: u32, shield: u32) -> Self {
        Self {
            inner: GcCard::gc_new_defense(id.to_string(), name.to_string(), cost, shield),
        }
    }

    /// 获取卡牌 ID
    #[wasm_bindgen(getter)]
    pub fn id(&self) -> String {
        self.inner.id.clone()
    }

    /// 获取卡牌名称
    #[wasm_bindgen(getter)]
    pub fn name(&self) -> String {
        self.inner.name.clone()
    }

    /// 获取费用
    #[wasm_bindgen(getter)]
    pub fn cost(&self) -> u32 {
        self.inner.cost
    }

    /// 是否需要目标
    pub fn needs_target(&self) -> bool {
        self.inner.gc_needs_target()
    }

    /// 导出为 JSON
    pub fn to_json(&self) -> Result<String, JsValue> {
        gw_to_json(&self.inner)
    }

    /// 导出为 JS 对象
    pub fn to_js(&self) -> Result<JsValue, JsValue> {
        gw_to_js_value(&self.inner)
    }
}

impl GwCard {
    pub fn inner(&self) -> &GcCard {
        &self.inner
    }
    
    pub fn from_inner(inner: GcCard) -> Self {
        Self { inner }
    }
}

impl GwPlayer {
    pub fn from_inner(inner: GcPlayer) -> Self {
        Self { inner }
    }
}

// =============================================================================
// 工厂函数
// =============================================================================

/// 从 JSON 创建玩家
#[wasm_bindgen]
pub fn gw_player_from_json(json: &str) -> Result<GwPlayer, JsValue> {
    let inner: GcPlayer = gw_from_json(json)?;
    Ok(GwPlayer { inner })
}

/// 从 JSON 创建卡牌
#[wasm_bindgen]
pub fn gw_card_from_json(json: &str) -> Result<GwCard, JsValue> {
    let inner: GcCard = gw_from_json(json)?;
    Ok(GwCard { inner })
}
