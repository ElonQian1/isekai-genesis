/**
 * 战斗地形渲染器
 * 
 * 根据地形类型渲染南北双方战场区域
 */

import { Scene, Vector3, Color3, MeshBuilder, StandardMaterial, Mesh, TransformNode, LinesMesh } from '@babylonjs/core';

// 地形类型
export type TerrainType = 'plain' | 'volcano' | 'glacier' | 'ocean' | 'swamp' | 'shadow' | 'holy' | 'forest' | 'mountain';

// 地形颜色配置
const TERRAIN_COLORS: Record<TerrainType, { diffuse: Color3, emissive: Color3 }> = {
    plain: { diffuse: new Color3(0.56, 0.93, 0.56), emissive: new Color3(0.1, 0.2, 0.1) },
    volcano: { diffuse: new Color3(1, 0.27, 0), emissive: new Color3(0.3, 0.1, 0) },
    glacier: { diffuse: new Color3(0.68, 0.85, 0.9), emissive: new Color3(0.1, 0.15, 0.2) },
    ocean: { diffuse: new Color3(0, 0.41, 0.58), emissive: new Color3(0, 0.1, 0.15) },
    swamp: { diffuse: new Color3(0.33, 0.42, 0.18), emissive: new Color3(0.1, 0.12, 0.05) },
    shadow: { diffuse: new Color3(0.19, 0.1, 0.2), emissive: new Color3(0.1, 0.05, 0.12) },
    holy: { diffuse: new Color3(1, 1, 0.88), emissive: new Color3(0.2, 0.2, 0.15) },
    forest: { diffuse: new Color3(0.13, 0.55, 0.13), emissive: new Color3(0.05, 0.15, 0.05) },
    mountain: { diffuse: new Color3(0.55, 0.54, 0.54), emissive: new Color3(0.1, 0.1, 0.1) },
};

// 地形名称
const TERRAIN_NAMES: Record<TerrainType, string> = {
    plain: '平原',
    volcano: '火山',
    glacier: '冰原',
    ocean: '海洋',
    swamp: '沼泽',
    shadow: '暗域',
    holy: '圣域',
    forest: '森林',
    mountain: '山岳',
};

export interface BattleArenaConfig {
    playerTerrain: TerrainType;
    enemyTerrain: TerrainType;
    monsterSlotCount: number;  // 每方怪兽槽位数 (默认5)
    magicTrapSlotCount: number;  // 每方魔陷槽位数 (默认5)
}

/**
 * 战斗沙盘渲染器
 */
export class ClBattleArenaRenderer {
    private scene: Scene;
    private root: TransformNode;
    private playerMonsterSlots: Mesh[] = [];
    private enemyMonsterSlots: Mesh[] = [];
    private playerMagicTrapSlots: Mesh[] = [];
    private enemyMagicTrapSlots: Mesh[] = [];
    private centerLine: LinesMesh | null = null;
    private config: BattleArenaConfig;

    constructor(scene: Scene, parent: TransformNode) {
        this.scene = scene;
        this.root = new TransformNode('arenaRoot', scene);
        this.root.parent = parent;
        this.config = {
            playerTerrain: 'plain',
            enemyTerrain: 'plain',
            monsterSlotCount: 5,
            magicTrapSlotCount: 5
        };
    }

    /**
     * 创建战斗沙盘
     */
    public create(config: BattleArenaConfig): void {
        this.dispose();
        this.config = config;

        // 创建玩家怪兽区 (南方近中线, -Z)
        this.createMonsterZone('player', config.playerTerrain, -2);
        // 创建玩家魔陷区 (南方后排, -Z)
        this.createMagicTrapZone('player', config.playerTerrain, -5);
        
        // 创建敌人怪兽区 (北方近中线, +Z)
        this.createMonsterZone('enemy', config.enemyTerrain, 2);
        // 创建敌人魔陷区 (北方后排, +Z)
        this.createMagicTrapZone('enemy', config.enemyTerrain, 5);
        
        // 创建中线
        this.createCenterLine();

        console.log(`🗺️ 战场创建完成: 玩家[${TERRAIN_NAMES[config.playerTerrain]}] vs 敌人[${TERRAIN_NAMES[config.enemyTerrain]}] (怪兽区${config.monsterSlotCount}格 + 魔陷区${config.magicTrapSlotCount}格)`);
    }

    /**
     * 创建怪兽区 (靠近中线)
     */
    private createMonsterZone(side: 'player' | 'enemy', terrain: TerrainType, zOffset: number): void {
        const colors = TERRAIN_COLORS[terrain];
        const slots = side === 'player' ? this.playerMonsterSlots : this.enemyMonsterSlots;
        const slotCount = this.config.monsterSlotCount;
        
        const totalWidth = (slotCount - 1) * 2.5;
        const startX = -totalWidth / 2;

        for (let i = 0; i < slotCount; i++) {
            const slotMesh = MeshBuilder.CreateGround(`${side}_monster_${i}`, { width: 2, height: 2 }, this.scene);
            slotMesh.position = new Vector3(startX + i * 2.5, 0.05, zOffset);
            slotMesh.parent = this.root;
            slotMesh.isPickable = true;

            const mat = new StandardMaterial(`mat_${side}_monster_${i}`, this.scene);
            mat.diffuseColor = colors.diffuse;
            mat.emissiveColor = colors.emissive;
            mat.alpha = 0.85;
            mat.backFaceCulling = false;
            slotMesh.material = mat;

            // 怪兽区边框 (实线)
            const borderColor = side === 'player' ? new Color3(0.3, 1, 0.3) : new Color3(1, 0.3, 0.3);
            const border = MeshBuilder.CreateLines(`border_${side}_monster_${i}`, {
                points: [
                    new Vector3(-1, 0.06, -1),
                    new Vector3(1, 0.06, -1),
                    new Vector3(1, 0.06, 1),
                    new Vector3(-1, 0.06, 1),
                    new Vector3(-1, 0.06, -1)
                ]
            }, this.scene);
            border.color = borderColor;
            border.parent = slotMesh;

            slots.push(slotMesh);
        }
    }

    /**
     * 创建魔法/陷阱区 (远离中线)
     */
    private createMagicTrapZone(side: 'player' | 'enemy', terrain: TerrainType, zOffset: number): void {
        const colors = TERRAIN_COLORS[terrain];
        const slots = side === 'player' ? this.playerMagicTrapSlots : this.enemyMagicTrapSlots;
        const slotCount = this.config.magicTrapSlotCount;
        
        const totalWidth = (slotCount - 1) * 2.5;
        const startX = -totalWidth / 2;

        for (let i = 0; i < slotCount; i++) {
            const slotMesh = MeshBuilder.CreateGround(`${side}_magictrap_${i}`, { width: 2, height: 1.5 }, this.scene);
            slotMesh.position = new Vector3(startX + i * 2.5, 0.03, zOffset);
            slotMesh.parent = this.root;
            slotMesh.isPickable = true;

            // 魔陷区颜色较暗
            const mat = new StandardMaterial(`mat_${side}_magictrap_${i}`, this.scene);
            mat.diffuseColor = colors.diffuse.scale(0.6);
            mat.emissiveColor = colors.emissive.scale(0.4);
            mat.alpha = 0.7;
            mat.backFaceCulling = false;
            slotMesh.material = mat;

            // 魔陷区边框 (紫色虚线效果)
            const borderColor = new Color3(0.6, 0.3, 0.8);
            const border = MeshBuilder.CreateLines(`border_${side}_magictrap_${i}`, {
                points: [
                    new Vector3(-1, 0.04, -0.75),
                    new Vector3(1, 0.04, -0.75),
                    new Vector3(1, 0.04, 0.75),
                    new Vector3(-1, 0.04, 0.75),
                    new Vector3(-1, 0.04, -0.75)
                ]
            }, this.scene);
            border.color = borderColor;
            border.parent = slotMesh;

            slots.push(slotMesh);
        }
    }

    private createCenterLine(): void {
        const points = [
            new Vector3(-8, 0.1, 0),
            new Vector3(8, 0.1, 0)
        ];
        this.centerLine = MeshBuilder.CreateLines('centerLine', { points }, this.scene);
        this.centerLine.color = new Color3(1, 1, 1);
        this.centerLine.parent = this.root;
    }

    public getPlayerSlots(): Mesh[] {
        return this.playerMonsterSlots;
    }

    public getEnemySlots(): Mesh[] {
        return this.enemyMonsterSlots;
    }

    public getPlayerMagicTrapSlots(): Mesh[] {
        return this.playerMagicTrapSlots;
    }

    public getEnemyMagicTrapSlots(): Mesh[] {
        return this.enemyMagicTrapSlots;
    }

    public getTerrainName(side: 'player' | 'enemy'): string {
        const terrain = side === 'player' ? this.config.playerTerrain : this.config.enemyTerrain;
        return TERRAIN_NAMES[terrain];
    }

    public dispose(): void {
        this.playerMonsterSlots.forEach(m => m.dispose());
        this.enemyMonsterSlots.forEach(m => m.dispose());
        this.playerMagicTrapSlots.forEach(m => m.dispose());
        this.enemyMagicTrapSlots.forEach(m => m.dispose());
        this.playerMonsterSlots = [];
        this.enemyMonsterSlots = [];
        this.playerMagicTrapSlots = [];
        this.enemyMagicTrapSlots = [];
        if (this.centerLine) {
            this.centerLine.dispose();
            this.centerLine = null;
        }
    }
}
