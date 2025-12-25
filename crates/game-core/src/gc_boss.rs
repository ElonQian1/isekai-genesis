//! Boss 战斗系统
//!
//! 模块: game-core
//! 前缀: Gc
//! 文档: 文档/01-game-core.md
//!
//! 实现 Boss 战斗机制：
//! - Boss 类型 (小型/周本/世界)
//! - 怒气系统
//! - 复活机制 (周本)
//! - Boss 技能

use serde::{Deserialize, Serialize};

// =============================================================================
// Boss 类型与状态
// =============================================================================

/// Boss 类型
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum GcBossType {
    /// 小型 Boss (组队副本)
    Mini,
    /// 周本 Boss (8人团队)
    Weekly,
    /// 世界 Boss
    World,
}

/// Boss 状态
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum GcBossState {
    /// 待机
    Idle,
    /// 攻击中
    Attacking,
    /// 蓄力中
    Charging,
    /// 狂怒状态
    Enraged,
    /// 眩晕
    Stunned,
    /// 死亡
    Dead,
}

/// 技能目标类型
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum GcSkillTargetType {
    /// 单体目标
    Single,
    /// 组织 (所有同阵营玩家)
    Organization,
    /// 全体
    All,
}

// =============================================================================
// Boss 技能
// =============================================================================

/// Boss 技能
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcBossSkill {
    /// 技能 ID
    pub id: String,
    /// 技能名称
    pub name: String,
    /// 技能描述
    pub description: String,
    /// 基础伤害
    pub damage: u32,
    /// 目标类型
    pub target_type: GcSkillTargetType,
    /// 冷却时间 (回合数)
    pub cooldown: u32,
    /// 当前冷却
    pub current_cooldown: u32,
    /// 怒气需求 (全屏技能)
    pub rage_required: Option<u32>,
}

impl GcBossSkill {
    /// 创建新技能
    pub fn gc_new(
        id: &str,
        name: &str,
        description: &str,
        damage: u32,
        target_type: GcSkillTargetType,
        cooldown: u32,
    ) -> Self {
        Self {
            id: id.to_string(),
            name: name.to_string(),
            description: description.to_string(),
            damage,
            target_type,
            cooldown,
            current_cooldown: 0,
            rage_required: None,
        }
    }
    
    /// 创建怒气技能
    pub fn gc_new_rage_skill(
        id: &str,
        name: &str,
        description: &str,
        damage: u32,
        rage_required: u32,
    ) -> Self {
        Self {
            id: id.to_string(),
            name: name.to_string(),
            description: description.to_string(),
            damage,
            target_type: GcSkillTargetType::All,
            cooldown: 0,
            current_cooldown: 0,
            rage_required: Some(rage_required),
        }
    }
    
    /// 技能是否就绪
    pub fn gc_is_ready(&self) -> bool {
        self.current_cooldown == 0
    }
    
    /// 使用技能 (进入冷却)
    pub fn gc_use(&mut self) {
        self.current_cooldown = self.cooldown;
    }
    
    /// 回合结束减少冷却
    pub fn gc_tick(&mut self) {
        if self.current_cooldown > 0 {
            self.current_cooldown -= 1;
        }
    }
}

// =============================================================================
// Boss 掉落
// =============================================================================

/// Boss 掉落物
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcBossDrop {
    /// 物品 ID
    pub item_id: String,
    /// 物品名称
    pub item_name: String,
    /// 掉落概率 (0-100)
    pub drop_rate: u32,
    /// 最小数量
    pub min_quantity: u32,
    /// 最大数量
    pub max_quantity: u32,
}

// =============================================================================
// Boss 定义
// =============================================================================

/// Boss 属性
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcBoss {
    /// Boss ID
    pub id: String,
    /// Boss 名称
    pub name: String,
    /// Boss 类型
    pub boss_type: GcBossType,
    /// 描述
    pub description: String,
    
    // 属性
    /// 最大生命值
    pub max_hp: u32,
    /// 当前生命值
    pub current_hp: u32,
    /// 基础攻击力
    pub base_attack: u32,
    /// 当前攻击力 (会因复活增加)
    pub current_attack: u32,
    /// 防御力
    pub defense: u32,
    
    // 怒气系统
    /// 最大怒气值
    pub max_rage: u32,
    /// 当前怒气值
    pub current_rage: u32,
    /// 每点伤害增加的怒气
    pub rage_per_damage: f32,
    
    // 技能
    /// 普通技能
    pub skills: Vec<GcBossSkill>,
    /// 怒气满时释放的全屏技能
    pub rage_skill: GcBossSkill,
    
    // 状态
    /// Boss 状态
    pub state: GcBossState,
    
    // 复活机制 (周本专用)
    /// 已复活次数
    pub revive_count: u32,
    /// 最大复活次数
    pub max_revives: u32,
    /// 每次复活增加的攻击力百分比
    pub attack_boost_per_revive: u32,
    
    // 目标选择
    /// 被嫁祸后优先攻击的组织 ID
    pub target_organization: Option<String>,
    
    // 掉落
    /// 掉落物列表
    pub drops: Vec<GcBossDrop>,
}

impl GcBoss {
    /// 创建新 Boss
    pub fn gc_new(
        id: &str,
        name: &str,
        boss_type: GcBossType,
        max_hp: u32,
        base_attack: u32,
        defense: u32,
        max_rage: u32,
        rage_per_damage: f32,
    ) -> Self {
        Self {
            id: id.to_string(),
            name: name.to_string(),
            boss_type,
            description: String::new(),
            max_hp,
            current_hp: max_hp,
            base_attack,
            current_attack: base_attack,
            defense,
            max_rage,
            current_rage: 0,
            rage_per_damage,
            skills: Vec::new(),
            rage_skill: GcBossSkill::gc_new_rage_skill(
                "default_rage",
                "狂怒爆发",
                "释放怒气，对全体造成伤害",
                50,
                100,
            ),
            state: GcBossState::Idle,
            revive_count: 0,
            max_revives: 0,
            attack_boost_per_revive: 0,
            target_organization: None,
            drops: Vec::new(),
        }
    }
    
    /// 设置描述
    pub fn gc_with_description(mut self, description: &str) -> Self {
        self.description = description.to_string();
        self
    }
    
    /// 添加技能
    pub fn gc_add_skill(&mut self, skill: GcBossSkill) {
        self.skills.push(skill);
    }
    
    /// 设置怒气技能
    pub fn gc_set_rage_skill(&mut self, skill: GcBossSkill) {
        self.rage_skill = skill;
    }
    
    /// 设置复活机制 (周本 Boss)
    pub fn gc_set_revive(&mut self, max_revives: u32, attack_boost_per_revive: u32) {
        self.max_revives = max_revives;
        self.attack_boost_per_revive = attack_boost_per_revive;
    }
    
    /// 添加掉落
    pub fn gc_add_drop(&mut self, drop: GcBossDrop) {
        self.drops.push(drop);
    }
    
    // =========================================================================
    // 战斗方法
    // =========================================================================
    
    /// Boss 是否存活
    pub fn gc_is_alive(&self) -> bool {
        self.current_hp > 0 && self.state != GcBossState::Dead
    }
    
    /// Boss 是否可以复活 (周本 Boss 特殊逻辑)
    /// 参数 surviving_orgs: 存活的组织数量
    pub fn gc_can_revive(&self) -> bool {
        self.boss_type == GcBossType::Weekly && self.revive_count < self.max_revives
    }
    
    /// 检查 Boss 是否真正死亡 (周本 Boss 特殊逻辑)
    /// 只有当只剩一个组织存活时，Boss 才能被真正击杀
    pub fn gc_check_final_death(&self, surviving_org_count: u32) -> bool {
        if self.boss_type != GcBossType::Weekly {
            return self.current_hp == 0;
        }
        // 周本 Boss：只有一个组织存活时才能真正死亡
        self.current_hp == 0 && surviving_org_count <= 1
    }
    
    /// 受到伤害 (周本 Boss 版本)
    /// 参数:
    /// - damage: 伤害值
    /// - surviving_org_count: 存活的组织数量
    /// 返回: (实际伤害, 是否需要复活, 是否真正死亡)
    pub fn gc_take_damage_weekly(&mut self, damage: u32, surviving_org_count: u32) -> (u32, bool, bool) {
        // 计算实际伤害 (考虑防御)
        let actual_damage = damage.saturating_sub(self.defense / 2);
        let actual_damage = actual_damage.max(1); // 至少造成 1 点伤害
        
        // 记录血量清空前的生命值
        let hp_before = self.current_hp;
        
        // 扣除生命值
        self.current_hp = self.current_hp.saturating_sub(actual_damage);
        
        // 增加怒气
        let rage_gain = (actual_damage as f32 * self.rage_per_damage) as u32;
        self.gc_add_rage(rage_gain);
        
        // 检查是否需要复活
        let mut needs_revive = false;
        let mut truly_dead = false;
        
        if self.current_hp == 0 {
            if surviving_org_count > 1 {
                // 多个组织存活，Boss 复活
                needs_revive = true;
                self.gc_revive_weekly(hp_before);
            } else {
                // 只剩一个组织，Boss 真正死亡
                truly_dead = true;
                self.state = GcBossState::Dead;
            }
        }
        
        (actual_damage, needs_revive, truly_dead)
    }

    /// 受到伤害
    /// 返回 (实际伤害, 是否死亡)
    pub fn gc_take_damage(&mut self, damage: u32) -> (u32, bool) {
        // 计算实际伤害 (考虑防御)
        let actual_damage = damage.saturating_sub(self.defense / 2);
        let actual_damage = actual_damage.max(1); // 至少造成 1 点伤害
        
        // 扣除生命值
        self.current_hp = self.current_hp.saturating_sub(actual_damage);
        
        // 增加怒气
        let rage_gain = (actual_damage as f32 * self.rage_per_damage) as u32;
        self.gc_add_rage(rage_gain);
        
        // 检查死亡
        let died = self.current_hp == 0;
        if died {
            if self.gc_can_revive() {
                // 复活 (非周本，满血复活)
                self.gc_revive();
            } else {
                self.state = GcBossState::Dead;
            }
        }
        
        (actual_damage, died && !self.gc_is_alive())
    }
    
    /// 周本 Boss 复活 (按规则：恢复击杀前生命值的50%，攻击力+5%)
    fn gc_revive_weekly(&mut self, hp_before_kill: u32) {
        self.revive_count += 1;
        
        // 恢复击杀前生命值的 50%
        self.current_hp = hp_before_kill / 2;
        if self.current_hp == 0 {
            self.current_hp = 1; // 至少 1 点血
        }
        
        // 攻击力增加 5% (每次复活累积)
        // attack_boost_per_revive 应设为 5
        let boost = self.base_attack * self.attack_boost_per_revive / 100;
        self.current_attack = self.base_attack + boost * self.revive_count;
        
        // 进入狂怒状态
        self.state = GcBossState::Enraged;
        
        // 清空怒气
        self.current_rage = 0;
    }
    
    /// 复活 Boss (普通模式，满血复活)
    fn gc_revive(&mut self) {
        self.revive_count += 1;
        
        // 恢复满血
        self.current_hp = self.max_hp;
        
        // 增加攻击力
        let boost = self.base_attack * self.attack_boost_per_revive / 100;
        self.current_attack = self.base_attack + boost * self.revive_count;
        
        // 进入狂怒状态
        self.state = GcBossState::Enraged;
        
        // 清空怒气
        self.current_rage = 0;
    }
    
    /// 增加怒气
    pub fn gc_add_rage(&mut self, amount: u32) {
        self.current_rage = (self.current_rage + amount).min(self.max_rage);
        
        // 检查是否进入狂怒状态
        if self.current_rage >= self.max_rage && self.state != GcBossState::Enraged {
            self.state = GcBossState::Enraged;
        }
    }
    
    /// 怒气是否已满
    pub fn gc_is_rage_full(&self) -> bool {
        self.current_rage >= self.max_rage
    }
    
    /// 使用怒气技能后清空怒气
    pub fn gc_consume_rage(&mut self) {
        self.current_rage = 0;
        if self.state == GcBossState::Enraged {
            self.state = GcBossState::Idle;
        }
    }
    
    /// 选择技能
    /// 如果怒气满则返回怒气技能，否则选择就绪的普通技能
    pub fn gc_select_skill(&self) -> Option<&GcBossSkill> {
        // 怒气满时优先使用怒气技能
        if self.gc_is_rage_full() {
            return Some(&self.rage_skill);
        }
        
        // 选择一个就绪的技能 (优先选择冷却长的)
        self.skills
            .iter()
            .filter(|s| s.gc_is_ready())
            .max_by_key(|s| s.cooldown)
    }
    
    /// 回合结束处理 (减少技能冷却)
    pub fn gc_on_turn_end(&mut self) {
        for skill in &mut self.skills {
            skill.gc_tick();
        }
    }
    
    /// 设置嫁祸目标
    pub fn gc_set_target_organization(&mut self, org_id: &str) {
        self.target_organization = Some(org_id.to_string());
    }
    
    /// 清除嫁祸目标
    pub fn gc_clear_target_organization(&mut self) {
        self.target_organization = None;
    }
}

// =============================================================================
// Boss 行动结果
// =============================================================================

/// Boss 行动结果
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcBossActionResult {
    /// 使用的技能
    pub skill_name: String,
    /// 技能描述
    pub skill_description: String,
    /// 目标类型
    pub target_type: GcSkillTargetType,
    /// 目标组织 ID (如果是组织攻击)
    pub target_organization: Option<String>,
    /// 目标玩家 ID 列表
    pub target_players: Vec<String>,
    /// 造成的伤害
    pub damage: u32,
    /// 是否是怒气技能
    pub is_rage_skill: bool,
}

// =============================================================================
// 预定义 Boss 模板
// =============================================================================

/// 创建暗影潜伏者 (小型 Boss)
pub fn gc_create_shadow_lurker() -> GcBoss {
    let mut boss = GcBoss::gc_new(
        "boss_shadow_lurker",
        "暗影潜伏者",
        GcBossType::Mini,
        500,
        25,
        10,
        100,
        0.5,
    );
    boss = boss.gc_with_description("在地底深处游荡的凶兽，专门伏击落单的幸存者");
    
    boss.gc_add_skill(GcBossSkill::gc_new(
        "skill_shadow_claw",
        "暗影利爪",
        "用锋利的爪子攻击单个目标",
        30,
        GcSkillTargetType::Single,
        0,
    ));
    
    boss.gc_add_skill(GcBossSkill::gc_new(
        "skill_dark_screech",
        "黑暗尖啸",
        "发出刺耳的尖叫，攻击所有玩家",
        15,
        GcSkillTargetType::All,
        3,
    ));
    
    boss.gc_set_rage_skill(GcBossSkill::gc_new_rage_skill(
        "skill_shadow_storm",
        "暗影风暴",
        "释放暗影能量，对全体造成大量伤害",
        50,
        100,
    ));
    
    boss
}

/// 创建深渊泰坦 (周本 Boss)
pub fn gc_create_abyssal_titan() -> GcBoss {
    let mut boss = GcBoss::gc_new(
        "boss_abyssal_titan",
        "深渊泰坦",
        GcBossType::Weekly,
        3000,
        40,
        25,
        150,
        0.3,
    );
    boss = boss.gc_with_description("从地底深渊爬出的巨型凶兽，是毁灭地表文明的元凶之一");
    
    // 设置复活机制
    boss.gc_set_revive(3, 5); // 可复活 3 次，每次攻击力增加 5%
    
    boss.gc_add_skill(GcBossSkill::gc_new(
        "skill_titan_slam",
        "泰坦重击",
        "用巨拳砸向一个组织的所有玩家",
        35,
        GcSkillTargetType::Organization,
        0,
    ));
    
    boss.gc_add_skill(GcBossSkill::gc_new(
        "skill_earthquake",
        "地震波",
        "引发地震，对所有玩家造成伤害",
        25,
        GcSkillTargetType::All,
        4,
    ));
    
    boss.gc_add_skill(GcBossSkill::gc_new(
        "skill_focus_crush",
        "集中碾压",
        "锁定单个目标进行致命攻击",
        80,
        GcSkillTargetType::Single,
        5,
    ));
    
    boss.gc_set_rage_skill(GcBossSkill::gc_new_rage_skill(
        "skill_apocalypse",
        "末日降临",
        "释放毁灭性能量，对全体玩家造成巨量伤害",
        100,
        150,
    ));
    
    boss
}

// =============================================================================
// 测试
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_gc_boss_new() {
        let boss = gc_create_shadow_lurker();
        
        assert_eq!(boss.id, "boss_shadow_lurker");
        assert_eq!(boss.name, "暗影潜伏者");
        assert_eq!(boss.boss_type, GcBossType::Mini);
        assert_eq!(boss.max_hp, 500);
        assert_eq!(boss.current_hp, 500);
        assert!(boss.gc_is_alive());
    }
    
    #[test]
    fn test_gc_boss_take_damage() {
        let mut boss = gc_create_shadow_lurker();
        
        let (damage, died) = boss.gc_take_damage(100);
        
        assert!(damage > 0);
        assert!(!died);
        assert!(boss.current_hp < 500);
        assert!(boss.current_rage > 0); // 怒气增加
    }
    
    #[test]
    fn test_gc_boss_rage_system() {
        let mut boss = gc_create_shadow_lurker();
        boss.current_rage = 90;
        
        // 增加怒气到满
        boss.gc_add_rage(20);
        
        assert_eq!(boss.current_rage, 100);
        assert!(boss.gc_is_rage_full());
        assert_eq!(boss.state, GcBossState::Enraged);
        
        // 消耗怒气
        boss.gc_consume_rage();
        
        assert_eq!(boss.current_rage, 0);
        assert!(!boss.gc_is_rage_full());
        assert_eq!(boss.state, GcBossState::Idle);
    }
    
    #[test]
    fn test_gc_weekly_boss_revive() {
        let mut boss = gc_create_abyssal_titan();
        
        // 打到残血
        boss.current_hp = 1;
        
        // 受到致命伤害
        let (_, _) = boss.gc_take_damage(100);
        
        // 应该复活
        assert!(boss.gc_is_alive());
        assert_eq!(boss.current_hp, boss.max_hp);
        assert_eq!(boss.revive_count, 1);
        assert!(boss.current_attack > boss.base_attack); // 攻击力增加
    }
    
    #[test]
    fn test_gc_boss_select_skill() {
        let boss = gc_create_shadow_lurker();
        
        // 应该选择一个技能
        let skill = boss.gc_select_skill();
        assert!(skill.is_some());
    }
}
