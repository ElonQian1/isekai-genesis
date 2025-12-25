/**
 * 层级面板组件 - 显示场景物体列表
 * 
 * 模块: client/render/world/ui
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import { 
    StackPanel, 
    TextBlock, 
    Control,
    Button,
    ScrollViewer
} from "@babylonjs/gui";
import { ClEditorManager } from "../editor/cl_editor_manager";

/**
 * 层级面板 - 负责显示和管理场景物体列表
 */
export class ClHierarchyPanel {
    private editorManager: ClEditorManager | null = null;
    private hierarchyListPanel: StackPanel | null = null;
    
    // 回调函数
    private onCreateSectionTitle: ((parent: StackPanel, text: string, color: string) => void) | null = null;
    private onAddSpacer: ((parent: StackPanel, height: number) => void) | null = null;

    constructor(editorManager: ClEditorManager | null = null) {
        this.editorManager = editorManager;
    }

    /**
     * 设置 UI 辅助回调
     */
    setUIHelpers(
        createSectionTitle: (parent: StackPanel, text: string, color: string) => void,
        addSpacer: (parent: StackPanel, height: number) => void
    ): void {
        this.onCreateSectionTitle = createSectionTitle;
        this.onAddSpacer = addSpacer;
    }

    /**
     * 创建层级面板
     */
    create(parent: StackPanel): void {
        if (this.onCreateSectionTitle) {
            this.onCreateSectionTitle(parent, "📑 场景物体", "#FFD700");
        }

        // 刷新按钮
        const refreshBtn = Button.CreateSimpleButton("refreshHierarchy", "🔄 刷新列表");
        refreshBtn.width = "100%";
        refreshBtn.height = "30px";
        refreshBtn.color = "white";
        refreshBtn.background = "#444";
        refreshBtn.cornerRadius = 5;
        refreshBtn.fontSize = 14;
        refreshBtn.onPointerClickObservable.add(() => this.refresh());
        parent.addControl(refreshBtn);

        if (this.onAddSpacer) {
            this.onAddSpacer(parent, 5);
        }

        // 滚动容器
        const scrollViewer = new ScrollViewer("hierarchyScroll");
        scrollViewer.width = "100%";
        scrollViewer.height = "150px";
        scrollViewer.background = "#111";
        scrollViewer.thickness = 1;
        scrollViewer.color = "#444";
        scrollViewer.barSize = 8;
        scrollViewer.barColor = "#FFD700";
        parent.addControl(scrollViewer);

        // 列表容器
        this.hierarchyListPanel = new StackPanel();
        this.hierarchyListPanel.isVertical = true;
        this.hierarchyListPanel.width = "100%";
        this.hierarchyListPanel.paddingTop = "5px";
        scrollViewer.addControl(this.hierarchyListPanel);

        if (this.onAddSpacer) {
            this.onAddSpacer(parent, 15);
        }
    }

    /**
     * 更新选中状态
     */
    updateSelection(selectedMesh: any | null): void {
        if (!this.hierarchyListPanel) return;
        
        this.hierarchyListPanel.children.forEach(control => {
            if (control instanceof Button) {
                control.color = "#ccc";
                control.background = "transparent";
                
                if (selectedMesh && control.name === "node_" + selectedMesh.name) {
                    control.color = "#FFD700";
                    control.background = "#444";
                }
            }
        });
    }

    /**
     * 刷新列表
     */
    refresh(): void {
        if (!this.hierarchyListPanel || !this.editorManager) return;

        this.hierarchyListPanel.clearControls();

        const meshes = this.editorManager.getAllEditableMeshes();
        
        if (meshes.length === 0) {
            const emptyText = new TextBlock();
            emptyText.text = "无物体";
            emptyText.color = "#666";
            emptyText.height = "30px";
            this.hierarchyListPanel.addControl(emptyText);
            return;
        }

        // 按名字排序
        meshes.sort((a, b) => a.name.localeCompare(b.name));

        meshes.forEach(mesh => {
            const btn = Button.CreateSimpleButton("node_" + mesh.name, mesh.name);
            btn.width = "100%";
            btn.height = "25px";
            btn.color = "#ccc";
            btn.background = "transparent";
            btn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            if (btn.textBlock) {
                btn.textBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            }
            btn.paddingLeft = "10px";
            btn.fontSize = 12;
            
            btn.onPointerClickObservable.add(() => {
                if (this.editorManager) {
                    this.editorManager.selectMesh(mesh);
                }
            });

            this.hierarchyListPanel!.addControl(btn);
        });

        // 恢复选中状态
        if (this.editorManager) {
            this.updateSelection(this.editorManager.getSelectedMesh());
        }
    }
}
