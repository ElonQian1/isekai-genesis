/**
 * 战场渲染模块
 * 
 * 模块: client/render/battle
 * 前缀: Cl
 * 职责: 渲染战场地面、玩家区域、牌堆等3D元素
 */

import {
    Scene,
    Mesh,
    Vector3,
    Color3,
    TransformNode,
    StandardMaterial,
    MeshBuilder,
    ShadowGenerator,
} from '@babylonjs/core';

import { CL_BATTLE_CONFIG, ClBattleZone } from './cl_battle_types';

// =============================================================================
// 战场渲染器
// =============================================================================

export class ClBattleField {
    private scene: Scene;
    private root: TransformNode;
    private shadowGenerator: ShadowGenerator | null = null;
    
    // 场景元素
    private battlefield!: Mesh;
    private centerLine!: Mesh;
    private playerArea!: Mesh;
    private opponentArea!: Mesh;
    
    // 牌堆
    private playerDeck!: Mesh;
    private playerDiscard!: Mesh;
    private opponentDeck!: Mesh;
    private opponentDiscard!: Mesh;

    constructor(scene: Scene, parent: TransformNode) {
        this.scene = scene;
        this.root = new TransformNode('battleFieldRoot', scene);
        this.root.parent = parent;
        
        this.createBattlefield();
        this.createPlayerAreas();
        this.createDeckPiles();
    }

    /**
     * 设置阴影生成器
     */
    setShadowGenerator(generator: ShadowGenerator): void {
        this.shadowGenerator = generator;
        
        // 为牌堆添加阴影
        this.shadowGenerator.addShadowCaster(this.playerDeck);
        this.shadowGenerator.addShadowCaster(this.playerDiscard);
        this.shadowGenerator.addShadowCaster(this.opponentDeck);
        this.shadowGenerator.addShadowCaster(this.opponentDiscard);
    }

    /**
     * 创建战场地面
     */
    private createBattlefield(): void {
        const { FIELD_WIDTH, FIELD_DEPTH, BATTLEFIELD_COLOR } = CL_BATTLE_CONFIG;
        
        // 战场地面
        this.battlefield = MeshBuilder.CreateGround(
            'battlefield',
            { width: FIELD_WIDTH, height: FIELD_DEPTH },
            this.scene
        );
        this.battlefield.parent = this.root;
        this.battlefield.receiveShadows = true;
        
        // 战场材质
        const fieldMat = new StandardMaterial('fieldMat', this.scene);
        fieldMat.diffuseColor = BATTLEFIELD_COLOR;
        fieldMat.specularColor = new Color3(0.1, 0.1, 0.1);
        this.battlefield.material = fieldMat;
        
        // 中线
        this.centerLine = MeshBuilder.CreateGround(
            'centerLine',
            { width: FIELD_WIDTH, height: 0.05 },
            this.scene
        );
        this.centerLine.position.y = 0.01;
        this.centerLine.parent = this.root;
        
        const lineMat = new StandardMaterial('lineMat', this.scene);
        lineMat.diffuseColor = new Color3(0.5, 0.5, 0.5);
        lineMat.emissiveColor = new Color3(0.2, 0.2, 0.2);
        this.centerLine.material = lineMat;
    }

    /**
     * 创建玩家区域
     */
    private createPlayerAreas(): void {
        const { PLAYER_Z, OPPONENT_Z, PLAYER_COLOR, OPPONENT_COLOR } = CL_BATTLE_CONFIG;
        
        // 玩家区域
        this.playerArea = this.createAreaMesh('playerArea', PLAYER_COLOR);
        this.playerArea.position = new Vector3(0, 0.01, PLAYER_Z);
        
        // 对手区域
        this.opponentArea = this.createAreaMesh('opponentArea', OPPONENT_COLOR);
        this.opponentArea.position = new Vector3(0, 0.01, OPPONENT_Z);
    }

    /**
     * 创建区域网格
     */
    private createAreaMesh(name: string, color: Color3): Mesh {
        const area = MeshBuilder.CreateGround(
            name,
            { width: CL_BATTLE_CONFIG.FIELD_WIDTH - 2, height: 3 },
            this.scene
        );
        area.parent = this.root;
        
        const mat = new StandardMaterial(`${name}Mat`, this.scene);
        mat.diffuseColor = color.scale(0.3);
        mat.alpha = 0.5;
        mat.specularColor = Color3.Black();
        area.material = mat;
        
        return area;
    }

    /**
     * 创建牌堆
     */
    private createDeckPiles(): void {
        const { DECK_X, DISCARD_X, PLAYER_Z, OPPONENT_Z } = CL_BATTLE_CONFIG;
        
        // 玩家牌堆
        this.playerDeck = this.createDeckMesh('playerDeck');
        this.playerDeck.position = new Vector3(DECK_X, 0.1, PLAYER_Z);
        
        // 玩家弃牌堆
        this.playerDiscard = this.createDeckMesh('playerDiscard');
        this.playerDiscard.position = new Vector3(DISCARD_X, 0.1, PLAYER_Z);
        
        // 对手牌堆
        this.opponentDeck = this.createDeckMesh('opponentDeck');
        this.opponentDeck.position = new Vector3(-DECK_X, 0.1, OPPONENT_Z);
        
        // 对手弃牌堆
        this.opponentDiscard = this.createDeckMesh('opponentDiscard');
        this.opponentDiscard.position = new Vector3(-DISCARD_X, 0.1, OPPONENT_Z);
    }

    /**
     * 创建牌堆网格
     */
    private createDeckMesh(name: string): Mesh {
        const pile = MeshBuilder.CreateBox(
            name,
            { width: 1.2, height: 0.3, depth: 1.6 },
            this.scene
        );
        pile.parent = this.root;
        
        const mat = new StandardMaterial(`${name}Mat`, this.scene);
        mat.diffuseColor = new Color3(0.3, 0.2, 0.1);
        pile.material = mat;
        
        return pile;
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
     * 获取玩家区域网格
     */
    getPlayerArea(): Mesh {
        return this.playerArea;
    }

    /**
     * 获取对手区域网格
     */
    getOpponentArea(): Mesh {
        return this.opponentArea;
    }

    /**
     * 更新牌堆显示 (可以基于牌数调整高度)
     */
    updateDeckDisplay(playerDeckCount: number, playerDiscardCount: number,
                      opponentDeckCount: number, opponentDiscardCount: number): void {
        // 根据牌数调整牌堆高度
        const baseHeight = 0.3;
        const heightPerCard = 0.02;
        
        this.playerDeck.scaling.y = Math.max(0.2, baseHeight + playerDeckCount * heightPerCard);
        this.playerDiscard.scaling.y = Math.max(0.1, playerDiscardCount * heightPerCard);
        this.opponentDeck.scaling.y = Math.max(0.2, baseHeight + opponentDeckCount * heightPerCard);
        this.opponentDiscard.scaling.y = Math.max(0.1, opponentDiscardCount * heightPerCard);
    }

    /**
     * 设置可见性
     */
    setEnabled(enabled: boolean): void {
        this.root.setEnabled(enabled);
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.root.dispose();
    }
}
