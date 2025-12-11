/**
 * 游戏房间和战斗类型定义
 */
import { GameMode, GameState, Organization } from './enums';
import { BattlePlayer } from './player';
import { Boss, BattleRound } from './boss';
import { CardInstance } from './card';
export interface OrganizationFormation {
    organization: Organization;
    players: BattlePlayer[];
    isAlive: boolean;
    totalDamageDealt: number;
}
export interface GameRoom {
    id: string;
    name: string;
    mode: GameMode;
    state: GameState;
    hostId: string;
    maxPlayers: number;
    minPlayers: number;
    formations: OrganizationFormation[];
    players: Map<string, BattlePlayer>;
    battle?: BattleData;
    isPrivate: boolean;
    password?: string;
    createdAt: Date;
    startedAt?: Date;
    endedAt?: Date;
}
export interface BattleData {
    boss: Boss;
    currentRound: number;
    maxRounds: number;
    phase: 'draw' | 'action' | 'boss_attack' | 'round_end';
    turnOrder: string[];
    currentTurnIndex: number;
    drawPile: CardInstance[];
    discardPile: CardInstance[];
    redirectTarget?: Organization;
    rounds: BattleRound[];
    result?: BattleResult;
}
export interface BattleResult {
    isVictory: boolean;
    winningOrganization?: Organization;
    totalRounds: number;
    totalDamageDealt: number;
    bossReviveCount: number;
    playerStats: PlayerBattleStats[];
    rewards: BattleReward[];
}
export interface PlayerBattleStats {
    playerId: string;
    playerName: string;
    organization: Organization;
    damageDealt: number;
    damageTaken: number;
    healingDone: number;
    cardsPlayed: number;
    isAlive: boolean;
    isMVP: boolean;
    mvpReason?: string;
}
export interface BattleReward {
    playerId: string;
    experience: number;
    gold: number;
    survivalPoints: number;
    bonusExperience: number;
    bonusGold: number;
    items: {
        itemId: string;
        itemName: string;
        quantity: number;
    }[];
}
export declare const GAME_MODE_CONFIG: Record<GameMode, {
    name: string;
    description: string;
    minPlayers: number;
    maxPlayers: number;
    organizationsRequired: number;
    playersPerOrganization: number;
}>;
export declare const ORGANIZATION_INFO: Record<Organization, {
    name: string;
    description: string;
    color: string;
    emblem: string;
}>;
