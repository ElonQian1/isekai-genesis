/**
 * 3D 卡牌游戏 - 主入口
 * 
 * 模块: client
 * 前缀: cl_
 * 文档: 文档/04-client.md
 */

// 首先导入 GLTF/GLB 加载器，确保在任何模型加载之前注册
import '@babylonjs/loaders/glTF';

import { ClGame } from './cl_game';
import { cl_initWasm, cl_getWasmVersion, cl_createTestBattle } from './cl_wasm';
import { cl_initLogger } from './core/cl_logger';

// 全局游戏实例
let game: ClGame | null = null;

/**
 * 初始化游戏
 */
async function cl_init(): Promise<void> {
    // 0. 初始化日志收集器（最先执行，捕获所有日志）
    cl_initLogger();
    
    const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingText = loadingScreen?.querySelector('.loading-text');
    
    if (!canvas) {
        throw new Error('找不到渲染画布 #renderCanvas');
    }
    
    try {
        // 1. 初始化 WASM
        if (loadingText) loadingText.textContent = '正在加载游戏逻辑...';
        await cl_initWasm();
        console.log(`🦀 WASM 版本: ${cl_getWasmVersion()}`);
        
        // 测试 WASM 功能
        const testBattle = cl_createTestBattle();
        console.log(`🎲 测试战斗创建成功! ID: ${testBattle.battle_id}`);
        
        // 2. 初始化游戏引擎
        if (loadingText) loadingText.textContent = '正在初始化 3D 引擎...';
        game = new ClGame(canvas);
        await game.cl_init();
        
        console.log(`🎨 渲染引擎: ${game.cl_getEngineType()}`);
        
        // 隐藏加载屏幕
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
        
        console.log('✅ 游戏初始化完成!');
        
        // 开始渲染循环
        game.cl_run();
        
    } catch (error) {
        console.error('❌ 游戏初始化失败:', error);
        
        // 显示错误信息
        if (loadingText) {
            loadingText.textContent = `加载失败: ${error}`;
            loadingText.setAttribute('style', 'color: #e94560;');
        }
    }
}

// 页面加载后初始化
window.addEventListener('DOMContentLoaded', cl_init);

// 导出给调试使用
(window as any).game = () => game;
