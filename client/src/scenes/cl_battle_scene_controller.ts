/**
 * 战斗场景控制器
 * 
 * 职责：
 * - 战斗场景的生命周期管理
 * - 战斗状态更新
 * - 卡牌交互协调
 * 
 * 模块: client/scenes
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import { Scene, Vector3 } from '@babylonjs/core';
import { ClBattleScene } from '../render/cl_battle_scene';
import { ClBattleScene as ClBattleScene3D } from '../render/battle/cl_battle_scene';
import { ClCardRenderer } from '../render/cl_card_renderer';
import { ClBattleUI } from '../ui/cl_battle_ui';
import { ClBattleController, cl_getBattleController, ClBattlePhase } from '../cl_battle_controller';
import { ClTargetSelector } from '../ui/cl_target_selector';
import { ClMessageUI } from '../ui/cl_message_ui';
import { ClBattleState } from '../cl_battle_manager';
import { AdvancedDynamicTexture } from '@babylonjs/gui';
import { EnemyData, EnemyType } from '../render/world/entities/cl_enemy_system';

// =============================================================================
// 战斗场景控制器
// =============================================================================

/**
 * 组队战斗模式
 */
export enum ClBattleMode {
    /** 单人 PvE */
    SoloPvE = 'solo_pve',
    /** 单人 PvP */
    SoloPvP = 'solo_pvp',
    /** 组队 PvE (协作) */
    CoopPvE = 'coop_pve',
    /** 组队 PvP */
    TeamPvP = 'team_pvp',
}

/**
 * 组队成员战斗数据
 */
export interface ClTeamBattleMember {
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    isActive: boolean;  // 是否当前回合
}

export class ClBattleSceneController {
    private scene: Scene;
    private gui: AdvancedDynamicTexture;
    private messageUI: ClMessageUI | null = null;
    
    // 战斗组件
    private battleScene: ClBattleScene | null = null;
    private battleScene3D: ClBattleScene3D | null = null;  // 3D 战斗场景（带部署格子）
    private cardRenderer: ClCardRenderer | null = null;
    private battleUI: ClBattleUI | null = null;
    private battleController: ClBattleController | null = null;
    private targetSelector: ClTargetSelector | null = null;
    
    // 玩家信息
    private localPlayerId: string = '';
    private localPlayerName: string = '';
    
    // 组队战斗
    private battleMode: ClBattleMode = ClBattleMode.SoloPvE;
    private teamMembers: ClTeamBattleMember[] = [];
    
    // 当前战斗的敌人名称
    private currentEnemyName: string = '';
    
    // 战斗结束回调
    private onBattleEnd: ((victory: boolean, winnerId: string | null) => void) | null = null;

    constructor(scene: Scene, gui: AdvancedDynamicTexture, messageUI: ClMessageUI | null) {
        this.scene = scene;
        this.gui = gui;
        this.messageUI = messageUI;
    }

    /**
     * 初始化
     */
    async init(): Promise<void> {
        // 创建卡牌战斗场景（背景）
        this.battleScene = new ClBattleScene(this.scene);
        this.cardRenderer = new ClCardRenderer(this.scene);
        this.targetSelector = new ClTargetSelector(this.scene, this.gui);
        
        // 创建 3D 战斗场景（带部署格子）
        this.battleScene3D = new ClBattleScene3D(this.scene);
        this.battleScene3D.onBattleEnd = (victory) => {
            this.handleBattleEnd(victory);
        };
        
        // 初始化战斗控制器
        this.battleController = cl_getBattleController();
        await this.battleController.init();
        
        // 设置回调
        this.setupBattleControllerCallbacks();
        this.setupHandInteraction();
        
        console.log('✅ 战斗场景控制器初始化完成');
    }

    /**
     * 设置玩家信息
     */
    setPlayerInfo(playerId: string, playerName: string): void {
        this.localPlayerId = playerId;
        this.localPlayerName = playerName;
    }

    /**
     * 进入战斗
     */
    enter(): void {
        // 只显示背景场景，3D战斗场景由 startBattleWithAI 启动
        this.battleScene?.show();
    }

    /**
     * 离开战斗
     */
    leave(): void {
        this.battleScene?.hide();
        
        // 临时移除回调，防止 endBattle 触发循环调用
        if (this.battleScene3D) {
            const originalCallback = this.battleScene3D.onBattleEnd;
            this.battleScene3D.onBattleEnd = null;
            this.battleScene3D.endBattle(false);
            this.battleScene3D.onBattleEnd = originalCallback;
        }
        
        this.battleUI?.dispose();
        this.battleUI = null;
    }

    /**
     * 开始与AI战斗
     */
    startBattleWithAI(aiName: string): boolean {
        this.currentEnemyName = aiName;
        
        // 创建敌人数据
        const enemyData: EnemyData = {
            id: `enemy_${Date.now()}`,
            name: aiName,
            type: EnemyType.NORMAL,
            level: 1,
            position: Vector3.Zero(),
            patrolRadius: 0,
        };
        
        // 获取战斗位置（使用固定位置，因为大世界已经隐藏）
        const battlePos = new Vector3(0, 0, 0);
        
        // 启动 3D 战斗场景
        this.battleScene3D?.startBattle(enemyData, battlePos);
        
        return true;
    }
    
    /**
     * 处理战斗结束
     */
    private handleBattleEnd(victory: boolean): void {
        console.log(`🏁 战斗结束: ${victory ? '胜利' : '失败'}`);
        
        if (this.onBattleEnd) {
            this.onBattleEnd(victory, victory ? this.localPlayerId : null);
        }
    }

    /**
     * 设置战斗结束回调
     */
    setBattleEndCallback(callback: (victory: boolean, winnerId: string | null) => void): void {
        this.onBattleEnd = callback;
    }

    /**
     * 设置战斗控制器回调
     */
    private setupBattleControllerCallbacks(): void {
        if (!this.battleController) return;

        this.battleController.setCallbacks({
            onPhaseChange: (phase) => {
                console.log(`战斗阶段: ${phase}`);
            },
            
            onStateUpdate: (state) => {
                this.battleUI?.updateBattleState(state, this.localPlayerId);
                this.updateHandCards(state);
            },
            
            onCardSelected: (card) => {
                if (card) {
                    this.messageUI?.info(`选中: ${card.name}`);
                    this.highlightSelectedCard(card.id);
                } else {
                    this.clearCardHighlight();
                }
            },
            
            onCardPlayed: (result, card, _targetId) => {
                if (result.success) {
                    this.messageUI?.success(`${card.name} 造成 ${result.damage_dealt} 点伤害!`);
                } else {
                    this.messageUI?.error(result.error || '出牌失败');
                }
            },
            
            onTurnStart: (playerId, turn) => {
                if (playerId === this.localPlayerId) {
                    this.messageUI?.info(`第 ${turn} 回合 - 你的回合`);
                } else {
                    this.messageUI?.info(`第 ${turn} 回合 - 对手回合`);
                }
            },
            
            onTurnEnd: (_playerId) => {
                // 回合结束
            },
            
            onBattleEnd: (winnerId) => {
                const victory = winnerId === this.localPlayerId;
                this.onBattleEnd?.(victory, winnerId);
            },
            
            onMessage: (message) => {
                this.messageUI?.info(message);
            },
        });
    }

    /**
     * 设置手牌交互
     */
    private setupHandInteraction(): void {
        if (!this.battleScene) return;
        
        const hand = this.battleScene.getPlayerHand();
        
        // 卡牌选择回调
        hand.onCardSelect = (card) => {
            if (!this.battleController) return;
            
            if (this.battleController.isPlayerTurn()) {
                const phase = this.battleController.getPhase();
                
                if (phase === ClBattlePhase.SelectingCard) {
                    this.battleController.selectCard(card.id);
                } else if (phase === ClBattlePhase.SelectingTarget) {
                    this.battleController.cancelSelection();
                    this.battleController.selectCard(card.id);
                }
            }
        };
        
        // 卡牌打出回调
        hand.onCardPlay = (card, _target) => {
            if (!this.battleController) return;
            
            if (this.battleController.isPlayerTurn()) {
                this.battleController.quickPlayCard(card.id);
            }
        };
    }

    /**
     * 设置战斗 UI
     */
    private setupBattleUI(): void {
        if (!this.battleUI) return;
        
        this.battleUI.setEndTurnCallback(() => {
            console.log('⏭️ 结束回合');
            this.battleController?.endTurn();
        });
    }

    /**
     * 处理游戏开始
     */
    private handleGameStart(state: ClBattleState): void {
        console.log('⚔️ 游戏开始!', state);
        this.battleUI?.updateBattleState(state, this.localPlayerId);
        this.updateHandCards(state);
    }

    /**
     * 更新手牌
     */
    private updateHandCards(state: ClBattleState): void {
        const player = state.players.find(p => p.id === this.localPlayerId);
        if (!player || !this.battleScene) return;
        
        const hand = this.battleScene.getPlayerHand();
        hand.clear();
        
        for (const card of player.hand) {
            if (this.cardRenderer) {
                this.cardRenderer.createCard(card);
            }
            hand.addCard(card.id);
        }
    }

    /**
     * 高亮选中的卡牌
     */
    private highlightSelectedCard(cardId: string): void {
        this.cardRenderer?.setCardSelected(cardId, true);
    }

    /**
     * 清除卡牌高亮
     */
    private clearCardHighlight(): void {
        const state = this.battleController?.getBattleState();
        if (!state || !this.cardRenderer) return;
        
        const player = state.players.find(p => p.id === this.localPlayerId);
        if (!player) return;
        
        for (const card of player.hand) {
            this.cardRenderer.setCardSelected(card.id, false);
        }
    }

    // =========================================================================
    // 组队战斗
    // =========================================================================

    /**
     * 设置战斗模式
     */
    setBattleMode(mode: ClBattleMode): void {
        this.battleMode = mode;
        console.log(`⚔️ 战斗模式: ${mode}`);
    }

    /**
     * 获取当前战斗模式
     */
    getBattleMode(): ClBattleMode {
        return this.battleMode;
    }

    /**
     * 设置组队成员
     */
    setTeamMembers(members: ClTeamBattleMember[]): void {
        this.teamMembers = members;
        console.log(`👥 组队成员: ${members.map(m => m.name).join(', ')}`);
    }

    /**
     * 获取组队成员
     */
    getTeamMembers(): ClTeamBattleMember[] {
        return this.teamMembers;
    }

    /**
     * 开始组队 PvE 战斗
     */
    startCoopBattle(enemyName: string, teamMembers: ClTeamBattleMember[]): boolean {
        this.setBattleMode(ClBattleMode.CoopPvE);
        this.setTeamMembers(teamMembers);
        
        // 使用本地玩家开始战斗
        const success = this.startBattleWithAI(enemyName);
        
        if (success) {
            // 通知组队成员战斗开始
            this.messageUI?.info(`🎮 组队战斗开始! 敌人: ${enemyName}`);
        }
        
        return success;
    }

    /**
     * 更新组队成员状态 (从网络同步)
     */
    updateTeamMemberStatus(memberId: string, hp: number, isActive: boolean): void {
        const member = this.teamMembers.find(m => m.id === memberId);
        if (member) {
            member.hp = hp;
            member.isActive = isActive;
        }
    }

    /**
     * 检查是否为组队战斗
     */
    isCoopBattle(): boolean {
        return this.battleMode === ClBattleMode.CoopPvE || 
               this.battleMode === ClBattleMode.TeamPvP;
    }

    /**
     * 获取战斗控制器
     */
    getBattleController(): ClBattleController | null {
        return this.battleController;
    }

    /**
     * 获取战斗场景
     */
    getBattleScene(): ClBattleScene | null {
        return this.battleScene;
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.battleScene?.dispose();
        this.cardRenderer?.dispose();
        this.targetSelector?.dispose();
        this.battleUI?.dispose();
        this.battleController?.dispose();
    }
}
