/**
 * 大世界场景控制器
 * 
 * 职责：
 * - 大世界场景的生命周期管理
 * - 敌人遭遇和战斗触发
 * - 相机视角设置
 * - 玩家位置同步
 * 
 * 模块: client/scenes
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import { Scene, Vector3 } from '@babylonjs/core';
import { ClWorldSceneModular } from '../render/world/cl_world_scene_modular';
import { ClMessageUI } from '../ui/cl_message_ui';
import { EnemyData } from '../render/world/entities/cl_enemy_system';

// =============================================================================
// 敌人遭遇数据
// =============================================================================

export interface ClEncounterData {
    enemyId: string;
    enemyName: string;
    enemyLevel: number;
    enemyType: string;
}

// =============================================================================
// 大世界场景控制器
// =============================================================================

export class ClWorldSceneController {
    private scene: Scene;
    private worldScene: ClWorldSceneModular | null = null;
    private messageUI: ClMessageUI | null = null;
    
    // 当前遭遇的敌人
    private currentEncounter: ClEncounterData | null = null;
    
    // 战斗触发回调
    private onBattleTrigger: ((encounter: ClEncounterData) => void) | null = null;
    
    // 是否已显示过欢迎消息
    private hasShownWelcome: boolean = false;

    constructor(scene: Scene, messageUI: ClMessageUI | null) {
        this.scene = scene;
        this.messageUI = messageUI;
    }

    /**
     * 初始化
     */
    async init(): Promise<void> {
        const canvas = this.scene.getEngine().getRenderingCanvas();
        if (!canvas) {
            console.error('无法获取渲染画布');
            return;
        }
        
        // 创建模块化大世界场景
        this.worldScene = new ClWorldSceneModular(this.scene);
        await this.worldScene.init(canvas);
        this.worldScene.hide();
        
        // 设置战斗触发回调
        this.worldScene.setBattleTriggerCallback((enemy: EnemyData) => {
            this.handleEnemyEncounter(enemy);
        });
        
        console.log('✅ 大世界场景控制器初始化完成');
    }

    /**
     * 进入大世界
     */
    enter(): void {
        if (!this.worldScene) {
            console.error('大世界场景未初始化');
            return;
        }
        
        this.worldScene.show();
        this.setupIsometricCamera();
        
        // 只在第一次进入时显示欢迎消息
        if (!this.hasShownWelcome) {
            this.hasShownWelcome = true;
            this.messageUI?.info('欢迎来到暗黑世界！WASD移动 | E键编辑器 | B键背包', 5000);
        }
    }

    /**
     * 离开大世界
     */
    leave(): void {
        this.worldScene?.hide();
    }

    /**
     * 设置俯视相机（神界：原罪2 / 暗黑破坏神 风格）
     */
    private setupIsometricCamera(): void {
        const camera = this.scene.activeCamera as any;
        if (!camera) return;
        
        // 经典的 45-60 度俯视角
        camera.alpha = -Math.PI / 2;    // 正南方向
        camera.beta = Math.PI / 3.5;    // 约 50 度俯视，更有立体感
        camera.radius = 28;             // 较近的距离，突显细节
        
        // 锁定垂直角度范围
        camera.lowerBetaLimit = Math.PI / 6;    // 30度
        camera.upperBetaLimit = Math.PI / 2.2;  // 略低于90度
        
        // 锁定距离范围 (允许缩放)
        camera.lowerRadiusLimit = 10;
        camera.upperRadiusLimit = 50;
        
        // 禁用自动旋转
        camera.useAutoRotationBehavior = false;
    }

    /**
     * 处理敌人遭遇
     */
    private handleEnemyEncounter(enemy: EnemyData): void {
        console.log(`⚔️ 遭遇敌人: ${enemy.name} (Lv.${enemy.level})`);
        
        // 保存遭遇信息
        this.currentEncounter = {
            enemyId: enemy.id,
            enemyName: enemy.name,
            enemyLevel: enemy.level,
            enemyType: enemy.type,
        };
        
        // 显示遭遇提示
        this.messageUI?.warning(`遭遇 ${enemy.name} (Lv.${enemy.level})！`);
        
        // 触发战斗
        setTimeout(() => {
            if (this.currentEncounter && this.onBattleTrigger) {
                this.onBattleTrigger(this.currentEncounter);
            }
        }, 1000);
    }

    /**
     * 设置战斗触发回调
     */
    setBattleTriggerCallback(callback: (encounter: ClEncounterData) => void): void {
        this.onBattleTrigger = callback;
    }

    /**
     * 战斗结束后处理
     */
    handleBattleResult(victory: boolean): void {
        if (!this.currentEncounter) return;
        
        if (victory) {
            // 移除被击败的敌人
            this.worldScene?.getEnemySystem()?.removeEnemy(this.currentEncounter.enemyId);
            this.messageUI?.success(`击败了 ${this.currentEncounter.enemyName}！`);
        } else {
            // 战斗失败，重置敌人状态
            this.worldScene?.getEnemySystem()?.resetEnemy(this.currentEncounter.enemyId);
            this.messageUI?.error('战斗失败...');
        }
        
        // 清理遭遇状态
        this.currentEncounter = null;
        
        // 重置战斗状态，允许再次触发战斗
        this.worldScene?.resetBattleState();
    }

    /**
     * 获取当前遭遇
     */
    getCurrentEncounter(): ClEncounterData | null {
        return this.currentEncounter;
    }

    /**
     * 获取大世界场景实例
     */
    getWorldScene(): ClWorldSceneModular | null {
        return this.worldScene;
    }
    
    /**
     * 获取玩家当前位置
     */
    getPlayerPosition(): Vector3 | null {
        return this.worldScene?.getPlayerEntity()?.getPosition() || null;
    }
    
    /**
     * 设置玩家位置 (用于加载存档)
     */
    setPlayerPosition(x: number, y: number, z: number): void {
        const playerEntity = this.worldScene?.getPlayerEntity();
        if (playerEntity) {
            playerEntity.setPosition(new Vector3(x, y, z));
            console.log(`📍 玩家位置设置为: (${x}, ${y}, ${z})`);
        }
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.worldScene?.dispose();
        this.worldScene = null;
        this.currentEncounter = null;
    }
}
