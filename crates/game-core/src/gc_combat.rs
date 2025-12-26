//! 怪兽战斗系统
//!
//! 战斗伤害计算、攻击目标选择

use serde::{Deserialize, Serialize};
use crate::{GcMonster, GcTerrainType};

/// 攻击结果
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcAttackOutcome {
    /// 攻击者槽位
    pub attacker_slot: u8,
    /// 目标槽位 (None = 直接攻击玩家)
    pub target_slot: Option<u8>,
    /// 攻击者名称
    pub attacker_name: String,
    /// 目标名称
    pub target_name: Option<String>,
    /// 造成的伤害
    pub damage: u32,
    /// 目标是否被摧毁
    pub target_destroyed: bool,
    /// 攻击者是否被反杀
    pub attacker_destroyed: bool,
    /// 对玩家的直接伤害
    pub player_damage: u32,
}

/// 计算怪兽攻击结果
/// 
/// # Arguments
/// * `attacker` - 攻击方怪兽
/// * `defender` - 防守方怪兽 (None = 直接攻击)
/// * `attacker_terrain` - 攻击方所在地形
/// * `defender_terrain` - 防守方所在地形
pub fn gc_calculate_attack(
    attacker: &GcMonster,
    defender: Option<&GcMonster>,
    attacker_slot: u8,
    defender_slot: Option<u8>,
    attacker_terrain: GcTerrainType,
    defender_terrain: GcTerrainType,
) -> GcAttackOutcome {
    let atk = attacker.effective_atk(attacker_terrain);
    
    match defender {
        Some(def_monster) => {
            let def = def_monster.effective_def(defender_terrain);
            
            // 战斗伤害计算
            let (damage, attacker_destroyed, target_destroyed) = if atk > def {
                // 攻击力高于防御力，摧毁目标
                ((atk - def), false, true)
            } else if atk < def {
                // 防御力高于攻击力，攻击者反弹伤害
                ((def - atk), true, false)
            } else {
                // 同归于尽
                (0, true, true)
            };

            GcAttackOutcome {
                attacker_slot,
                target_slot: defender_slot,
                attacker_name: attacker.name.clone(),
                target_name: Some(def_monster.name.clone()),
                damage,
                target_destroyed,
                attacker_destroyed,
                player_damage: if target_destroyed { damage } else { 0 },
            }
        }
        None => {
            // 直接攻击玩家
            GcAttackOutcome {
                attacker_slot,
                target_slot: None,
                attacker_name: attacker.name.clone(),
                target_name: None,
                damage: atk,
                target_destroyed: false,
                attacker_destroyed: false,
                player_damage: atk,
            }
        }
    }
}

/// 自动选择攻击目标 (ATK最低的敌方怪兽)
pub fn gc_auto_select_target(
    enemy_monsters: &[Option<GcMonster>; 5],
    enemy_terrain: GcTerrainType,
) -> Option<u8> {
    let mut min_atk = u32::MAX;
    let mut target = None;

    for (i, monster) in enemy_monsters.iter().enumerate() {
        if let Some(m) = monster {
            let eff_atk = m.effective_atk(enemy_terrain);
            if eff_atk < min_atk {
                min_atk = eff_atk;
                target = Some(i as u8);
            }
        }
    }

    target
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::GcMonsterAttribute;

    #[test]
    fn test_attack_calculation() {
        let attacker = GcMonster::new("1", "火龙", 4, GcMonsterAttribute::Fire, 2000, 1000, 2000);
        let defender = GcMonster::new("2", "水精灵", 3, GcMonsterAttribute::Water, 1000, 1500, 1000);

        let result = gc_calculate_attack(
            &attacker,
            Some(&defender),
            0,
            Some(1),
            GcTerrainType::Plain,
            GcTerrainType::Plain,
        );

        // 2000 ATK > 1500 DEF = 500 伤害，目标摧毁
        assert_eq!(result.damage, 500);
        assert!(result.target_destroyed);
        assert!(!result.attacker_destroyed);
    }

    #[test]
    fn test_direct_attack() {
        let attacker = GcMonster::new("1", "战士", 4, GcMonsterAttribute::Earth, 1800, 1200, 1800);

        let result = gc_calculate_attack(
            &attacker,
            None,
            0,
            None,
            GcTerrainType::Plain,
            GcTerrainType::Plain,
        );

        assert_eq!(result.player_damage, 1800);
        assert!(!result.target_destroyed);
    }
}
