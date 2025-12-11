import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { 
  ClientToServerEvents, 
  ServerToClientEvents, 
  GameRoom, 
  BattlePlayer, 
  BattleData,
  Profession,
  Organization,
  Boss,
  CardInstance
} from 'shared'
import { LoginScreen } from './components/LoginScreen'
import { LobbyScreen } from './components/LobbyScreen'
import { RoomScreen } from './components/RoomScreen'
import { BattleScreen } from './components/BattleScreen'
import './App.css'

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io('http://localhost:3000');

function App() {
  // App State
  const [view, setView] = useState<'login' | 'lobby' | 'room' | 'battle'>('login');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [battleData, setBattleData] = useState<BattleData | null>(null);
  const [players, setPlayers] = useState<BattlePlayer[]>([]);

  useEffect(() => {
    // Socket Event Listeners
    socket.on('connection:success', ({ playerId }) => {
      setPlayerId(playerId);
      setView('lobby');
    });

    socket.on('lobby:roomList', ({ rooms }) => {
      setRooms(rooms);
    });

    socket.on('lobby:roomCreated', ({ room }) => {
      // If I created it, I join it automatically via room:joined
    });

    socket.on('room:joined', ({ room, player }) => {
      setCurrentRoom(room);
      // Convert map to array for easier rendering
      // Note: In real app, we might want to keep the map or handle this better
      // For now, we rely on room:playerJoined to update the list or re-fetch
      setPlayers(Object.values(room.players || {}));
      setView('room');
    });

    socket.on('room:playerJoined', ({ player }) => {
      setPlayers(prev => [...prev, player]);
      setCurrentRoom(prev => {
        if (!prev) return null;
        // Deep update needed in real app
        return { ...prev }; 
      });
    });

    socket.on('battle:start', ({ boss, players, turnOrder }) => {
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

    socket.on('battle:cardPlayed', (data) => {
      // Update battle state (boss health, etc)
      setBattleData(prev => {
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

    socket.on('battle:bossRevive', (data) => {
      setBattleData(prev => {
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

  const handleBackToLogin = () => {
    setView('login');
    setPlayerId(null);
  };

  return (
    <div className="App">
      {view === 'login' && <LoginScreen onRegister={handleRegister} />}
      
      {view === 'lobby' && (
        <LobbyScreen 
          rooms={rooms} 
          onCreateRoom={handleCreateRoom} 
          onJoinRoom={handleJoinRoom}
          onBack={handleBackToLogin}
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
