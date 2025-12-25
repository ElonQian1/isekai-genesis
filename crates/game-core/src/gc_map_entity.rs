//! 地图实体系统
//!
//! 模块: game-core
//! 前缀: Gc
//! 文档: 文档/01-game-core.md
//!
//! 实现地图上的可交互实体：
//! - 传送门 (连接不同地图)
//! - NPC (商店、任务、信息)
//! - 怪物点 (战斗入口)
//! - 宝箱 (奖励)

use serde::{Deserialize, Serialize};
use crate::GcPosition;

// =============================================================================
// 传送门
// =============================================================================

/// 传送门 - 连接两个地图
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcPortal {
    /// 传送门 ID
    pub id: String,
    /// 显示名称
    pub name: String,
    /// 在当前地图的位置
    pub position: GcPosition,
    /// 目标地图 ID
    pub target_map_id: String,
    /// 在目标地图的位置
    pub target_position: GcPosition,
    /// 是否需要解锁
    pub locked: bool,
    /// 解锁条件描述
    pub unlock_hint: Option<String>,
}

impl GcPortal {
    /// 创建传送门
    pub fn gc_new(
        id: &str,
        name: &str,
        position: GcPosition,
        target_map_id: &str,
        target_position: GcPosition,
    ) -> Self {
        Self {
            id: id.to_string(),
            name: name.to_string(),
            position,
            target_map_id: target_map_id.to_string(),
            target_position,
            locked: false,
            unlock_hint: None,
        }
    }
    
    /// 设置为需要解锁
    pub fn gc_with_lock(mut self, hint: &str) -> Self {
        self.locked = true;
        self.unlock_hint = Some(hint.to_string());
        self
    }
    
    /// 解锁传送门
    pub fn gc_unlock(&mut self) {
        self.locked = false;
    }
}

// =============================================================================
// NPC 类型
// =============================================================================

/// NPC 类型
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum GcNpcType {
    /// 商店 - 买卖物品
    Shop,
    /// 任务 - 接取/交付任务
    Quest,
    /// 信息 - 提供提示
    Info,
    /// 战斗 - 挑战 NPC
    Battle,
}

/// NPC
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcNpc {
    /// NPC ID
    pub id: String,
    /// 显示名称
    pub name: String,
    /// NPC 类型
    pub npc_type: GcNpcType,
    /// 位置
    pub position: GcPosition,
    /// 显示图标
    pub sprite: String,
    /// 对话内容
    pub dialogues: Vec<String>,
    /// 当前对话索引
    pub current_dialogue: usize,
}

impl GcNpc {
    /// 创建 NPC
    pub fn gc_new(id: &str, name: &str, npc_type: GcNpcType, position: GcPosition) -> Self {
        Self {
            id: id.to_string(),
            name: name.to_string(),
            npc_type,
            position,
            sprite: "☺".to_string(),
            dialogues: Vec::new(),
            current_dialogue: 0,
        }
    }
    
    /// 设置图标
    pub fn gc_with_sprite(mut self, sprite: &str) -> Self {
        self.sprite = sprite.to_string();
        self
    }
    
    /// 添加对话
    pub fn gc_add_dialogue(&mut self, text: &str) {
        self.dialogues.push(text.to_string());
    }
    
    /// 批量添加对话
    pub fn gc_with_dialogues(mut self, dialogues: Vec<&str>) -> Self {
        self.dialogues = dialogues.iter().map(|s| s.to_string()).collect();
        self
    }
    
    /// 获取当前对话
    pub fn gc_get_current_dialogue(&self) -> Option<&str> {
        self.dialogues.get(self.current_dialogue).map(|s| s.as_str())
    }
    
    /// 下一句对话
    pub fn gc_next_dialogue(&mut self) -> bool {
        if self.current_dialogue + 1 < self.dialogues.len() {
            self.current_dialogue += 1;
            true
        } else {
            self.current_dialogue = 0; // 重置到开头
            false
        }
    }
}

// =============================================================================
// 怪物点
// =============================================================================

/// 怪物点 - 战斗入口
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcMonsterSpawn {
    /// 怪物点 ID
    pub id: String,
    /// 显示名称
    pub name: String,
    /// 位置
    pub position: GcPosition,
    /// 显示图标
    pub sprite: String,
    /// 怪物等级
    pub level: u32,
    /// 是否是 Boss
    pub is_boss: bool,
    /// 关联的 Boss ID (如果是 Boss 战)
    pub boss_id: Option<String>,
    /// 是否已被击败 (可用于一次性怪物)
    pub defeated: bool,
    /// 刷新时间 (秒，0 表示不刷新)
    pub respawn_time: u32,
}

impl GcMonsterSpawn {
    /// 创建普通怪物点
    pub fn gc_new(id: &str, name: &str, position: GcPosition, level: u32) -> Self {
        Self {
            id: id.to_string(),
            name: name.to_string(),
            position,
            sprite: "◆".to_string(),
            level,
            is_boss: false,
            boss_id: None,
            defeated: false,
            respawn_time: 60, // 默认 60 秒刷新
        }
    }
    
    /// 创建 Boss 入口
    pub fn gc_new_boss(id: &str, name: &str, position: GcPosition, boss_id: &str) -> Self {
        Self {
            id: id.to_string(),
            name: name.to_string(),
            position,
            sprite: "👹".to_string(),
            level: 0,
            is_boss: true,
            boss_id: Some(boss_id.to_string()),
            defeated: false,
            respawn_time: 0, // Boss 不自动刷新
        }
    }
    
    /// 标记为已击败
    pub fn gc_defeat(&mut self) {
        self.defeated = true;
    }
    
    /// 重置 (刷新)
    pub fn gc_respawn(&mut self) {
        self.defeated = false;
    }
}

// =============================================================================
// 宝箱
// =============================================================================

/// 宝箱奖励
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcChestReward {
    /// 物品 ID
    pub item_id: String,
    /// 物品名称
    pub item_name: String,
    /// 数量
    pub quantity: u32,
}

/// 宝箱
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcChest {
    /// 宝箱 ID
    pub id: String,
    /// 位置
    pub position: GcPosition,
    /// 奖励内容
    pub rewards: Vec<GcChestReward>,
    /// 是否已开启
    pub opened: bool,
    /// 需要的钥匙 ID (如果需要)
    pub key_required: Option<String>,
}

impl GcChest {
    /// 创建宝箱
    pub fn gc_new(id: &str, position: GcPosition) -> Self {
        Self {
            id: id.to_string(),
            position,
            rewards: Vec::new(),
            opened: false,
            key_required: None,
        }
    }
    
    /// 添加奖励
    pub fn gc_add_reward(&mut self, item_id: &str, item_name: &str, quantity: u32) {
        self.rewards.push(GcChestReward {
            item_id: item_id.to_string(),
            item_name: item_name.to_string(),
            quantity,
        });
    }
    
    /// 设置需要钥匙
    pub fn gc_with_key(mut self, key_id: &str) -> Self {
        self.key_required = Some(key_id.to_string());
        self
    }
    
    /// 是否可以打开
    pub fn gc_can_open(&self, has_key: bool) -> bool {
        !self.opened && (self.key_required.is_none() || has_key)
    }
    
    /// 打开宝箱
    pub fn gc_open(&mut self) -> Option<&Vec<GcChestReward>> {
        if !self.opened {
            self.opened = true;
            Some(&self.rewards)
        } else {
            None
        }
    }
}

// =============================================================================
// 测试
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_gc_portal() {
        let portal = GcPortal::gc_new(
            "portal_1",
            "通往森林",
            GcPosition::gc_new(10, 5),
            "map_forest",
            GcPosition::gc_new(2, 2),
        );
        
        assert_eq!(portal.id, "portal_1");
        assert_eq!(portal.target_map_id, "map_forest");
        assert!(!portal.locked);
    }
    
    #[test]
    fn test_gc_npc() {
        let mut npc = GcNpc::gc_new(
            "npc_1",
            "商人老王",
            GcNpcType::Shop,
            GcPosition::gc_new(5, 5),
        );
        
        npc.gc_add_dialogue("欢迎光临!");
        npc.gc_add_dialogue("需要点什么?");
        
        assert_eq!(npc.gc_get_current_dialogue(), Some("欢迎光临!"));
        assert!(npc.gc_next_dialogue());
        assert_eq!(npc.gc_get_current_dialogue(), Some("需要点什么?"));
    }
    
    #[test]
    fn test_gc_monster_spawn() {
        let mut monster = GcMonsterSpawn::gc_new(
            "monster_1",
            "史莱姆",
            GcPosition::gc_new(3, 3),
            5,
        );
        
        assert_eq!(monster.level, 5);
        assert!(!monster.is_boss);
        assert!(!monster.defeated);
        
        monster.gc_defeat();
        assert!(monster.defeated);
    }
    
    #[test]
    fn test_gc_chest() {
        let mut chest = GcChest::gc_new("chest_1", GcPosition::gc_new(7, 7));
        chest.gc_add_reward("gold", "金币", 100);
        chest.gc_add_reward("potion", "生命药水", 2);
        
        assert!(chest.gc_can_open(false));
        
        let rewards = chest.gc_open().unwrap();
        assert_eq!(rewards.len(), 2);
        assert!(chest.opened);
        assert!(chest.gc_open().is_none()); // 不能重复打开
    }
}
