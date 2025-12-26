/**
 * 祭品召唤系统 (支持真正拖拽)
 * 
 * 实现:
 * - 祭坛区域 UI
 * - PC端: 鼠标拖拽怪兽到祭坛
 * - 手机端: 长按500ms启动拖拽
 * - 祭品数量验证
 * - 高级怪兽召唤
 */

import { Scene, TransformNode, Mesh, MeshBuilder, StandardMaterial, Color3, Vector3, Animation, PointerEventTypes, PointerInfo, AbstractMesh, ActionManager, ExecuteCodeAction } from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, Rectangle, Control, Button, Image, Ellipse } from '@babylonjs/gui';
import { ClMonsterMesh, MonsterDisplayData, MonsterAttribute, detectDeviceType, DeviceType } from './index';

/**
 * 待召唤的高级怪兽信息
 */
export interface TributeSummonTarget {
    name: string;
    level: number;
    attribute: MonsterAttribute;
    atk: number;
    def: number;
    requiredTributes: number;  // 需要的祭品数量
}

/**
 * 祭品系统状态
 */
export interface TributeState {
    isActive: boolean;
    targetMonster: TributeSummonTarget | null;
    selectedTributes: number[];  // 选中的怪兽槽位
}

/**
 * 祭品召唤系统
 */
export class ClTributeSystem {
    private scene: Scene;
    private root: TransformNode;
    
    // 祭坛 3D 元素
    private altarMesh: Mesh | null = null;
    private altarGlow: Mesh | null = null;
    
    // UI 元素
    private ui: AdvancedDynamicTexture;
    private tributePanel: Rectangle | null = null;
    private tributeInfo: TextBlock | null = null;
    private confirmBtn: Button | null = null;
    private cancelBtn: Button | null = null;
    
    // 状态
    private state: TributeState = {
        isActive: false,
        targetMonster: null,
        selectedTributes: []
    };
    
    // 怪兽槽位引用 (由外部设置)
    private playerMonsters: (ClMonsterMesh | null)[] = [];
    
    // 拖拽状态
    private deviceType: DeviceType;
    private isDragging: boolean = false;
    private dragSlot: number = -1;
    private dragGhost: Ellipse | null = null;  // 拖拽时的半透明副本
    private longPressTimer: number | null = null;
    private pointerObserver: any = null;
    
    // 回调
    public onTributeSummonComplete: ((targetSlot: number, monster: MonsterDisplayData, tributeSlots: number[]) => void) | null = null;
    public onCancel: (() => void) | null = null;

    constructor(scene: Scene, root: TransformNode, ui: AdvancedDynamicTexture) {
        this.scene = scene;
        this.root = root;
        this.ui = ui;
        this.deviceType = detectDeviceType();
        
        this.createAltar();
        this.createUI();
        this.hide();
    }

    /**
     * 创建祭坛 3D 模型
     */
    private createAltar(): void {
        // 祭坛基座 - 圆形平台
        this.altarMesh = MeshBuilder.CreateCylinder('altar', {
            height: 0.2,
            diameter: 3,
            tessellation: 32
        }, this.scene);
        this.altarMesh.position = new Vector3(0, 0.1, 0);  // 战场中央
        this.altarMesh.parent = this.root;
        
        const altarMat = new StandardMaterial('altarMat', this.scene);
        altarMat.diffuseColor = new Color3(0.4, 0.2, 0.6);
        altarMat.emissiveColor = new Color3(0.2, 0.1, 0.3);
        altarMat.alpha = 0.8;
        this.altarMesh.material = altarMat;
        
        // 发光圈
        this.altarGlow = MeshBuilder.CreateTorus('altarGlow', {
            diameter: 3.2,
            thickness: 0.1,
            tessellation: 32
        }, this.scene);
        this.altarGlow.position = new Vector3(0, 0.25, 0);
        this.altarGlow.parent = this.root;
        
        const glowMat = new StandardMaterial('glowMat', this.scene);
        glowMat.emissiveColor = new Color3(1, 0.5, 1);
        glowMat.alpha = 0.6;
        this.altarGlow.material = glowMat;
        
        // 旋转动画
        const rotateAnim = new Animation(
            'altarRotate',
            'rotation.y',
            30,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        rotateAnim.setKeys([
            { frame: 0, value: 0 },
            { frame: 120, value: Math.PI * 2 }
        ]);
        this.altarGlow.animations = [rotateAnim];
        this.scene.beginAnimation(this.altarGlow, 0, 120, true);
        
        // 点击祭坛处理
        this.altarMesh.actionManager = new ActionManager(this.scene);
        this.altarMesh.actionManager.registerAction(
            new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
                console.log('🔮 点击祭坛');
                // 可以添加点击反馈
            })
        );
    }

    /**
     * 创建祭品召唤 UI
     */
    private createUI(): void {
        // 祭品面板
        this.tributePanel = new Rectangle('tributePanel');
        this.tributePanel.width = '400px';
        this.tributePanel.height = '180px';
        this.tributePanel.cornerRadius = 10;
        this.tributePanel.background = '#1a1a2eEE';
        this.tributePanel.thickness = 2;
        this.tributePanel.color = '#9b59b6';
        this.tributePanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        this.tributePanel.top = '-50px';
        this.ui.addControl(this.tributePanel);
        
        // 标题
        const title = new TextBlock('tributeTitle');
        title.text = '🔮 祭品召唤';
        title.color = '#e74c3c';
        title.fontSize = 24;
        title.fontWeight = 'bold';
        title.height = '35px';
        title.top = '-60px';
        this.tributePanel.addControl(title);
        
        // 信息
        this.tributeInfo = new TextBlock('tributeInfo');
        this.tributeInfo.text = '选择要献祭的怪兽';
        this.tributeInfo.color = 'white';
        this.tributeInfo.fontSize = 18;
        this.tributeInfo.height = '50px';
        this.tributeInfo.top = '-15px';
        this.tributeInfo.textWrapping = true;
        this.tributePanel.addControl(this.tributeInfo);
        
        // 按钮容器
        const btnContainer = new Rectangle('btnContainer');
        btnContainer.height = '50px';
        btnContainer.top = '50px';
        btnContainer.thickness = 0;
        this.tributePanel.addControl(btnContainer);
        
        // 确认按钮
        this.confirmBtn = Button.CreateSimpleButton('confirmTribute', '确认召唤');
        this.confirmBtn.width = '120px';
        this.confirmBtn.height = '40px';
        this.confirmBtn.left = '-70px';
        this.confirmBtn.color = 'white';
        this.confirmBtn.background = '#27ae60';
        this.confirmBtn.onPointerClickObservable.add(() => {
            this.confirmTribute();
        });
        btnContainer.addControl(this.confirmBtn);
        
        // 取消按钮
        this.cancelBtn = Button.CreateSimpleButton('cancelTribute', '取消');
        this.cancelBtn.width = '100px';
        this.cancelBtn.height = '40px';
        this.cancelBtn.left = '70px';
        this.cancelBtn.color = 'white';
        this.cancelBtn.background = '#e74c3c';
        this.cancelBtn.onPointerClickObservable.add(() => {
            this.cancel();
        });
        btnContainer.addControl(this.cancelBtn);
    }

    /**
     * 设置玩家怪兽引用
     */
    public setPlayerMonsters(monsters: (ClMonsterMesh | null)[]): void {
        this.playerMonsters = monsters;
    }

    /**
     * 开始祭品召唤流程
     */
    public startTributeSummon(target: TributeSummonTarget): void {
        this.state = {
            isActive: true,
            targetMonster: target,
            selectedTributes: []
        };
        
        this.show();
        this.updateUI();
        this.enableMonsterSelection();
        
        console.log(`🔮 开始祭品召唤: ${target.name} (需要 ${target.requiredTributes} 个祭品)`);
    }

    /**
     * 更新 UI 显示
     */
    private updateUI(): void {
        if (!this.tributeInfo || !this.state.targetMonster) return;
        
        const target = this.state.targetMonster;
        const selected = this.state.selectedTributes.length;
        const required = target.requiredTributes;
        
        this.tributeInfo.text = 
            `召唤【${target.name}】★${target.level}\n` +
            `ATK:${target.atk} DEF:${target.def}\n` +
            `已选祭品: ${selected}/${required}`;
        
        // 更新确认按钮状态
        if (this.confirmBtn) {
            const canConfirm = selected >= required;
            this.confirmBtn.isEnabled = canConfirm;
            this.confirmBtn.background = canConfirm ? '#27ae60' : '#666666';
        }
    }

    /**
     * 启用怪兽选择 (支持拖拽)
     */
    private enableMonsterSelection(): void {
        // 高亮所有可选怪兽
        this.playerMonsters.forEach((monster, slot) => {
            if (!monster) return;
            monster.setHighlight(true, new Color3(1, 1, 0));
        });
        
        // 设置全局指针事件
        this.setupDragEvents();
    }
    
    /**
     * 设置拖拽事件
     */
    private setupDragEvents(): void {
        this.pointerObserver = this.scene.onPointerObservable.add((info: PointerInfo) => {
            if (!this.state.isActive) return;
            
            switch (info.type) {
                case PointerEventTypes.POINTERDOWN:
                    this.onPointerDown(info);
                    break;
                case PointerEventTypes.POINTERMOVE:
                    this.onPointerMove(info);
                    break;
                case PointerEventTypes.POINTERUP:
                    this.onPointerUp(info);
                    break;
            }
        });
    }
    
    /**
     * 指针按下
     */
    private onPointerDown(info: PointerInfo): void {
        const pickedMesh = info.pickInfo?.pickedMesh;
        if (!pickedMesh) return;
        
        // 查找点击的怪兽槽位
        const slot = this.findMonsterSlot(pickedMesh);
        if (slot < 0) return;
        
        if (this.deviceType === 'mobile') {
            // 手机端: 长按500ms启动拖拽
            this.longPressTimer = window.setTimeout(() => {
                this.startDrag(slot, info.event.clientX, info.event.clientY);
            }, 500);
        } else {
            // PC端: 直接开始拖拽
            this.startDrag(slot, info.event.clientX, info.event.clientY);
        }
    }
    
    /**
     * 指针移动
     */
    private onPointerMove(info: PointerInfo): void {
        // 取消长按计时器（手机端移动取消拖拽启动）
        if (this.longPressTimer && !this.isDragging) {
            window.clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        
        if (this.isDragging && this.dragGhost) {
            // 更新拖拽副本位置
            this.dragGhost.left = info.event.clientX + 'px';
            this.dragGhost.top = info.event.clientY + 'px';
            
            // 检查是否在祭坛上方
            this.checkAltarHover(info);
        }
    }
    
    /**
     * 指针抬起
     */
    private onPointerUp(info: PointerInfo): void {
        if (this.longPressTimer) {
            window.clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        
        if (this.isDragging) {
            this.endDrag(info);
        }
    }
    
    /**
     * 查找怪兽槽位
     */
    private findMonsterSlot(mesh: AbstractMesh): number {
        for (let i = 0; i < this.playerMonsters.length; i++) {
            if (this.playerMonsters[i]?.mesh === mesh) {
                return i;
            }
        }
        return -1;
    }
    
    /**
     * 开始拖拽
     */
    private startDrag(slot: number, x: number, y: number): void {
        this.isDragging = true;
        this.dragSlot = slot;
        
        const monster = this.playerMonsters[slot];
        if (!monster) return;
        
        // 创建拖拽副本 (半透明圆形)
        const ghost = new Ellipse('dragGhost');
        ghost.width = '60px';
        ghost.height = '60px';
        ghost.thickness = 3;
        ghost.color = '#FFD700';
        ghost.background = '#FF0000AA';
        ghost.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        ghost.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        ghost.left = x + 'px';
        ghost.top = y + 'px';
        this.ui.addControl(ghost);
        
        // 添加怪兽名称
        const label = new TextBlock('ghostLabel', monster.data.name);
        label.color = 'white';
        label.fontSize = 12;
        ghost.addControl(label);
        
        this.dragGhost = ghost;
        console.log(`🔮 开始拖拽: 槽位 ${slot} - ${monster.data.name}`);
    }
    
    /**
     * 检查祭坛悬停
     */
    private checkAltarHover(info: PointerInfo): void {
        if (!this.altarMesh) return;
        
        const pickResult = this.scene.pick(info.event.clientX, info.event.clientY);
        if (pickResult?.pickedMesh === this.altarMesh) {
            // 在祭坛上方 - 高亮祭坛
            const mat = this.altarMesh.material as StandardMaterial;
            mat.emissiveColor = new Color3(0.5, 0.3, 0.8);
        } else {
            // 不在祭坛上方
            const mat = this.altarMesh.material as StandardMaterial;
            mat.emissiveColor = new Color3(0.2, 0.1, 0.3);
        }
    }
    
    /**
     * 结束拖拽
     */
    private endDrag(info: PointerInfo): void {
        // 清理拖拽副本
        if (this.dragGhost) {
            this.dragGhost.dispose();
            this.dragGhost = null;
        }
        
        // 检查是否放在祭坛上
        const pickResult = this.scene.pick(info.event.clientX, info.event.clientY);
        if (pickResult?.pickedMesh === this.altarMesh && this.dragSlot >= 0) {
            // 成功放入祭坛
            this.addTribute(this.dragSlot);
        }
        
        this.isDragging = false;
        this.dragSlot = -1;
        
        // 恢复祭坛颜色
        if (this.altarMesh) {
            const mat = this.altarMesh.material as StandardMaterial;
            mat.emissiveColor = new Color3(0.2, 0.1, 0.3);
        }
    }
    
    /**
     * 添加祭品
     */
    private addTribute(slot: number): void {
        if (this.state.selectedTributes.includes(slot)) {
            console.log(`🔮 槽位 ${slot} 已经是祭品`);
            return;
        }
        
        this.state.selectedTributes.push(slot);
        const monster = this.playerMonsters[slot];
        monster?.setHighlight(true, new Color3(1, 0, 0));  // 红色表示已选
        
        console.log(`🔮 添加祭品: 槽位 ${slot}`);
        this.updateUI();
    }

    /**
     * 确认祭品召唤
     */
    private confirmTribute(): void {
        const target = this.state.targetMonster;
        if (!target) return;
        
        const selected = this.state.selectedTributes;
        if (selected.length < target.requiredTributes) {
            console.warn('祭品数量不足');
            return;
        }
        
        // 找到第一个空槽位或使用第一个祭品的槽位
        const targetSlot = selected[0];
        
        // 创建高级怪兽数据
        const newMonster: MonsterDisplayData = {
            id: `tribute_${Date.now()}`,
            name: target.name,
            attribute: target.attribute,
            atk: target.atk,
            def: target.def,
            hp: target.atk,  // 暂用 ATK 作为 HP
            maxHp: target.atk,
            position: 'attack'  // 祭品召唤默认攻击表示
        };
        
        console.log(`🔮 祭品召唤成功! ${selected.length} 个祭品 → ${target.name}`);
        
        // 触发回调
        this.onTributeSummonComplete?.(targetSlot, newMonster, [...selected]);
        
        this.hide();
        this.reset();
    }

    /**
     * 取消祭品召唤
     */
    private cancel(): void {
        console.log('🔮 取消祭品召唤');
        this.hide();
        this.reset();
        this.onCancel?.();
    }

    /**
     * 重置状态
     */
    private reset(): void {
        // 清除拖拽事件
        if (this.pointerObserver) {
            this.scene.onPointerObservable.remove(this.pointerObserver);
            this.pointerObserver = null;
        }
        
        // 清除拖拽副本
        if (this.dragGhost) {
            this.dragGhost.dispose();
            this.dragGhost = null;
        }
        
        // 清除长按计时器
        if (this.longPressTimer) {
            window.clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        
        // 清除怪兽高亮
        this.playerMonsters.forEach(monster => {
            if (monster) {
                monster.setHighlight(false);
            }
        });
        
        this.isDragging = false;
        this.dragSlot = -1;
        
        this.state = {
            isActive: false,
            targetMonster: null,
            selectedTributes: []
        };
    }

    /**
     * 显示祭品系统
     */
    public show(): void {
        if (this.altarMesh) this.altarMesh.setEnabled(true);
        if (this.altarGlow) this.altarGlow.setEnabled(true);
        if (this.tributePanel) this.tributePanel.isVisible = true;
    }

    /**
     * 隐藏祭品系统
     */
    public hide(): void {
        if (this.altarMesh) this.altarMesh.setEnabled(false);
        if (this.altarGlow) this.altarGlow.setEnabled(false);
        if (this.tributePanel) this.tributePanel.isVisible = false;
    }

    /**
     * 销毁
     */
    public dispose(): void {
        this.altarMesh?.dispose();
        this.altarGlow?.dispose();
        this.tributePanel?.dispose();
        this.reset();
    }
}
