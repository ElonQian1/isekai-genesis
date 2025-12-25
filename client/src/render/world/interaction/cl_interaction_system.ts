/**
 * 交互系统 - 处理鼠标悬停、点击和高亮
 * 
 * 模块: client/render/world/interaction
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责：
 * - 射线检测 (Raycast)
 * - 高亮可交互物体
 * - 显示浮动标签 (Tooltip)
 * - 处理点击事件
 */

import {
    Scene,
    Mesh,
    Color3,
    HighlightLayer,
    PointerEventTypes,
    Observer,
    PointerInfo,
    AbstractMesh
} from '@babylonjs/core';
import {
    AdvancedDynamicTexture,
    Rectangle,
    TextBlock
} from '@babylonjs/gui';

export class ClInteractionSystem {
    private scene: Scene;
    private highlightLayer: HighlightLayer;
    private gui: AdvancedDynamicTexture;
    
    // 状态
    private currentHoverMesh: AbstractMesh | null = null;
    private pointerObserver: Observer<PointerInfo> | null = null;
    
    // UI 元素
    private tooltipContainer: Rectangle | null = null;
    private tooltipText: TextBlock | null = null;
    private tooltipSubText: TextBlock | null = null;
    
    // 事件回调
    public onInteract: ((mesh: AbstractMesh, type: string) => void) | null = null;

    constructor(scene: Scene) {
        this.scene = scene;
        
        // 1. 创建高亮层
        this.highlightLayer = new HighlightLayer('interactionHighlight', scene);
        this.highlightLayer.outerGlow = true;
        this.highlightLayer.innerGlow = false;
        this.highlightLayer.blurHorizontalSize = 1;
        this.highlightLayer.blurVerticalSize = 1;
        
        // 2. 创建 GUI
        this.gui = AdvancedDynamicTexture.CreateFullscreenUI('interactionUI', true, scene);
        
        // 3. 创建 Tooltip
        this.createTooltip();
    }

    /**
     * 初始化
     */
    init(): void {
        this.setupPointerObserver();
        console.log('✅ 交互系统初始化完成');
    }

    /**
     * 创建浮动提示框
     */
    private createTooltip(): void {
        // 容器
        this.tooltipContainer = new Rectangle('tooltipContainer');
        this.tooltipContainer.width = '200px';
        this.tooltipContainer.height = '80px';
        this.tooltipContainer.cornerRadius = 5;
        this.tooltipContainer.color = '#d4b483'; // 金色边框
        this.tooltipContainer.thickness = 2;
        this.tooltipContainer.background = 'rgba(20, 20, 30, 0.85)'; // 深色背景
        this.tooltipContainer.isVisible = false;
        this.tooltipContainer.isHitTestVisible = false; // 不阻挡鼠标
        this.tooltipContainer.linkOffsetY = -50; // 在目标上方
        this.gui.addControl(this.tooltipContainer);
        
        // 标题
        this.tooltipText = new TextBlock('tooltipTitle');
        this.tooltipText.text = '';
        this.tooltipText.color = '#ffffff';
        this.tooltipText.fontSize = 18;
        this.tooltipText.fontWeight = 'bold';
        this.tooltipText.top = '-15px';
        this.tooltipContainer.addControl(this.tooltipText);
        
        // 描述
        this.tooltipSubText = new TextBlock('tooltipDesc');
        this.tooltipSubText.text = '';
        this.tooltipSubText.color = '#aaaaaa';
        this.tooltipSubText.fontSize = 12;
        this.tooltipSubText.top = '15px';
        this.tooltipSubText.textWrapping = true;
        this.tooltipContainer.addControl(this.tooltipSubText);
    }

    /**
     * 设置鼠标监听
     */
    private setupPointerObserver(): void {
        this.pointerObserver = this.scene.onPointerObservable.add((pointerInfo) => {
            switch (pointerInfo.type) {
                case PointerEventTypes.POINTERMOVE:
                    this.handlePointerMove(pointerInfo);
                    break;
                case PointerEventTypes.POINTERDOWN:
                    this.handlePointerDown(pointerInfo);
                    break;
            }
        });
    }

    /**
     * 处理鼠标移动 (悬停高亮)
     */
    private handlePointerMove(info: PointerInfo): void {
        if (!info.pickInfo || !info.pickInfo.hit) {
            this.clearHighlight();
            return;
        }
        
        const mesh = info.pickInfo.pickedMesh;
        if (!mesh) {
            this.clearHighlight();
            return;
        }
        
        // 检查是否是同一个物体
        if (this.currentHoverMesh === mesh) {
            return;
        }
        
        // 检查是否有交互元数据
        if (this.isInteractable(mesh)) {
            this.setHighlight(mesh);
        } else {
            this.clearHighlight();
        }
    }
    
    /**
     * 处理鼠标点击
     */
    private handlePointerDown(info: PointerInfo): void {
        if (!info.pickInfo || !info.pickInfo.hit) return;
        
        const mesh = info.pickInfo.pickedMesh;
        if (mesh && this.isInteractable(mesh)) {
            const meta = mesh.metadata;
            console.log(`🖱️ 点击了: ${meta.name} (${meta.description})`);
            
            // 这里可以触发具体的交互逻辑，比如打开对话框、拾取物品等
            // 目前仅做简单的视觉反馈（比如闪烁一下）
            this.highlightLayer.innerGlow = true;
            setTimeout(() => {
                this.highlightLayer.innerGlow = false;
            }, 200);
            
            // 触发回调
            if (this.onInteract) {
                // 根据物体名称或类型判断交互类型
                let type = 'default';
                if (meta.name.includes('松') || meta.name.includes('竹')) type = 'gather';
                if (meta.name.includes('亭') || meta.name.includes('椅')) type = 'rest';
                
                this.onInteract(mesh, type);
            }
        }
    }

    /**
     * 检查物体是否可交互
     */
    private isInteractable(mesh: AbstractMesh): boolean {
        return mesh.metadata && mesh.metadata.type === 'interactable';
    }

    /**
     * 设置高亮
     */
    private setHighlight(mesh: AbstractMesh): void {
        // 清除旧的高亮
        this.clearHighlight();
        
        this.currentHoverMesh = mesh;
        
        // 添加高亮 (如果是 Mesh 类型)
        if (mesh instanceof Mesh) {
            this.highlightLayer.addMesh(mesh, Color3.White());
        }
        
        // 显示 Tooltip
        const meta = mesh.metadata;
        if (this.tooltipText) this.tooltipText.text = meta.name || '未知物体';
        if (this.tooltipSubText) this.tooltipSubText.text = meta.description || '';
        if (this.tooltipContainer) {
            this.tooltipContainer.isVisible = true;
            this.tooltipContainer.linkWithMesh(mesh);
        }
    }

    /**
     * 清除高亮
     */
    private clearHighlight(): void {
        if (this.currentHoverMesh) {
            if (this.currentHoverMesh instanceof Mesh) {
                this.highlightLayer.removeMesh(this.currentHoverMesh);
            }
            this.currentHoverMesh = null;
        }
        
        if (this.tooltipContainer) {
            this.tooltipContainer.isVisible = false;
        }
    }

    /**
     * 销毁
     */
    dispose(): void {
        if (this.pointerObserver) {
            this.scene.onPointerObservable.remove(this.pointerObserver);
            this.pointerObserver = null;
        }
        
        this.highlightLayer.dispose();
        this.gui.dispose();
    }
}
