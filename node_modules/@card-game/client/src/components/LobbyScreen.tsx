import React, { useState } from 'react';
import { GameRoom, GameMode, GAME_MODE_CONFIG } from 'shared';

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
    <div className="lobby-screen">
      <header className="lobby-header">
        <button className="back-btn" onClick={onBack}>← 返回</button>
        <h2>任务大厅</h2>
        <button className="create-btn" onClick={() => setShowCreateModal(true)}>
          发布新任务 (创建房间)
        </button>
      </header>

      <div className="room-list">
        {rooms.length === 0 ? (
          <div className="empty-state">暂无正在进行的任务...</div>
        ) : (
          rooms.map(room => (
            <div key={room.id} className="room-card">
              <div className="room-info">
                <h3>{room.name}</h3>
                <span className="mode-tag">{GAME_MODE_CONFIG[room.mode].name}</span>
                <span className="status-tag">{room.state}</span>
              </div>
              <div className="room-meta">
                <span>人数: {Object.keys(room.players).length || 0} / {room.maxPlayers}</span>
                <button 
                  onClick={() => onJoinRoom(room.id)}
                  disabled={Object.keys(room.players).length >= room.maxPlayers}
                >
                  加入队伍
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>创建新任务</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>任务名称</label>
                <input
                  value={newRoomName}
                  onChange={e => setNewRoomName(e.target.value)}
                  placeholder="例如：讨伐深渊泰坦"
                  required
                />
              </div>
              <div className="form-group">
                <label>任务模式</label>
                <select 
                  value={selectedMode} 
                  onChange={e => setSelectedMode(e.target.value as GameMode)}
                >
                  {Object.values(GameMode).map(mode => (
                    <option key={mode} value={mode}>
                      {GAME_MODE_CONFIG[mode].name}
                    </option>
                  ))}
                </select>
                <p className="mode-desc">{GAME_MODE_CONFIG[selectedMode].description}</p>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)}>取消</button>
                <button type="submit">确认发布</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
