//! 怪兽合成升星系统
//!
//! 模块: game-core
//! 前缀: Gc
//!
//! ## 合成规则
//! - 3 个相同 template_id + 相同 star + 相同 golden_level 可合成
//! - 1★×3 → 2★ (属性×2)
//! - 2★×3 → 3★ (属性×3)
//! - 3★×3 → 金色Lv1 (属性×4.5)
//! - 金色LvN×3 → 金色Lv(N+1)
//!
//! ## 合成优先级
//! 战场从左到右 (slot 0→4) > 手牌区从左到右
//!
//! ## 合成结果位置
//! - 3只都在战场 → 留在最左槽位
//! - 混合(战场+手牌) → 留在战场槽位
//! - 3只都在手牌 → 留在手牌区

use serde::{Deserialize, Serialize};
use crate::GcMonster;

// =============================================================================
// 合成结果
// =============================================================================

/// 合成结果
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcMergeResult {
    /// 合成是否成功
    pub success: bool,
    /// 合成后的怪兽
    pub merged_monster: Option<GcMonster>,
    /// 被消耗的怪兽ID列表
    pub consumed_ids: Vec<String>,
    /// 结果位置 (Some(slot) = 战场槽位, None = 手牌区)
    pub result_location: Option<u8>,
    /// 合成前星级
    pub from_star: u8,
    /// 合成后星级
    pub to_star: u8,
    /// 合成前金色等级
    pub from_golden: u8,
    /// 合成后金色等级
    pub to_golden: u8,
}

impl GcMergeResult {
    /// 创建失败结果
    pub fn failed() -> Self {
        Self {
            success: false,
            merged_monster: None,
            consumed_ids: vec![],
            result_location: None,
            from_star: 0,
            to_star: 0,
            from_golden: 0,
            to_golden: 0,
        }
    }
}

/// 可合成的怪兽组
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcMergeableGroup {
    /// 模板ID
    pub template_id: String,
    /// 星级
    pub star: u8,
    /// 金色等级
    pub golden_level: u8,
    /// 怪兽索引列表 (在各自容器中的位置)
    /// 格式: (location, index) - location: 0=战场, 1=手牌
    pub monster_indices: Vec<(u8, usize)>,
    /// 怪兽ID列表
    pub monster_ids: Vec<String>,
}

// =============================================================================
// 合成检查函数
// =============================================================================

/// 检查两个怪兽是否可以一起合成
pub fn gc_can_merge_pair(a: &GcMonster, b: &GcMonster) -> bool {
    a.template_id == b.template_id 
        && a.star == b.star 
        && a.golden_level == b.golden_level
}

/// 检查三个怪兽是否可以合成
pub fn gc_can_merge_triple(a: &GcMonster, b: &GcMonster, c: &GcMonster) -> bool {
    gc_can_merge_pair(a, b) && gc_can_merge_pair(b, c)
}

/// 从怪兽列表中查找所有可合成的组
/// 
/// # 参数
/// - `board`: 战场怪兽 (优先级更高)
/// - `bench`: 手牌区怪兽
/// 
/// # 返回
/// 按优先级排序的可合成组列表
pub fn gc_find_mergeable_groups(
    board: &[Option<GcMonster>],
    bench: &[GcMonster],
) -> Vec<GcMergeableGroup> {
    use std::collections::HashMap;
    
    // 按 (template_id, star, golden_level) 分组
    // value: Vec<(location, index, monster_id)>
    let mut groups: HashMap<(String, u8, u8), Vec<(u8, usize, String)>> = HashMap::new();
    
    // 收集战场怪兽 (location = 0, 优先级高)
    for (slot, opt_monster) in board.iter().enumerate() {
        if let Some(monster) = opt_monster {
            let key = (monster.template_id.clone(), monster.star, monster.golden_level);
            groups.entry(key).or_default().push((0, slot, monster.id.clone()));
        }
    }
    
    // 收集手牌区怪兽 (location = 1)
    for (idx, monster) in bench.iter().enumerate() {
        let key = (monster.template_id.clone(), monster.star, monster.golden_level);
        groups.entry(key).or_default().push((1, idx, monster.id.clone()));
    }
    
    // 筛选出数量>=3的组
    let mut mergeable: Vec<GcMergeableGroup> = groups
        .into_iter()
        .filter(|(_, v)| v.len() >= 3)
        .map(|((template_id, star, golden_level), monsters)| {
            // 按优先级排序: 战场(0) 在前, 然后按索引
            let mut sorted = monsters;
            sorted.sort_by_key(|(loc, idx, _)| (*loc, *idx));
            
            // 只取前3个
            let first_three: Vec<_> = sorted.into_iter().take(3).collect();
            
            GcMergeableGroup {
                template_id,
                star,
                golden_level,
                monster_indices: first_three.iter().map(|(l, i, _)| (*l, *i)).collect(),
                monster_ids: first_three.iter().map(|(_, _, id)| id.clone()).collect(),
            }
        })
        .collect();
    
    // 按星级排序 (低星优先合成, 这样能更快升星)
    mergeable.sort_by_key(|g| (g.golden_level, g.star));
    
    mergeable
}

// =============================================================================
// 合成执行
// =============================================================================

/// 执行合成, 生成新怪兽
/// 
/// # 合成规则
/// - 1★ → 2★
/// - 2★ → 3★
/// - 3★ → 金色Lv1
/// - 金色LvN → 金色Lv(N+1)
pub fn gc_merge_monsters(monsters: [GcMonster; 3]) -> GcMergeResult {
    // 验证可合成性
    if !gc_can_merge_triple(&monsters[0], &monsters[1], &monsters[2]) {
        return GcMergeResult::failed();
    }
    
    let from_star = monsters[0].star;
    let from_golden = monsters[0].golden_level;
    
    // 计算合成后的星级/金色等级
    let (to_star, to_golden) = if from_golden > 0 {
        // 金色继续升级
        (3, from_golden + 1)
    } else if from_star >= 3 {
        // 3★ → 金色Lv1
        (3, 1)
    } else {
        // 普通升星
        (from_star + 1, 0)
    };
    
    // 确定合成结果位置 (优先战场, 取最左槽位)
    let result_location = monsters.iter()
        .filter_map(|m| m.slot)
        .min();
    
    // 创建合成后的怪兽
    let base = &monsters[0];
    let mut merged = GcMonster::new_with_star(
        &format!("{}_merged_{}", base.template_id, uuid_simple()),
        &base.template_id,
        &base.name,
        base.level,
        base.attribute.clone(),
        base.base_atk,
        base.base_def,
        base.max_hp,
        to_star,
        to_golden,
    );
    
    // 继承槽位
    merged.slot = result_location;
    merged.can_attack = false; // 刚合成不能攻击
    
    GcMergeResult {
        success: true,
        merged_monster: Some(merged),
        consumed_ids: monsters.iter().map(|m| m.id.clone()).collect(),
        result_location,
        from_star,
        to_star,
        from_golden,
        to_golden,
    }
}

/// 简单的UUID生成 (用于合成后的新ID)
fn uuid_simple() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    format!("{:x}{:x}", duration.as_secs(), duration.subsec_nanos())
}

// =============================================================================
// 自动合成扫描
// =============================================================================

/// 自动扫描并执行一次合成
/// 
/// # 返回
/// 如果有可合成的组则执行合成并返回结果, 否则返回 None
pub fn gc_auto_merge_once(
    board: &mut [Option<GcMonster>],
    bench: &mut Vec<GcMonster>,
) -> Option<GcMergeResult> {
    // 查找可合成组
    let groups = gc_find_mergeable_groups(board, bench);
    
    if groups.is_empty() {
        return None;
    }
    
    // 取第一个组执行合成
    let group = &groups[0];
    
    // 收集要合成的怪兽
    let mut to_merge: Vec<GcMonster> = Vec::with_capacity(3);
    
    // 按照索引从大到小移除, 避免索引错乱
    let mut sorted_indices = group.monster_indices.clone();
    sorted_indices.sort_by(|a, b| {
        // 先按location, 再按index倒序
        if a.0 != b.0 {
            a.0.cmp(&b.0)
        } else {
            b.1.cmp(&a.1) // 倒序, 先移除后面的
        }
    });
    
    // 分别处理战场和手牌
    for &(location, idx) in &sorted_indices {
        if location == 0 {
            // 战场
            if let Some(monster) = board[idx].take() {
                to_merge.push(monster);
            }
        } else {
            // 手牌
            if idx < bench.len() {
                to_merge.push(bench.remove(idx));
            }
        }
    }
    
    if to_merge.len() != 3 {
        return None;
    }
    
    // 执行合成
    let monsters: [GcMonster; 3] = [
        to_merge.pop().unwrap(),
        to_merge.pop().unwrap(),
        to_merge.pop().unwrap(),
    ];
    
    let result = gc_merge_monsters(monsters);
    
    if result.success {
        // 放置合成后的怪兽
        if let Some(merged) = &result.merged_monster {
            if let Some(slot) = result.result_location {
                // 放回战场
                board[slot as usize] = Some(merged.clone());
            } else {
                // 放回手牌
                bench.push(merged.clone());
            }
        }
    }
    
    Some(result)
}

/// 自动合成所有可合成的组 (递归直到没有可合成的)
pub fn gc_auto_merge_all(
    board: &mut [Option<GcMonster>],
    bench: &mut Vec<GcMonster>,
) -> Vec<GcMergeResult> {
    let mut results = Vec::new();
    
    loop {
        match gc_auto_merge_once(board, bench) {
            Some(result) => results.push(result),
            None => break,
        }
    }
    
    results
}

// =============================================================================
// 测试
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::GcMonsterAttribute;
    
    fn make_monster(template: &str, star: u8, golden: u8) -> GcMonster {
        GcMonster::new_with_star(
            &format!("{}_{}", template, star),
            template,
            "Test Monster",
            4,
            GcMonsterAttribute::Fire,
            100,
            100,
            100,
            star,
            golden,
        )
    }
    
    #[test]
    fn test_can_merge() {
        let m1 = make_monster("dragon", 1, 0);
        let m2 = make_monster("dragon", 1, 0);
        let m3 = make_monster("dragon", 1, 0);
        
        assert!(gc_can_merge_triple(&m1, &m2, &m3));
        
        // 不同星级不能合成
        let m4 = make_monster("dragon", 2, 0);
        assert!(!gc_can_merge_pair(&m1, &m4));
        
        // 不同模板不能合成
        let m5 = make_monster("slime", 1, 0);
        assert!(!gc_can_merge_pair(&m1, &m5));
    }
    
    #[test]
    fn test_merge_result() {
        let monsters = [
            make_monster("dragon", 1, 0),
            make_monster("dragon", 1, 0),
            make_monster("dragon", 1, 0),
        ];
        
        let result = gc_merge_monsters(monsters);
        
        assert!(result.success);
        assert_eq!(result.from_star, 1);
        assert_eq!(result.to_star, 2);
        
        let merged = result.merged_monster.unwrap();
        assert_eq!(merged.star, 2);
        assert_eq!(merged.starred_atk(), 200); // 100 * 2
    }
    
    #[test]
    fn test_golden_merge() {
        // 3★ × 3 → 金色Lv1
        let monsters = [
            make_monster("dragon", 3, 0),
            make_monster("dragon", 3, 0),
            make_monster("dragon", 3, 0),
        ];
        
        let result = gc_merge_monsters(monsters);
        assert!(result.success);
        assert_eq!(result.to_star, 3);
        assert_eq!(result.to_golden, 1);
        
        let merged = result.merged_monster.unwrap();
        assert!(merged.is_golden());
        // 金色Lv1 = 3 * (1 + 0.5) = 4.5倍
        assert_eq!(merged.starred_atk(), 450); // 100 * 4.5
    }
    
    #[test]
    fn test_find_mergeable() {
        let board: [Option<GcMonster>; 5] = [
            Some(make_monster("dragon", 1, 0)),
            Some(make_monster("dragon", 1, 0)),
            None,
            None,
            None,
        ];
        
        let bench = vec![
            make_monster("dragon", 1, 0),
            make_monster("slime", 1, 0),
        ];
        
        let groups = gc_find_mergeable_groups(&board, &bench);
        
        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].template_id, "dragon");
        assert_eq!(groups[0].monster_indices.len(), 3);
    }
}
