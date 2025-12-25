//! 组织系统 (团队战斗)
//!
//! 模块: game-core
//! 前缀: Gc
//! 文档: 文档/01-game-core.md
//!
//! 实现 8 人组织战斗机制：
//! - 4 个组织，每组 2 人
//! - 组织阵型位置
//! - 组织间嫁祸机制

use serde::{Deserialize, Serialize};

// =============================================================================
// 组织类型
// =============================================================================

/// 组织类型 (4 个阵营)
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum GcOrganization {
    /// 铁血营
    IronBlood,
    /// 暗影会
    ShadowGuild,
    /// 圣光团
    HolyLight,
    /// 蛮荒族
    Wildland,
}

impl GcOrganization {
    /// 获取组织名称
    pub fn gc_name(&self) -> &str {
        match self {
            GcOrganization::IronBlood => "铁血营",
            GcOrganization::ShadowGuild => "暗影会",
            GcOrganization::HolyLight => "圣光团",
            GcOrganization::Wildland => "蛮荒族",
        }
    }
    
    /// 获取组织颜色 (RGB)
    pub fn gc_color(&self) -> (u8, u8, u8) {
        match self {
            GcOrganization::IronBlood => (180, 40, 40),     // 红色
            GcOrganization::ShadowGuild => (80, 40, 140),   // 紫色
            GcOrganization::HolyLight => (200, 180, 60),    // 金色
            GcOrganization::Wildland => (60, 140, 60),      // 绿色
        }
    }
    
    /// 获取所有组织
    pub fn gc_all() -> Vec<GcOrganization> {
        vec![
            GcOrganization::IronBlood,
            GcOrganization::ShadowGuild,
            GcOrganization::HolyLight,
            GcOrganization::Wildland,
        ]
    }
}

// =============================================================================
// 阵型位置
// =============================================================================

/// 组织阵型位置
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum GcFormationPosition {
    /// 前排
    Front,
    /// 后排
    Back,
}

// =============================================================================
// 组织成员
// =============================================================================

/// 组织成员
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcOrganizationMember {
    /// 玩家 ID
    pub player_id: String,
    /// 玩家名称
    pub player_name: String,
    /// 阵型位置
    pub position: GcFormationPosition,
    /// 是否存活
    pub is_alive: bool,
    /// 当前生命值百分比 (0-100)
    pub hp_percent: u32,
}

impl GcOrganizationMember {
    /// 创建新成员
    pub fn gc_new(player_id: &str, player_name: &str, position: GcFormationPosition) -> Self {
        Self {
            player_id: player_id.to_string(),
            player_name: player_name.to_string(),
            position,
            is_alive: true,
            hp_percent: 100,
        }
    }
}

// =============================================================================
// 组织队伍
// =============================================================================

/// 组织队伍 (2人)
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcOrganizationTeam {
    /// 组织类型
    pub organization: GcOrganization,
    /// 队伍成员
    pub members: Vec<GcOrganizationMember>,
    /// 队伍是否全灭
    pub is_wiped: bool,
    /// 组织总伤害
    pub total_damage: u64,
    /// 组织被嫁祸次数
    pub blame_count: u32,
}

impl GcOrganizationTeam {
    /// 创建新组织队伍
    pub fn gc_new(organization: GcOrganization) -> Self {
        Self {
            organization,
            members: Vec::new(),
            is_wiped: false,
            total_damage: 0,
            blame_count: 0,
        }
    }
    
    /// 添加成员
    pub fn gc_add_member(&mut self, member: GcOrganizationMember) -> Result<(), String> {
        if self.members.len() >= 2 {
            return Err("组织队伍已满 (最多 2 人)".to_string());
        }
        
        // 检查位置是否已被占用
        if self.members.iter().any(|m| m.position == member.position) {
            return Err("该位置已被占用".to_string());
        }
        
        self.members.push(member);
        Ok(())
    }
    
    /// 获取前排成员
    pub fn gc_get_front(&self) -> Option<&GcOrganizationMember> {
        self.members.iter().find(|m| m.position == GcFormationPosition::Front)
    }
    
    /// 获取后排成员
    pub fn gc_get_back(&self) -> Option<&GcOrganizationMember> {
        self.members.iter().find(|m| m.position == GcFormationPosition::Back)
    }
    
    /// 获取存活成员
    pub fn gc_get_alive_members(&self) -> Vec<&GcOrganizationMember> {
        self.members.iter().filter(|m| m.is_alive).collect()
    }
    
    /// 检查队伍是否全灭
    pub fn gc_check_wiped(&mut self) -> bool {
        self.is_wiped = self.members.iter().all(|m| !m.is_alive);
        self.is_wiped
    }
    
    /// 增加伤害统计
    pub fn gc_add_damage(&mut self, damage: u64) {
        self.total_damage += damage;
    }
    
    /// 被嫁祸
    pub fn gc_receive_blame(&mut self) {
        self.blame_count += 1;
    }
}

// =============================================================================
// 8 人团队战斗阵型
// =============================================================================

/// 8 人团队阵型 (4 组织 x 2 人)
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcRaidFormation {
    /// 所有组织队伍
    pub teams: Vec<GcOrganizationTeam>,
    /// 当前回合的行动顺序
    pub action_order: Vec<String>,
    /// 当前行动的玩家索引
    pub current_action_index: usize,
}

impl GcRaidFormation {
    /// 创建新阵型 (初始化 4 个空组织)
    pub fn gc_new() -> Self {
        let teams = GcOrganization::gc_all()
            .into_iter()
            .map(GcOrganizationTeam::gc_new)
            .collect();
        
        Self {
            teams,
            action_order: Vec::new(),
            current_action_index: 0,
        }
    }
    
    /// 添加玩家到指定组织
    pub fn gc_add_player(
        &mut self,
        organization: GcOrganization,
        player_id: &str,
        player_name: &str,
        position: GcFormationPosition,
    ) -> Result<(), String> {
        let team = self.teams
            .iter_mut()
            .find(|t| t.organization == organization)
            .ok_or_else(|| "找不到组织".to_string())?;
        
        let member = GcOrganizationMember::gc_new(player_id, player_name, position);
        team.gc_add_member(member)
    }
    
    /// 获取组织队伍
    pub fn gc_get_team(&self, organization: &GcOrganization) -> Option<&GcOrganizationTeam> {
        self.teams.iter().find(|t| &t.organization == organization)
    }
    
    /// 获取组织队伍 (可变)
    pub fn gc_get_team_mut(&mut self, organization: &GcOrganization) -> Option<&mut GcOrganizationTeam> {
        self.teams.iter_mut().find(|t| &t.organization == organization)
    }
    
    /// 获取玩家所属组织
    pub fn gc_get_player_organization(&self, player_id: &str) -> Option<&GcOrganization> {
        for team in &self.teams {
            if team.members.iter().any(|m| m.player_id == player_id) {
                return Some(&team.organization);
            }
        }
        None
    }
    
    /// 获取所有存活的组织
    pub fn gc_get_alive_teams(&self) -> Vec<&GcOrganizationTeam> {
        self.teams.iter().filter(|t| !t.is_wiped).collect()
    }
    
    /// 获取所有存活的玩家 ID
    pub fn gc_get_alive_player_ids(&self) -> Vec<&str> {
        self.teams
            .iter()
            .flat_map(|t| t.members.iter())
            .filter(|m| m.is_alive)
            .map(|m| m.player_id.as_str())
            .collect()
    }
    
    /// 总玩家数
    pub fn gc_total_players(&self) -> usize {
        self.teams.iter().map(|t| t.members.len()).sum()
    }
    
    /// 是否已满员 (8 人)
    pub fn gc_is_full(&self) -> bool {
        self.gc_total_players() >= 8
    }
    
    /// 设置行动顺序
    pub fn gc_set_action_order(&mut self, order: Vec<String>) {
        self.action_order = order;
        self.current_action_index = 0;
    }
    
    /// 获取当前行动玩家
    pub fn gc_get_current_actor(&self) -> Option<&str> {
        self.action_order.get(self.current_action_index).map(|s| s.as_str())
    }
    
    /// 下一个行动玩家
    pub fn gc_next_actor(&mut self) -> bool {
        self.current_action_index += 1;
        self.current_action_index < self.action_order.len()
    }
    
    /// 伤害排行榜
    pub fn gc_damage_ranking(&self) -> Vec<(&GcOrganization, u64)> {
        let mut ranking: Vec<_> = self.teams
            .iter()
            .map(|t| (&t.organization, t.total_damage))
            .collect();
        ranking.sort_by(|a, b| b.1.cmp(&a.1));
        ranking
    }
}

// =============================================================================
// 测试
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_gc_organization_team() {
        let mut team = GcOrganizationTeam::gc_new(GcOrganization::IronBlood);
        
        // 添加前排
        let result = team.gc_add_member(
            GcOrganizationMember::gc_new("p1", "玩家1", GcFormationPosition::Front)
        );
        assert!(result.is_ok());
        
        // 添加后排
        let result = team.gc_add_member(
            GcOrganizationMember::gc_new("p2", "玩家2", GcFormationPosition::Back)
        );
        assert!(result.is_ok());
        
        // 再添加应该失败
        let result = team.gc_add_member(
            GcOrganizationMember::gc_new("p3", "玩家3", GcFormationPosition::Front)
        );
        assert!(result.is_err());
        
        assert!(team.gc_get_front().is_some());
        assert!(team.gc_get_back().is_some());
    }
    
    #[test]
    fn test_gc_raid_formation() {
        let mut formation = GcRaidFormation::gc_new();
        
        // 添加玩家到铁血营
        let result = formation.gc_add_player(
            GcOrganization::IronBlood,
            "p1",
            "玩家1",
            GcFormationPosition::Front,
        );
        assert!(result.is_ok());
        
        // 检查玩家组织
        let org = formation.gc_get_player_organization("p1");
        assert_eq!(org, Some(&GcOrganization::IronBlood));
        
        assert_eq!(formation.gc_total_players(), 1);
        assert!(!formation.gc_is_full());
    }
    
    #[test]
    fn test_gc_organization_colors() {
        for org in GcOrganization::gc_all() {
            let (r, g, b) = org.gc_color();
            assert!(r > 0 || g > 0 || b > 0);
        }
    }
}
