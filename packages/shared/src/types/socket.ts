/**
 * Socket事件类型定义
 */

import { Organization, Profession, GameMode } from './enums';
import { Player, BattlePlayer } from './player';
import { GameRoom, BattleResult } from './game';
import { Boss, BossAction } from './boss';
import { CardInstance } from './card';

// 世界地图上的玩家状态
export interface WorldPlayer {
  id: string;
  username: string;
  sprite: string;
  position: { x: number; y: number };
  direction: 'up' | 'down' | 'left' | 'right';
  mapId: string;
}

// 私聊消息
export interface PrivateMessage {
  senderId: string;
  senderName: string;
  receiverId: string;
  message: string;
  timestamp: Date;
}

// 组队邀请
export interface TeamInvite {
  inviteId: string;
  inviterId: string;
  inviterName: string;
  targetId: string;
  timestamp: Date;
}

// ==================== 服务器发送给客户端的事件 ====================
export interface ServerToClientEvents {
  // 连接相关
  'connection:success': (data: { playerId: string }) => void;
  'connection:error': (data: { message: string }) => void;
  
  // 世界地图相关
  'world:players': (data: { players: WorldPlayer[] }) => void;
  'world:playerJoined': (data: { player: WorldPlayer }) => void;
  'world:playerLeft': (data: { playerId: string }) => void;
  'world:playerMoved': (data: { playerId: string; position: { x: number; y: number }; direction: 'up' | 'down' | 'left' | 'right' }) => void;
  
  // 玩家相关
  'player:info': (data: { player: Player }) => void;
  'player:update': (data: { player: Partial<Player> }) => void;
  'player:levelUp': (data: { newLevel: number; rewards: any }) => void;
  
  // 大厅相关
  'lobby:roomList': (data: { rooms: GameRoom[] }) => void;
  'lobby:roomCreated': (data: { room: GameRoom }) => void;
  'lobby:roomUpdated': (data: { room: GameRoom }) => void;
  'lobby:roomDeleted': (data: { roomId: string }) => void;
  
  // 房间相关
  'room:joined': (data: { room: GameRoom; player: BattlePlayer }) => void;
  'room:left': (data: { playerId: string }) => void;
  'room:playerJoined': (data: { player: BattlePlayer }) => void;
  'room:playerLeft': (data: { playerId: string }) => void;
  'room:playerReady': (data: { playerId: string; isReady: boolean }) => void;
  'room:starting': (data: { countdown: number }) => void;
  'room:error': (data: { message: string }) => void;
  
  // 战斗相关
  'battle:start': (data: { 
    boss: Boss; 
    players: BattlePlayer[];
    turnOrder: string[];
  }) => void;
  'battle:roundStart': (data: { roundNumber: number }) => void;
  'battle:drawCards': (data: { cards: CardInstance[] }) => void;
  'battle:turnStart': (data: { playerId: string; timeLimit: number }) => void;
  'battle:cardPlayed': (data: {
    playerId: string;
    cardId: string;
    damage: number;
    effects: string[];
    bossHealth: number;
    bossRage: number;
  }) => void;
  'battle:turnEnd': (data: { playerId: string }) => void;
  'battle:bossAttack': (data: { action: BossAction; affectedPlayers: string[] }) => void;
  'battle:bossRage': (data: { 
    skill: { name: string; description: string };
    damage: number;
    affectedPlayers: string[];
  }) => void;
  'battle:bossRevive': (data: {
    newHealth: number;
    newAttack: number;
    reviveCount: number;
  }) => void;
  'battle:playerDied': (data: { playerId: string }) => void;
  'battle:organizationEliminated': (data: { organization: Organization }) => void;
  'battle:roundEnd': (data: { 
    roundNumber: number;
    bossHealth: number;
    bossRage: number;
    aliveOrganizations: Organization[];
  }) => void;
  'battle:end': (data: { result: BattleResult }) => void;
  
  // 聊天
  'chat:message': (data: { 
    senderId: string;
    senderName: string;
    message: string;
    timestamp: Date;
    isSystem: boolean;
  }) => void;
  
  // 私聊相关
  'chat:privateMessage': (data: {
    senderId: string;
    senderName: string;
    message: string;
    timestamp: Date;
  }) => void;
  'chat:privateMessageSent': (data: {
    receiverId: string;
    receiverName: string;
    message: string;
    timestamp: Date;
  }) => void;
  'chat:privateError': (data: { message: string }) => void;
  
  // 组队邀请相关
  'team:inviteReceived': (data: {
    inviteId: string;
    inviterId: string;
    inviterName: string;
  }) => void;
  'team:inviteSent': (data: { targetId: string; targetName: string }) => void;
  'team:inviteAccepted': (data: { playerId: string; playerName: string }) => void;
  'team:inviteDeclined': (data: { playerId: string; playerName: string }) => void;
  'team:inviteError': (data: { message: string }) => void;
}

// ==================== 客户端发送给服务器的事件 ====================
export interface ClientToServerEvents {
  // 玩家相关
  'player:login': (data: { username: string; password: string }) => void;
  'player:register': (data: { 
    username: string; 
    password: string;
    profession: Profession;
    organization: Organization;
  }) => void;
  'player:selectProfession': (data: { profession: Profession }) => void;
  'player:selectOrganization': (data: { organization: Organization }) => void;
  
  // 大厅相关
  'lobby:getRooms': (data: { mode?: GameMode }) => void;
  'lobby:createRoom': (data: {
    name: string;
    mode: GameMode;
    isPrivate: boolean;
    password?: string;
  }) => void;
  
  // 房间相关
  'room:join': (data: { roomId: string; password?: string }) => void;
  'room:leave': () => void;
  'room:ready': (data: { isReady: boolean }) => void;
  'room:start': () => void;  // 房主开始游戏
  
  // 战斗相关
  'battle:playCard': (data: { 
    cardInstanceId: string;
    targetId?: string;           // 目标玩家ID（如果适用）
    targetOrganization?: Organization;  // 嫁祸目标组织
  }) => void;
  'battle:endTurn': () => void;
  'battle:useTalent': () => void;  // 使用天赋技能
  
  // 聊天
  'chat:send': (data: { message: string }) => void;
  
  // 世界地图相关
  'world:join': (data: { mapId: string; position: { x: number; y: number }; direction: 'up' | 'down' | 'left' | 'right'; sprite: string }) => void;
  'world:leave': () => void;
  'world:move': (data: { position: { x: number; y: number }; direction: 'up' | 'down' | 'left' | 'right' }) => void;
  
  // 私聊相关
  'chat:sendPrivate': (data: { targetId: string; message: string }) => void;
  
  // 组队邀请相关
  'team:invite': (data: { targetId: string }) => void;
  'team:acceptInvite': (data: { inviteId: string }) => void;
  'team:declineInvite': (data: { inviteId: string }) => void;
}

// ==================== Socket间事件（服务器内部） ====================
export interface InterServerEvents {
  ping: () => void;
}

// ==================== Socket数据 ====================
export interface SocketData {
  playerId: string;
  username: string;
  roomId?: string;
}
