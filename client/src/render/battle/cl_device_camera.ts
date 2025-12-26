/**
 * 设备检测与相机管理
 * 
 * PC端: ArcRotateCamera 360°旋转
 * 手机竖屏: 固定俯视
 * 手机横屏: 固定侧视
 */

import { Scene, Vector3, ArcRotateCamera, UniversalCamera, Camera } from '@babylonjs/core';

export type DeviceType = 'pc' | 'mobile';
export type Orientation = 'portrait' | 'landscape';

/**
 * 检测设备类型
 */
export function detectDeviceType(): DeviceType {
    // 触控点数 > 0 表示触屏设备
    if (navigator.maxTouchPoints > 0) {
        return 'mobile';
    }
    // 检查用户代理
    const ua = navigator.userAgent.toLowerCase();
    if (/android|iphone|ipad|mobile/.test(ua)) {
        return 'mobile';
    }
    return 'pc';
}

/**
 * 检测屏幕方向
 */
export function detectOrientation(): Orientation {
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
}

/**
 * 战斗相机配置
 */
export interface BattleCameraConfig {
    target: Vector3;
    deviceType: DeviceType;
    orientation: Orientation;
}

/**
 * 创建战斗相机
 */
export function createBattleCamera(scene: Scene, config: BattleCameraConfig): Camera {
    const { target, deviceType, orientation } = config;
    
    if (deviceType === 'pc') {
        // PC端: ArcRotateCamera 支持360°旋转
        const camera = new ArcRotateCamera('battleCam', Math.PI / 2, Math.PI / 4, 18, target, scene);
        
        // 允许穿到地下 (无角度限制)
        camera.lowerBetaLimit = -Math.PI;
        camera.upperBetaLimit = Math.PI;
        camera.lowerRadiusLimit = 5;
        camera.upperRadiusLimit = 30;
        
        // 启用鼠标控制
        camera.attachControl(scene.getEngine().getRenderingCanvas(), true);
        camera.panningSensibility = 0; // 禁用平移
        
        console.log('📷 PC相机: 360°旋转模式');
        return camera;
    } else {
        // 手机端: 固定相机
        const camera = new UniversalCamera('battleCam', Vector3.Zero(), scene);
        
        if (orientation === 'portrait') {
            // 竖屏: 俯视 (相机在南方上空)
            camera.position = target.add(new Vector3(0, 15, -10));
        } else {
            // 横屏: 侧视 (相机在西方)
            camera.position = target.add(new Vector3(-12, 8, 0));
        }
        
        camera.setTarget(target);
        camera.detachControl(); // 禁用控制
        
        console.log(`📷 手机相机: ${orientation === 'portrait' ? '竖屏俯视' : '横屏侧视'}模式`);
        return camera;
    }
}

/**
 * 监听屏幕方向变化
 */
export function onOrientationChange(callback: (orientation: Orientation) => void): () => void {
    const handler = () => {
        const orientation = detectOrientation();
        callback(orientation);
    };
    
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
    
    // 返回清理函数
    return () => {
        window.removeEventListener('resize', handler);
        window.removeEventListener('orientationchange', handler);
    };
}
