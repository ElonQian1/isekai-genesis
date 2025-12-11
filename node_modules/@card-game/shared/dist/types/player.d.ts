/**
 * 玩家相关类型定义
 */
import { Profession, Talent, PlayerState, Organization, EquipmentSlot, EquipmentRarity } from './enums';
export interface Equipment {
    id: string;
    name: string;
    slot: EquipmentSlot;
    rarity: EquipmentRarity;
    level: number;
    stats: {
        attack?: number;
        defense?: number;
        health?: number;
        critRate?: number;
        critDamage?: number;
        speed?: number;
    };
    description: string;
}
export interface PlayerStats {
    maxHealth: number;
    currentHealth: number;
    attack: number;
    defense: number;
    speed: number;
    critRate: number;
    critDamage: number;
}
export interface PlayerProgression {
    level: number;
    experience: number;
    experienceToNextLevel: number;
    totalExperience: number;
}
export interface TalentData {
    type: Talent;
    name: string;
    description: string;
    level: number;
    cooldown: number;
    currentCooldown: number;
}
export interface Player {
    id: string;
    odAccountId: string;
    username: string;
    profession: Profession;
    talent: TalentData;
    organization: Organization;
    stats: PlayerStats;
    baseStats: PlayerStats;
    progression: PlayerProgression;
    equipment: Partial<Record<EquipmentSlot, Equipment>>;
    state: PlayerState;
    gold: number;
    survivalPoints: number;
    statistics: PlayerStatistics;
    createdAt: Date;
    lastLoginAt: Date;
}
export interface PlayerStatistics {
    totalBattles: number;
    wins: number;
    losses: number;
    bossKills: number;
    weeklyBossKills: number;
    playerKills: number;
    deaths: number;
    damageDealt: number;
    damageTaken: number;
    healingDone: number;
}
export interface BattlePlayer {
    playerId: string;
    username: string;
    profession: Profession;
    talent: TalentData;
    organization: Organization;
    maxHealth: number;
    currentHealth: number;
    attack: number;
    defense: number;
    speed: number;
    state: PlayerState;
    isReady: boolean;
    handCards: string[];
    maxHandSize: number;
    buffs: Buff[];
    debuffs: Debuff[];
    turnData: {
        hasActed: boolean;
        cardsPlayed: number;
        damageDealt: number;
        damageTaken: number;
    };
}
export interface Buff {
    id: string;
    name: string;
    type: 'attack' | 'defense' | 'speed' | 'heal' | 'shield';
    value: number;
    duration: number;
    stackable: boolean;
    stacks: number;
}
export interface Debuff {
    id: string;
    name: string;
    type: 'poison' | 'burn' | 'slow' | 'weaken' | 'vulnerable';
    value: number;
    duration: number;
    stackable: boolean;
    stacks: number;
}
export declare const PROFESSION_BASE_STATS: Record<Profession, PlayerStats>;
export declare const PROFESSION_TALENTS: Record<Profession, TalentData>;
