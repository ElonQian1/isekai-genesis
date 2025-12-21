/**
 * 战斗场景管理器
 * 
 * 模块: client/render
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import {
    Scene,
    Mesh,
    Vector3,
    Color3,
    Color4,
    TransformNode,
    StandardMaterial,
    MeshBuilder,
    HemisphericLight,
    DirectionalLight,
    ShadowGenerator,
    GlowLayer,
    ParticleSystem,
} from '@babylonjs/core';

import { ClHandManager } from './cl_hand_manager';

// =============================================================================
// 战斗场景配置
// =============================================================================

export const CL_BATTLE_CONFIG = {
    // 场地尺寸
    FIELD_WIDTH: 12,
    FIELD_DEPTH: 16,
    
    // 玩家位置
    PLAYER_Z: -6,
    OPPONENT_Z: 6,
    
    // 卡牌区域
    DECK_X: 5,
    DISCARD_X: -5,
    
    // 战场位置
    BATTLEFIELD_Y: 0.5,
    
    // 颜色
    PLAYER_COLOR: new Color3(0.2, 0.4, 0.8),
    OPPONENT_COLOR: new Color3(0.8, 0.2, 0.2),
    BATTLEFIELD_COLOR: new Color3(0.3, 0.25, 0.2),
};

// =============================================================================
// 区域定义
// =============================================================================

export enum ClBattleZone {
    PlayerHand = 'playerHand',
    PlayerField = 'playerField',
    PlayerDeck = 'playerDeck',
    PlayerDiscard = 'playerDiscard',
    OpponentHand = 'opponentHand',
    OpponentField = 'opponentField',
    OpponentDeck = 'opponentDeck',
    OpponentDiscard = 'opponentDiscard',
}

// =============================================================================
// 战斗场景管理器
// =============================================================================

export class ClBattleScene {
    private scene: Scene;
    private sceneRoot: TransformNode;
    
    // 光照
    private ambientLight!: HemisphericLight;
    private mainLight!: DirectionalLight;
    private shadowGenerator!: ShadowGenerator;
    private glowLayer!: GlowLayer;
    
    // 场景元素
    private battlefield!: Mesh;
    private playerArea!: Mesh;
    private opponentArea!: Mesh;
    private playerDeck!: Mesh;
    private playerDiscard!: Mesh;
    private opponentDeck!: Mesh;
    private opponentDiscard!: Mesh;
    
    // 手牌管理
    private playerHand!: ClHandManager;
    
    // 粒子效果
    private ambientParticles: ParticleSystem | null = null;

    constructor(scene: Scene) {
        this.scene = scene;
        
        // 创建场景根节点
        this.sceneRoot = new TransformNode('battleSceneRoot', scene);
        
        // 初始化
        this.setupLighting();
        this.setupBattlefield();
        this.setupPlayerAreas();
        this.setupDeckAreas();
        this.setupHandManagers();
        this.setupEffects();
        this.setupBackground();
    }

    /**
     * 设置光照
     */
    private setupLighting(): void {
        // 环境光
        this.ambientLight = new HemisphericLight(
            'ambientLight',
            new Vector3(0, 1, 0),
            this.scene
        );
        this.ambientLight.intensity = 0.5;
        this.ambientLight.groundColor = new Color3(0.2, 0.2, 0.3);
        
        // 主光源 (带阴影)
        this.mainLight = new DirectionalLight(
            'mainLight',
            new Vector3(-0.5, -1, 0.5),
            this.scene
        );
        this.mainLight.intensity = 0.8;
        this.mainLight.position = new Vector3(5, 10, -5);
        
        // 阴影生成器
        this.shadowGenerator = new ShadowGenerator(1024, this.mainLight);
        this.shadowGenerator.useBlurExponentialShadowMap = true;
        this.shadowGenerator.blurScale = 2;
        
        // 辉光层
        this.glowLayer = new GlowLayer('glowLayer', this.scene);
        this.glowLayer.intensity = 0.8;
    }

    /**
     * 设置战场
     */
    private setupBattlefield(): void {
        const { FIELD_WIDTH, FIELD_DEPTH, BATTLEFIELD_COLOR } = CL_BATTLE_CONFIG;
        
        // 战场地面
        this.battlefield = MeshBuilder.CreateGround(
            'battlefield',
            { width: FIELD_WIDTH, height: FIELD_DEPTH },
            this.scene
        );
        this.battlefield.parent = this.sceneRoot;
        this.battlefield.receiveShadows = true;
        
        // 战场材质
        const fieldMat = new StandardMaterial('fieldMat', this.scene);
        fieldMat.diffuseColor = BATTLEFIELD_COLOR;
        fieldMat.specularColor = new Color3(0.1, 0.1, 0.1);
        this.battlefield.material = fieldMat;
        
        // 中线
        const centerLine = MeshBuilder.CreateGround(
            'centerLine',
            { width: FIELD_WIDTH, height: 0.05 },
            this.scene
        );
        centerLine.position.y = 0.01;
        centerLine.parent = this.sceneRoot;
        
        const lineMat = new StandardMaterial('lineMat', this.scene);
        lineMat.diffuseColor = new Color3(0.5, 0.5, 0.5);
        lineMat.emissiveColor = new Color3(0.2, 0.2, 0.2);
        centerLine.material = lineMat;
    }

    /**
     * 设置玩家区域
     */
    private setupPlayerAreas(): void {
        const { PLAYER_Z, OPPONENT_Z, PLAYER_COLOR, OPPONENT_COLOR } = CL_BATTLE_CONFIG;
        
        // 玩家区域
        this.playerArea = this.createPlayerArea('playerArea', PLAYER_COLOR);
        this.playerArea.position = new Vector3(0, 0.01, PLAYER_Z);
        this.playerArea.parent = this.sceneRoot;
        
        // 对手区域
        this.opponentArea = this.createPlayerArea('opponentArea', OPPONENT_COLOR);
        this.opponentArea.position = new Vector3(0, 0.01, OPPONENT_Z);
        this.opponentArea.parent = this.sceneRoot;
    }

    /**
     * 创建玩家区域网格
     */
    private createPlayerArea(name: string, color: Color3): Mesh {
        const area = MeshBuilder.CreateGround(
            name,
            { width: CL_BATTLE_CONFIG.FIELD_WIDTH - 2, height: 3 },
            this.scene
        );
        
        const mat = new StandardMaterial(`${name}Mat`, this.scene);
        mat.diffuseColor = color.scale(0.3);
        mat.alpha = 0.5;
        mat.specularColor = Color3.Black();
        area.material = mat;
        
        return area;
    }

    /**
     * 设置牌堆区域
     */
    private setupDeckAreas(): void {
        const { DECK_X, DISCARD_X, PLAYER_Z, OPPONENT_Z } = CL_BATTLE_CONFIG;
        
        // 玩家牌堆
        this.playerDeck = this.createDeckPile('playerDeck');
        this.playerDeck.position = new Vector3(DECK_X, 0.1, PLAYER_Z);
        
        // 玩家弃牌堆
        this.playerDiscard = this.createDeckPile('playerDiscard');
        this.playerDiscard.position = new Vector3(DISCARD_X, 0.1, PLAYER_Z);
        
        // 对手牌堆
        this.opponentDeck = this.createDeckPile('opponentDeck');
        this.opponentDeck.position = new Vector3(-DECK_X, 0.1, OPPONENT_Z);
        
        // 对手弃牌堆
        this.opponentDiscard = this.createDeckPile('opponentDiscard');
        this.opponentDiscard.position = new Vector3(-DISCARD_X, 0.1, OPPONENT_Z);
    }

    /**
     * 创建牌堆
     */
    private createDeckPile(name: string): Mesh {
        const pile = MeshBuilder.CreateBox(
            name,
            { width: 1.2, height: 0.3, depth: 1.6 },
            this.scene
        );
        pile.parent = this.sceneRoot;
        
        const mat = new StandardMaterial(`${name}Mat`, this.scene);
        mat.diffuseColor = new Color3(0.3, 0.2, 0.1);
        pile.material = mat;
        
        // 添加阴影
        this.shadowGenerator.addShadowCaster(pile);
        
        return pile;
    }

    /**
     * 设置手牌管理器
     */
    private setupHandManagers(): void {
        this.playerHand = new ClHandManager(this.scene);
        
        // 设置回调
        this.playerHand.onCardPlay = (card, target) => {
            console.log(`打出卡牌: ${card.id} 到 (${target.x}, ${target.y}, ${target.z})`);
            // TODO: 通知游戏逻辑
        };
    }

    /**
     * 设置特效
     */
    private setupEffects(): void {
        // 创建环境粒子
        this.ambientParticles = new ParticleSystem(
            'ambientParticles',
            100,
            this.scene
        );
        
        // 粒子发射器位置
        this.ambientParticles.emitter = new Vector3(0, 5, 0);
        this.ambientParticles.minEmitBox = new Vector3(-6, 0, -8);
        this.ambientParticles.maxEmitBox = new Vector3(6, 0, 8);
        
        // 粒子属性
        this.ambientParticles.color1 = new Color4(1, 0.9, 0.7, 0.1);
        this.ambientParticles.color2 = new Color4(0.7, 0.8, 1, 0.05);
        this.ambientParticles.colorDead = new Color4(0, 0, 0, 0);
        
        this.ambientParticles.minSize = 0.02;
        this.ambientParticles.maxSize = 0.08;
        
        this.ambientParticles.minLifeTime = 3;
        this.ambientParticles.maxLifeTime = 6;
        
        this.ambientParticles.emitRate = 10;
        
        // 重力 (缓慢下落)
        this.ambientParticles.gravity = new Vector3(0, -0.1, 0);
        
        // 启动粒子
        this.ambientParticles.start();
    }

    /**
     * 设置背景
     */
    private setupBackground(): void {
        // 设置清屏颜色
        this.scene.clearColor = new Color4(0.05, 0.05, 0.1, 1);
    }

    /**
     * 获取玩家手牌管理器
     */
    getPlayerHand(): ClHandManager {
        return this.playerHand;
    }

    /**
     * 添加卡牌到玩家手牌
     */
    addCardToPlayerHand(cardId: string): void {
        this.playerHand.addCard(cardId);
    }

    /**
     * 获取区域位置
     */
    getZonePosition(zone: ClBattleZone): Vector3 {
        const { DECK_X, DISCARD_X, PLAYER_Z, OPPONENT_Z, BATTLEFIELD_Y } = CL_BATTLE_CONFIG;
        
        switch (zone) {
            case ClBattleZone.PlayerHand:
                return new Vector3(0, BATTLEFIELD_Y, PLAYER_Z - 2);
            case ClBattleZone.PlayerField:
                return new Vector3(0, BATTLEFIELD_Y, PLAYER_Z + 2);
            case ClBattleZone.PlayerDeck:
                return new Vector3(DECK_X, BATTLEFIELD_Y, PLAYER_Z);
            case ClBattleZone.PlayerDiscard:
                return new Vector3(DISCARD_X, BATTLEFIELD_Y, PLAYER_Z);
            case ClBattleZone.OpponentHand:
                return new Vector3(0, BATTLEFIELD_Y, OPPONENT_Z + 2);
            case ClBattleZone.OpponentField:
                return new Vector3(0, BATTLEFIELD_Y, OPPONENT_Z - 2);
            case ClBattleZone.OpponentDeck:
                return new Vector3(-DECK_X, BATTLEFIELD_Y, OPPONENT_Z);
            case ClBattleZone.OpponentDiscard:
                return new Vector3(-DISCARD_X, BATTLEFIELD_Y, OPPONENT_Z);
        }
    }

    /**
     * 销毁场景
     */
    dispose(): void {
        this.playerHand.dispose();
        this.ambientParticles?.dispose();
        this.glowLayer.dispose();
        this.sceneRoot.dispose();
    }
}
