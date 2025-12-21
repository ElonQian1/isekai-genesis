/**
 * 游戏主类
 * 
 * 模块: client
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import { Engine, Scene, ArcRotateCamera, Vector3, WebGPUEngine } from '@babylonjs/core';
import { ClBattleScene } from './render/cl_battle_scene';
import { ClCardRenderer, cl_createTestCardData } from './render/cl_card_renderer';
import { ClBattleUI } from './ui/cl_battle_ui';
import { ClBattleManager, ClBattleState } from './cl_battle_manager';

/**
 * 游戏主类 - 管理引擎、场景和渲染
 */
export class ClGame {
    private canvas: HTMLCanvasElement;
    private engine: Engine | WebGPUEngine | null = null;
    private scene: Scene | null = null;
    private isWebGPU: boolean = false;
    
    // 战斗场景
    private battleScene: ClBattleScene | null = null;
    
    // 卡牌渲染器
    private cardRenderer: ClCardRenderer | null = null;
    
    // 战斗 UI
    private battleUI: ClBattleUI | null = null;
    
    // 战斗管理器
    private battleManager: ClBattleManager | null = null;
    
    // 本地玩家 ID
    private localPlayerId: string = 'player1';

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

    /**
     * 初始化游戏引擎和场景
     */
    async cl_init(): Promise<void> {
        // 尝试 WebGPU，失败则降级到 WebGL
        this.engine = await this.cl_createEngine();
        
        // 创建场景
        this.scene = this.cl_createScene();
        
        // 初始化战斗场景
        this.battleScene = new ClBattleScene(this.scene);
        
        // 初始化卡牌渲染器
        this.cardRenderer = new ClCardRenderer(this.scene);
        
        // 初始化战斗 UI
        this.battleUI = new ClBattleUI(this.scene);
        
        // 初始化战斗管理器
        this.battleManager = new ClBattleManager();
        await this.battleManager.init();
        
        // 设置战斗管理器回调
        this.setupBattleCallbacks();
        
        // 添加测试卡牌到手牌
        this.cl_addTestCards();
        
        // 启动测试战斗
        this.cl_startTestBattle();
        
        // 窗口大小变化时调整
        window.addEventListener('resize', () => {
            this.engine?.resize();
        });
    }
    
    /**
     * 设置战斗回调
     */
    private setupBattleCallbacks(): void {
        if (!this.battleManager || !this.battleUI) return;
        
        // 状态更新回调
        this.battleManager.onStateUpdate = (state: ClBattleState) => {
            this.battleUI?.updateBattleState(state, this.localPlayerId);
            this.updateHandCards(state);
        };
        
        // 卡牌打出回调
        this.battleManager.onCardPlayed = (result, cardId, targetId) => {
            console.log(`🎴 卡牌 ${cardId} 打出，目标: ${targetId}`, result);
            // TODO: 播放卡牌动画
        };
        
        // 战斗结束回调
        this.battleManager.onBattleEnd = (winnerId) => {
            console.log(`🏆 战斗结束! 获胜者: ${winnerId || '平局'}`);
        };
        
        // 结束回合按钮
        this.battleUI.setEndTurnCallback(() => {
            this.battleManager?.endTurn(this.localPlayerId);
        });
    }
    
    /**
     * 更新手牌显示
     */
    private updateHandCards(state: ClBattleState): void {
        const player = state.players.find(p => p.id === this.localPlayerId);
        if (!player || !this.battleScene) return;
        
        // 清空当前手牌
        const hand = this.battleScene.getPlayerHand();
        hand.clear();
        
        // 添加玩家手牌
        for (const card of player.hand) {
            hand.addCard(card.id);
            // TODO: 使用 cardRenderer 更新卡牌外观
        }
    }
    
    /**
     * 启动测试战斗
     */
    private cl_startTestBattle(): void {
        if (!this.battleManager) return;
        
        this.battleManager.createBattle('test-battle-1');
        this.battleManager.addPlayer('player1', '你');
        this.battleManager.addPlayer('player2', '对手');
        this.battleManager.startBattle();
        
        console.log('⚔️ 测试战斗已启动!');
    }
    
    /**
     * 添加测试卡牌
     */
    private cl_addTestCards(): void {
        if (!this.battleScene || !this.cardRenderer) return;
        
        // 创建测试卡牌数据并渲染
        const hand = this.battleScene.getPlayerHand();
        for (let i = 0; i < 5; i++) {
            const cardData = cl_createTestCardData(i);
            this.cardRenderer.createCard(cardData);
            hand.addCard(cardData.id);
        }
        console.log(`🃏 添加了 ${hand.getCardCount()} 张测试卡牌`);
    }

    /**
     * 创建渲染引擎 (优先 WebGPU)
     */
    private async cl_createEngine(): Promise<Engine | WebGPUEngine> {
        // 尝试 WebGPU
        if (navigator.gpu) {
            try {
                console.log('🚀 尝试初始化 WebGPU...');
                const webgpuEngine = new WebGPUEngine(this.canvas, {
                    antialias: true,
                    stencil: true,
                });
                await webgpuEngine.initAsync();
                this.isWebGPU = true;
                console.log('✅ WebGPU 初始化成功!');
                return webgpuEngine;
            } catch (e) {
                console.warn('⚠️ WebGPU 初始化失败，降级到 WebGL:', e);
            }
        } else {
            console.log('ℹ️ 浏览器不支持 WebGPU，使用 WebGL');
        }

        // 降级到 WebGL
        console.log('🎨 使用 WebGL 引擎');
        return new Engine(this.canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
        });
    }

    /**
     * 创建游戏场景
     */
    private cl_createScene(): Scene {
        if (!this.engine) {
            throw new Error('引擎未初始化');
        }

        const scene = new Scene(this.engine);

        // 相机 - 俯视角度看战场
        const camera = new ArcRotateCamera(
            'camera',
            -Math.PI / 2,  // alpha (水平旋转)
            Math.PI / 4,   // beta (俯视角度 45度)
            15,            // radius (距离)
            new Vector3(0, 0, 0),
            scene
        );
        camera.attachControl(this.canvas, true);
        camera.lowerRadiusLimit = 8;
        camera.upperRadiusLimit = 25;
        camera.lowerBetaLimit = 0.2;
        camera.upperBetaLimit = Math.PI / 2.5;

        return scene;
    }

    /**
     * 开始渲染循环
     */
    cl_run(): void {
        if (!this.engine || !this.scene) {
            throw new Error('引擎或场景未初始化');
        }

        this.engine.runRenderLoop(() => {
            this.scene?.render();
        });
    }

    /**
     * 获取引擎类型
     */
    cl_getEngineType(): string {
        return this.isWebGPU ? 'WebGPU' : 'WebGL';
    }
    
    /**
     * 获取战斗场景
     */
    cl_getBattleScene(): ClBattleScene | null {
        return this.battleScene;
    }

    /**
     * 销毁游戏
     */
    cl_dispose(): void {
        this.battleScene?.dispose();
        this.scene?.dispose();
        this.engine?.dispose();
    }
}
