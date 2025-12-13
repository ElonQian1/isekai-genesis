import React, { useState } from 'react';
import { 
  BattleData, 
  BattlePlayer, 
  Organization, 
  ORGANIZATION_INFO
} from '@card-game/shared';
import '../styles/pixel.css';
import '../styles/battle.css';

interface BattleScreenProps {
  battle: BattleData;
  currentPlayerId: string;
  players: BattlePlayer[];
  onPlayCard: (cardId: string, targetOrg?: Organization) => void;
  onEndTurn: () => void;
}

// 模拟卡牌数据
const MOCK_CARDS = [
  { id: 'attack_1', name: '斩击', cost: 1, type: 'attack', desc: '造成10点伤害', icon: '⚔️' },
  { id: 'attack_2', name: '重击', cost: 2, type: 'attack', desc: '造成20点伤害', icon: '🗡️' },
  { id: 'defense_1', name: '格挡', cost: 1, type: 'defense', desc: '获得5点护盾', icon: '🛡️' },
  { id: 'skill_1', name: '嫁祸', cost: 2, type: 'skill', desc: '转移Boss仇恨', icon: '🎭' },
];

export const BattleScreen: React.FC<BattleScreenProps> = ({ 
  battle, 
  currentPlayerId, 
  players,
  onPlayCard,
  onEndTurn
}) => {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [showTargetSelect, setShowTargetSelect] = useState(false);

  const me = players.find(p => p.playerId === currentPlayerId);
  const boss = battle.boss;
  const isMyTurn = battle.turnOrder[battle.currentTurnIndex] === currentPlayerId;
  const currentTurnPlayer = players.find(p => p.playerId === battle.turnOrder[battle.currentTurnIndex]);

  // 处理卡牌点击
  const handleCardClick = (cardId: string) => {
    if (!isMyTurn) return;
    
    // 如果是嫁祸卡，需要选择目标
    if (cardId === 'skill_1') {
      setSelectedCard(cardId);
      setShowTargetSelect(true);
    } else {
      onPlayCard(cardId);
    }
  };

  // 处理组织目标选择
  const handleOrgClick = (org: Organization) => {
    if (selectedCard && showTargetSelect) {
      onPlayCard(selectedCard, org);
      setSelectedCard(null);
      setShowTargetSelect(false);
    }
  };

  const healthPercent = (boss.currentHealth / boss.maxHealth) * 100;
  const ragePercent = (boss.currentRage / boss.maxRage) * 100;

  return (
    <div className="pixel-battle-screen pixel-grid-bg">
      {/* 顶部：回合信息 */}
      <div className="pixel-turn-bar">
        <div className="turn-info">
          <span className="pixel-text-small">第 {battle.currentRound} / {battle.maxRounds} 回合</span>
        </div>
        <div className="current-turn">
          {isMyTurn ? (
            <span className="pixel-badge pixel-badge-gold animate-glow">⚔️ 你的回合</span>
          ) : (
            <span className="pixel-badge">等待 {currentTurnPlayer?.username || '...'}</span>
          )}
        </div>
        <div className="turn-order">
          {battle.turnOrder.slice(0, 4).map((pid, idx) => {
            const p = players.find(pl => pl.playerId === pid);
            return (
              <div 
                key={pid} 
                className={`turn-avatar ${idx === battle.currentTurnIndex ? 'active' : ''}`}
                title={p?.username}
              >
                {idx === battle.currentTurnIndex ? '👤' : '○'}
              </div>
            );
          })}
        </div>
      </div>

      {/* BOSS区域 */}
      <div className="pixel-boss-area pixel-panel">
        <div className="boss-main">
          <div className="boss-sprite animate-float">
            <div className="boss-icon">🐉</div>
            {/* Boss受击动画效果 */}
            <div className="boss-shadow"></div>
          </div>
          
          <div className="boss-info-panel">
            <div className="boss-name-row">
              <h3 className="pixel-subtitle">{boss.name}</h3>
              <span className="pixel-badge pixel-badge-red">Lv.99</span>
            </div>
            
            {/* 血条 */}
            <div className="pixel-bar pixel-bar-health">
              <div 
                className="pixel-bar-fill" 
                style={{ width: `${healthPercent}%` }}
              />
              <span className="pixel-bar-text">
                {boss.currentHealth} / {boss.maxHealth}
              </span>
            </div>
            
            {/* 怒气条 */}
            <div className="pixel-bar pixel-bar-rage">
              <div 
                className="pixel-bar-fill" 
                style={{ width: `${ragePercent}%` }}
              />
              <span className="pixel-bar-text">
                怒气: {Math.floor(boss.currentRage)}
              </span>
            </div>

            {/* Boss状态 */}
            <div className="boss-status-tags">
              {boss.reviveCount > 0 && (
                <span className="pixel-badge pixel-badge-red">💀 复活 x{boss.reviveCount}</span>
              )}
              {battle.redirectTarget && (
                <span className="pixel-badge" style={{ background: ORGANIZATION_INFO[battle.redirectTarget].color }}>
                  🎯 仇恨: {ORGANIZATION_INFO[battle.redirectTarget].name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 中部：战场 - 队友状态 */}
      <div className="pixel-battlefield">
        <div className="org-grid">
          {(Object.values(Organization) as Organization[]).map(org => {
            const orgInfo = ORGANIZATION_INFO[org];
            const orgPlayers = players.filter(p => p.organization === org);
            const isAlive = orgPlayers.some(p => p.state === 'alive');
            const isTargetable = showTargetSelect && isAlive;
            
            return (
              <div 
                key={org} 
                className={`pixel-org-status ${!isAlive ? 'eliminated' : ''} ${isTargetable ? 'targetable animate-glow' : ''}`}
                style={{ borderColor: orgInfo.color }}
                onClick={() => isTargetable && handleOrgClick(org)}
              >
                <div className="org-status-header" style={{ background: orgInfo.color }}>
                  <span>{orgInfo.emblem}</span>
                  <span className="pixel-text-small">{orgInfo.name}</span>
                </div>
                <div className="org-members">
                  {orgPlayers.map(p => (
                    <div key={p.playerId} className={`member-row ${p.state !== 'alive' ? 'dead' : ''}`}>
                      <span className="member-name pixel-text-small">
                        {p.playerId === currentPlayerId ? '👤 ' : ''}{p.username}
                      </span>
                      <div className="member-hp-bar">
                        <div 
                          className="hp-fill" 
                          style={{ 
                            width: `${(p.currentHealth / p.maxHealth) * 100}%`,
                            background: p.state === 'alive' ? 'var(--pixel-green)' : 'var(--pixel-gray)'
                          }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 战斗日志 */}
        <div className="pixel-battle-log pixel-panel pixel-panel-dark">
          <div className="log-header pixel-text-small">📜 战斗日志</div>
          <div className="log-content">
            <div className="log-entry">⚔️ 战斗开始！</div>
            <div className="log-entry">🐉 深渊泰坦 咆哮着出现了！</div>
          </div>
        </div>
      </div>

      {/* 底部：玩家区域 */}
      <div className="pixel-player-area pixel-panel">
        <div className="player-info-section">
          <div className="player-avatar-box">
            <span className="avatar-icon">👤</span>
          </div>
          <div className="player-stats-box">
            <div className="stat-name pixel-text">{me?.username}</div>
            <div className="stat-row">
              <span className="pixel-text-small">HP</span>
              <div className="pixel-bar pixel-bar-health" style={{ width: '120px', height: '14px' }}>
                <div 
                  className="pixel-bar-fill" 
                  style={{ width: `${((me?.currentHealth || 0) / (me?.maxHealth || 1)) * 100}%` }}
                />
                <span className="pixel-bar-text" style={{ fontSize: '8px' }}>
                  {me?.currentHealth} / {me?.maxHealth}
                </span>
              </div>
            </div>
            <div className="stat-row">
              <span className="pixel-text-small">组织</span>
              <span className="pixel-badge" style={{ background: me ? ORGANIZATION_INFO[me.organization].color : undefined }}>
                {me ? ORGANIZATION_INFO[me.organization].name : ''}
              </span>
            </div>
          </div>
          <button 
            className={`pixel-btn ${isMyTurn ? 'pixel-btn-gold' : ''}`}
            disabled={!isMyTurn}
            onClick={onEndTurn}
          >
            结束回合
          </button>
        </div>

        {/* 手牌区域 */}
        <div className="pixel-hand-area">
          <div className="hand-label pixel-text-small">手牌</div>
          <div className="pixel-hand-cards">
            {MOCK_CARDS.map((card, idx) => (
              <div 
                key={idx} 
                className={`pixel-card ${isMyTurn ? 'playable' : ''} ${selectedCard === card.id ? 'selected' : ''}`}
                onClick={() => handleCardClick(card.id)}
              >
                <div className="card-cost-gem">{card.cost}</div>
                <div className="card-icon">{card.icon}</div>
                <div className="card-name-text">{card.name}</div>
                <div className="card-type-tag pixel-badge">
                  {card.type === 'attack' ? '攻击' : card.type === 'defense' ? '防御' : '技能'}
                </div>
                <div className="card-desc-text pixel-text-small">{card.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 目标选择提示 */}
      {showTargetSelect && (
        <div className="target-hint pixel-panel pixel-panel-dark">
          <span className="pixel-text">🎯 选择一个组织作为嫁祸目标</span>
          <button 
            className="pixel-btn" 
            onClick={() => { setShowTargetSelect(false); setSelectedCard(null); }}
          >
            取消
          </button>
        </div>
      )}
    </div>
  );
};
