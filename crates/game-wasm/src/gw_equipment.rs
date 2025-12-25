//! 装备与背包系统 WASM 绑定
//!
//! 模块: game-wasm
//! 前缀: gw_ / Gw
//! 文档: 文档/02-game-wasm.md
//!
//! 暴露装备和背包系统给 JavaScript:
//! - 背包管理 (添加/移除)
//! - 装备操作 (穿戴/卸下)
//! - 装备生成 (工厂方法)

use wasm_bindgen::prelude::*;
use game_core::{
    GcInventory, GcEquipment, GcEquipmentSlot, GcProfessionType,
    GcEquipmentTemplates,
};
use serde::{Serialize, Deserialize};

// =============================================================================
// 背包管理器
// =============================================================================

#[wasm_bindgen]
pub struct GwInventoryManager {
    inner: GcInventory,
}

#[wasm_bindgen]
impl GwInventoryManager {
    #[wasm_bindgen(constructor)]
    pub fn new(player_id: String, capacity: usize) -> Self {
        Self {
            inner: GcInventory::gc_new(&player_id, capacity),
        }
    }

    /// 添加物品 (接收 JSON 格式的 GcEquipment)
    pub fn add_item(&mut self, item_json: JsValue) -> Result<(), JsValue> {
        let item: GcEquipment = serde_wasm_bindgen::from_value(item_json)?;
        self.inner.gc_add_item(item)
            .map_err(|e| JsValue::from_str(&e))
    }

    /// 从 JSON 加载完整背包数据
    pub fn load_from_json(&mut self, json_data: JsValue) -> Result<(), JsValue> {
        let inventory: GcInventory = serde_wasm_bindgen::from_value(json_data)?;
        self.inner = inventory;
        Ok(())
    }

    /// 移除物品
    pub fn remove_item(&mut self, item_id: &str) -> JsValue {
        match self.inner.gc_remove_item(item_id) {
            Some(item) => serde_wasm_bindgen::to_value(&item).unwrap_or(JsValue::NULL),
            None => JsValue::NULL,
        }
    }

    /// 装备物品
    pub fn equip_item(&mut self, item_id: &str, player_level: u32, profession_str: &str) -> Result<(), JsValue> {
        let profession = match profession_str {
            "Knight" => GcProfessionType::Knight,
            "Swordsman" => GcProfessionType::Swordsman,
            "Warlock" => GcProfessionType::Warlock,
            "Gunner" => GcProfessionType::Gunner,
            "Assassin" => GcProfessionType::Assassin,
            _ => return Err(JsValue::from_str("无效的职业类型")),
        };

        self.inner.gc_equip_item(item_id, player_level, profession)
            .map_err(|e| JsValue::from_str(&e))
    }

    /// 卸下装备
    pub fn unequip_item(&mut self, slot_str: &str) -> Result<(), JsValue> {
        let slot = match slot_str {
            "Weapon" => GcEquipmentSlot::Weapon,
            "Helmet" => GcEquipmentSlot::Helmet,
            "Armor" => GcEquipmentSlot::Armor,
            "Boots" => GcEquipmentSlot::Boots,
            "Accessory" => GcEquipmentSlot::Accessory,
            _ => return Err(JsValue::from_str("无效的装备部位")),
        };

        self.inner.gc_unequip_item(slot)
            .map_err(|e| JsValue::from_str(&e))
    }

    /// 获取背包数据 (JSON)
    pub fn get_inventory_json(&self) -> Result<JsValue, JsValue> {
        serde_wasm_bindgen::to_value(&self.inner)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// 获取总属性加成 (JSON: { base: ..., combat: ... })
    pub fn get_total_stats_json(&self) -> Result<JsValue, JsValue> {
        let (base, combat) = self.inner.gc_get_total_stats();
        
        #[derive(Serialize)]
        struct TotalStats {
            base: game_core::GcBaseStats,
            combat: game_core::GcCombatStats,
        }
        
        let stats = TotalStats { base, combat };
        serde_wasm_bindgen::to_value(&stats)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }
}

// =============================================================================
// 装备工厂
// =============================================================================

#[wasm_bindgen]
pub struct GwEquipmentFactory;

#[wasm_bindgen]
impl GwEquipmentFactory {
    /// 生成唯一 ID
    fn generate_id() -> String {
        // 简单的 ID 生成，实际项目中可能需要 UUID
        // 这里使用时间戳 + 随机数模拟
        let now = js_sys::Date::now() as u64;
        let rand = (js_sys::Math::random() * 1000.0) as u64;
        format!("item_{}_{}", now, rand)
    }

    pub fn create_wooden_sword() -> Result<JsValue, JsValue> {
        let mut item = GcEquipmentTemplates::wooden_sword();
        item.id = Self::generate_id();
        serde_wasm_bindgen::to_value(&item).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    pub fn create_iron_sword() -> Result<JsValue, JsValue> {
        let mut item = GcEquipmentTemplates::iron_sword();
        item.id = Self::generate_id();
        serde_wasm_bindgen::to_value(&item).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    pub fn create_apprentice_staff() -> Result<JsValue, JsValue> {
        let mut item = GcEquipmentTemplates::apprentice_staff();
        item.id = Self::generate_id();
        serde_wasm_bindgen::to_value(&item).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    pub fn create_cloth_armor() -> Result<JsValue, JsValue> {
        let mut item = GcEquipmentTemplates::cloth_armor();
        item.id = Self::generate_id();
        serde_wasm_bindgen::to_value(&item).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    pub fn create_leather_armor() -> Result<JsValue, JsValue> {
        let mut item = GcEquipmentTemplates::leather_armor();
        item.id = Self::generate_id();
        serde_wasm_bindgen::to_value(&item).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    pub fn create_iron_armor() -> Result<JsValue, JsValue> {
        let mut item = GcEquipmentTemplates::iron_armor();
        item.id = Self::generate_id();
        serde_wasm_bindgen::to_value(&item).map_err(|e| JsValue::from_str(&e.to_string()))
    }
}
