/**
 * 模块化大世界场景管理器 (重构版)
 * 
 * 模块: client/render/world
 * 前缀: Cl
 * 文档: 文档/04-client.md, 文档/08-性能优化.md
 * 
 * 架构说明：
 * - 采用模块化设计，职责分离
 * - 每个子系统独立管理自己的资源
 * - 主场景只负责协调各个子系统
 * - MCP 命令处理委托给 ClWorldMcpHandler
 * - 战斗管理委托给 ClWorldBattleManager
 * - 资源系统集成 LOD、纹理流、预加载队列
 * - 便于扩展和维护
 */

import {
    Scene,
    Vector3,
    Color4,
    TransformNode,
    ArcRotateCamera,
    Mesh,
} from '@babylonjs/core';

// 子系统
import { ClTreeSystem } from './vegetation/cl_tree_system';
import { ClBambooSystem } from './vegetation/cl_bamboo_system';
import { ClCullingSystem } from './optimization/cl_culling_system';
import { ClOctreeSystem } from './optimization/cl_octree_system';
import { ClTerrainManager } from './terrain/cl_terrain_manager';
import { ClLightingSystem } from './lighting/cl_lighting_system';
import { ClPostProcessing, PostProcessingQuality } from './effects/cl_post_processing';
import { ClCameraController } from './camera/cl_camera_controller';
import { ClStructureSystem } from './structures/cl_structure_system';
import { ClParticleSystem } from './effects/cl_particle_system';
import { ClAssetManager } from './cl_asset_manager';
import { ClMaterialLibrary } from './cl_material_library';
import { ClPlayerController } from './gameplay/cl_player_controller';
import { ClInteractionSystem } from './interaction/cl_interaction_system';
import { ClFeedbackSystem } from './ui/cl_feedback_system';
import { ClCharacterStats } from './gameplay/stats/cl_character_stats';
import { ClStatusUI } from './gameplay/stats/cl_status_ui';
import { ClInventorySystem } from './gameplay/inventory/cl_inventory_system';
import { ClInventoryUI } from './gameplay/inventory/cl_inventory_ui';
import { ClEditorUI } from './ui/index';
import { ClEditorManager } from './editor/cl_editor_manager';
import { AdvancedDynamicTexture } from '@babylonjs/gui';
import { ClEnemySystem } from './entities/cl_enemy_system';
import { ClPlayerEntity } from './entities/cl_player_entity';
import { ClLevelLoader } from './core/cl_level_loader';
import { ClResourceIntegration } from './core/cl_resource_integration';
import { ClLoadingUI } from './ui/cl_loading_ui';
import { ClWaypointSystem } from './systems/cl_waypoint_system';
import { ClMcpHandler, ClMcpCommand, cl_getMcpService } from '../../network';

// 处理器模块
import { ClWorldMcpHandler, ClWorldBattleManager } from './handlers';

// 注意：此文件是新的模块化版本
// MCP 命令处理已拆分到 ClWorldMcpHandler
// 战斗管理已拆分到 ClWorldBattleManager

/**
 * 大世界场景管理器 (模块化架构 v2.0)
 */
export class ClWorldSceneModular implements ClMcpHandler {
    private scene: Scene;
    private sceneRoot: TransformNode;
    
    // 处理器模块
    private mcpHandler: ClWorldMcpHandler;
    private battleManager: ClWorldBattleManager;
    
    // 资源管理
    public assetManager: ClAssetManager;
    public materialLibrary: ClMaterialLibrary;
    public levelLoader: ClLevelLoader | null = null;
    
    // 资源系统集成 (LOD + 纹理流 + 预加载)
    private resourceIntegration: ClResourceIntegration | null = null;
    private loadingUI: ClLoadingUI | null = null;
    
    // 核心子系统
    private cameraController: ClCameraController | null = null;
    private lightingSystem: ClLightingSystem | null = null;
    private postProcessing: ClPostProcessing | null = null;
    
    // 内容子系统
    private terrainManager: ClTerrainManager | null = null;
    private treeSystem: ClTreeSystem | null = null;
    private bambooSystem: ClBambooSystem | null = null;
    private structureSystem: ClStructureSystem | null = null;
    private particleSystem: ClParticleSystem | null = null;
    
    // 玩法子系统
    private playerController: ClPlayerController | null = null;
    private interactionSystem: ClInteractionSystem | null = null;
    private feedbackSystem: ClFeedbackSystem | null = null;
    
    // 游戏数据与UI
    private characterStats: ClCharacterStats | null = null;
    private statusUI: ClStatusUI | null = null;
    private inventorySystem: ClInventorySystem | null = null;
    private inventoryUI: ClInventoryUI | null = null;
    private editorUI: ClEditorUI | null = null;
    private editorManager: ClEditorManager | null = null;
    
    // 实体子系统
    private enemySystem: ClEnemySystem | null = null;
    private playerEntity: ClPlayerEntity | null = null;
    private waypointSystem: ClWaypointSystem | null = null;
    
    // 优化子系统
    private cullingSystem: ClCullingSystem | null = null;
    private octreeSystem: ClOctreeSystem | null = null;

    // private battleTriggerCallback: ((enemy: EnemyData) => void) | null = null;

    constructor(scene: Scene) {
        this.scene = scene;
        this.sceneRoot = new TransformNode('worldSceneRoot', scene);
        scene.clearColor = new Color4(0.02, 0.02, 0.05, 1);
        
        // 初始化资源管理
        this.assetManager = new ClAssetManager(scene);
        this.materialLibrary = new ClMaterialLibrary(scene, this.assetManager);
        
        // 初始化处理器
        this.mcpHandler = new ClWorldMcpHandler(scene);
        this.battleManager = new ClWorldBattleManager(scene);
    }

    /**
     * 设置战斗触发回调
     */
    public setBattleTriggerCallback(callback: (enemy: any) => void): void {
        // 将回调传递给 battleManager
        this.battleManager.setStateCallback({
            onEnemyEncounter: callback
        });
    }
    
    /**
     * 重置战斗状态（战斗结束后调用）
     */
    public resetBattleState(): void {
        this.battleManager.resetBattleState();
    }

    /**
     * 初始化场景（完整版）
     */
    async init(canvas: HTMLCanvasElement): Promise<void> {
        console.log('🏗️ 初始化模块化世界场景 v2.0...');
        
        // 第0步：初始化资源系统与加载UI
        await this.initResourceSystem();
        
        // 显示加载UI
        this.loadingUI?.show('正在加载世界场景...');
        this.loadingUI?.updateProgress(5, '初始化资源管理器...');
        
        // 初始化资源与材质
        await this.assetManager.init();
        this.materialLibrary.init();
        this.loadingUI?.updateProgress(10, '资源管理器就绪');
        
        // 第1步：核心系统（相机、光照、后处理）
        this.loadingUI?.updateProgress(15, '初始化核心系统...');
        await this.initCoreSystem(canvas);
        this.loadingUI?.updateProgress(25, '核心系统就绪');
        
        // 第2步：地形系统
        this.loadingUI?.updateProgress(30, '生成地形...');
        await this.initTerrain();
        this.loadingUI?.updateProgress(40, '地形生成完成');
        
        // 第3步：植被系统
        this.loadingUI?.updateProgress(45, '生成植被...');
        await this.initVegetation();
        this.loadingUI?.updateProgress(60, '植被生成完成');
        
        // 第4步：建筑系统
        this.loadingUI?.updateProgress(65, '加载建筑...');
        await this.initStructures();
        this.loadingUI?.updateProgress(75, '建筑加载完成');
        
        // 第5步：特效系统
        this.loadingUI?.updateProgress(78, '初始化特效...');
        await this.initEffects();
        
        // 第5.5步：UI反馈系统
        this.feedbackSystem = new ClFeedbackSystem(this.scene);
        this.feedbackSystem.init();
        this.loadingUI?.updateProgress(82, '特效系统就绪');
        
        // 第6步：玩法系统 (玩家)
        this.loadingUI?.updateProgress(85, '初始化玩家系统...');
        await this.initGameplay();
        
        // 第6.5步：实体系统 (敌人、NPC)
        this.loadingUI?.updateProgress(90, '初始化实体系统...');
        await this.initEntities();
        
        this.loadingUI?.updateProgress(95, '玩家系统就绪');
        
        // 加载地图
        if (this.levelLoader) {
            this.loadingUI?.updateProgress(96, '加载地图数据...');
            await this.levelLoader.loadMap('map_default');
        }

        // 第7步：优化系统
        this.loadingUI?.updateProgress(98, '初始化优化系统...');
        this.initOptimization();
        
        // 完成
        this.loadingUI?.updateProgress(100, '加载完成！');
        
        // 延迟隐藏加载UI
        setTimeout(() => {
            this.loadingUI?.hide();
        }, 300);
        
        // 设置 MCP 处理器依赖
        if (this.levelLoader) {
            this.mcpHandler.setLevelLoader(this.levelLoader);
        }
        if (this.editorManager) {
            this.mcpHandler.setEditorManager(this.editorManager);
        }
        
        // 注册 MCP 处理器
        cl_getMcpService().registerHandler(this);
        
        console.log('✅ 模块化世界场景初始化完成');
    }
    
    /**
     * 初始化资源系统
     */
    private async initResourceSystem(): Promise<void> {
        // 加载UI
        this.loadingUI = new ClLoadingUI(this.scene);
        this.loadingUI.init();
        
        // 资源系统集成
        this.resourceIntegration = new ClResourceIntegration(this.scene, this.assetManager, {
            enableLOD: true,
            enableTextureStreaming: true,
            enableResourceQueue: true,
        });
        this.resourceIntegration.init();
        
        // 连接加载状态到UI
        this.resourceIntegration.setLoadingStateCallback((isLoading, progress) => {
            if (isLoading) {
                this.loadingUI?.updateProgress(progress, '加载资源中...');
            }
        });
        
        console.log('✅ 资源系统初始化完成');
    }
    
    /**
     * 初始化核心系统
     */
    private async initCoreSystem(canvas: HTMLCanvasElement): Promise<void> {
        // 相机控制
        this.cameraController = new ClCameraController(this.scene);
        this.cameraController.init(canvas);
        this.cameraController.setMoveBounds(-50, 50, -50, 50);
        
        // 光照系统
        this.lightingSystem = new ClLightingSystem(this.scene, this.sceneRoot);
        await this.lightingSystem.init();
        
        // 后处理效果
        const camera = this.cameraController.getCamera();
        this.postProcessing = new ClPostProcessing(this.scene, camera);
        await this.postProcessing.init(PostProcessingQuality.HIGH);
    }

    /**
     * 初始化地形系统
     */
    private async initTerrain(): Promise<void> {
        this.terrainManager = new ClTerrainManager(this.scene, this.sceneRoot, this.materialLibrary);
        await this.terrainManager.init();
        
        // 注册地形投射阴影
        const shadowGen = this.lightingSystem?.getShadowGenerator();
        if (shadowGen) {
            this.terrainManager.getMeshes().forEach(mesh => {
                mesh.receiveShadows = true;
            });
        }
    }

    /**
     * 初始化植被系统
     */
    private async initVegetation(): Promise<void> {
        const shadowGen = this.lightingSystem?.getShadowGenerator() || null;
        
        // 树木系统 - 需要所有依赖
        if (this.terrainManager) {
            this.treeSystem = new ClTreeSystem(
                this.scene, 
                this.sceneRoot, 
                shadowGen,
                this.assetManager,
                this.materialLibrary,
                this.terrainManager
            );
            await this.treeSystem.init();
            
            // 竹林系统
            this.bambooSystem = new ClBambooSystem(
                this.scene, 
                this.sceneRoot,
                this.assetManager,
                this.materialLibrary,
                this.terrainManager
            );
            await this.bambooSystem.init();
        }
    }
    
    /**
     * 初始化建筑系统
     */
    private async initStructures(): Promise<void> {
        const shadowGen = this.lightingSystem?.getShadowGenerator() || null;
        
        if (this.terrainManager) {
            this.structureSystem = new ClStructureSystem(
                this.scene, 
                this.sceneRoot, 
                shadowGen,
                this.assetManager,
                this.materialLibrary,
                this.terrainManager
            );
            await this.structureSystem.init();
        }
        
        // 初始化关卡加载器 (在所有子系统初始化后)
        if (this.treeSystem && this.structureSystem && this.terrainManager) {
            this.levelLoader = new ClLevelLoader(
                this.scene,
                this.treeSystem,
                this.structureSystem,
                this.terrainManager,
                this.assetManager
            );
        }
    }
    
    /**
     * 初始化特效系统
     */
    private async initEffects(): Promise<void> {
        this.particleSystem = new ClParticleSystem(this.scene, this.sceneRoot);
        await this.particleSystem.init();
    }
    
    /**
     * 初始化实体系统
     */
    private async initEntities(): Promise<void> {
        // 玩家实体
        if (this.playerController) {
            this.playerEntity = new ClPlayerEntity(this.scene, this.sceneRoot);
            await this.playerEntity.init();
            
            // 同步玩家位置
            const playerMesh = this.playerController.getMesh();
            if (playerMesh) {
                this.playerEntity.setPosition(playerMesh.position);
            }
        }
        
        // 敌人系统
        this.enemySystem = new ClEnemySystem(this.scene, this.sceneRoot);
        await this.enemySystem.init();
        
        // 设置地形高度回调，让敌人始终站在地形上
        if (this.terrainManager) {
            this.enemySystem.setTerrainHeightCallback((x, z) => {
                return this.terrainManager!.getHeightAt(x, z);
            });
        }

        // 初始化战斗管理器
        this.battleManager.init();
        if (this.playerController) {
            this.battleManager.setPlayerController(this.playerController);
        }
        if (this.playerEntity) {
            this.battleManager.setPlayerEntity(this.playerEntity);
        }
        this.battleManager.setEnemySystem(this.enemySystem);
        this.battleManager.setUI(this.statusUI, this.inventoryUI);

        // 路径点系统
        this.waypointSystem = new ClWaypointSystem(this.scene);

        // 注入系统到关卡加载器
        if (this.levelLoader) {
            this.levelLoader.setEnemySystem(this.enemySystem);
            this.levelLoader.setWaypointSystem(this.waypointSystem);
        }
        
        // 启动碰撞检测循环
        this.battleManager.startCollisionDetection();
        
        console.log('✅ 实体系统初始化完成');
    }

    /**
     * 初始化玩法系统
     */
    private async initGameplay(): Promise<void> {
        // 0. 初始化数据层 (Model)
        this.characterStats = new ClCharacterStats(100, 100);
        this.inventorySystem = new ClInventorySystem(20);
        
        // 0.5 初始化 UI 层 (View)
        // 注意：这里临时创建一个全屏 UI，实际项目中应该统一管理
        const gui = AdvancedDynamicTexture.CreateFullscreenUI('gameplayUI', true, this.scene);
        this.statusUI = new ClStatusUI(gui, this.characterStats);
        this.inventoryUI = new ClInventoryUI(gui, this.inventorySystem);
        
        // 初始化编辑器管理器
        this.editorManager = new ClEditorManager(this.scene);
        
        // 设置高度查询回调 (用于复制物体时自动贴地)
        if (this.terrainManager) {
            this.editorManager.setTerrainHeightCallback((x, z) => {
                return this.terrainManager!.getHeightAt(x, z);
            });
        }
        
        this.editorUI = new ClEditorUI(this.scene, gui, this.assetManager, this.editorManager, this.levelLoader);
        
        // 按 'B' 键打开背包
        // 按 'E' 键打开编辑器
        this.scene.onKeyboardObservable.add((kbInfo) => {
            if (kbInfo.type === 1) { // KeyDown
                if (kbInfo.event.key.toLowerCase() === 'b') {
                    this.inventoryUI?.toggle();
                } else if (kbInfo.event.key.toLowerCase() === 'e') {
                    this.editorUI?.toggle();
                }
            }
        });

        // 1. 玩家控制器
        if (this.terrainManager) {
            this.playerController = new ClPlayerController(
                this.scene,
                this.sceneRoot,
                this.terrainManager,
                this.materialLibrary
            );
            await this.playerController.init();
            
            // 相机跟随玩家
            const playerMesh = this.playerController.getMesh();
            if (playerMesh && this.cameraController) {
                this.cameraController.lockTarget(playerMesh);
            }
        }
        
        // 2. 交互系统
        this.interactionSystem = new ClInteractionSystem(this.scene);
        this.interactionSystem.init();
        
        // 注意：实体系统 (敌人、NPC) 在 init() 的第6.5步单独初始化
        // 不要在这里重复调用 initEntities()
        
        // 绑定交互事件
        this.interactionSystem.onInteract = (mesh, type) => {
            if (!this.feedbackSystem) return;
            
            const pos = mesh.getAbsolutePosition();
            const playerPos = this.playerController?.getMesh()?.position || pos;
            
            if (type === 'gather') {
                // 检查并消耗体力
                if (this.characterStats && this.characterStats.consumeStamina(10)) {
                    
                    // 添加物品 (简单模拟：树木掉落木材)
                    if (this.inventorySystem) {
                        const remaining = this.inventorySystem.addItem({
                            id: 'wood',
                            name: '灵木',
                            icon: '🌲', // 临时图标
                            description: '蕴含灵气的木材',
                            type: 'material',
                            stackable: true
                        }, 1);
                        
                        if (remaining === 0) {
                            this.feedbackSystem.showFloatingText(pos, '获得: 灵木 x1', '#00ff00');
                        } else {
                            this.feedbackSystem.showFloatingText(pos, '背包已满', '#ff0000');
                            // 返还体力? 暂时不返还
                        }
                    }
                } else {
                    this.feedbackSystem.showFloatingText(playerPos, '体力不足!', '#ff0000');
                }
            } else if (type === 'rest') {
                // 休息恢复
                if (this.characterStats) {
                    this.characterStats.heal(50);
                    this.characterStats.restoreStamina(50);
                    this.feedbackSystem.showFloatingText(pos, '休息中...', '#00aaff');
                    this.feedbackSystem.showHeal(playerPos, 50);
                }
            } else {
                this.feedbackSystem.showFloatingText(pos, '交互', '#ffffff');
            }
        };
    }

    /**
     * 初始化优化系统
     */
    private initOptimization(): void {
        // 视锥剔除系统
        this.cullingSystem = new ClCullingSystem(this.scene);
        this.cullingSystem.init();
        
        // Octree空间分割系统
        this.octreeSystem = new ClOctreeSystem(this.scene, 120);
        this.octreeSystem.init();
        
        // 注册物体到优化系统
        this.registerObjectsToOptimization();
    }

    /**
     * 注册物体到优化系统
     */
    private registerObjectsToOptimization(): void {
        const allMeshes: Mesh[] = [];
        
        // 收集所有网格
        if (this.terrainManager) {
            allMeshes.push(...this.terrainManager.getMeshes());
        }
        if (this.treeSystem) {
            allMeshes.push(...this.treeSystem.getMeshes());
        }
        if (this.bambooSystem) {
            allMeshes.push(...this.bambooSystem.getMeshes());
        }
        if (this.structureSystem) {
            allMeshes.push(...this.structureSystem.getMeshes());
        }
        
        // 注册到剔除系统
        if (this.cullingSystem) {
            this.cullingSystem.registerMultiple(allMeshes);
            // 地面和水面始终可见
            const terrain = this.terrainManager?.getMeshes();
            if (terrain && terrain.length >= 2) {
                this.cullingSystem.setAlwaysVisible(terrain[0], true); // ground
                this.cullingSystem.setAlwaysVisible(terrain[1], true); // water
            }
        }
        
        // 注册到Octree系统
        if (this.octreeSystem) {
            this.octreeSystem.addMeshes(allMeshes);
            this.octreeSystem.logStats();
        }
    }

    /**
     * 设置摄像机为俯视角（神界：原罪2风格）
     */
    setupCamera(camera: ArcRotateCamera): void {
        camera.alpha = -Math.PI / 2;
        camera.beta = Math.PI / 3.5;
        camera.radius = 28;
        camera.lowerBetaLimit = Math.PI / 6;
        camera.upperBetaLimit = Math.PI / 2.2;
        camera.lowerRadiusLimit = 10;
        camera.upperRadiusLimit = 50;
        
        camera.setTarget(new Vector3(0, 1, 0));
    }

    /**
     * 获取性能统计数据
     */
    getPerformanceStats() {
        return {
            culling: this.cullingSystem?.getStats(),
            octree: this.octreeSystem?.getStats(),
            resources: this.resourceIntegration?.getStats(),
        };
    }
    
    /**
     * 获取资源系统集成
     */
    getResourceIntegration(): ClResourceIntegration | null {
        return this.resourceIntegration;
    }
    
    /**
     * 获取相机控制器
     */
    getCameraController(): ClCameraController | null {
        return this.cameraController;
    }
    
    /**
     * 获取玩家控制器
     */
    getPlayerController(): ClPlayerController | null {
        return this.playerController;
    }
    
    /**
     * 获取敌人系统
     */
    getEnemySystem(): ClEnemySystem | null {
        return this.enemySystem;
    }
    
    /**
     * 获取玩家实体
     */
    getPlayerEntity(): ClPlayerEntity | null {
        return this.playerEntity;
    }
    
    /**
     * 设置后处理质量
     */
    setPostProcessingQuality(quality: PostProcessingQuality): void {
        this.postProcessing?.setQuality(quality);
    }

    /**
     * 处理 MCP 命令 (委托给 MCP 处理器)
     */
    handleMcpCommand(command: ClMcpCommand): void {
        this.mcpHandler.handleCommand(command);
    }

    /**
     * 显示场景
     */
    show(): void {
        this.sceneRoot.setEnabled(true);
    }

    /**
     * 隐藏场景
     */
    hide(): void {
        this.sceneRoot.setEnabled(false);
    }

    /**
     * 清理资源
     */
    dispose(): void {
        // 资源系统
        this.resourceIntegration?.dispose();
        this.loadingUI?.dispose();
        
        // 核心系统
        this.cameraController?.dispose();
        this.lightingSystem?.dispose();
        this.postProcessing?.dispose();
        
        // 内容系统
        this.terrainManager?.dispose();
        this.treeSystem?.dispose();
        this.bambooSystem?.dispose();
        this.structureSystem?.dispose();
        this.particleSystem?.dispose();
        
        // 玩法系统
        this.playerController?.dispose();
        this.interactionSystem?.dispose();
        this.feedbackSystem?.dispose();
        this.statusUI?.dispose();
        this.inventoryUI?.dispose();
        
        // 实体系统
        this.enemySystem?.dispose();
        this.playerEntity?.dispose();
        
        // 优化系统
        this.cullingSystem?.dispose();
        this.octreeSystem?.dispose();
        
        this.sceneRoot.dispose();
    }
}

export default ClWorldSceneModular;
