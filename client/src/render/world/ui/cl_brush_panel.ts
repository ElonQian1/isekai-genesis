/**
 * 笔刷面板组件 - 批量绘制植被等元素
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
    Slider,
    Checkbox
} from "@babylonjs/gui";
import { Vector3 } from "@babylonjs/core";
import { ClEditorManager } from "../editor/cl_editor_manager";
import { ClLevelLoader } from "../core/cl_level_loader";

/**
 * 笔刷面板 - 负责植被批量绘制功能
 */
export class ClBrushPanel {
    private editorManager: ClEditorManager | null = null;
    private levelLoader: ClLevelLoader | null = null;
    
    // 笔刷状态
    private currentBrushPrefab: string = "tree_pine";
    private brushRadiusSlider: Slider | null = null;
    private brushDensitySlider: Slider | null = null;
    
    // 回调函数
    private onCreateSectionTitle: ((parent: StackPanel, text: string, color: string) => void) | null = null;

    constructor(
        editorManager: ClEditorManager | null = null,
        levelLoader: ClLevelLoader | null = null
    ) {
        this.editorManager = editorManager;
        this.levelLoader = levelLoader;
    }

    /**
     * 设置 UI 辅助回调
     */
    setUIHelpers(
        createSectionTitle: (parent: StackPanel, text: string, color: string) => void
    ): void {
        this.onCreateSectionTitle = createSectionTitle;
    }

    /**
     * 创建笔刷面板
     */
    create(parent: StackPanel): void {
        if (this.onCreateSectionTitle) {
            this.onCreateSectionTitle(parent, "🖌️ 植被笔刷", "#e83e8c");
        }
        
        // 1. 笔刷开关
        const togglePanel = new StackPanel();
        togglePanel.isVertical = false;
        togglePanel.height = "40px";
        togglePanel.width = "100%";
        parent.addControl(togglePanel);
        
        const brushToggle = Checkbox.AddCheckBoxWithHeader("启用笔刷模式", (value) => {
            if (this.editorManager) {
                this.editorManager.setBrushMode(value);
            }
        });
        brushToggle.height = "30px";
        brushToggle.color = "white";
        brushToggle.children[0].color = "#e83e8c";
        togglePanel.addControl(brushToggle);
        
        // 2. 笔刷设置
        const settingsPanel = new StackPanel();
        settingsPanel.width = "100%";
        parent.addControl(settingsPanel);
        
        // 半径
        const radiusHeader = new TextBlock();
        radiusHeader.text = "笔刷半径: 5.0";
        radiusHeader.height = "25px";
        radiusHeader.color = "white";
        radiusHeader.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        settingsPanel.addControl(radiusHeader);
        
        const radiusSlider = new Slider();
        radiusSlider.minimum = 1;
        radiusSlider.maximum = 20;
        radiusSlider.value = 5;
        radiusSlider.height = "20px";
        radiusSlider.width = "100%";
        radiusSlider.color = "#e83e8c";
        radiusSlider.onValueChangedObservable.add((value) => {
            radiusHeader.text = `笔刷半径: ${value.toFixed(1)}`;
            this.updateBrushSettings();
        });
        settingsPanel.addControl(radiusSlider);
        
        // 密度
        const densityHeader = new TextBlock();
        densityHeader.text = "笔刷密度: 0.5";
        densityHeader.height = "25px";
        densityHeader.color = "white";
        densityHeader.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        settingsPanel.addControl(densityHeader);
        
        const densitySlider = new Slider();
        densitySlider.minimum = 0.1;
        densitySlider.maximum = 1.0;
        densitySlider.value = 0.5;
        densitySlider.height = "20px";
        densitySlider.width = "100%";
        densitySlider.color = "#e83e8c";
        densitySlider.onValueChangedObservable.add((value) => {
            densityHeader.text = `笔刷密度: ${value.toFixed(1)}`;
            this.updateBrushSettings();
        });
        settingsPanel.addControl(densitySlider);
        
        // 3. 预制体选择
        const prefabHeader = new TextBlock();
        prefabHeader.text = "选择植被:";
        prefabHeader.height = "25px";
        prefabHeader.color = "white";
        prefabHeader.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        settingsPanel.addControl(prefabHeader);
        
        const prefabs = ["tree_pine", "tree_oak", "grass_clump", "flower_patch"];
        const prefabPanel = new StackPanel();
        prefabPanel.isVertical = false;
        prefabPanel.height = "40px";
        settingsPanel.addControl(prefabPanel);
        
        prefabs.forEach(prefab => {
            const btn = Button.CreateSimpleButton(prefab, prefab.replace("tree_", "🌲").replace("grass_", "🌿").replace("flower_", "🌸"));
            btn.width = "80px";
            btn.height = "30px";
            btn.color = "white";
            btn.background = "#555";
            btn.fontSize = 12;
            btn.onPointerClickObservable.add(() => {
                this.currentBrushPrefab = prefab;
                prefabPanel.children.forEach((c: any) => c.background = "#555");
                btn.background = "#e83e8c";
                this.updateBrushSettings();
            });
            prefabPanel.addControl(btn);
        });
        
        // Store references for updates
        this.brushRadiusSlider = radiusSlider;
        this.brushDensitySlider = densitySlider;
        
        // Initialize callback
        if (this.editorManager) {
            this.editorManager.setBrushStrokeCallback((pos, prefab) => {
                this.handleBrushStroke(pos, prefab);
            });
        }
    }
    
    private updateBrushSettings(): void {
        if (this.editorManager && this.brushRadiusSlider && this.brushDensitySlider) {
            this.editorManager.setBrushSettings(
                this.brushRadiusSlider.value,
                this.brushDensitySlider.value,
                this.currentBrushPrefab
            );
        }
    }
    
    private handleBrushStroke(pos: Vector3, prefab: string): void {
        if (this.levelLoader) {
            let type = 'tree';
            if (prefab.startsWith('grass') || prefab.startsWith('flower')) {
                type = 'tree'; 
            }
            
            const scaleVal = 0.8 + Math.random() * 0.4;
            const scale = new Vector3(scaleVal, scaleVal, scaleVal);
            
            this.levelLoader.spawnEntity(type as any, prefab, pos, undefined, scale);
        }
    }
}
