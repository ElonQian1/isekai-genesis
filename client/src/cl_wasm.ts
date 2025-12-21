/**
 * WASM 模块封装
 * 
 * 模块: client
 * 前缀: cl_
 * 文档: 文档/04-client.md
 */

import init, {
    gw_version,
    gw_health_check,
    gw_create_test_battle,
    gw_preview_damage,
    GwPlayer,
    GwCard,
    GwBattle,
} from 'game-wasm';

// WASM 模块是否已初始化
let wasmInitialized = false;

/**
 * 初始化 WASM 模块
 */
export async function cl_initWasm(): Promise<void> {
    if (wasmInitialized) {
        return;
    }

    console.log('🦀 加载 WASM 模块...');
    await init();
    wasmInitialized = true;
    
    const version = gw_version();
    console.log(`✅ WASM 模块加载成功! 版本: ${version}`);
    
    // 健康检查
    if (!gw_health_check()) {
        throw new Error('WASM 健康检查失败');
    }
}

/**
 * 检查 WASM 是否已初始化
 */
export function cl_isWasmReady(): boolean {
    return wasmInitialized;
}

/**
 * 获取 WASM 版本
 */
export function cl_getWasmVersion(): string {
    if (!wasmInitialized) {
        throw new Error('WASM 未初始化');
    }
    return gw_version();
}

/**
 * 创建测试战斗
 */
export function cl_createTestBattle(): GwBattle {
    if (!wasmInitialized) {
        throw new Error('WASM 未初始化');
    }
    return gw_create_test_battle();
}

/**
 * 预览伤害计算
 */
export function cl_previewDamage(
    attackerAttack: number,
    targetDefense: number,
    cardDamage: number
): unknown {
    if (!wasmInitialized) {
        throw new Error('WASM 未初始化');
    }
    return gw_preview_damage(attackerAttack, targetDefense, cardDamage);
}

// 导出 WASM 类型
export { GwPlayer, GwCard, GwBattle };
