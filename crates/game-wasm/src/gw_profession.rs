//! 职业与天赋系统 WASM 绑定
//!
//! 模块: game-wasm
//! 前缀: gw_ / Gw
//! 文档: 文档/02-game-wasm.md
//!
//! 暴露职业和天赋系统给 JavaScript:
//! - 职业信息查询
//! - 天赋树查询
//! - 天赋升级
//! - 属性计算

use wasm_bindgen::prelude::*;
use game_core::{
    GcProfessionType, GcProfession, GcPlayerTalents,
    gc_create_knight_talent_tree, gc_create_swordsman_talent_tree,
    gc_create_warlock_talent_tree, gc_create_gunner_talent_tree,
    gc_create_assassin_talent_tree,
};
use serde::{Serialize, Deserialize};

use crate::gw_log;

// =============================================================================
// JS 友好类型
// =============================================================================

/// JS 友好的职业信息
#[derive(Serialize, Deserialize)]
pub struct GwProfessionInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub icon: String,
    pub primary_stat: String,
}

// =============================================================================
// 职业管理器
// =============================================================================

#[wasm_bindgen]
pub struct GwProfessionManager {
    // 这里可以存储一些全局状态，如果需要的话
}

#[wasm_bindgen]
impl GwProfessionManager {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {}
    }
    
    /// 获取所有职业列表
    #[wasm_bindgen]
    pub fn get_all_professions(&self) -> JsValue {
        let professions: Vec<GwProfessionInfo> = GcProfessionType::gc_all()
            .iter()
            .map(|p| GwProfessionInfo {
                id: p.gc_id().to_string(),
                name: p.gc_name().to_string(),
                description: p.gc_description().to_string(),
                icon: p.gc_icon().to_string(),
                primary_stat: p.gc_primary_stat().gc_name().to_string(),
            })
            .collect();
        
        serde_wasm_bindgen::to_value(&professions).unwrap()
    }
    
    /// 获取职业详情
    #[wasm_bindgen]
    pub fn get_profession_details(&self, profession_id: &str) -> JsValue {
        let profession_type = match profession_id {
            "knight" => GcProfessionType::Knight,
            "swordsman" => GcProfessionType::Swordsman,
            "warlock" => GcProfessionType::Warlock,
            "gunner" => GcProfessionType::Gunner,
            "assassin" => GcProfessionType::Assassin,
            _ => return JsValue::NULL,
        };
        
        let profession = GcProfession::gc_new(profession_type);
        serde_wasm_bindgen::to_value(&profession).unwrap()
    }
    
    /// 获取职业天赋树
    #[wasm_bindgen]
    pub fn get_talent_tree(&self, profession_id: &str) -> JsValue {
        let tree = match profession_id {
            "knight" => gc_create_knight_talent_tree(),
            "swordsman" => gc_create_swordsman_talent_tree(),
            "warlock" => gc_create_warlock_talent_tree(),
            "gunner" => gc_create_gunner_talent_tree(),
            "assassin" => gc_create_assassin_talent_tree(),
            _ => return JsValue::NULL,
        };
        
        serde_wasm_bindgen::to_value(&tree).unwrap()
    }
}

// =============================================================================
// 玩家天赋管理器
// =============================================================================

#[wasm_bindgen]
pub struct GwPlayerTalentManager {
    talents: GcPlayerTalents,
}

#[wasm_bindgen]
impl GwPlayerTalentManager {
    #[wasm_bindgen(constructor)]
    pub fn new(player_id: &str, profession_id: &str) -> Self {
        let mut talents = GcPlayerTalents::gc_new(player_id);
        
        // 初始化职业天赋树
        let tree = match profession_id {
            "knight" => gc_create_knight_talent_tree(),
            "swordsman" => gc_create_swordsman_talent_tree(),
            "warlock" => gc_create_warlock_talent_tree(),
            "gunner" => gc_create_gunner_talent_tree(),
            "assassin" => gc_create_assassin_talent_tree(),
            _ => gc_create_knight_talent_tree(), // 默认
        };
        
        talents.gc_add_tree(tree);
        
        Self { talents }
    }
    
    /// 添加天赋点 (调试用)
    #[wasm_bindgen]
    pub fn add_points(&mut self, points: u32) {
        self.talents.gc_add_points(points);
    }
    
    /// 获取当前状态
    #[wasm_bindgen]
    pub fn get_state(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.talents).unwrap()
    }
    
    /// 升级天赋
    #[wasm_bindgen]
    pub fn upgrade_talent(&mut self, tree_id: &str, talent_id: &str, player_level: u32) -> bool {
        match self.talents.gc_upgrade_talent(tree_id, talent_id, player_level) {
            Ok(_) => {
                gw_log(&format!("天赋升级成功: {}", talent_id));
                true
            }
            Err(e) => {
                gw_log(&format!("天赋升级失败: {}", e));
                false
            }
        }
    }
    
    /// 重置天赋
    #[wasm_bindgen]
    pub fn reset_talents(&mut self) {
        self.talents.gc_reset_all();
        gw_log("天赋已重置");
    }
}
