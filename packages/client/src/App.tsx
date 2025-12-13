import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { 
  ClientToServerEvents, 
  ServerToClientEvents, 
  GameRoom, 
  BattlePlayer, 
  BattleData,
  Profession,
  Organization
} from '@card-game/shared'
import { LoginScreen } from './components/LoginScreen'
import { LobbyScreen } from './components/LobbyScreen'
import { RoomScreen } from './components/RoomScreen'
import { BattleScreen } from './components/BattleScreen'
import { WorldMap } from './components/WorldMap'
import './App.css'

// 根据环境选择服务器地址
const SERVER_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SERVER_URL);

// 视图类型
type ViewType = 'login' | 'world' | 'lobby' | 'room' | 'battle';

function App() {
  // App State
  const [view, setView] = useState<ViewType>('login');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [playerProfession, setPlayerProfession] = useState<Profession>(Profession.KNIGHT);
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [battleData, setBattleData] = useState<BattleData | null>(null);
  const [players, setPlayers] = useState<BattlePlayer[]>([]);

  useEffect(() => {
    // Socket Event Listeners
    socket.on('connection:success', ({ playerId }: { playerId: string }) => {
      setPlayerId(playerId);
      setView('world'); // 登录后进入世界地图
    });

    socket.on('lobby:roomList', ({ rooms }: { rooms: GameRoom[] }) => {
      setRooms(rooms);
    });

    socket.on('lobby:roomCreated', (_data: { room: GameRoom }) => {
      // If I created it, I join it automatically via room:joined
    });

    socket.on('room:joined', ({ room }: { room: GameRoom; player: BattlePlayer }) => {
      setCurrentRoom(room);
      // Convert map to array for easier rendering
      // Note: In real app, we might want to keep the map or handle this better
      // For now, we rely on room:playerJoined to update the list or re-fetch
      setPlayers(Object.values(room.players || {}) as BattlePlayer[]);
      setView('room');
    });

    socket.on('room:playerJoined', ({ player }: { player: BattlePlayer }) => {
      setPlayers(prev => [...prev, player]);
      setCurrentRoom((prev: GameRoom | null) => {
        if (!prev) return null;
        // Deep update needed in real app
        return { ...prev }; 
      });
    });

    socket.on('battle:start', ({ boss, players, turnOrder }: { boss: BattleData['boss']; players: BattlePlayer[]; turnOrder: string[] }) => {
      setBattleData({
        boss,
        currentRound: 1,
        maxRounds: 30,
        phase: 'draw',
        turnOrder,
        currentTurnIndex: 0,
        drawPile: [],
        discardPile: [],
        rounds: [],
        redirectTarget: undefined
      });
      setPlayers(players);
      setView('battle');
    });

    socket.on('battle:cardPlayed', (data: { bossHealth: number; bossRage: number }) => {
      // Update battle state (boss health, etc)
      setBattleData((prev: BattleData | null) => {
        if (!prev) return null;
        return {
          ...prev,
          boss: {
            ...prev.boss,
            currentHealth: data.bossHealth,
            currentRage: data.bossRage
          }
        };
      });
    });

    socket.on('battle:bossRevive', (data: { newHealth: number; newAttack: number; reviveCount: number }) => {
      setBattleData((prev: BattleData | null) => {
        if (!prev) return null;
        return {
          ...prev,
          boss: {
            ...prev.boss,
            currentHealth: data.newHealth,
            currentAttack: data.newAttack,
            reviveCount: data.reviveCount
          }
        };
      });
    });

    return () => {
      socket.off('connection:success');
      socket.off('lobby:roomList');
      socket.off('room:joined');
      socket.off('battle:start');
      socket.off('battle:cardPlayed');
      socket.off('battle:bossRevive');
    };
  }, []);

  // Actions
  const handleRegister = (username: string, profession: Profession, organization: Organization) => {
    setPlayerName(username);
    setPlayerProfession(profession);
    socket.emit('player:register', { username, password: '123', profession, organization });
  };

  const handleCreateRoom = (name: string, mode: any) => {
    socket.emit('lobby:createRoom', { name, mode, isPrivate: false });
  };

  const handleJoinRoom = (roomId: string) => {
    socket.emit('room:join', { roomId });
  };

  const handleStartGame = () => {
    socket.emit('room:start');
  };

  const handleLeaveRoom = () => {
    socket.emit('room:leave');
    setView('lobby');
    setCurrentRoom(null);
  };

  const handlePlayCard = (cardId: string, targetOrg?: Organization) => {
    socket.emit('battle:playCard', { cardInstanceId: cardId, targetOrganization: targetOrg });
  };

  const handleEndTurn = () => {
    socket.emit('battle:endTurn');
  };

  // 从世界地图进入大厅
  const handleEnterLobby = () => {
    setView('lobby');
  };

  // 从大厅返回世界
  const handleBackToWorld = () => {
    setView('world');
  };

  // 职业对应的精灵图标
  const getProfessionSprite = (prof: Profession): string => {
    const sprites: Record<Profession, string> = {
      [Profession.KNIGHT]: '🛡️',
      [Profession.SWORDSMAN]: '⚔️',
      [Profession.SORCERER]: '🔮',
      [Profession.GUNNER]: '🔫',
      [Profession.ASSASSIN]: '🗡️',
    };
    return sprites[prof] || '👤';
  };

  return (
    <div className="App">
      {view === 'login' && <LoginScreen onRegister={handleRegister} />}
      
      {view === 'world' && playerId && (
        <WorldMap 
          playerName={playerName}
          playerId={playerId}
          playerSprite={getProfessionSprite(playerProfession)}
          socket={socket}
          onEnterBattle={handleEnterLobby}
        />
      )}
      
      {view === 'lobby' && (
        <LobbyScreen 
          rooms={rooms} 
          onCreateRoom={handleCreateRoom} 
          onJoinRoom={handleJoinRoom}
          onBack={handleBackToWorld}
        />
      )}

      {view === 'room' && currentRoom && playerId && (
        <RoomScreen 
          room={currentRoom} 
          currentPlayerId={playerId}
          onStartGame={handleStartGame}
          onLeave={handleLeaveRoom}
        />
      )}

      {view === 'battle' && battleData && playerId && (
        <BattleScreen 
          battle={battleData}
          currentPlayerId={playerId}
          players={players}
          onPlayCard={handlePlayCard}
          onEndTurn={handleEndTurn}
        />
      )}
    </div>
  )
}

export default App
