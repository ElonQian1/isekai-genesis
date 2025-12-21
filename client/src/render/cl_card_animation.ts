/**
 * 卡牌动画系统
 * 
 * 模块: client/render
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import {
    Scene,
    Mesh,
    Vector3,
    Animation,
    EasingFunction,
    CubicEase,
    QuadraticEase,
    BounceEase,
    AnimationGroup,
} from '@babylonjs/core';

// =============================================================================
// 动画时长常量 (毫秒)
// =============================================================================

export const CL_ANIM_DURATION = {
    FLIP: 500,          // 翻牌
    HOVER_UP: 200,      // 悬停抬起
    HOVER_DOWN: 150,    // 悬停放下
    PLAY_CARD: 400,     // 打出卡牌
    DRAW_CARD: 300,     // 抽牌
    DEAL_CARD: 200,     // 发牌 (每张)
    SHUFFLE: 1000,      // 洗牌
};

// =============================================================================
// 动画创建函数
// =============================================================================

/**
 * 创建翻牌动画
 */
export function cl_createFlipAnimation(
    _scene: Scene,
    _mesh: Mesh,
    duration: number = CL_ANIM_DURATION.FLIP
): Animation {
    const frameRate = 60;
    const totalFrames = Math.round((duration / 1000) * frameRate);
    
    const animation = new Animation(
        'flipAnimation',
        'rotation.y',
        frameRate,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    const keys = [
        { frame: 0, value: 0 },
        { frame: totalFrames / 2, value: Math.PI / 2 },
        { frame: totalFrames, value: Math.PI },
    ];
    
    animation.setKeys(keys);
    
    // 添加缓动
    const easingFunction = new CubicEase();
    easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
    animation.setEasingFunction(easingFunction);
    
    return animation;
}

/**
 * 创建悬停抬起动画
 */
export function cl_createHoverAnimation(
    mesh: Mesh,
    hoverHeight: number = 0.5,
    hoverScale: number = 1.15,
    duration: number = CL_ANIM_DURATION.HOVER_UP
): AnimationGroup {
    const frameRate = 60;
    const totalFrames = Math.round((duration / 1000) * frameRate);
    const scene = mesh.getScene();
    
    const animGroup = new AnimationGroup('hoverAnimation', scene);
    
    // 位置动画 - 向上移动
    const posAnim = new Animation(
        'hoverPos',
        'position.y',
        frameRate,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    const startY = mesh.position.y;
    posAnim.setKeys([
        { frame: 0, value: startY },
        { frame: totalFrames, value: startY + hoverHeight },
    ]);
    
    // 缩放动画
    const scaleAnim = new Animation(
        'hoverScale',
        'scaling',
        frameRate,
        Animation.ANIMATIONTYPE_VECTOR3,
        Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    scaleAnim.setKeys([
        { frame: 0, value: new Vector3(1, 1, 1) },
        { frame: totalFrames, value: new Vector3(hoverScale, hoverScale, hoverScale) },
    ]);
    
    // 添加缓动
    const easing = new QuadraticEase();
    easing.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
    posAnim.setEasingFunction(easing);
    scaleAnim.setEasingFunction(easing);
    
    animGroup.addTargetedAnimation(posAnim, mesh);
    animGroup.addTargetedAnimation(scaleAnim, mesh);
    
    return animGroup;
}

/**
 * 创建打出卡牌动画 (移动到目标位置并消失)
 */
export function cl_createPlayCardAnimation(
    mesh: Mesh,
    targetPosition: Vector3,
    duration: number = CL_ANIM_DURATION.PLAY_CARD
): AnimationGroup {
    const frameRate = 60;
    const totalFrames = Math.round((duration / 1000) * frameRate);
    const scene = mesh.getScene();
    
    const animGroup = new AnimationGroup('playCardAnimation', scene);
    
    // 位置动画
    const posAnim = new Animation(
        'playCardPos',
        'position',
        frameRate,
        Animation.ANIMATIONTYPE_VECTOR3,
        Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    posAnim.setKeys([
        { frame: 0, value: mesh.position.clone() },
        { frame: totalFrames * 0.7, value: targetPosition },
        { frame: totalFrames, value: targetPosition.add(new Vector3(0, 2, 0)) },
    ]);
    
    // 缩放动画 (最后缩小消失)
    const scaleAnim = new Animation(
        'playCardScale',
        'scaling',
        frameRate,
        Animation.ANIMATIONTYPE_VECTOR3,
        Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    scaleAnim.setKeys([
        { frame: 0, value: mesh.scaling.clone() },
        { frame: totalFrames * 0.7, value: mesh.scaling.clone() },
        { frame: totalFrames, value: new Vector3(0.1, 0.1, 0.1) },
    ]);
    
    // 透明度动画
    // 注意：需要材质支持透明度
    
    const easing = new CubicEase();
    easing.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
    posAnim.setEasingFunction(easing);
    scaleAnim.setEasingFunction(easing);
    
    animGroup.addTargetedAnimation(posAnim, mesh);
    animGroup.addTargetedAnimation(scaleAnim, mesh);
    
    return animGroup;
}

/**
 * 创建抽牌动画 (从牌库飞到手牌)
 */
export function cl_createDrawCardAnimation(
    mesh: Mesh,
    startPosition: Vector3,
    endPosition: Vector3,
    duration: number = CL_ANIM_DURATION.DRAW_CARD
): AnimationGroup {
    const frameRate = 60;
    const totalFrames = Math.round((duration / 1000) * frameRate);
    const scene = mesh.getScene();
    
    const animGroup = new AnimationGroup('drawCardAnimation', scene);
    
    // 位置动画 - 弧形路径
    const posAnim = new Animation(
        'drawCardPos',
        'position',
        frameRate,
        Animation.ANIMATIONTYPE_VECTOR3,
        Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    // 中间点 (抛物线顶点)
    const midPoint = Vector3.Lerp(startPosition, endPosition, 0.5);
    midPoint.y += 2; // 向上弧形
    
    posAnim.setKeys([
        { frame: 0, value: startPosition },
        { frame: totalFrames * 0.5, value: midPoint },
        { frame: totalFrames, value: endPosition },
    ]);
    
    // 旋转动画 (翻转)
    const rotAnim = new Animation(
        'drawCardRot',
        'rotation.x',
        frameRate,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    rotAnim.setKeys([
        { frame: 0, value: Math.PI },  // 背面朝上
        { frame: totalFrames, value: -Math.PI / 2 }, // 正面朝向玩家
    ]);
    
    const easing = new QuadraticEase();
    easing.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
    posAnim.setEasingFunction(easing);
    rotAnim.setEasingFunction(easing);
    
    animGroup.addTargetedAnimation(posAnim, mesh);
    animGroup.addTargetedAnimation(rotAnim, mesh);
    
    return animGroup;
}

/**
 * 创建弹跳动画 (用于伤害反馈等)
 */
export function cl_createBounceAnimation(
    mesh: Mesh,
    bounceHeight: number = 0.3,
    duration: number = 300
): Animation {
    const frameRate = 60;
    const totalFrames = Math.round((duration / 1000) * frameRate);
    
    const animation = new Animation(
        'bounceAnimation',
        'position.y',
        frameRate,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    const startY = mesh.position.y;
    animation.setKeys([
        { frame: 0, value: startY },
        { frame: totalFrames * 0.3, value: startY + bounceHeight },
        { frame: totalFrames, value: startY },
    ]);
    
    const easing = new BounceEase(2, 3);
    easing.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
    animation.setEasingFunction(easing);
    
    return animation;
}

// =============================================================================
// 动画播放器
// =============================================================================

/**
 * 播放动画并返回 Promise
 */
export function cl_playAnimation(
    scene: Scene,
    mesh: Mesh,
    animation: Animation,
    from: number = 0,
    to: number = 60,
    loop: boolean = false
): Promise<void> {
    return new Promise((resolve) => {
        scene.beginDirectAnimation(
            mesh,
            [animation],
            from,
            to,
            loop,
            1.0,
            () => resolve()
        );
    });
}

/**
 * 播放动画组并返回 Promise
 */
export function cl_playAnimationGroup(
    animGroup: AnimationGroup
): Promise<void> {
    return new Promise((resolve) => {
        animGroup.onAnimationGroupEndObservable.addOnce(() => {
            resolve();
        });
        animGroup.play();
    });
}
