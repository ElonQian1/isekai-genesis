/**
 * 酒馆模式控制器
 * 
 * 模块: client
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 整合商店、手牌区、战场 UI，管理酒馆模式状态
 */

import * as BABYLON from '@babylonjs/core';
import { ClTavernShopUI } from './ui/cl_tavern_shop_ui';
import { ClBenchUI } from './ui/cl_bench_ui';
import { ClTavernArenaUI, type ClArenaSlot } from './ui/cl_tavern_arena_ui';
import { ClGraveyardUI, type ClGraveyardMonster } from './ui/cl_graveyard_ui';
import { ClMergeEffectManager } from './render/battle/effects';
import {
    cl_getBoardSlots,
    cl_refreshShop,
    cl_toggleFreeze,
    cl_buyMonster,
    cl_sellMonster,
    cl_buyXp,
    cl_collectIncome,
    cl_autoMergeAll,
    cl_deployFromBench,
    cl_recallToBench,
    cl_swapPositions,
    type ClTavernEconomy,
    type ClTavernMonster,
    type ClTavernShopSlot,
} from './cl_wasm';

// =============================================================================
// 类型定义
// =============================================================================

/** 酒馆模式状态 */
export interface ClTavernState {
    economy: ClTavernEconomy;
    shop: ClTavernShopSlot[];
    bench: ClTavernMonster[];
    arena: ClArenaSlot[];
    graveyard: ClGraveyardMonster[];
    phase: 'shopping' | 'deploy' | 'combat' | 'result';
    turn: number;
}

/** 酒馆模式事件 */
export interface ClTavernControllerEvents {
    /** 阶段变化 */
    onPhaseChange?: (phase: string) => void;
    /** 战斗开始 */
    onCombatStart?: () => void;
    /** 回合结束 */
    onTurnEnd?: (turn: number) => void;
    /** 状态更新 */
    onStateUpdate?: (state: ClTavernState) => void;
    /** 怪兽合并 */
    onMerge?: (result: ClTavernMonster, sourceIds: string[]) => void;
    /** 怪兽阵亡 */
    onMonsterDeath?: (monster: ClGraveyardMonster) => void;
}

// =============================================================================
// 酒馆模式控制器
// =============================================================================

export class ClTavernController {
    private scene: BABYLON.Scene;
    private shopUI: ClTavernShopUI;
    private benchUI: ClBenchUI;
    private arenaUI: ClTavernArenaUI;
    private graveyardUI: ClGraveyardUI;
    private mergeEffects: ClMergeEffectManager;
    private effectsRoot: BABYLON.TransformNode;
    
    private state: ClTavernState;
    private events: ClTavernControllerEvents = {};
    
    // JSON 状态 (用于 WASM 调用)
    private economyJson: string = '';
    private shopJson: string = '';
    private poolJson: string = '';
    private arenaJson: string = '';
    
    // 部署模式
    private deployingMonsterId: string | null = null;

    constructor(scene: BABYLON.Scene) {
        this.scene = scene;
        
        // 创建特效根节点
        this.effectsRoot = new BABYLON.TransformNode('tavernEffectsRoot', scene);
        
        // 初始化 UI
        this.shopUI = new ClTavernShopUI(scene);
        this.benchUI = new ClBenchUI(scene);
        this.arenaUI = new ClTavernArenaUI(scene);
        this.graveyardUI = new ClGraveyardUI(scene);
        
        // 初始化合并特效管理器
        this.mergeEffects = new ClMergeEffectManager(scene, this.effectsRoot);
        
        // 初始化状态
        this.state = {
            economy: {
                gold: 3,
                level: 1,
                xp: 0,
                xp_to_next: 2,
                win_streak: 0,
                lose_streak: 0,
            },
            shop: [],
            graveyard: [],
            bench: [],
            arena: [],
            phase: 'shopping',
            turn: 1,
        };
        
        // 绑定事件
        this.bindEvents();
    }
    
    // =========================================================================
    // 公共方法
    // =========================================================================
    
    /** 设置事件监听 */
    public setEvents(events: ClTavernControllerEvents): void {
        this.events = events;
    }
    
    /** 显示酒馆模式 UI */
    public show(): void {
        this.shopUI.setVisible(true);
        this.benchUI.setVisible(true);
        this.arenaUI.setVisible(true);
        this.graveyardUI.setVisible(true);
        this.updateAllUI();
    }
    
    /** 隐藏酒馆模式 UI */
    public hide(): void {
        this.shopUI.setVisible(false);
        this.benchUI.setVisible(false);
        this.arenaUI.setVisible(false);
        this.graveyardUI.setVisible(false);
    }
    
    /** 设置状态 (从服务器同步) */
    public setState(state: Partial<ClTavernState>): void {
        this.state = { ...this.state, ...state };
        this.updateAllUI();
        this.events.onStateUpdate?.(this.state);
    }
    
    /** 设置 JSON 状态 (用于 WASM) */
    public setJsonState(economyJson: string, shopJson: string, poolJson: string, arenaJson: string): void {
        this.economyJson = economyJson;
        this.shopJson = shopJson;
        this.poolJson = poolJson;
        this.arenaJson = arenaJson;
    }
    
    /** 获取当前状态 */
    public getState(): ClTavernState {
        return this.state;
    }
    
    /** 开始新回合 */
    public startTurn(turn: number): void {
        this.state.turn = turn;
        this.state.phase = 'shopping';
        
        // 收取收入
        const incomeResult = cl_collectIncome(this.economyJson);
        if (incomeResult.success && incomeResult.data) {
            const data = JSON.parse(incomeResult.data);
            this.state.economy = data.economy;
            this.economyJson = JSON.stringify(data.economy);
        }
        
        this.updateAllUI();
        this.events.onPhaseChange?.('shopping');
    }
    
    /** 进入部署阶段 */
    public enterDeployPhase(): void {
        this.state.phase = 'deploy';
        this.events.onPhaseChange?.('deploy');
    }
    
    /** 开始战斗 */
    public startCombat(): void {
        this.state.phase = 'combat';
        this.events.onPhaseChange?.('combat');
        this.events.onCombatStart?.();
    }
    
    /** 销毁 */
    public dispose(): void {
        this.shopUI.dispose();
        this.benchUI.dispose();
        this.arenaUI.dispose();
        this.graveyardUI.dispose();
        this.mergeEffects.dispose();
        this.effectsRoot.dispose();
    }
    
    /** 将怪兽送入墓地 */
    public sendToGraveyard(monster: ClTavernMonster): void {
        const graveyardMonster: ClGraveyardMonster = {
            id: monster.id,
            name: monster.name,
            templateId: monster.template_id,
            star: monster.star,
            isGolden: monster.golden_level > 0,
            goldenLevel: monster.golden_level,
            atk: monster.atk,
            def: monster.def,
            deathTurn: this.state.turn,
        };
        
        this.state.graveyard.push(graveyardMonster);
        this.graveyardUI.addMonster(graveyardMonster);
        this.events.onMonsterDeath?.(graveyardMonster);
    }
    
    /** 获取墓地怪兽列表 */
    public getGraveyard(): ClGraveyardMonster[] {
        return this.state.graveyard;
    }
    
    /** 清空墓地 */
    public clearGraveyard(): void {
        this.state.graveyard = [];
        this.graveyardUI.clear();
    }
    
    // =========================================================================
    // 私有方法 - 事件绑定
    // =========================================================================
    
    private bindEvents(): void {
        // 商店事件
        this.shopUI.setEvents({
            onBuyMonster: (slotIndex) => this.handleBuyMonster(slotIndex),
            onToggleFreeze: (slotIndex) => this.handleToggleFreeze(slotIndex),
            onRefresh: () => this.handleRefresh(),
            onBuyXp: () => this.handleBuyXp(),
        });
        
        // 手牌区事件
        this.benchUI.setEvents({
            onSelect: (monsterId) => this.handleSelectMonster(monsterId),
            onSell: (monsterId) => this.handleSellMonster(monsterId),
            onDeploy: (monsterId) => this.handleStartDeploy(monsterId),
        });
        
        // 战场事件
        this.arenaUI.setEvents({
            onSlotClick: (slotIndex) => this.handleSlotClick(slotIndex),
            onRecall: (slotIndex) => this.handleRecall(slotIndex),
            onSwap: (slotA, slotB) => this.handleSwap(slotA, slotB),
        });
        
        // 墓地事件
        this.graveyardUI.setEvents({
            onMonsterClick: (monsterId) => this.handleGraveyardMonsterClick(monsterId),
            onToggle: (isExpanded) => console.log('墓地面板:', isExpanded ? '展开' : '收起'),
        });
    }
    
    /** 处理点击墓地怪兽 */
    private handleGraveyardMonsterClick(monsterId: string): void {
        const monster = this.state.graveyard.find(m => m.id === monsterId);
        if (monster) {
            console.log('查看墓地怪兽:', monster.name);
            // TODO: 显示怪兽详情弹窗
        }
    }
    
    // =========================================================================
    // 私有方法 - 处理器
    // =========================================================================
    
    private handleBuyMonster(slotIndex: number): void {
        const result = cl_buyMonster(this.economyJson, this.shopJson, slotIndex);
        
        if (result.success && result.data) {
            const data = JSON.parse(result.data);
            this.state.economy = data.economy;
            this.economyJson = JSON.stringify(data.economy);
            this.shopJson = JSON.stringify(data.shop);
            
            // 添加到手牌区
            if (data.monster) {
                this.state.bench.push(data.monster);
            }
            
            // 自动合并
            this.tryAutoMerge();
            
            this.updateAllUI();
        } else {
            console.warn('购买失败:', result.error);
        }
    }
    
    private handleToggleFreeze(slotIndex: number): void {
        const result = cl_toggleFreeze(this.shopJson, slotIndex);
        
        if (result.success && result.data) {
            this.shopJson = result.data;
            // 更新 UI 中的冻结状态
            if (this.state.shop[slotIndex]) {
                this.state.shop[slotIndex].frozen = !this.state.shop[slotIndex].frozen;
            }
            this.shopUI.updateSlots(this.state.shop);
        }
    }
    
    private handleRefresh(): void {
        const randomRolls = Array.from({ length: 10 }, () => Math.floor(Math.random() * 256));
        const result = cl_refreshShop(this.economyJson, this.shopJson, this.poolJson, randomRolls);
        
        if (result.success && result.data) {
            const data = JSON.parse(result.data);
            this.state.economy = data.economy;
            this.economyJson = JSON.stringify(data.economy);
            this.shopJson = JSON.stringify(data.shop);
            
            this.updateAllUI();
        } else {
            console.warn('刷新失败:', result.error);
        }
    }
    
    private handleBuyXp(): void {
        const result = cl_buyXp(this.economyJson);
        
        if (result.success && result.data) {
            this.state.economy = JSON.parse(result.data);
            this.economyJson = result.data;
            
            // 更新槽位数
            const maxSlots = cl_getBoardSlots(this.state.economy.level);
            this.arenaUI.setMaxSlots(maxSlots);
            
            this.updateAllUI();
        } else {
            console.warn('购买经验失败:', result.error);
        }
    }
    
    private handleSelectMonster(monsterId: string): void {
        if (this.deployingMonsterId === monsterId) {
            // 取消选中
            this.deployingMonsterId = null;
            this.benchUI.setSelected(null);
        } else {
            // 选中准备部署
            this.deployingMonsterId = monsterId;
            this.benchUI.setSelected(monsterId);
        }
    }
    
    private handleStartDeploy(monsterId: string): void {
        this.deployingMonsterId = monsterId;
        this.benchUI.setSelected(monsterId);
    }
    
    private handleSellMonster(monsterId: string): void {
        const monster = this.state.bench.find(m => m.id === monsterId);
        if (!monster) return;
        
        const result = cl_sellMonster(this.economyJson, JSON.stringify(monster));
        
        if (result.success && result.data) {
            const data = JSON.parse(result.data);
            this.state.economy = data.economy;
            this.economyJson = JSON.stringify(data.economy);
            
            // 从手牌区移除
            this.state.bench = this.state.bench.filter(m => m.id !== monsterId);
            
            this.updateAllUI();
        }
    }
    
    private handleSlotClick(slotIndex: number): void {
        if (this.deployingMonsterId) {
            // 部署怪兽
            const benchJson = JSON.stringify(this.state.bench);
            const result = cl_deployFromBench(this.arenaJson, benchJson, this.deployingMonsterId, slotIndex);
            
            if (result.success && result.data) {
                const data = JSON.parse(result.data);
                this.arenaJson = JSON.stringify(data.arena);
                this.state.bench = data.bench;
                
                // 更新战场
                this.updateArenaFromJson(data.arena);
                
                this.deployingMonsterId = null;
                this.benchUI.setSelected(null);
                this.updateAllUI();
            } else {
                console.warn('部署失败:', result.error);
            }
        }
    }
    
    private handleRecall(slotIndex: number): void {
        const benchJson = JSON.stringify(this.state.bench);
        const result = cl_recallToBench(this.arenaJson, benchJson, slotIndex);
        
        if (result.success && result.data) {
            const data = JSON.parse(result.data);
            this.arenaJson = JSON.stringify(data.arena);
            this.state.bench = data.bench;
            
            this.updateArenaFromJson(data.arena);
            this.updateAllUI();
        }
    }
    
    private handleSwap(slotA: number, slotB: number): void {
        const result = cl_swapPositions(this.arenaJson, slotA, slotB);
        
        if (result.success && result.data) {
            this.arenaJson = result.data;
            this.updateArenaFromJson(JSON.parse(result.data));
            this.arenaUI.setSelectedSlot(null);
        }
    }
    
    private async tryAutoMerge(): Promise<void> {
        const boardJson = JSON.stringify(this.state.arena.map(s => s.monster));
        const benchJson = JSON.stringify(this.state.bench);
        
        const result = cl_autoMergeAll(boardJson, benchJson);
        
        if (result.success && result.data) {
            const data = JSON.parse(result.data);
            if (data.merge_count > 0) {
                console.log(`自动合并了 ${data.merge_count} 次`);
                
                // 播放合并特效（如果有合并结果信息）
                if (data.merge_results && data.merge_results.length > 0) {
                    for (const mergeResult of data.merge_results) {
                        await this.playMergeEffect(mergeResult);
                    }
                }
                
                // 更新状态
                this.state.bench = data.bench;
                if (data.arena) {
                    this.updateArenaFromJson(data.arena);
                }
                this.updateAllUI();
            }
        }
    }
    
    /** 播放合并特效 */
    private async playMergeEffect(mergeResult: {
        source_positions: Array<{ x: number; y: number; z: number }>;
        target_position: { x: number; y: number; z: number };
        result_monster: ClTavernMonster;
        source_ids: string[];
    }): Promise<void> {
        const sourcePositions = mergeResult.source_positions.map(
            p => new BABYLON.Vector3(p.x, p.y, p.z)
        );
        const targetPosition = new BABYLON.Vector3(
            mergeResult.target_position.x,
            mergeResult.target_position.y,
            mergeResult.target_position.z
        );
        
        const monster = mergeResult.result_monster;
        const isGolden = monster.golden_level > 0;
        
        await this.mergeEffects.playMergeAnimation(
            sourcePositions,
            targetPosition,
            monster.star,
            isGolden,
            monster.golden_level
        );
        
        // 触发合并事件
        this.events.onMerge?.(monster, mergeResult.source_ids);
    }
    
    // =========================================================================
    // 私有方法 - UI 更新
    // =========================================================================
    
    private updateAllUI(): void {
        this.shopUI.updateEconomy(this.state.economy);
        this.shopUI.updateSlots(this.state.shop);
        this.benchUI.updateMonsters(this.state.bench);
        this.graveyardUI.updateMonsters(this.state.graveyard);
        this.arenaUI.setMaxSlots(cl_getBoardSlots(this.state.economy.level));
        this.arenaUI.updateSlots(this.state.arena);
    }
    
    private updateArenaFromJson(arenaData: { player_monsters: (ClTavernMonster | null)[] }): void {
        this.state.arena = arenaData.player_monsters.map((monster, index) => ({
            index,
            monster,
        }));
    }
}
