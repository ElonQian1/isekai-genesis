/**
 * 编辑器 UI 工厂模块
 * 
 * 模块: client/render/world/ui
 * 前缀: Cl
 * 
 * 职责:
 * - 创建通用 UI 组件 (标题、间隔、按钮)
 * - 创建编辑器面板布局
 * - 创建工具栏按钮
 */

import {
    Button,
    Control,
    StackPanel,
    TextBlock,
    Rectangle,
    Checkbox,
} from "@babylonjs/gui";

// =============================================================================
// UI 工厂配置
// =============================================================================

export const CL_UI_FACTORY_CONFIG = {
    // 颜色
    colors: {
        primary: "#4a9eff",
        success: "#5cb85c",
        info: "#5bc0de",
        warning: "#f0ad4e",
        danger: "#d9534f",
        dark: "#333",
    },
    // 尺寸
    sizes: {
        buttonHeight: "45px",
        sectionTitleHeight: "35px",
        fontSize: {
            small: 12,
            normal: 14,
            large: 18,
            xlarge: 26,
        },
    },
    // 圆角
    cornerRadius: {
        small: 6,
        normal: 8,
        large: 12,
    },
};

// =============================================================================
// UI 工厂类
// =============================================================================

export class ClUIFactory {
    
    /**
     * 创建分区标题
     */
    static createSectionTitle(parent: StackPanel, text: string, color: string): void {
        const container = new StackPanel();
        container.isVertical = false;
        container.height = CL_UI_FACTORY_CONFIG.sizes.sectionTitleHeight;
        container.width = "100%";
        parent.addControl(container);

        const title = new TextBlock();
        title.text = text;
        title.color = color;
        title.fontSize = CL_UI_FACTORY_CONFIG.sizes.fontSize.large;
        title.fontWeight = "bold";
        title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        title.width = "100%";
        container.addControl(title);
    }

    /**
     * 添加间隔
     */
    static addSpacer(parent: StackPanel, height: number): void {
        const spacer = new Rectangle();
        spacer.width = "100%";
        spacer.height = `${height}px`;
        spacer.thickness = 0;
        spacer.background = "transparent";
        parent.addControl(spacer);
    }

    /**
     * 创建工具按钮
     */
    static createToolButton(
        name: string,
        icon: string,
        label: string,
        color: string,
        onClick: () => void
    ): Button {
        const btn = Button.CreateSimpleButton(name, `${icon}\n${label}`);
        btn.width = "80px";
        btn.height = CL_UI_FACTORY_CONFIG.sizes.buttonHeight;
        btn.color = "white";
        btn.background = color;
        btn.cornerRadius = CL_UI_FACTORY_CONFIG.cornerRadius.small;
        btn.fontSize = CL_UI_FACTORY_CONFIG.sizes.fontSize.small;
        btn.paddingRight = "5px";
        btn.onPointerClickObservable.add(onClick);
        return btn;
    }

    /**
     * 创建操作按钮
     */
    static createActionButton(
        name: string,
        icon: string,
        label: string,
        color: string,
        onClick: () => void,
        width: string = "110px"
    ): Button {
        const btn = Button.CreateSimpleButton(name, `${icon} ${label}`);
        btn.width = width;
        btn.height = "40px";
        btn.color = "white";
        btn.background = color;
        btn.cornerRadius = CL_UI_FACTORY_CONFIG.cornerRadius.small;
        btn.fontSize = CL_UI_FACTORY_CONFIG.sizes.fontSize.normal;
        btn.paddingRight = "5px";
        btn.onPointerClickObservable.add(onClick);
        return btn;
    }

    /**
     * 创建大按钮
     */
    static createLargeButton(
        name: string,
        text: string,
        color: string,
        onClick: () => void,
        width: string = "100%"
    ): Button {
        const btn = Button.CreateSimpleButton(name, text);
        btn.width = width;
        btn.height = "55px";
        btn.color = "white";
        btn.background = color;
        btn.cornerRadius = CL_UI_FACTORY_CONFIG.cornerRadius.large;
        btn.fontSize = 20;
        btn.fontWeight = "bold";
        btn.onPointerClickObservable.add(onClick);
        return btn;
    }

    /**
     * 创建带复选框的选项
     */
    static createCheckboxOption(
        parent: StackPanel,
        label: string,
        color: string,
        onChange: (value: boolean) => void,
        initialValue: boolean = false
    ): void {
        const panel = new StackPanel();
        panel.isVertical = false;
        panel.height = "40px";
        panel.width = "100%";
        parent.addControl(panel);

        const checkbox = new Checkbox();
        checkbox.width = "25px";
        checkbox.height = "25px";
        checkbox.isChecked = initialValue;
        checkbox.color = color;
        checkbox.background = CL_UI_FACTORY_CONFIG.colors.dark;
        checkbox.onIsCheckedChangedObservable.add(onChange);
        panel.addControl(checkbox);

        const labelText = new TextBlock();
        labelText.text = `  ${label}`;
        labelText.width = "300px";
        labelText.height = "25px";
        labelText.color = "white";
        labelText.fontSize = CL_UI_FACTORY_CONFIG.sizes.fontSize.normal;
        labelText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        panel.addControl(labelText);
    }

    /**
     * 创建水平按钮面板
     */
    static createHorizontalButtonPanel(height: string = "50px"): StackPanel {
        const panel = new StackPanel();
        panel.isVertical = false;
        panel.height = height;
        panel.width = "100%";
        return panel;
    }

    /**
     * 创建帮助信息面板
     */
    static createHelpPanel(
        parent: StackPanel,
        title: string,
        shortcuts: string[]
    ): void {
        const helpContainer = new Rectangle();
        helpContainer.width = "100%";
        helpContainer.height = `${50 + shortcuts.length * 18}px`;
        helpContainer.background = "#1e3a5f";
        helpContainer.cornerRadius = CL_UI_FACTORY_CONFIG.cornerRadius.normal;
        helpContainer.thickness = 1;
        helpContainer.color = CL_UI_FACTORY_CONFIG.colors.primary;
        parent.addControl(helpContainer);

        const helpStack = new StackPanel();
        helpStack.paddingTop = "10px";
        helpStack.paddingLeft = "15px";
        helpContainer.addControl(helpStack);

        const helpTitle = new TextBlock();
        helpTitle.text = title;
        helpTitle.color = CL_UI_FACTORY_CONFIG.colors.primary;
        helpTitle.height = "25px";
        helpTitle.fontSize = 16;
        helpTitle.fontWeight = "bold";
        helpTitle.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        helpStack.addControl(helpTitle);

        shortcuts.forEach(text => {
            const line = new TextBlock();
            line.text = text;
            line.color = "#aaccff";
            line.height = "18px";
            line.fontSize = CL_UI_FACTORY_CONFIG.sizes.fontSize.small;
            line.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            helpStack.addControl(line);
        });
    }
}
