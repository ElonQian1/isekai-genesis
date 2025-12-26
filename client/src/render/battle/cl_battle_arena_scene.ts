/**
 * 新版战斗沙盘场景
 * 
 * 南北双方布局 + 地形系统 + 怪兽召唤
 * PC: 360°旋转相机
 * 手机: 固定视角 (竖屏/横屏)
 */

import { Scene, Vector3, TransformNode, Camera, Color3, PointerEventTypes, PointerInfo, MeshBuilder, StandardMaterial, Mesh } from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, Control, Rectangle, StackPanel, Button } from '@babylonjs/gui';
import { 
    ClBattleArenaRenderer, 
    TerrainType, 
    ClMonsterMesh,
    MonsterDisplayData,
    MonsterAttribute,
    MonsterPosition,
    detectDeviceType,
    detectOrientation,
    createBattleCamera,
    onOrientationChange,
    DeviceType,
    Orientation,
    ClTributeSystem,
    TributeSummonTarget,
    ClTerrainEffects,
    ClBattleEffects,
    ClBattleSoundManager
} from './index';
import { 
    cl_getTerrainModifier, 
    cl_validateNormalSummon,
    cl_validateTributeSummon,
    ClWasmMonsterAttribute,
    ClWasmTerrainType 
} from '../../cl_wasm';

export interface ArenaBattleConfig {
    playerTerrain: TerrainType;
    enemyTerrain: TerrainType;
}

/**
 * 回合阶段 (与 Rust gc_turn 对应)
 */
export type TurnPhase = 'draw' | 'main1' | 'battle' | 'main2' | 'end';

/**
 * 回合状态
 */
export interface TurnState {
    turnNumber: number;
    phase: TurnPhase;
    isPlayerTurn: boolean;
    normalSummonUsed: boolean;
    attackedSlots: number[];  // 已攻击的怪兽槽位
}

/**
 * 战斗玩家状态
 */
export interface BattlePlayerState {
    hp: number;
    maxHp: number;
    name: string;
}

/**
 * 魔法卡效果类型
 */
export type SpellEffectType = 
    | 'damage_player'      // 对玩家造成伤害
    | 'damage_monster'     // 对怪兽造成伤害
    | 'damage_all_monsters'// 对所有怪兽造成伤害
    | 'heal_player'        // 治疗玩家
    | 'boost_atk'          // 增加攻击力
    | 'boost_def'          // 增加防御力
    | 'destroy_monster';   // 直接消灭怪兽

/**
 * 魔法卡效果配置
 */
export interface SpellEffect {
    type: SpellEffectType;
    value: number;           // 效果数值 (伤害/治疗/增益量)
    target?: 'enemy' | 'ally' | 'all';  // 目标类型
    duration?: number;       // 持续回合数 (0 = 永久)
}

/**
 * 魔法卡配置数据
 */
export interface SpellCardConfig {
    id: string;
    name: string;
    description: string;
    effects: SpellEffect[];   // 一张卡可以有多个效果
    manaCost?: number;        // 法力消耗 (未来扩展)
}

/**
 * 预定义魔法卡库
 */
export const SPELL_CARD_LIBRARY: Record<string, SpellCardConfig> = {
    'spell_fireball': {
        id: 'spell_fireball',
        name: '火球术',
        description: '对敌方造成500点伤害',
        effects: [{ type: 'damage_player', value: 500, target: 'enemy' }]
    },
    'spell_lightning': {
        id: 'spell_lightning',
        name: '雷击术',
        description: '对敌方一只怪兽造成800点伤害',
        effects: [{ type: 'damage_monster', value: 800, target: 'enemy' }]
    },
    'spell_meteor': {
        id: 'spell_meteor',
        name: '陨石雨',
        description: '对敌方所有怪兽造成400点伤害',
        effects: [{ type: 'damage_all_monsters', value: 400, target: 'enemy' }]
    },
    'spell_heal': {
        id: 'spell_heal',
        name: '治愈之光',
        description: '恢复玩家1000点生命值',
        effects: [{ type: 'heal_player', value: 1000, target: 'ally' }]
    },
    'spell_power_boost': {
        id: 'spell_power_boost',
        name: '力量强化',
        description: '己方怪兽攻击力+500',
        effects: [{ type: 'boost_atk', value: 500, target: 'ally' }]
    },
    'spell_dark_hole': {
        id: 'spell_dark_hole',
        name: '黑洞',
        description: '消灭场上一只敌方怪兽',
        effects: [{ type: 'destroy_monster', value: 1, target: 'enemy' }]
    },
    'spell_double_damage': {
        id: 'spell_double_damage',
        name: '烈焰爆发',
        description: '对敌方玩家造成300伤害，并对一只怪兽造成300伤害',
        effects: [
            { type: 'damage_player', value: 300, target: 'enemy' },
            { type: 'damage_monster', value: 300, target: 'enemy' }
        ]
    }
};

// =============================================================================
// 陷阱卡系统
// =============================================================================

/**
 * 陷阱卡触发时机
 */
export type TrapTriggerType = 
    | 'on_attack'           // 敌方攻击时
    | 'on_summon'           // 敌方召唤时
    | 'on_damage'           // 受到伤害时
    | 'on_enemy_turn_start' // 敌方回合开始
    | 'manual';              // 手动发动

/**
 * 陷阱卡效果类型
 */
export type TrapEffectType = 
    | 'negate_attack'       // 无效化攻击
    | 'destroy_attacker'    // 消灭攻击怪兽
    | 'reflect_damage'      // 反弹伤害
    | 'boost_def'           // 提升防御
    | 'summon_token'        // 召唤代币
    | 'damage_enemy';        // 对敌方造成伤害

/**
 * 陷阱卡效果
 */
export interface TrapEffect {
    type: TrapEffectType;
    value: number;
}

/**
 * 陷阱卡配置
 */
export interface TrapCardConfig {
    id: string;
    name: string;
    description: string;
    trigger: TrapTriggerType;
    effects: TrapEffect[];
}

/**
 * 已设置的陷阱卡
 */
export interface SetTrap {
    config: TrapCardConfig;
    slotIndex: number;
    isFaceDown: boolean;  // 是否覆盖
}

/**
 * 预定义陷阱卡库
 */
export const TRAP_CARD_LIBRARY: Record<string, TrapCardConfig> = {
    'trap_mirror_force': {
        id: 'trap_mirror_force',
        name: '神圣防护罩',
        description: '敌方攻击时发动，消灭攻击怪兽',
        trigger: 'on_attack',
        effects: [{ type: 'destroy_attacker', value: 1 }]
    },
    'trap_magic_cylinder': {
        id: 'trap_magic_cylinder',
        name: '魔法筒',
        description: '敌方攻击时发动，无效化攻击并将攻击力作为伤害反弹',
        trigger: 'on_attack',
        effects: [
            { type: 'negate_attack', value: 1 },
            { type: 'reflect_damage', value: 100 }  // 100% 反弹
        ]
    },
    'trap_trap_hole': {
        id: 'trap_trap_hole',
        name: '落穴',
        description: '敌方召唤ATK≥1000怪兽时，消灭该怪兽',
        trigger: 'on_summon',
        effects: [{ type: 'destroy_attacker', value: 1000 }]  // value = ATK门槛
    },
    'trap_negate_attack': {
        id: 'trap_negate_attack',
        name: '攻击无力化',
        description: '敌方攻击时发动，无效化这次攻击',
        trigger: 'on_attack',
        effects: [{ type: 'negate_attack', value: 1 }]
    },
    'trap_damage_wall': {
        id: 'trap_damage_wall',
        name: '伤害之壁',
        description: '受到伤害时发动，对敌方造成500伤害',
        trigger: 'on_damage',
        effects: [{ type: 'damage_enemy', value: 500 }]
    }
};

/**
 * 创建陷阱卡手牌对象
 */
export function createTrapHandCard(trapId: string, uniqueId?: string): HandCard | null {
    const config = TRAP_CARD_LIBRARY[trapId];
    if (!config) return null;
    
    return {
        id: uniqueId || `trap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: config.name,
        type: 'trap',
        effect: config.description,
        trapConfig: config
    };
}

/**
 * 手牌数据
 */
export interface HandCard {
    id: string;
    name: string;
    type: 'monster' | 'spell' | 'trap';
    level?: number;  // 怪兽等级
    attribute?: MonsterAttribute;
    atk?: number;
    def?: number;
    effect?: string;  // 效果描述
    spellConfig?: SpellCardConfig;  // 魔法卡配置
    trapConfig?: TrapCardConfig;    // 陷阱卡配置
}

/**
 * 从魔法卡库创建手牌对象
 */
export function createSpellHandCard(spellId: string, uniqueId?: string): HandCard | null {
    const config = SPELL_CARD_LIBRARY[spellId];
    if (!config) return null;
    
    return {
        id: uniqueId || `spell_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: config.name,
        type: 'spell',
        effect: config.description,
        spellConfig: config
    };
}

/**
 * 阶段名称映射
 */
const PHASE_NAMES: Record<TurnPhase, string> = {
    draw: '抽牌阶段',
    main1: '主要阶段1',
    battle: '战斗阶段',
    main2: '主要阶段2',
    end: '结束阶段'
};

/**
 * 新版战斗沙盘场景
 */
export class ClBattleArenaScene {
    private scene: Scene;
    private root: TransformNode;
    private ui: AdvancedDynamicTexture;
    
    // 渲染器
    private arenaRenderer: ClBattleArenaRenderer;
    private terrainEffects: ClTerrainEffects | null = null;  // 🌟 地形粒子特效
    private battleEffects: ClBattleEffects | null = null;     // ⚔️ 战斗特效 (攻击/伤害/治疗)
    private soundManager: ClBattleSoundManager;               // 🔊 战斗音效管理器
    private playerMonsters: (ClMonsterMesh | null)[] = [null, null, null, null, null];
    private enemyMonsters: (ClMonsterMesh | null)[] = [null, null, null, null, null];
    
    // 相机
    private battleCamera: Camera | null = null;
    private originalCamera: Camera | null = null;
    private deviceType: DeviceType;
    private orientation: Orientation;
    private cleanupOrientationListener: (() => void) | null = null;
    
    // 配置
    public config: ArenaBattleConfig;
    
    // UI
    private terrainLabel: TextBlock | null = null;
    private messageLabel: TextBlock | null = null;
    private phaseLabel: TextBlock | null = null;
    private turnLabel: TextBlock | null = null;
    
    // 回合状态
    private turnState: TurnState = {
        turnNumber: 1,
        phase: 'draw',
        isPlayerTurn: true,
        normalSummonUsed: false,
        attackedSlots: []
    };
    
    // 攻击选择状态
    private attackingSlot: number = -1;  // 正在选择攻击目标的怪兽槽位
    private isSelectingTarget: boolean = false;  // 是否正在选择攻击目标
    private targetPointerObserver: any = null;  // 目标选择的指针事件
    
    // 按钮引用
    private phaseBtn: Button | null = null;
    private summonBtn: Button | null = null;
    private attackBtn: Button | null = null;
    private tributeBtn: Button | null = null;
    private spellBtn: Button | null = null;
    private directAttackBtn: Button | null = null;
    
    // 玩家状态
    private playerState: BattlePlayerState = { hp: 8000, maxHp: 8000, name: '玩家' };
    private enemyState: BattlePlayerState = { hp: 8000, maxHp: 8000, name: '敌人' };
    
    // 玩家 HP UI
    private playerHpLabel: TextBlock | null = null;
    private enemyHpLabel: TextBlock | null = null;
    private playerHpBar: Rectangle | null = null;
    private enemyHpBar: Rectangle | null = null;
    
    // 手牌系统
    private hand: HandCard[] = [];
    private handPanel: StackPanel | null = null;
    private selectedHandIndex: number = -1;
    
    // 卡组和墓地
    private deck: HandCard[] = [];      // 卡组 (抽牌来源)
    private graveyard: HandCard[] = []; // 墓地 (已使用/被消灭的卡)
    private deckCountLabel: TextBlock | null = null;  // 卡组剩余数量显示
    
    // 魔陷区系统
    private setTraps: (SetTrap | null)[] = [null, null, null, null, null];  // 玩家已设置的陷阱卡
    private trapMeshes: (Mesh | null)[] = [null, null, null, null, null];   // 陷阱卡3D网格
    private spellMeshes: (Mesh | null)[] = [null, null, null, null, null];  // 魔法卡3D网格 (备用)
    private trapBtn: Button | null = null;  // 设置陷阱按钮
    private positionBtn: Button | null = null;  // 切换攻守表示按钮
    
    // 当前选择的怪兽槽位 (用于切换表示)
    private selectedMonsterSlot: number = -1;
    
    // 祭品系统
    private tributeSystem: ClTributeSystem | null = null;
    
    // 回调
    public onBattleEnd: ((victory: boolean) => void) | null = null;

    constructor(scene: Scene) {
        this.scene = scene;
        this.root = new TransformNode('arenaRoot', scene);
        this.root.setEnabled(false);
        
        this.ui = AdvancedDynamicTexture.CreateFullscreenUI('arenaUI', true, scene);
        this.ui.rootContainer.isVisible = false;
        
        this.arenaRenderer = new ClBattleArenaRenderer(scene, this.root);
        this.terrainEffects = new ClTerrainEffects(scene);  // 🌟 初始化地形粒子特效
        this.battleEffects = new ClBattleEffects(scene, this.root);  // ⚔️ 初始化战斗特效
        this.soundManager = new ClBattleSoundManager();  // 🔊 初始化战斗音效
        
        this.deviceType = detectDeviceType();
        this.orientation = detectOrientation();
        this.config = { playerTerrain: 'plain', enemyTerrain: 'plain' };
        
        console.log(`📱 设备类型: ${this.deviceType}, 方向: ${this.orientation}`);
    }

    /**
     * 开始战斗
     */
    public start(config: ArenaBattleConfig, battlePos: Vector3): void {
        this.config = config;
        this.root.position = battlePos;
        this.root.setEnabled(true);
        this.ui.rootContainer.isVisible = true;
        
        // 保存原相机
        this.originalCamera = this.scene.activeCamera;
        
        // 创建战斗相机
        this.battleCamera = createBattleCamera(this.scene, {
            target: battlePos,
            deviceType: this.deviceType,
            orientation: this.orientation
        });
        this.scene.activeCamera = this.battleCamera;
        
        // 创建战场 (5怪兽区 + 5魔陷区)
        this.arenaRenderer.create({
            playerTerrain: config.playerTerrain,
            enemyTerrain: config.enemyTerrain,
            monsterSlotCount: 5,
            magicTrapSlotCount: 5
        });
        
        // 🌟 启动地形粒子特效
        if (this.terrainEffects) {
            this.terrainEffects.create(
                config.playerTerrain,
                config.enemyTerrain,
                new Vector3(battlePos.x, battlePos.y + 0.1, battlePos.z - 3.5),  // 玩家区域
                new Vector3(battlePos.x, battlePos.y + 0.1, battlePos.z + 3.5)   // 敌方区域
            );
        }
        
        // 重置回合状态
        this.turnState = {
            turnNumber: 1,
            phase: 'draw',
            isPlayerTurn: true,
            normalSummonUsed: false,
            attackedSlots: []
        };
        this.attackingSlot = -1;
        
        // 重置玩家状态
        this.playerState = { hp: 8000, maxHp: 8000, name: '玩家' };
        this.enemyState = { hp: 8000, maxHp: 8000, name: '敌人' };
        
        // 初始化手牌
        this.initializeHand();
        
        // 创建UI
        this.createUI();
        
        // 初始化祭品系统
        this.tributeSystem = new ClTributeSystem(this.scene, this.root, this.ui);
        this.tributeSystem.setPlayerMonsters(this.playerMonsters);
        this.tributeSystem.onTributeSummonComplete = (targetSlot, monster, tributeSlots) => {
            this.handleTributeSummonComplete(targetSlot, monster, tributeSlots);
        };
        this.tributeSystem.onCancel = () => {
            this.showMessage('取消祭品召唤');
            this.updateButtonStates();
        };
        
        // 监听屏幕方向变化 (仅手机)
        if (this.deviceType === 'mobile') {
            this.cleanupOrientationListener = onOrientationChange((newOrientation) => {
                if (newOrientation !== this.orientation) {
                    this.orientation = newOrientation;
                    this.handleOrientationChange();
                }
            });
        }
        
        console.log(`⚔️ 战斗开始! 玩家地形[${config.playerTerrain}] vs 敌人地形[${config.enemyTerrain}]`);
        
        // 初始化战场 - 敌方召唤初始怪兽
        this.initBattle();
        
        // 自动进入主阶段1
        setTimeout(() => {
            this.advancePhase(); // draw -> main1
        }, 1500);
    }

    /**
     * 初始化战斗 - 召唤初始怪兽
     */
    private initBattle(): void {
        // 敌方召唤1-3个初始怪兽
        const enemyCount = 1 + Math.floor(Math.random() * 3);  // 1-3个
        
        const enemyTypes: { name: string; attribute: MonsterAttribute; atk: number; def: number }[] = [
            { name: '骷髅战士', attribute: 'dark', atk: 1200, def: 800 },
            { name: '火焰恶魔', attribute: 'fire', atk: 1400, def: 900 },
            { name: '冰霜巨人', attribute: 'water', atk: 1300, def: 1100 },
            { name: '暗影刺客', attribute: 'dark', atk: 1600, def: 600 },
            { name: '岩石守卫', attribute: 'earth', atk: 900, def: 1500 },
        ];
        
        for (let i = 0; i < enemyCount; i++) {
            const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            const monster: MonsterDisplayData = {
                id: `enemy_init_${i}`,
                name: type.name,
                attribute: type.attribute,
                atk: type.atk + Math.floor(Math.random() * 200),
                def: type.def + Math.floor(Math.random() * 100),
                hp: type.atk,
                maxHp: type.atk,
                position: 'attack'  // 敌方怪兽默认攻击表示
            };
            this.summonEnemyMonster(i, monster);
        }
        
        this.showMessage(`敌方召唤了 ${enemyCount} 个怪兽!`);
    }

    /**
     * 结束战斗
     */
    public end(victory: boolean): void {
        // 清理怪兽
        this.playerMonsters.forEach(m => m?.dispose());
        this.enemyMonsters.forEach(m => m?.dispose());
        this.playerMonsters = [null, null, null, null, null];
        this.enemyMonsters = [null, null, null, null, null];
        
        // 清理渲染器
        this.arenaRenderer.dispose();
        
        // 🌟 清理地形粒子特效
        this.terrainEffects?.dispose();
        
        // ⚔️ 清理战斗特效
        this.battleEffects?.dispose();
        
        // 🔊 清理音效管理器
        this.soundManager.dispose();
        
        // 清理陷阱卡网格
        this.trapMeshes.forEach(m => m?.dispose());
        this.trapMeshes = [null, null, null, null, null];
        
        // 清理祭品系统
        this.tributeSystem?.dispose();
        this.tributeSystem = null;
        
        // 恢复相机
        if (this.originalCamera) {
            this.battleCamera?.dispose();
            this.scene.activeCamera = this.originalCamera;
        }
        
        // 清理监听
        if (this.cleanupOrientationListener) {
            this.cleanupOrientationListener();
            this.cleanupOrientationListener = null;
        }
        
        this.root.setEnabled(false);
        this.ui.rootContainer.isVisible = false;
        
        if (this.onBattleEnd) {
            this.onBattleEnd(victory);
        }
    }

    /**
     * 召唤怪兽到玩家槽位
     */
    public summonPlayerMonster(slot: number, data: MonsterDisplayData): void {
        if (slot < 0 || slot > 4) return;
        
        // 移除旧怪兽
        this.playerMonsters[slot]?.dispose();
        
        // 获取槽位位置
        const slotMesh = this.arenaRenderer.getPlayerSlots()[slot];
        if (!slotMesh) return;
        
        const pos = slotMesh.position.clone();
        pos.y = 0;
        
        const monster = new ClMonsterMesh(this.scene, this.root, data, pos);
        this.playerMonsters[slot] = monster;
        
        // 🌟 显示地形加成信息
        this.showTerrainBuffInfo(monster, this.config.playerTerrain);
        
        console.log(`🐉 召唤怪兽 [${data.name}] 到槽位 ${slot}`);
    }
    
    /**
     * 显示怪兽的地形加成信息
     */
    private showTerrainBuffInfo(monster: ClMonsterMesh, terrain: TerrainType): void {
        const attr = monster.data.attribute as ClWasmMonsterAttribute;
        const terrainId = terrain as ClWasmTerrainType;
        const modifier = cl_getTerrainModifier(terrainId, attr);
        
        if (!modifier) return;
        
        const atkMod = modifier.atk_percent;
        const defMod = modifier.def_percent;
        
        if (atkMod === 0 && defMod === 0) return;
        
        // 构建提示信息
        const parts: string[] = [];
        if (atkMod !== 0) {
            const sign = atkMod > 0 ? '+' : '';
            parts.push(`ATK ${sign}${atkMod}%`);
        }
        if (defMod !== 0) {
            const sign = defMod > 0 ? '+' : '';
            parts.push(`DEF ${sign}${defMod}%`);
        }
        
        const effectText = parts.join(' ');
        const emoji = atkMod > 0 || defMod > 0 ? '⬆️' : '⬇️';
        const terrainName = this.arenaRenderer.getTerrainName('player');
        
        this.showMessage(`${emoji} ${terrainName}地形: ${monster.data.name} ${effectText}`);
    }

    /**
     * 召唤敌方怪兽
     */
    public summonEnemyMonster(slot: number, data: MonsterDisplayData): void {
        if (slot < 0 || slot > 4) return;
        
        this.enemyMonsters[slot]?.dispose();
        
        const slotMesh = this.arenaRenderer.getEnemySlots()[slot];
        if (!slotMesh) return;
        
        const pos = slotMesh.position.clone();
        pos.y = 0;
        
        const monster = new ClMonsterMesh(this.scene, this.root, data, pos);
        this.enemyMonsters[slot] = monster;
    }

    /**
     * 处理屏幕方向变化
     */
    private handleOrientationChange(): void {
        console.log(`📱 屏幕方向变化: ${this.orientation}`);
        
        // 重新创建相机
        this.battleCamera?.dispose();
        this.battleCamera = createBattleCamera(this.scene, {
            target: this.root.position,
            deviceType: this.deviceType,
            orientation: this.orientation
        });
        this.scene.activeCamera = this.battleCamera;
        
        // 重新创建 UI 以适配新方向
        this.createUI();
    }

    /**
     * 创建UI
     */
    private createUI(): void {
        // 清理旧UI
        this.ui.dispose();
        this.ui = AdvancedDynamicTexture.CreateFullscreenUI('arenaUI', true, this.scene);
        
        const isLandscape = this.orientation === 'landscape';
        
        if (isLandscape) {
            // 🌐 手机横屏: 左右布局
            this.createLandscapeUI();
        } else {
            // 📱 竖屏: 上下布局  
            this.createPortraitUI();
        }
        
        // ===== 中间消息 (两种模式共用) =====
        this.messageLabel = new TextBlock();
        this.messageLabel.text = '战斗开始！';
        this.messageLabel.color = 'white';
        this.messageLabel.fontSize = isLandscape ? 22 : 28;
        this.messageLabel.top = '-100px';
        this.ui.addControl(this.messageLabel);
        
        // 更新按钮状态
        this.updateButtonStates();
    }
    
    /**
     * 📱 竖屏模式 UI (上下布局)
     */
    private createPortraitUI(): void {
        // ===== 顶部信息栏 =====
        const topBar = new Rectangle();
        topBar.height = '80px';
        topBar.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        topBar.background = '#000000AA';
        topBar.thickness = 0;
        this.ui.addControl(topBar);
        
        const topStack = new StackPanel();
        topStack.isVertical = true;
        topBar.addControl(topStack);
        
        // 回合指示器
        this.turnLabel = new TextBlock();
        this.turnLabel.text = `第 ${this.turnState.turnNumber} 回合 - 我方回合`;
        this.turnLabel.color = '#FFD700';
        this.turnLabel.fontSize = 18;
        this.turnLabel.height = '25px';
        topStack.addControl(this.turnLabel);
        
        // 阶段指示器
        this.phaseLabel = new TextBlock();
        this.phaseLabel.text = `【${PHASE_NAMES[this.turnState.phase]}】`;
        this.phaseLabel.color = '#00FF88';
        this.phaseLabel.fontSize = 22;
        this.phaseLabel.fontWeight = 'bold';
        this.phaseLabel.height = '30px';
        topStack.addControl(this.phaseLabel);
        
        // 地形信息
        this.terrainLabel = new TextBlock();
        this.terrainLabel.text = `我方: ${this.arenaRenderer.getTerrainName('player')} | 敌方: ${this.arenaRenderer.getTerrainName('enemy')}`;
        this.terrainLabel.color = 'white';
        this.terrainLabel.fontSize = 16;
        this.terrainLabel.height = '22px';
        topStack.addControl(this.terrainLabel);
        
        // ===== 玩家 HP 显示 =====
        this.createHpBars(false);
        
        // ===== 手牌区域 =====
        this.createHandPanel(false);
        
        // ===== 底部按钮区 =====
        const bottomPanel = new StackPanel();
        bottomPanel.isVertical = false;
        bottomPanel.height = '60px';
        bottomPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        bottomPanel.paddingBottom = '20px';
        this.ui.addControl(bottomPanel);
        
        this.createActionButtons(bottomPanel, false);
    }
    
    /**
     * 🌐 横屏模式 UI (左右布局 - 手机横屏优化)
     * 左侧: 敌方状态
     * 中间: 3D 场景
     * 右侧: 玩家状态 + 操作按钮
     */
    private createLandscapeUI(): void {
        // ===== 顶部紧凑信息栏 =====
        const topBar = new Rectangle();
        topBar.height = '50px';
        topBar.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        topBar.background = '#000000AA';
        topBar.thickness = 0;
        this.ui.addControl(topBar);
        
        const topStack = new StackPanel();
        topStack.isVertical = false;  // 横向排列
        topStack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        topBar.addControl(topStack);
        
        // 回合 + 阶段信息 (紧凑排列)
        this.turnLabel = new TextBlock();
        this.turnLabel.text = `回合 ${this.turnState.turnNumber}`;
        this.turnLabel.color = '#FFD700';
        this.turnLabel.fontSize = 14;
        this.turnLabel.width = '80px';
        topStack.addControl(this.turnLabel);
        
        this.phaseLabel = new TextBlock();
        this.phaseLabel.text = `【${PHASE_NAMES[this.turnState.phase]}】`;
        this.phaseLabel.color = '#00FF88';
        this.phaseLabel.fontSize = 16;
        this.phaseLabel.fontWeight = 'bold';
        this.phaseLabel.width = '120px';
        topStack.addControl(this.phaseLabel);
        
        this.terrainLabel = new TextBlock();
        this.terrainLabel.text = `${this.arenaRenderer.getTerrainName('player')} vs ${this.arenaRenderer.getTerrainName('enemy')}`;
        this.terrainLabel.color = 'white';
        this.terrainLabel.fontSize = 12;
        this.terrainLabel.width = '150px';
        topStack.addControl(this.terrainLabel);
        
        // ===== 左侧面板 (敌方状态) =====
        const leftPanel = new Rectangle('leftPanel');
        leftPanel.width = '130px';
        leftPanel.height = '200px';
        leftPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        leftPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        leftPanel.left = '10px';
        leftPanel.background = '#000000AA';
        leftPanel.cornerRadius = 8;
        leftPanel.thickness = 1;
        leftPanel.color = '#333';
        this.ui.addControl(leftPanel);
        
        const leftStack = new StackPanel();
        leftStack.isVertical = true;
        leftStack.paddingTop = '10px';
        leftPanel.addControl(leftStack);
        
        // 敌方标题
        const enemyTitle = new TextBlock();
        enemyTitle.text = '👹 敌方';
        enemyTitle.color = '#FF6666';
        enemyTitle.fontSize = 14;
        enemyTitle.height = '20px';
        leftStack.addControl(enemyTitle);
        
        // 敌方 HP
        this.enemyHpLabel = new TextBlock('enemyHpLabel');
        this.enemyHpLabel.text = `HP: ${this.enemyState.hp}/${this.enemyState.maxHp}`;
        this.enemyHpLabel.color = '#FF6666';
        this.enemyHpLabel.fontSize = 12;
        this.enemyHpLabel.height = '18px';
        leftStack.addControl(this.enemyHpLabel);
        
        // 敌方 HP 条
        const enemyHpBg = new Rectangle('enemyHpBg');
        enemyHpBg.width = '100px';
        enemyHpBg.height = '12px';
        enemyHpBg.background = '#333333';
        enemyHpBg.thickness = 1;
        enemyHpBg.color = '#666666';
        leftStack.addControl(enemyHpBg);
        
        this.enemyHpBar = new Rectangle('enemyHpBar');
        this.enemyHpBar.width = '96px';
        this.enemyHpBar.height = '8px';
        this.enemyHpBar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.enemyHpBar.left = '2px';
        this.enemyHpBar.background = '#FF4444';
        this.enemyHpBar.thickness = 0;
        enemyHpBg.addControl(this.enemyHpBar);
        
        // ===== 右侧面板 (玩家状态 + 按钮) =====
        const rightPanel = new Rectangle('rightPanel');
        rightPanel.width = '130px';
        rightPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        rightPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        rightPanel.left = '-10px';
        rightPanel.background = '#000000AA';
        rightPanel.cornerRadius = 8;
        rightPanel.thickness = 1;
        rightPanel.color = '#333';
        this.ui.addControl(rightPanel);
        
        const rightStack = new StackPanel();
        rightStack.isVertical = true;
        rightStack.paddingTop = '10px';
        rightPanel.addControl(rightStack);
        
        // 玩家标题
        const playerTitle = new TextBlock();
        playerTitle.text = '⭐ 玩家';
        playerTitle.color = '#66FF66';
        playerTitle.fontSize = 14;
        playerTitle.height = '20px';
        rightStack.addControl(playerTitle);
        
        // 玩家 HP
        this.playerHpLabel = new TextBlock('playerHpLabel');
        this.playerHpLabel.text = `HP: ${this.playerState.hp}/${this.playerState.maxHp}`;
        this.playerHpLabel.color = '#66FF66';
        this.playerHpLabel.fontSize = 12;
        this.playerHpLabel.height = '18px';
        rightStack.addControl(this.playerHpLabel);
        
        // 玩家 HP 条
        const playerHpBg = new Rectangle('playerHpBg');
        playerHpBg.width = '100px';
        playerHpBg.height = '12px';
        playerHpBg.background = '#333333';
        playerHpBg.thickness = 1;
        playerHpBg.color = '#666666';
        rightStack.addControl(playerHpBg);
        
        this.playerHpBar = new Rectangle('playerHpBar');
        this.playerHpBar.width = '96px';
        this.playerHpBar.height = '8px';
        this.playerHpBar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.playerHpBar.left = '2px';
        this.playerHpBar.background = '#44FF44';
        this.playerHpBar.thickness = 0;
        playerHpBg.addControl(this.playerHpBar);
        
        // 卡组/墓地信息
        this.deckCountLabel = new TextBlock('deckCount');
        this.deckCountLabel.text = `📚 ${this.deck.length} | 💀 ${this.graveyard.length}`;
        this.deckCountLabel.color = '#00BFFF';
        this.deckCountLabel.fontSize = 10;
        this.deckCountLabel.height = '16px';
        rightStack.addControl(this.deckCountLabel);
        
        // 分隔线
        const separator = new Rectangle();
        separator.width = '100px';
        separator.height = '2px';
        separator.background = '#444';
        separator.thickness = 0;
        rightStack.addControl(separator);
        
        // 操作按钮区 (垂直排列)
        this.createLandscapeButtons(rightStack);
        
        // ===== 底部手牌区 (横向紧凑) =====
        this.createHandPanel(true);
    }
    
    /**
     * 🎨 为按钮添加交互反馈效果 (悬停高亮 + 点击缩放 + 音效)
     */
    private addButtonInteraction(btn: Button, baseColor: string): void {
        // 解析基础颜色并创建高亮版本
        const highlightColor = this.lightenColor(baseColor, 20);
        const pressColor = this.darkenColor(baseColor, 15);
        
        // 悬停效果
        btn.onPointerEnterObservable.add(() => {
            btn.background = highlightColor;
            btn.scaleX = 1.05;
            btn.scaleY = 1.05;
        });
        
        btn.onPointerOutObservable.add(() => {
            btn.background = baseColor;
            btn.scaleX = 1.0;
            btn.scaleY = 1.0;
        });
        
        // 点击效果 + 音效
        btn.onPointerDownObservable.add(() => {
            btn.background = pressColor;
            btn.scaleX = 0.95;
            btn.scaleY = 0.95;
            // 🔊 播放点击音效
            this.soundManager.playClick();
        });
        
        btn.onPointerUpObservable.add(() => {
            btn.background = highlightColor;
            btn.scaleX = 1.05;
            btn.scaleY = 1.05;
        });
    }
    
    /**
     * 使颜色变亮
     */
    private lightenColor(hex: string, percent: number): string {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100));
        const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100));
        const b = Math.min(255, (num & 0x0000FF) + Math.round(255 * percent / 100));
        return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
    }
    
    /**
     * 使颜色变暗
     */
    private darkenColor(hex: string, percent: number): string {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, (num >> 16) - Math.round(255 * percent / 100));
        const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * percent / 100));
        const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * percent / 100));
        return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
    }
    
    /**
     * 创建横屏模式的操作按钮 (垂直排列)
     */
    private createLandscapeButtons(container: StackPanel): void {
        const btnWidth = '110px';
        const btnHeight = '32px';
        const fontSize = 11;
        
        // 召唤按钮
        this.summonBtn = Button.CreateSimpleButton('summon', '召唤');
        this.summonBtn.width = btnWidth;
        this.summonBtn.height = btnHeight;
        this.summonBtn.fontSize = fontSize;
        this.summonBtn.color = 'white';
        this.summonBtn.background = '#4CAF50';
        this.addButtonInteraction(this.summonBtn, '#4CAF50');
        this.summonBtn.onPointerClickObservable.add(() => this.testSummon());
        container.addControl(this.summonBtn);
        
        // 攻击按钮
        this.attackBtn = Button.CreateSimpleButton('attack', '攻击');
        this.attackBtn.width = btnWidth;
        this.attackBtn.height = btnHeight;
        this.attackBtn.fontSize = fontSize;
        this.attackBtn.color = 'white';
        this.attackBtn.background = '#FF5722';
        this.addButtonInteraction(this.attackBtn, '#FF5722');
        this.attackBtn.onPointerClickObservable.add(() => this.handleAttackClick());
        container.addControl(this.attackBtn);
        
        // 法术卡按钮
        this.spellBtn = Button.CreateSimpleButton('spell', '法术');
        this.spellBtn.width = btnWidth;
        this.spellBtn.height = btnHeight;
        this.spellBtn.fontSize = fontSize;
        this.spellBtn.color = 'white';
        this.spellBtn.background = '#3498db';
        this.addButtonInteraction(this.spellBtn, '#3498db');
        this.spellBtn.onPointerClickObservable.add(() => this.useSpellCard());
        container.addControl(this.spellBtn);
        
        // 陷阱按钮
        this.trapBtn = Button.CreateSimpleButton('trap', '陷阱');
        this.trapBtn.width = btnWidth;
        this.trapBtn.height = btnHeight;
        this.trapBtn.fontSize = fontSize;
        this.trapBtn.color = 'white';
        this.trapBtn.background = '#9932CC';
        this.addButtonInteraction(this.trapBtn, '#9932CC');
        this.trapBtn.onPointerClickObservable.add(() => this.setTrapCard());
        container.addControl(this.trapBtn);
        
        // 阶段按钮
        this.phaseBtn = Button.CreateSimpleButton('phase', '下一阶段');
        this.phaseBtn.width = btnWidth;
        this.phaseBtn.height = btnHeight;
        this.phaseBtn.fontSize = fontSize;
        this.phaseBtn.color = 'white';
        this.phaseBtn.background = '#2196F3';
        this.addButtonInteraction(this.phaseBtn, '#2196F3');
        this.phaseBtn.onPointerClickObservable.add(() => this.advancePhase());
        container.addControl(this.phaseBtn);
        
        // 结束按钮
        const endBtn = Button.CreateSimpleButton('end', '结束战斗');
        endBtn.width = btnWidth;
        endBtn.height = btnHeight;
        endBtn.fontSize = fontSize;
        endBtn.color = 'white';
        endBtn.background = '#f44336';
        this.addButtonInteraction(endBtn, '#f44336');
        endBtn.onPointerClickObservable.add(() => this.end(true));
        container.addControl(endBtn);
        
        // 横屏模式下隐藏的按钮 (但仍需要初始化以避免空引用)
        this.tributeBtn = Button.CreateSimpleButton('tribute', '祭品召唤');
        this.tributeBtn.isVisible = false;
        this.positionBtn = Button.CreateSimpleButton('position', '攻守切换');
        this.positionBtn.isVisible = false;
        this.directAttackBtn = Button.CreateSimpleButton('directAttack', '直接攻击');
        this.directAttackBtn.isVisible = false;
    }
    
    /**
     * 创建竖屏模式的操作按钮 (水平排列)
     */
    private createActionButtons(container: StackPanel, isLandscape: boolean): void {
        const btnWidth = '120px';
        const btnHeight = '50px';
        
        // 召唤按钮
        this.summonBtn = Button.CreateSimpleButton('summon', '召唤怪兽');
        this.summonBtn.width = btnWidth;
        this.summonBtn.height = btnHeight;
        this.summonBtn.color = 'white';
        this.summonBtn.background = '#4CAF50';
        this.summonBtn.paddingLeft = '5px';
        this.summonBtn.paddingRight = '5px';
        this.addButtonInteraction(this.summonBtn, '#4CAF50');
        this.summonBtn.onPointerClickObservable.add(() => this.testSummon());
        container.addControl(this.summonBtn);
        
        // 祭品召唤按钮
        this.tributeBtn = Button.CreateSimpleButton('tribute', '祭品召唤');
        this.tributeBtn.width = '100px';
        this.tributeBtn.height = btnHeight;
        this.tributeBtn.color = 'white';
        this.tributeBtn.background = '#9b59b6';
        this.tributeBtn.paddingLeft = '5px';
        this.tributeBtn.paddingRight = '5px';
        this.addButtonInteraction(this.tributeBtn, '#9b59b6');
        this.tributeBtn.onPointerClickObservable.add(() => this.startTributeSummon());
        container.addControl(this.tributeBtn);
        
        // 攻击按钮
        this.attackBtn = Button.CreateSimpleButton('attack', '攻击');
        this.attackBtn.width = '100px';
        this.attackBtn.height = btnHeight;
        this.attackBtn.color = 'white';
        this.attackBtn.background = '#FF5722';
        this.attackBtn.paddingLeft = '5px';
        this.attackBtn.paddingRight = '5px';
        this.addButtonInteraction(this.attackBtn, '#FF5722');
        this.attackBtn.onPointerClickObservable.add(() => this.handleAttackClick());
        container.addControl(this.attackBtn);
        
        // 法术卡按钮
        this.spellBtn = Button.CreateSimpleButton('spell', '法术卡');
        this.spellBtn.width = '90px';
        this.spellBtn.height = btnHeight;
        this.spellBtn.color = 'white';
        this.spellBtn.background = '#3498db';
        this.spellBtn.paddingLeft = '5px';
        this.spellBtn.paddingRight = '5px';
        this.addButtonInteraction(this.spellBtn, '#3498db');
        this.spellBtn.onPointerClickObservable.add(() => this.useSpellCard());
        container.addControl(this.spellBtn);
        
        // 设置陷阱按钮
        this.trapBtn = Button.CreateSimpleButton('trap', '设陷阱');
        this.trapBtn.width = '80px';
        this.trapBtn.height = btnHeight;
        this.trapBtn.color = 'white';
        this.trapBtn.background = '#9932CC';
        this.trapBtn.paddingLeft = '5px';
        this.trapBtn.paddingRight = '5px';
        this.addButtonInteraction(this.trapBtn, '#9932CC');
        this.trapBtn.onPointerClickObservable.add(() => this.setTrapCard());
        container.addControl(this.trapBtn);
        
        // 攻守切换按钮
        this.positionBtn = Button.CreateSimpleButton('position', '攻守切换');
        this.positionBtn.width = '90px';
        this.positionBtn.height = btnHeight;
        this.positionBtn.color = 'white';
        this.positionBtn.background = '#1abc9c';
        this.positionBtn.paddingLeft = '5px';
        this.positionBtn.paddingRight = '5px';
        this.addButtonInteraction(this.positionBtn, '#1abc9c');
        this.positionBtn.onPointerClickObservable.add(() => this.toggleMonsterPosition());
        container.addControl(this.positionBtn);
        
        // 直接攻击按钮
        this.directAttackBtn = Button.CreateSimpleButton('directAttack', '直接攻击');
        this.directAttackBtn.width = '90px';
        this.directAttackBtn.height = btnHeight;
        this.directAttackBtn.color = 'white';
        this.directAttackBtn.background = '#e74c3c';
        this.directAttackBtn.paddingLeft = '5px';
        this.directAttackBtn.paddingRight = '5px';
        this.addButtonInteraction(this.directAttackBtn, '#e74c3c');
        this.directAttackBtn.onPointerClickObservable.add(() => this.tryDirectAttack());
        container.addControl(this.directAttackBtn);
        
        // 阶段转换按钮
        this.phaseBtn = Button.CreateSimpleButton('phase', '下一阶段');
        this.phaseBtn.width = btnWidth;
        this.phaseBtn.height = btnHeight;
        this.phaseBtn.color = 'white';
        this.phaseBtn.background = '#2196F3';
        this.phaseBtn.paddingLeft = '5px';
        this.phaseBtn.paddingRight = '5px';
        this.addButtonInteraction(this.phaseBtn, '#2196F3');
        this.phaseBtn.onPointerClickObservable.add(() => this.advancePhase());
        container.addControl(this.phaseBtn);
        
        // 结束战斗按钮
        const endBtn = Button.CreateSimpleButton('end', '结束战斗');
        endBtn.width = btnWidth;
        endBtn.height = btnHeight;
        endBtn.color = 'white';
        endBtn.background = '#f44336';
        endBtn.paddingLeft = '5px';
        endBtn.paddingRight = '5px';
        this.addButtonInteraction(endBtn, '#f44336');
        endBtn.onPointerClickObservable.add(() => this.end(true));
        container.addControl(endBtn);
    }

    /**
     * 召唤怪兽 (从手牌或测试)
     */
    private testSummon(): void {
        // 检查阶段
        if (this.turnState.phase !== 'main1' && this.turnState.phase !== 'main2') {
            this.showMessage('只能在主阶段召唤');
            return;
        }
        
        // 检查是否已通常召唤
        if (this.turnState.normalSummonUsed) {
            this.showMessage('本回合已进行过通常召唤');
            return;
        }
        
        // 尝试从手牌召唤
        if (this.selectedHandIndex >= 0) {
            this.summonFromHand();
            return;
        }
        
        // 如果没有选择手牌，提示用户
        this.showMessage('请先从手牌选择一张怪兽卡');
    }

    // ===== 祭品召唤系统 =====

    /**
     * 开始祭品召唤流程
     */
    private startTributeSummon(): void {
        // 检查阶段
        if (this.turnState.phase !== 'main1' && this.turnState.phase !== 'main2') {
            this.showMessage('只能在主阶段进行祭品召唤');
            return;
        }
        
        // 检查是否有怪兽可作为祭品
        const availableTributes = this.playerMonsters.filter(m => m !== null).length;
        if (availableTributes < 1) {
            this.showMessage('没有可作为祭品的怪兽');
            return;
        }
        
        // 测试用高级怪兽 (需要1-2个祭品)
        const targetMonster: TributeSummonTarget = availableTributes >= 2 
            ? {
                name: '蓝眼白龙',
                level: 8,
                attribute: 'light',
                atk: 3000,
                def: 2500,
                requiredTributes: 2
            }
            : {
                name: '暗黑魔术师',
                level: 6,
                attribute: 'dark',
                atk: 2500,
                def: 2100,
                requiredTributes: 1
            };
        
        this.showMessage(`选择祭品召唤【${targetMonster.name}】`);
        
        // 更新祭品系统的怪兽引用
        this.tributeSystem?.setPlayerMonsters(this.playerMonsters);
        this.tributeSystem?.startTributeSummon(targetMonster);
    }

    /**
     * 处理祭品召唤完成
     */
    private handleTributeSummonComplete(targetSlot: number, monster: MonsterDisplayData, tributeSlots: number[]): void {
        // 🌟 使用 WASM 验证祭品召唤
        const occupiedSlots = this.playerMonsters
            .map((m, i) => m !== null ? i : -1)
            .filter(i => i >= 0);
        
        const validation = cl_validateTributeSummon(
            monster.atk >= 2500 ? 7 : 5,  // 根据ATK推断等级
            tributeSlots,
            occupiedSlots
        );
        
        if (!validation.valid) {
            this.showMessage(validation.error || '祭品召唤验证失败');
            return;
        }
        
        // 销毁祭品
        tributeSlots.forEach(slot => {
            this.playerMonsters[slot]?.dispose();
            this.playerMonsters[slot] = null;
        });
        
        // 召唤新怪兽到第一个祭品位置
        this.summonPlayerMonster(targetSlot, monster);
        
        // 从手牌移除祭品召唤的卡
        if (this.pendingTributeCardIndex >= 0 && this.pendingTributeCardIndex < this.hand.length) {
            this.hand.splice(this.pendingTributeCardIndex, 1);
            this.pendingTributeCardIndex = -1;
            this.selectedHandIndex = -1;
            this.refreshHandDisplay();
        }
        
        // 祭品召唤不算通常召唤
        this.showMessage(`🔮 祭品召唤成功! 召唤了【${monster.name}】`);
        // 🔊 播放召唤音效
        this.soundManager.playSummon();
        this.updateButtonStates();
    }

    // ===== 法术卡系统 =====

    /**
     * 使用法术卡 (直接伤害)
     */
    private useSpellCard(): void {
        // 检查阶段
        if (this.turnState.phase !== 'main1' && this.turnState.phase !== 'main2') {
            this.showMessage('只能在主阶段使用法术卡');
            return;
        }
        
        // 检查是否选中了手牌中的法术卡
        if (this.selectedHandIndex >= 0) {
            const card = this.hand[this.selectedHandIndex];
            if (card && card.type === 'spell') {
                this.castSpellFromHand(this.selectedHandIndex);
                return;
            }
        }
        
        // 如果没有选中法术卡，提示用户
        this.showMessage('请先从手牌选择一张法术卡');
    }

    /**
     * 从手牌使用法术卡 (配置化版本)
     */
    private castSpellFromHand(handIndex: number): void {
        const card = this.hand[handIndex];
        if (!card || card.type !== 'spell') return;
        
        const spellConfig = card.spellConfig;
        
        if (spellConfig && spellConfig.effects.length > 0) {
            // 使用配置化效果
            this.executeSpellEffects(spellConfig);
            this.showMessage(`✨ 发动【${card.name}】!`);
        } else {
            // 兼容旧版：使用默认伤害
            const damage = 500;
            const hasEnemyMonsters = this.enemyMonsters.some(m => m !== null);
            
            if (!hasEnemyMonsters) {
                this.dealDamageToEnemy(damage);
                this.showMessage(`🔥 使用【${card.name}】对敌方玩家造成 ${damage} 点伤害!`);
            } else {
                this.applyDamageToFirstEnemy(damage, card.name);
            }
        }
        
        // 从手牌移除
        this.hand.splice(handIndex, 1);
        this.selectedHandIndex = -1;
        this.refreshHandDisplay();
    }

    /**
     * 执行魔法卡配置效果
     */
    private executeSpellEffects(config: SpellCardConfig): void {
        for (const effect of config.effects) {
            switch (effect.type) {
                case 'damage_player':
                    if (effect.target === 'enemy') {
                        this.dealDamageToEnemy(effect.value);
                        this.showMessage(`🔥【${config.name}】对敌方玩家造成 ${effect.value} 点伤害!`);
                    }
                    break;
                    
                case 'damage_monster':
                    if (effect.target === 'enemy') {
                        this.applyDamageToFirstEnemy(effect.value, config.name);
                    }
                    break;
                    
                case 'damage_all_monsters':
                    if (effect.target === 'enemy') {
                        this.applyDamageToAllEnemies(effect.value, config.name);
                    }
                    break;
                    
                case 'heal_player':
                    if (effect.target === 'ally') {
                        this.healPlayer(effect.value);
                        this.showMessage(`💚【${config.name}】恢复了 ${effect.value} 点生命值!`);
                    }
                    break;
                    
                case 'boost_atk':
                    if (effect.target === 'ally') {
                        this.boostAllyAtk(effect.value, config.name);
                    }
                    break;
                    
                case 'boost_def':
                    if (effect.target === 'ally') {
                        this.boostAllyDef(effect.value, config.name);
                    }
                    break;
                    
                case 'destroy_monster':
                    if (effect.target === 'enemy') {
                        this.destroyFirstEnemyMonster(config.name);
                    }
                    break;
            }
        }
    }

    /**
     * 对第一只敌方怪兽造成伤害
     */
    private applyDamageToFirstEnemy(damage: number, spellName: string): void {
        for (let i = 0; i < this.enemyMonsters.length; i++) {
            const monster = this.enemyMonsters[i];
            if (monster) {
                const newHp = Math.max(0, monster.data.hp - damage);
                monster.updateHp(newHp);
                
                if (newHp <= 0) {
                    this.showMessage(`🔥【${spellName}】消灭了【${monster.data.name}】!`);
                    monster.dispose();
                    this.enemyMonsters[i] = null;
                } else {
                    this.showMessage(`🔥【${spellName}】对【${monster.data.name}】造成 ${damage} 点伤害!`);
                }
                break;
            }
        }
    }

    /**
     * 对所有敌方怪兽造成伤害
     */
    private applyDamageToAllEnemies(damage: number, spellName: string): void {
        let destroyedCount = 0;
        let damagedCount = 0;
        
        for (let i = 0; i < this.enemyMonsters.length; i++) {
            const monster = this.enemyMonsters[i];
            if (monster) {
                const newHp = Math.max(0, monster.data.hp - damage);
                monster.updateHp(newHp);
                
                if (newHp <= 0) {
                    destroyedCount++;
                    monster.dispose();
                    this.enemyMonsters[i] = null;
                } else {
                    damagedCount++;
                }
            }
        }
        
        if (destroyedCount > 0) {
            this.showMessage(`🔥【${spellName}】消灭了 ${destroyedCount} 只怪兽!`);
        } else if (damagedCount > 0) {
            this.showMessage(`🔥【${spellName}】对所有怪兽造成了 ${damage} 点伤害!`);
        }
    }

    /**
     * 治疗玩家
     */
    private healPlayer(amount: number): void {
        this.playerState.hp = Math.min(this.playerState.maxHp, this.playerState.hp + amount);
        this.updateHpDisplay();
        console.log(`💚 玩家恢复 ${amount} HP, 当前 HP: ${this.playerState.hp}`);
    }

    /**
     * 增加己方怪兽攻击力
     */
    private boostAllyAtk(amount: number, spellName: string): void {
        let boostedCount = 0;
        for (const monster of this.playerMonsters) {
            if (monster) {
                monster.data.atk += amount;
                boostedCount++;
            }
        }
        if (boostedCount > 0) {
            this.showMessage(`⚔️【${spellName}】提升了 ${boostedCount} 只怪兽的攻击力 +${amount}!`);
        }
    }

    /**
     * 增加己方怪兽防御力
     */
    private boostAllyDef(amount: number, spellName: string): void {
        let boostedCount = 0;
        for (const monster of this.playerMonsters) {
            if (monster) {
                monster.data.def += amount;
                boostedCount++;
            }
        }
        if (boostedCount > 0) {
            this.showMessage(`🛡️【${spellName}】提升了 ${boostedCount} 只怪兽的防御力 +${amount}!`);
        }
    }

    /**
     * 消灭第一只敌方怪兽
     */
    private destroyFirstEnemyMonster(spellName: string): void {
        for (let i = 0; i < this.enemyMonsters.length; i++) {
            const monster = this.enemyMonsters[i];
            if (monster) {
                this.showMessage(`💀【${spellName}】消灭了【${monster.data.name}】!`);
                monster.dispose();
                this.enemyMonsters[i] = null;
                break;
            }
        }
    }

    // ===== 陷阱卡系统 =====

    /**
     * 设置陷阱卡 (从手牌放到魔陷区)
     */
    private setTrapCard(): void {
        if (this.selectedHandIndex < 0) {
            this.showMessage('请先选择一张陷阱卡!');
            return;
        }
        
        const card = this.hand[this.selectedHandIndex];
        if (!card || card.type !== 'trap') {
            this.showMessage('请选择一张陷阱卡!');
            return;
        }
        
        // 找到空的魔陷区槽位
        const emptySlot = this.setTraps.findIndex(t => t === null);
        if (emptySlot === -1) {
            this.showMessage('魔陷区已满!');
            return;
        }
        
        // 设置陷阱
        const trapConfig = card.trapConfig!;
        this.setTraps[emptySlot] = {
            config: trapConfig,
            slotIndex: emptySlot,
            isFaceDown: true
        };
        
        // 🎴 创建 3D 卡牌网格
        this.createTrapMesh(emptySlot, trapConfig.name, true);
        
        // 从手牌移除
        this.hand.splice(this.selectedHandIndex, 1);
        this.selectedHandIndex = -1;
        this.refreshHandDisplay();
        
        this.showMessage(`🔮 设置【${trapConfig.name}】到魔陷区!`);
        console.log(`🔮 陷阱卡设置: ${trapConfig.name} -> 槽位 ${emptySlot}`);
    }
    
    /**
     * 🎴 创建陷阱卡 3D 网格
     * @param slotIndex 魔陷区槽位索引
     * @param cardName 卡牌名称
     * @param isFaceDown 是否背面朝上
     */
    private createTrapMesh(slotIndex: number, cardName: string, isFaceDown: boolean): void {
        // 清理旧网格
        if (this.trapMeshes[slotIndex]) {
            this.trapMeshes[slotIndex]!.dispose();
            this.trapMeshes[slotIndex] = null;
        }
        
        // 获取魔陷区 3D 槽位位置
        const magicTrapSlots = this.arenaRenderer.getPlayerMagicTrapSlots();
        if (!magicTrapSlots[slotIndex]) return;
        
        const slotPos = magicTrapSlots[slotIndex].position;
        
        // 创建卡牌网格 (扁平盒子)
        const cardMesh = MeshBuilder.CreateBox(`trap_card_${slotIndex}`, {
            width: 1.4,
            height: 0.05,
            depth: 2.0
        }, this.scene);
        
        cardMesh.position = new Vector3(slotPos.x, 0.1, slotPos.z);
        cardMesh.parent = this.root;
        
        // 设置材质
        const mat = new StandardMaterial(`trap_mat_${slotIndex}`, this.scene);
        if (isFaceDown) {
            // 背面朝上 (紫色)
            mat.diffuseColor = new Color3(0.4, 0.2, 0.5);
            mat.emissiveColor = new Color3(0.15, 0.08, 0.2);
        } else {
            // 正面朝上 (显示时)
            mat.diffuseColor = new Color3(0.8, 0.3, 0.9);
            mat.emissiveColor = new Color3(0.3, 0.1, 0.35);
        }
        cardMesh.material = mat;
        
        this.trapMeshes[slotIndex] = cardMesh;
        
        console.log(`🎴 陷阱卡网格创建: ${cardName} @ 槽位 ${slotIndex}`);
    }
    
    /**
     * 🎴 翻开陷阱卡 (发动时的视觉效果)
     */
    private flipTrapCard(slotIndex: number): void {
        const cardMesh = this.trapMeshes[slotIndex];
        if (!cardMesh) return;
        
        // 改变材质为正面
        const mat = cardMesh.material as StandardMaterial;
        if (mat) {
            mat.diffuseColor = new Color3(0.8, 0.3, 0.9);
            mat.emissiveColor = new Color3(0.3, 0.1, 0.35);
        }
        
        // 简单的翻转动画 (抬高)
        cardMesh.position.y = 0.5;
        setTimeout(() => {
            if (cardMesh) cardMesh.position.y = 0.1;
        }, 500);
    }
    
    /**
     * 🎴 移除陷阱卡网格 (发动后送入墓地)
     */
    private removeTrapMesh(slotIndex: number): void {
        if (this.trapMeshes[slotIndex]) {
            this.trapMeshes[slotIndex]!.dispose();
            this.trapMeshes[slotIndex] = null;
        }
    }

    /**
     * 检查并触发陷阱卡 (当敌方攻击时)
     * @returns true 如果有陷阱发动并阻止攻击
     */
    private checkTrapOnAttack(attackerSlot: number): boolean {
        for (let i = 0; i < this.setTraps.length; i++) {
            const trap = this.setTraps[i];
            if (trap && trap.config.trigger === 'on_attack') {
                // 🎴 翻开陷阱卡动画
                this.flipTrapCard(i);
                
                // 发动陷阱
                this.showMessage(`⚡ 发动陷阱【${trap.config.name}】!`);
                // 🔊 播放陷阱触发音效
                this.soundManager.playTrap();
                
                const result = this.executeTrapEffects(trap.config, attackerSlot);
                
                // 🎴 移除陷阱卡网格
                setTimeout(() => this.removeTrapMesh(i), 800);
                
                // 陷阱用完送入墓地
                this.setTraps[i] = null;
                this.graveyard.push({
                    id: `trap_used_${Date.now()}`,
                    name: trap.config.name,
                    type: 'trap',
                    effect: trap.config.description,
                    trapConfig: trap.config
                });
                
                return result.negateAttack;
            }
        }
        return false;
    }

    /**
     * 执行陷阱卡效果
     */
    private executeTrapEffects(config: TrapCardConfig, triggerSlot: number): { negateAttack: boolean } {
        let negateAttack = false;
        
        for (const effect of config.effects) {
            switch (effect.type) {
                case 'negate_attack':
                    negateAttack = true;
                    this.showMessage(`🛡️【${config.name}】无效化了攻击!`);
                    break;
                    
                case 'destroy_attacker':
                    // 消灭攻击怪兽
                    const attacker = this.enemyMonsters[triggerSlot];
                    if (attacker) {
                        this.showMessage(`💀【${config.name}】消灭了【${attacker.data.name}】!`);
                        attacker.dispose();
                        this.enemyMonsters[triggerSlot] = null;
                    }
                    negateAttack = true;
                    break;
                    
                case 'reflect_damage':
                    // 反弹伤害
                    const reflectMonster = this.enemyMonsters[triggerSlot];
                    if (reflectMonster) {
                        const reflectDamage = Math.floor(reflectMonster.data.atk * effect.value / 100);
                        this.dealDamageToEnemy(reflectDamage);
                        this.showMessage(`🔄【${config.name}】反弹了 ${reflectDamage} 伤害!`);
                    }
                    break;
                    
                case 'damage_enemy':
                    this.dealDamageToEnemy(effect.value);
                    this.showMessage(`⚡【${config.name}】对敌方造成 ${effect.value} 伤害!`);
                    break;
            }
        }
        
        return { negateAttack };
    }

    /**
     * 获取已设置的陷阱数量
     */
    private getSetTrapCount(): number {
        return this.setTraps.filter(t => t !== null).length;
    }

    /**
     * 施放直接伤害法术 (对玩家) - 兼容旧版
     */
    private castDirectDamageSpell(): void {
        const damage = 500;
        this.dealDamageToEnemy(damage);
        this.showMessage(`🔥 使用【火球术】对敌方玩家造成 ${damage} 点伤害!`);
    }

    /**
     * 施放怪兽伤害法术
     */
    private castMonsterDamageSpell(): void {
        const damage = 300;
        // 找到第一个敌方怪兽
        for (let i = 0; i < this.enemyMonsters.length; i++) {
            const monster = this.enemyMonsters[i];
            if (monster) {
                const oldHp = monster.data.hp;
                const newHp = Math.max(0, oldHp - damage);
                monster.updateHp(newHp);
                
                if (newHp <= 0) {
                    // 怪兽被消灭
                    this.showMessage(`🔥 使用【雷击术】消灭了【${monster.data.name}】!`);
                    monster.dispose();
                    this.enemyMonsters[i] = null;
                } else {
                    this.showMessage(`🔥 使用【雷击术】对【${monster.data.name}】造成 ${damage} 点伤害!`);
                }
                break;
            }
        }
    }

    public showMessage(msg: string): void {
        if (this.messageLabel) {
            this.messageLabel.text = msg;
        }
    }

    // ===== HP 系统 =====

    /**
     * 创建 HP 血条 UI
     */
    private createHpBars(isLandscape: boolean): void {
        const barWidth = isLandscape ? 150 : 180;
        const barHeight = isLandscape ? 18 : 22;
        
        // ===== 敌方 HP (左上角) =====
        const enemyHpContainer = new Rectangle('enemyHpContainer');
        enemyHpContainer.width = `${barWidth + 10}px`;
        enemyHpContainer.height = `${barHeight + 25}px`;
        enemyHpContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        enemyHpContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        enemyHpContainer.left = '10px';
        enemyHpContainer.top = isLandscape ? '70px' : '90px';
        enemyHpContainer.background = '#00000088';
        enemyHpContainer.cornerRadius = 5;
        enemyHpContainer.thickness = 0;
        this.ui.addControl(enemyHpContainer);
        
        this.enemyHpLabel = new TextBlock('enemyHpLabel');
        this.enemyHpLabel.text = `敌人: ${this.enemyState.hp}/${this.enemyState.maxHp}`;
        this.enemyHpLabel.color = '#FF6666';
        this.enemyHpLabel.fontSize = isLandscape ? 12 : 14;
        this.enemyHpLabel.top = '-5px';
        this.enemyHpLabel.height = '18px';
        enemyHpContainer.addControl(this.enemyHpLabel);
        
        const enemyHpBg = new Rectangle('enemyHpBg');
        enemyHpBg.width = `${barWidth}px`;
        enemyHpBg.height = `${barHeight}px`;
        enemyHpBg.top = '12px';
        enemyHpBg.background = '#333333';
        enemyHpBg.thickness = 1;
        enemyHpBg.color = '#666666';
        enemyHpContainer.addControl(enemyHpBg);
        
        this.enemyHpBar = new Rectangle('enemyHpBar');
        this.enemyHpBar.width = `${barWidth - 4}px`;
        this.enemyHpBar.height = `${barHeight - 4}px`;
        this.enemyHpBar.top = '12px';
        this.enemyHpBar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.enemyHpBar.left = '2px';
        this.enemyHpBar.background = '#FF4444';
        this.enemyHpBar.thickness = 0;
        enemyHpContainer.addControl(this.enemyHpBar);
        
        // ===== 玩家 HP (右下角) =====
        const playerHpContainer = new Rectangle('playerHpContainer');
        playerHpContainer.width = `${barWidth + 10}px`;
        playerHpContainer.height = `${barHeight + 25}px`;
        playerHpContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        playerHpContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        playerHpContainer.left = '-10px';
        playerHpContainer.top = isLandscape ? '-70px' : '-90px';
        playerHpContainer.background = '#00000088';
        playerHpContainer.cornerRadius = 5;
        playerHpContainer.thickness = 0;
        this.ui.addControl(playerHpContainer);
        
        this.playerHpLabel = new TextBlock('playerHpLabel');
        this.playerHpLabel.text = `玩家: ${this.playerState.hp}/${this.playerState.maxHp}`;
        this.playerHpLabel.color = '#66FF66';
        this.playerHpLabel.fontSize = isLandscape ? 12 : 14;
        this.playerHpLabel.top = '-5px';
        this.playerHpLabel.height = '18px';
        playerHpContainer.addControl(this.playerHpLabel);
        
        const playerHpBg = new Rectangle('playerHpBg');
        playerHpBg.width = `${barWidth}px`;
        playerHpBg.height = `${barHeight}px`;
        playerHpBg.top = '12px';
        playerHpBg.background = '#333333';
        playerHpBg.thickness = 1;
        playerHpBg.color = '#666666';
        playerHpContainer.addControl(playerHpBg);
        
        this.playerHpBar = new Rectangle('playerHpBar');
        this.playerHpBar.width = `${barWidth - 4}px`;
        this.playerHpBar.height = `${barHeight - 4}px`;
        this.playerHpBar.top = '12px';
        this.playerHpBar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.playerHpBar.left = '2px';
        this.playerHpBar.background = '#44FF44';
        this.playerHpBar.thickness = 0;
        playerHpContainer.addControl(this.playerHpBar);
        
        // ===== 卡组/墓地数量显示 (右下角) =====
        const deckContainer = new Rectangle('deckContainer');
        deckContainer.width = '100px';
        deckContainer.height = '50px';
        deckContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        deckContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        deckContainer.left = '-10px';  // 使用负值实现右偏移
        deckContainer.top = isLandscape ? '-130px' : '-160px';
        deckContainer.background = '#00000088';
        deckContainer.cornerRadius = 5;
        deckContainer.thickness = 0;
        this.ui.addControl(deckContainer);
        
        this.deckCountLabel = new TextBlock('deckCount');
        this.deckCountLabel.text = `卡组: ${this.deck.length}`;
        this.deckCountLabel.color = '#00BFFF';
        this.deckCountLabel.fontSize = isLandscape ? 14 : 16;
        this.deckCountLabel.top = '-8px';
        deckContainer.addControl(this.deckCountLabel);
        
        const graveyardLabel = new TextBlock('graveyardCount');
        graveyardLabel.text = `墓地: ${this.graveyard.length}`;
        graveyardLabel.color = '#9966CC';
        graveyardLabel.fontSize = isLandscape ? 12 : 14;
        graveyardLabel.top = '12px';
        deckContainer.addControl(graveyardLabel);
    }

    /**
     * 更新 HP 显示
     */
    private updateHpDisplay(): void {
        const barWidth = this.orientation === 'landscape' ? 146 : 176;
        
        // 更新玩家 HP
        if (this.playerHpLabel) {
            this.playerHpLabel.text = `玩家: ${this.playerState.hp}/${this.playerState.maxHp}`;
        }
        if (this.playerHpBar) {
            const ratio = this.playerState.hp / this.playerState.maxHp;
            this.playerHpBar.width = `${Math.max(0, barWidth * ratio)}px`;
            // 低血量变色
            if (ratio < 0.25) {
                this.playerHpBar.background = '#FF4444';
            } else if (ratio < 0.5) {
                this.playerHpBar.background = '#FFAA44';
            } else {
                this.playerHpBar.background = '#44FF44';
            }
        }
        
        // 更新敌方 HP
        if (this.enemyHpLabel) {
            this.enemyHpLabel.text = `敌人: ${this.enemyState.hp}/${this.enemyState.maxHp}`;
        }
        if (this.enemyHpBar) {
            const ratio = this.enemyState.hp / this.enemyState.maxHp;
            this.enemyHpBar.width = `${Math.max(0, barWidth * ratio)}px`;
        }
    }

    /**
     * 对敌方玩家造成伤害
     */
    private dealDamageToEnemy(damage: number): void {
        this.enemyState.hp = Math.max(0, this.enemyState.hp - damage);
        this.updateHpDisplay();
        console.log(`⚡ 敌方受到 ${damage} 伤害, 剩余 HP: ${this.enemyState.hp}`);
        
        this.checkVictoryCondition();
    }

    /**
     * 对玩家造成伤害
     */
    private dealDamageToPlayer(damage: number): void {
        this.playerState.hp = Math.max(0, this.playerState.hp - damage);
        this.updateHpDisplay();
        console.log(`💔 玩家受到 ${damage} 伤害, 剩余 HP: ${this.playerState.hp}`);
        
        this.checkDefeatCondition();
    }
    
    /**
     * 检查胜利条件
     */
    private checkVictoryCondition(): void {
        // 条件1: 敌方 HP 归零
        if (this.enemyState.hp <= 0) {
            setTimeout(() => {
                this.showBattleResult(true, '敌方生命值归零!');
            }, 500);
            return;
        }
        
        // 条件2: 敌方所有怪兽被消灭 (如果玩家有怪兽)
        const enemyMonsterCount = this.enemyMonsters.filter(m => m !== null).length;
        const playerMonsterCount = this.playerMonsters.filter(m => m !== null).length;
        
        if (enemyMonsterCount === 0 && playerMonsterCount > 0 && this.turnState.turnNumber > 1) {
            // 敌方无怪兽，检查是否可以再生成
            // 暂时不作为胜利条件，允许敌方在其回合再召唤
        }
    }
    
    /**
     * 检查失败条件
     */
    private checkDefeatCondition(): void {
        // 条件1: 玩家 HP 归零
        if (this.playerState.hp <= 0) {
            setTimeout(() => {
                this.showBattleResult(false, '生命值归零!');
            }, 500);
            return;
        }
    }
    
    /**
     * 显示战斗结果
     */
    private showBattleResult(victory: boolean, reason: string): void {
        const resultText = victory ? '🎉 胜利!' : '💀 失败!';
        this.showMessage(`${resultText} ${reason}`);
        
        // 🔊 播放胜利/失败音效
        if (victory) {
            this.soundManager.playVictory();
        } else {
            this.soundManager.playDefeat();
        }
        
        // 延迟结束，让玩家看到结果
        setTimeout(() => this.end(victory), 2500);
    }

    // ===== 手牌系统 =====

    /**
     * 初始化卡组
     * 创建40张卡组 (怪兽卡+魔法卡)
     */
    private initializeDeck(): void {
        this.deck = [];
        this.graveyard = [];
        let cardId = 1;
        
        // 怪兽卡 (25张)
        const monsterTemplates: Omit<HandCard, 'id'>[] = [
            // 低级怪兽 (1-4星，可直接召唤)
            { name: '火焰战士', type: 'monster', level: 4, attribute: 'fire', atk: 1500, def: 1200 },
            { name: '水元素', type: 'monster', level: 3, attribute: 'water', atk: 1200, def: 1400 },
            { name: '风之精灵', type: 'monster', level: 2, attribute: 'wind', atk: 1000, def: 800 },
            { name: '大地守护者', type: 'monster', level: 4, attribute: 'earth', atk: 1400, def: 1600 },
            { name: '光明骑士', type: 'monster', level: 4, attribute: 'light', atk: 1600, def: 1000 },
            { name: '暗影潜行者', type: 'monster', level: 3, attribute: 'dark', atk: 1300, def: 900 },
            { name: '烈焰魔导师', type: 'monster', level: 4, attribute: 'fire', atk: 1700, def: 800 },
            { name: '海洋之子', type: 'monster', level: 2, attribute: 'water', atk: 800, def: 1200 },
            // 高级怪兽 (5-6星，需1祭品)
            { name: '暗黑骑士', type: 'monster', level: 5, attribute: 'dark', atk: 2000, def: 1500 },
            { name: '炎龙', type: 'monster', level: 5, attribute: 'fire', atk: 2100, def: 1200 },
            { name: '冰霜女王', type: 'monster', level: 6, attribute: 'water', atk: 2300, def: 1800 },
            // 最高级怪兽 (7+星，需2祭品)
            { name: '神圣天使', type: 'monster', level: 7, attribute: 'light', atk: 2800, def: 2000 },
            { name: '暗黑魔龙', type: 'monster', level: 8, attribute: 'dark', atk: 3000, def: 2500 },
        ];
        
        // 每种怪兽模板添加1-3张到卡组
        for (const template of monsterTemplates) {
            const count = template.level && template.level >= 7 ? 1 : (template.level && template.level >= 5 ? 2 : 2);
            for (let i = 0; i < count; i++) {
                this.deck.push({ ...template, id: `deck_${cardId++}` });
            }
        }
        
        // 魔法卡 (15张)
        const spellIds = ['spell_fireball', 'spell_lightning', 'spell_meteor', 'spell_heal', 'spell_power_boost', 'spell_dark_hole'];
        for (const spellId of spellIds) {
            const card = createSpellHandCard(spellId, `deck_${cardId++}`);
            if (card) {
                this.deck.push(card);
                // 部分魔法卡加2张
                if (spellId === 'spell_fireball' || spellId === 'spell_heal') {
                    const card2 = createSpellHandCard(spellId, `deck_${cardId++}`);
                    if (card2) this.deck.push(card2);
                }
            }
        }
        
        // 陷阱卡 (5张)
        const trapIds = ['trap_mirror_force', 'trap_magic_cylinder', 'trap_trap_hole', 'trap_negate_attack', 'trap_damage_wall'];
        for (const trapId of trapIds) {
            const card = createTrapHandCard(trapId, `deck_${cardId++}`);
            if (card) {
                this.deck.push(card);
            }
        }
        
        // 洗牌
        this.shuffleDeck();
        
        console.log(`🃏 卡组初始化完成: ${this.deck.length} 张卡`);
    }

    /**
     * 洗牌
     */
    private shuffleDeck(): void {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    /**
     * 抽牌
     * @param count 抽取数量
     * @returns 是否成功抽牌 (卡组为空返回false)
     */
    private drawCards(count: number = 1): boolean {
        for (let i = 0; i < count; i++) {
            if (this.deck.length === 0) {
                // 卡组抽完，判负
                this.showMessage('💀 卡组已空! 无法抽牌!');
                return false;
            }
            
            // 检查手牌上限 (10张)
            if (this.hand.length >= 10) {
                this.showMessage('⚠️ 手牌已满!');
                break;
            }
            
            const card = this.deck.pop()!;
            this.hand.push(card);
            this.showMessage(`🎴 抽到【${card.name}】!`);
            // 🔊 播放抽卡音效
            this.soundManager.playDraw();
        }
        
        this.updateDeckCountDisplay();
        this.refreshHandDisplay();
        return true;
    }

    /**
     * 更新卡组剩余数量显示
     */
    private updateDeckCountDisplay(): void {
        if (this.deckCountLabel) {
            this.deckCountLabel.text = `卡组: ${this.deck.length}`;
        }
    }

    /**
     * 将卡牌送入墓地
     */
    private sendToGraveyard(card: HandCard): void {
        this.graveyard.push(card);
        console.log(`⚰️ 【${card.name}】送入墓地, 墓地: ${this.graveyard.length}张`);
    }

    /**
     * 初始化手牌 (从卡组抽5张)
     */
    private initializeHand(): void {
        // 先初始化卡组
        this.initializeDeck();
        
        // 抽取初始5张手牌
        this.hand = [];
        this.selectedHandIndex = -1;
        this.drawCards(5);
    }

    /**
     * 创建手牌面板 UI
     */
    private createHandPanel(isLandscape: boolean): void {
        // 手牌容器
        this.handPanel = new StackPanel('handPanel');
        this.handPanel.isVertical = false;
        this.handPanel.height = isLandscape ? '60px' : '70px';
        this.handPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.handPanel.top = isLandscape ? '-60px' : '-75px';
        this.ui.addControl(this.handPanel);
        
        this.refreshHandDisplay();
    }

    /**
     * 刷新手牌显示
     */
    private refreshHandDisplay(): void {
        if (!this.handPanel) return;
        
        // 清空现有手牌
        this.handPanel.clearControls();
        
        const isLandscape = this.orientation === 'landscape';
        const cardWidth = isLandscape ? '70px' : '80px';
        const cardHeight = isLandscape ? '50px' : '60px';
        
        this.hand.forEach((card, index) => {
            const cardBtn = Button.CreateSimpleButton(`hand_${index}`, card.name);
            cardBtn.width = cardWidth;
            cardBtn.height = cardHeight;
            cardBtn.color = 'white';
            cardBtn.fontSize = isLandscape ? 10 : 12;
            cardBtn.paddingLeft = '3px';
            cardBtn.paddingRight = '3px';
            
            // 根据卡牌类型设置颜色
            if (card.type === 'monster') {
                cardBtn.background = this.selectedHandIndex === index ? '#8B4513' : '#CD853F';
            } else if (card.type === 'spell') {
                cardBtn.background = this.selectedHandIndex === index ? '#2E8B57' : '#3CB371';
            } else {
                cardBtn.background = this.selectedHandIndex === index ? '#8B008B' : '#9932CC';
            }
            
            cardBtn.onPointerClickObservable.add(() => {
                this.onHandCardClick(index);
            });
            
            this.handPanel!.addControl(cardBtn);
        });
    }

    /**
     * 手牌点击
     */
    private onHandCardClick(index: number): void {
        const card = this.hand[index];
        if (!card) return;
        
        // 如果已选中则取消
        if (this.selectedHandIndex === index) {
            this.selectedHandIndex = -1;
            this.showMessage('取消选择');
            this.refreshHandDisplay();
            return;
        }
        
        // 选中卡牌
        this.selectedHandIndex = index;
        
        if (card.type === 'monster') {
            this.showMessage(`选中【${card.name}】Lv.${card.level} ATK:${card.atk} DEF:${card.def} - 点击召唤按钮使用`);
        } else if (card.type === 'spell') {
            this.showMessage(`选中【${card.name}】- ${card.effect} - 点击法术卡按钮使用`);
        }
        
        this.refreshHandDisplay();
    }

    /**
     * 从手牌召唤怪兽
     */
    private summonFromHand(): boolean {
        if (this.selectedHandIndex < 0) {
            this.showMessage('请先从手牌选择一张怪兽卡');
            return false;
        }
        
        const card = this.hand[this.selectedHandIndex];
        if (!card || card.type !== 'monster') {
            this.showMessage('请选择怪兽卡');
            return false;
        }
        
        const level = card.level || 1;
        
        // 🌟 使用 WASM 验证普通召唤 (4星及以下)
        if (level <= 4) {
            const validation = cl_validateNormalSummon(level, this.turnState.normalSummonUsed);
            if (!validation.valid) {
                this.showMessage(validation.error || '无法普通召唤');
                return false;
            }
            
            // 找到空槽位
            const emptySlot = this.playerMonsters.findIndex(m => m === null);
            if (emptySlot === -1) {
                this.showMessage('怪兽区已满');
                return false;
            }
            
            // 创建怪兽数据
            const monsterData: MonsterDisplayData = {
                id: card.id,
                name: card.name,
                attribute: card.attribute || 'none',
                atk: card.atk || 1000,
                def: card.def || 1000,
                hp: card.atk || 1000,
                maxHp: card.atk || 1000,
                position: 'attack'
            };
            
            // 召唤
            this.summonPlayerMonster(emptySlot, monsterData);
            
            // 从手牌移除
            this.hand.splice(this.selectedHandIndex, 1);
            this.selectedHandIndex = -1;
            this.refreshHandDisplay();
            
            // 标记已使用通常召唤
            this.turnState.normalSummonUsed = true;
            this.updateButtonStates();
            
            this.showMessage(`召唤【${card.name}】成功!`);
            // 🔊 播放召唤音效
            this.soundManager.playSummon();
            return true;
        }
        
        // 🌟 5星及以上需要祭品召唤
        const requiredTributes = level >= 7 ? 2 : 1;
        const availableTributes = this.playerMonsters.filter(m => m !== null).length;
        
        if (availableTributes < requiredTributes) {
            this.showMessage(`${level}星怪兽需要 ${requiredTributes} 个祭品，场上只有 ${availableTributes} 只怪兽`);
            return false;
        }
        
        // 构建祭品召唤目标
        const targetMonster: TributeSummonTarget = {
            name: card.name,
            level: level,
            attribute: card.attribute || 'none',
            atk: card.atk || 2000,
            def: card.def || 2000,
            requiredTributes
        };
        
        // 保存当前手牌索引用于召唤完成后移除
        this.pendingTributeCardIndex = this.selectedHandIndex;
        
        this.showMessage(`选择 ${requiredTributes} 个祭品召唤【${card.name}】`);
        
        // 启动祭品召唤系统
        this.tributeSystem?.setPlayerMonsters(this.playerMonsters);
        this.tributeSystem?.startTributeSummon(targetMonster);
        
        return true;
    }
    
    /** 待祭品召唤的手牌索引 */
    private pendingTributeCardIndex: number = -1;

    // ===== 回合阶段系统 =====

    /**
     * 推进到下一阶段
     */
    private advancePhase(): void {
        const phases: TurnPhase[] = ['draw', 'main1', 'battle', 'main2', 'end'];
        const currentIndex = phases.indexOf(this.turnState.phase);
        
        if (currentIndex < phases.length - 1) {
            // 进入下一阶段
            this.turnState.phase = phases[currentIndex + 1];
            this.onPhaseChange();
        } else {
            // 结束回合，切换玩家
            this.endTurn();
        }
    }

    /**
     * 结束当前回合
     */
    private endTurn(): void {
        // 切换回合
        this.turnState.isPlayerTurn = !this.turnState.isPlayerTurn;
        
        if (this.turnState.isPlayerTurn) {
            this.turnState.turnNumber++;
        }
        
        // 重置回合状态
        this.turnState.phase = 'draw';
        this.turnState.normalSummonUsed = false;
        this.turnState.attackedSlots = [];
        
        // 更新UI
        this.onPhaseChange();
        
        // AI回合自动执行
        if (!this.turnState.isPlayerTurn) {
            this.showMessage('敌方回合');
            setTimeout(() => this.executeEnemyTurn(), 1000);
        }
    }

    /**
     * 阶段变化时的处理
     */
    private onPhaseChange(): void {
        // 🔊 播放阶段转换音效
        this.soundManager.playPhase();
        
        // 抽牌阶段处理 - 抽1张卡
        if (this.turnState.phase === 'draw' && this.turnState.isPlayerTurn) {
            // 第一回合不抽牌 (已有初始5张)
            if (this.turnState.turnNumber > 1) {
                const success = this.drawCards(1);
                if (!success) {
                    // 无法抽牌，判负
                    setTimeout(() => {
                        this.showMessage('💀 卡组耗尽! 你输了!');
                        setTimeout(() => this.end(false), 2000);
                    }, 500);
                    return;
                }
            }
        }
        
        // 更新UI显示
        if (this.turnLabel) {
            const turnText = this.turnState.isPlayerTurn ? '我方回合' : '敌方回合';
            this.turnLabel.text = `第 ${this.turnState.turnNumber} 回合 - ${turnText}`;
        }
        
        if (this.phaseLabel) {
            this.phaseLabel.text = `【${PHASE_NAMES[this.turnState.phase]}】`;
            
            // 不同阶段用不同颜色
            switch (this.turnState.phase) {
                case 'draw':
                    this.phaseLabel.color = '#00BFFF';
                    break;
                case 'main1':
                case 'main2':
                    this.phaseLabel.color = '#00FF88';
                    break;
                case 'battle':
                    this.phaseLabel.color = '#FF6600';
                    break;
                case 'end':
                    this.phaseLabel.color = '#AAAAAA';
                    break;
            }
        }
        
        // 更新按钮状态
        this.updateButtonStates();
        
        // 显示阶段提示
        this.showMessage(PHASE_NAMES[this.turnState.phase]);
        
        console.log(`📌 阶段变化: ${PHASE_NAMES[this.turnState.phase]}`);
    }

    /**
     * 更新按钮可用状态
     */
    private updateButtonStates(): void {
        const isPlayerTurn = this.turnState.isPlayerTurn;
        const phase = this.turnState.phase;
        
        // 召唤按钮: 主阶段 + 未使用通常召唤
        if (this.summonBtn) {
            const canSummon = isPlayerTurn && 
                (phase === 'main1' || phase === 'main2') && 
                !this.turnState.normalSummonUsed;
            this.summonBtn.isEnabled = canSummon;
            this.summonBtn.background = canSummon ? '#4CAF50' : '#666666';
        }
        
        // 攻击按钮: 战斗阶段
        if (this.attackBtn) {
            const canAttack = isPlayerTurn && phase === 'battle';
            this.attackBtn.isEnabled = canAttack;
            this.attackBtn.background = canAttack ? '#FF5722' : '#666666';
        }
        
        // 阶段转换按钮
        if (this.phaseBtn) {
            this.phaseBtn.isEnabled = isPlayerTurn;
            this.phaseBtn.background = isPlayerTurn ? '#2196F3' : '#666666';
            
            // 更新按钮文字
            if (phase === 'end') {
                this.phaseBtn.textBlock!.text = '结束回合';
            } else {
                this.phaseBtn.textBlock!.text = '下一阶段';
            }
        }
        
        // 祭品召唤按钮: 主阶段 + 有怪兽可作为祭品
        if (this.tributeBtn) {
            const hasMonsters = this.playerMonsters.some(m => m !== null);
            const canTribute = isPlayerTurn && 
                (phase === 'main1' || phase === 'main2') && 
                hasMonsters;
            this.tributeBtn.isEnabled = canTribute;
            this.tributeBtn.background = canTribute ? '#9b59b6' : '#666666';
        }

        // 法术卡按钮: 主阶段可用
        if (this.spellBtn) {
            const canSpell = isPlayerTurn && (phase === 'main1' || phase === 'main2');
            this.spellBtn.isEnabled = canSpell;
            this.spellBtn.background = canSpell ? '#3498db' : '#666666';
        }
        
        // 陷阱设置按钮: 主阶段可用 + 手牌有陷阱卡
        if (this.trapBtn) {
            const hasTrapInHand = this.hand.some(c => c.type === 'trap');
            const hasEmptyTrapSlot = this.setTraps.some(t => t === null);
            const canSetTrap = isPlayerTurn && 
                (phase === 'main1' || phase === 'main2') && 
                hasTrapInHand && 
                hasEmptyTrapSlot;
            this.trapBtn.isEnabled = canSetTrap;
            this.trapBtn.background = canSetTrap ? '#9932CC' : '#666666';
        }
        
        // 直接攻击按钮: 战斗阶段 + 没有敌方怪兽 + 有己方怪兽
        if (this.directAttackBtn) {
            const hasEnemyMonsters = this.enemyMonsters.some(m => m !== null);
            const hasPlayerMonsters = this.playerMonsters.some(m => m !== null);
            const hasAvailableAttackers = this.playerMonsters.some(
                (m, i) => m !== null && !this.turnState.attackedSlots.includes(i)
            );
            
            const canDirectAttack = isPlayerTurn && 
                phase === 'battle' && 
                !hasEnemyMonsters && 
                hasPlayerMonsters &&
                hasAvailableAttackers;
            
            this.directAttackBtn.isEnabled = canDirectAttack;
            this.directAttackBtn.background = canDirectAttack ? '#e74c3c' : '#666666';
            // 如果有敌方怪兽，隐藏按钮以减少混乱
            this.directAttackBtn.isVisible = !hasEnemyMonsters || !isPlayerTurn;
        }
        
        // 攻守切换按钮: 主阶段可用 + 有己方怪兽
        if (this.positionBtn) {
            const hasPlayerMonsters = this.playerMonsters.some(m => m !== null);
            const canToggle = isPlayerTurn && 
                (phase === 'main1' || phase === 'main2') &&
                hasPlayerMonsters;
            this.positionBtn.isEnabled = canToggle;
            this.positionBtn.background = canToggle ? '#1abc9c' : '#666666';
        }
    }

    // ===== 怪兽表示系统 =====

    /**
     * 点击怪兽选择它 (用于切换表示等操作)
     */
    private selectPlayerMonster(slot: number): void {
        // 取消之前的选择
        if (this.selectedMonsterSlot >= 0) {
            const prevMonster = this.playerMonsters[this.selectedMonsterSlot];
            prevMonster?.setHighlight(false);
        }
        
        // 选择新的怪兽
        this.selectedMonsterSlot = slot;
        const monster = this.playerMonsters[slot];
        if (monster) {
            monster.setHighlight(true, new Color3(0, 1, 1));  // 青色高亮
            this.showMessage(`选择了【${monster.data.name}】`);
        }
        
        this.updateButtonStates();
    }

    /**
     * 切换选中怪兽的攻守表示
     */
    private toggleMonsterPosition(): void {
        // 检查阶段
        if (this.turnState.phase !== 'main1' && this.turnState.phase !== 'main2') {
            this.showMessage('只能在主阶段切换表示');
            return;
        }
        
        // 如果没有选中怪兽，自动选择第一个可用的
        if (this.selectedMonsterSlot < 0) {
            const firstSlot = this.playerMonsters.findIndex(m => m !== null);
            if (firstSlot < 0) {
                this.showMessage('没有怪兽可以切换表示');
                return;
            }
            this.selectPlayerMonster(firstSlot);
        }
        
        const monster = this.playerMonsters[this.selectedMonsterSlot];
        if (!monster) {
            this.showMessage('请先选择要切换表示的怪兽');
            return;
        }
        
        // 切换表示
        const newPosition = monster.togglePosition();
        const positionName = newPosition === 'attack' ? '攻击表示' : '守备表示';
        this.showMessage(`【${monster.data.name}】切换为${positionName}`);
        
        console.log(`🔄 ${monster.data.name} -> ${positionName}`);
    }

    /**
     * 设置怪兽为守备表示召唤 (里侧守备)
     */
    private summonInDefensePosition(slot: number): void {
        const monster = this.playerMonsters[slot];
        if (monster) {
            monster.setPosition('defense');
        }
    }

    // ===== 攻击系统 =====

    /**
     * 处理攻击按钮点击
     */
    private handleAttackClick(): void {
        if (this.turnState.phase !== 'battle') {
            this.showMessage('只能在战斗阶段攻击');
            return;
        }
        
        // 找到可以攻击的怪兽 (攻击表示且本回合未攻击)
        const availableSlots = this.playerMonsters
            .map((m, i) => m ? { slot: i, monster: m } : null)
            .filter(e => e !== null 
                && !this.turnState.attackedSlots.includes(e!.slot)
                && e!.monster.data.position === 'attack')  // 只有攻击表示能攻击
            .map(e => e!.slot);
        
        if (availableSlots.length === 0) {
            this.showMessage('没有可攻击的怪兽 (守备表示无法攻击)');
            return;
        }
        
        // 选择第一个可用的怪兽进行攻击
        this.attackingSlot = availableSlots[0];
        const attacker = this.playerMonsters[this.attackingSlot];
        
        // 检查是否有敌方怪兽
        const hasEnemies = this.enemyMonsters.some(m => m !== null);
        
        if (!hasEnemies) {
            // 没有敌方怪兽，直接攻击玩家
            this.executeDirectAttack(this.attackingSlot);
            return;
        }
        
        // 进入目标选择模式
        this.startTargetSelection(attacker?.data.name || '怪兽');
    }
    
    /**
     * 尝试直接攻击 (玩家点击直接攻击按钮)
     * 检查条件并让玩家选择攻击怪兽
     */
    private tryDirectAttack(): void {
        // 检查是否在战斗阶段
        if (this.turnState.phase !== 'battle') {
            this.showMessage('只能在战斗阶段进行直接攻击！');
            return;
        }
        
        // 检查敌方是否有怪兽
        const hasEnemyMonsters = this.enemyMonsters.some(m => m !== null);
        if (hasEnemyMonsters) {
            this.showMessage('敌方有怪兽时不能直接攻击！');
            return;
        }
        
        // 寻找可攻击的己方怪兽
        const availableAttackers: number[] = [];
        this.playerMonsters.forEach((m, i) => {
            if (m && !this.turnState.attackedSlots.includes(i)) {
                availableAttackers.push(i);
            }
        });
        
        if (availableAttackers.length === 0) {
            this.showMessage('没有可以攻击的怪兽！');
            return;
        }
        
        // 如果只有一只怪兽，直接攻击
        if (availableAttackers.length === 1) {
            this.executeDirectAttack(availableAttackers[0]);
            return;
        }
        
        // 多只怪兽，让玩家选择
        this.startDirectAttackSelection(availableAttackers);
    }
    
    /**
     * 开始直接攻击选择模式
     */
    private startDirectAttackSelection(availableSlots: number[]): void {
        this.showMessage('点击选择进行直接攻击的怪兽');
        
        // 高亮可攻击的怪兽
        availableSlots.forEach(slot => {
            const monster = this.playerMonsters[slot];
            if (monster) {
                monster.setHighlight(true, new Color3(0, 1, 0));
            }
        });
        
        // 设置点击监听
        const selectObserver = this.scene.onPointerObservable.add((info) => {
            if (info.type === PointerEventTypes.POINTERDOWN) {
                const pickedMesh = info.pickInfo?.pickedMesh;
                
                // 查找点击的怪兽
                for (const slot of availableSlots) {
                    const monster = this.playerMonsters[slot];
                    if (monster && pickedMesh && monster.mesh === pickedMesh) {
                        // 移除高亮
                        availableSlots.forEach(s => {
                            this.playerMonsters[s]?.setHighlight(false);
                        });
                        
                        // 移除监听
                        this.scene.onPointerObservable.remove(selectObserver);
                        
                        // 执行直接攻击
                        this.executeDirectAttack(slot);
                        return;
                    }
                }
            }
        });
    }

    /**
     * 执行直接攻击 (攻击敌方玩家)
     */
    private executeDirectAttack(attackerSlot: number): void {
        const attacker = this.playerMonsters[attackerSlot];
        if (!attacker) return;
        
        const damage = attacker.data.atk;
        this.showMessage(`【${attacker.data.name}】直接攻击! 造成 ${damage} 伤害!`);
        this.dealDamageToEnemy(damage);
        
        // 标记已攻击
        this.turnState.attackedSlots.push(attackerSlot);
        this.attackingSlot = -1;
    }
    
    /**
     * 开始目标选择模式
     */
    private startTargetSelection(attackerName: string): void {
        this.isSelectingTarget = true;
        this.showMessage(`点击选择 ${attackerName} 的攻击目标 (或点击空白自动选择)`);
        
        // 高亮敌方怪兽
        this.enemyMonsters.forEach(monster => {
            if (monster) {
                monster.setHighlight(true, new Color3(1, 0.5, 0));
            }
        });
        
        // 设置点击事件
        this.targetPointerObserver = this.scene.onPointerObservable.add((info) => {
            if (info.type === PointerEventTypes.POINTERDOWN) {
                this.onTargetClick(info);
            }
        });
    }
    
    /**
     * 目标点击处理
     */
    private onTargetClick(info: PointerInfo): void {
        const pickedMesh = info.pickInfo?.pickedMesh;
        
        // 检查是否点击了敌方怪兽
        let targetSlot = -1;
        for (let i = 0; i < this.enemyMonsters.length; i++) {
            if (this.enemyMonsters[i]?.mesh === pickedMesh) {
                targetSlot = i;
                break;
            }
        }
        
        this.endTargetSelection();
        
        if (targetSlot >= 0) {
            // 手动选择了目标
            this.executeAttack(this.attackingSlot, targetSlot);
        } else {
            // 点击空白，自动选择
            this.autoSelectTarget();
        }
    }
    
    /**
     * 结束目标选择模式
     */
    private endTargetSelection(): void {
        this.isSelectingTarget = false;
        
        // 移除事件
        if (this.targetPointerObserver) {
            this.scene.onPointerObservable.remove(this.targetPointerObserver);
            this.targetPointerObserver = null;
        }
        
        // 清除敌方高亮
        this.enemyMonsters.forEach(monster => {
            if (monster) {
                monster.setHighlight(false);
            }
        });
    }

    /**
     * 自动选择攻击目标 (选择ATK最低的敌方怪兽)
     */
    private autoSelectTarget(): void {
        if (this.attackingSlot < 0) return;
        
        // 找到敌方怪兽
        const enemySlots = this.enemyMonsters
            .map((m, i) => m ? { slot: i, monster: m } : null)
            .filter(e => e !== null) as { slot: number; monster: ClMonsterMesh }[];
        
        if (enemySlots.length === 0) {
            // 没有敌方怪兽，直接攻击玩家
            this.executeDirectAttack(this.attackingSlot);
            return;
        }
        
        // 选择ATK最低的目标
        const target = enemySlots.reduce((min, curr) => 
            curr.monster.data.atk < min.monster.data.atk ? curr : min
        );
        
        this.executeAttack(this.attackingSlot, target.slot);
    }

    // ========== 地形加成计算 ==========
    
    /**
     * 获取怪兽在指定地形上的实际攻击力
     * @param monster 怪兽实例
     * @param terrain 地形类型
     * @returns 计算地形加成后的攻击力
     */
    private getEffectiveAtk(monster: ClMonsterMesh, terrain: TerrainType): number {
        const attr = monster.data.attribute as ClWasmMonsterAttribute;
        const terrainId = terrain as ClWasmTerrainType;
        const modifier = cl_getTerrainModifier(terrainId, attr);
        
        if (!modifier) return monster.data.atk;
        
        const effectiveAtk = Math.floor(monster.data.atk * (100 + modifier.atk_percent) / 100);
        
        // 调试日志
        if (modifier.atk_percent !== 0) {
            console.log(`🌍 地形加成: ${monster.data.name} ATK ${monster.data.atk} → ${effectiveAtk} (${modifier.atk_percent > 0 ? '+' : ''}${modifier.atk_percent}%)`);
        }
        
        return effectiveAtk;
    }
    
    /**
     * 获取怪兽在指定地形上的实际防御力
     * @param monster 怪兽实例
     * @param terrain 地形类型
     * @returns 计算地形加成后的防御力
     */
    private getEffectiveDef(monster: ClMonsterMesh, terrain: TerrainType): number {
        const attr = monster.data.attribute as ClWasmMonsterAttribute;
        const terrainId = terrain as ClWasmTerrainType;
        const modifier = cl_getTerrainModifier(terrainId, attr);
        
        if (!modifier) return monster.data.def;
        
        const effectiveDef = Math.floor(monster.data.def * (100 + modifier.def_percent) / 100);
        
        // 调试日志
        if (modifier.def_percent !== 0) {
            console.log(`🌍 地形加成: ${monster.data.name} DEF ${monster.data.def} → ${effectiveDef} (${modifier.def_percent > 0 ? '+' : ''}${modifier.def_percent}%)`);
        }
        
        return effectiveDef;
    }

    /**
     * 执行攻击
     * 游戏王规则:
     * - 攻击表示怪兽: ATK vs ATK，输家被消灭，差值伤害
     * - 守备表示怪兽: ATK vs DEF，守备方不受战斗伤害，攻击力低于防御力时攻击方受差值伤害
     * - 地形加成: 根据怪兽属性和所在地形计算加成
     */
    private executeAttack(attackerSlot: number, targetSlot: number): void {
        const attacker = this.playerMonsters[attackerSlot];
        const target = this.enemyMonsters[targetSlot];
        
        if (!attacker || !target) return;
        
        // 检查攻击者是否为攻击表示
        if (attacker.data.position === 'defense') {
            this.showMessage('守备表示的怪兽不能攻击!');
            return;
        }
        
        // ⚔️ 获取攻击者和目标的世界位置
        const attackerPos = attacker.getPosition().add(this.root.position);
        const targetPos = target.getPosition().add(this.root.position);
        
        // ⚔️ 播放攻击特效 (能量球飞向目标)
        if (this.battleEffects) {
            this.battleEffects.playAttackEffect(attackerPos.add(new Vector3(0, 1, 0)), targetPos.add(new Vector3(0, 1, 0)));
        }
        
        // 🔊 播放攻击音效
        this.soundManager.playAttack();
        
        // 🌍 使用地形加成计算实际数值
        const attackerAtk = this.getEffectiveAtk(attacker, this.config.playerTerrain);
        const targetPosition = target.data.position;
        
        if (targetPosition === 'defense') {
            // 攻击守备表示怪兽: ATK vs DEF (敌方怪兽在敌方地形)
            const targetDef = this.getEffectiveDef(target, this.config.enemyTerrain);
            const damage = attackerAtk - targetDef;
            
            if (damage > 0) {
                // 攻击力 > 守备力，消灭守备怪兽，但不造成战斗伤害
                this.showMessage(`【${attacker.data.name}】突破【${target.data.name}】的防御!`);
                
                // ⚔️ 播放击杀特效
                if (this.battleEffects) {
                    this.battleEffects.playDamageEffect(targetPos.add(new Vector3(0, 1, 0)), 0);
                    this.battleEffects.shakeCamera(0.3, 200);
                }
                
                target.dispose();
                this.enemyMonsters[targetSlot] = null;
                this.sendToGraveyard({ id: target.data.id, name: target.data.name, type: 'monster' });
                
                console.log(`🛡️ ${attacker.data.name} 突破 ${target.data.name} 的守备`);
            } else if (damage < 0) {
                // 攻击力 < 守备力，攻击方受差值伤害，双方怪兽不消灭
                const counterDamage = -damage;
                this.showMessage(`【${attacker.data.name}】攻击被弹开! 反伤 ${counterDamage}`);
                
                // ⚔️ 播放反伤特效 (攻击者被弹开)
                if (this.battleEffects) {
                    this.battleEffects.playDamageEffect(attackerPos.add(new Vector3(0, 1, 0)), counterDamage);
                    this.battleEffects.shakeCamera(0.2, 150);
                }
                
                this.dealDamageToPlayer(counterDamage);
                
                console.log(`🛡️ ${attacker.data.name} 攻击 ${target.data.name} 失败, 反伤 ${counterDamage}`);
            } else {
                // ATK = DEF，无事发生
                this.showMessage('攻击被防御住了!');
            }
        } else {
            // 攻击攻击表示怪兽: ATK vs ATK (敌方怪兽在敌方地形)
            const targetAtk = this.getEffectiveAtk(target, this.config.enemyTerrain);
            const damage = attackerAtk - targetAtk;
            
            if (damage > 0) {
                // 攻击者获胜，超出的伤害给敌方玩家
                this.showMessage(`【${attacker.data.name}】击败【${target.data.name}】! 溢出伤害 ${damage}`);
                
                // ⚔️ 播放击杀特效
                if (this.battleEffects) {
                    this.battleEffects.playDamageEffect(targetPos.add(new Vector3(0, 1, 0)), damage);
                    this.battleEffects.shakeCamera(0.4, 250);
                }
                
                target.dispose();
                this.enemyMonsters[targetSlot] = null;
                this.sendToGraveyard({ id: target.data.id, name: target.data.name, type: 'monster' });
                
                this.dealDamageToEnemy(damage);
                
                console.log(`⚔️ ${attacker.data.name} 击败 ${target.data.name}, 溢出 ${damage}`);
            } else if (damage < 0) {
                // 防守方获胜，反伤给玩家
                const counterDamage = -damage;
                this.showMessage(`【${attacker.data.name}】攻击失败! 反伤 ${counterDamage}`);
                
                // ⚔️ 播放反杀特效
                if (this.battleEffects) {
                    this.battleEffects.playDamageEffect(attackerPos.add(new Vector3(0, 1, 0)), counterDamage);
                    this.battleEffects.shakeCamera(0.4, 250);
                }
                
                attacker.dispose();
                this.playerMonsters[attackerSlot] = null;
                
                this.dealDamageToPlayer(counterDamage);
                
                console.log(`⚔️ ${attacker.data.name} 被 ${target.data.name} 反杀, 反伤 ${counterDamage}`);
            } else {
                // 同归于尽
                this.showMessage('同归于尽!');
                
                // ⚔️ 播放双方击杀特效
                if (this.battleEffects) {
                    this.battleEffects.playDamageEffect(attackerPos.add(new Vector3(0, 1, 0)), 0);
                    this.battleEffects.playDamageEffect(targetPos.add(new Vector3(0, 1, 0)), 0);
                    this.battleEffects.shakeCamera(0.5, 300);
                }
                
                attacker.dispose();
                target.dispose();
                this.playerMonsters[attackerSlot] = null;
                this.enemyMonsters[targetSlot] = null;
            }
        }
        
        // 标记已攻击
        this.turnState.attackedSlots.push(attackerSlot);
        this.attackingSlot = -1;
        
        // 检查胜负
        this.checkBattleResult();
    }

    /**
     * 检查战斗结果 (基于怪兽存活)
     * @returns true 如果战斗结束
     */
    private checkBattleResult(): boolean {
        const playerAlive = this.playerMonsters.some(m => m !== null);
        const enemyAlive = this.enemyMonsters.some(m => m !== null);
        
        // 如果双方都没有怪兽，不判定结束 (回合继续)
        if (!playerAlive && !enemyAlive) {
            return false;
        }
        
        // 敌方怪兽全灭 + 玩家还有怪兽 = 胜利
        if (!enemyAlive && playerAlive) {
            this.showBattleResult(true, '消灭了敌方所有怪兽!');
            return true;
        }
        
        // 玩家怪兽全灭 + 敌方还有怪兽 = 失败 (可选，暂时不启用)
        // 因为玩家可以召唤新怪兽
        
        return false;
    }

    /**
     * 执行敌方回合 (简单AI)
     */
    private executeEnemyTurn(): void {
        // 主阶段1: 尝试召唤怪兽
        this.turnState.phase = 'main1';
        this.onPhaseChange();
        
        setTimeout(() => {
            // 召唤一个敌方怪兽
            const emptySlot = this.enemyMonsters.findIndex(m => m === null);
            if (emptySlot >= 0) {
                const enemyMonster: MonsterDisplayData = {
                    id: `enemy_${Date.now()}`,
                    name: `暗黑骑士${emptySlot + 1}`,
                    attribute: 'dark' as MonsterAttribute,
                    atk: 1400 + Math.floor(Math.random() * 400),
                    def: 1000 + Math.floor(Math.random() * 300),
                    hp: 1400,
                    maxHp: 1400,
                    position: 'attack'  // 敌方召唤默认攻击表示
                };
                this.summonEnemyMonster(emptySlot, enemyMonster);
                this.showMessage(`敌方召唤了 ${enemyMonster.name}!`);
            }
            
            // 战斗阶段
            setTimeout(() => {
                this.turnState.phase = 'battle';
                this.onPhaseChange();
                
                // 敌方攻击
                setTimeout(() => {
                    this.executeEnemyAttacks();
                }, 1000);
            }, 1500);
        }, 1000);
    }

    /**
     * 敌方攻击
     */
    private executeEnemyAttacks(): void {
        // 找到敌方可攻击的怪兽
        const enemyAttackers = this.enemyMonsters
            .map((m, i) => m ? { slot: i, monster: m } : null)
            .filter(e => e !== null) as { slot: number; monster: ClMonsterMesh }[];
        
        if (enemyAttackers.length === 0) {
            this.finishEnemyTurn();
            return;
        }
        
        // 找到玩家怪兽
        const playerTargets = this.playerMonsters
            .map((m, i) => m ? { slot: i, monster: m } : null)
            .filter(e => e !== null) as { slot: number; monster: ClMonsterMesh }[];
        
        if (playerTargets.length === 0) {
            // 直接攻击玩家
            const attacker = enemyAttackers[0];
            const damage = attacker.monster.data.atk;
            this.showMessage(`【${attacker.monster.data.name}】直接攻击玩家! 造成 ${damage} 伤害!`);
            this.dealDamageToPlayer(damage);
            setTimeout(() => this.finishEnemyTurn(), 1000);
            return;
        }
        
        // 敌方第一个怪兽攻击玩家ATK最低的怪兽
        const attacker = enemyAttackers[0];
        const target = playerTargets.reduce((min, curr) => 
            curr.monster.data.atk < min.monster.data.atk ? curr : min
        );
        
        this.executeEnemyAttackSingle(attacker.slot, target.slot);
    }

    /**
     * 执行单次敌方攻击
     * 🌍 敌方怪兽使用敌方地形加成，玩家怪兽使用玩家地形加成
     */
    private executeEnemyAttackSingle(attackerSlot: number, targetSlot: number): void {
        const attacker = this.enemyMonsters[attackerSlot];
        const target = this.playerMonsters[targetSlot];
        
        if (!attacker || !target) {
            this.finishEnemyTurn();
            return;
        }
        
        // ⚔️ 获取位置播放攻击特效
        const attackerPos = attacker.getPosition().add(this.root.position);
        const targetPos = target.getPosition().add(this.root.position);
        
        // ⚔️ 播放攻击特效 (能量球飞向目标)
        if (this.battleEffects) {
            this.battleEffects.playAttackEffect(attackerPos.add(new Vector3(0, 1, 0)), targetPos.add(new Vector3(0, 1, 0)));
        }
        
        // 🔊 播放攻击音效
        this.soundManager.playAttack();
        
        // 🌍 使用地形加成计算实际数值
        const attackerAtk = this.getEffectiveAtk(attacker, this.config.enemyTerrain);
        const targetAtk = this.getEffectiveAtk(target, this.config.playerTerrain);
        const damage = attackerAtk - targetAtk;
        
        if (damage > 0) {
            // 敌方获胜，溢出伤害给玩家
            this.showMessage(`【${attacker.data.name}】击败【${target.data.name}】! 溢出伤害 ${damage}`);
            
            // ⚔️ 播放击杀特效
            if (this.battleEffects) {
                this.battleEffects.playDamageEffect(targetPos.add(new Vector3(0, 1, 0)), damage);
                this.battleEffects.shakeCamera(0.4, 250);
            }
            
            target.dispose();
            this.playerMonsters[targetSlot] = null;
            this.dealDamageToPlayer(damage);
        } else if (damage < 0) {
            // 玩家获胜，反伤给敌方
            const counterDamage = -damage;
            this.showMessage(`【${attacker.data.name}】攻击失败! 反伤 ${counterDamage}`);
            
            // ⚔️ 播放反杀特效
            if (this.battleEffects) {
                this.battleEffects.playDamageEffect(attackerPos.add(new Vector3(0, 1, 0)), counterDamage);
                this.battleEffects.shakeCamera(0.4, 250);
            }
            
            attacker.dispose();
            this.enemyMonsters[attackerSlot] = null;
            this.dealDamageToEnemy(counterDamage);
        } else {
            this.showMessage('同归于尽!');
            
            // ⚔️ 播放双方击杀特效
            if (this.battleEffects) {
                this.battleEffects.playDamageEffect(attackerPos.add(new Vector3(0, 1, 0)), 0);
                this.battleEffects.playDamageEffect(targetPos.add(new Vector3(0, 1, 0)), 0);
                this.battleEffects.shakeCamera(0.5, 300);
            }
            
            attacker.dispose();
            target.dispose();
            this.playerMonsters[targetSlot] = null;
            this.enemyMonsters[attackerSlot] = null;
        }
        
        // 检查结果
        if (!this.checkBattleResult()) {
            setTimeout(() => this.finishEnemyTurn(), 1000);
        }
    }

    /**
     * 结束敌方回合
     */
    private finishEnemyTurn(): void {
        this.turnState.phase = 'end';
        this.onPhaseChange();
        
        setTimeout(() => {
            this.endTurn();
        }, 1000);
    }
}
