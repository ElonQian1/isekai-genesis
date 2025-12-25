/**
 * 属性面板组件 - 显示和编辑选中物体的属性
 * 
 * 模块: client/render/world/ui
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import { 
    StackPanel, 
    TextBlock, 
    InputText,
    Control
} from "@babylonjs/gui";
import { Vector3 } from "@babylonjs/core";
import { ClLevelLoader } from "../core/cl_level_loader";

/**
 * 属性面板 - 负责显示和编辑选中对象的属性
 */
export class ClPropertyPanel {
    private propertyPanel: StackPanel | null = null;
    private propertyContainer: StackPanel | null = null;
    private levelLoader: ClLevelLoader | null = null;
    
    // 回调函数
    private onCreateSectionTitle: ((parent: StackPanel, text: string, color: string) => void) | null = null;
    private onAddSpacer: ((parent: StackPanel, height: number) => void) | null = null;

    constructor(levelLoader: ClLevelLoader | null = null) {
        this.levelLoader = levelLoader;
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
     * 创建属性面板
     */
    create(parent: StackPanel): void {
        if (this.onCreateSectionTitle) {
            this.onCreateSectionTitle(parent, "📝 属性面板", "#9b59b6");
        }

        // 容器
        this.propertyPanel = new StackPanel();
        this.propertyPanel.isVertical = true;
        this.propertyPanel.width = "100%";
        this.propertyPanel.background = "#252525";
        this.propertyPanel.paddingTop = "10px";
        this.propertyPanel.paddingBottom = "10px";
        this.propertyPanel.paddingLeft = "10px";
        this.propertyPanel.paddingRight = "10px";
        parent.addControl(this.propertyPanel);

        // 提示文字
        const hint = new TextBlock();
        hint.text = "选中物体后显示属性";
        hint.color = "#888";
        hint.height = "30px";
        hint.fontSize = 14;
        this.propertyPanel.addControl(hint);

        // 动态内容容器
        this.propertyContainer = new StackPanel();
        this.propertyContainer.isVertical = true;
        this.propertyContainer.width = "100%";
        this.propertyPanel.addControl(this.propertyContainer);

        if (this.onAddSpacer) {
            this.onAddSpacer(parent, 10);
        }
    }

    /**
     * 更新属性面板内容
     */
    update(mesh: any | null): void {
        if (!this.propertyPanel || !this.propertyContainer) return;

        // 清空旧内容
        this.propertyContainer.clearControls();

        if (!mesh) {
            this.propertyPanel.isVisible = false;
            return;
        }

        this.propertyPanel.isVisible = true;

        // 显示基本信息
        this.addPropertyText("名称", mesh.name);
        
        // 显示位置
        this.addVector3Input("位置", mesh.position, (val) => {
            mesh.position.copyFrom(val);
        });

        // 显示旋转 (欧拉角)
        if (mesh.rotation) {
            const rotationDeg = mesh.rotation.clone().scale(180 / Math.PI);
            this.addVector3Input("旋转", rotationDeg, (val) => {
                mesh.rotation.x = val.x * (Math.PI / 180);
                mesh.rotation.y = val.y * (Math.PI / 180);
                mesh.rotation.z = val.z * (Math.PI / 180);
            });
        }

        // 显示缩放
        if (mesh.scaling) {
            this.addVector3Input("缩放", mesh.scaling, (val) => {
                mesh.scaling.copyFrom(val);
            });
        }

        // 显示 Metadata
        if (mesh.metadata) {
            this.updateMetadataProperties(mesh);
        }
    }

    /**
     * 更新元数据相关属性
     */
    private updateMetadataProperties(mesh: any): void {
        if (mesh.metadata.type === 'enemy') {
            this.addPropertyText("类型", "敌人");
            this.addPropertyText("Prefab", mesh.metadata.prefab);
            
            if (!mesh.metadata.aiConfig) mesh.metadata.aiConfig = {};
            
            const enemySystem = this.levelLoader ? (this.levelLoader as any).enemySystem : null;

            // 巡逻半径
            this.addNumberInput("巡逻半径", mesh.metadata.aiConfig.patrolRadius || 5, (val) => {
                mesh.metadata.aiConfig.patrolRadius = val;
                if (enemySystem) {
                    enemySystem.updateEnemyConfig(mesh.name, mesh.metadata.aiConfig);
                    enemySystem.showDebugGizmos(mesh.name);
                }
            });
            
            // 警戒范围
            this.addNumberInput("警戒范围", mesh.metadata.aiConfig.aggroRadius || 6, (val) => {
                mesh.metadata.aiConfig.aggroRadius = val;
                if (enemySystem) {
                    enemySystem.updateEnemyConfig(mesh.name, mesh.metadata.aiConfig);
                    enemySystem.showDebugGizmos(mesh.name);
                }
            });

            // 攻击范围
            this.addNumberInput("攻击范围", mesh.metadata.aiConfig.attackRadius || 2, (val) => {
                mesh.metadata.aiConfig.attackRadius = val;
                if (enemySystem) {
                    enemySystem.updateEnemyConfig(mesh.name, mesh.metadata.aiConfig);
                    enemySystem.showDebugGizmos(mesh.name);
                }
            });

            // 巡逻类型
            this.addTextInput("巡逻类型", mesh.metadata.aiConfig.patrolType || "random", (val) => {
                mesh.metadata.aiConfig.patrolType = val;
                if (enemySystem) {
                    enemySystem.updateEnemyConfig(mesh.name, mesh.metadata.aiConfig);
                }
            });

            // 初始路径点
            this.addTextInput("路径点ID", mesh.metadata.aiConfig.nextWaypointId || "", (val) => {
                mesh.metadata.aiConfig.nextWaypointId = val;
                if (enemySystem) {
                    enemySystem.updateEnemyConfig(mesh.name, mesh.metadata.aiConfig);
                }
            });
        } else if (mesh.metadata.type === 'waypoint') {
            this.addPropertyText("类型", "路径点");
            
            const wpSystem = this.levelLoader ? this.levelLoader.getWaypointSystem() : null;

            // 下一个路径点
            this.addTextInput("下个点ID", mesh.metadata.nextWaypointId || "", (val) => {
                mesh.metadata.nextWaypointId = val;
                if (wpSystem) {
                    wpSystem.updateWaypointConfig(mesh.name, { nextWaypointId: val });
                }
            });

            // 停留时间
            this.addNumberInput("停留时间", mesh.metadata.waitTime || 0, (val) => {
                mesh.metadata.waitTime = val;
                if (wpSystem) {
                    wpSystem.updateWaypointConfig(mesh.name, { waitTime: val });
                }
            });
        }
    }

    // =========================================================================
    // UI 辅助方法
    // =========================================================================

    private addTextInput(label: string, value: string, onChange: (val: string) => void): void {
        if (!this.propertyContainer) return;
        const panel = new StackPanel();
        panel.isVertical = false;
        panel.height = "30px";
        this.propertyContainer.addControl(panel);

        const labelBlock = new TextBlock();
        labelBlock.text = label + ": ";
        labelBlock.width = "80px";
        labelBlock.color = "#aaaaaa";
        labelBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        panel.addControl(labelBlock);

        const input = new InputText();
        input.width = "100px";
        input.height = "25px";
        input.text = value;
        input.color = "white";
        input.background = "#222222";
        input.onTextChangedObservable.add((input) => {
            onChange(input.text);
        });
        panel.addControl(input);
    }

    private addPropertyText(label: string, value: string): void {
        if (!this.propertyContainer) return;
        const panel = new StackPanel();
        panel.isVertical = false;
        panel.height = "25px";
        this.propertyContainer.addControl(panel);

        const labelBlock = new TextBlock();
        labelBlock.text = label + ": ";
        labelBlock.width = "80px";
        labelBlock.color = "#aaaaaa";
        labelBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        panel.addControl(labelBlock);

        const valueBlock = new TextBlock();
        valueBlock.text = value;
        valueBlock.width = "100px";
        valueBlock.color = "white";
        valueBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        valueBlock.paddingLeft = "5px";
        panel.addControl(valueBlock);
    }

    private addNumberInput(label: string, value: number, onChange: (val: number) => void): void {
        if (!this.propertyContainer) return;
        const panel = new StackPanel();
        panel.isVertical = false;
        panel.height = "30px";
        this.propertyContainer.addControl(panel);

        const labelBlock = new TextBlock();
        labelBlock.text = label + ": ";
        labelBlock.width = "80px";
        labelBlock.color = "#aaaaaa";
        labelBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        panel.addControl(labelBlock);

        const input = new InputText();
        input.width = "80px";
        input.height = "25px";
        input.text = value.toFixed(2);
        input.color = "white";
        input.background = "#222222";
        input.onTextChangedObservable.add((input) => {
            const val = parseFloat(input.text);
            if (!isNaN(val)) {
                onChange(val);
            }
        });
        panel.addControl(input);
    }

    private addVector3Input(label: string, value: Vector3, onChange: (val: Vector3) => void): void {
        if (!this.propertyContainer) return;
        
        const header = new TextBlock();
        header.text = label;
        header.height = "20px";
        header.color = "#aaaaaa";
        header.fontSize = 12;
        this.propertyContainer.addControl(header);

        const panel = new StackPanel();
        panel.isVertical = false;
        panel.height = "30px";
        this.propertyContainer.addControl(panel);

        const createInput = (val: number, axis: 'x'|'y'|'z') => {
            const input = new InputText();
            input.width = "55px";
            input.height = "25px";
            input.text = val.toFixed(1);
            input.color = axis === 'x' ? "#ff5555" : (axis === 'y' ? "#55ff55" : "#5555ff");
            input.background = "#222222";
            input.paddingRight = "2px";
            input.onTextChangedObservable.add((input) => {
                const num = parseFloat(input.text);
                if (!isNaN(num)) {
                    const newVal = value.clone();
                    if (axis === 'x') newVal.x = num;
                    if (axis === 'y') newVal.y = num;
                    if (axis === 'z') newVal.z = num;
                    onChange(newVal);
                }
            });
            return input;
        };

        panel.addControl(createInput(value.x, 'x'));
        panel.addControl(createInput(value.y, 'y'));
        panel.addControl(createInput(value.z, 'z'));
    }
}
