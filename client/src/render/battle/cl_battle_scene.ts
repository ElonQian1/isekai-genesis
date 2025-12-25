/**
 * 战斗场景管理器 - 处理回合制卡牌战斗
 * 
 * 模块: client/render/battle
 * 前缀: Cl
 * 
 * 重构说明：
 * - 卡牌逻辑委托给 ClBattleCardManager
 * - 战斗逻辑委托给 ClBattleCombatManager
 * - 本类负责场景渲染、UI 和动画协调
 */

import { 
    Scene, 
    Vector3, 
    Color3, 
    MeshBuilder, 
    StandardMaterial, 
    Mesh,
    TransformNode,
    Animation,
    ActionManager,
    ExecuteCodeAction,
    EasingFunction,
    QuadraticEase
} from '@babylonjs/core';
import { AdvancedDynamicTexture, Rectangle, TextBlock, Button, Control, StackPanel } from '@babylonjs/gui';
import { EnemyData } from '../world/entities/cl_enemy_system';
import { 
    ClBattleCardManager, 
    ClBattleCombatManager,
    BattleCard,
    BattlePhase
} from './managers';

// =============================================================================
// 战斗场景类
// =============================================================================

export class ClBattleScene {
    private scene: Scene;
    private root: TransformNode;
    private ui: AdvancedDynamicTexture;
    
    // 管理器
    private cardManager: ClBattleCardManager;
    private combatManager: ClBattleCombatManager;
    
    // 状态
    private enemyData: EnemyData | null = null;
    
    // 场景物体
    private gridMeshes: Mesh[] = [];
    private enemyMesh: Mesh | null = null;
    private playerMesh: Mesh | null = null;
    private originalCameraPosition: Vector3 | null = null;
    private originalCameraTarget: Vector3 | null = null;
    
    // UI 控件
    private resultOverlay: Rectangle | null = null;
    private resultTitle: TextBlock | null = null;
    private hpLabel: TextBlock | null = null;
    private enemyHpLabel: TextBlock | null = null;
    private apLabel: TextBlock | null = null;
    private poolPanel: StackPanel | null = null;
    private handPanel: StackPanel | null = null;
    private actionPanel: StackPanel | null = null;
    private messageText: TextBlock | null = null;
    
    // 回调
    public onBattleEnd: ((winner: boolean) => void) | null = null;

    constructor(scene: Scene) {
        this.scene = scene;
        this.root = new TransformNode('battleRoot', scene);
        this.root.setEnabled(false);
        this.ui = AdvancedDynamicTexture.CreateFullscreenUI('battleUI', true, scene);
        this.ui.rootContainer.isVisible = false;
        
        // 初始化管理器
        this.cardManager = new ClBattleCardManager();
        this.combatManager = new ClBattleCombatManager();
    }

    /**
     * 初始化战斗
     */
    public startBattle(enemy: EnemyData, playerPos: Vector3): void {
        console.log('⚔️ 进入战斗!');
        
        // 先清理之前的战场（如果有）
        this.disposeBattleField();
        
        this.enemyData = enemy;
        this.root.setEnabled(true);
        this.ui.rootContainer.isVisible = true;
        
        // 将战场根节点移动到玩家位置
        this.root.position = playerPos.clone();
        
        // 初始化管理器
        this.combatManager.reset();
        this.combatManager.init(10, 6, 5);
        this.cardManager.initDeck();
        
        // 创建场景
        this.createBattleField();
        this.createUI();
        
        // 设置相机 (俯视战斗视角)
        const camera = this.scene.activeCamera as any;
        if (camera) {
            this.originalCameraPosition = camera.position.clone();
            this.originalCameraTarget = camera.target ? camera.target.clone() : Vector3.Zero();
            
            // 移动到战斗视角 - 从上方斜视战场
            // 相机位置相对于战场中心
            camera.position = playerPos.add(new Vector3(0, 12, -8));
            camera.setTarget(playerPos.add(new Vector3(0, 0, 2)));
            camera.detachControl();
        }
        
        // 进入部署阶段
        this.combatManager.setPhase(BattlePhase.Deploy);
        this.showMessage("请点击绿色格子选择部署位置");
        
        console.log('📍 战场位置:', playerPos.toString());
        console.log('📍 相机位置:', camera?.position.toString());
    }

    /**
     * 退出战斗
     */
    public endBattle(victory: boolean): void {
        console.log(`🏁 战斗结束: ${victory ? '胜利' : '失败'}`);
        this.root.setEnabled(false);
        this.ui.rootContainer.isVisible = false;
        this.disposeBattleField();
        
        // 恢复相机
        const camera = this.scene.activeCamera as any;
        if (camera && this.originalCameraPosition) {
            camera.position = this.originalCameraPosition;
            if (this.originalCameraTarget) {
                camera.setTarget(this.originalCameraTarget);
            }
            camera.attachControl(this.scene.getEngine().getRenderingCanvas(), true);
        }
        
        if (this.onBattleEnd) {
            this.onBattleEnd(victory);
        }
    }

    /**
     * 创建战场物体
     */
    private createBattleField(): void {
        // 1. 创建6格部署区 (3x2)
        // 网格位置需要相对于战场中心
        const startX = -2.2;
        const startZ = -1;
        const gap = 2.2;
        
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 3; col++) {
                // 使用 Ground 而不是 Box，更容易点击
                const grid = MeshBuilder.CreateGround(`grid_${row}_${col}`, { width: 2, height: 2 }, this.scene);
                grid.position = new Vector3(startX + col * gap, 0.05, startZ + row * gap);
                grid.parent = this.root;
                
                // 确保网格可被拾取
                grid.isPickable = true;
                
                const mat = new StandardMaterial(`mat_grid_${row}_${col}`, this.scene);
                // 使用更明显的颜色
                mat.diffuseColor = new Color3(0.2, 0.6, 0.3);
                mat.emissiveColor = new Color3(0.1, 0.3, 0.15);
                mat.alpha = 0.8;
                mat.backFaceCulling = false;
                grid.material = mat;
                
                // 边框效果 - 创建边框线
                const border = MeshBuilder.CreateLines(`border_${row}_${col}`, {
                    points: [
                        new Vector3(-1, 0.06, -1),
                        new Vector3(1, 0.06, -1),
                        new Vector3(1, 0.06, 1),
                        new Vector3(-1, 0.06, 1),
                        new Vector3(-1, 0.06, -1)
                    ]
                }, this.scene);
                border.color = new Color3(0.5, 1, 0.5);
                border.parent = grid;
                
                // 点击事件
                grid.actionManager = new ActionManager(this.scene);
                grid.actionManager.registerAction(new ExecuteCodeAction(
                    ActionManager.OnPickTrigger,
                    () => this.onGridClicked(row, col, grid)
                ));
                
                // 悬停高亮效果
                grid.actionManager.registerAction(new ExecuteCodeAction(
                    ActionManager.OnPointerOverTrigger,
                    () => {
                        if (this.combatManager.getPhase() === BattlePhase.Deploy) {
                            mat.emissiveColor = new Color3(0.2, 0.5, 0.3);
                        }
                    }
                ));
                grid.actionManager.registerAction(new ExecuteCodeAction(
                    ActionManager.OnPointerOutTrigger,
                    () => {
                        mat.emissiveColor = new Color3(0.1, 0.3, 0.15);
                    }
                ));
                
                this.gridMeshes.push(grid);
            }
        }
        
        console.log(`✅ 创建了 ${this.gridMeshes.length} 个部署格子`);
        
        // 2. 创建敌人模型 (简单替代)
        this.enemyMesh = MeshBuilder.CreateCapsule('battle_enemy', { height: 2, radius: 0.5 }, this.scene);
        this.enemyMesh.position = new Vector3(0, 1, 5);
        this.enemyMesh.parent = this.root;
        const enemyMat = new StandardMaterial('mat_battle_enemy', this.scene);
        enemyMat.diffuseColor = new Color3(1, 0.2, 0.2);
        this.enemyMesh.material = enemyMat;
    }
    
    private disposeBattleField(): void {
        this.gridMeshes.forEach(m => m.dispose());
        this.gridMeshes = [];
        if (this.enemyMesh) {
            this.enemyMesh.dispose();
            this.enemyMesh = null;
        }
        if (this.playerMesh) {
            this.playerMesh.dispose();
            this.playerMesh = null;
        }
    }

    /**
     * 创建 UI
     */
    private createUI(): void {
        this.ui.dispose();
        this.ui = AdvancedDynamicTexture.CreateFullscreenUI('battleUI', true, this.scene);
        
        // 根容器 - 不阻挡点击
        const root = new Rectangle();
        root.thickness = 0;
        // 移除全屏背景，让中间区域可点击
        root.isPointerBlocker = false;
        this.ui.addControl(root);
        
        // 顶部信息栏
        const topPanel = new StackPanel();
        topPanel.isVertical = false;
        topPanel.height = "60px";
        topPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        topPanel.background = "#000000AA";
        root.addControl(topPanel);
        
        this.hpLabel = new TextBlock();
        const playerState = this.combatManager.getPlayerState();
        this.hpLabel.text = `玩家 HP: ${playerState.hp}/${playerState.maxHp}`;
        this.hpLabel.color = "white";
        this.hpLabel.width = "300px";
        this.hpLabel.fontSize = 20;
        topPanel.addControl(this.hpLabel);
        
        this.apLabel = new TextBlock();
        this.apLabel.text = `行动点: ${playerState.actionPoints}/${playerState.maxActionPoints}`;
        this.apLabel.color = "yellow";
        this.apLabel.width = "200px";
        this.apLabel.fontSize = 20;
        topPanel.addControl(this.apLabel);
        
        this.enemyHpLabel = new TextBlock();
        const enemyName = this.enemyData ? this.enemyData.name : "怪物";
        const enemyState = this.combatManager.getEnemyState();
        this.enemyHpLabel.text = `${enemyName} HP: ${enemyState.hp}/${enemyState.maxHp}`;
        this.enemyHpLabel.color = "red";
        this.enemyHpLabel.width = "300px";
        this.enemyHpLabel.fontSize = 20;
        topPanel.addControl(this.enemyHpLabel);
        
        // 中间提示
        this.messageText = new TextBlock();
        this.messageText.text = "请选择部署位置";
        this.messageText.color = "white";
        this.messageText.fontSize = 36;
        this.messageText.top = "-150px";
        this.messageText.shadowColor = "black";
        this.messageText.shadowBlur = 2;
        root.addControl(this.messageText);
        
        // 底部操作区
        const bottomPanel = new Rectangle();
        bottomPanel.height = "350px";
        bottomPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        bottomPanel.thickness = 0;
        root.addControl(bottomPanel);
        
        // 1. 卡池区 (Draft)
        this.poolPanel = new StackPanel();
        this.poolPanel.isVertical = false;
        this.poolPanel.height = "160px";
        this.poolPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        bottomPanel.addControl(this.poolPanel);
        
        // 2. 手牌区
        this.handPanel = new StackPanel();
        this.handPanel.isVertical = false;
        this.handPanel.height = "120px";
        this.handPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        this.handPanel.top = "20px";
        bottomPanel.addControl(this.handPanel);
        
        // 3. 技能按钮区
        this.actionPanel = new StackPanel();
        this.actionPanel.isVertical = false;
        this.actionPanel.height = "60px";
        this.actionPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.actionPanel.paddingBottom = "10px";
        bottomPanel.addControl(this.actionPanel);
        
        this.createActionButtons();
        
        // 结算界面 (默认隐藏)
        this.createResultOverlay();
    }

    private createResultOverlay(): void {
        this.resultOverlay = new Rectangle();
        this.resultOverlay.background = "#000000DD";
        this.resultOverlay.isVisible = false;
        this.ui.addControl(this.resultOverlay);
        
        const panel = new StackPanel();
        this.resultOverlay.addControl(panel);
        
        this.resultTitle = new TextBlock("resultTitle");
        this.resultTitle.text = "VICTORY";
        this.resultTitle.color = "gold";
        this.resultTitle.fontSize = 80;
        this.resultTitle.height = "120px";
        panel.addControl(this.resultTitle);
        
        const btn = Button.CreateSimpleButton("continueBtn", "继续冒险");
        btn.width = "200px";
        btn.height = "60px";
        btn.color = "white";
        btn.background = "green";
        btn.fontSize = 24;
        btn.onPointerUpObservable.add(() => {
            const isWin = this.resultTitle?.text === "VICTORY";
            this.endBattle(isWin);
        });
        panel.addControl(btn);
    }

    private createCardControl(card: BattleCard, onClick?: () => void): Control {
        const container = new Rectangle();
        container.width = "100px";
        container.height = "140px";
        container.thickness = 2;
        container.color = "white";
        container.background = "#222222";
        container.cornerRadius = 5;
        container.paddingLeft = "5px";
        container.paddingRight = "5px";
        
        // 标题背景
        const titleBg = new Rectangle();
        titleBg.height = "30px";
        titleBg.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        titleBg.background = card.color;
        titleBg.thickness = 0;
        container.addControl(titleBg);
        
        // 标题
        const title = new TextBlock();
        title.text = card.name;
        title.color = "white";
        title.fontSize = 14;
        title.fontWeight = "bold";
        titleBg.addControl(title);
        
        // 内容
        const desc = new TextBlock();
        desc.text = card.type;
        desc.color = "#AAAAAA";
        desc.fontSize = 12;
        desc.top = "10px";
        container.addControl(desc);
        
        // 费用
        const cost = new TextBlock();
        cost.text = "1 AP";
        cost.color = "yellow";
        cost.fontSize = 14;
        cost.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        cost.top = "-10px";
        container.addControl(cost);
        
        if (onClick) {
            container.isPointerBlocker = true;
            container.onPointerUpObservable.add(onClick);
            
            // Hover effect
            container.onPointerEnterObservable.add(() => {
                container.scaleX = 1.1;
                container.scaleY = 1.1;
            });
            container.onPointerOutObservable.add(() => {
                container.scaleX = 1.0;
                container.scaleY = 1.0;
            });
        }
        
        return container;
    }
    
    private createActionButtons(): void {
        if (!this.actionPanel) return;
        this.actionPanel.clearControls();
        
        const createBtn = (name: string, cost: number, req: string, callback: () => void, color: string = "green") => {
            const btn = Button.CreateSimpleButton(name, `${name}\nAP:${cost} ${req}`);
            btn.width = "120px";
            btn.height = "50px";
            btn.color = "white";
            btn.background = color;
            btn.onPointerUpObservable.add(callback);
            btn.paddingLeft = "5px";
            btn.paddingRight = "5px";
            this.actionPanel!.addControl(btn);
            return btn;
        };
        
        createBtn("普通攻击", 1, "1攻", () => this.useSkill("Normal"), "#D32F2F");
        createBtn("小技能", 1, "2攻", () => this.useSkill("Small"), "#C2185B");
        createBtn("大招", 2, "3攻", () => this.useSkill("Ult"), "#7B1FA2");
        
        createBtn("格挡", 1, "1防", () => this.useDefend(), "#1976D2");
        createBtn("治疗", 1, "1奶", () => this.useHeal(), "#388E3C");
        
        createBtn("结束回合", 0, "", () => this.endTurn(), "#455A64");
    }

    private animateAttack(attacker: Mesh, target: Mesh, onHit: () => void): void {
        const startPos = attacker.position.clone();
        const targetPos = target.position.clone();
        
        // 简单的冲刺动画
        // 1. 冲向目标
        const attackAnim = new Animation(
            "attackAnim",
            "position",
            60,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        // 停在目标前方一点
        const direction = targetPos.subtract(startPos).normalize();
        const hitPos = targetPos.subtract(direction.scale(1.5));
        
        const keys = [
            { frame: 0, value: startPos },
            { frame: 20, value: hitPos },
            { frame: 40, value: startPos }
        ];
        
        attackAnim.setKeys(keys);
        
        // 使用缓动函数让动作更有力
        const easing = new QuadraticEase();
        easing.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
        attackAnim.setEasingFunction(easing);
        
        attacker.animations = [attackAnim];
        
        this.scene.beginAnimation(attacker, 0, 40, false, 1, () => {
            // 动画结束
        });
        
        // 在第 20 帧触发命中回调
        setTimeout(() => {
            onHit();
        }, 333); // 20 frames at 60fps ~= 333ms
    }

    // =========================================================================
    // 游戏逻辑
    // =========================================================================

    private onGridClicked(row: number, col: number, mesh: Mesh): void {
        if (this.combatManager.getPhase() !== BattlePhase.Deploy) return;
        
        console.log(`Deploy at ${row}, ${col}`);
        
        // 部署玩家
        this.playerMesh = MeshBuilder.CreateCapsule('battle_player', { height: 2, radius: 0.5 }, this.scene);
        this.playerMesh.position = mesh.position.clone().add(new Vector3(0, 1, 0));
        this.playerMesh.parent = this.root;
        const mat = new StandardMaterial('mat_battle_player', this.scene);
        mat.diffuseColor = new Color3(0.2, 0.8, 0.2);
        this.playerMesh.material = mat;
        
        // 部署完成后隐藏部署格子
        this.hideDeploymentGrids();
        
        this.startTurn();
    }
    
    /**
     * 隐藏部署格子
     */
    private hideDeploymentGrids(): void {
        this.gridMeshes.forEach(grid => {
            grid.setEnabled(false);
            // 同时隐藏边框线（子节点）
            grid.getChildMeshes().forEach(child => child.setEnabled(false));
        });
    }
    
    private startTurn(): void {
        this.combatManager.startPlayerTurn();
        this.showMessage("你的回合");
        
        // 生成新卡池
        this.cardManager.generatePool();
        this.renderPool();
        this.renderHand();
        this.updateUI();
    }
    
    private renderPool(): void {
        if (!this.poolPanel) return;
        this.poolPanel.clearControls();
        
        const pool = this.cardManager.getPool();
        pool.forEach((card: BattleCard) => {
            const cardControl = this.createCardControl(card, () => {
                this.draftCard(card);
            });
            this.poolPanel!.addControl(cardControl);
        });
    }
    
    private renderHand(): void {
        if (!this.handPanel) return;
        this.handPanel.clearControls();
        
        const hand = this.cardManager.getHand();
        hand.forEach((card: BattleCard) => {
            const cardControl = this.createCardControl(card);
            this.handPanel!.addControl(cardControl);
        });
    }
    
    private draftCard(card: BattleCard): void {
        if (!this.combatManager.hasEnoughAP(1)) {
            this.showMessage("行动点不足！");
            return;
        }
        
        this.combatManager.consumeAP(1);
        this.cardManager.draftCard(card.id);
        
        this.updateUI();
        this.renderPool();
        this.renderHand();
    }
    
    private useDefend(): void {
        if (!this.combatManager.isPlayerTurn()) return;
        
        const result = this.combatManager.useDefend(this.cardManager);
        if (!result.success) {
            this.showMessage(result.message);
            return;
        }
        
        this.showFloatingText(`+${result.shield} 护盾`, "#2196F3", this.playerMesh!.position);
        this.updateUI();
        this.renderHand();
    }

    private useHeal(): void {
        if (!this.combatManager.isPlayerTurn()) return;
        
        const result = this.combatManager.useHeal(this.cardManager);
        if (!result.success) {
            this.showMessage(result.message);
            return;
        }
        
        this.showFloatingText(`+${result.heal} HP`, "#4CAF50", this.playerMesh!.position);
        this.updateUI();
        this.renderHand();
    }
    
    private useSkill(skill: 'Normal' | 'Small' | 'Ult'): void {
        if (!this.combatManager.isPlayerTurn()) return;
        
        const check = this.combatManager.canUseSkill(skill, this.cardManager);
        if (!check.ok) {
            this.showMessage(check.reason!);
            return;
        }
        
        // 执行攻击动画
        if (this.playerMesh && this.enemyMesh) {
            this.animateAttack(this.playerMesh, this.enemyMesh, () => {
                const result = this.combatManager.useAttackSkill(skill, this.cardManager);
                
                this.showMessage(result.message);
                this.showFloatingText(`-${result.damage}`, "#F44336", this.enemyMesh!.position);
                
                this.updateUI();
                
                if (this.combatManager.getPhase() === BattlePhase.Victory) {
                    this.winBattle();
                }
            });
        }
        
        this.renderHand();
    }
    
    private endTurn(): void {
        this.combatManager.startEnemyTurn();
        this.showMessage("怪物回合");
        
        // AI 逻辑
        setTimeout(() => {
            const enemyState = this.combatManager.getEnemyState();
            if (enemyState.hp <= 0) return;

            // 执行 AI 回合
            const aiResult = this.combatManager.executeAITurn();
            
            if (aiResult.attackCount > 0) {
                // 怪物攻击动画
                if (this.enemyMesh && this.playerMesh) {
                    this.animateAttack(this.enemyMesh, this.playerMesh, () => {
                        const damageResult = this.combatManager.damagePlayer(aiResult.totalDamage);
                        
                        if (damageResult.blocked) {
                            this.showFloatingText("格挡!", "#2196F3", this.playerMesh!.position);
                        } else if (damageResult.shieldBroken) {
                            this.showFloatingText("破盾!", "#FF9800", this.playerMesh!.position);
                        }
                        
                        if (damageResult.actualDamage > 0) {
                            this.showFloatingText(`-${damageResult.actualDamage}`, "#F44336", this.playerMesh!.position);
                        }
                        
                        this.showMessage(`怪物发动了 ${aiResult.attackCount} 次攻击！`);
                        this.updateUI();
                        
                        if (this.combatManager.getPhase() === BattlePhase.Defeat) {
                            this.loseBattle();
                        } else {
                            setTimeout(() => this.startTurn(), 1000);
                        }
                    });
                }
            } else {
                this.showMessage("怪物本回合没有找到攻击机会");
                this.updateUI();
                setTimeout(() => this.startTurn(), 1500);
            }
        }, 1000);
    }
    
    private showResultOverlay(victory: boolean): void {
        if (!this.resultOverlay || !this.resultTitle) return;
        
        this.resultOverlay.isVisible = true;
        this.resultTitle.text = victory ? "VICTORY" : "DEFEAT";
        this.resultTitle.color = victory ? "gold" : "red";
    }

    private winBattle(): void {
        this.combatManager.setPhase(BattlePhase.Victory);
        this.showMessage("战斗胜利！");
        setTimeout(() => {
            this.showResultOverlay(true);
        }, 1000);
    }
    
    private loseBattle(): void {
        this.combatManager.setPhase(BattlePhase.Defeat);
        this.showMessage("战斗失败...");
        setTimeout(() => {
            this.showResultOverlay(false);
        }, 1000);
    }
    
    private showMessage(msg: string): void {
        if (this.messageText) this.messageText.text = msg;
    }
    
    private updateUI(): void {
        const playerState = this.combatManager.getPlayerState();
        const enemyState = this.combatManager.getEnemyState();
        
        if (this.hpLabel) {
            const shieldText = playerState.shield > 0 ? ` (+${playerState.shield})` : '';
            this.hpLabel.text = `玩家 HP: ${playerState.hp}/${playerState.maxHp}${shieldText}`;
        }
        if (this.enemyHpLabel) this.enemyHpLabel.text = `怪物 HP: ${enemyState.hp}/${enemyState.maxHp}`;
        if (this.apLabel) this.apLabel.text = `行动点: ${playerState.actionPoints}/${playerState.maxActionPoints}`;
    }

    private showFloatingText(text: string, color: string, position: Vector3): void {
        const anchor = new TransformNode("textAnchor", this.scene);
        anchor.position = position.clone().add(new Vector3(0, 2, 0));
        
        const label = new TextBlock();
        label.text = text;
        label.color = color;
        label.fontSize = 36;
        label.fontWeight = "bold";
        label.outlineWidth = 2;
        label.outlineColor = "black";
        
        this.ui.addControl(label);
        label.linkWithMesh(anchor as any);
        label.linkOffsetY = -50;
        
        const anim = new Animation("float", "linkOffsetY", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        anim.setKeys([{frame: 0, value: -50}, {frame: 60, value: -150}]);
        
        const fade = new Animation("fade", "alpha", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        fade.setKeys([{frame: 0, value: 1}, {frame: 40, value: 1}, {frame: 60, value: 0}]);
        
        this.scene.beginDirectAnimation(label, [anim, fade], 0, 60, false, 1, () => {
            label.dispose();
            anchor.dispose();
        });
    }
}
