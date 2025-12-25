//! 天赋系统
//!
//! 模块: game-core
//! 前缀: Gc
//! 文档: 文档/01-game-core.md
//!
//! 实现天赋机制：
//! - 天赋节点定义
//! - 天赋树结构
//! - 天赋效果
//! - 天赋解锁条件

use serde::{Deserialize, Serialize};
use crate::{GcBaseStats, GcCombatStats, GcProfessionType, GcStatType};

// =============================================================================
// 天赋效果类型
// =============================================================================

/// 天赋效果类型
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum GcTalentEffect {
    /// 增加基础属性
    AddBaseStat {
        stat_type: GcStatType,
        value: i32,
    },
    /// 增加战斗属性（百分比）
    AddCombatStatPercent {
        stat_name: String,  // max_hp, physical_attack, etc.
        percent: i32,
    },
    /// 增加战斗属性（固定值）
    AddCombatStatFlat {
        stat_name: String,
        value: i32,
    },
    /// 解锁技能
    UnlockSkill {
        skill_id: String,
    },
    /// 强化技能
    EnhanceSkill {
        skill_id: String,
        enhancement: String,  // 描述性文本
    },
    /// 特殊被动效果
    SpecialPassive {
        passive_id: String,
        description: String,
    },
    /// 伤害加成
    DamageBonus {
        damage_type: String,  // physical, magic, all
        percent: i32,
    },
    /// 抗性加成
    ResistanceBonus {
        damage_type: String,
        percent: i32,
    },
}

impl GcTalentEffect {
    /// 获取效果描述
    pub fn gc_description(&self) -> String {
        match self {
            GcTalentEffect::AddBaseStat { stat_type, value } => {
                format!("{} +{}", stat_type.gc_name(), value)
            }
            GcTalentEffect::AddCombatStatPercent { stat_name, percent } => {
                format!("{} +{}%", stat_name, percent)
            }
            GcTalentEffect::AddCombatStatFlat { stat_name, value } => {
                format!("{} +{}", stat_name, value)
            }
            GcTalentEffect::UnlockSkill { skill_id } => {
                format!("解锁技能: {}", skill_id)
            }
            GcTalentEffect::EnhanceSkill { skill_id, enhancement } => {
                format!("强化 {}: {}", skill_id, enhancement)
            }
            GcTalentEffect::SpecialPassive { description, .. } => {
                description.clone()
            }
            GcTalentEffect::DamageBonus { damage_type, percent } => {
                format!("{}伤害 +{}%", damage_type, percent)
            }
            GcTalentEffect::ResistanceBonus { damage_type, percent } => {
                format!("{}抗性 +{}%", damage_type, percent)
            }
        }
    }
    
    /// 应用效果到基础属性
    pub fn gc_apply_to_base_stats(&self, stats: &mut GcBaseStats) {
        if let GcTalentEffect::AddBaseStat { stat_type, value } = self {
            stats.gc_add(*stat_type, *value);
        }
    }
    
    /// 应用效果到战斗属性
    pub fn gc_apply_to_combat_stats(&self, stats: &mut GcCombatStats) {
        match self {
            GcTalentEffect::AddCombatStatFlat { stat_name, value } => {
                match stat_name.as_str() {
                    "max_hp" => stats.max_hp = (stats.max_hp as i32 + value).max(0) as u32,
                    "physical_attack" => stats.physical_attack = (stats.physical_attack as i32 + value).max(0) as u32,
                    "magic_attack" => stats.magic_attack = (stats.magic_attack as i32 + value).max(0) as u32,
                    "physical_defense" => stats.physical_defense = (stats.physical_defense as i32 + value).max(0) as u32,
                    "magic_defense" => stats.magic_defense = (stats.magic_defense as i32 + value).max(0) as u32,
                    "crit_rate" => stats.crit_rate = (stats.crit_rate as i32 + value).max(0).min(100) as u32,
                    "crit_damage" => stats.crit_damage = (stats.crit_damage as i32 + value).max(0) as u32,
                    "dodge_rate" => stats.dodge_rate = (stats.dodge_rate as i32 + value).max(0).min(100) as u32,
                    "healing_bonus" => stats.healing_bonus = (stats.healing_bonus as i32 + value).max(0) as u32,
                    "cooldown_reduction" => stats.cooldown_reduction = (stats.cooldown_reduction as i32 + value).max(0).min(80) as u32,
                    _ => {}
                }
            }
            GcTalentEffect::AddCombatStatPercent { stat_name, percent } => {
                let multiplier = *percent as f32 / 100.0;
                match stat_name.as_str() {
                    "max_hp" => stats.max_hp = (stats.max_hp as f32 * (1.0 + multiplier)) as u32,
                    "physical_attack" => stats.physical_attack = (stats.physical_attack as f32 * (1.0 + multiplier)) as u32,
                    "magic_attack" => stats.magic_attack = (stats.magic_attack as f32 * (1.0 + multiplier)) as u32,
                    "physical_defense" => stats.physical_defense = (stats.physical_defense as f32 * (1.0 + multiplier)) as u32,
                    "magic_defense" => stats.magic_defense = (stats.magic_defense as f32 * (1.0 + multiplier)) as u32,
                    _ => {}
                }
            }
            _ => {}
        }
    }
}

// =============================================================================
// 天赋节点
// =============================================================================

/// 天赋节点类型
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]
pub enum GcTalentNodeType {
    /// 小天赋 - 简单属性加成
    Minor,
    /// 大天赋 - 显著效果
    Major,
    /// 核心天赋 - 改变玩法的关键天赋
    Keystone,
}

/// 天赋节点
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcTalentNode {
    /// 节点 ID
    pub id: String,
    /// 节点名称
    pub name: String,
    /// 节点描述
    pub description: String,
    /// 节点类型
    pub node_type: GcTalentNodeType,
    /// 最大等级
    pub max_level: u32,
    /// 当前等级
    pub current_level: u32,
    /// 所需天赋点（每级）
    pub cost_per_level: u32,
    /// 前置天赋 ID 列表（需要点满）
    pub prerequisites: Vec<String>,
    /// 解锁所需角色等级
    pub required_player_level: u32,
    /// 每级效果列表
    pub effects_per_level: Vec<Vec<GcTalentEffect>>,
    /// 节点位置 (用于 UI 渲染)
    pub position: (i32, i32),
    /// 图标
    pub icon: String,
}

impl GcTalentNode {
    /// 创建新节点
    pub fn gc_new(
        id: &str,
        name: &str,
        description: &str,
        node_type: GcTalentNodeType,
        max_level: u32,
        position: (i32, i32),
    ) -> Self {
        Self {
            id: id.to_string(),
            name: name.to_string(),
            description: description.to_string(),
            node_type,
            max_level,
            current_level: 0,
            cost_per_level: match node_type {
                GcTalentNodeType::Minor => 1,
                GcTalentNodeType::Major => 2,
                GcTalentNodeType::Keystone => 3,
            },
            prerequisites: Vec::new(),
            required_player_level: 1,
            effects_per_level: Vec::new(),
            position,
            icon: "⭐".to_string(),
        }
    }
    
    /// 设置前置条件
    pub fn gc_with_prerequisites(mut self, prereqs: Vec<&str>) -> Self {
        self.prerequisites = prereqs.into_iter().map(String::from).collect();
        self
    }
    
    /// 设置所需等级
    pub fn gc_with_required_level(mut self, level: u32) -> Self {
        self.required_player_level = level;
        self
    }
    
    /// 添加等级效果
    pub fn gc_with_effects(mut self, effects: Vec<Vec<GcTalentEffect>>) -> Self {
        self.effects_per_level = effects;
        self
    }
    
    /// 设置图标
    pub fn gc_with_icon(mut self, icon: &str) -> Self {
        self.icon = icon.to_string();
        self
    }
    
    /// 是否已解锁（可以点）
    pub fn gc_is_unlocked(&self, player_level: u32, unlocked_talents: &[String]) -> bool {
        // 检查等级要求
        if player_level < self.required_player_level {
            return false;
        }
        
        // 检查前置条件
        for prereq in &self.prerequisites {
            if !unlocked_talents.contains(prereq) {
                return false;
            }
        }
        
        true
    }
    
    /// 是否已满级
    pub fn gc_is_maxed(&self) -> bool {
        self.current_level >= self.max_level
    }
    
    /// 升级
    pub fn gc_level_up(&mut self) -> Result<(), String> {
        if self.gc_is_maxed() {
            return Err("天赋已满级".to_string());
        }
        self.current_level += 1;
        Ok(())
    }
    
    /// 重置
    pub fn gc_reset(&mut self) {
        self.current_level = 0;
    }
    
    /// 获取当前等级的效果
    pub fn gc_get_current_effects(&self) -> Vec<&GcTalentEffect> {
        if self.current_level == 0 {
            return Vec::new();
        }
        
        let level_index = (self.current_level - 1) as usize;
        if level_index < self.effects_per_level.len() {
            self.effects_per_level[level_index].iter().collect()
        } else {
            Vec::new()
        }
    }
    
    /// 获取升级所需点数
    pub fn gc_get_upgrade_cost(&self) -> u32 {
        if self.gc_is_maxed() {
            0
        } else {
            self.cost_per_level
        }
    }
    
    /// 获取已投入点数
    pub fn gc_get_invested_points(&self) -> u32 {
        self.current_level * self.cost_per_level
    }
}

// =============================================================================
// 天赋树
// =============================================================================

/// 天赋树
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcTalentTree {
    /// 树 ID
    pub id: String,
    /// 树名称
    pub name: String,
    /// 所属职业（None 表示通用）
    pub profession: Option<GcProfessionType>,
    /// 描述
    pub description: String,
    /// 所有节点
    pub nodes: Vec<GcTalentNode>,
    /// 节点连接（用于 UI 绘制）
    pub connections: Vec<(String, String)>,
}

impl GcTalentTree {
    /// 创建新天赋树
    pub fn gc_new(id: &str, name: &str, profession: Option<GcProfessionType>) -> Self {
        Self {
            id: id.to_string(),
            name: name.to_string(),
            profession,
            description: String::new(),
            nodes: Vec::new(),
            connections: Vec::new(),
        }
    }
    
    /// 添加描述
    pub fn gc_with_description(mut self, desc: &str) -> Self {
        self.description = desc.to_string();
        self
    }
    
    /// 添加节点
    pub fn gc_add_node(&mut self, node: GcTalentNode) {
        self.nodes.push(node);
    }
    
    /// 添加连接
    pub fn gc_add_connection(&mut self, from: &str, to: &str) {
        self.connections.push((from.to_string(), to.to_string()));
    }
    
    /// 获取节点
    pub fn gc_get_node(&self, id: &str) -> Option<&GcTalentNode> {
        self.nodes.iter().find(|n| n.id == id)
    }
    
    /// 获取节点（可变）
    pub fn gc_get_node_mut(&mut self, id: &str) -> Option<&mut GcTalentNode> {
        self.nodes.iter_mut().find(|n| n.id == id)
    }
    
    /// 获取已解锁的天赋 ID 列表
    pub fn gc_get_unlocked_talent_ids(&self) -> Vec<String> {
        self.nodes
            .iter()
            .filter(|n| n.current_level > 0)
            .map(|n| n.id.clone())
            .collect()
    }
    
    /// 计算总投入点数
    pub fn gc_get_total_invested_points(&self) -> u32 {
        self.nodes.iter().map(|n| n.gc_get_invested_points()).sum()
    }
    
    /// 升级天赋
    pub fn gc_upgrade_talent(
        &mut self,
        talent_id: &str,
        player_level: u32,
        available_points: u32,
    ) -> Result<u32, String> {
        // 获取已解锁列表
        let unlocked = self.gc_get_unlocked_talent_ids();
        
        // 获取节点
        let node = self.gc_get_node(talent_id)
            .ok_or("天赋不存在")?;
        
        // 检查是否解锁
        if !node.gc_is_unlocked(player_level, &unlocked) {
            return Err("天赋未解锁".to_string());
        }
        
        // 检查是否已满级
        if node.gc_is_maxed() {
            return Err("天赋已满级".to_string());
        }
        
        // 检查点数
        let cost = node.gc_get_upgrade_cost();
        if available_points < cost {
            return Err("天赋点不足".to_string());
        }
        
        // 升级
        let node = self.gc_get_node_mut(talent_id).unwrap();
        node.gc_level_up()?;
        
        Ok(cost)
    }
    
    /// 重置所有天赋
    pub fn gc_reset_all(&mut self) -> u32 {
        let refund = self.gc_get_total_invested_points();
        for node in &mut self.nodes {
            node.gc_reset();
        }
        refund
    }
    
    /// 收集所有已激活效果
    pub fn gc_collect_all_effects(&self) -> Vec<&GcTalentEffect> {
        self.nodes
            .iter()
            .flat_map(|n| n.gc_get_current_effects())
            .collect()
    }
    
    /// 应用所有效果到基础属性
    pub fn gc_apply_to_base_stats(&self, stats: &mut GcBaseStats) {
        for effect in self.gc_collect_all_effects() {
            effect.gc_apply_to_base_stats(stats);
        }
    }
    
    /// 应用所有效果到战斗属性
    pub fn gc_apply_to_combat_stats(&self, stats: &mut GcCombatStats) {
        for effect in self.gc_collect_all_effects() {
            effect.gc_apply_to_combat_stats(stats);
        }
    }
}

// =============================================================================
// 玩家天赋管理
// =============================================================================

/// 玩家天赋状态
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcPlayerTalents {
    /// 玩家 ID
    pub player_id: String,
    /// 可用天赋点
    pub available_points: u32,
    /// 已花费天赋点
    pub spent_points: u32,
    /// 天赋树列表
    pub trees: Vec<GcTalentTree>,
}

impl GcPlayerTalents {
    /// 创建新的玩家天赋状态
    pub fn gc_new(player_id: &str) -> Self {
        Self {
            player_id: player_id.to_string(),
            available_points: 0,
            spent_points: 0,
            trees: Vec::new(),
        }
    }
    
    /// 添加天赋树
    pub fn gc_add_tree(&mut self, tree: GcTalentTree) {
        self.trees.push(tree);
    }
    
    /// 添加天赋点
    pub fn gc_add_points(&mut self, points: u32) {
        self.available_points += points;
    }
    
    /// 获取天赋树
    pub fn gc_get_tree(&self, tree_id: &str) -> Option<&GcTalentTree> {
        self.trees.iter().find(|t| t.id == tree_id)
    }
    
    /// 获取天赋树（可变）
    pub fn gc_get_tree_mut(&mut self, tree_id: &str) -> Option<&mut GcTalentTree> {
        self.trees.iter_mut().find(|t| t.id == tree_id)
    }
    
    /// 升级天赋
    pub fn gc_upgrade_talent(
        &mut self,
        tree_id: &str,
        talent_id: &str,
        player_level: u32,
    ) -> Result<(), String> {
        let available = self.available_points;
        
        let tree = self.gc_get_tree_mut(tree_id)
            .ok_or("天赋树不存在")?;
        
        let cost = tree.gc_upgrade_talent(talent_id, player_level, available)?;
        
        self.available_points -= cost;
        self.spent_points += cost;
        
        Ok(())
    }
    
    /// 重置指定天赋树
    pub fn gc_reset_tree(&mut self, tree_id: &str) -> Result<u32, String> {
        let tree = self.gc_get_tree_mut(tree_id)
            .ok_or("天赋树不存在")?;
        
        let refund = tree.gc_reset_all();
        self.available_points += refund;
        self.spent_points -= refund;
        
        Ok(refund)
    }
    
    /// 重置所有天赋
    pub fn gc_reset_all(&mut self) -> u32 {
        let mut total_refund = 0;
        for tree in &mut self.trees {
            total_refund += tree.gc_reset_all();
        }
        self.available_points += total_refund;
        self.spent_points = 0;
        total_refund
    }
    
    /// 收集所有已激活效果
    pub fn gc_collect_all_effects(&self) -> Vec<&GcTalentEffect> {
        self.trees
            .iter()
            .flat_map(|t| t.gc_collect_all_effects())
            .collect()
    }
    
    /// 应用所有天赋效果到基础属性
    pub fn gc_apply_to_base_stats(&self, stats: &mut GcBaseStats) {
        for tree in &self.trees {
            tree.gc_apply_to_base_stats(stats);
        }
    }
    
    /// 应用所有天赋效果到战斗属性
    pub fn gc_apply_to_combat_stats(&self, stats: &mut GcCombatStats) {
        for tree in &self.trees {
            tree.gc_apply_to_combat_stats(stats);
        }
    }
}

// =============================================================================
// 测试
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    fn create_test_talent() -> GcTalentNode {
        GcTalentNode::gc_new(
            "talent_str_1",
            "力量强化",
            "增加力量属性",
            GcTalentNodeType::Minor,
            3,
            (0, 0),
        )
        .gc_with_effects(vec![
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Strength, value: 2 }],
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Strength, value: 4 }],
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Strength, value: 6 }],
        ])
    }
    
    #[test]
    fn test_gc_talent_node() {
        let mut node = create_test_talent();
        
        assert_eq!(node.max_level, 3);
        assert_eq!(node.current_level, 0);
        assert!(!node.gc_is_maxed());
        
        // 升级
        node.gc_level_up().unwrap();
        assert_eq!(node.current_level, 1);
        
        // 检查效果
        let effects = node.gc_get_current_effects();
        assert_eq!(effects.len(), 1);
    }
    
    #[test]
    fn test_gc_talent_tree() {
        let mut tree = GcTalentTree::gc_new("tree_warrior", "战士天赋", Some(GcProfessionType::Warrior));
        
        tree.gc_add_node(create_test_talent());
        
        // 升级天赋
        let cost = tree.gc_upgrade_talent("talent_str_1", 1, 10).unwrap();
        assert_eq!(cost, 1);
        
        // 检查投入点数
        assert_eq!(tree.gc_get_total_invested_points(), 1);
    }
    
    #[test]
    fn test_gc_player_talents() {
        let mut talents = GcPlayerTalents::gc_new("player_1");
        talents.gc_add_points(10);
        
        let mut tree = GcTalentTree::gc_new("tree_warrior", "战士天赋", Some(GcProfessionType::Warrior));
        tree.gc_add_node(create_test_talent());
        talents.gc_add_tree(tree);
        
        // 升级天赋
        talents.gc_upgrade_talent("tree_warrior", "talent_str_1", 1).unwrap();
        
        assert_eq!(talents.available_points, 9);
        assert_eq!(talents.spent_points, 1);
        
        // 应用效果
        let mut stats = GcBaseStats::gc_new();
        talents.gc_apply_to_base_stats(&mut stats);
        assert_eq!(stats.strength, 2);
    }
    
    #[test]
    fn test_gc_talent_reset() {
        let mut talents = GcPlayerTalents::gc_new("player_1");
        talents.gc_add_points(10);
        
        let mut tree = GcTalentTree::gc_new("tree_warrior", "战士天赋", Some(GcProfessionType::Warrior));
        tree.gc_add_node(create_test_talent());
        talents.gc_add_tree(tree);
        
        // 升满天赋
        for _ in 0..3 {
            talents.gc_upgrade_talent("tree_warrior", "talent_str_1", 1).unwrap();
        }
        assert_eq!(talents.available_points, 7);
        
        // 重置
        let refund = talents.gc_reset_all();
        assert_eq!(refund, 3);
        assert_eq!(talents.available_points, 10);
    }
}
