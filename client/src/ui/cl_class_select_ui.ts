/**
 * 职业选择界面 UI
 * 
 * 模块: client/ui
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import {
    AdvancedDynamicTexture,
    Rectangle,
    TextBlock,
    Button,
    StackPanel,
    Control,
    Grid
} from '@babylonjs/gui';

// =============================================================================
// 职业数据定义
// =============================================================================

export interface ClClassInfo {
    id: string;
    name: string;
    icon: string;
    role: string;
    talentName: string;
    talentDesc: string;
    description: string;
}

export const CL_CLASSES: ClClassInfo[] = [
    {
        id: 'knight',
        name: '骑士',
        icon: '🛡️',
        role: '坦克/守护',
        talentName: '不屈意志',
        talentDesc: '生命<30%时获得50%减伤，持续3回合',
        description: '坚不可摧的守护者，擅长保护队友。'
    },
    {
        id: 'swordsman',
        name: '剑士',
        icon: '⚔️',
        role: '近战输出',
        talentName: '剑气纵横',
        talentDesc: '连续攻击同一目标，每次伤害+15%，最多3层',
        description: '精通剑术的战士，越战越勇。'
    },
    {
        id: 'warlock',
        name: '术士',
        icon: '🔮',
        role: '魔法输出',
        talentName: '暗影契约',
        talentDesc: '施放魔法后，下次魔法伤害+25%，恢复10魔力',
        description: '操控黑暗魔法的术士，擅长持续伤害。'
    },
    {
        id: 'gunner',
        name: '枪手',
        icon: '🔫',
        role: '远程输出',
        talentName: '致命精准',
        talentDesc: '30%概率触发精准射击，150%伤害，无视30%防御',
        description: '百发百中的神射手，远程致命打击。'
    },
    {
        id: 'assassin',
        name: '刺客',
        icon: '🗡️',
        role: '爆发输出',
        talentName: '暗影步',
        talentDesc: '首次攻击必暴击，暴击伤害+50%',
        description: '阴影中的杀手，爆发力极强。'
    }
];

// =============================================================================
// 职业选择界面
// =============================================================================

export class ClClassSelectUI {
    private gui: AdvancedDynamicTexture;
    private container: Rectangle;
    private selectedClassId: string | null = null;
    
    // UI 元素
    private classButtons: Button[] = [];
    private infoPanel: Rectangle | null = null;
    private confirmButton: Button | null = null;
    
    // 回调
    public onClassSelected: ((classId: string) => void) | null = null;

    constructor(gui: AdvancedDynamicTexture) {
        this.gui = gui;
        this.container = this.createContainer();
        this.createClassSelection();
    }

    /**
     * 创建主容器
     */
    private createContainer(): Rectangle {
        const rect = new Rectangle("classSelectContainer");
        rect.width = "90%";
        rect.height = "90%";
        rect.background = "rgba(20, 20, 30, 0.95)";
        rect.cornerRadius = 10;
        rect.thickness = 2;
        rect.color = "#4a90d9";
        rect.isVisible = false;
        this.gui.addControl(rect);
        return rect;
    }

    /**
     * 创建职业选择内容
     */
    private createClassSelection() {
        // 标题
        const title = new TextBlock();
        title.text = "选择你的职业";
        title.color = "#ffd700";
        title.fontSize = 36;
        title.height = "60px";
        title.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        title.top = "20px";
        this.container.addControl(title);

        // 主布局：左侧列表，右侧详情
        const grid = new Grid();
        grid.width = "100%";
        grid.height = "80%";
        grid.top = "50px";
        grid.addColumnDefinition(0.4); // 左侧 40%
        grid.addColumnDefinition(0.6); // 右侧 60%
        this.container.addControl(grid);

        // 左侧：职业列表
        const listPanel = new StackPanel();
        listPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        listPanel.top = "20px";
        grid.addControl(listPanel, 0, 0);

        CL_CLASSES.forEach(cls => {
            const btn = Button.CreateSimpleButton(`btn_${cls.id}`, `${cls.icon} ${cls.name}`);
            btn.width = "200px";
            btn.height = "60px";
            btn.color = "white";
            btn.background = "#333";
            btn.cornerRadius = 5;
            btn.paddingBottom = "10px";
            btn.fontSize = 24;
            
            btn.onPointerUpObservable.add(() => {
                this.selectClass(cls.id);
            });
            
            listPanel.addControl(btn);
            this.classButtons.push(btn);
        });

        // 右侧：详情面板
        this.infoPanel = new Rectangle("infoPanel");
        this.infoPanel.width = "90%";
        this.infoPanel.height = "90%";
        this.infoPanel.background = "rgba(0, 0, 0, 0.3)";
        this.infoPanel.cornerRadius = 5;
        this.infoPanel.thickness = 0;
        grid.addControl(this.infoPanel, 0, 1);

        // 初始显示第一个
        this.updateInfoPanel(CL_CLASSES[0]);
        this.selectedClassId = CL_CLASSES[0].id;
        this.updateButtonStyles();

        // 确认按钮
        this.confirmButton = Button.CreateSimpleButton("confirmBtn", "开始冒险");
        this.confirmButton.width = "200px";
        this.confirmButton.height = "60px";
        this.confirmButton.color = "white";
        this.confirmButton.background = "#28a745";
        this.confirmButton.cornerRadius = 5;
        this.confirmButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.confirmButton.top = "-30px";
        this.confirmButton.fontSize = 24;
        
        this.confirmButton.onPointerUpObservable.add(() => {
            if (this.selectedClassId && this.onClassSelected) {
                this.onClassSelected(this.selectedClassId);
            }
        });
        
        this.container.addControl(this.confirmButton);
    }

    /**
     * 选择职业
     */
    private selectClass(classId: string) {
        this.selectedClassId = classId;
        const cls = CL_CLASSES.find(c => c.id === classId);
        if (cls) {
            this.updateInfoPanel(cls);
        }
        this.updateButtonStyles();
    }

    /**
     * 更新按钮样式
     */
    private updateButtonStyles() {
        this.classButtons.forEach(btn => {
            if (btn.name === `btn_${this.selectedClassId}`) {
                btn.background = "#4a90d9"; // 选中颜色
            } else {
                btn.background = "#333"; // 默认颜色
            }
        });
    }

    /**
     * 更新详情面板
     */
    private updateInfoPanel(cls: ClClassInfo) {
        if (!this.infoPanel) return;
        this.infoPanel.clearControls();

        const panel = new StackPanel();
        panel.width = "100%";
        this.infoPanel.addControl(panel);

        // 职业名称
        const nameText = new TextBlock();
        nameText.text = `${cls.icon} ${cls.name}`;
        nameText.color = "#ffd700";
        nameText.fontSize = 40;
        nameText.height = "80px";
        panel.addControl(nameText);

        // 定位
        const roleText = new TextBlock();
        roleText.text = `定位: ${cls.role}`;
        roleText.color = "#aaa";
        roleText.fontSize = 20;
        roleText.height = "40px";
        panel.addControl(roleText);

        // 描述
        const descText = new TextBlock();
        descText.text = cls.description;
        descText.color = "white";
        descText.fontSize = 18;
        descText.height = "60px";
        descText.textWrapping = true;
        panel.addControl(descText);

        // 分隔线
        const line = new Rectangle();
        line.width = "80%";
        line.height = "2px";
        line.background = "#555";
        line.thickness = 0;
        line.paddingTop = "20px";
        line.paddingBottom = "20px";
        panel.addControl(line);

        // 天赋标题
        const talentTitle = new TextBlock();
        talentTitle.text = `专属天赋: ${cls.talentName}`;
        talentTitle.color = "#ff7f50";
        talentTitle.fontSize = 24;
        talentTitle.height = "50px";
        panel.addControl(talentTitle);

        // 天赋描述
        const talentDesc = new TextBlock();
        talentDesc.text = cls.talentDesc;
        talentDesc.color = "#ddd";
        talentDesc.fontSize = 18;
        talentDesc.height = "80px";
        talentDesc.textWrapping = true;
        panel.addControl(talentDesc);
        
        // 初始技能提示
        const skillTitle = new TextBlock();
        skillTitle.text = "初始技能: 普通攻击 + 职业技能 + 终极技能";
        skillTitle.color = "#88ccff";
        skillTitle.fontSize = 18;
        skillTitle.height = "50px";
        skillTitle.paddingTop = "20px";
        panel.addControl(skillTitle);
    }

    /**
     * 显示界面
     */
    public show() {
        this.container.isVisible = true;
    }

    /**
     * 隐藏界面
     */
    public hide() {
        this.container.isVisible = false;
    }
    
    /**
     * 销毁
     */
    public dispose() {
        this.container.dispose();
    }
}
