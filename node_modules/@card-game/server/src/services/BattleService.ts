import { 
  BattleData, 
  BattlePlayer, 
  BattleResult, 
  Boss, 
  BossState, 
  Card, 
  CardInstance, 
  CardType, 
  GameRoom, 
  GameState, 
  PlayerState,
  Organization, 
  PlayerAction, 
  GAME_CONFIG,
  getCardById,
  BossAction
} from '@card-game/shared';
import { randomUUID } from 'crypto';

export class BattleService {
  
  /**
   * 初始化战斗
   */
  public initBattle(room: GameRoom, bossTemplate: Boss): BattleData {
    // 1. 初始化BOSS
    const boss = { ...bossTemplate };
    boss.currentHealth = boss.maxHealth;
    boss.currentRage = 0;
    boss.state = BossState.IDLE;
    
    // 2. 初始化玩家战斗状态
    const players = Array.from(room.players.values());
    
    // 3. 决定初始行动顺序 (按速度排序)
    const turnOrder = players
      .sort((a, b) => b.speed - a.speed)
      .map(p => p.playerId);

    // 4. 初始化牌堆 (这里简化，实际应为每个玩家生成牌堆)
    // 在实际逻辑中，每个玩家有自己的牌库，这里为了演示核心逻辑，假设有一个公共发牌器或者各自初始化
    
    return {
      boss,
      currentRound: 1,
      maxRounds: GAME_CONFIG.MAX_ROUNDS,
      phase: 'draw',
      turnOrder,
      currentTurnIndex: 0,
      drawPile: [], // 需填充
      discardPile: [],
      rounds: [],
      redirectTarget: undefined
    };
  }

  /**
   * 处理玩家出牌
   */
  public processCardPlay(
    battle: BattleData, 
    player: BattlePlayer, 
    cardId: string, 
    targetOrg?: Organization
  ): { damage: number, effects: string[] } {
    const card = getCardById(cardId);
    if (!card) throw new Error('Card not found');

    let damage = 0;
    const effects: string[] = [];

    // 1. 处理嫁祸牌
    if (card.type === CardType.REDIRECT && card.redirectTarget) {
      battle.redirectTarget = card.redirectTarget;
      effects.push(`将BOSS仇恨引向了 ${card.redirectTarget}`);
    }

    // 2. 处理伤害牌
    card.effects.forEach(effect => {
      if (effect.type === 'damage') {
        // 计算伤害 (简化公式：攻击力 * 卡牌倍率)
        // 实际应包含暴击、防御减免等
        let val = effect.value + (player.attack * 0.5); 
        
        // 职业天赋加成检查 (如剑士双倍伤害)
        if (player.talent.type === 'sword_spirit' && player.talent.currentCooldown > 0) {
           // 假设天赋激活逻辑已处理，这里只是示例
        }

        damage += Math.floor(val);
      }
    });

    // 3. 更新BOSS状态
    if (damage > 0) {
      battle.boss.currentHealth = Math.max(0, battle.boss.currentHealth - damage);
      
      // 增加BOSS怒气
      const rageGain = damage * battle.boss.ragePerDamage;
      battle.boss.currentRage = Math.min(battle.boss.maxRage, battle.boss.currentRage + rageGain);
      
      effects.push(`对BOSS造成 ${damage} 点伤害`);
    }

    return { damage, effects };
  }

  /**
   * 检查BOSS是否死亡或复活
   */
  public checkBossStatus(battle: BattleData, room: GameRoom): { 
    isDead: boolean, 
    revived: boolean, 
    message?: string 
  } {
    if (battle.boss.currentHealth > 0) {
      return { isDead: false, revived: false };
    }

    // BOSS血量归零，检查存活组织数量
    const aliveOrgs = new Set<Organization>();
    room.players.forEach(p => {
      if (p.state === 'alive') {
        aliveOrgs.add(p.organization);
      }
    });

    // 如果存活组织 > 1，BOSS复活
    if (aliveOrgs.size > 1) {
      battle.boss.reviveCount++;
      
      // 半血复活
      battle.boss.currentHealth = Math.floor(battle.boss.maxHealth * GAME_CONFIG.BOSS_REVIVE_HEALTH_RATIO);
      
      // 增加攻击力
      const attackBoost = 1 + (battle.boss.reviveCount * GAME_CONFIG.BOSS_ATTACK_BOOST_PER_REVIVE / 100);
      battle.boss.currentAttack = Math.floor(battle.boss.baseAttack * attackBoost);
      
      return { 
        isDead: false, 
        revived: true, 
        message: `BOSS倒下了，但场上仍有多个组织存活！BOSS以半血复活并增强了攻击力！` 
      };
    }

    // 只有一个组织存活，BOSS真正死亡
    battle.boss.state = BossState.DEAD;
    return { 
      isDead: true, 
      revived: false, 
      message: 'BOSS已被彻底击败！' 
    };
  }

  /**
   * 执行BOSS回合
   */
  public executeBossTurn(battle: BattleData, room: GameRoom): BossAction {
    const boss = battle.boss;
    let action: BossAction;

    // 1. 检查是否满怒气 -> 释放全屏大招
    if (boss.currentRage >= boss.maxRage) {
      action = {
        skillId: boss.rageSkill.id,
        skillName: boss.rageSkill.name,
        targetType: 'all',
        damage: boss.rageSkill.damage * (boss.currentAttack / boss.baseAttack), // 应用攻击力加成
        isRageSkill: true,
        effects: ['BOSS释放了全屏大招！']
      };
      
      // 清空怒气
      boss.currentRage = 0;
    } else {
      // 2. 普通技能逻辑
      // 检查是否有被嫁祸的目标
      let targetOrg = battle.redirectTarget;
      
      // 如果没有嫁祸目标，随机选择一个存活的组织
      if (!targetOrg) {
        const aliveOrgs = Array.from(new Set(
          Array.from(room.players.values())
            .filter(p => p.state === 'alive')
            .map(p => p.organization)
        ));
        if (aliveOrgs.length > 0) {
          targetOrg = aliveOrgs[Math.floor(Math.random() * aliveOrgs.length)];
        }
      }

      // 选择技能 (简化：随机普攻)
      const skill = boss.skills[0]; // 默认第一个是普攻
      
      action = {
        skillId: skill.id,
        skillName: skill.name,
        targetType: skill.target,
        targetOrganization: targetOrg,
        damage: skill.damage * (boss.currentAttack / boss.baseAttack),
        isRageSkill: false,
        effects: targetOrg ? [`BOSS锁定了 ${targetOrg} 发动攻击`] : ['BOSS发动攻击']
      };
    }

    // 3. 结算伤害
    this.applyBossDamage(battle, room, action);

    // 4. 重置回合状态
    battle.redirectTarget = undefined; // 回合结束，嫁祸失效

    return action;
  }

  private applyBossDamage(battle: BattleData, room: GameRoom, action: BossAction) {
    room.players.forEach(player => {
      if (player.state !== 'alive') return;

      let shouldHit = false;
      if (action.targetType === 'all') {
        shouldHit = true;
      } else if (action.targetType === 'organization' && player.organization === action.targetOrganization) {
        shouldHit = true;
      } else if (action.targetType === 'single' && player.playerId === action.targetPlayerId) {
        shouldHit = true;
      }

      if (shouldHit) {
        // 简单的伤害计算：伤害 - 防御
        const damageTaken = Math.max(1, Math.floor(action.damage - (player.defense * 0.2)));
        player.currentHealth = Math.max(0, player.currentHealth - damageTaken);
        
        if (player.currentHealth <= 0) {
          player.state = PlayerState.DEAD;
        }
      }
    });
  }
}
