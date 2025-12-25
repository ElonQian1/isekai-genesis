/**
 * 游戏模式选择 UI
 * 
 * 展示所有游戏模式供玩家选择，支持单人/组队切换
 * 支持基于玩家进度的解锁显示
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
    Grid,
    ScrollViewer,
} from '@babylonjs/gui';

import {
    ClGameMode,
    ClGameModeConfig,
    ClGameModeCategory,
    CL_GAME_MODE_CONFIGS,
} from '../core/cl_game_mode_types';

import {
    cl_getPlayerProgressManager,
    ClPlayerProgressManager,
} from '../core/cl_player_progress';

// =============================================================================
// 样式常量
// =============================================================================

const CL_STYLE = {
    // 颜色
    bgColor: 'rgba(20, 25, 35, 0.95)',
    cardBg: 'rgba(40, 50, 70, 0.9)',
    cardBgHover: 'rgba(60, 80, 120, 0.95)',
    cardBgLocked: 'rgba(30, 30, 40, 0.7)',
    cardBgSelected: 'rgba(80, 120, 180, 0.95)',
    
    textPrimary: '#FFFFFF',
    textSecondary: '#A0B0C0',
    textMuted: '#606880',
    textLocked: '#505060',
    
    accentPVE: '#4CAF50',      // 绿色 - PVE
    accentPVP: '#F44336',      // 红色 - PVP
    accentMixed: '#FF9800',    // 橙色 - 混合
    
    border: 'rgba(100, 120, 160, 0.5)',
    borderSelected: '#64B5F6',
    
    // 尺寸
    cardWidth: 280,
    cardHeight: 200,
    cardGap: 20,
    borderRadius: 12,
};

// =============================================================================
// 游戏模式选择 UI
// =============================================================================

export class ClGameModeUI {
    private gui: AdvancedDynamicTexture;
    private container: Rectangle | null = null;
    private modeCards: Map<ClGameMode, Rectangle> = new Map();
    
    // 进度管理器
    private progressManager: ClPlayerProgressManager;
    
    // 状态
    private selectedMode: ClGameMode | null = null;
    private isOnline: boolean = false;
    
    // 回调
    public onModeSelected: ((mode: ClGameMode) => void) | null = null;
    public onStartGame: ((mode: ClGameMode) => void) | null = null;
    public onBack: (() => void) | null = null;

    constructor(gui: AdvancedDynamicTexture) {
        this.gui = gui;
        this.progressManager = cl_getPlayerProgressManager();
    }

    /**
     * 显示模式选择界面
     */
    show(isOnline: boolean = false): void {
        this.isOnline = isOnline;
        
        if (this.container) {
            this.container.isVisible = true;
            this.refreshModeCards();
            return;
        }
        this.createUI();
    }

    /**
     * 隐藏界面
     */
    hide(): void {
        if (this.container) {
            this.container.isVisible = false;
        }
    }

    /**
     * 设置网络状态
     */
    setOnlineStatus(isOnline: boolean): void {
        this.isOnline = isOnline;
        this.refreshModeCards();
    }

    /**
     * 创建 UI
     */
    private createUI(): void {
        // 主容器
        this.container = new Rectangle('gameModeContainer');
        this.container.width = 1;
        this.container.height = 1;
        this.container.background = CL_STYLE.bgColor;
        this.container.thickness = 0;
        this.gui.addControl(this.container);

        // 内容区域
        const content = new StackPanel('content');
        content.width = '900px';
        content.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        this.container.addControl(content);

        // 标题
        this.createHeader(content);

        // 模式卡片区域
        this.createModeGrid(content);

        // 底部按钮
        this.createFooter(content);
    }

    /**
     * 创建标题区域
     */
    private createHeader(parent: StackPanel): void {
        const header = new StackPanel('header');
        header.height = '120px';
        header.paddingBottom = '20px';
        parent.addControl(header);

        // 标题
        const title = new TextBlock('title', '选择游戏模式');
        title.color = CL_STYLE.textPrimary;
        title.fontSize = 36;
        title.fontWeight = 'bold';
        title.height = '60px';
        header.addControl(title);

        // 副标题
        const subtitle = new TextBlock('subtitle', '选择你的江湖之路');
        subtitle.color = CL_STYLE.textSecondary;
        subtitle.fontSize = 18;
        subtitle.height = '30px';
        header.addControl(subtitle);

        // 网络状态
        const statusText = this.isOnline ? '🟢 已连接服务器' : '🔴 离线模式';
        const status = new TextBlock('status', statusText);
        status.color = this.isOnline ? '#4CAF50' : '#FF9800';
        status.fontSize = 14;
        status.height = '25px';
        header.addControl(status);
    }

    /**
     * 创建模式卡片网格
     */
    private createModeGrid(parent: StackPanel): void {
        const scrollViewer = new ScrollViewer('scrollViewer');
        scrollViewer.width = 1;
        scrollViewer.height = '450px';
        scrollViewer.thickness = 0;
        scrollViewer.barSize = 8;
        scrollViewer.barColor = CL_STYLE.border;
        parent.addControl(scrollViewer);

        // 网格容器
        const grid = new Grid('modeGrid');
        grid.width = '100%';
        
        // 2列布局
        grid.addColumnDefinition(0.5);
        grid.addColumnDefinition(0.5);
        
        // 根据模式数量添加行
        const modes = Object.values(CL_GAME_MODE_CONFIGS);
        const rows = Math.ceil(modes.length / 2);
        for (let i = 0; i < rows; i++) {
            grid.addRowDefinition(220, true);
        }
        
        scrollViewer.addControl(grid);

        // 创建模式卡片
        modes.forEach((config, index) => {
            const card = this.createModeCard(config);
            const row = Math.floor(index / 2);
            const col = index % 2;
            grid.addControl(card, row, col);
            this.modeCards.set(config.id, card);
        });
    }

    /**
     * 创建单个模式卡片
     */
    private createModeCard(config: ClGameModeConfig): Rectangle {
        // 检查解锁状态 (基于玩家进度)
        const isUnlocked = this.progressManager.isModeUnlocked(config.id);
        // 检查网络可用性
        const networkOk = !config.requiresNetwork || this.isOnline;
        // 综合可用性
        const isAvailable = isUnlocked && networkOk;
        
        // 获取解锁进度描述
        const unlockProgress = isUnlocked ? '' : this.progressManager.getModeUnlockProgress(config.id);
        
        // 卡片容器
        const card = new Rectangle(`card_${config.id}`);
        card.width = `${CL_STYLE.cardWidth}px`;
        card.height = `${CL_STYLE.cardHeight}px`;
        card.cornerRadius = CL_STYLE.borderRadius;
        card.thickness = 2;
        card.color = CL_STYLE.border;
        card.background = isAvailable ? CL_STYLE.cardBg : CL_STYLE.cardBgLocked;
        card.paddingTop = '10px';
        card.paddingBottom = '10px';

        // 卡片内容
        const content = new StackPanel(`cardContent_${config.id}`);
        content.width = '90%';
        card.addControl(content);

        // 图标和标题行
        const headerRow = new StackPanel(`headerRow_${config.id}`);
        headerRow.isVertical = false;
        headerRow.height = '50px';
        headerRow.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        content.addControl(headerRow);

        // 图标
        const icon = new TextBlock(`icon_${config.id}`, config.icon);
        icon.fontSize = 32;
        icon.width = '50px';
        icon.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        headerRow.addControl(icon);

        // 标题
        const title = new TextBlock(`title_${config.id}`, config.name);
        title.color = isAvailable ? CL_STYLE.textPrimary : CL_STYLE.textLocked;
        title.fontSize = 20;
        title.fontWeight = 'bold';
        title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        title.width = '180px';
        headerRow.addControl(title);

        // 分类标签
        const categoryLabel = this.createCategoryLabel(config.category);
        content.addControl(categoryLabel);

        // 描述
        const desc = new TextBlock(`desc_${config.id}`, config.description);
        desc.color = isAvailable ? CL_STYLE.textSecondary : CL_STYLE.textMuted;
        desc.fontSize = 13;
        desc.height = '50px';
        desc.textWrapping = true;
        desc.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        content.addControl(desc);

        // 玩家人数和时长
        const infoRow = new StackPanel(`infoRow_${config.id}`);
        infoRow.isVertical = false;
        infoRow.height = '25px';
        infoRow.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        content.addControl(infoRow);

        const playerInfo = config.minPlayers === config.maxPlayers 
            ? `👤 ${config.minPlayers}人` 
            : `👥 ${config.minPlayers}-${config.maxPlayers}人`;
        const players = new TextBlock(`players_${config.id}`, playerInfo);
        players.color = CL_STYLE.textSecondary;
        players.fontSize = 12;
        players.width = '80px';
        infoRow.addControl(players);

        const duration = new TextBlock(`duration_${config.id}`, `⏱️ ~${config.estimatedDuration}分钟`);
        duration.color = CL_STYLE.textSecondary;
        duration.fontSize = 12;
        duration.width = '100px';
        infoRow.addControl(duration);

        // 锁定提示 (基于玩家进度)
        if (!isUnlocked) {
            const lockInfo = new TextBlock(`lock_${config.id}`, `🔒 ${unlockProgress}`);
            lockInfo.color = '#FF9800';
            lockInfo.fontSize = 11;
            lockInfo.height = '25px';
            lockInfo.textWrapping = true;
            content.addControl(lockInfo);
        } else if (config.requiresNetwork && !this.isOnline) {
            const offlineInfo = new TextBlock(`offline_${config.id}`, '⚠️ 需要联网');
            offlineInfo.color = '#FF9800';
            offlineInfo.fontSize = 11;
            offlineInfo.height = '25px';
            content.addControl(offlineInfo);
        }

        // 交互
        if (isAvailable) {
            card.onPointerEnterObservable.add(() => {
                if (this.selectedMode !== config.id) {
                    card.background = CL_STYLE.cardBgHover;
                }
            });

            card.onPointerOutObservable.add(() => {
                if (this.selectedMode !== config.id) {
                    card.background = CL_STYLE.cardBg;
                }
            });

            card.onPointerClickObservable.add(() => {
                this.selectMode(config.id);
            });
        }

        return card;
    }

    /**
     * 创建分类标签
     */
    private createCategoryLabel(category: ClGameModeCategory): Rectangle {
        const labelMap = {
            [ClGameModeCategory.PVE]: { text: 'PVE', color: CL_STYLE.accentPVE },
            [ClGameModeCategory.PVP]: { text: 'PVP', color: CL_STYLE.accentPVP },
            [ClGameModeCategory.Mixed]: { text: 'PVP+PVE', color: CL_STYLE.accentMixed },
        };
        
        const info = labelMap[category];
        
        const label = new Rectangle('categoryLabel');
        label.width = '60px';
        label.height = '22px';
        label.cornerRadius = 4;
        label.thickness = 0;
        label.background = info.color;
        label.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;

        const text = new TextBlock('categoryText', info.text);
        text.color = '#FFFFFF';
        text.fontSize = 11;
        text.fontWeight = 'bold';
        label.addControl(text);

        return label;
    }

    /**
     * 选择模式
     */
    private selectMode(mode: ClGameMode): void {
        // 取消之前的选中
        if (this.selectedMode) {
            const prevCard = this.modeCards.get(this.selectedMode);
            if (prevCard) {
                prevCard.background = CL_STYLE.cardBg;
                prevCard.color = CL_STYLE.border;
            }
        }

        // 设置新选中
        this.selectedMode = mode;
        const card = this.modeCards.get(mode);
        if (card) {
            card.background = CL_STYLE.cardBgSelected;
            card.color = CL_STYLE.borderSelected;
        }

        // 触发回调
        this.onModeSelected?.(mode);
    }

    /**
     * 创建底部按钮
     */
    private createFooter(parent: StackPanel): void {
        const footer = new StackPanel('footer');
        footer.isVertical = false;
        footer.height = '80px';
        footer.paddingTop = '20px';
        footer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        parent.addControl(footer);

        // 返回按钮
        const backBtn = Button.CreateSimpleButton('backBtn', '← 返回大厅');
        backBtn.width = '150px';
        backBtn.height = '45px';
        backBtn.color = CL_STYLE.textSecondary;
        backBtn.background = 'rgba(100, 100, 120, 0.5)';
        backBtn.cornerRadius = 8;
        backBtn.thickness = 0;
        backBtn.fontSize = 16;
        backBtn.paddingRight = '20px';
        backBtn.onPointerClickObservable.add(() => {
            this.onBack?.();
        });
        footer.addControl(backBtn);

        // 开始按钮
        const startBtn = Button.CreateSimpleButton('startBtn', '开始游戏 →');
        startBtn.width = '180px';
        startBtn.height = '50px';
        startBtn.color = '#FFFFFF';
        startBtn.background = 'linear-gradient(135deg, #4CAF50, #2E7D32)';
        startBtn.cornerRadius = 10;
        startBtn.thickness = 0;
        startBtn.fontSize = 18;
        startBtn.fontWeight = 'bold';
        startBtn.onPointerClickObservable.add(() => {
            if (this.selectedMode) {
                this.onStartGame?.(this.selectedMode);
            }
        });
        footer.addControl(startBtn);
    }

    /**
     * 刷新模式卡片状态
     */
    private refreshModeCards(): void {
        this.modeCards.forEach((card, mode) => {
            const modeConfig = CL_GAME_MODE_CONFIGS[mode];
            const isUnlocked = this.progressManager.isModeUnlocked(mode);
            const networkOk = !modeConfig?.requiresNetwork || this.isOnline;
            const isAvailable = isUnlocked && networkOk;
            
            card.background = isAvailable 
                ? (this.selectedMode === mode ? CL_STYLE.cardBgSelected : CL_STYLE.cardBg)
                : CL_STYLE.cardBgLocked;
        });
    }

    /**
     * 获取当前选中的模式
     */
    getSelectedMode(): ClGameMode | null {
        return this.selectedMode;
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.container?.dispose();
        this.container = null;
        this.modeCards.clear();
    }
}
