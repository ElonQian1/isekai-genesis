/**
 * 玩家进度系统
 * 
 * 管理玩家的等级、解锁进度、成就等
 * 用于控制游戏模式的解锁状态
 * 
 * 模块: client/core
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import { ClGameMode } from './cl_game_mode_types';

// =============================================================================
// 玩家进度数据
// =============================================================================

/**
 * 玩家进度数据接口
 */
export interface ClPlayerProgress {
    /** 玩家ID */
    playerId: string;
    
    /** 玩家名称 */
    playerName: string;
    
    /** 当前等级 */
    level: number;
    
    /** 当前经验值 */
    experience: number;
    
    /** 已完成的章节 */
    completedChapters: string[];
    
    /** 已加入的组织 */
    organization: string | null;

    /** 职业 */
    profession: string | null;
    
    /** 统计数据 */
    stats: ClPlayerStats;
    
    /** 解锁的模式 (覆盖默认) */
    unlockedModes: ClGameMode[];
    
    /** 上次保存时间 */
    lastSaveTime: number;
}

/**
 * 玩家统计数据
 */
export interface ClPlayerStats {
    /** 总战斗次数 */
    totalBattles: number;
    
    /** 胜利次数 */
    victories: number;
    
    /** 失败次数 */
    defeats: number;
    
    /** 击杀敌人数 */
    enemiesDefeated: number;
    
    /** 通关BOSS数 */
    bossesDefeated: number;
    
    /** 总游戏时长 (分钟) */
    playTimeMinutes: number;
    
    /** PVP 胜率 */
    pvpWins: number;
    pvpLosses: number;
}

// =============================================================================
// 等级配置
// =============================================================================

/**
 * 等级经验配置
 */
export interface ClLevelConfig {
    level: number;
    requiredExp: number;
    totalExp: number; // 累计经验
}

/**
 * 生成等级表 (1-100级)
 */
function generateLevelTable(): ClLevelConfig[] {
    const table: ClLevelConfig[] = [];
    let totalExp = 0;
    
    for (let level = 1; level <= 100; level++) {
        // 经验公式: 100 * level^1.5
        const requiredExp = Math.floor(100 * Math.pow(level, 1.5));
        table.push({
            level,
            requiredExp,
            totalExp,
        });
        totalExp += requiredExp;
    }
    
    return table;
}

const CL_LEVEL_TABLE = generateLevelTable();

// =============================================================================
// 解锁条件
// =============================================================================

/**
 * 解锁条件类型
 */
export type ClUnlockCondition = 
    | { type: 'level'; minLevel: number }
    | { type: 'chapter'; chapterId: string }
    | { type: 'organization'; any: boolean }
    | { type: 'stat'; stat: keyof ClPlayerStats; minValue: number }
    | { type: 'always' };

/**
 * 游戏模式解锁条件配置
 */
export const CL_MODE_UNLOCK_CONDITIONS: Record<ClGameMode, ClUnlockCondition[]> = {
    [ClGameMode.SoloExplore]: [
        { type: 'always' }, // 永远解锁
    ],
    
    [ClGameMode.TeamExplore]: [
        { type: 'level', minLevel: 5 },
    ],
    
    [ClGameMode.MiniBoss]: [
        { type: 'chapter', chapterId: 'chapter_1' }, // 通关第一章
        { type: 'level', minLevel: 15 },
    ],
    
    [ClGameMode.WeeklyBoss]: [
        { type: 'level', minLevel: 30 },
        { type: 'organization', any: true }, // 需要加入任意组织
    ],
    
    [ClGameMode.PvpArena]: [
        { type: 'level', minLevel: 10 },
        { type: 'stat', stat: 'totalBattles', minValue: 5 }, // 至少5场战斗
    ],
};

// =============================================================================
// 玩家进度管理器
// =============================================================================

export class ClPlayerProgressManager {
    private progress: ClPlayerProgress;
    private storageKey: string = 'cl_player_progress';

    constructor() {
        this.progress = this.createDefaultProgress();
    }

    // =========================================================================
    // 初始化
    // =========================================================================

    /**
     * 创建默认进度
     */
    private createDefaultProgress(): ClPlayerProgress {
        return {
            playerId: '',
            playerName: '',
            level: 1,
            experience: 0,
            completedChapters: [],
            organization: null,
            profession: null,
            stats: {
                totalBattles: 0,
                victories: 0,
                defeats: 0,
                enemiesDefeated: 0,
                bossesDefeated: 0,
                playTimeMinutes: 0,
                pvpWins: 0,
                pvpLosses: 0,
            },
            unlockedModes: [ClGameMode.SoloExplore], // 默认只解锁单人
            lastSaveTime: Date.now(),
        };
    }

    /**
     * 初始化玩家
     */
    initPlayer(playerId: string, playerName: string): void {
        // 尝试加载存档
        const saved = this.loadFromStorage(playerId);
        
        if (saved) {
            this.progress = saved;
            console.log(`📂 加载存档: ${playerName} Lv.${this.progress.level}`);
        } else {
            this.progress = this.createDefaultProgress();
            this.progress.playerId = playerId;
            this.progress.playerName = playerName;
            console.log(`🆕 创建新玩家: ${playerName}`);
        }
        
        // 刷新解锁状态
        this.refreshUnlockedModes();
    }

    // =========================================================================
    // 等级与经验
    // =========================================================================

    /**
     * 获取当前等级
     */
    getLevel(): number {
        return this.progress.level;
    }

    /**
     * 设置职业
     */
    setProfession(professionId: string): void {
        this.progress.profession = professionId;
        this.saveToStorage();
    }

    /**
     * 获取职业
     */
    getProfession(): string | null {
        return this.progress.profession;
    }

    /**
     * 获取当前经验
     */
    getExperience(): number {
        return this.progress.experience;
    }

    /**
     * 获取升级所需经验
     */
    getRequiredExp(): number {
        if (this.progress.level >= 100) return 0;
        return CL_LEVEL_TABLE[this.progress.level - 1].requiredExp;
    }

    /**
     * 获取经验进度百分比
     */
    getExpProgress(): number {
        const required = this.getRequiredExp();
        if (required === 0) return 100;
        return Math.min(100, (this.progress.experience / required) * 100);
    }

    /**
     * 增加经验值
     */
    addExperience(amount: number): { leveledUp: boolean; newLevel: number } {
        if (amount <= 0) return { leveledUp: false, newLevel: this.progress.level };
        
        this.progress.experience += amount;
        const startLevel = this.progress.level;
        
        // 检查升级
        while (this.progress.level < 100) {
            const required = CL_LEVEL_TABLE[this.progress.level - 1].requiredExp;
            
            if (this.progress.experience >= required) {
                this.progress.experience -= required;
                this.progress.level++;
                console.log(`🎉 升级! Lv.${this.progress.level}`);
            } else {
                break;
            }
        }
        
        // 如果升级了，刷新解锁
        if (this.progress.level > startLevel) {
            this.refreshUnlockedModes();
        }
        
        this.saveToStorage();
        
        return {
            leveledUp: this.progress.level > startLevel,
            newLevel: this.progress.level,
        };
    }

    // =========================================================================
    // 解锁系统
    // =========================================================================

    /**
     * 刷新解锁的模式
     */
    refreshUnlockedModes(): void {
        const unlocked: ClGameMode[] = [];
        
        for (const mode of Object.values(ClGameMode)) {
            if (this.checkModeUnlock(mode)) {
                unlocked.push(mode);
            }
        }
        
        this.progress.unlockedModes = unlocked;
        console.log(`🔓 已解锁模式: ${unlocked.join(', ')}`);
    }

    /**
     * 检查模式是否解锁
     */
    checkModeUnlock(mode: ClGameMode): boolean {
        const conditions = CL_MODE_UNLOCK_CONDITIONS[mode];
        
        // 所有条件都必须满足
        return conditions.every(cond => this.checkCondition(cond));
    }

    /**
     * 检查单个条件
     */
    private checkCondition(condition: ClUnlockCondition): boolean {
        switch (condition.type) {
            case 'always':
                return true;
                
            case 'level':
                return this.progress.level >= condition.minLevel;
                
            case 'chapter':
                return this.progress.completedChapters.includes(condition.chapterId);
                
            case 'organization':
                return condition.any ? this.progress.organization !== null : false;
                
            case 'stat':
                return this.progress.stats[condition.stat] >= condition.minValue;
                
            default:
                return false;
        }
    }

    /**
     * 获取模式是否解锁
     */
    isModeUnlocked(mode: ClGameMode): boolean {
        return this.progress.unlockedModes.includes(mode);
    }

    /**
     * 获取所有已解锁模式
     */
    getUnlockedModes(): ClGameMode[] {
        return [...this.progress.unlockedModes];
    }

    /**
     * 获取模式解锁进度描述
     */
    getModeUnlockProgress(mode: ClGameMode): string {
        if (this.isModeUnlocked(mode)) {
            return '已解锁';
        }
        
        const conditions = CL_MODE_UNLOCK_CONDITIONS[mode];
        const unmet: string[] = [];
        
        for (const cond of conditions) {
            if (!this.checkCondition(cond)) {
                unmet.push(this.getConditionDescription(cond));
            }
        }
        
        return unmet.join(', ');
    }

    /**
     * 获取条件描述
     */
    private getConditionDescription(condition: ClUnlockCondition): string {
        switch (condition.type) {
            case 'always':
                return '默认解锁';
            case 'level':
                return `达到 ${condition.minLevel} 级 (当前 ${this.progress.level} 级)`;
            case 'chapter':
                return `通关「${this.getChapterName(condition.chapterId)}」`;
            case 'organization':
                return '加入一个组织';
            case 'stat':
                const current = this.progress.stats[condition.stat];
                return `${this.getStatName(condition.stat)} ≥ ${condition.minValue} (当前 ${current})`;
            default:
                return '未知条件';
        }
    }

    private getChapterName(chapterId: string): string {
        const names: Record<string, string> = {
            'chapter_1': '初入江湖',
            'chapter_2': '风云再起',
            'chapter_3': '终极对决',
        };
        return names[chapterId] || chapterId;
    }

    private getStatName(stat: keyof ClPlayerStats): string {
        const names: Record<keyof ClPlayerStats, string> = {
            totalBattles: '战斗次数',
            victories: '胜利次数',
            defeats: '失败次数',
            enemiesDefeated: '击败敌人',
            bossesDefeated: 'BOSS击杀',
            playTimeMinutes: '游戏时长',
            pvpWins: 'PVP胜利',
            pvpLosses: 'PVP失败',
        };
        return names[stat];
    }

    // =========================================================================
    // 进度更新
    // =========================================================================

    /**
     * 记录战斗结果
     */
    recordBattle(victory: boolean, enemiesKilled: number = 0, isBoss: boolean = false, isPvp: boolean = false): void {
        this.progress.stats.totalBattles++;
        
        if (victory) {
            this.progress.stats.victories++;
            if (isPvp) this.progress.stats.pvpWins++;
        } else {
            this.progress.stats.defeats++;
            if (isPvp) this.progress.stats.pvpLosses++;
        }
        
        this.progress.stats.enemiesDefeated += enemiesKilled;
        
        if (isBoss && victory) {
            this.progress.stats.bossesDefeated++;
        }
        
        // 刷新解锁
        this.refreshUnlockedModes();
        this.saveToStorage();
    }

    /**
     * 完成章节
     */
    completeChapter(chapterId: string): void {
        if (!this.progress.completedChapters.includes(chapterId)) {
            this.progress.completedChapters.push(chapterId);
            console.log(`📖 完成章节: ${this.getChapterName(chapterId)}`);
            this.refreshUnlockedModes();
            this.saveToStorage();
        }
    }

    /**
     * 加入组织
     */
    joinOrganization(orgId: string): void {
        this.progress.organization = orgId;
        console.log(`🏛️ 加入组织: ${orgId}`);
        this.refreshUnlockedModes();
        this.saveToStorage();
    }

    /**
     * 更新游戏时长
     */
    updatePlayTime(minutes: number): void {
        this.progress.stats.playTimeMinutes += minutes;
        this.saveToStorage();
    }

    // =========================================================================
    // 存储
    // =========================================================================

    /**
     * 保存到 localStorage
     */
    saveToStorage(): void {
        this.progress.lastSaveTime = Date.now();
        const key = `${this.storageKey}_${this.progress.playerId}`;
        
        try {
            localStorage.setItem(key, JSON.stringify(this.progress));
        } catch (e) {
            console.warn('⚠️ 保存进度失败:', e);
        }
    }

    /**
     * 从 localStorage 加载
     */
    loadFromStorage(playerId: string): ClPlayerProgress | null {
        const key = `${this.storageKey}_${playerId}`;
        
        try {
            const data = localStorage.getItem(key);
            if (data) {
                return JSON.parse(data) as ClPlayerProgress;
            }
        } catch (e) {
            console.warn('⚠️ 加载进度失败:', e);
        }
        
        return null;
    }

    /**
     * 获取完整进度数据
     */
    getProgress(): ClPlayerProgress {
        return { ...this.progress };
    }

    /**
     * 获取玩家信息
     */
    getPlayerInfo(): { id: string; name: string; level: number } {
        return {
            id: this.progress.playerId,
            name: this.progress.playerName,
            level: this.progress.level,
        };
    }

    // =========================================================================
    // 调试/测试
    // =========================================================================

    /**
     * 设置等级 (调试用)
     */
    debugSetLevel(level: number): void {
        this.progress.level = Math.max(1, Math.min(100, level));
        this.progress.experience = 0;
        this.refreshUnlockedModes();
        this.saveToStorage();
        console.log(`🔧 [DEBUG] 设置等级: ${level}`);
    }

    /**
     * 解锁所有模式 (调试用)
     */
    debugUnlockAll(): void {
        this.progress.unlockedModes = Object.values(ClGameMode);
        this.saveToStorage();
        console.log('🔧 [DEBUG] 解锁所有模式');
    }
}

// =============================================================================
// 单例
// =============================================================================

let progressManagerInstance: ClPlayerProgressManager | null = null;

/**
 * 获取玩家进度管理器实例
 */
export function cl_getPlayerProgressManager(): ClPlayerProgressManager {
    if (!progressManagerInstance) {
        progressManagerInstance = new ClPlayerProgressManager();
    }
    return progressManagerInstance;
}
