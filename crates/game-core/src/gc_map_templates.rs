//! 预设地图模板
//!
//! 模块: game-core
//! 前缀: gc_
//! 文档: 文档/01-game-core.md
//!
//! 提供预设的游戏地图：
//! - 主城 (商店、NPC)
//! - 森林 (普通怪物)
//! - 副本入口 (Boss 战)

use crate::{GcMap, GcPosition, GcTileType, GcWorld};

// =============================================================================
// 主城地图
// =============================================================================

/// 创建主城地图
/// 包含：商店NPC、任务NPC、副本入口传送门
pub fn gc_create_town_map() -> GcMap {
    let mut map = GcMap::gc_new("map_town", "幸存者营地", 20, 15);
    
    // 四周围墙
    map.gc_draw_h_line(0, 0, 20, GcTileType::Wall);
    map.gc_draw_h_line(0, 14, 20, GcTileType::Wall);
    map.gc_draw_v_line(0, 0, 15, GcTileType::Wall);
    map.gc_draw_v_line(19, 0, 15, GcTileType::Wall);
    
    // 中央石板路
    map.gc_fill_rect(8, 6, 4, 3, GcTileType::Stone);
    map.gc_draw_h_line(1, 7, 18, GcTileType::Stone);
    map.gc_draw_v_line(10, 1, 13, GcTileType::Stone);
    
    // 左上角 - 商店区域
    map.gc_fill_rect(2, 2, 4, 3, GcTileType::Building);
    map.gc_set_tile(&GcPosition::gc_new(3, 4), GcTileType::Stone); // 商店入口
    map.gc_place_entity(&GcPosition::gc_new(3, 3), GcTileType::Npc, "npc_shop");
    
    // 右上角 - 任务区域
    map.gc_fill_rect(14, 2, 4, 3, GcTileType::Building);
    map.gc_set_tile(&GcPosition::gc_new(16, 4), GcTileType::Stone); // 任务入口
    map.gc_place_entity(&GcPosition::gc_new(16, 3), GcTileType::Npc, "npc_quest");
    
    // 下方 - 传送门区域
    // 左边 - 去森林
    map.gc_place_entity(&GcPosition::gc_new(3, 12), GcTileType::Portal, "portal_forest");
    
    // 中间 - 去副本
    map.gc_place_entity(&GcPosition::gc_new(10, 12), GcTileType::Portal, "portal_dungeon");
    
    // 右边 - 去Boss
    map.gc_place_entity(&GcPosition::gc_new(16, 12), GcTileType::Portal, "portal_boss");
    
    // 装饰 - 树木
    map.gc_set_tile(&GcPosition::gc_new(6, 3), GcTileType::Tree);
    map.gc_set_tile(&GcPosition::gc_new(6, 11), GcTileType::Tree);
    map.gc_set_tile(&GcPosition::gc_new(13, 3), GcTileType::Tree);
    map.gc_set_tile(&GcPosition::gc_new(13, 11), GcTileType::Tree);
    
    // 水池装饰
    map.gc_fill_rect(7, 9, 2, 2, GcTileType::Water);
    
    // 设置出生点
    map.gc_set_spawn(GcPosition::gc_new(10, 7));
    
    map
}

// =============================================================================
// 森林地图
// =============================================================================

/// 创建森林地图
/// 包含：普通怪物、宝箱、回城传送门
pub fn gc_create_forest_map() -> GcMap {
    let mut map = GcMap::gc_new("map_forest", "迷雾森林", 25, 20);
    
    // 基础地形 - 草地 + 随机树木
    let tree_positions = [
        (3, 3), (7, 2), (12, 4), (18, 3), (22, 5),
        (2, 8), (6, 10), (11, 9), (17, 11), (21, 8),
        (4, 15), (9, 17), (15, 16), (20, 18), (23, 14),
        (1, 12), (8, 6), (14, 7), (19, 15), (5, 18),
    ];
    
    for (x, y) in tree_positions {
        map.gc_set_tile(&GcPosition::gc_new(x, y), GcTileType::Tree);
    }
    
    // 小溪 (垂直)
    map.gc_draw_v_line(12, 0, 20, GcTileType::Water);
    // 桥
    map.gc_set_tile(&GcPosition::gc_new(12, 10), GcTileType::Stone);
    
    // 泥土小路
    map.gc_draw_h_line(0, 10, 25, GcTileType::Dirt);
    
    // 怪物点
    let monster_positions = [
        (5, 5, "monster_slime_1"),
        (8, 12, "monster_slime_2"),
        (16, 6, "monster_wolf_1"),
        (20, 13, "monster_wolf_2"),
        (3, 17, "monster_goblin_1"),
    ];
    
    for (x, y, id) in monster_positions {
        map.gc_place_entity(&GcPosition::gc_new(x, y), GcTileType::Monster, id);
    }
    
    // 宝箱
    map.gc_place_entity(&GcPosition::gc_new(22, 2), GcTileType::Chest, "chest_forest_1");
    map.gc_place_entity(&GcPosition::gc_new(2, 18), GcTileType::Chest, "chest_forest_2");
    
    // 回城传送门
    map.gc_place_entity(&GcPosition::gc_new(0, 10), GcTileType::Portal, "portal_town");
    
    // 设置出生点 (入口处)
    map.gc_set_spawn(GcPosition::gc_new(1, 10));
    
    map
}

// =============================================================================
// Boss 副本入口
// =============================================================================

/// 创建 Boss 副本地图
/// 包含：Boss 入口、回城传送门
pub fn gc_create_boss_arena_map() -> GcMap {
    let mut map = GcMap::gc_new("map_boss_arena", "深渊竞技场", 15, 15);
    
    // 圆形竞技场 (简化为方形边界)
    // 外墙
    for x in 0..15 {
        map.gc_set_tile(&GcPosition::gc_new(x, 0), GcTileType::Wall);
        map.gc_set_tile(&GcPosition::gc_new(x, 14), GcTileType::Wall);
    }
    for y in 0..15 {
        map.gc_set_tile(&GcPosition::gc_new(0, y), GcTileType::Wall);
        map.gc_set_tile(&GcPosition::gc_new(14, y), GcTileType::Wall);
    }
    
    // 石板地面
    map.gc_fill_rect(1, 1, 13, 13, GcTileType::Stone);
    
    // 中央 Boss 区域
    map.gc_fill_rect(5, 5, 5, 5, GcTileType::Dirt);
    
    // Boss 入口 (中央)
    map.gc_place_entity(&GcPosition::gc_new(7, 7), GcTileType::Monster, "boss_shadow_lurker");
    
    // 四角装饰 - 火焰 (用特殊标记)
    let corners = [(2, 2), (12, 2), (2, 12), (12, 12)];
    for (x, y) in corners {
        map.gc_set_tile(&GcPosition::gc_new(x, y), GcTileType::Building);
    }
    
    // 回城传送门 (底部入口)
    map.gc_set_tile(&GcPosition::gc_new(7, 14), GcTileType::Stone); // 打开入口
    map.gc_place_entity(&GcPosition::gc_new(7, 13), GcTileType::Portal, "portal_town");
    
    // 设置出生点
    map.gc_set_spawn(GcPosition::gc_new(7, 12));
    
    map
}

// =============================================================================
// 创建完整世界
// =============================================================================

/// 创建包含所有预设地图的完整世界
pub fn gc_create_default_world() -> GcWorld {
    let mut world = GcWorld::gc_new();
    
    // 添加所有地图
    world.gc_add_map(gc_create_town_map());
    world.gc_add_map(gc_create_forest_map());
    world.gc_add_map(gc_create_boss_arena_map());
    
    world
}

// =============================================================================
// 测试
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_gc_town_map() {
        let map = gc_create_town_map();
        
        assert_eq!(map.id, "map_town");
        assert_eq!(map.width, 20);
        assert_eq!(map.height, 15);
        
        // 检查出生点可通行
        assert!(map.gc_can_walk(&map.spawn_point));
        
        // 检查商店 NPC 存在
        let shop_pos = GcPosition::gc_new(3, 3);
        let tile = map.gc_get_tile(&shop_pos).unwrap();
        assert_eq!(tile.tile_type, GcTileType::Npc);
        assert_eq!(tile.entity_id, Some("npc_shop".to_string()));
    }
    
    #[test]
    fn test_gc_forest_map() {
        let map = gc_create_forest_map();
        
        assert_eq!(map.id, "map_forest");
        
        // 检查怪物点存在
        let monster_pos = GcPosition::gc_new(5, 5);
        let tile = map.gc_get_tile(&monster_pos).unwrap();
        assert_eq!(tile.tile_type, GcTileType::Monster);
    }
    
    #[test]
    fn test_gc_boss_arena_map() {
        let map = gc_create_boss_arena_map();
        
        assert_eq!(map.id, "map_boss_arena");
        
        // 检查 Boss 入口存在
        let boss_pos = GcPosition::gc_new(7, 7);
        let tile = map.gc_get_tile(&boss_pos).unwrap();
        assert_eq!(tile.tile_type, GcTileType::Monster);
        assert_eq!(tile.entity_id, Some("boss_shadow_lurker".to_string()));
    }
    
    #[test]
    fn test_gc_default_world() {
        let world = gc_create_default_world();
        
        assert_eq!(world.maps.len(), 3);
        
        // 检查所有地图都存在
        assert!(world.gc_get_map("map_town").is_some());
        assert!(world.gc_get_map("map_forest").is_some());
        assert!(world.gc_get_map("map_boss_arena").is_some());
    }
    
    #[test]
    fn test_gc_map_ascii() {
        let map = gc_create_town_map();
        let ascii = map.gc_to_ascii();
        
        // 应该有内容
        assert!(!ascii.is_empty());
        
        // 打印地图 (调试用)
        println!("主城地图:\n{}", ascii);
    }
}
