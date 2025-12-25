/**
 * 战斗场景特效门面模块
 * 
 * 模块: client/render/battle
 * 前缀: Cl
 * 职责: 战斗特效系统的门面类，委托给专门的子模块
 * 
 * 架构:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                   ClBattleEffects (门面)                     │
 * ├─────────────────────────────────────────────────────────────┤
 * │  ┌─────────────────┐     ┌─────────────────┐               │
 * │  │ClAmbientEffect  │     │ClCombatEffect   │               │
 * │  │  (环境特效)     │     │  (战斗动作)     │               │
 * │  └─────────────────┘     └─────────────────┘               │
 * │  ┌─────────────────┐     ┌─────────────────┐               │
 * │  │ClSkillEffect    │     │ClVisualEffect   │               │
 * │  │  (技能特效)     │     │  (视觉效果)     │               │
 * │  └─────────────────┘     └─────────────────┘               │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * @see 文档/09-模块化架构.md
 */

import {
    Scene,
    Vector3,
    Color4,
    TransformNode,
} from '@babylonjs/core';

// 导入子模块
import {
    ClAmbientEffectManager,
    CL_AMBIENT_EFFECT_CONFIG,
    ClCombatEffectManager,
    CL_COMBAT_EFFECT_CONFIG,
    ClSkillEffectGenerator,
    CL_SKILL_EFFECT_CONFIG,
    ClVisualEffectManager,
} from './effects';
import type { ClSkillEffectType } from './effects';

// =============================================================================
// 重导出配置 (保持向后兼容)
// =============================================================================

export const CL_BATTLE_EFFECTS_CONFIG = {
    ...CL_AMBIENT_EFFECT_CONFIG,
    ...CL_COMBAT_EFFECT_CONFIG,
    ...CL_SKILL_EFFECT_CONFIG,
};

// =============================================================================
// 战斗特效门面类
// =============================================================================

/**
 * 战斗特效系统门面
 * 
 * 提供统一的 API 来管理所有战斗特效，内部委托给专门的子模块：
 * - ClAmbientEffectManager: 环境粒子和背景
 * - ClCombatEffectManager: 攻击、伤害、治疗、抽卡特效
 * - ClSkillEffectGenerator: 技能特效（火焰、冰霜、闪电等）
 * - ClVisualEffectManager: 浮动数字、相机震动、屏幕闪烁
 */
export class ClBattleEffects {
    private root: TransformNode;
    
    // 子模块
    private ambientEffects: ClAmbientEffectManager;
    private combatEffects: ClCombatEffectManager;
    private skillEffects: ClSkillEffectGenerator;
    private visualEffects: ClVisualEffectManager;

    constructor(scene: Scene, parent: TransformNode) {
        this.root = new TransformNode('battleEffectsRoot', scene);
        this.root.parent = parent;
        
        // 初始化子模块
        this.ambientEffects = new ClAmbientEffectManager(scene, this.root);
        this.combatEffects = new ClCombatEffectManager(scene, this.root);
        this.skillEffects = new ClSkillEffectGenerator(scene, this.root);
        this.visualEffects = new ClVisualEffectManager(scene);
        
        // 初始化环境特效
        this.ambientEffects.initialize();
    }

    // =========================================================================
    // 环境特效 (委托给 ClAmbientEffectManager)
    // =========================================================================

    /**
     * 启动环境粒子
     */
    startAmbient(): void {
        this.ambientEffects.start();
    }

    /**
     * 停止环境粒子
     */
    stopAmbient(): void {
        this.ambientEffects.stop();
    }

    // =========================================================================
    // 战斗动作特效 (委托给 ClCombatEffectManager)
    // =========================================================================

    /**
     * 播放攻击特效 - 能量球从攻击者飞向目标
     */
    playAttackEffect(from: Vector3, to: Vector3): void {
        this.combatEffects.playAttackEffect(from, to);
    }

    /**
     * 播放治疗特效 - 绿色上升粒子 + 治疗数字
     */
    playHealEffect(position: Vector3, amount: number): void {
        this.combatEffects.playHealEffect(position, amount);
    }

    /**
     * 播放伤害特效 - 红色粒子爆发 + 伤害数字
     */
    playDamageEffect(position: Vector3, amount: number): void {
        this.combatEffects.playDamageEffect(position, amount);
    }

    /**
     * 播放卡牌抽取特效 - 光效飞行
     */
    playDrawCardEffect(from: Vector3, to: Vector3): void {
        this.combatEffects.playDrawCardEffect(from, to);
    }

    // =========================================================================
    // 技能特效 (委托给 ClSkillEffectGenerator)
    // =========================================================================

    /**
     * 播放技能释放特效 - 根据技能类型显示不同效果
     */
    playSkillEffect(skillType: string, position: Vector3): void {
        // 将 string 转换为 ClSkillEffectType
        const type = this.normalizeSkillType(skillType);
        this.skillEffects.playSkillEffect(type, position);
    }

    /**
     * 规范化技能类型字符串
     */
    private normalizeSkillType(skillType: string): ClSkillEffectType {
        const normalized = skillType.toLowerCase();
        if (normalized === 'fire' || normalized === '火焰') return 'fire';
        if (normalized === 'ice' || normalized === '冰霜') return 'ice';
        if (normalized === 'lightning' || normalized === '闪电') return 'lightning';
        if (normalized === 'poison' || normalized === '毒素') return 'poison';
        return 'default';
    }

    // =========================================================================
    // 视觉效果 (委托给 ClVisualEffectManager)
    // =========================================================================

    /**
     * 显示浮动数字
     */
    showFloatingNumber(position: Vector3, text: string, color: Color4): void {
        this.visualEffects.showFloatingNumber(position, text, color);
    }

    /**
     * 屏幕震动
     */
    shakeCamera(intensity?: number, durationMs?: number): void {
        this.visualEffects.shakeCamera(intensity, durationMs);
    }

    /**
     * 屏幕闪烁
     */
    flashScreen(color: Color4, durationMs?: number): void {
        this.visualEffects.flashScreen(color, durationMs);
    }

    // =========================================================================
    // 生命周期管理
    // =========================================================================

    /**
     * 设置启用状态
     */
    setEnabled(enabled: boolean): void {
        this.root.setEnabled(enabled);
        if (enabled) {
            this.startAmbient();
        } else {
            this.stopAmbient();
        }
    }

    /**
     * 销毁所有特效资源
     */
    dispose(): void {
        this.ambientEffects.dispose();
        this.combatEffects.dispose();
        // skillEffects 无需显式销毁，粒子系统由场景管理
        this.root.dispose();
    }
}
