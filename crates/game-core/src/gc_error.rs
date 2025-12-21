//! 错误类型定义
//!
//! 模块: game-core (共享核心)
//! 前缀: Gc
//! 文档: 文档/01-game-core.md

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// 游戏核心错误类型
#[derive(Clone, Debug, Error, Serialize, Deserialize)]
pub enum GcError {
    // =========================================================================
    // 战斗相关错误 (1xxx)
    // =========================================================================
    
    /// 战斗已结束
    #[error("战斗已结束")]
    GcBattleEnded,
    
    /// 不是你的回合
    #[error("不是你的回合")]
    GcNotYourTurn,
    
    /// 战斗未开始
    #[error("战斗未开始")]
    GcBattleNotStarted,
    
    // =========================================================================
    // 玩家相关错误 (2xxx)
    // =========================================================================
    
    /// 玩家不存在
    #[error("玩家不存在")]
    GcPlayerNotFound,
    
    /// 玩家无法行动
    #[error("玩家无法行动")]
    GcPlayerCannotAct,
    
    // =========================================================================
    // 卡牌相关错误 (3xxx)
    // =========================================================================
    
    /// 卡牌不在手中
    #[error("卡牌不在手中")]
    GcCardNotInHand,
    
    /// 卡牌不存在
    #[error("卡牌不存在")]
    GcCardNotFound,
    
    /// 能量不足
    #[error("能量不足")]
    GcNotEnoughEnergy,
    
    // =========================================================================
    // 目标相关错误 (4xxx)
    // =========================================================================
    
    /// 无效目标
    #[error("无效目标")]
    GcInvalidTarget,
    
    /// 目标已死亡
    #[error("目标已死亡")]
    GcTargetDead,
    
    // =========================================================================
    // 通用错误 (9xxx)
    // =========================================================================
    
    /// 无效操作
    #[error("无效操作: {0}")]
    GcInvalidAction(String),
    
    /// 内部错误
    #[error("内部错误: {0}")]
    GcInternalError(String),
}

impl GcError {
    /// 获取错误码
    pub fn gc_code(&self) -> u32 {
        match self {
            // 战斗相关 1xxx
            GcError::GcBattleEnded => 1001,
            GcError::GcNotYourTurn => 1002,
            GcError::GcBattleNotStarted => 1003,
            
            // 玩家相关 2xxx
            GcError::GcPlayerNotFound => 2001,
            GcError::GcPlayerCannotAct => 2002,
            
            // 卡牌相关 3xxx
            GcError::GcCardNotInHand => 3001,
            GcError::GcCardNotFound => 3002,
            GcError::GcNotEnoughEnergy => 3003,
            
            // 目标相关 4xxx
            GcError::GcInvalidTarget => 4001,
            GcError::GcTargetDead => 4002,
            
            // 通用 9xxx
            GcError::GcInvalidAction(_) => 9001,
            GcError::GcInternalError(_) => 9999,
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
    fn test_gc_error_display() {
        let error = GcError::GcNotYourTurn;
        assert_eq!(error.to_string(), "不是你的回合");
        assert_eq!(error.gc_code(), 1002);
    }

    #[test]
    fn test_gc_error_serialize() {
        let error = GcError::GcCardNotInHand;
        let json = serde_json::to_string(&error).unwrap();
        assert!(json.contains("GcCardNotInHand"));
    }
}
