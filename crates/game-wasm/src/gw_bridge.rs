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

// =============================================================================
// 存档版本系统
// =============================================================================

use serde::{Deserialize, Serialize};

/// 版本检查结果 (JS端)
#[derive(Serialize, Deserialize)]
pub struct GwVersionCheckResult {
    /// 当前游戏版本
    pub current_version: String,
    /// 存档版本
    pub save_version: String,
    /// 是否兼容
    pub is_compatible: bool,
    /// 是否需要迁移
    pub needs_migration: bool,
    /// 是否需要重置
    pub needs_reset: bool,
}

/// 获取当前游戏版本
#[wasm_bindgen]
pub fn gw_get_current_version() -> String {
    GC_SAVE_VERSION.to_string()
}

/// 检查存档版本兼容性
/// 输入: 存档版本字符串如 "1.2.3"
/// 返回: { current_version, save_version, is_compatible, needs_migration, needs_reset }
#[wasm_bindgen]
pub fn gw_check_save_version(save_version_str: &str) -> JsValue {
    // 解析存档版本
    let parts: Vec<&str> = save_version_str.split('.').collect();
    let save_version = if parts.len() >= 3 {
        GcSaveVersion::new(
            parts[0].parse().unwrap_or(0),
            parts[1].parse().unwrap_or(0),
            parts[2].parse().unwrap_or(0),
        )
    } else {
        GcSaveVersion::new(1, 0, 0) // 默认旧版本
    };
    
    let current = GC_SAVE_VERSION;
    let result = GwVersionCheckResult {
        current_version: current.to_string(),
        save_version: save_version.to_string(),
        is_compatible: save_version.is_compatible_with(&current),
        needs_migration: save_version.needs_migration(&current),
        needs_reset: save_version.needs_reset(&current),
    };
    
    serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
}

/// 迁移存档数据 (简化版: 仅添加版本号)
/// 返回迁移后的 JSON 或错误信息
#[wasm_bindgen]
pub fn gw_migrate_save(save_json: &str) -> Result<String, JsValue> {
    // 解析 JSON
    let mut data: serde_json::Value = serde_json::from_str(save_json)
        .map_err(|e| JsValue::from_str(&format!("JSON解析错误: {}", e)))?;
    
    // 获取旧版本号
    let old_version = data.get("version")
        .and_then(|v| v.as_str())
        .unwrap_or("1.0.0")
        .to_string();
    
    // 解析旧版本
    let parts: Vec<&str> = old_version.split('.').collect();
    let old_ver = if parts.len() >= 3 {
        GcSaveVersion::new(
            parts[0].parse().unwrap_or(1),
            parts[1].parse().unwrap_or(0),
            parts[2].parse().unwrap_or(0),
        )
    } else {
        GcSaveVersion::new(1, 0, 0)
    };
    
    let current = GC_SAVE_VERSION;
    
    // 检查是否需要重置
    if old_ver.needs_reset(&current) {
        return Err(JsValue::from_str(&format!(
            "存档版本({})与当前版本({})不兼容，需要重置",
            old_ver, current
        )));
    }
    
    // 更新版本号
    if let Some(obj) = data.as_object_mut() {
        obj.insert("version".to_string(), serde_json::Value::String(current.to_string()));
    }
    
    // 返回迁移后的 JSON
    serde_json::to_string(&data)
        .map_err(|e| JsValue::from_str(&format!("JSON序列化错误: {}", e)))
}
