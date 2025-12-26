//! 墓地系统
//!
//! 模块: game-core
//! 前缀: Gc
//!
//! ## 墓地规则
//! - 战斗中阵亡的怪兽进入墓地
//! - 墓地怪兽不可直接使用
//! - 可通过特殊效果从墓地复活

use serde::{Deserialize, Serialize};
use crate::GcMonster;

// =============================================================================
// 墓地结构
// =============================================================================

/// 墓地
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct GcGraveyard {
    /// 墓地中的怪兽列表 (按死亡顺序)
    monsters: Vec<GcMonster>,
}

impl GcGraveyard {
    /// 创建空墓地
    pub fn new() -> Self {
        Self::default()
    }
    
    /// 将怪兽送入墓地
    pub fn add(&mut self, mut monster: GcMonster) {
        // 清除槽位信息
        monster.slot = None;
        monster.can_attack = false;
        self.monsters.push(monster);
    }
    
    /// 获取墓地中的怪兽数量
    pub fn count(&self) -> usize {
        self.monsters.len()
    }
    
    /// 墓地是否为空
    pub fn is_empty(&self) -> bool {
        self.monsters.is_empty()
    }
    
    /// 获取墓地中所有怪兽 (只读)
    pub fn monsters(&self) -> &[GcMonster] {
        &self.monsters
    }
    
    /// 按ID查找墓地中的怪兽
    pub fn find_by_id(&self, id: &str) -> Option<&GcMonster> {
        self.monsters.iter().find(|m| m.id == id)
    }
    
    /// 按模板ID查找墓地中的怪兽
    pub fn find_by_template(&self, template_id: &str) -> Vec<&GcMonster> {
        self.monsters.iter()
            .filter(|m| m.template_id == template_id)
            .collect()
    }
    
    /// 从墓地移除并返回怪兽 (复活时使用)
    pub fn remove_by_id(&mut self, id: &str) -> Option<GcMonster> {
        if let Some(idx) = self.monsters.iter().position(|m| m.id == id) {
            Some(self.monsters.remove(idx))
        } else {
            None
        }
    }
    
    /// 复活最后死亡的怪兽
    pub fn revive_last(&mut self) -> Option<GcMonster> {
        self.monsters.pop()
    }
    
    /// 复活指定模板的第一个怪兽
    pub fn revive_by_template(&mut self, template_id: &str) -> Option<GcMonster> {
        if let Some(idx) = self.monsters.iter().position(|m| m.template_id == template_id) {
            let mut monster = self.monsters.remove(idx);
            // 复活时恢复满HP
            monster.current_hp = monster.effective_max_hp();
            Some(monster)
        } else {
            None
        }
    }
    
    /// 清空墓地
    pub fn clear(&mut self) {
        self.monsters.clear();
    }
    
    /// 获取墓地中各星级怪兽数量统计
    pub fn stats(&self) -> GcGraveyardStats {
        let mut stats = GcGraveyardStats::default();
        
        for monster in &self.monsters {
            stats.total += 1;
            
            if monster.is_golden() {
                stats.golden += 1;
            } else {
                match monster.star {
                    1 => stats.star1 += 1,
                    2 => stats.star2 += 1,
                    _ => stats.star3 += 1,
                }
            }
        }
        
        stats
    }
}

/// 墓地统计信息
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct GcGraveyardStats {
    pub total: u32,
    pub star1: u32,
    pub star2: u32,
    pub star3: u32,
    pub golden: u32,
}

// =============================================================================
// 阵亡处理函数
// =============================================================================

/// 阵亡事件
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcDeathEvent {
    /// 阵亡怪兽ID
    pub monster_id: String,
    /// 阵亡怪兽名称
    pub monster_name: String,
    /// 怪兽星级
    pub star: u8,
    /// 金色等级
    pub golden_level: u8,
    /// 死亡时所在槽位
    pub slot: Option<u8>,
    /// 击杀者ID (如果有)
    pub killer_id: Option<String>,
}

impl GcDeathEvent {
    /// 从怪兽创建阵亡事件
    pub fn from_monster(monster: &GcMonster, killer_id: Option<String>) -> Self {
        Self {
            monster_id: monster.id.clone(),
            monster_name: monster.name.clone(),
            star: monster.star,
            golden_level: monster.golden_level,
            slot: monster.slot,
            killer_id,
        }
    }
}

/// 处理战斗后的阵亡清理
/// 
/// 将战场上HP<=0的怪兽移入墓地
/// 
/// # 返回
/// 阵亡事件列表
pub fn gc_process_deaths(
    board: &mut [Option<GcMonster>],
    graveyard: &mut GcGraveyard,
) -> Vec<GcDeathEvent> {
    let mut events = Vec::new();
    
    for slot in board.iter_mut() {
        if let Some(monster) = slot.take() {
            if !monster.is_alive() {
                events.push(GcDeathEvent::from_monster(&monster, None));
                graveyard.add(monster);
            } else {
                // 存活的放回去
                *slot = Some(monster);
            }
        }
    }
    
    events
}

/// 处理手牌区的阵亡 (一般不会发生, 但以防万一)
pub fn gc_process_bench_deaths(
    bench: &mut Vec<GcMonster>,
    graveyard: &mut GcGraveyard,
) -> Vec<GcDeathEvent> {
    let mut events = Vec::new();
    let mut i = 0;
    
    while i < bench.len() {
        if !bench[i].is_alive() {
            let monster = bench.remove(i);
            events.push(GcDeathEvent::from_monster(&monster, None));
            graveyard.add(monster);
        } else {
            i += 1;
        }
    }
    
    events
}

// =============================================================================
// 测试
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::GcMonsterAttribute;
    
    fn make_monster(id: &str, hp: u32) -> GcMonster {
        let mut m = GcMonster::new(
            id,
            "Test Monster",
            4,
            GcMonsterAttribute::Fire,
            100,
            100,
            hp,
        );
        m.current_hp = hp;
        m
    }
    
    #[test]
    fn test_graveyard_basic() {
        let mut gy = GcGraveyard::new();
        assert!(gy.is_empty());
        
        gy.add(make_monster("m1", 0));
        gy.add(make_monster("m2", 0));
        
        assert_eq!(gy.count(), 2);
        assert!(!gy.is_empty());
    }
    
    #[test]
    fn test_revive() {
        let mut gy = GcGraveyard::new();
        gy.add(make_monster("m1", 0));
        gy.add(make_monster("m2", 0));
        
        let revived = gy.revive_last().unwrap();
        assert_eq!(revived.id, "m2");
        assert_eq!(gy.count(), 1);
    }
    
    #[test]
    fn test_process_deaths() {
        let mut board: [Option<GcMonster>; 5] = [
            Some(make_monster("alive", 100)),
            Some(make_monster("dead1", 0)),
            None,
            Some(make_monster("dead2", 0)),
            None,
        ];
        
        let mut gy = GcGraveyard::new();
        let events = gc_process_deaths(&mut board, &mut gy);
        
        assert_eq!(events.len(), 2);
        assert_eq!(gy.count(), 2);
        assert!(board[0].is_some()); // alive 还在
        assert!(board[1].is_none()); // dead1 被移除
        assert!(board[3].is_none()); // dead2 被移除
    }
}
