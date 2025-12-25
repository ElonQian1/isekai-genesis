/**
 * 编辑器管理器 - 负责场景物体的编辑操作 (Gizmo)
 * 
 * 模块: client/render/world/editor
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责:
 * 1. 管理 GizmoManager (移动、旋转、缩放轴)
 * 2. 处理物体选中逻辑
 * 3. 提供编辑模式切换
 */

import { 
    Scene, 
    GizmoManager, 
    AbstractMesh, 
    PointerEventTypes,
    Mesh,
    MeshBuilder,
    Vector3,
    StandardMaterial,
    Color3
} from "@babylonjs/core";

export class ClEditorManager {
    private scene: Scene;
    private gizmoManager: GizmoManager;
    private selectedMesh: AbstractMesh | null = null;
    private _isEnabled: boolean = false;

    /**
     * 获取编辑器是否启用
     */
    public get isEnabled(): boolean {
        return this._isEnabled;
    }

    // 笔刷相关
    private isBrushMode: boolean = false;
    private brushRadius: number = 5;
    private brushDensity: number = 0.5; // 0-1, 每次点击生成的概率或数量
    private brushPrefab: string = "tree_pine";
    private brushVisualizer: Mesh | null = null;
    private onBrushStroke: ((position: Vector3, prefab: string) => void) | null = null;
    private isPainting: boolean = false;

    // 吸附设置
    private snapSettings = {
        position: 0, // 0 表示关闭
        rotation: 0, // 0 表示关闭 (弧度)
        scale: 0     // 0 表示关闭
    };

    // 选中回调
    private onSelectionChanged: ((mesh: AbstractMesh | null) => void) | null = null;
    
    // 高度查询回调 (用于复制时贴地)
    private getTerrainHeight: ((x: number, z: number) => number) | null = null;

    constructor(scene: Scene) {
        this.scene = scene;
        
        // 初始化 Gizmo 管理器
        this.gizmoManager = new GizmoManager(scene);
        this.setupGizmoManager();
        
        // 默认关闭
        this.setEnabled(false);
        
        // 绑定点击选择事件
        this.bindEvents();
        
        // 绑定键盘快捷键
        this.bindKeyboardShortcuts();
    }

    /**
     * 设置选中回调
     */
    public setSelectionChangedCallback(callback: (mesh: AbstractMesh | null) => void): void {
        this.onSelectionChanged = callback;
    }

    /**
     * 设置高度查询回调 (用于复制物体时自动贴地)
     */
    public setTerrainHeightCallback(callback: (x: number, z: number) => number): void {
        this.getTerrainHeight = callback;
    }

    private setupGizmoManager(): void {
        // 配置 Gizmo 样式
        this.gizmoManager.positionGizmoEnabled = false;
        this.gizmoManager.rotationGizmoEnabled = false;
        this.gizmoManager.scaleGizmoEnabled = false;
        this.gizmoManager.boundingBoxGizmoEnabled = false;
        
        // 允许通过 GizmoManager 自动处理附着
        // 但我们手动控制更精确
        this.gizmoManager.attachableMeshes = null; 
        
        // 设置快捷键 (可选)
        this.gizmoManager.usePointerToAttachGizmos = false;

        // 监听 Gizmo 创建事件以应用吸附设置
        // 因为 Gizmo 是懒加载的，可能在设置吸附时还不存在
        // 所以我们需要在启用时重新应用，或者监听创建
    }

    /**
     * 设置位置吸附 (网格对齐)
     * @param distance 吸附距离 (例如 1.0 表示每 1 米吸附一次)，0 表示关闭
     */
    public setPositionSnap(distance: number): void {
        this.snapSettings.position = distance;
        if (this.gizmoManager.gizmos.positionGizmo) {
            this.gizmoManager.gizmos.positionGizmo.snapDistance = distance;
        }
    }

    /**
     * 设置旋转吸附 (角度对齐)
     * @param angleInDegrees 吸附角度 (例如 45 度)，0 表示关闭
     */
    public setRotationSnap(angleInDegrees: number): void {
        const radians = angleInDegrees * (Math.PI / 180);
        this.snapSettings.rotation = radians;
        if (this.gizmoManager.gizmos.rotationGizmo) {
            this.gizmoManager.gizmos.rotationGizmo.snapDistance = radians;
        }
    }

    /**
     * 设置缩放吸附
     * @param factor 吸附因子，0 表示关闭
     */
    public setScaleSnap(factor: number): void {
        this.snapSettings.scale = factor;
        if (this.gizmoManager.gizmos.scaleGizmo) {
            this.gizmoManager.gizmos.scaleGizmo.snapDistance = factor;
        }
    }

    private bindEvents(): void {
        this.scene.onPointerObservable.add((pointerInfo) => {
            if (!this.isEnabled) return;
            
            // 笔刷模式处理
            if (this.isBrushMode) {
                this.handleBrushInput(pointerInfo);
                return;
            }
            
            if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
                // 如果点击了 Gizmo，不处理选择
                if (pointerInfo.pickInfo?.pickedMesh?.name.startsWith("gizmo")) return;

                if (pointerInfo.pickInfo && pointerInfo.pickInfo.hit && pointerInfo.pickInfo.pickedMesh) {
                    const mesh = pointerInfo.pickInfo.pickedMesh;
                    
                    // 过滤掉不可编辑的物体 (如地面、天空盒)
                    if (this.isEditable(mesh)) {
                        this.selectMesh(mesh);
                    } else {
                        this.deselect();
                    }
                } else {
                    this.deselect();
                }
            }
        });
    }

    /**
     * 绑定键盘快捷键
     */
    private bindKeyboardShortcuts(): void {
        this.scene.onKeyboardObservable.add((kbInfo) => {
            if (!this.isEnabled) return;
            
            // 只响应 KeyDown 事件
            if (kbInfo.type !== 1) return;
            
            const key = kbInfo.event.key.toLowerCase();
            
            switch (key) {
                case 'delete':
                case 'backspace':
                    // Delete 或 Backspace 删除选中物体
                    this.deleteSelected();
                    break;
                case 'd':
                    // Ctrl+D 或 D 复制选中物体
                    if (kbInfo.event.ctrlKey || !kbInfo.event.ctrlKey) {
                        this.duplicateSelected();
                    }
                    break;
                case 'w':
                    // W 切换到移动模式
                    this.setGizmoType('position');
                    break;
                case 'r':
                    // R 切换到旋转模式
                    this.setGizmoType('rotation');
                    break;
                case 's':
                    // S 切换到缩放模式 (注意：可能与其他快捷键冲突)
                    if (!kbInfo.event.ctrlKey) {
                        this.setGizmoType('scale');
                    }
                    break;
                case 'escape':
                    // ESC 取消选中
                    this.deselect();
                    break;
            }
        });
    }

    /**
     * 获取所有可编辑的物体
     */
    public getAllEditableMeshes(): AbstractMesh[] {
        // 过滤掉不可编辑的物体，且只返回有 metadata 的逻辑根节点
        return this.scene.meshes.filter(mesh => this.isEditable(mesh) && mesh.metadata && mesh.metadata.type);
    }

    /**
     * 判断物体是否可编辑
     */
    private isEditable(mesh: AbstractMesh): boolean {
        // 简单规则：名字里包含 "ground" 或 "sky" 的不可编辑
        if (mesh.name.includes("ground") || mesh.name.includes("sky") || mesh.name.includes("Terrain")) {
            return false;
        }
        // 只有启用的物体才可编辑
        if (!mesh.isEnabled()) return false;
        
        return true;
    }

    /**
     * 选中物体
     */
    public selectMesh(mesh: AbstractMesh): void {
        // 如果选中的是子网格，尝试找到逻辑根节点（有 metadata 的节点）
        let target = mesh;
        
        // 向上查找，但遇到以下情况停止：
        // 1. 节点有 metadata (表示是我们放置的物体)
        // 2. 父节点是场景根节点 (名字包含 "SceneRoot" 或 "Root")
        // 3. 没有父节点
        while (target.parent && (target.parent as AbstractMesh).name) {
            const parentName = (target.parent as AbstractMesh).name;
            
            // 如果当前节点有 metadata，说明是逻辑根节点，停止查找
            if (target.metadata && target.metadata.type) {
                break;
            }
            
            // 如果父节点是场景根节点，停止查找
            if (parentName.includes('SceneRoot') || 
                parentName.includes('worldSceneRoot') || 
                parentName === 'root' ||
                parentName === '__root__') {
                break;
            }
            
            target = target.parent as AbstractMesh;
        }

        this.selectedMesh = target;
        this.gizmoManager.attachToMesh(target);
        console.log(`🎯 选中物体: ${target.name}`);
        
        if (this.onSelectionChanged) {
            this.onSelectionChanged(target);
        }
    }

    /**
     * 取消选中
     */
    public deselect(): void {
        this.selectedMesh = null;
        this.gizmoManager.attachToMesh(null);
        
        if (this.onSelectionChanged) {
            this.onSelectionChanged(null);
        }
    }

    /**
     * 启用/禁用编辑器
     */
    public setEnabled(enabled: boolean): void {
        this._isEnabled = enabled;
        if (!enabled) {
            this.deselect();
            this.gizmoManager.positionGizmoEnabled = false;
            this.gizmoManager.rotationGizmoEnabled = false;
            this.gizmoManager.scaleGizmoEnabled = false;
        } else {
            // 默认开启移动轴
            this.setGizmoType('position');
        }
    }

    /**
     * 根据 ID 删除物体
     */
    public deleteById(id: string): void {
        const mesh = this.scene.getMeshByName(id);
        if (mesh) {
            mesh.dispose();
            if (this.selectedMesh === mesh) {
                this.deselect();
            }
        }
    }

    /**
     * 设置 Gizmo 类型
     */
    public setGizmoType(type: 'position' | 'rotation' | 'scale' | 'none'): void {
        if (!this.isEnabled) return;

        this.gizmoManager.positionGizmoEnabled = false;
        this.gizmoManager.rotationGizmoEnabled = false;
        this.gizmoManager.scaleGizmoEnabled = false;

        switch (type) {
            case 'position':
                this.gizmoManager.positionGizmoEnabled = true;
                // 重新应用吸附设置 (因为 Gizmo 可能被重新创建)
                if (this.gizmoManager.gizmos.positionGizmo) {
                    this.gizmoManager.gizmos.positionGizmo.snapDistance = this.snapSettings.position;
                }
                break;
            case 'rotation':
                this.gizmoManager.rotationGizmoEnabled = true;
                if (this.gizmoManager.gizmos.rotationGizmo) {
                    this.gizmoManager.gizmos.rotationGizmo.snapDistance = this.snapSettings.rotation;
                }
                break;
            case 'scale':
                this.gizmoManager.scaleGizmoEnabled = true;
                if (this.gizmoManager.gizmos.scaleGizmo) {
                    this.gizmoManager.gizmos.scaleGizmo.snapDistance = this.snapSettings.scale;
                }
                break;
            case 'none':
                break;
        }
    }
    
    /**
     * 获取当前选中的物体
     */
    public getSelectedMesh(): AbstractMesh | null {
        return this.selectedMesh;
    }

    /**
     * 删除选中的物体
     */
    public deleteSelected(): void {
        if (this.selectedMesh) {
            console.log(`🗑️ 删除物体: ${this.selectedMesh.name}`);
            this.selectedMesh.dispose();
            this.deselect();
        }
    }

    /**
     * 复制选中的物体
     */
    public duplicateSelected(): void {
        if (this.selectedMesh) {
            console.log(`📋 复制物体: ${this.selectedMesh.name}`);
            
            // 克隆物体
            // 注意：clone 会复制几何体引用，instantiateHierarchy 会复制整个层级
            // 对于复杂的 GLB 模型，通常是一个层级结构，所以用 instantiateHierarchy 或 clone 根节点
            // 这里假设 selectedMesh 是根节点
            
            const newName = `${this.selectedMesh.name}_copy_${Date.now()}`;
            let newMesh: AbstractMesh | null = null;

            // 尝试克隆
            // 如果是 InstancedMesh
            if (this.selectedMesh.getClassName() === "InstancedMesh") {
                // InstancedMesh 不能直接 clone 为另一个 InstancedMesh (API 限制)
                // 但我们可以从源 mesh 再创建一个实例
                const sourceMesh = (this.selectedMesh as any).sourceMesh;
                if (sourceMesh) {
                    newMesh = sourceMesh.createInstance(newName);
                }
            } else {
                // 普通 Mesh 或 TransformNode
                newMesh = this.selectedMesh.clone(newName, null);
            }

            if (newMesh) {
                // 偏移位置，避免重叠
                newMesh.position.x += 2;
                newMesh.position.z += 2;
                
                // 自动贴地：如果有高度查询回调，重新计算高度
                if (this.getTerrainHeight) {
                    newMesh.position.y = this.getTerrainHeight(newMesh.position.x, newMesh.position.z);
                }
                
                // 复制元数据 (关键！用于保存)
                if (this.selectedMesh.metadata) {
                    newMesh.metadata = JSON.parse(JSON.stringify(this.selectedMesh.metadata));
                }
                
                // 选中新物体
                this.selectMesh(newMesh);
                
                console.log(`✅ 复制成功: ${newMesh.name} 位置: (${newMesh.position.x.toFixed(1)}, ${newMesh.position.y.toFixed(1)}, ${newMesh.position.z.toFixed(1)})`);
            }
        }
    }

    // =============================================================================
    // 笔刷功能
    // =============================================================================

    /**
     * 启用/禁用笔刷模式
     */
    public setBrushMode(enabled: boolean): void {
        this.isBrushMode = enabled;
        if (enabled) {
            // 禁用 Gizmo
            this.gizmoManager.attachToMesh(null);
            this.createBrushVisualizer();
        } else {
            this.disposeBrushVisualizer();
        }
    }

    /**
     * 设置笔刷参数
     */
    public setBrushSettings(radius: number, density: number, prefab: string): void {
        this.brushRadius = radius;
        this.brushDensity = density;
        this.brushPrefab = prefab;
        
        if (this.brushVisualizer) {
            this.brushVisualizer.scaling.set(radius, 1, radius);
        }
    }

    /**
     * 设置笔刷回调
     */
    public setBrushStrokeCallback(callback: (position: Vector3, prefab: string) => void): void {
        this.onBrushStroke = callback;
    }

    private createBrushVisualizer(): void {
        if (this.brushVisualizer) return;
        
        // 创建一个圆环或圆盘作为笔刷指示器
        this.brushVisualizer = MeshBuilder.CreateDisc("brushVisualizer", { radius: 1, tessellation: 64 }, this.scene);
        this.brushVisualizer.rotation.x = Math.PI / 2;
        this.brushVisualizer.isPickable = false;
        
        const mat = new StandardMaterial("brushMat", this.scene);
        mat.diffuseColor = new Color3(0, 1, 0);
        mat.alpha = 0.3;
        mat.disableLighting = true;
        mat.zOffset = -1; // 防止Z-fighting
        this.brushVisualizer.material = mat;
        
        // 初始缩放
        this.brushVisualizer.scaling.set(this.brushRadius, 1, this.brushRadius);
    }

    private disposeBrushVisualizer(): void {
        if (this.brushVisualizer) {
            this.brushVisualizer.dispose();
            this.brushVisualizer = null;
        }
    }

    private handleBrushInput(pointerInfo: any): void {
        const pickInfo = pointerInfo.pickInfo;
        
        // 1. 更新笔刷位置
        if (pickInfo && pickInfo.hit && this.brushVisualizer) {
            this.brushVisualizer.position.copyFrom(pickInfo.pickedPoint);
            this.brushVisualizer.position.y += 0.1; // 稍微抬高
            this.brushVisualizer.isVisible = true;
        } else if (this.brushVisualizer) {
            this.brushVisualizer.isVisible = false;
        }

        // 2. 处理绘制
        if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
            if (pointerInfo.event.button === 0) { // 左键
                this.isPainting = true;
                this.performBrushStroke(pickInfo?.pickedPoint);
            }
        } else if (pointerInfo.type === PointerEventTypes.POINTERUP) {
            this.isPainting = false;
        } else if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
            if (this.isPainting) {
                this.performBrushStroke(pickInfo?.pickedPoint);
            }
        }
    }

    private performBrushStroke(center: Vector3 | null): void {
        if (!center || !this.onBrushStroke) return;
        
        // 简单的概率生成：每一帧尝试生成
        // 更好的做法是基于距离或时间间隔
        
        // 在半径内随机生成一个点
        const r = this.brushRadius * Math.sqrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;
        
        const x = center.x + r * Math.cos(theta);
        const z = center.z + r * Math.sin(theta);
        
        // 获取地形高度
        let y = center.y;
        if (this.getTerrainHeight) {
            y = this.getTerrainHeight(x, z);
        }
        
        // 概率检测
        if (Math.random() < this.brushDensity * 0.2) { // 降低频率
             this.onBrushStroke(new Vector3(x, y, z), this.brushPrefab);
        }
    }
}
