//! 世界地图系统
//!
//! 模块: game-core
//! 前缀: Gc
//! 文档: 文档/01-game-core.md
//!
//! 实现世界地图机制：
//! - 瓦片类型 (草地、水、墙壁等)
//! - 坐标系统
//! - 地图结构 (二维网格)

use serde::{Deserialize, Serialize};

// =============================================================================
// 坐标系统
// =============================================================================

/// 2D 坐标
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct GcPosition {
    pub x: i32,
    pub y: i32,
}

impl GcPosition {
    /// 创建新坐标
    pub fn gc_new(x: i32, y: i32) -> Self {
        Self { x, y }
    }
    
    /// 原点
    pub fn gc_zero() -> Self {
        Self { x: 0, y: 0 }
    }
    
    /// 计算与另一坐标的距离 (曼哈顿距离)
    pub fn gc_distance(&self, other: &GcPosition) -> u32 {
        ((self.x - other.x).abs() + (self.y - other.y).abs()) as u32
    }
    
    /// 向指定方向移动
    pub fn gc_move(&self, direction: GcDirection) -> GcPosition {
        let (dx, dy) = direction.gc_delta();
        GcPosition {
            x: self.x + dx,
            y: self.y + dy,
        }
    }
}

/// 移动方向
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]
pub enum GcDirection {
    Up,
    Down,
    Left,
    Right,
}

impl GcDirection {
    /// 获取方向对应的位移
    pub fn gc_delta(&self) -> (i32, i32) {
        match self {
            GcDirection::Up => (0, -1),
            GcDirection::Down => (0, 1),
            GcDirection::Left => (-1, 0),
            GcDirection::Right => (1, 0),
        }
    }
    
    /// 获取相反方向
    pub fn gc_opposite(&self) -> GcDirection {
        match self {
            GcDirection::Up => GcDirection::Down,
            GcDirection::Down => GcDirection::Up,
            GcDirection::Left => GcDirection::Right,
            GcDirection::Right => GcDirection::Left,
        }
    }
}

// =============================================================================
// 瓦片类型
// =============================================================================

/// 地图瓦片类型
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]
pub enum GcTileType {
    /// 草地 (可通行)
    Grass,
    /// 泥土路 (可通行)
    Dirt,
    /// 石板路 (可通行)
    Stone,
    /// 水 (不可通行)
    Water,
    /// 墙壁 (不可通行)
    Wall,
    /// 树木 (不可通行)
    Tree,
    /// 建筑 (不可通行)
    Building,
    /// 传送门 (可通行，可交互)
    Portal,
    /// NPC 位置 (可通行，可交互)
    Npc,
    /// 宝箱 (可通行，可交互)
    Chest,
    /// 怪物点 (可通行，可交互)
    Monster,
}

impl GcTileType {
    /// 是否可通行
    pub fn gc_is_walkable(&self) -> bool {
        match self {
            GcTileType::Grass => true,
            GcTileType::Dirt => true,
            GcTileType::Stone => true,
            GcTileType::Water => false,
            GcTileType::Wall => false,
            GcTileType::Tree => false,
            GcTileType::Building => false,
            GcTileType::Portal => true,
            GcTileType::Npc => true,
            GcTileType::Chest => true,
            GcTileType::Monster => true,
        }
    }
    
    /// 是否可交互
    pub fn gc_is_interactable(&self) -> bool {
        match self {
            GcTileType::Portal => true,
            GcTileType::Npc => true,
            GcTileType::Chest => true,
            GcTileType::Monster => true,
            _ => false,
        }
    }
    
    /// 获取显示字符 (用于调试/ASCII渲染)
    pub fn gc_char(&self) -> char {
        match self {
            GcTileType::Grass => '.',
            GcTileType::Dirt => ',',
            GcTileType::Stone => '#',
            GcTileType::Water => '~',
            GcTileType::Wall => '█',
            GcTileType::Tree => '♣',
            GcTileType::Building => '⌂',
            GcTileType::Portal => '◎',
            GcTileType::Npc => '☺',
            GcTileType::Chest => '■',
            GcTileType::Monster => '◆',
        }
    }
    
    /// 获取颜色 (RGB)
    pub fn gc_color(&self) -> (u8, u8, u8) {
        match self {
            GcTileType::Grass => (74, 222, 128),    // 绿色
            GcTileType::Dirt => (168, 162, 158),    // 灰棕色
            GcTileType::Stone => (156, 163, 175),   // 灰色
            GcTileType::Water => (56, 189, 248),    // 蓝色
            GcTileType::Wall => (107, 114, 128),    // 深灰
            GcTileType::Tree => (34, 197, 94),      // 深绿
            GcTileType::Building => (251, 191, 36), // 金色
            GcTileType::Portal => (168, 85, 247),   // 紫色
            GcTileType::Npc => (251, 191, 36),      // 金色
            GcTileType::Chest => (251, 191, 36),    // 金色
            GcTileType::Monster => (239, 68, 68),   // 红色
        }
    }
}

// =============================================================================
// 地图瓦片
// =============================================================================

/// 地图瓦片
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcTile {
    /// 瓦片类型
    pub tile_type: GcTileType,
    /// 关联实体 ID (传送门/NPC/怪物等)
    pub entity_id: Option<String>,
    /// 是否已被探索
    pub explored: bool,
    /// 是否可见 (战争迷雾)
    pub visible: bool,
}

impl GcTile {
    /// 创建基础瓦片
    pub fn gc_new(tile_type: GcTileType) -> Self {
        Self {
            tile_type,
            entity_id: None,
            explored: false,
            visible: false,
        }
    }
    
    /// 创建带实体的瓦片
    pub fn gc_with_entity(tile_type: GcTileType, entity_id: &str) -> Self {
        Self {
            tile_type,
            entity_id: Some(entity_id.to_string()),
            explored: false,
            visible: false,
        }
    }
    
    /// 是否可通行
    pub fn gc_is_walkable(&self) -> bool {
        self.tile_type.gc_is_walkable()
    }
    
    /// 是否可交互
    pub fn gc_is_interactable(&self) -> bool {
        self.tile_type.gc_is_interactable()
    }
}

// =============================================================================
// 地图
// =============================================================================

/// 游戏地图
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcMap {
    /// 地图 ID
    pub id: String,
    /// 地图名称
    pub name: String,
    /// 地图宽度
    pub width: usize,
    /// 地图高度
    pub height: usize,
    /// 瓦片数据 (按行存储: tiles[y][x])
    pub tiles: Vec<Vec<GcTile>>,
    /// 出生点
    pub spawn_point: GcPosition,
}

impl GcMap {
    /// 创建空地图 (全草地)
    pub fn gc_new(id: &str, name: &str, width: usize, height: usize) -> Self {
        let tiles = (0..height)
            .map(|_| {
                (0..width)
                    .map(|_| GcTile::gc_new(GcTileType::Grass))
                    .collect()
            })
            .collect();
        
        Self {
            id: id.to_string(),
            name: name.to_string(),
            width,
            height,
            tiles,
            spawn_point: GcPosition::gc_new(width as i32 / 2, height as i32 / 2),
        }
    }
    
    /// 检查坐标是否在地图范围内
    pub fn gc_is_valid(&self, pos: &GcPosition) -> bool {
        pos.x >= 0 && pos.y >= 0 
            && (pos.x as usize) < self.width 
            && (pos.y as usize) < self.height
    }
    
    /// 获取指定位置的瓦片
    pub fn gc_get_tile(&self, pos: &GcPosition) -> Option<&GcTile> {
        if self.gc_is_valid(pos) {
            Some(&self.tiles[pos.y as usize][pos.x as usize])
        } else {
            None
        }
    }
    
    /// 获取指定位置的瓦片 (可变)
    pub fn gc_get_tile_mut(&mut self, pos: &GcPosition) -> Option<&mut GcTile> {
        if self.gc_is_valid(pos) {
            Some(&mut self.tiles[pos.y as usize][pos.x as usize])
        } else {
            None
        }
    }
    
    /// 设置瓦片类型
    pub fn gc_set_tile(&mut self, pos: &GcPosition, tile_type: GcTileType) -> bool {
        if let Some(tile) = self.gc_get_tile_mut(pos) {
            tile.tile_type = tile_type;
            true
        } else {
            false
        }
    }
    
    /// 放置实体
    pub fn gc_place_entity(&mut self, pos: &GcPosition, tile_type: GcTileType, entity_id: &str) -> bool {
        if let Some(tile) = self.gc_get_tile_mut(pos) {
            tile.tile_type = tile_type;
            tile.entity_id = Some(entity_id.to_string());
            true
        } else {
            false
        }
    }
    
    /// 检查位置是否可通行
    pub fn gc_can_walk(&self, pos: &GcPosition) -> bool {
        self.gc_get_tile(pos)
            .map(|t| t.gc_is_walkable())
            .unwrap_or(false)
    }
    
    /// 设置出生点
    pub fn gc_set_spawn(&mut self, pos: GcPosition) {
        self.spawn_point = pos;
    }
    
    /// 填充矩形区域
    pub fn gc_fill_rect(&mut self, x: i32, y: i32, w: usize, h: usize, tile_type: GcTileType) {
        for dy in 0..h {
            for dx in 0..w {
                let pos = GcPosition::gc_new(x + dx as i32, y + dy as i32);
                self.gc_set_tile(&pos, tile_type);
            }
        }
    }
    
    /// 绘制水平线
    pub fn gc_draw_h_line(&mut self, x: i32, y: i32, length: usize, tile_type: GcTileType) {
        for dx in 0..length {
            let pos = GcPosition::gc_new(x + dx as i32, y);
            self.gc_set_tile(&pos, tile_type);
        }
    }
    
    /// 绘制垂直线
    pub fn gc_draw_v_line(&mut self, x: i32, y: i32, length: usize, tile_type: GcTileType) {
        for dy in 0..length {
            let pos = GcPosition::gc_new(x, y + dy as i32);
            self.gc_set_tile(&pos, tile_type);
        }
    }
    
    /// 转换为 ASCII 字符串 (调试用)
    pub fn gc_to_ascii(&self) -> String {
        let mut result = String::new();
        for row in &self.tiles {
            for tile in row {
                result.push(tile.tile_type.gc_char());
            }
            result.push('\n');
        }
        result
    }
}

// =============================================================================
// 测试
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_gc_position() {
        let pos1 = GcPosition::gc_new(0, 0);
        let pos2 = GcPosition::gc_new(3, 4);
        
        assert_eq!(pos1.gc_distance(&pos2), 7);
        
        let moved = pos1.gc_move(GcDirection::Right);
        assert_eq!(moved.x, 1);
        assert_eq!(moved.y, 0);
    }
    
    #[test]
    fn test_gc_tile_type() {
        assert!(GcTileType::Grass.gc_is_walkable());
        assert!(!GcTileType::Water.gc_is_walkable());
        assert!(!GcTileType::Wall.gc_is_walkable());
        
        assert!(GcTileType::Portal.gc_is_interactable());
        assert!(GcTileType::Npc.gc_is_interactable());
        assert!(!GcTileType::Grass.gc_is_interactable());
    }
    
    #[test]
    fn test_gc_map_new() {
        let map = GcMap::gc_new("test", "测试地图", 10, 10);
        
        assert_eq!(map.width, 10);
        assert_eq!(map.height, 10);
        assert_eq!(map.spawn_point, GcPosition::gc_new(5, 5));
        
        // 检查所有瓦片都是草地
        for row in &map.tiles {
            for tile in row {
                assert_eq!(tile.tile_type, GcTileType::Grass);
            }
        }
    }
    
    #[test]
    fn test_gc_map_set_tile() {
        let mut map = GcMap::gc_new("test", "测试地图", 10, 10);
        
        let pos = GcPosition::gc_new(5, 5);
        map.gc_set_tile(&pos, GcTileType::Water);
        
        let tile = map.gc_get_tile(&pos).unwrap();
        assert_eq!(tile.tile_type, GcTileType::Water);
        assert!(!map.gc_can_walk(&pos));
    }
    
    #[test]
    fn test_gc_map_place_entity() {
        let mut map = GcMap::gc_new("test", "测试地图", 10, 10);
        
        let pos = GcPosition::gc_new(3, 3);
        map.gc_place_entity(&pos, GcTileType::Npc, "npc_shop_1");
        
        let tile = map.gc_get_tile(&pos).unwrap();
        assert_eq!(tile.tile_type, GcTileType::Npc);
        assert_eq!(tile.entity_id, Some("npc_shop_1".to_string()));
    }
    
    #[test]
    fn test_gc_map_fill_rect() {
        let mut map = GcMap::gc_new("test", "测试地图", 10, 10);
        
        // 填充一个 3x3 的水池
        map.gc_fill_rect(2, 2, 3, 3, GcTileType::Water);
        
        // 检查水池区域
        for y in 2..5 {
            for x in 2..5 {
                let pos = GcPosition::gc_new(x, y);
                assert_eq!(map.gc_get_tile(&pos).unwrap().tile_type, GcTileType::Water);
            }
        }
        
        // 检查水池外是草地
        let outside = GcPosition::gc_new(0, 0);
        assert_eq!(map.gc_get_tile(&outside).unwrap().tile_type, GcTileType::Grass);
    }
}
