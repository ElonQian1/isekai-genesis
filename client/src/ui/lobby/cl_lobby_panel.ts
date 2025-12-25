/**
 * 大厅界面 - 房间列表和创建
 * 
 * 模块: client/ui/lobby
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责：
 * - 显示房间列表
 * - 创建房间
 * - 加入房间
 * - 进入大世界
 */

import {
    AdvancedDynamicTexture,
    Rectangle,
    TextBlock,
    InputText,
    Button,
    StackPanel,
    ScrollViewer,
    Control,
} from '@babylonjs/gui';

import { CL_LOBBY_CONFIG, ClRoomData } from './cl_lobby_types';

// =============================================================================
// 大厅界面
// =============================================================================

export class ClLobbyUI {
    private gui: AdvancedDynamicTexture;
    private container: Rectangle;
    private roomList: StackPanel;
    private _roomNameInput: InputText;
    
    public onCreateRoom: ((name: string) => void) | null = null;
    public onJoinRoom: ((roomId: string) => void) | null = null;
    public onRefresh: (() => void) | null = null;
    public onExploreWorld: (() => void) | null = null;

    constructor(gui: AdvancedDynamicTexture) {
        this.gui = gui;
        this.container = this.createContainer();
        const elements = this.createLobbyContent();
        this.roomList = elements.roomList;
        this._roomNameInput = elements.roomNameInput;
    }

    /**
     * 创建容器
     */
    private createContainer(): Rectangle {
        const container = new Rectangle('lobbyContainer');
        container.width = CL_LOBBY_CONFIG.PANEL_WIDTH;
        container.height = CL_LOBBY_CONFIG.PANEL_HEIGHT;
        container.cornerRadius = 20;
        container.color = '#4a90d9';
        container.thickness = 3;
        container.background = 'rgba(20, 20, 40, 0.95)';
        container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        container.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        container.isVisible = false;
        
        this.gui.addControl(container);
        return container;
    }

    /**
     * 创建大厅内容
     */
    private createLobbyContent(): { roomList: StackPanel; roomNameInput: InputText } {
        const mainStack = new StackPanel('lobbyMainStack');
        mainStack.isVertical = true;
        mainStack.width = '95%';
        mainStack.paddingTop = '20px';
        this.container.addControl(mainStack);

        // 标题
        const title = new TextBlock('lobbyTitle', '🏠 游戏大厅');
        title.color = '#ffd700';
        title.fontSize = 28;
        title.fontWeight = 'bold';
        title.height = '50px';
        mainStack.addControl(title);

        // 探索世界按钮
        const exploreBtn = Button.CreateSimpleButton('exploreWorldBtn', '🗺️ 探索暗黑世界');
        exploreBtn.width = '100%';
        exploreBtn.height = '50px';
        exploreBtn.color = 'white';
        exploreBtn.fontSize = 18;
        exploreBtn.fontWeight = 'bold';
        exploreBtn.background = '#3e2723';
        exploreBtn.cornerRadius = 10;
        exploreBtn.thickness = 0;
        exploreBtn.onPointerEnterObservable.add(() => {
            exploreBtn.background = '#5d4037';
        });
        exploreBtn.onPointerOutObservable.add(() => {
            exploreBtn.background = '#3e2723';
        });
        exploreBtn.onPointerClickObservable.add(() => {
            this.onExploreWorld?.();
        });
        mainStack.addControl(exploreBtn);

        // 间隔
        const spacer1 = new Rectangle('spacer1');
        spacer1.height = '10px';
        spacer1.thickness = 0;
        spacer1.background = 'transparent';
        mainStack.addControl(spacer1);

        // 创建房间区域
        const createPanel = this.createRoomCreationPanel();
        mainStack.addControl(createPanel.panel);

        // 房间列表标题
        const listHeader = new StackPanel('listHeader');
        listHeader.isVertical = false;
        listHeader.height = '40px';
        listHeader.paddingTop = '15px';
        mainStack.addControl(listHeader);

        const listTitle = new TextBlock('listTitle', '📋 房间列表');
        listTitle.color = 'white';
        listTitle.fontSize = 18;
        listTitle.width = '200px';
        listTitle.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        listHeader.addControl(listTitle);

        const refreshBtn = Button.CreateSimpleButton('refreshBtn', '🔄 刷新');
        refreshBtn.width = '80px';
        refreshBtn.height = '30px';
        refreshBtn.color = 'white';
        refreshBtn.background = '#555';
        refreshBtn.cornerRadius = 5;
        refreshBtn.fontSize = 12;
        refreshBtn.onPointerClickObservable.add(() => {
            this.onRefresh?.();
        });
        listHeader.addControl(refreshBtn);

        // 房间列表滚动区域
        const scrollViewer = new ScrollViewer('roomScrollViewer');
        scrollViewer.width = '100%';
        scrollViewer.height = '250px';
        scrollViewer.thickness = 0;
        scrollViewer.barSize = 10;
        scrollViewer.barColor = '#4a90d9';
        mainStack.addControl(scrollViewer);

        const roomList = new StackPanel('roomList');
        roomList.isVertical = true;
        roomList.width = '100%';
        scrollViewer.addControl(roomList);

        return { roomList, roomNameInput: createPanel.input };
    }

    /**
     * 创建房间创建面板
     */
    private createRoomCreationPanel(): { panel: StackPanel; input: InputText } {
        const panel = new StackPanel('createRoomPanel');
        panel.isVertical = false;
        panel.height = '50px';
        panel.paddingTop = '10px';

        const input = new InputText('roomNameInput');
        input.width = '300px';
        input.height = '40px';
        input.color = 'white';
        input.background = 'rgba(255, 255, 255, 0.1)';
        input.focusedBackground = 'rgba(255, 255, 255, 0.2)';
        input.thickness = 1;
        input.placeholderText = '输入房间名称...';
        input.placeholderColor = '#666';
        input.text = `房间${Math.floor(Math.random() * 1000)}`;
        panel.addControl(input);

        const spacer = new Rectangle('spacer');
        spacer.width = '10px';
        spacer.thickness = 0;
        spacer.background = 'transparent';
        panel.addControl(spacer);

        const createBtn = Button.CreateSimpleButton('createRoomBtn', '➕ 创建房间');
        createBtn.width = '120px';
        createBtn.height = '40px';
        createBtn.color = 'white';
        createBtn.fontSize = 14;
        createBtn.background = CL_LOBBY_CONFIG.BUTTON_COLOR;
        createBtn.cornerRadius = 8;
        createBtn.onPointerEnterObservable.add(() => {
            createBtn.background = CL_LOBBY_CONFIG.BUTTON_HOVER;
        });
        createBtn.onPointerOutObservable.add(() => {
            createBtn.background = CL_LOBBY_CONFIG.BUTTON_COLOR;
        });
        createBtn.onPointerClickObservable.add(() => {
            const name = input.text.trim();
            if (name) {
                this.onCreateRoom?.(name);
            }
        });
        panel.addControl(createBtn);

        return { panel, input };
    }

    /**
     * 更新房间列表
     */
    updateRoomList(rooms: ClRoomData[]): void {
        this.roomList.clearControls();

        if (rooms.length === 0) {
            const emptyText = new TextBlock('emptyText', '暂无房间，创建一个吧！');
            emptyText.color = '#666';
            emptyText.fontSize = 14;
            emptyText.height = '50px';
            this.roomList.addControl(emptyText);
            return;
        }

        for (const room of rooms) {
            const item = this.createRoomItem(room);
            this.roomList.addControl(item);
        }
    }

    /**
     * 创建房间列表项
     */
    private createRoomItem(room: ClRoomData): Rectangle {
        const item = new Rectangle(`room_${room.id}`);
        item.width = '100%';
        item.height = CL_LOBBY_CONFIG.ROOM_ITEM_HEIGHT;
        item.cornerRadius = 8;
        item.thickness = 1;
        item.color = room.status === 'waiting' ? '#4a90d9' : '#666';
        item.background = 'rgba(255, 255, 255, 0.05)';
        item.paddingTop = '5px';
        item.paddingBottom = '5px';

        const stack = new StackPanel(`roomStack_${room.id}`);
        stack.isVertical = false;
        stack.width = '95%';
        item.addControl(stack);

        // 房间名称
        const nameText = new TextBlock(`roomName_${room.id}`, room.name);
        nameText.color = 'white';
        nameText.fontSize = 16;
        nameText.width = '200px';
        nameText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        stack.addControl(nameText);

        // 玩家数
        const playerText = new TextBlock(
            `roomPlayers_${room.id}`,
            `👥 ${room.playerCount}/${room.maxPlayers}`
        );
        playerText.color = '#aaa';
        playerText.fontSize = 14;
        playerText.width = '80px';
        stack.addControl(playerText);

        // 状态
        const statusText = new TextBlock(
            `roomStatus_${room.id}`,
            room.status === 'waiting' ? '等待中' : '游戏中'
        );
        statusText.color = room.status === 'waiting' ? '#00ff00' : '#ff6600';
        statusText.fontSize = 14;
        statusText.width = '80px';
        stack.addControl(statusText);

        // 加入按钮
        if (room.status === 'waiting' && room.playerCount < room.maxPlayers) {
            const joinBtn = Button.CreateSimpleButton(`joinBtn_${room.id}`, '加入');
            joinBtn.width = '70px';
            joinBtn.height = '35px';
            joinBtn.color = 'white';
            joinBtn.fontSize = 14;
            joinBtn.background = '#28a745';
            joinBtn.cornerRadius = 5;
            joinBtn.onPointerClickObservable.add(() => {
                this.onJoinRoom?.(room.id);
            });
            stack.addControl(joinBtn);
        }

        return item;
    }

    /**
     * 显示
     */
    show(): void {
        this.container.isVisible = true;
    }

    /**
     * 隐藏
     */
    hide(): void {
        this.container.isVisible = false;
    }
    
    /**
     * 获取房间名输入
     */
    getRoomNameInput(): string {
        return this._roomNameInput.text;
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.container.dispose();
    }
}
