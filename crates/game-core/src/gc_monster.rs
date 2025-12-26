//! 怪兽实体系统
//!
//! 模块: game-core
//! 前缀: Gc
//!
//! ## 星级系统 (酒馆模式)
//! - 1★ = 基础属性 ×1
//! - 2★ = 基础属性 ×2 (3个1★合成)
//! - 3★ = 基础属性 ×3 (3个2★合成)
//! - 金色Lv1 = 基础属性 ×4.5 (3个3★合成)
//! - 金色LvN = 基础属性 ×3×(1+N×0.5)
//!
//! ## 卖出价格
//! - 1★=1金, 2★=2金, 3★=3金
//! - 金色LvN = 3 + N×3 金

use serde::{Deserialize, Serialize};
use crate::{GcMonsterAttribute, GcTerrainType, gc_get_terrain_modifier};

/// 怪兽实体
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcMonster {
    /// 唯一ID
    pub id: String,
    /// 模板ID (用于判断同类怪兽，合成时需要相同template_id)
    pub template_id: String,
    /// 名称
    pub name: String,
    /// 等级 (1-12, 影响召唤规则)
    pub level: u8,
    /// 属性
    pub attribute: GcMonsterAttribute,
    /// 基础攻击力 (未计算星级加成)
    pub base_atk: u32,
    /// 基础防御力 (未计算星级加成)
    pub base_def: u32,
    /// 当前HP
    pub current_hp: u32,
    /// 最大HP (未计算星级加成)
    pub max_hp: u32,
    /// 所在槽位 (0-4, None表示不在场上)
    pub slot: Option<u8>,
    /// 是否可攻击 (刚召唤不能攻击)
    pub can_attack: bool,
    
    // ========== 酒馆模式新增字段 ==========
    /// 星级 (1-3)
    pub star: u8,
    /// 金色等级 (0=普通, 1+=金色强化次数)
    pub golden_level: u8,
}

impl GcMonster {
    /// 创建新怪兽 (默认1星普通)
    pub fn new(id: &str, name: &str, level: u8, attr: GcMonsterAttribute, atk: u32, def: u32, hp: u32) -> Self {
        Self::new_with_template(id, id, name, level, attr, atk, def, hp)
    }
    
    /// 创建新怪兽 (指定模板ID)
    pub fn new_with_template(
        id: &str, 
        template_id: &str,
        name: &str, 
        level: u8, 
        attr: GcMonsterAttribute, 
        atk: u32, 
        def: u32, 
        hp: u32
    ) -> Self {
        Self {
            id: id.to_string(),
            template_id: template_id.to_string(),
            name: name.to_string(),
            level,
            attribute: attr,
            base_atk: atk,
            base_def: def,
            current_hp: hp,
            max_hp: hp,
            slot: None,
            can_attack: false,
            star: 1,
            golden_level: 0,
        }
    }
    
    /// 创建指定星级的怪兽
    pub fn new_with_star(
        id: &str,
        template_id: &str,
        name: &str,
        level: u8,
        attr: GcMonsterAttribute,
        atk: u32,
        def: u32,
        hp: u32,
        star: u8,
        golden_level: u8,
    ) -> Self {
        let mut monster = Self::new_with_template(id, template_id, name, level, attr, atk, def, hp);
        monster.star = star.clamp(1, 3);
        monster.golden_level = golden_level;
        // 根据星级调整当前HP
        monster.current_hp = monster.effective_max_hp();
        monster
    }
    
    // =========================================================================
    // 星级系统
    // =========================================================================
    
    /// 计算星级属性倍率
    /// - 1★ = 1.0x
    /// - 2★ = 2.0x
    /// - 3★ = 3.0x
    /// - 金色LvN = 3.0 × (1 + N × 0.5)
    pub fn star_multiplier(&self) -> f32 {
        let base = self.star as f32;
        if self.golden_level > 0 {
            // 金色单位: 3 × (1 + golden_level × 0.5)
            3.0 * (1.0 + self.golden_level as f32 * 0.5)
        } else {
            base
        }
    }
    
    /// 是否为金色单位
    pub fn is_golden(&self) -> bool {
        self.golden_level > 0
    }
    
    /// 获取显示用的星级字符串
    pub fn star_display(&self) -> String {
        if self.is_golden() {
            format!("⭐{}Lv{}", self.star, self.golden_level)
        } else {
            "★".repeat(self.star as usize)
        }
    }
    
    /// 计算卖出价格
    /// - 1★=1金, 2★=2金, 3★=3金
    /// - 金色LvN = 3 + N×3 金
    pub fn sell_price(&self) -> u32 {
        if self.golden_level > 0 {
            3 + self.golden_level as u32 * 3
        } else {
            self.star as u32
        }
    }
    
    /// 计算购买价格 (1★=1金, 2★=2金, 3★+=3金)
    pub fn buy_price(&self) -> u32 {
        match self.star {
            1 => 1,
            2 => 2,
            _ => 3, // 3★及以上都是3金
        }
    }
    
    /// 是否可以与另一个怪兽合成
    /// 条件: 相同template_id + 相同star + 相同golden_level
    pub fn can_merge_with(&self, other: &GcMonster) -> bool {
        self.template_id == other.template_id 
            && self.star == other.star 
            && self.golden_level == other.golden_level
    }
    
    // =========================================================================
    // 属性计算 (含星级加成)
    // =========================================================================
    
    /// 获取星级加成后的最大HP
    pub fn effective_max_hp(&self) -> u32 {
        (self.max_hp as f32 * self.star_multiplier()) as u32
    }

    /// 获取地形加成后的攻击力 (含星级)
    pub fn effective_atk(&self, terrain: GcTerrainType) -> u32 {
        let base_with_star = (self.base_atk as f32 * self.star_multiplier()) as u32;
        let modifier = gc_get_terrain_modifier(terrain, self.attribute);
        modifier.apply_atk(base_with_star)
    }

    /// 获取地形加成后的防御力 (含星级)
    pub fn effective_def(&self, terrain: GcTerrainType) -> u32 {
        let base_with_star = (self.base_def as f32 * self.star_multiplier()) as u32;
        let modifier = gc_get_terrain_modifier(terrain, self.attribute);
        modifier.apply_def(base_with_star)
    }
    
    /// 获取纯星级加成后的攻击力 (不含地形)
    pub fn starred_atk(&self) -> u32 {
        (self.base_atk as f32 * self.star_multiplier()) as u32
    }
    
    /// 获取纯星级加成后的防御力 (不含地形)
    pub fn starred_def(&self) -> u32 {
        (self.base_def as f32 * self.star_multiplier()) as u32
    }

    /// 受到伤害
    pub fn take_damage(&mut self, damage: u32) -> bool {
        if damage >= self.current_hp {
            self.current_hp = 0;
            true // 死亡
        } else {
            self.current_hp -= damage;
            false
        }
    }

    /// 是否存活
    pub fn is_alive(&self) -> bool {
        self.current_hp > 0
    }
}

// =============================================================================
// 战斗伤害计算
// =============================================================================

/// 战斗结果
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcBattleResult {
    /// 攻击者ID
    pub attacker_id: String,
    /// 防御者ID
    pub defender_id: String,
    /// 攻击者有效攻击力
    pub attacker_atk: u32,
    /// 防御者有效防御力
    pub defender_def: u32,
    /// 造成的伤害
    pub damage: u32,
    /// 防御者是否死亡
    pub defender_destroyed: bool,
    /// 反击伤害 (攻击力不足时攻击者受伤)
    pub counter_damage: u32,
    /// 攻击者是否死亡
    pub attacker_destroyed: bool,
}

/// 计算怪兽战斗伤害
/// 
/// 规则:
/// - 攻击方攻击 > 防御方防御: 造成 (ATK - DEF) 伤害
/// - 攻击方攻击 < 防御方防御: 攻击方受到 (DEF - ATK) 反击伤害
/// - 攻击方攻击 = 防御方防御: 双方都不受伤
pub fn gc_calculate_battle_damage(
    attacker: &GcMonster,
    defender: &GcMonster,
    attacker_terrain: GcTerrainType,
    defender_terrain: GcTerrainType,
) -> GcBattleResult {
    let atk = attacker.effective_atk(attacker_terrain);
    let def = defender.effective_def(defender_terrain);
    
    let (damage, counter_damage) = if atk > def {
        (atk - def, 0)
    } else if atk < def {
        (0, def - atk)
    } else {
        (0, 0)
    };
    
    GcBattleResult {
        attacker_id: attacker.id.clone(),
        defender_id: defender.id.clone(),
        attacker_atk: atk,
        defender_def: def,
        damage,
        defender_destroyed: damage >= defender.current_hp,
        counter_damage,
        attacker_destroyed: counter_damage >= attacker.current_hp,
    }
}

/// 执行怪兽战斗 (修改双方状态)
pub fn gc_execute_monster_battle(
    attacker: &mut GcMonster,
    defender: &mut GcMonster,
    attacker_terrain: GcTerrainType,
    defender_terrain: GcTerrainType,
) -> GcBattleResult {
    let result = gc_calculate_battle_damage(attacker, defender, attacker_terrain, defender_terrain);
    
    // 应用伤害
    if result.damage > 0 {
        defender.take_damage(result.damage);
    }
    if result.counter_damage > 0 {
        attacker.take_damage(result.counter_damage);
    }
    
    result
}

/// 计算直接攻击伤害 (攻击玩家)
pub fn gc_calculate_direct_attack_damage(
    attacker: &GcMonster,
    attacker_terrain: GcTerrainType,
) -> u32 {
    attacker.effective_atk(attacker_terrain)
}
