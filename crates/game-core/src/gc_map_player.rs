//! 地图玩家系统
//!
//! 模块: game-core
//! 前缀: Gc
//! 文档: 文档/01-game-core.md
//!
//! 实现玩家在地图上的状态和移动：
//! - 玩家位置和朝向
//! - 移动和碰撞检测
//! - 交互检测

use serde::{Deserialize, Serialize};
use crate::{GcPosition, GcDirection, GcMap, GcTileType};

// =============================================================================
// 玩家地图状态
// =============================================================================

/// 玩家在地图上的状态
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcMapPlayer {
    /// 玩家 ID
    pub player_id: String,
    /// 当前地图 ID
    pub current_map_id: String,
    /// 当前位置
    pub position: GcPosition,
    /// 朝向
    pub direction: GcDirection,
    /// 是否正在移动
    pub is_moving: bool,
    /// 移动速度 (格/秒)
    pub move_speed: f32,
}

impl GcMapPlayer {
    /// 创建新的地图玩家状态
    pub fn gc_new(player_id: &str, map_id: &str, spawn: GcPosition) -> Self {
        Self {
            player_id: player_id.to_string(),
            current_map_id: map_id.to_string(),
            position: spawn,
            direction: GcDirection::Down,
            is_moving: false,
            move_speed: 4.0,
        }
    }
    
    /// 尝试移动
    /// 返回 (是否移动成功, 是否有可交互物)
    pub fn gc_try_move(&mut self, direction: GcDirection, map: &GcMap) -> (bool, Option<GcTileType>) {
        self.direction = direction;
        let new_pos = self.position.gc_move(direction);
        
        // 检查是否可通行
        if map.gc_can_walk(&new_pos) {
            self.position = new_pos;
            
            // 检查新位置是否有可交互物
            let tile = map.gc_get_tile(&new_pos);
            let interactable = tile
                .filter(|t| t.gc_is_interactable())
                .map(|t| t.tile_type);
            
            (true, interactable)
        } else {
            (false, None)
        }
    }
    
    /// 传送到指定位置
    pub fn gc_teleport(&mut self, map_id: &str, position: GcPosition) {
        self.current_map_id = map_id.to_string();
        self.position = position;
    }
    
    /// 获取面前的位置
    pub fn gc_get_facing_position(&self) -> GcPosition {
        self.position.gc_move(self.direction)
    }
    
    /// 检查面前是否有可交互物
    pub fn gc_check_interaction(&self, map: &GcMap) -> Option<(GcTileType, Option<String>)> {
        let facing = self.gc_get_facing_position();
        map.gc_get_tile(&facing)
            .filter(|t| t.gc_is_interactable())
            .map(|t| (t.tile_type, t.entity_id.clone()))
    }
}

// =============================================================================
// 移动结果
// =============================================================================

/// 移动结果
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcMoveResult {
    /// 是否移动成功
    pub success: bool,
    /// 新位置
    pub new_position: GcPosition,
    /// 触发的交互类型
    pub interaction: Option<GcInteraction>,
}

/// 交互类型
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum GcInteraction {
    /// 遇到传送门
    Portal { portal_id: String },
    /// 遇到 NPC
    Npc { npc_id: String },
    /// 遇到怪物
    Monster { monster_id: String },
    /// 遇到宝箱
    Chest { chest_id: String },
}

// =============================================================================
// 地图世界管理器
// =============================================================================

/// 世界管理器 - 管理多个地图和玩家
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcWorld {
    /// 所有地图
    pub maps: Vec<GcMap>,
    /// 所有地图上的玩家
    pub players: Vec<GcMapPlayer>,
}

impl GcWorld {
    /// 创建新世界
    pub fn gc_new() -> Self {
        Self {
            maps: Vec::new(),
            players: Vec::new(),
        }
    }
    
    /// 添加地图
    pub fn gc_add_map(&mut self, map: GcMap) {
        self.maps.push(map);
    }
    
    /// 获取地图
    pub fn gc_get_map(&self, map_id: &str) -> Option<&GcMap> {
        self.maps.iter().find(|m| m.id == map_id)
    }
    
    /// 获取地图 (可变)
    pub fn gc_get_map_mut(&mut self, map_id: &str) -> Option<&mut GcMap> {
        self.maps.iter_mut().find(|m| m.id == map_id)
    }
    
    /// 添加玩家到世界
    pub fn gc_add_player(&mut self, player_id: &str, map_id: &str) -> Result<(), String> {
        // 检查地图是否存在
        let map = self.gc_get_map(map_id).ok_or("地图不存在")?;
        let spawn = map.spawn_point;
        
        // 检查玩家是否已存在
        if self.players.iter().any(|p| p.player_id == player_id) {
            return Err("玩家已在世界中".to_string());
        }
        
        let player = GcMapPlayer::gc_new(player_id, map_id, spawn);
        self.players.push(player);
        Ok(())
    }
    
    /// 获取玩家状态
    pub fn gc_get_player(&self, player_id: &str) -> Option<&GcMapPlayer> {
        self.players.iter().find(|p| p.player_id == player_id)
    }
    
    /// 获取玩家状态 (可变)
    pub fn gc_get_player_mut(&mut self, player_id: &str) -> Option<&mut GcMapPlayer> {
        self.players.iter_mut().find(|p| p.player_id == player_id)
    }
    
    /// 玩家移动
    pub fn gc_move_player(&mut self, player_id: &str, direction: GcDirection) -> Result<GcMoveResult, String> {
        // 获取玩家
        let player = self.gc_get_player(player_id).ok_or("玩家不存在")?;
        let map_id = player.current_map_id.clone();
        
        // 获取地图
        let map = self.gc_get_map(&map_id).ok_or("地图不存在")?;
        
        // 计算新位置
        let player = self.gc_get_player(player_id).unwrap();
        let new_pos = player.position.gc_move(direction);
        
        // 检查是否可通行
        let can_walk = map.gc_can_walk(&new_pos);
        
        // 检查交互
        let interaction = if can_walk {
            map.gc_get_tile(&new_pos)
                .filter(|t| t.gc_is_interactable())
                .and_then(|t| {
                    let entity_id = t.entity_id.clone()?;
                    Some(match t.tile_type {
                        GcTileType::Portal => GcInteraction::Portal { portal_id: entity_id },
                        GcTileType::Npc => GcInteraction::Npc { npc_id: entity_id },
                        GcTileType::Monster => GcInteraction::Monster { monster_id: entity_id },
                        GcTileType::Chest => GcInteraction::Chest { chest_id: entity_id },
                        _ => return None,
                    })
                })
        } else {
            None
        };
        
        // 更新玩家位置
        let player = self.gc_get_player_mut(player_id).unwrap();
        player.direction = direction;
        
        if can_walk {
            player.position = new_pos;
        }
        
        Ok(GcMoveResult {
            success: can_walk,
            new_position: if can_walk { new_pos } else { player.position },
            interaction,
        })
    }
    
    /// 玩家传送
    pub fn gc_teleport_player(&mut self, player_id: &str, map_id: &str, position: GcPosition) -> Result<(), String> {
        // 检查目标地图是否存在
        if self.gc_get_map(map_id).is_none() {
            return Err("目标地图不存在".to_string());
        }
        
        // 获取玩家并传送
        let player = self.gc_get_player_mut(player_id).ok_or("玩家不存在")?;
        player.gc_teleport(map_id, position);
        
        Ok(())
    }
}

impl Default for GcWorld {
    fn default() -> Self {
        Self::gc_new()
    }
}

// =============================================================================
// 测试
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    fn create_test_map() -> GcMap {
        let mut map = GcMap::gc_new("test_map", "测试地图", 10, 10);
        
        // 添加一些障碍物
        map.gc_set_tile(&GcPosition::gc_new(3, 3), GcTileType::Wall);
        map.gc_set_tile(&GcPosition::gc_new(4, 3), GcTileType::Wall);
        map.gc_set_tile(&GcPosition::gc_new(5, 3), GcTileType::Wall);
        
        // 添加 NPC
        map.gc_place_entity(&GcPosition::gc_new(7, 7), GcTileType::Npc, "npc_shop");
        
        // 设置出生点
        map.gc_set_spawn(GcPosition::gc_new(1, 1));
        
        map
    }
    
    #[test]
    fn test_gc_map_player_move() {
        let map = create_test_map();
        let mut player = GcMapPlayer::gc_new("player1", "test_map", GcPosition::gc_new(1, 1));
        
        // 向右移动
        let (success, _) = player.gc_try_move(GcDirection::Right, &map);
        assert!(success);
        assert_eq!(player.position, GcPosition::gc_new(2, 1));
        
        // 向下移动
        let (success, _) = player.gc_try_move(GcDirection::Down, &map);
        assert!(success);
        assert_eq!(player.position, GcPosition::gc_new(2, 2));
    }
    
    #[test]
    fn test_gc_map_player_collision() {
        let map = create_test_map();
        let mut player = GcMapPlayer::gc_new("player1", "test_map", GcPosition::gc_new(3, 2));
        
        // 向下移动应该被墙挡住
        let (success, _) = player.gc_try_move(GcDirection::Down, &map);
        assert!(!success);
        assert_eq!(player.position, GcPosition::gc_new(3, 2)); // 位置不变
    }
    
    #[test]
    fn test_gc_world() {
        let mut world = GcWorld::gc_new();
        
        // 添加地图
        world.gc_add_map(create_test_map());
        
        // 添加玩家
        let result = world.gc_add_player("player1", "test_map");
        assert!(result.is_ok());
        
        // 检查玩家在出生点
        let player = world.gc_get_player("player1").unwrap();
        assert_eq!(player.position, GcPosition::gc_new(1, 1));
        
        // 移动玩家
        let result = world.gc_move_player("player1", GcDirection::Right);
        assert!(result.is_ok());
        assert!(result.unwrap().success);
    }
    
    #[test]
    fn test_gc_world_interaction() {
        let mut world = GcWorld::gc_new();
        world.gc_add_map(create_test_map());
        world.gc_add_player("player1", "test_map").unwrap();
        
        // 传送到 NPC 附近
        world.gc_teleport_player("player1", "test_map", GcPosition::gc_new(6, 7)).unwrap();
        
        // 向右移动到 NPC 位置
        let result = world.gc_move_player("player1", GcDirection::Right).unwrap();
        
        assert!(result.success);
        assert!(matches!(result.interaction, Some(GcInteraction::Npc { .. })));
    }
}
