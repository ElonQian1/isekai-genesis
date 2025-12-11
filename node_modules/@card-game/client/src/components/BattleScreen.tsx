import React, { useState } from 'react';
import { 
  BattleData, 
  BattlePlayer, 
  CardInstance, 
  Boss, 
  Organization, 
  ORGANIZATION_INFO,
  CardType
} from 'shared';

interface BattleScreenProps {
  battle: BattleData;
  currentPlayerId: string;
  players: BattlePlayer[];
  onPlayCard: (cardId: string, targetOrg?: Organization) => void;
  onEndTurn: () => void;
}

export const BattleScreen: React.FC<BattleScreenProps> = ({ 
  battle, 
  currentPlayerId, 
  players,
  onPlayCard,
  onEndTurn
}) => {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [targetOrg, setTargetOrg] = useState<Organization | null>(null);

  const me = players.find(p => p.playerId === currentPlayerId);
  const boss = battle.boss;
  const isMyTurn = battle.turnOrder[battle.currentTurnIndex] === currentPlayerId;

  // 处理出牌
  const handleCardClick = (card: CardInstance) => {
    if (!isMyTurn) return;
    
    if (card.card.type === CardType.REDIRECT) {
      // 如果是嫁祸牌，需要选择目标
      setSelectedCard(card.instanceId);
      // 如果卡牌自带目标（如特定组织的嫁祸牌），直接出牌
      if (card.card.redirectTarget) {
        onPlayCard(card.instanceId, card.card.redirectTarget);
        setSelectedCard(null);
      }
    } else {
      // 普通牌直接打出
      onPlayCard(card.instanceId);
    }
  };

  // 处理嫁祸目标选择
  const handleOrgClick = (org: Organization) => {
    if (selectedCard && targetOrg === null) {
      onPlayCard(selectedCard, org);
      setSelectedCard(null);
    }
  };

  return (
    <div className="battle-screen">
      {/* 顶部：BOSS区域 */}
      <div className="boss-area">
        <div className="boss-info">
          <h3>{boss.name} <span className="boss-level">Lv.99</span></h3>
          <div className="boss-bars">
            <div className="health-bar-container">
              <div 
                className="health-bar" 
                style={{ width: `${(boss.currentHealth / boss.maxHealth) * 100}%` }}
              />
              <span className="bar-text">{boss.currentHealth} / {boss.maxHealth}</span>
            </div>
            <div className="rage-bar-container">
              <div 
                className="rage-bar" 
                style={{ width: `${(boss.currentRage / boss.maxRage) * 100}%` }}
              />
              <span className="bar-text">怒气: {Math.floor(boss.currentRage)}</span>
            </div>
          </div>
          <div className="boss-status">
            {boss.reviveCount > 0 && <span className="status-badge revive">复活 x{boss.reviveCount}</span>}
            {battle.redirectTarget && (
              <span className="status-badge redirect">
                仇恨目标: {ORGANIZATION_INFO[battle.redirectTarget].name}
              </span>
            )}
          </div>
        </div>
        <div className="boss-avatar">
          👾
          {/* 简单的受击动画占位 */}
        </div>
      </div>

      {/* 中部：战场信息 & 队友 */}
      <div className="battle-field">
        <div className="organizations-status">
          {Object.values(Organization).map(org => {
            const orgInfo = ORGANIZATION_INFO[org];
            const orgPlayers = players.filter(p => p.organization === org);
            const isAlive = orgPlayers.some(p => p.state === 'alive');
            
            return (
              <div 
                key={org} 
                className={`org-status-card ${!isAlive ? 'eliminated' : ''} ${selectedCard && !targetOrg ? 'clickable' : ''}`}
                style={{ borderColor: orgInfo.color }}
                onClick={() => handleOrgClick(org)}
              >
                <div className="org-icon">{orgInfo.emblem}</div>
                <div className="org-hp">
                  {orgPlayers.map(p => (
                    <div key={p.playerId} className="mini-hp-bar">
                      <div 
                        className="fill" 
                        style={{ 
                          width: `${(p.currentHealth / p.maxHealth) * 100}%`,
                          backgroundColor: p.state === 'alive' ? '#4caf50' : '#555'
                        }} 
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="battle-log">
          {/* 这里应该显示战斗日志，暂时留空 */}
          <div className="log-entry">战斗开始...</div>
        </div>
      </div>

      {/* 底部：玩家区域 */}
      <div className="player-area">
        <div className="player-stats">
          <div className="avatar">{me?.profession}</div>
          <div className="stats-info">
            <div>HP: {me?.currentHealth} / {me?.maxHealth}</div>
            <div>MP: 100 / 100</div>
            <div>组织: {me ? ORGANIZATION_INFO[me.organization].name : ''}</div>
          </div>
          <button 
            className="end-turn-btn" 
            disabled={!isMyTurn}
            onClick={onEndTurn}
          >
            结束回合
          </button>
        </div>

        <div className="hand-cards">
          {/* 模拟手牌，因为后端还没完全实现发牌逻辑，这里先mock几张显示效果 */}
          {(me?.handCards.length ? me.handCards : ['card_basic_attack', 'card_basic_defense']).map((cardId, idx) => (
             // 注意：实际应该用 CardInstance，这里简化演示
            <div 
              key={idx} 
              className={`card ${isMyTurn ? 'playable' : ''}`}
              onClick={() => isMyTurn && onPlayCard(cardId)} // 简化
            >
              <div className="card-cost">1</div>
              <div className="card-name">{cardId}</div>
              <div className="card-desc">效果描述...</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
