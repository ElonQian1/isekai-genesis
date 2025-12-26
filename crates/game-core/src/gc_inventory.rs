//! 背包与装备系统
//!
//! 模块: game-core
//! 前缀: Gc
//! 文档: 文档/01-game-core.md
//!
//! 实现背包管理和装备穿戴：
//! - 背包容量管理
//! - 装备栏管理
//! - 属性统计

use serde::{Deserialize, Serialize};

use crate::{
    GcEquipment, GcEquipmentSlot, GcBaseStats, GcCombatStats, 
    GcProfessionType
};

// =============================================================================
// 装备栏
// =============================================================================

/// 已装备物品
#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct GcEquippedItems {
    /// 武器
    pub weapon: Option<GcEquipment>,
    /// 头盔
    pub helmet: Option<GcEquipment>,
    /// 护甲
    pub armor: Option<GcEquipment>,
    /// 鞋子
    pub boots: Option<GcEquipment>,
    /// 饰品
    pub accessory: Option<GcEquipment>,
}

impl GcEquippedItems {
    /// 获取指定部位的装备
    pub fn gc_get(&self, slot: GcEquipmentSlot) -> Option<&GcEquipment> {
        match slot {
            GcEquipmentSlot::Weapon => self.weapon.as_ref(),
            GcEquipmentSlot::Helmet => self.helmet.as_ref(),
            GcEquipmentSlot::Armor => self.armor.as_ref(),
            GcEquipmentSlot::Boots => self.boots.as_ref(),
            GcEquipmentSlot::Accessory => self.accessory.as_ref(),
        }
    }

    /// 设置指定部位的装备 (返回旧装备)
    pub fn gc_set(&mut self, slot: GcEquipmentSlot, item: Option<GcEquipment>) -> Option<GcEquipment> {
        match slot {
            GcEquipmentSlot::Weapon => std::mem::replace(&mut self.weapon, item),
            GcEquipmentSlot::Helmet => std::mem::replace(&mut self.helmet, item),
            GcEquipmentSlot::Armor => std::mem::replace(&mut self.armor, item),
            GcEquipmentSlot::Boots => std::mem::replace(&mut self.boots, item),
            GcEquipmentSlot::Accessory => std::mem::replace(&mut self.accessory, item),
        }
    }
    
    /// 计算所有装备的基础属性总和
    pub fn gc_total_base_stats(&self) -> GcBaseStats {
        let mut total = GcBaseStats::default();
        
        let items = [
            self.weapon.as_ref(),
            self.helmet.as_ref(),
            self.armor.as_ref(),
            self.boots.as_ref(),
            self.accessory.as_ref(),
        ];
        
        for item in items.iter().flatten() {
            total.gc_merge(&item.base_stats);
        }
        
        total
    }
    
    /// 计算所有装备的战斗属性总和
    pub fn gc_total_combat_stats(&self) -> GcCombatStats {
        let mut total = GcCombatStats::default();
        
        let items = [
            self.weapon.as_ref(),
            self.helmet.as_ref(),
            self.armor.as_ref(),
            self.boots.as_ref(),
            self.accessory.as_ref(),
        ];
        
        for item in items.iter().flatten() {
            total.gc_merge(&item.combat_stats);
        }
        
        total
    }
}

// =============================================================================
// 背包系统
// =============================================================================

/// 玩家背包
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcInventory {
    /// 玩家 ID
    pub player_id: String,
    /// 背包物品列表
    pub items: Vec<GcEquipment>,
    /// 已装备物品
    pub equipped: GcEquippedItems,
    /// 最大容量
    pub capacity: usize,
}

impl GcInventory {
    /// 创建新背包
    pub fn gc_new(player_id: &str, capacity: usize) -> Self {
        Self {
            player_id: player_id.to_string(),
            items: Vec::new(),
            equipped: GcEquippedItems::default(),
            capacity,
        }
    }
    
    /// 添加物品
    pub fn gc_add_item(&mut self, item: GcEquipment) -> Result<(), String> {
        if self.items.len() >= self.capacity {
            return Err("背包已满".to_string());
        }
        self.items.push(item);
        Ok(())
    }
    
    /// 移除物品 (通过 ID)
    pub fn gc_remove_item(&mut self, item_id: &str) -> Option<GcEquipment> {
        if let Some(index) = self.items.iter().position(|i| i.id == item_id) {
            Some(self.items.remove(index))
        } else {
            None
        }
    }
    
    /// 获取物品
    pub fn gc_get_item(&self, item_id: &str) -> Option<&GcEquipment> {
        self.items.iter().find(|i| i.id == item_id)
    }
    
    /// 装备物品
    pub fn gc_equip_item(
        &mut self, 
        item_id: &str, 
        player_level: u32, 
        profession: GcProfessionType
    ) -> Result<(), String> {
        // 1. 找到物品索引
        let index = self.items.iter().position(|i| i.id == item_id)
            .ok_or("物品不存在")?;
            
        // 2. 检查是否可装备
        let item = &self.items[index];
        item.gc_can_equip(player_level, profession)?;
        
        // 3. 取出物品
        let item = self.items.remove(index);
        let slot = item.slot;
        
        // 4. 交换装备
        if let Some(old_item) = self.equipped.gc_set(slot, Some(item)) {
            // 如果有旧装备，放回背包
            // 注意：理论上背包刚拿出一个，肯定有空位，除非...并发问题？这里是单线程逻辑
            self.items.push(old_item);
        }
        
        Ok(())
    }
    
    /// 卸下装备
    pub fn gc_unequip_item(&mut self, slot: GcEquipmentSlot) -> Result<(), String> {
        if self.items.len() >= self.capacity {
            return Err("背包已满，无法卸下装备".to_string());
        }
        
        if let Some(item) = self.equipped.gc_set(slot, None) {
            self.items.push(item);
            Ok(())
        } else {
            Err("该部位没有装备".to_string())
        }
    }
    
    /// 获取所有装备提供的属性加成 (基础 + 战斗)
    pub fn gc_get_total_stats(&self) -> (GcBaseStats, GcCombatStats) {
        (
            self.equipped.gc_total_base_stats(),
            self.equipped.gc_total_combat_stats()
        )
    }
}

// =============================================================================
// 测试
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{GcRarity, GcStatType};

    fn create_test_sword(id: &str) -> GcEquipment {
        let mut sword = GcEquipment::gc_new(
            id,
            "tpl_sword",
            "铁剑",
            GcEquipmentSlot::Weapon,
            GcRarity::Common,
        );
        sword.base_stats.strength = 5;
        sword.combat_stats.physical_attack = 10;
        sword
    }

    #[test]
    fn test_gc_inventory_add_remove() {
        let mut inv = GcInventory::gc_new("p1", 10);
        let sword = create_test_sword("s1");
        
        assert!(inv.gc_add_item(sword.clone()).is_ok());
        assert_eq!(inv.items.len(), 1);
        
        let removed = inv.gc_remove_item("s1");
        assert!(removed.is_some());
        assert_eq!(inv.items.len(), 0);
    }
    
    #[test]
    fn test_gc_inventory_equip() {
        let mut inv = GcInventory::gc_new("p1", 10);
        let sword = create_test_sword("s1");
        inv.gc_add_item(sword).unwrap();
        
        // 装备
        assert!(inv.gc_equip_item("s1", 1, GcProfessionType::Knight).is_ok());
        assert_eq!(inv.items.len(), 0);
        assert!(inv.equipped.weapon.is_some());
        
        // 检查属性统计
        let (base, combat) = inv.gc_get_total_stats();
        assert_eq!(base.strength, 5);
        assert_eq!(combat.physical_attack, 10);
        
        // 卸下
        assert!(inv.gc_unequip_item(GcEquipmentSlot::Weapon).is_ok());
        assert_eq!(inv.items.len(), 1);
        assert!(inv.equipped.weapon.is_none());
    }
    
    #[test]
    fn test_gc_inventory_swap() {
        let mut inv = GcInventory::gc_new("p1", 10);
        let s1 = create_test_sword("s1");
        let s2 = create_test_sword("s2");
        
        inv.gc_add_item(s1).unwrap();
        inv.gc_add_item(s2).unwrap();
        
        // 装备 s1
        inv.gc_equip_item("s1", 1, GcProfessionType::Knight).unwrap();
        assert_eq!(inv.equipped.weapon.as_ref().unwrap().id, "s1");
        
        // 装备 s2 (应该自动卸下 s1)
        inv.gc_equip_item("s2", 1, GcProfessionType::Knight).unwrap();
        assert_eq!(inv.equipped.weapon.as_ref().unwrap().id, "s2");
        
        // s1 应该在背包里
        assert!(inv.gc_get_item("s1").is_some());
    }
}
