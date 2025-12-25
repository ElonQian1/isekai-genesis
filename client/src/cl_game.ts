/**
 * 游戏主类
 * 
 * 模块: client
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import { Engine, Scene, ArcRotateCamera, Vector3, WebGPUEngine, Logger } from '@babylonjs/core';
import { ClSceneManagerV2 } from './cl_scene_manager_v2';

// 保留旧版引用以保持兼容性
export { ClSceneManager } from './cl_scene_manager';

// 禁用 Babylon.js 的过于详细的警告日志（减少控制台刷屏）
// 0 = None, 1 = MessageOnly, 2 = WarningOnly, 3 = All
Logger.LogLevels = Logger.ErrorLogLevel;

/**
 * 游戏主类 - 管理引擎、场景和渲染
 */
export class ClGame {
    private canvas: HTMLCanvasElement;
    private engine: Engine | WebGPUEngine | null = null;
    private scene: Scene | null = null;
    private isWebGPU: boolean = false;
    
    // 场景管理器 (v2)
    private sceneManager: ClSceneManagerV2 | null = null;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

    /**
     * 初始化游戏引擎和场景
     */
    async cl_init(): Promise<void> {
        // 尝试 WebGPU，失败则降级到 WebGL
        this.engine = await this.cl_createEngine();
        
        // 创建场景
        this.scene = this.cl_createScene();
        
        // 初始化场景管理器 (v2 - 支持单人/组队模式)
        this.sceneManager = new ClSceneManagerV2(this.scene);
        await this.sceneManager.init();
        
        // 窗口大小变化时调整
        window.addEventListener('resize', () => {
            this.engine?.resize();
        });
    }

    /**
     * 创建渲染引擎 (优先 WebGPU)
     */
    private async cl_createEngine(): Promise<Engine | WebGPUEngine> {
        // 尝试 WebGPU
        if (navigator.gpu) {
            try {
                console.log('🚀 尝试初始化 WebGPU...');
                const webgpuEngine = new WebGPUEngine(this.canvas, {
                    antialias: true,
                    stencil: true,
                });
                await webgpuEngine.initAsync();
                this.isWebGPU = true;
                console.log('✅ WebGPU 初始化成功!');
                return webgpuEngine;
            } catch (e) {
                console.warn('⚠️ WebGPU 初始化失败，降级到 WebGL:', e);
            }
        } else {
            console.log('ℹ️ 浏览器不支持 WebGPU，使用 WebGL');
        }

        // 降级到 WebGL
        console.log('🎨 使用 WebGL 引擎');
        return new Engine(this.canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
        });
    }

    /**
     * 创建游戏场景
     */
    private cl_createScene(): Scene {
        if (!this.engine) {
            throw new Error('引擎未初始化');
        }

        const scene = new Scene(this.engine);

        // 相机 - 卡牌游戏俯视角度
        const camera = new ArcRotateCamera(
            'camera',
            0,             // alpha (正对)
            Math.PI / 3,   // beta (更俯视的60度)
            20,            // radius (距离)
            new Vector3(0, 0, 0),
            scene
        );
        camera.attachControl(this.canvas, true);
        camera.lowerRadiusLimit = 12;
        camera.upperRadiusLimit = 35;
        camera.panningSensibility = 50; // 启用平移
        camera.lowerBetaLimit = 0.2;
        camera.upperBetaLimit = Math.PI / 2.5;

        return scene;
    }

    /**
     * 开始渲染循环
     */
    cl_run(): void {
        if (!this.engine || !this.scene) {
            throw new Error('引擎或场景未初始化');
        }

        this.engine.runRenderLoop(() => {
            this.scene?.render();
        });
    }

    /**
     * 获取引擎类型
     */
    cl_getEngineType(): string {
        return this.isWebGPU ? 'WebGPU' : 'WebGL';
    }
    
    /**
     * 获取场景管理器
     */
    cl_getSceneManager(): ClSceneManagerV2 | null {
        return this.sceneManager;
    }

    /**
     * 销毁游戏
     */
    cl_dispose(): void {
        this.sceneManager?.dispose();
        this.scene?.dispose();
        this.engine?.dispose();
    }
}
