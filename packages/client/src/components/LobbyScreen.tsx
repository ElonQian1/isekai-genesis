import React, { useState } from 'react';
import { GameRoom, GameMode, GAME_MODE_CONFIG } from '@card-game/shared';
import '../styles/pixel.css';
import '../styles/lobby.css';

interface LobbyScreenProps {
  rooms: GameRoom[];
  onCreateRoom: (name: string, mode: GameMode) => void;
  onJoinRoom: (roomId: string) => void;
  onBack: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({ rooms, onCreateRoom, onJoinRoom, onBack }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedMode, setSelectedMode] = useState<GameMode>(GameMode.WEEKLY_BOSS);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoomName.trim()) {
      onCreateRoom(newRoomName, selectedMode);
      setShowCreateModal(false);
      setNewRoomName('');
    }
  };

  return (
    <div className="pixel-lobby-screen pixel-grid-bg">
      {/* 顶部导航 */}
      <header className="pixel-lobby-header">
        <button className="pixel-btn" onClick={onBack}>
          ← 返回
        </button>
        <div className="lobby-title">
          <h2 className="pixel-subtitle">📋 任务大厅</h2>
          <span className="pixel-text-small">MISSION BOARD</span>
        </div>
        <button className="pixel-btn pixel-btn-gold" onClick={() => setShowCreateModal(true)}>
          + 发布任务
        </button>
      </header>

      {/* 房间列表 */}
      <div className="pixel-room-list">
        {rooms.length === 0 ? (
          <div className="pixel-empty-state pixel-panel">
            <div className="empty-icon">📭</div>
            <p className="pixel-text">暂无正在进行的任务...</p>
            <p className="pixel-text-small">点击「发布任务」创建新的讨伐队</p>
          </div>
        ) : (
          rooms.map(room => (
            <div key={room.id} className="pixel-room-card pixel-panel">
              <div className="room-card-left">
                <div className="room-icon">⚔️</div>
              </div>
              <div className="room-card-center">
                <h3 className="pixel-text">{room.name}</h3>
                <div className="room-tags">
                  <span className="pixel-badge pixel-badge-gold">
                    {GAME_MODE_CONFIG[room.mode].name}
                  </span>
                  <span className={`pixel-badge ${room.state === 'waiting' ? 'pixel-badge-green' : 'pixel-badge-red'}`}>
                    {room.state === 'waiting' ? '等待中' : '进行中'}
                  </span>
                </div>
              </div>
              <div className="room-card-right">
                <div className="room-player-count pixel-text-small">
                  👥 {Object.keys(room.players).length || 0} / {room.maxPlayers}
                </div>
                <button 
                  className="pixel-btn pixel-btn-green"
                  onClick={() => onJoinRoom(room.id)}
                  disabled={Object.keys(room.players).length >= room.maxPlayers}
                >
                  加入
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 创建房间弹窗 */}
      {showCreateModal && (
        <>
          <div className="pixel-dialog-overlay" onClick={() => setShowCreateModal(false)}></div>
          <div className="pixel-dialog">
            <h3 className="pixel-subtitle">📜 发布新任务</h3>
            <form onSubmit={handleCreate}>
              <div className="pixel-input-group">
                <label className="pixel-text-small">任务名称</label>
                <input
                  className="pixel-input"
                  value={newRoomName}
                  onChange={e => setNewRoomName(e.target.value)}
                  placeholder="例如：讨伐深渊泰坦"
                  required
                />
              </div>
              <div className="pixel-input-group">
                <label className="pixel-text-small">任务模式</label>
                <select 
                  className="pixel-input"
                  value={selectedMode} 
                  onChange={e => setSelectedMode(e.target.value as GameMode)}
                >
                  {(Object.values(GameMode) as GameMode[]).map(mode => (
                    <option key={mode} value={mode}>
                      {GAME_MODE_CONFIG[mode].name}
                    </option>
                  ))}
                </select>
                <p className="pixel-text-small mode-desc">
                  {GAME_MODE_CONFIG[selectedMode].description}
                </p>
              </div>
              <div className="pixel-btn-group">
                <button type="button" className="pixel-btn" onClick={() => setShowCreateModal(false)}>
                  取消
                </button>
                <button type="submit" className="pixel-btn pixel-btn-gold">
                  确认发布
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};
