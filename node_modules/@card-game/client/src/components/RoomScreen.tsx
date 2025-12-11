import React from 'react';
import { GameRoom, BattlePlayer, GameMode, Organization, ORGANIZATION_INFO } from 'shared';

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
      <div className="formation-grid">
        {room.formations.map(formation => {
          const orgInfo = ORGANIZATION_INFO[formation.organization];
          return (
            <div key={formation.organization} className="org-slot" style={{ borderColor: orgInfo.color }}>
              <div className="org-header" style={{ backgroundColor: orgInfo.color }}>
                {orgInfo.emblem} {orgInfo.name}
              </div>
              <div className="org-players">
                {formation.players.map(p => (
                  <div key={p.playerId} className="player-slot filled">
                    <span className="player-name">{p.username}</span>
                    <span className="player-prof">{p.profession}</span>
                  </div>
                ))}
                {[...Array(2 - formation.players.length)].map((_, i) => (
                  <div key={`empty-${i}`} className="player-slot empty">
                    等待加入...
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
    <div className="room-screen">
      <header className="room-header">
        <button onClick={onLeave} className="back-btn">← 离开房间</button>
        <div className="room-title">
          <h2>{room.name}</h2>
          <span className="room-id">ID: {room.id.slice(0, 8)}</span>
        </div>
      </header>

      <div className="room-content">
        {room.mode === GameMode.WEEKLY_BOSS ? (
          renderWeeklyFormation()
        ) : (
          <div className="player-list">
            {playersList.map(p => (
              <div key={p.playerId} className="player-card">
                {p.username} ({p.profession})
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="room-footer">
        <div className="room-status">
          当前人数: {playersList.length} / {room.maxPlayers}
        </div>
        {isHost && (
          <button 
            className="start-game-btn"
            onClick={onStartGame}
            // disabled={playersList.length < room.minPlayers} // 开发测试时先注释掉
          >
            开始讨伐
          </button>
        )}
        {!isHost && (
          <div className="waiting-msg">等待队长开始游戏...</div>
        )}
      </footer>
    </div>
  );
};
