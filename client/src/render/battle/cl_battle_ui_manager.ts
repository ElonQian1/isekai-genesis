/**
 * 战斗 UI 管理器
 * 
 * 模块: client/render/battle
 * 前缀: Cl
 * 
 * 职责：
 * - 创建和管理战斗 UI
 * - 渲染卡牌、手牌、技能按钮
 * - 显示浮动文本和消息
 */

import { Scene, Vector3, TransformNode, Animation } from '@babylonjs/core';
import { 
    AdvancedDynamicTexture, 
    Rectangle, 
    TextBlock, 
    Button, 
    Control, 
    StackPanel 
} from '@babylonjs/gui';
import { BattleCard } from './cl_battle_types';

/**
 * UI 回调接口
 */
export interface ClBattleUICallbacks {
    onCardDrafted?: (card: BattleCard) => void;
    onSkillUsed?: (skill: 'Normal' | 'Small' | 'Ult') => void;
    onDefendUsed?: () => void;
    onHealUsed?: () => void;
    onTurnEnded?: () => void;
    onContinueClicked?: (isWin: boolean) => void;
}

/**
 * 战斗 UI 管理器
 */
export class ClBattleUIManager {
    private scene: Scene;
    private ui: AdvancedDynamicTexture;
    
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
    private callbacks: ClBattleUICallbacks = {};
    
    constructor(scene: Scene) {
        this.scene = scene;
        this.ui = AdvancedDynamicTexture.CreateFullscreenUI('battleUI', true, scene);
        this.ui.rootContainer.isVisible = false;
    }
    
    /**
     * 获取 UI 纹理
     */
    getUI(): AdvancedDynamicTexture {
        return this.ui;
    }
    
    /**
     * 设置回调
     */
    setCallbacks(callbacks: ClBattleUICallbacks): void {
        this.callbacks = callbacks;
    }
    
    /**
     * 显示/隐藏 UI
     */
    setVisible(visible: boolean): void {
        this.ui.rootContainer.isVisible = visible;
    }
    
    /**
     * 创建战斗 UI
     */
    create(enemyName: string, playerHP: number, maxPlayerHP: number, enemyHP: number, maxEnemyHP: number, actionPoints: number, maxActionPoints: number): void {
        this.ui.dispose();
        this.ui = AdvancedDynamicTexture.CreateFullscreenUI('battleUI', true, this.scene);
        
        // 根容器
        const root = new Rectangle();
        root.thickness = 0;
        root.background = "#00000088";
        this.ui.addControl(root);
        
        // 顶部信息栏
        const topPanel = new StackPanel();
        topPanel.isVertical = false;
        topPanel.height = "60px";
        topPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        topPanel.background = "#000000AA";
        root.addControl(topPanel);
        
        this.hpLabel = new TextBlock();
        this.hpLabel.text = `玩家 HP: ${playerHP}/${maxPlayerHP}`;
        this.hpLabel.color = "white";
        this.hpLabel.width = "300px";
        this.hpLabel.fontSize = 20;
        topPanel.addControl(this.hpLabel);
        
        this.apLabel = new TextBlock();
        this.apLabel.text = `行动点: ${actionPoints}/${maxActionPoints}`;
        this.apLabel.color = "yellow";
        this.apLabel.width = "200px";
        this.apLabel.fontSize = 20;
        topPanel.addControl(this.apLabel);
        
        this.enemyHpLabel = new TextBlock();
        this.enemyHpLabel.text = `${enemyName} HP: ${enemyHP}/${maxEnemyHP}`;
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
        
        // 卡池区
        this.poolPanel = new StackPanel();
        this.poolPanel.isVertical = false;
        this.poolPanel.height = "160px";
        this.poolPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        bottomPanel.addControl(this.poolPanel);
        
        // 手牌区
        this.handPanel = new StackPanel();
        this.handPanel.isVertical = false;
        this.handPanel.height = "120px";
        this.handPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        this.handPanel.top = "20px";
        bottomPanel.addControl(this.handPanel);
        
        // 技能按钮区
        this.actionPanel = new StackPanel();
        this.actionPanel.isVertical = false;
        this.actionPanel.height = "60px";
        this.actionPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.actionPanel.paddingBottom = "10px";
        bottomPanel.addControl(this.actionPanel);
        
        this.createActionButtons();
        this.createResultOverlay();
    }
    
    /**
     * 创建结算界面
     */
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
            this.callbacks.onContinueClicked?.(isWin);
        });
        panel.addControl(btn);
    }
    
    /**
     * 创建技能按钮
     */
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
        
        createBtn("普通攻击", 1, "1攻", () => this.callbacks.onSkillUsed?.('Normal'), "#D32F2F");
        createBtn("小技能", 1, "2攻", () => this.callbacks.onSkillUsed?.('Small'), "#C2185B");
        createBtn("大招", 2, "3攻", () => this.callbacks.onSkillUsed?.('Ult'), "#7B1FA2");
        createBtn("格挡", 1, "1防", () => this.callbacks.onDefendUsed?.(), "#1976D2");
        createBtn("治疗", 1, "1奶", () => this.callbacks.onHealUsed?.(), "#388E3C");
        createBtn("结束回合", 0, "", () => this.callbacks.onTurnEnded?.(), "#455A64");
    }
    
    /**
     * 创建卡牌控件
     */
    createCardControl(card: BattleCard, onClick?: () => void): Control {
        const container = new Rectangle();
        container.width = "100px";
        container.height = "140px";
        container.thickness = 2;
        container.color = "white";
        container.background = "#222222";
        container.cornerRadius = 5;
        container.paddingLeft = "5px";
        container.paddingRight = "5px";
        
        const titleBg = new Rectangle();
        titleBg.height = "30px";
        titleBg.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        titleBg.background = card.color;
        titleBg.thickness = 0;
        container.addControl(titleBg);
        
        const title = new TextBlock();
        title.text = card.name;
        title.color = "white";
        title.fontSize = 14;
        title.fontWeight = "bold";
        titleBg.addControl(title);
        
        const desc = new TextBlock();
        desc.text = card.type;
        desc.color = "#AAAAAA";
        desc.fontSize = 12;
        desc.top = "10px";
        container.addControl(desc);
        
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
    
    /**
     * 渲染卡池
     */
    renderPool(pool: BattleCard[]): void {
        if (!this.poolPanel) return;
        this.poolPanel.clearControls();
        
        pool.forEach(card => {
            const cardControl = this.createCardControl(card, () => {
                this.callbacks.onCardDrafted?.(card);
            });
            this.poolPanel!.addControl(cardControl);
        });
    }
    
    /**
     * 渲染手牌
     */
    renderHand(hand: BattleCard[]): void {
        if (!this.handPanel) return;
        this.handPanel.clearControls();
        
        hand.forEach(card => {
            const cardControl = this.createCardControl(card);
            this.handPanel!.addControl(cardControl);
        });
    }
    
    /**
     * 更新状态显示
     */
    update(playerHP: number, maxPlayerHP: number, playerShield: number, enemyHP: number, maxEnemyHP: number, actionPoints: number, maxActionPoints: number): void {
        if (this.hpLabel) {
            const shieldText = playerShield > 0 ? ` (+${playerShield})` : '';
            this.hpLabel.text = `玩家 HP: ${playerHP}/${maxPlayerHP}${shieldText}`;
        }
        if (this.enemyHpLabel) this.enemyHpLabel.text = `怪物 HP: ${enemyHP}/${maxEnemyHP}`;
        if (this.apLabel) this.apLabel.text = `行动点: ${actionPoints}/${maxActionPoints}`;
    }
    
    /**
     * 显示消息
     */
    showMessage(msg: string): void {
        if (this.messageText) this.messageText.text = msg;
    }
    
    /**
     * 显示结算界面
     */
    showResult(victory: boolean): void {
        if (!this.resultOverlay || !this.resultTitle) return;
        
        this.resultOverlay.isVisible = true;
        this.resultTitle.text = victory ? "VICTORY" : "DEFEAT";
        this.resultTitle.color = victory ? "gold" : "red";
    }
    
    /**
     * 显示浮动文本
     */
    showFloatingText(text: string, color: string, position: Vector3): void {
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
    
    /**
     * 清理
     */
    dispose(): void {
        this.ui.dispose();
    }
}
