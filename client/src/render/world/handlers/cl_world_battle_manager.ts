/**
 * 世界场景战斗管理器
 * 
 * 模块: client/render/world/handlers
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责：
 * - 管理战斗触发和结束
 * - 协调战斗场景与世界场景的切换
 * - 处理战斗结果
 */

import { Scene, Vector3 } from '@babylonjs/core';
import { ClBattleScene } from '../../battle/cl_battle_scene';
import { ClEnemySystem, EnemyData } from '../entities/cl_enemy_system';
import { ClPlayerController } from '../gameplay/cl_player_controller';
import { ClPlayerEntity } from '../entities/cl_player_entity';
import { ClStatusUI } from '../gameplay/stats/cl_status_ui';
import { ClInventoryUI } from '../gameplay/inventory/cl_inventory_ui';

/**
 * 战斗状态回调
 */
export interface ClBattleStateCallback {
    onBattleStart?: () => void;
    onBattleEnd?: (victory: boolean) => void;
    onEnemyEncounter?: (enemy: EnemyData) => void;  // 新增：敌人遇战回调
}

/**
 * 世界场景战斗管理器
 */
export class ClWorldBattleManager {
    private scene: Scene;
    private battleScene: ClBattleScene | null = null;
    private isBattleActive: boolean = false;
    
    // 引用
    private playerController: ClPlayerController | null = null;
    private playerEntity: ClPlayerEntity | null = null;
    private enemySystem: ClEnemySystem | null = null;
    private statusUI: ClStatusUI | null = null;
    private inventoryUI: ClInventoryUI | null = null;
    
    // 回调
    private stateCallback: ClBattleStateCallback = {};
    
    constructor(scene: Scene) {
        this.scene = scene;
    }
    
    /**
     * 初始化战斗系统
     */
    init(): void {
        this.battleScene = new ClBattleScene(this.scene);
        this.battleScene.onBattleEnd = (victory) => this.onBattleEnd(victory);
    }
    
    /**
     * 设置玩家控制器
     */
    setPlayerController(controller: ClPlayerController): void {
        this.playerController = controller;
    }
    
    /**
     * 设置玩家实体
     */
    setPlayerEntity(entity: ClPlayerEntity): void {
        this.playerEntity = entity;
    }
    
    /**
     * 设置敌人系统
     */
    setEnemySystem(system: ClEnemySystem): void {
        this.enemySystem = system;
        
        // 设置遇战回调 - 触发外部回调，让外部处理战斗场景切换
        this.enemySystem.setEncounterCallback((enemy: EnemyData) => {
            // 防止重复触发
            if (this.isBattleActive) return;
            
            // 标记战斗状态，阻止继续检测碰撞
            this.isBattleActive = true;
            
            // 禁用玩家控制
            this.playerController?.setEnabled(false);
            
            // 通知外部有敌人遇战
            if (this.stateCallback.onEnemyEncounter) {
                this.stateCallback.onEnemyEncounter(enemy);
            }
        });
    }
    
    /**
     * 设置 UI 引用
     */
    setUI(statusUI: ClStatusUI | null, inventoryUI: ClInventoryUI | null): void {
        this.statusUI = statusUI;
        this.inventoryUI = inventoryUI;
    }
    
    /**
     * 设置状态回调
     */
    setStateCallback(callback: ClBattleStateCallback): void {
        this.stateCallback = callback;
    }
    
    /**
     * 是否正在战斗
     */
    isInBattle(): boolean {
        return this.isBattleActive;
    }
    
    /**
     * 重置战斗状态（战斗结束后由外部调用）
     */
    resetBattleState(): void {
        this.isBattleActive = false;
        this.playerController?.setEnabled(true);
        this.statusUI?.setVisible(true);
    }
    
    /**
     * 获取战斗场景
     */
    getBattleScene(): ClBattleScene | null {
        return this.battleScene;
    }
    
    /**
     * 开始战斗
     */
    startBattle(enemy: EnemyData): void {
        if (this.isBattleActive || !this.battleScene || !this.playerController) return;
        
        console.log(`⚔️ 遭遇敌人: ${enemy.name}`);
        this.isBattleActive = true;
        
        // 禁用玩家控制
        this.playerController.setEnabled(false);
        
        // 隐藏 UI
        this.statusUI?.setVisible(false);
        this.inventoryUI?.setVisible(false);
        
        // 获取玩家位置
        const playerPos = this.playerController.getMesh()?.position || Vector3.Zero();
        
        // 启动战斗场景
        this.battleScene.startBattle(enemy, playerPos);
        
        // 触发回调
        this.stateCallback.onBattleStart?.();
    }
    
    /**
     * 战斗结束回调
     */
    private onBattleEnd(victory: boolean): void {
        console.log(`🏁 战斗结束，结果: ${victory ? '胜利' : '失败'}`);
        this.isBattleActive = false;
        
        // 恢复玩家控制
        this.playerController?.setEnabled(true);
        
        // 恢复 UI
        this.statusUI?.setVisible(true);
        
        // 处理结果
        if (victory && this.battleScene && (this.battleScene as any).enemyData) {
            const enemyId = (this.battleScene as any).enemyData.id;
            this.enemySystem?.removeEnemy(enemyId);
        } else {
            // 失败或逃跑，重置敌人状态
            if (this.battleScene && (this.battleScene as any).enemyData) {
                const enemyId = (this.battleScene as any).enemyData.id;
                this.enemySystem?.resetEnemy(enemyId);
            }
        }
        
        // 触发回调
        this.stateCallback.onBattleEnd?.(victory);
    }
    
    /**
     * 启动碰撞检测循环
     */
    startCollisionDetection(): void {
        this.scene.registerBeforeRender(() => {
            // 如果正在战斗，暂停大世界更新
            if (this.isBattleActive) return;
            
            if (!this.enemySystem || !this.playerController) return;
            
            const playerMesh = this.playerController.getMesh();
            const playerPos = playerMesh ? playerMesh.position : null;
            
            // 更新玩家实体位置
            if (playerPos && this.playerEntity) {
                this.playerEntity.setPosition(playerPos);
            }
            
            // 更新敌人 AI
            const dt = this.scene.getEngine().getDeltaTime() / 1000;
            this.enemySystem.update(dt, playerPos);

            // 检测玩家与敌人的碰撞
            if (playerPos) {
                this.enemySystem.checkPlayerCollision(playerPos);
            }
        });
    }
    
    /**
     * 清理资源
     */
    dispose(): void {
        // 战斗场景的清理由主场景管理
    }
}
