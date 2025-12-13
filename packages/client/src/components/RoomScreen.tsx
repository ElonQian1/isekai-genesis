import React from 'react';
import { GameRoom, BattlePlayer, GameMode, ORGANIZATION_INFO, OrganizationFormation } from '@card-game/shared';
import '../styles/pixel.css';
import '../styles/room.css';

interface RoomScreenProps {
  room: GameRoom;
  currentPlayerId: string;
  onStartGame: () => void;
  onLeave: () => void;
}

export const RoomScreen: React.FC<RoomScreenProps> = ({ 
  room, 
  currentPlayerId, 
  onStartGame, 
  onLeave 
}) => {
  const isHost = room.hostId === currentPlayerId;
  const playersList = Object.values(room.players || {}) as BattlePlayer[];

  // 渲染周本模式的组织阵型
  const renderWeeklyFormation = () => {
    return (
      <div className="pixel-formation-grid">
        {room.formations.map((formation: OrganizationFormation) => {
          const orgInfo = ORGANIZATION_INFO[formation.organization];
          return (
            <div 
              key={formation.organization} 
              className="pixel-org-slot pixel-panel"
              style={{ borderColor: orgInfo.color }}
            >
              <div 
                className="pixel-org-header" 
                style={{ background: `linear-gradient(90deg, ${orgInfo.color}, transparent)` }}
              >
                <span className="org-emblem">{orgInfo.emblem}</span>
                <span className="org-name">{orgInfo.name}</span>
              </div>
              <div className="pixel-org-players">
                {formation.players.map(p => (
                  <div key={p.playerId} className="pixel-player-slot filled">
                    <span className="player-avatar">👤</span>
                    <div className="player-info">
                      <span className="player-name">{p.username}</span>
                      <span className="player-prof pixel-badge">{p.profession}</span>
                    </div>
                    {p.playerId === room.hostId && (
                      <span className="host-badge pixel-badge pixel-badge-gold">队长</span>
                    )}
                  </div>
                ))}
                {[...Array(2 - formation.players.length)].map((_, i) => (
                  <div key={`empty-${i}`} className="pixel-player-slot empty">
                    <span className="slot-icon">➕</span>
                    <span className="pixel-text-small">等待加入...</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="pixel-room-screen pixel-grid-bg">
      {/* 顶部 */}
      <header className="pixel-room-header">
        <button onClick={onLeave} className="pixel-btn">
          ← 离开
        </button>
        <div className="room-title-area">
          <h2 className="pixel-subtitle">⚔️ {room.name}</h2>
          <span className="pixel-text-small room-id">房间ID: {room.id.slice(0, 8)}</span>
        </div>
        <div className="room-status-badge">
          <span className="pixel-badge pixel-badge-gold">
            👥 {playersList.length} / {room.maxPlayers}
          </span>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="pixel-room-content">
        <div className="room-banner pixel-panel">
          <div className="banner-icon animate-float">🐉</div>
          <div className="banner-text">
            <h3 className="pixel-text">讨伐目标：深渊泰坦</h3>
            <p className="pixel-text-small">组织你的队伍，准备战斗！</p>
          </div>
        </div>

        {room.mode === GameMode.WEEKLY_BOSS ? (
          renderWeeklyFormation()
        ) : (
          <div className="pixel-player-list pixel-panel">
            {playersList.map(p => (
              <div key={p.playerId} className="pixel-player-card">
                <span className="player-avatar">👤</span>
                <span className="player-name">{p.username}</span>
                <span className="pixel-badge">{p.profession}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部操作区 */}
      <footer className="pixel-room-footer">
        {isHost ? (
          <button 
            className="pixel-btn pixel-btn-gold start-btn"
            onClick={onStartGame}
          >
            ⚔️ 开始讨伐 ⚔️
          </button>
        ) : (
          <div className="waiting-state">
            <div className="waiting-dots">
              <span className="dot animate-blink">●</span>
              <span className="dot animate-blink" style={{ animationDelay: '0.2s' }}>●</span>
              <span className="dot animate-blink" style={{ animationDelay: '0.4s' }}>●</span>
            </div>
            <span className="pixel-text">等待队长开始游戏...</span>
          </div>
        )}
      </footer>
    </div>
  );
};
