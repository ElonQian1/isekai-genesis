/**
 * 编辑器 UI 主协调器 - 整合所有子面板
 * 
 * 模块: client/render/world/ui
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责:
 * 1. 协调各子面板的创建和交互
 * 2. 管理主面板显示/隐藏
 * 3. 委托文件操作给 ClFileOperations
 * 
 * 子模块:
 * - ClPropertyPanel: 属性编辑面板
 * - ClHierarchyPanel: 层级列表面板
 * - ClBrushPanel: 笔刷工具面板
 * - ClAssetPanel: 资源库面板
 * - ClEnvPanel: 环境设置面板
 * - ClFileOperations: 文件操作
 * - ClUIFactory: UI 组件工厂
 */

import { 
    AdvancedDynamicTexture, 
    Button, 
    Control, 
    StackPanel, 
    TextBlock, 
    Rectangle,
    ScrollViewer,
    Checkbox,
} from "@babylonjs/gui";
import { Scene, ArcRotateCamera } from "@babylonjs/core";
import { ClAssetManager } from "../cl_asset_manager";
import { ClEditorManager } from "../editor/cl_editor_manager";
import { ClLevelLoader } from "../core/cl_level_loader";

// 导入子面板
import { ClPropertyPanel } from "./cl_property_panel";
import { ClHierarchyPanel } from "./cl_hierarchy_panel";
import { ClBrushPanel } from "./cl_brush_panel";
import { ClAssetPanel } from "./cl_asset_panel";
import { ClEnvPanel } from "./cl_env_panel";
import { ClFileOperations } from "./cl_file_operations";
import { ClUIFactory } from "./cl_ui_factory";

export class ClEditorUI {
    private scene: Scene;
    private gui: AdvancedDynamicTexture;
    private editorManager: ClEditorManager | null = null;
    private levelLoader: ClLevelLoader | null = null;
    private mainPanel: Rectangle | null = null;
    private isVisible: boolean = false;
    
    // 子模块
    private propertyPanel: ClPropertyPanel;
    private hierarchyPanel: ClHierarchyPanel;
    private brushPanel: ClBrushPanel;
    private assetPanel: ClAssetPanel;
    private envPanel: ClEnvPanel;
    private fileOperations: ClFileOperations;
    
    // 滚轮事件拦截器
    private wheelEventHandler: ((e: WheelEvent) => void) | null = null;
    private savedWheelPrecision: number = 20;
    
    // 敌人选中追踪
    private lastSelectedEnemyId: string | null = null;

    constructor(
        scene: Scene, 
        gui: AdvancedDynamicTexture, 
        assetManager: ClAssetManager,
        editorManager: ClEditorManager | null = null,
        levelLoader: ClLevelLoader | null = null
    ) {
        this.scene = scene;
        this.gui = gui;
        this.editorManager = editorManager;
        this.levelLoader = levelLoader;
        
        // 初始化文件操作模块
        this.fileOperations = new ClFileOperations(scene, assetManager, levelLoader);
        this.fileOperations.setCallbacks(
            () => this.refreshHierarchy(),
            () => this.refreshHierarchy()
        );
        
        // 初始化子面板
        this.propertyPanel = new ClPropertyPanel(levelLoader);
        this.hierarchyPanel = new ClHierarchyPanel(editorManager);
        this.brushPanel = new ClBrushPanel(editorManager, levelLoader);
        this.assetPanel = new ClAssetPanel(scene, assetManager, levelLoader);
        this.envPanel = new ClEnvPanel(scene);
        
        // 设置 UI 辅助回调
        this.setupUIHelpers();
        
        this.createUI();
        this.setupSelectionCallback();
    }

    /**
     * 设置子面板的 UI 辅助回调
     */
    private setupUIHelpers(): void {
        const createSectionTitle = (parent: StackPanel, text: string, color: string) => {
            ClUIFactory.createSectionTitle(parent, text, color);
        };
        const addSpacer = (parent: StackPanel, height: number) => {
            ClUIFactory.addSpacer(parent, height);
        };
        
        this.propertyPanel.setUIHelpers(createSectionTitle, addSpacer);
        this.hierarchyPanel.setUIHelpers(createSectionTitle, addSpacer);
        this.brushPanel.setUIHelpers(createSectionTitle);
        this.assetPanel.setUIHelpers(
            createSectionTitle,
            () => this.refreshHierarchy(),
            (filename: string) => this.fileOperations.spawnUploadedModel(filename)
        );
    }

    /**
     * 设置选中变化回调
     */
    private setupSelectionCallback(): void {
        if (this.editorManager) {
            this.editorManager.setSelectionChangedCallback((mesh) => {
                this.propertyPanel.update(mesh);
                this.hierarchyPanel.updateSelection(mesh);
                
                // 处理敌人调试可视化
                if (this.levelLoader) {
                    const enemySystem = (this.levelLoader as any).enemySystem;
                    if (enemySystem) {
                        if (mesh && mesh.metadata && mesh.metadata.type === 'enemy') {
                            enemySystem.showDebugGizmos(mesh.name);
                        } else if (this.lastSelectedEnemyId) {
                            enemySystem.hideDebugGizmos(this.lastSelectedEnemyId);
                            this.lastSelectedEnemyId = null;
                        }
                    }
                }
            });
        }
    }

    // =========================================================================
    // UI 创建
    // =========================================================================

    private createUI(): void {
        // 主面板
        this.mainPanel = new Rectangle("editorPanel");
        this.mainPanel.width = "400px";
        this.mainPanel.height = "95%";
        this.mainPanel.background = "#1a1a1aee";
        this.mainPanel.color = "#4a9eff";
        this.mainPanel.thickness = 3;
        this.mainPanel.cornerRadius = 12;
        this.mainPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        this.mainPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        this.mainPanel.left = "-20px";
        this.mainPanel.isVisible = false;
        this.gui.addControl(this.mainPanel);

        // 滚动视图
        const mainScrollView = new ScrollViewer("mainScroll");
        mainScrollView.width = "100%";
        mainScrollView.height = "100%";
        mainScrollView.thickness = 0;
        mainScrollView.barSize = 12;
        mainScrollView.barColor = "#4a9eff";
        mainScrollView.barBackground = "#333";
        this.mainPanel.addControl(mainScrollView);

        const stackPanel = new StackPanel();
        stackPanel.width = "100%";
        stackPanel.paddingLeft = "15px";
        stackPanel.paddingRight = "15px";
        mainScrollView.addControl(stackPanel);

        // 标题栏
        this.createHeader(stackPanel);
        
        // 快捷帮助
        this.createHelpPanel(stackPanel);
        this.addSpacer(stackPanel, 10);

        // 上传区域
        this.createUploadSection(stackPanel);
        this.addSpacer(stackPanel, 15);

        // 编辑工具栏
        this.createToolbar(stackPanel);
        this.addSpacer(stackPanel, 10);

        // 笔刷工具
        this.brushPanel.create(stackPanel);
        this.addSpacer(stackPanel, 10);

        // 操作按钮
        this.createOperationButtons(stackPanel);
        this.addSpacer(stackPanel, 15);

        // 资源库
        this.assetPanel.create(stackPanel);
        this.addSpacer(stackPanel, 15);

        // 层级面板
        this.hierarchyPanel.create(stackPanel);

        // 属性面板
        this.propertyPanel.create(stackPanel);

        // 精准工具
        this.createPrecisionPanel(stackPanel);

        // 环境设置
        this.envPanel.create(stackPanel);
        this.addSpacer(stackPanel, 15);

        // 保存/加载
        this.createFileOperations(stackPanel);
        this.addSpacer(stackPanel, 20);
    }

    private createHeader(parent: StackPanel): void {
        const headerPanel = new StackPanel();
        headerPanel.isVertical = false;
        headerPanel.height = "60px";
        headerPanel.width = "100%";
        parent.addControl(headerPanel);

        const title = new TextBlock();
        title.text = "🎨 创意工坊";
        title.color = "#4a9eff";
        title.width = "250px";
        title.fontSize = 26;
        title.fontWeight = "bold";
        title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        headerPanel.addControl(title);

        const closeBtn = Button.CreateSimpleButton("closeBtn", "✕");
        closeBtn.width = "40px";
        closeBtn.height = "40px";
        closeBtn.color = "white";
        closeBtn.background = "#d9534f";
        closeBtn.cornerRadius = 20;
        closeBtn.fontSize = 20;
        closeBtn.onPointerClickObservable.add(() => this.toggle());
        headerPanel.addControl(closeBtn);
    }

    private createHelpPanel(parent: StackPanel): void {
        const helpContainer = new Rectangle();
        helpContainer.width = "100%";
        helpContainer.height = "130px";
        helpContainer.background = "#1e3a5f";
        helpContainer.cornerRadius = 8;
        helpContainer.thickness = 1;
        helpContainer.color = "#4a9eff";
        parent.addControl(helpContainer);

        const helpStack = new StackPanel();
        helpStack.paddingTop = "10px";
        helpStack.paddingLeft = "15px";
        helpContainer.addControl(helpStack);

        const helpTitle = new TextBlock();
        helpTitle.text = "⌨️ 快捷键";
        helpTitle.color = "#4a9eff";
        helpTitle.height = "25px";
        helpTitle.fontSize = 16;
        helpTitle.fontWeight = "bold";
        helpTitle.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        helpStack.addControl(helpTitle);

        const shortcuts = [
            "E - 打开/关闭编辑器",
            "Delete - 删除选中物体",
            "Ctrl+D - 复制选中物体",
            "左键 - 选择物体",
            "拖拽 Gizmo - 移动/旋转/缩放"
        ];

        shortcuts.forEach(text => {
            const line = new TextBlock();
            line.text = text;
            line.color = "#aaccff";
            line.height = "18px";
            line.fontSize = 12;
            line.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            helpStack.addControl(line);
        });
    }

    private createUploadSection(parent: StackPanel): void {
        ClUIFactory.createSectionTitle(parent, "📤 上传模型", "#007ACC");
        
        const uploadBtn = Button.CreateSimpleButton("uploadBtn", "选择文件上传 (.glb / .gltf)");
        uploadBtn.width = "100%";
        uploadBtn.height = "50px";
        uploadBtn.color = "white";
        uploadBtn.background = "#007ACC";
        uploadBtn.cornerRadius = 8;
        uploadBtn.fontSize = 16;
        uploadBtn.onPointerClickObservable.add(() => this.fileOperations.triggerFileSelect());
        parent.addControl(uploadBtn);
    }

    private createToolbar(parent: StackPanel): void {
        this.createSectionTitle(parent, "🛠️ 编辑工具", "#f0ad4e");
        
        const toolsPanel = new StackPanel();
        toolsPanel.isVertical = false;
        toolsPanel.height = "50px";
        toolsPanel.width = "100%";
        parent.addControl(toolsPanel);
        
        const createToolBtn = (name: string, icon: string, label: string, type: 'position' | 'rotation' | 'scale' | 'none', color: string) => {
            const btn = Button.CreateSimpleButton(name, `${icon}\n${label}`);
            btn.width = "80px";
            btn.height = "45px";
            btn.color = "white";
            btn.background = color;
            btn.cornerRadius = 6;
            btn.fontSize = 12;
            btn.paddingRight = "5px";
            btn.onPointerClickObservable.add(() => {
                if (this.editorManager) {
                    this.editorManager.setGizmoType(type);
                }
            });
            return btn;
        };
        
        toolsPanel.addControl(createToolBtn("moveBtn", "↔️", "移动", "position", "#5cb85c"));
        toolsPanel.addControl(createToolBtn("rotBtn", "🔄", "旋转", "rotation", "#5bc0de"));
        toolsPanel.addControl(createToolBtn("scaleBtn", "📐", "缩放", "scale", "#f0ad4e"));
        toolsPanel.addControl(createToolBtn("noneBtn", "🚫", "取消", "none", "#777"));
    }

    private createOperationButtons(parent: StackPanel): void {
        const opsPanel = new StackPanel();
        opsPanel.isVertical = false;
        opsPanel.height = "45px";
        opsPanel.width = "100%";
        parent.addControl(opsPanel);

        const createOpBtn = (name: string, icon: string, label: string, action: () => void, color: string) => {
            const btn = Button.CreateSimpleButton(name, `${icon} ${label}`);
            btn.width = "110px";
            btn.height = "40px";
            btn.color = "white";
            btn.background = color;
            btn.cornerRadius = 6;
            btn.fontSize = 14;
            btn.paddingRight = "5px";
            btn.onPointerClickObservable.add(action);
            return btn;
        };

        opsPanel.addControl(createOpBtn("delBtn", "🗑️", "删除", () => {
            this.editorManager?.deleteSelected();
            setTimeout(() => this.refreshHierarchy(), 100);
        }, "#d9534f"));

        opsPanel.addControl(createOpBtn("dupBtn", "📋", "复制", () => {
            this.editorManager?.duplicateSelected();
            setTimeout(() => this.refreshHierarchy(), 100);
        }, "#5cb85c"));

        opsPanel.addControl(createOpBtn("wpBtn", "📍", "路径点", () => {
            if (this.levelLoader) {
                const cam = this.scene.activeCamera;
                if (cam) {
                    const forward = cam.getForwardRay().direction;
                    const pos = cam.position.add(forward.scale(8));
                    pos.y = this.levelLoader.getTerrainHeight(pos.x, pos.z);
                    this.levelLoader.spawnEntity('waypoint', 'waypoint', pos);
                }
            }
        }, "#5bc0de"));
    }

    private createPrecisionPanel(parent: StackPanel): void {
        this.createSectionTitle(parent, "🎯 精准工具", "#f0ad4e");

        // 网格吸附
        const gridPanel = new StackPanel();
        gridPanel.isVertical = false;
        gridPanel.height = "40px";
        gridPanel.width = "100%";
        parent.addControl(gridPanel);

        const gridCheckbox = new Checkbox();
        gridCheckbox.width = "25px";
        gridCheckbox.height = "25px";
        gridCheckbox.isChecked = false;
        gridCheckbox.color = "#5cb85c";
        gridCheckbox.background = "#333";
        gridCheckbox.onIsCheckedChangedObservable.add((value) => {
            if (this.editorManager) {
                this.editorManager.setPositionSnap(value ? 1 : 0);
            }
        });
        gridPanel.addControl(gridCheckbox);

        const gridLabel = new TextBlock();
        gridLabel.text = "  网格吸附 (1m)";
        gridLabel.width = "300px";
        gridLabel.height = "25px";
        gridLabel.color = "white";
        gridLabel.fontSize = 14;
        gridLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        gridPanel.addControl(gridLabel);

        // 角度吸附
        const anglePanel = new StackPanel();
        anglePanel.isVertical = false;
        anglePanel.height = "40px";
        anglePanel.width = "100%";
        parent.addControl(anglePanel);

        const angleCheckbox = new Checkbox();
        angleCheckbox.width = "25px";
        angleCheckbox.height = "25px";
        angleCheckbox.isChecked = false;
        angleCheckbox.color = "#5bc0de";
        angleCheckbox.background = "#333";
        angleCheckbox.onIsCheckedChangedObservable.add((value) => {
            if (this.editorManager) {
                this.editorManager.setRotationSnap(value ? 45 : 0);
            }
        });
        anglePanel.addControl(angleCheckbox);

        const angleLabel = new TextBlock();
        angleLabel.text = "  角度吸附 (45°)";
        angleLabel.width = "300px";
        angleLabel.height = "25px";
        angleLabel.color = "white";
        angleLabel.fontSize = 14;
        angleLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        anglePanel.addControl(angleLabel);

        this.addSpacer(parent, 10);
    }

    private createFileOperations(parent: StackPanel): void {
        const fileOpsPanel = new StackPanel();
        fileOpsPanel.isVertical = false;
        fileOpsPanel.height = "55px";
        fileOpsPanel.width = "100%";
        parent.addControl(fileOpsPanel);

        const importBtn = Button.CreateSimpleButton("importBtn", "📂 导入");
        importBtn.width = "30%";
        importBtn.height = "55px";
        importBtn.color = "white";
        importBtn.background = "#17a2b8";
        importBtn.cornerRadius = 10;
        importBtn.fontSize = 16;
        importBtn.onPointerClickObservable.add(() => this.fileOperations.triggerMapImport());
        fileOpsPanel.addControl(importBtn);

        const btnSpacer = new Rectangle();
        btnSpacer.width = "2%";
        btnSpacer.thickness = 0;
        fileOpsPanel.addControl(btnSpacer);

        const saveBtn = Button.CreateSimpleButton("saveBtn", "💾 保存地图");
        saveBtn.width = "68%";
        saveBtn.height = "55px";
        saveBtn.color = "white";
        saveBtn.background = "#28a745";
        saveBtn.cornerRadius = 10;
        saveBtn.fontSize = 20;
        saveBtn.fontWeight = "bold";
        saveBtn.onPointerClickObservable.add(async () => {
            await this.saveMap();
        });
        fileOpsPanel.addControl(saveBtn);
    }

    // =========================================================================
    // UI 辅助方法
    // =========================================================================

    private createSectionTitle(parent: StackPanel, text: string, color: string): void {
        const container = new StackPanel();
        container.isVertical = false;
        container.height = "35px";
        container.width = "100%";
        parent.addControl(container);

        const title = new TextBlock();
        title.text = text;
        title.color = color;
        title.fontSize = 18;
        title.fontWeight = "bold";
        title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        title.width = "100%";
        container.addControl(title);
    }

    private addSpacer(parent: StackPanel, height: number): void {
        const spacer = new Rectangle();
        spacer.width = "100%";
        spacer.height = `${height}px`;
        spacer.thickness = 0;
        spacer.background = "transparent";
        parent.addControl(spacer);
    }

    // =========================================================================
    // 公共 API
    // =========================================================================

    public refreshHierarchy(): void {
        this.hierarchyPanel.refresh();
    }

    private async saveMap(): Promise<void> {
        await this.fileOperations.saveMap();
    }

    public toggle(): void {
        if (!this.mainPanel) return;
        this.isVisible = !this.isVisible;
        this.mainPanel.isVisible = this.isVisible;
        
        if (this.editorManager) {
            this.editorManager.setEnabled(this.isVisible);
        }
        
        this.toggleCameraWheel(!this.isVisible);
    }
    
    private toggleCameraWheel(enabled: boolean): void {
        const camera = this.scene.activeCamera;
        if (camera && camera instanceof ArcRotateCamera) {
            if (enabled) {
                camera.wheelPrecision = this.savedWheelPrecision;
                if (this.wheelEventHandler) {
                    const canvas = this.scene.getEngine().getRenderingCanvas();
                    canvas?.removeEventListener('wheel', this.wheelEventHandler, true);
                    this.wheelEventHandler = null;
                }
            } else {
                this.savedWheelPrecision = camera.wheelPrecision;
                camera.wheelPrecision = 99999;
                
                const canvas = this.scene.getEngine().getRenderingCanvas();
                if (canvas && !this.wheelEventHandler) {
                    this.wheelEventHandler = (e: WheelEvent) => {
                        const rect = canvas.getBoundingClientRect();
                        const panelWidth = 400;
                        const panelLeft = rect.right - panelWidth - 20;
                        
                        if (e.clientX >= panelLeft) {
                            e.stopPropagation();
                        }
                    };
                    canvas.addEventListener('wheel', this.wheelEventHandler, true);
                }
            }
        }
    }
}
