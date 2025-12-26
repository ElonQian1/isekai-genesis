//! 酒馆模式 WASM 绑定
//!
//! 提供酒馆商店、经济系统、合并系统的 JS 接口

use wasm_bindgen::prelude::*;
use game_core::*;
use serde::{Deserialize, Serialize};

// =============================================================================
// 经济系统绑定
// =============================================================================

/// 经济信息 (JS端)
#[derive(Serialize, Deserialize)]
pub struct GwEconomyInfo {
    pub gold: u32,
    pub level: u8,
    pub xp: u32,
    pub xp_to_next: u32,
    pub win_streak: u8,
    pub lose_streak: u8,
}

impl From<&GcEconomy> for GwEconomyInfo {
    fn from(e: &GcEconomy) -> Self {
        Self {
            gold: e.gold,
            level: e.level,
            xp: e.xp,
            xp_to_next: e.xp_to_next_level(),
            win_streak: e.win_streak,
            lose_streak: e.lose_streak,
        }
    }
}

/// 获取棋盘槽位数
#[wasm_bindgen]
pub fn gw_get_board_slots(level: u8) -> u8 {
    gc_get_board_slots(level)
}

/// 获取刷新商店费用
#[wasm_bindgen]
pub fn gw_get_refresh_cost() -> u32 {
    GC_REFRESH_COST
}

/// 获取购买经验费用
#[wasm_bindgen]
pub fn gw_get_xp_cost() -> u32 {
    GC_LEVEL_UP_COST
}

// =============================================================================
// 商店槽位信息
// =============================================================================

/// 商店怪兽信息 (JS端)
#[derive(Serialize, Deserialize)]
pub struct GwShopSlot {
    pub index: usize,
    pub monster: Option<GwTavernMonster>,
    pub frozen: bool,
}

/// 酒馆怪兽信息
#[derive(Serialize, Deserialize)]
pub struct GwTavernMonster {
    pub id: String,
    pub name: String,
    pub template_id: String,
    pub star: u8,
    pub golden_level: u8,
    pub atk: u32,
    pub def: u32,
    pub hp: u32,
    pub buy_price: u32,
    pub sell_price: u32,
}

impl From<&GcMonster> for GwTavernMonster {
    fn from(m: &GcMonster) -> Self {
        Self {
            id: m.id.clone(),
            name: m.name.clone(),
            template_id: m.template_id.clone(),
            star: m.star,
            golden_level: m.golden_level,
            atk: m.base_atk,
            def: m.base_def,
            hp: m.current_hp,
            buy_price: m.buy_price(),
            sell_price: m.sell_price(),
        }
    }
}

/// 获取商店信息
#[wasm_bindgen]
pub fn gw_get_shop_info(shop_json: &str) -> JsValue {
    let shop: Result<GcTavernShop, _> = serde_json::from_str(shop_json);
    match shop {
        Ok(s) => {
            let slots: Vec<GwShopSlot> = s.slots.iter().enumerate().map(|(i, opt)| {
                GwShopSlot {
                    index: i,
                    monster: opt.as_ref().map(GwTavernMonster::from),
                    frozen: s.frozen[i],
                }
            }).collect();
            serde_wasm_bindgen::to_value(&slots).unwrap_or(JsValue::NULL)
        }
        Err(_) => JsValue::NULL,
    }
}

// =============================================================================
// 游戏模式
// =============================================================================

/// 获取游戏模式名称
#[wasm_bindgen]
pub fn gw_game_mode_name(mode: u8) -> String {
    match mode {
        0 => "yugioh".to_string(),
        1 => "tavern".to_string(),
        _ => "unknown".to_string(),
    }
}

/// 获取酒馆阶段名称
#[wasm_bindgen]
pub fn gw_tavern_phase_name(phase: u8) -> String {
    match phase {
        0 => "shopping".to_string(),
        1 => "deploy".to_string(),
        2 => "combat".to_string(),
        3 => "result".to_string(),
        _ => "unknown".to_string(),
    }
}

// =============================================================================
// 商店操作
// =============================================================================

/// 操作结果
#[derive(Serialize, Deserialize)]
pub struct GwOperationResult {
    pub success: bool,
    pub error: Option<String>,
    pub data: Option<String>,
}

/// 刷新商店 (消耗2金币)
/// 输入: economy_json, shop_json, pool_json, random_rolls (10个随机数)
/// 返回: { success, error?, data: {economy, shop} }
#[wasm_bindgen]
pub fn gw_refresh_shop(
    economy_json: &str, 
    shop_json: &str, 
    pool_json: &str,
    random_rolls_json: &str,
) -> JsValue {
    let economy: Result<GcEconomy, _> = serde_json::from_str(economy_json);
    let shop: Result<GcTavernShop, _> = serde_json::from_str(shop_json);
    let pool: Result<GcMonsterPool, _> = serde_json::from_str(pool_json);
    let rolls: Result<Vec<u8>, _> = serde_json::from_str(random_rolls_json);
    
    match (economy, shop, pool, rolls) {
        (Ok(mut eco), Ok(mut s), Ok(p), Ok(r)) => {
            if !s.refresh(&mut eco, &p, &r) {
                let result = GwOperationResult {
                    success: false,
                    error: Some("金币不足".to_string()),
                    data: None,
                };
                return serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL);
            }
            
            let result_data = serde_json::json!({
                "economy": eco,
                "shop": s
            });
            
            let result = GwOperationResult {
                success: true,
                error: None,
                data: Some(result_data.to_string()),
            };
            serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
        }
        _ => {
            let result = GwOperationResult {
                success: false,
                error: Some("JSON 解析失败".to_string()),
                data: None,
            };
            serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
        }
    }
}

/// 冻结/解冻商店槽位
#[wasm_bindgen]
pub fn gw_toggle_freeze(shop_json: &str, slot_index: usize) -> JsValue {
    let shop: Result<GcTavernShop, _> = serde_json::from_str(shop_json);
    
    match shop {
        Ok(mut s) => {
            s.toggle_freeze(slot_index);
            let r = GwOperationResult {
                success: true,
                error: None,
                data: serde_json::to_string(&s).ok(),
            };
            serde_wasm_bindgen::to_value(&r).unwrap_or(JsValue::NULL)
        }
        Err(_) => {
            let r = GwOperationResult {
                success: false,
                error: Some("JSON 解析失败".to_string()),
                data: None,
            };
            serde_wasm_bindgen::to_value(&r).unwrap_or(JsValue::NULL)
        }
    }
}

// =============================================================================
// 购买/出售
// =============================================================================

/// 购买怪兽
/// 返回: { success, error?, data: {economy, shop, monster} }
#[wasm_bindgen]
pub fn gw_buy_monster(
    economy_json: &str,
    shop_json: &str,
    slot_index: usize,
) -> JsValue {
    let economy: Result<GcEconomy, _> = serde_json::from_str(economy_json);
    let shop: Result<GcTavernShop, _> = serde_json::from_str(shop_json);
    
    match (economy, shop) {
        (Ok(mut eco), Ok(mut s)) => {
            match s.buy(slot_index, &mut eco) {
                Some(monster) => {
                    let result_data = serde_json::json!({
                        "economy": eco,
                        "shop": s,
                        "monster": monster
                    });
                    let result = GwOperationResult {
                        success: true,
                        error: None,
                        data: Some(result_data.to_string()),
                    };
                    serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
                }
                None => {
                    let result = GwOperationResult {
                        success: false,
                        error: Some("购买失败: 槽位为空或金币不足".to_string()),
                        data: None,
                    };
                    serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
                }
            }
        }
        _ => {
            let result = GwOperationResult {
                success: false,
                error: Some("JSON 解析失败".to_string()),
                data: None,
            };
            serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
        }
    }
}

/// 出售怪兽
/// 返回: { success, error?, data: {economy} }
#[wasm_bindgen]
pub fn gw_sell_monster(economy_json: &str, monster_json: &str) -> JsValue {
    let economy: Result<GcEconomy, _> = serde_json::from_str(economy_json);
    let monster: Result<GcMonster, _> = serde_json::from_str(monster_json);
    
    match (economy, monster) {
        (Ok(mut eco), Ok(m)) => {
            let sell_price = m.sell_price();
            eco.earn(sell_price);
            
            let result_data = serde_json::json!({
                "economy": eco,
                "sell_price": sell_price
            });
            let result = GwOperationResult {
                success: true,
                error: None,
                data: Some(result_data.to_string()),
            };
            serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
        }
        _ => {
            let result = GwOperationResult {
                success: false,
                error: Some("JSON 解析失败".to_string()),
                data: None,
            };
            serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
        }
    }
}

// =============================================================================
// 经济操作
// =============================================================================

/// 购买经验 (4金 -> 4经验)
#[wasm_bindgen]
pub fn gw_buy_xp(economy_json: &str) -> JsValue {
    let economy: Result<GcEconomy, _> = serde_json::from_str(economy_json);
    
    match economy {
        Ok(mut eco) => {
            if eco.buy_xp() {
                let result = GwOperationResult {
                    success: true,
                    error: None,
                    data: serde_json::to_string(&eco).ok(),
                };
                serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
            } else {
                let result = GwOperationResult {
                    success: false,
                    error: Some("金币不足".to_string()),
                    data: None,
                };
                serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
            }
        }
        Err(_) => {
            let result = GwOperationResult {
                success: false,
                error: Some("JSON 解析失败".to_string()),
                data: None,
            };
            serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
        }
    }
}

/// 收取回合收入
#[wasm_bindgen]
pub fn gw_collect_income(economy_json: &str) -> JsValue {
    let economy: Result<GcEconomy, _> = serde_json::from_str(economy_json);
    
    match economy {
        Ok(mut eco) => {
            let income = eco.collect_income();
            let result_data = serde_json::json!({
                "economy": eco,
                "income": income
            });
            let result = GwOperationResult {
                success: true,
                error: None,
                data: Some(result_data.to_string()),
            };
            serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
        }
        Err(_) => {
            let result = GwOperationResult {
                success: false,
                error: Some("JSON 解析失败".to_string()),
                data: None,
            };
            serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
        }
    }
}

/// 获取经济信息
#[wasm_bindgen]
pub fn gw_get_economy_info(economy_json: &str) -> JsValue {
    let economy: Result<GcEconomy, _> = serde_json::from_str(economy_json);
    
    match economy {
        Ok(eco) => {
            let info = GwEconomyInfo::from(&eco);
            serde_wasm_bindgen::to_value(&info).unwrap_or(JsValue::NULL)
        }
        Err(_) => JsValue::NULL,
    }
}

// =============================================================================
// 合并系统
// =============================================================================

/// 可合并组信息
#[derive(Serialize, Deserialize)]
pub struct GwMergeGroup {
    pub template_id: String,
    pub star: u8,
    pub indices: Vec<usize>,
    pub source: String, // "board" 或 "bench"
}

/// 查找可合并的组
#[wasm_bindgen]
pub fn gw_find_mergeable(board_json: &str, bench_json: &str) -> JsValue {
    let board: Result<Vec<Option<GcMonster>>, _> = serde_json::from_str(board_json);
    let bench: Result<Vec<GcMonster>, _> = serde_json::from_str(bench_json);
    
    match (board, bench) {
        (Ok(b), Ok(be)) => {
            let groups = gc_find_mergeable_groups(&b, &be);
            serde_wasm_bindgen::to_value(&groups).unwrap_or(JsValue::NULL)
        }
        _ => JsValue::NULL,
    }
}

/// 执行自动合并一次
/// 返回: { success, merged?, board, bench }
#[wasm_bindgen]
pub fn gw_auto_merge_once(board_json: &str, bench_json: &str) -> JsValue {
    let board: Result<Vec<Option<GcMonster>>, _> = serde_json::from_str(board_json);
    let bench: Result<Vec<GcMonster>, _> = serde_json::from_str(bench_json);
    
    match (board, bench) {
        (Ok(mut b), Ok(mut be)) => {
            let merged = gc_auto_merge_once(&mut b, &mut be);
            let result_data = serde_json::json!({
                "merged": merged,
                "board": b,
                "bench": be
            });
            let result = GwOperationResult {
                success: true,
                error: None,
                data: Some(result_data.to_string()),
            };
            serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
        }
        _ => {
            let result = GwOperationResult {
                success: false,
                error: Some("JSON 解析失败".to_string()),
                data: None,
            };
            serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
        }
    }
}

/// 执行全部自动合并
/// 返回: { success, merge_count, board, bench }
#[wasm_bindgen]
pub fn gw_auto_merge_all(board_json: &str, bench_json: &str) -> JsValue {
    let board: Result<Vec<Option<GcMonster>>, _> = serde_json::from_str(board_json);
    let bench: Result<Vec<GcMonster>, _> = serde_json::from_str(bench_json);
    
    match (board, bench) {
        (Ok(mut b), Ok(mut be)) => {
            let count = gc_auto_merge_all(&mut b, &mut be);
            let result_data = serde_json::json!({
                "merge_count": count,
                "board": b,
                "bench": be
            });
            let result = GwOperationResult {
                success: true,
                error: None,
                data: Some(result_data.to_string()),
            };
            serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
        }
        _ => {
            let result = GwOperationResult {
                success: false,
                error: Some("JSON 解析失败".to_string()),
                data: None,
            };
            serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
        }
    }
}

// =============================================================================
// 部署/召回
// =============================================================================

/// 从手牌区部署到战场
/// 返回: { success, error?, data: {arena, bench} }
#[wasm_bindgen]
pub fn gw_deploy_from_bench(
    arena_json: &str,
    bench_json: &str,
    monster_id: &str,
    slot: u8,
) -> JsValue {
    let arena: Result<GcBattleArena, _> = serde_json::from_str(arena_json);
    let bench: Result<Vec<GcMonster>, _> = serde_json::from_str(bench_json);
    
    match (arena, bench) {
        (Ok(mut ar), Ok(mut be)) => {
            match ar.deploy_from_bench(&mut be, monster_id, slot) {
                Ok(()) => {
                    let result_data = serde_json::json!({
                        "arena": ar,
                        "bench": be
                    });
                    let result = GwOperationResult {
                        success: true,
                        error: None,
                        data: Some(result_data.to_string()),
                    };
                    serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
                }
                Err(e) => {
                    let result = GwOperationResult {
                        success: false,
                        error: Some(e),
                        data: None,
                    };
                    serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
                }
            }
        }
        _ => {
            let result = GwOperationResult {
                success: false,
                error: Some("JSON 解析失败".to_string()),
                data: None,
            };
            serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
        }
    }
}

/// 从战场召回到手牌区
/// 返回: { success, error?, data: {arena, bench, monster?} }
#[wasm_bindgen]
pub fn gw_recall_to_bench(
    arena_json: &str,
    bench_json: &str,
    slot: u8,
) -> JsValue {
    let arena: Result<GcBattleArena, _> = serde_json::from_str(arena_json);
    let bench: Result<Vec<GcMonster>, _> = serde_json::from_str(bench_json);
    
    match (arena, bench) {
        (Ok(mut ar), Ok(mut be)) => {
            let monster = ar.recall_to_bench(&mut be, slot);
            let result_data = serde_json::json!({
                "arena": ar,
                "bench": be,
                "monster": monster
            });
            let result = GwOperationResult {
                success: true,
                error: None,
                data: Some(result_data.to_string()),
            };
            serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
        }
        _ => {
            let result = GwOperationResult {
                success: false,
                error: Some("JSON 解析失败".to_string()),
                data: None,
            };
            serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
        }
    }
}

/// 战场内换位
#[wasm_bindgen]
pub fn gw_swap_positions(arena_json: &str, slot_a: u8, slot_b: u8) -> JsValue {
    let arena: Result<GcBattleArena, _> = serde_json::from_str(arena_json);
    
    match arena {
        Ok(mut ar) => {
            match ar.swap_positions(slot_a, slot_b) {
                Ok(()) => {
                    let result = GwOperationResult {
                        success: true,
                        error: None,
                        data: serde_json::to_string(&ar).ok(),
                    };
                    serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
                }
                Err(e) => {
                    let result = GwOperationResult {
                        success: false,
                        error: Some(e),
                        data: None,
                    };
                    serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
                }
            }
        }
        Err(_) => {
            let result = GwOperationResult {
                success: false,
                error: Some("JSON 解析失败".to_string()),
                data: None,
            };
            serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
        }
    }
}
