/**
 * 环境设置面板组件 - 调整场景环境参数
 * 
 * 模块: client/render/world/ui
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import { 
    StackPanel, 
    TextBlock,
    Slider,
    ColorPicker
} from "@babylonjs/gui";
import { Scene, Color3, Color4 } from "@babylonjs/core";

/**
 * 环境设置面板 - 负责调整雾效、环境光等参数
 */
export class ClEnvPanel {
    private scene: Scene;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    /**
     * 创建环境设置面板
     */
    create(parent: StackPanel): void {
        // 标题
        const title = new TextBlock();
        title.text = "环境设置";
        title.color = "white";
        title.height = "30px";
        title.fontSize = 16;
        title.paddingTop = "10px";
        parent.addControl(title);

        // 雾效浓度
        const fogPanel = new StackPanel();
        fogPanel.isVertical = false;
        fogPanel.height = "30px";
        parent.addControl(fogPanel);

        const fogLabel = new TextBlock();
        fogLabel.text = "雾浓: ";
        fogLabel.width = "50px";
        fogLabel.color = "white";
        fogPanel.addControl(fogLabel);

        const fogSlider = new Slider();
        fogSlider.minimum = 0;
        fogSlider.maximum = 0.05;
        fogSlider.value = this.scene.fogDensity || 0;
        fogSlider.width = "120px";
        fogSlider.height = "20px";
        fogSlider.color = "#007ACC";
        fogSlider.onValueChangedObservable.add((value) => {
            this.scene.fogMode = Scene.FOGMODE_EXP;
            this.scene.fogDensity = value;
        });
        fogPanel.addControl(fogSlider);

        // 雾效颜色
        const fogColorPanel = new StackPanel();
        fogColorPanel.height = "160px";
        fogColorPanel.paddingTop = "5px";
        parent.addControl(fogColorPanel);

        const fogColorLabel = new TextBlock();
        fogColorLabel.text = "雾颜色";
        fogColorLabel.height = "20px";
        fogColorLabel.color = "white";
        fogColorPanel.addControl(fogColorLabel);

        const fogColorPicker = new ColorPicker();
        fogColorPicker.value = this.scene.fogColor ? (this.scene.fogColor as Color3) : new Color3(0.5, 0.5, 0.5);
        fogColorPicker.height = "130px";
        fogColorPicker.width = "130px";
        fogColorPicker.onValueChangedObservable.add((value) => {
            this.scene.fogColor = value;
        });
        fogColorPanel.addControl(fogColorPicker);

        // 环境光颜色 (Clear Color)
        const ambientColorPanel = new StackPanel();
        ambientColorPanel.height = "160px";
        ambientColorPanel.paddingTop = "5px";
        parent.addControl(ambientColorPanel);

        const ambientColorLabel = new TextBlock();
        ambientColorLabel.text = "环境色";
        ambientColorLabel.height = "20px";
        ambientColorLabel.color = "white";
        ambientColorPanel.addControl(ambientColorLabel);

        const ambientColorPicker = new ColorPicker();
        const currentClear = this.scene.clearColor as Color4;
        ambientColorPicker.value = currentClear ? new Color3(currentClear.r, currentClear.g, currentClear.b) : new Color3(0, 0, 0);
        ambientColorPicker.height = "130px";
        ambientColorPicker.width = "130px";
        ambientColorPicker.onValueChangedObservable.add((value) => {
            this.scene.clearColor = new Color4(value.r, value.g, value.b, 1);
        });
        ambientColorPanel.addControl(ambientColorPicker);
    }
}
