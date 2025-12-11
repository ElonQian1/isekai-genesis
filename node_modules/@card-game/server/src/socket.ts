import { Server, Socket } from 'socket.io';
import { 
  ClientToServerEvents, 
  ServerToClientEvents, 
  InterServerEvents, 
  SocketData,
  GameMode,
  GameState,
  PlayerState,
  Profession,
  Organization,
  Player,
  PROFESSION_BASE_STATS,
  PROFESSION_TALENTS,
  WEEKLY_BOSSES,
  createBossInstance
} from 'shared';
import { RoomService } from './services/RoomService';
import { BattleService } from './services/BattleService';
import { v4 as uuidv4 } from 'uuid';

const roomService = new RoomService();
const battleService = new BattleService();

// 模拟数据库
const players = new Map<string, Player>();

export function setupSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
  
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // 1. 注册/登录 (简化版)
    socket.on('player:register', ({ username, profession, organization }) => {
      const playerId = uuidv4();
      const newPlayer: Player = {
        id: playerId,
        odAccountId: 'test_account',
        username,
        profession,
        organization,
        talent: { ...PROFESSION_TALENTS[profession] },
        stats: { ...PROFESSION_BASE_STATS[profession] },
        baseStats: { ...PROFESSION_BASE_STATS[profession] },
        progression: { level: 1, experience: 0, experienceToNextLevel: 100, totalExperience: 0 },
        equipment: {},
        state: PlayerState.ALIVE,
        gold: 0,
        survivalPoints: 0,
        statistics: {
          totalBattles: 0, wins: 0, losses: 0, bossKills: 0, weeklyBossKills: 0,
          playerKills: 0, deaths: 0, damageDealt: 0, damageTaken: 0, healingDone: 0
        },
        createdAt: new Date(),
        lastLoginAt: new Date()
      };
      
      players.set(socket.id, newPlayer); // 临时用socket.id绑定
      socket.data.playerId = playerId;
      socket.data.username = username;
      
      socket.emit('connection:success', { playerId });
      socket.emit('player:info', { player: newPlayer });
      
      // 发送房间列表
      socket.emit('lobby:roomList', { rooms: roomService.getAllRooms() });
    });

    // 2. 创建房间
    socket.on('lobby:createRoom', ({ name, mode, isPrivate, password }) => {
      const player = players.get(socket.id);
      if (!player) return;

      const room = roomService.createRoom(player, name, mode, isPrivate, password);
      socket.join(room.id);
      socket.data.roomId = room.id;
      
      socket.emit('lobby:roomCreated', { room });
      socket.emit('room:joined', { room, player: room.players.get(player.id)! });
      
      io.emit('lobby:roomList', { rooms: roomService.getAllRooms() });
    });

    // 3. 加入房间
    socket.on('room:join', ({ roomId }) => {
      const player = players.get(socket.id);
      const room = roomService.getRoom(roomId);
      
      if (!player || !room) {
        socket.emit('room:error', { message: '无法加入房间' });
        return;
      }

      if (roomService.addPlayerToRoom(room, player)) {
        socket.join(roomId);
        socket.data.roomId = roomId;
        
        socket.emit('room:joined', { room, player: room.players.get(player.id)! });
        socket.to(roomId).emit('room:playerJoined', { player: room.players.get(player.id)! });
        io.emit('lobby:roomUpdated', { room });
      } else {
        socket.emit('room:error', { message: '房间已满或不符合条件' });
      }
    });

    // 4. 准备/开始游戏
    socket.on('room:start', () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;
      
      const room = roomService.getRoom(roomId);
      if (!room || room.hostId !== socket.data.playerId) return;

      // 检查人数 (简化：直接开始)
      // 初始化BOSS
      const bossTemplate = WEEKLY_BOSSES[0]; // 默认第一个周本BOSS
      if (!bossTemplate) return;

      const battleData = battleService.initBattle(room, createBossInstance(bossTemplate));
      room.battle = battleData;
      room.state = GameState.STARTING;

      io.to(roomId).emit('battle:start', {
        boss: battleData.boss,
        players: Array.from(room.players.values()),
        turnOrder: battleData.turnOrder
      });
    });

    // 5. 战斗：出牌
    socket.on('battle:playCard', ({ cardInstanceId, targetOrganization }) => {
      const roomId = socket.data.roomId;
      const room = roomService.getRoom(roomId!);
      if (!room || !room.battle) return;

      const player = room.players.get(socket.data.playerId!);
      if (!player) return;

      // 简化：直接假设cardInstanceId就是cardId
      const result = battleService.processCardPlay(room.battle, player, cardInstanceId, targetOrganization);
      
      io.to(roomId!).emit('battle:cardPlayed', {
        playerId: player.playerId,
        cardId: cardInstanceId,
        damage: result.damage,
        effects: result.effects,
        bossHealth: room.battle.boss.currentHealth,
        bossRage: room.battle.boss.currentRage
      });

      // 检查BOSS状态
      const status = battleService.checkBossStatus(room.battle, room);
      if (status.revived) {
        io.to(roomId!).emit('battle:bossRevive', {
          newHealth: room.battle.boss.currentHealth,
          newAttack: room.battle.boss.currentAttack,
          reviveCount: room.battle.boss.reviveCount
        });
        io.to(roomId!).emit('chat:message', {
          senderId: 'system',
          senderName: '系统',
          message: status.message!,
          timestamp: new Date(),
          isSystem: true
        });
      } else if (status.isDead) {
        io.to(roomId!).emit('battle:end', { 
          result: { 
            isVictory: true, 
            totalRounds: room.battle.currentRound,
            totalDamageDealt: 0, // 需统计
            bossReviveCount: room.battle.boss.reviveCount,
            playerStats: [],
            rewards: []
          } 
        });
      }
    });

    // 6. 战斗：结束回合 (触发BOSS行动)
    socket.on('battle:endTurn', () => {
      const roomId = socket.data.roomId;
      const room = roomService.getRoom(roomId!);
      if (!room || !room.battle) return;

      // 简化：假设所有玩家行动完后触发BOSS
      // 实际应轮询 turnOrder
      
      const bossAction = battleService.executeBossTurn(room.battle, room);
      
      io.to(roomId!).emit('battle:bossAttack', {
        action: bossAction,
        affectedPlayers: [] // 需计算
      });

      // 更新玩家血量
      room.players.forEach(p => {
        io.to(roomId!).emit('player:update', { player: p as any });
      });
    });

    socket.on('disconnect', () => {
      if (socket.data.roomId) {
        roomService.removePlayerFromRoom(socket.data.roomId, socket.data.playerId!);
        io.emit('lobby:roomList', { rooms: roomService.getAllRooms() });
      }
    });
  });
}
