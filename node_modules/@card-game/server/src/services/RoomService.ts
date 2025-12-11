import { 
  GameRoom, 
  GameMode, 
  GameState, 
  PlayerState,
  BattlePlayer, 
  Player, 
  GAME_MODE_CONFIG,
  Organization,
  OrganizationFormation
} from 'shared';
import { v4 as uuidv4 } from 'uuid';

export class RoomService {
  private rooms: Map<string, GameRoom> = new Map();

  createRoom(
    host: Player, 
    name: string, 
    mode: GameMode, 
    isPrivate: boolean, 
    password?: string
  ): GameRoom {
    const config = GAME_MODE_CONFIG[mode];
    
    const room: GameRoom = {
      id: uuidv4(),
      name,
      mode,
      state: GameState.WAITING,
      hostId: host.id,
      maxPlayers: config.maxPlayers,
      minPlayers: config.minPlayers,
      formations: this.initFormations(mode),
      players: new Map(),
      isPrivate,
      password,
      createdAt: new Date()
    };

    this.addPlayerToRoom(room, host);
    this.rooms.set(room.id, room);
    return room;
  }

  private initFormations(mode: GameMode): OrganizationFormation[] {
    if (mode === GameMode.WEEKLY_BOSS) {
      return [
        Organization.IRON_FORTRESS,
        Organization.SHADOW_COVENANT,
        Organization.FLAME_LEGION,
        Organization.FROST_SANCTUARY
      ].map(org => ({
        organization: org,
        players: [],
        isAlive: true,
        totalDamageDealt: 0
      }));
    }
    return [];
  }

  addPlayerToRoom(room: GameRoom, player: Player): boolean {
    if (room.players.size >= room.maxPlayers) return false;
    if (room.state !== GameState.WAITING) return false;

    // 转换为战斗玩家对象
    const battlePlayer: BattlePlayer = {
      playerId: player.id,
      username: player.username,
      profession: player.profession,
      talent: player.talent,
      organization: player.organization,
      maxHealth: player.stats.maxHealth,
      currentHealth: player.stats.currentHealth,
      attack: player.stats.attack,
      defense: player.stats.defense,
      speed: player.stats.speed,
      state: PlayerState.ALIVE,
      isReady: false,
      handCards: [],
      maxHandSize: 7,
      buffs: [],
      debuffs: [],
      turnData: {
        hasActed: false,
        cardsPlayed: 0,
        damageDealt: 0,
        damageTaken: 0
      }
    };

    // 周本模式检查组织限制
    if (room.mode === GameMode.WEEKLY_BOSS) {
      const formation = room.formations.find(f => f.organization === player.organization);
      if (!formation) return false; // 理论上不应发生
      if (formation.players.length >= 2) {
        // 该组织已满员
        return false; 
      }
      formation.players.push(battlePlayer);
    }

    room.players.set(player.id, battlePlayer);
    return true;
  }

  removePlayerFromRoom(roomId: string, playerId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.players.delete(playerId);
    
    // 清理Formation中的引用
    if (room.mode === GameMode.WEEKLY_BOSS) {
      room.formations.forEach(f => {
        f.players = f.players.filter(p => p.playerId !== playerId);
      });
    }

    if (room.players.size === 0) {
      this.rooms.delete(roomId);
    }
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  getAllRooms(): GameRoom[] {
    return Array.from(this.rooms.values());
  }
}
