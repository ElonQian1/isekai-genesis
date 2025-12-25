/**
 * 目标选择 UI
 * 
 * 模块: client/ui
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import {
    Scene,
    Mesh,
    MeshBuilder,
    Vector3,
    Color3,
    StandardMaterial,
    HighlightLayer,
    ActionManager,
    ExecuteCodeAction,
} from '@babylonjs/core';
import {
    AdvancedDynamicTexture,
    Rectangle,
    TextBlock,
    Button,
    Control,
    StackPanel,
} from '@babylonjs/gui';

// =============================================================================
// 目标类型
// =============================================================================

export interface ClTarget {
    id: string;
    name: string;
    type: 'player' | 'minion' | 'hero';
    position: Vector3;
    isEnemy: boolean;
}

// =============================================================================
// 目标选择配置
// =============================================================================

const CL_TARGET_CONFIG = {
    HIGHLIGHT_COLOR: new Color3(1, 0.8, 0),
    ENEMY_COLOR: new Color3(1, 0.2, 0.2),
    FRIENDLY_COLOR: new Color3(0.2, 0.8, 0.2),
    INDICATOR_SIZE: 0.5,
};

// =============================================================================
// 目标选择 UI
// =============================================================================

export class ClTargetSelector {
    private scene: Scene;
    private gui: AdvancedDynamicTexture;
    private highlightLayer: HighlightLayer;
    
    // 目标指示器
    private targetIndicators: Map<string, Mesh> = new Map();
    private targetMeshes: Map<string, Mesh> = new Map();
    
    // 状态
    private isActive: boolean = false;
    private availableTargets: ClTarget[] = [];
    private selectedTarget: ClTarget | null = null;
    
    // UI 元素
    private selectionPanel: Rectangle | null = null;
    private cancelButton: Button | null = null;
    
    // 回调
    public onTargetSelected: ((target: ClTarget) => void) | null = null;
    public onSelectionCanceled: (() => void) | null = null;

    constructor(scene: Scene, gui: AdvancedDynamicTexture) {
        this.scene = scene;
        this.gui = gui;
        
        // 创建高亮层
        this.highlightLayer = new HighlightLayer('targetHighlight', scene);
        this.highlightLayer.outerGlow = true;
        
        // 创建 UI
        this.createUI();
    }

    /**
     * 创建 UI
     */
    private createUI(): void {
        // 选择面板 (显示在顶部)
        this.selectionPanel = new Rectangle('selectionPanel');
        this.selectionPanel.width = '300px';
        this.selectionPanel.height = '80px';
        this.selectionPanel.cornerRadius = 10;
        this.selectionPanel.color = 'white';
        this.selectionPanel.thickness = 2;
        this.selectionPanel.background = 'rgba(0, 0, 0, 0.8)';
        this.selectionPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this.selectionPanel.top = '100px';
        this.selectionPanel.isVisible = false;
        this.gui.addControl(this.selectionPanel);
        
        // 堆栈面板
        const stack = new StackPanel('selectionStack');
        stack.isVertical = true;
        this.selectionPanel.addControl(stack);
        
        // 提示文本
        const tipText = new TextBlock('tipText', '选择一个目标');
        tipText.color = '#ffd700';
        tipText.fontSize = 18;
        tipText.height = '30px';
        tipText.paddingTop = '10px';
        stack.addControl(tipText);
        
        // 取消按钮
        this.cancelButton = Button.CreateSimpleButton('cancelBtn', '取消');
        this.cancelButton.width = '100px';
        this.cancelButton.height = '35px';
        this.cancelButton.color = 'white';
        this.cancelButton.background = '#e94560';
        this.cancelButton.cornerRadius = 5;
        this.cancelButton.onPointerUpObservable.add(() => {
            this.cancel();
        });
        stack.addControl(this.cancelButton);
    }

    /**
     * 开始选择目标
     */
    startSelection(targets: ClTarget[]): void {
        this.availableTargets = targets;
        this.selectedTarget = null;
        this.isActive = true;
        
        // 显示 UI
        if (this.selectionPanel) {
            this.selectionPanel.isVisible = true;
        }
        
        // 为每个目标创建指示器
        this.createTargetIndicators();
    }

    /**
     * 创建目标指示器
     */
    private createTargetIndicators(): void {
        this.clearIndicators();
        
        for (const target of this.availableTargets) {
            // 创建指示器网格 (发光环)
            const indicator = MeshBuilder.CreateTorus(
                `targetIndicator_${target.id}`,
                {
                    diameter: CL_TARGET_CONFIG.INDICATOR_SIZE * 2,
                    thickness: 0.1,
                    tessellation: 32,
                },
                this.scene
            );
            indicator.position = target.position.clone();
            indicator.position.y = 0.1;
            indicator.rotation.x = Math.PI / 2;
            
            // 材质
            const mat = new StandardMaterial(`targetMat_${target.id}`, this.scene);
            mat.emissiveColor = target.isEnemy 
                ? CL_TARGET_CONFIG.ENEMY_COLOR 
                : CL_TARGET_CONFIG.FRIENDLY_COLOR;
            mat.alpha = 0.8;
            indicator.material = mat;
            
            // 高亮
            this.highlightLayer.addMesh(indicator, 
                target.isEnemy ? CL_TARGET_CONFIG.ENEMY_COLOR : CL_TARGET_CONFIG.FRIENDLY_COLOR);
            
            // 交互
            indicator.actionManager = new ActionManager(this.scene);
            indicator.actionManager.registerAction(
                new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
                    this.selectTarget(target);
                })
            );
            indicator.actionManager.registerAction(
                new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
                    this.hoverTarget(target, true);
                })
            );
            indicator.actionManager.registerAction(
                new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
                    this.hoverTarget(target, false);
                })
            );
            
            this.targetIndicators.set(target.id, indicator);
            
            // 创建目标区域 (更大的点击区域)
            const targetMesh = MeshBuilder.CreateCylinder(
                `targetArea_${target.id}`,
                {
                    height: 0.1,
                    diameter: CL_TARGET_CONFIG.INDICATOR_SIZE * 3,
                },
                this.scene
            );
            targetMesh.position = target.position.clone();
            targetMesh.position.y = 0.05;
            targetMesh.visibility = 0; // 不可见但可点击
            
            targetMesh.actionManager = new ActionManager(this.scene);
            targetMesh.actionManager.registerAction(
                new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
                    this.selectTarget(target);
                })
            );
            
            this.targetMeshes.set(target.id, targetMesh);
        }
        
        // 动画效果：环旋转
        this.scene.registerBeforeRender(() => {
            if (!this.isActive) return;
            
            for (const indicator of this.targetIndicators.values()) {
                indicator.rotation.z += 0.02;
            }
        });
    }

    /**
     * 悬停目标
     */
    private hoverTarget(target: ClTarget, hover: boolean): void {
        const indicator = this.targetIndicators.get(target.id);
        if (!indicator) return;
        
        if (hover) {
            indicator.scaling.setAll(1.2);
            this.highlightLayer.blurHorizontalSize = 1;
            this.highlightLayer.blurVerticalSize = 1;
        } else {
            indicator.scaling.setAll(1);
            this.highlightLayer.blurHorizontalSize = 0.5;
            this.highlightLayer.blurVerticalSize = 0.5;
        }
    }

    /**
     * 选择目标
     */
    private selectTarget(target: ClTarget): void {
        if (!this.isActive) return;
        
        this.selectedTarget = target;
        this.endSelection();
        this.onTargetSelected?.(target);
    }

    /**
     * 取消选择
     */
    cancel(): void {
        this.selectedTarget = null;
        this.endSelection();
        this.onSelectionCanceled?.();
    }

    /**
     * 结束选择
     */
    private endSelection(): void {
        this.isActive = false;
        
        // 隐藏 UI
        if (this.selectionPanel) {
            this.selectionPanel.isVisible = false;
        }
        
        // 清除指示器
        this.clearIndicators();
    }

    /**
     * 清除指示器
     */
    private clearIndicators(): void {
        for (const indicator of this.targetIndicators.values()) {
            this.highlightLayer.removeMesh(indicator);
            indicator.dispose();
        }
        this.targetIndicators.clear();
        
        for (const mesh of this.targetMeshes.values()) {
            mesh.dispose();
        }
        this.targetMeshes.clear();
    }

    /**
     * 是否正在选择
     */
    isSelecting(): boolean {
        return this.isActive;
    }

    /**
     * 获取选中的目标
     */
    getSelectedTarget(): ClTarget | null {
        return this.selectedTarget;
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.clearIndicators();
        this.highlightLayer.dispose();
        this.selectionPanel?.dispose();
    }
}
