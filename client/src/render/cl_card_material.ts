/**
 * 卡牌材质系统
 * 
 * 模块: client/render
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import {
    Scene,
    PBRMaterial,
    Color3,
    DynamicTexture,
    GlowLayer,
    Mesh,
} from '@babylonjs/core';

// 不需要从 cl_card_mesh 导入

// =============================================================================
// 卡牌稀有度颜色
// =============================================================================

export const CL_RARITY_COLORS = {
    common: new Color3(0.6, 0.6, 0.6),      // 灰色
    uncommon: new Color3(0.2, 0.8, 0.2),    // 绿色
    rare: new Color3(0.2, 0.4, 1.0),        // 蓝色
    epic: new Color3(0.6, 0.2, 0.8),        // 紫色
    legendary: new Color3(1.0, 0.6, 0.0),   // 橙色
};

export type ClCardRarity = keyof typeof CL_RARITY_COLORS;

// =============================================================================
// 卡牌类型颜色
// =============================================================================

export const CL_CARD_TYPE_COLORS = {
    attack: new Color3(0.9, 0.2, 0.2),      // 红色 - 攻击
    defense: new Color3(0.2, 0.6, 0.9),     // 蓝色 - 防御
    skill: new Color3(0.2, 0.8, 0.4),       // 绿色 - 技能
    power: new Color3(0.8, 0.6, 0.2),       // 金色 - 能力
};

export type ClCardType = keyof typeof CL_CARD_TYPE_COLORS;

// =============================================================================
// 卡牌材质工厂
// =============================================================================

/**
 * 卡牌材质配置
 */
export interface ClCardMaterialConfig {
    name: string;
    cardType: ClCardType;
    rarity: ClCardRarity;
    title: string;
    cost: number;
    description: string;
    attack?: number;
    defense?: number;
}

/**
 * 创建卡牌 PBR 材质
 */
export function cl_createCardMaterial(
    scene: Scene,
    config: ClCardMaterialConfig
): PBRMaterial {
    const material = new PBRMaterial(`mat_${config.name}`, scene);
    
    // 基础颜色
    const typeColor = CL_CARD_TYPE_COLORS[config.cardType];
    material.albedoColor = typeColor;
    
    // 金属度和粗糙度
    material.metallic = 0.1;
    material.roughness = 0.6;
    
    // 边缘发光 (基于稀有度)
    const rarityColor = CL_RARITY_COLORS[config.rarity];
    material.emissiveColor = rarityColor.scale(0.3);
    
    // 创建动态纹理显示卡牌信息
    const cardTexture = cl_createCardTexture(scene, config);
    material.albedoTexture = cardTexture;
    
    return material;
}

/**
 * 创建卡牌动态纹理
 */
export function cl_createCardTexture(
    scene: Scene,
    config: ClCardMaterialConfig
): DynamicTexture {
    const textureWidth = 512;
    const textureHeight = 716; // 保持卡牌比例
    
    const texture = new DynamicTexture(
        `tex_${config.name}`,
        { width: textureWidth, height: textureHeight },
        scene,
        true
    );
    
    // 强制转换为标准 CanvasRenderingContext2D
    const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
    
    // 背景渐变
    const typeColor = CL_CARD_TYPE_COLORS[config.cardType];
    const gradient = ctx.createLinearGradient(0, 0, 0, textureHeight);
    gradient.addColorStop(0, cl_color3ToHex(typeColor.scale(1.2)));
    gradient.addColorStop(1, cl_color3ToHex(typeColor.scale(0.6)));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, textureWidth, textureHeight);
    
    // 卡牌边框
    const rarityColor = CL_RARITY_COLORS[config.rarity];
    ctx.strokeStyle = cl_color3ToHex(rarityColor);
    ctx.lineWidth = 12;
    ctx.strokeRect(10, 10, textureWidth - 20, textureHeight - 20);
    
    // 费用圆圈 (左上角)
    ctx.beginPath();
    ctx.arc(60, 60, 40, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // 费用数字
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.cost.toString(), 60, 62);
    
    // 卡牌名称
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(config.title, textureWidth / 2, 160);
    
    // 图像区域 (占位)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(40, 200, textureWidth - 80, 280);
    
    // 描述文本
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    wrapText(ctx, config.description, textureWidth / 2, 540, textureWidth - 80, 30);
    
    // 攻击/防御值 (如果有)
    if (config.attack !== undefined) {
        // 左下角 - 攻击
        ctx.beginPath();
        ctx.arc(60, textureHeight - 60, 35, 0, Math.PI * 2);
        ctx.fillStyle = '#ff4444';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Arial';
        ctx.fillText(config.attack.toString(), 60, textureHeight - 58);
    }
    
    if (config.defense !== undefined) {
        // 右下角 - 防御
        ctx.beginPath();
        ctx.arc(textureWidth - 60, textureHeight - 60, 35, 0, Math.PI * 2);
        ctx.fillStyle = '#4488ff';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Arial';
        ctx.fillText(config.defense.toString(), textureWidth - 60, textureHeight - 58);
    }
    
    texture.update();
    
    return texture;
}

/**
 * 创建卡牌背面材质
 */
export function cl_createCardBackMaterial(scene: Scene): PBRMaterial {
    const material = new PBRMaterial('mat_card_back', scene);
    
    material.albedoColor = new Color3(0.15, 0.15, 0.25);
    material.metallic = 0.3;
    material.roughness = 0.4;
    
    // 创建背面花纹纹理
    const texture = cl_createCardBackTexture(scene);
    material.albedoTexture = texture;
    
    return material;
}

/**
 * 创建卡牌背面纹理
 */
function cl_createCardBackTexture(scene: Scene): DynamicTexture {
    const size = 512;
    const texture = new DynamicTexture('tex_card_back', size, scene, true);
    const ctx = texture.getContext();
    
    // 深色背景
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, size, size);
    
    // 中心图案
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 3;
    
    // 绘制装饰性菱形图案
    ctx.beginPath();
    ctx.moveTo(size / 2, 80);
    ctx.lineTo(size - 80, size / 2);
    ctx.lineTo(size / 2, size - 80);
    ctx.lineTo(80, size / 2);
    ctx.closePath();
    ctx.stroke();
    
    // 内部小菱形
    ctx.beginPath();
    ctx.moveTo(size / 2, 160);
    ctx.lineTo(size - 160, size / 2);
    ctx.lineTo(size / 2, size - 160);
    ctx.lineTo(160, size / 2);
    ctx.closePath();
    ctx.stroke();
    
    // 中心圆
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 60, 0, Math.PI * 2);
    ctx.fillStyle = '#e94560';
    ctx.fill();
    
    // 边框
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, size - 40, size - 40);
    
    texture.update();
    return texture;
}

/**
 * 设置发光效果
 */
export function cl_setupGlowLayer(scene: Scene): GlowLayer {
    const glowLayer = new GlowLayer('glow', scene, {
        blurKernelSize: 32,
    });
    glowLayer.intensity = 0.8;
    
    return glowLayer;
}

/**
 * 为卡牌添加发光效果
 */
export function cl_addCardGlow(
    glowLayer: GlowLayer,
    mesh: Mesh,
    rarity: ClCardRarity,
    intensity: number = 1.0
): void {
    const color = CL_RARITY_COLORS[rarity];
    glowLayer.addIncludedOnlyMesh(mesh);
    
    // 设置发光颜色 (通过材质的自发光)
    const material = mesh.material as PBRMaterial;
    if (material) {
        material.emissiveColor = color.scale(intensity * 0.5);
    }
}

// =============================================================================
// 工具函数
// =============================================================================

/**
 * Color3 转 Hex 字符串
 */
function cl_color3ToHex(color: Color3): string {
    const r = Math.floor(color.r * 255).toString(16).padStart(2, '0');
    const g = Math.floor(color.g * 255).toString(16).padStart(2, '0');
    const b = Math.floor(color.b * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

/**
 * 文本自动换行
 */
function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
): void {
    const words = text.split('');
    let line = '';
    let currentY = y;
    
    for (const char of words) {
        const testLine = line + char;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && line !== '') {
            ctx.fillText(line, x, currentY);
            line = char;
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, currentY);
}
