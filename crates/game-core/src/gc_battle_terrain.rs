//! 战斗地形系统
//!
//! 模块: game-core (共享核心)
//! 前缀: Gc
//! 功能: 战场地形类型、地形生成、Buff/Debuff 效果
//!
//! 地形由三个因素决定:
//! 1. 大世界当前位置的地形 (基础权重)
//! 2. 遭遇敌人的类型 (修正权重)
//! 3. 随机因子 (最终抽取)

use serde::{Deserialize, Serialize};

// =============================================================================
// 地形类型
// =============================================================================

/// 战场地形类型
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash, Default)]
pub enum GcTerrainType {
    /// 平原 - 无特殊效果
    #[default]
    Plain,
    /// 火山 - 火属性怪兽 ATK+20%，水属性 ATK-10%
    Volcano,
    /// 冰原 - 水属性怪兽 DEF+20%，火属性 DEF-10%
    Glacier,
    /// 海洋 - 水属性怪兽全属性+10%，火属性 ATK-20%
    Ocean,
    /// 沼泽 - 所有怪兽每回合受到 5% 最大HP 伤害
    Swamp,
    /// 暗域 - 暗属性怪兽 ATK+30%，光属性怪兽受到额外伤害
    Shadow,
    /// 圣域 - 光属性怪兽 DEF+30%，暗属性怪兽 ATK-20%
    Holy,
    /// 森林 - 风/地属性怪兽回复效果+20%
    Forest,
    /// 山岳 - 地属性怪兽 DEF+25%，风属性怪兽闪避+10%
    Mountain,
}

impl GcTerrainType {
    /// 获取地形名称
    pub fn name(&self) -> &'static str {
        match self {
            GcTerrainType::Plain => "平原",
            GcTerrainType::Volcano => "火山",
            GcTerrainType::Glacier => "冰原",
            GcTerrainType::Ocean => "海洋",
            GcTerrainType::Swamp => "沼泽",
            GcTerrainType::Shadow => "暗域",
            GcTerrainType::Holy => "圣域",
            GcTerrainType::Forest => "森林",
            GcTerrainType::Mountain => "山岳",
        }
    }

    /// 获取地形颜色 (用于前端渲染，RGBA 格式)
    pub fn color(&self) -> (u8, u8, u8, u8) {
        match self {
            GcTerrainType::Plain => (144, 238, 144, 255),    // 浅绿
            GcTerrainType::Volcano => (255, 69, 0, 255),     // 红橙
            GcTerrainType::Glacier => (173, 216, 230, 255),  // 浅蓝
            GcTerrainType::Ocean => (0, 105, 148, 255),      // 深蓝
            GcTerrainType::Swamp => (85, 107, 47, 255),      // 暗橄榄绿
            GcTerrainType::Shadow => (48, 25, 52, 255),      // 暗紫
            GcTerrainType::Holy => (255, 255, 224, 255),     // 浅黄
            GcTerrainType::Forest => (34, 139, 34, 255),     // 森林绿
            GcTerrainType::Mountain => (139, 137, 137, 255), // 灰色
        }
    }

    /// 获取所有地形类型
    pub fn all() -> &'static [GcTerrainType] {
        &[
            GcTerrainType::Plain,
            GcTerrainType::Volcano,
            GcTerrainType::Glacier,
            GcTerrainType::Ocean,
            GcTerrainType::Swamp,
            GcTerrainType::Shadow,
            GcTerrainType::Holy,
            GcTerrainType::Forest,
            GcTerrainType::Mountain,
        ]
    }
}

// =============================================================================
// 怪兽属性 (用于地形亲和计算)
// =============================================================================

/// 怪兽属性类型
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash, Default)]
pub enum GcMonsterAttribute {
    /// 无属性
    #[default]
    None,
    /// 火属性
    Fire,
    /// 水属性
    Water,
    /// 风属性
    Wind,
    /// 地属性
    Earth,
    /// 光属性
    Light,
    /// 暗属性
    Dark,
}

impl GcMonsterAttribute {
    /// 获取属性名称
    pub fn name(&self) -> &'static str {
        match self {
            GcMonsterAttribute::None => "无",
            GcMonsterAttribute::Fire => "火",
            GcMonsterAttribute::Water => "水",
            GcMonsterAttribute::Wind => "风",
            GcMonsterAttribute::Earth => "地",
            GcMonsterAttribute::Light => "光",
            GcMonsterAttribute::Dark => "暗",
        }
    }

    /// 获取属性颜色 (用于前端显示)
    pub fn color(&self) -> (u8, u8, u8, u8) {
        match self {
            GcMonsterAttribute::None => (128, 128, 128, 255),  // 灰色
            GcMonsterAttribute::Fire => (255, 69, 0, 255),     // 红橙
            GcMonsterAttribute::Water => (30, 144, 255, 255),  // 道奇蓝
            GcMonsterAttribute::Wind => (144, 238, 144, 255),  // 浅绿
            GcMonsterAttribute::Earth => (139, 90, 43, 255),   // 棕色
            GcMonsterAttribute::Light => (255, 255, 0, 255),   // 黄色
            GcMonsterAttribute::Dark => (75, 0, 130, 255),     // 靛蓝
        }
    }
}

// =============================================================================
// 地形修正效果
// =============================================================================

/// 地形对怪兽的属性修正
#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct GcTerrainModifier {
    /// 攻击力修正百分比 (正数增加，负数减少，100 = +100%)
    pub atk_percent: i32,
    /// 防御力修正百分比
    pub def_percent: i32,
    /// 每回合 HP 变化 (正数回复，负数伤害，基于最大HP百分比)
    pub hp_per_turn_percent: i32,
    /// 闪避率修正 (万分比)
    pub dodge_bonus: i32,
    /// 额外受到伤害百分比 (正数增加受伤)
    pub damage_taken_percent: i32,
    /// 回复效果修正百分比
    pub healing_bonus_percent: i32,
}

impl GcTerrainModifier {
    /// 无修正
    pub fn none() -> Self {
        Self::default()
    }

    /// 应用攻击力修正
    pub fn apply_atk(&self, base_atk: u32) -> u32 {
        let modified = base_atk as i64 * (100 + self.atk_percent as i64) / 100;
        modified.max(1) as u32
    }

    /// 应用防御力修正
    pub fn apply_def(&self, base_def: u32) -> u32 {
        let modified = base_def as i64 * (100 + self.def_percent as i64) / 100;
        modified.max(0) as u32
    }

    /// 计算每回合 HP 变化量
    pub fn calc_hp_change(&self, max_hp: u32) -> i32 {
        (max_hp as i64 * self.hp_per_turn_percent as i64 / 100) as i32
    }
}

/// 获取指定地形对指定属性怪兽的修正效果
pub fn gc_get_terrain_modifier(terrain: GcTerrainType, attribute: GcMonsterAttribute) -> GcTerrainModifier {
    use GcTerrainType::*;
    use GcMonsterAttribute::*;

    match (terrain, attribute) {
        // 平原 - 无效果
        (Plain, _) => GcTerrainModifier::none(),

        // 火山 - 火属性增益，水属性减益
        (Volcano, Fire) => GcTerrainModifier {
            atk_percent: 20,
            ..Default::default()
        },
        (Volcano, Water) => GcTerrainModifier {
            atk_percent: -10,
            ..Default::default()
        },

        // 冰原 - 水属性增益，火属性减益
        (Glacier, Water) => GcTerrainModifier {
            def_percent: 20,
            ..Default::default()
        },
        (Glacier, Fire) => GcTerrainModifier {
            def_percent: -10,
            ..Default::default()
        },

        // 海洋 - 水属性全面增益，火属性大幅减益
        (Ocean, Water) => GcTerrainModifier {
            atk_percent: 10,
            def_percent: 10,
            ..Default::default()
        },
        (Ocean, Fire) => GcTerrainModifier {
            atk_percent: -20,
            ..Default::default()
        },

        // 沼泽 - 所有怪兽持续伤害
        (Swamp, _) => GcTerrainModifier {
            hp_per_turn_percent: -5,
            ..Default::default()
        },

        // 暗域 - 暗属性增益，光属性受额外伤害
        (Shadow, Dark) => GcTerrainModifier {
            atk_percent: 30,
            ..Default::default()
        },
        (Shadow, Light) => GcTerrainModifier {
            damage_taken_percent: 20,
            ..Default::default()
        },

        // 圣域 - 光属性增益，暗属性减益
        (Holy, Light) => GcTerrainModifier {
            def_percent: 30,
            ..Default::default()
        },
        (Holy, Dark) => GcTerrainModifier {
            atk_percent: -20,
            ..Default::default()
        },

        // 森林 - 风/地属性回复增益
        (Forest, Wind) | (Forest, Earth) => GcTerrainModifier {
            healing_bonus_percent: 20,
            ..Default::default()
        },

        // 山岳 - 地属性防御增益，风属性闪避增益
        (Mountain, Earth) => GcTerrainModifier {
            def_percent: 25,
            ..Default::default()
        },
        (Mountain, Wind) => GcTerrainModifier {
            dodge_bonus: 1000, // 10% 闪避 (万分比)
            ..Default::default()
        },

        // 其他组合无特殊效果
        _ => GcTerrainModifier::none(),
    }
}

// =============================================================================
// 地形生成
// =============================================================================

/// 大世界地形类型 (影响战斗地形生成概率)
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Default)]
pub enum GcWorldTerrainType {
    /// 草原
    #[default]
    Grassland,
    /// 沙漠
    Desert,
    /// 雪地
    Snowfield,
    /// 水域
    Waterside,
    /// 山地
    Highland,
    /// 森林
    Woodland,
    /// 洞穴
    Cave,
    /// 遗迹
    Ruins,
}

/// 敌人类型 (影响战斗地形生成概率)
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Default)]
pub enum GcEnemyType {
    /// 普通怪物
    #[default]
    Normal,
    /// 火系怪物
    FireType,
    /// 水系怪物
    WaterType,
    /// 暗系怪物
    DarkType,
    /// 光系怪物
    LightType,
    /// Boss
    Boss,
}

/// 地形权重配置
#[derive(Clone, Debug)]
pub struct GcTerrainWeight {
    pub terrain: GcTerrainType,
    pub weight: u32,
}

/// 根据大世界地形获取战斗地形基础权重
pub fn gc_get_base_terrain_weights(world_terrain: GcWorldTerrainType) -> Vec<GcTerrainWeight> {
    use GcTerrainType::*;
    use GcWorldTerrainType::*;

    match world_terrain {
        Grassland => vec![
            GcTerrainWeight { terrain: Plain, weight: 60 },
            GcTerrainWeight { terrain: Forest, weight: 30 },
            GcTerrainWeight { terrain: Mountain, weight: 10 },
        ],
        Desert => vec![
            GcTerrainWeight { terrain: Plain, weight: 30 },
            GcTerrainWeight { terrain: Volcano, weight: 50 },
            GcTerrainWeight { terrain: Mountain, weight: 20 },
        ],
        Snowfield => vec![
            GcTerrainWeight { terrain: Glacier, weight: 60 },
            GcTerrainWeight { terrain: Plain, weight: 20 },
            GcTerrainWeight { terrain: Mountain, weight: 20 },
        ],
        Waterside => vec![
            GcTerrainWeight { terrain: Ocean, weight: 50 },
            GcTerrainWeight { terrain: Swamp, weight: 30 },
            GcTerrainWeight { terrain: Plain, weight: 20 },
        ],
        Highland => vec![
            GcTerrainWeight { terrain: Mountain, weight: 60 },
            GcTerrainWeight { terrain: Plain, weight: 20 },
            GcTerrainWeight { terrain: Volcano, weight: 20 },
        ],
        Woodland => vec![
            GcTerrainWeight { terrain: Forest, weight: 70 },
            GcTerrainWeight { terrain: Swamp, weight: 20 },
            GcTerrainWeight { terrain: Plain, weight: 10 },
        ],
        Cave => vec![
            GcTerrainWeight { terrain: Shadow, weight: 50 },
            GcTerrainWeight { terrain: Mountain, weight: 30 },
            GcTerrainWeight { terrain: Swamp, weight: 20 },
        ],
        Ruins => vec![
            GcTerrainWeight { terrain: Shadow, weight: 30 },
            GcTerrainWeight { terrain: Holy, weight: 30 },
            GcTerrainWeight { terrain: Plain, weight: 40 },
        ],
    }
}

/// 根据敌人类型修正地形权重
pub fn gc_apply_enemy_modifier(weights: &mut Vec<GcTerrainWeight>, enemy_type: GcEnemyType) {
    use GcTerrainType::*;
    use GcEnemyType::*;

    let (boost_terrain, boost_amount) = match enemy_type {
        Normal => return, // 普通敌人不修正
        FireType => (Volcano, 30),
        WaterType => (Ocean, 30),
        DarkType => (Shadow, 40),
        LightType => (Holy, 40),
        Boss => (Shadow, 20), // Boss 倾向暗域
    };

    // 查找并增加权重，或添加新项
    let mut found = false;
    for w in weights.iter_mut() {
        if w.terrain == boost_terrain {
            w.weight += boost_amount;
            found = true;
            break;
        }
    }
    if !found {
        weights.push(GcTerrainWeight {
            terrain: boost_terrain,
            weight: boost_amount,
        });
    }
}

/// 根据随机种子选择地形
/// 
/// # Arguments
/// * `weights` - 地形权重列表
/// * `random_value` - 0-99 范围的随机值 (由调用方提供)
/// 
/// # Returns
/// 选中的地形类型
pub fn gc_select_terrain(weights: &[GcTerrainWeight], random_value: u32) -> GcTerrainType {
    let total: u32 = weights.iter().map(|w| w.weight).sum();
    if total == 0 {
        return GcTerrainType::Plain;
    }

    let threshold = random_value % total;
    let mut accumulated = 0;

    for w in weights {
        accumulated += w.weight;
        if threshold < accumulated {
            return w.terrain;
        }
    }

    // 默认返回平原
    GcTerrainType::Plain
}

/// 生成战斗地形 (完整流程)
/// 
/// # Arguments
/// * `world_terrain` - 大世界当前地形
/// * `enemy_type` - 遭遇的敌人类型
/// * `random_seed` - 随机种子 (由调用方提供)
/// 
/// # Returns
/// (玩家区域地形, 敌人区域地形)
pub fn gc_generate_battle_terrain(
    world_terrain: GcWorldTerrainType,
    enemy_type: GcEnemyType,
    random_seed: u64,
) -> (GcTerrainType, GcTerrainType) {
    let mut weights = gc_get_base_terrain_weights(world_terrain);
    gc_apply_enemy_modifier(&mut weights, enemy_type);

    // 使用种子生成两个随机值
    let player_random = (random_seed % 100) as u32;
    let enemy_random = ((random_seed / 100) % 100) as u32;

    let player_terrain = gc_select_terrain(&weights, player_random);
    let enemy_terrain = gc_select_terrain(&weights, enemy_random);

    (player_terrain, enemy_terrain)
}

// =============================================================================
// 测试
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_terrain_modifier_fire_in_volcano() {
        let modifier = gc_get_terrain_modifier(GcTerrainType::Volcano, GcMonsterAttribute::Fire);
        assert_eq!(modifier.atk_percent, 20);
        
        // 测试应用修正
        let base_atk = 100;
        let modified_atk = modifier.apply_atk(base_atk);
        assert_eq!(modified_atk, 120);
    }

    #[test]
    fn test_terrain_modifier_water_in_volcano() {
        let modifier = gc_get_terrain_modifier(GcTerrainType::Volcano, GcMonsterAttribute::Water);
        assert_eq!(modifier.atk_percent, -10);
        
        let base_atk = 100;
        let modified_atk = modifier.apply_atk(base_atk);
        assert_eq!(modified_atk, 90);
    }

    #[test]
    fn test_swamp_damage() {
        let modifier = gc_get_terrain_modifier(GcTerrainType::Swamp, GcMonsterAttribute::Fire);
        let hp_change = modifier.calc_hp_change(100);
        assert_eq!(hp_change, -5); // 5% of 100 = 5 damage
    }

    #[test]
    fn test_terrain_generation() {
        let (player, enemy) = gc_generate_battle_terrain(
            GcWorldTerrainType::Grassland,
            GcEnemyType::Normal,
            42,
        );
        // 应该生成有效地形
        assert!(matches!(player, GcTerrainType::Plain | GcTerrainType::Forest | GcTerrainType::Mountain));
        assert!(matches!(enemy, GcTerrainType::Plain | GcTerrainType::Forest | GcTerrainType::Mountain));
    }

    #[test]
    fn test_fire_enemy_boosts_volcano() {
        let mut weights = gc_get_base_terrain_weights(GcWorldTerrainType::Grassland);
        gc_apply_enemy_modifier(&mut weights, GcEnemyType::FireType);
        
        // 应该添加了火山权重
        let volcano_weight = weights.iter().find(|w| w.terrain == GcTerrainType::Volcano);
        assert!(volcano_weight.is_some());
        assert_eq!(volcano_weight.unwrap().weight, 30);
    }
}
