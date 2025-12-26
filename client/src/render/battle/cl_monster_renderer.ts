/**
 * 怪兽渲染器
 * 
 * 渲染怪兽占位几何体 + 名称文字
 */

import { Scene, Vector3, Color3, MeshBuilder, StandardMaterial, Mesh, TransformNode, DynamicTexture } from '@babylonjs/core';

// 属性类型
export type MonsterAttribute = 'none' | 'fire' | 'water' | 'wind' | 'earth' | 'light' | 'dark';

// 属性颜色和形状配置
const ATTR_CONFIG: Record<MonsterAttribute, { color: Color3, shape: 'capsule' | 'box' | 'cone' | 'cylinder' | 'sphere' | 'octahedron' }> = {
    none: { color: new Color3(0.5, 0.5, 0.5), shape: 'capsule' },
    fire: { color: new Color3(1, 0.27, 0), shape: 'capsule' },
    water: { color: new Color3(0.12, 0.56, 1), shape: 'box' },
    wind: { color: new Color3(0.56, 0.93, 0.56), shape: 'cone' },
    earth: { color: new Color3(0.55, 0.35, 0.17), shape: 'cylinder' },
    light: { color: new Color3(1, 1, 0), shape: 'sphere' },
    dark: { color: new Color3(0.29, 0, 0.51), shape: 'box' },
};

/**
 * 怪兽表示模式 (游戏王规则)
 */
export type MonsterPosition = 'attack' | 'defense';

export interface MonsterDisplayData {
    id: string;
    name: string;
    attribute: MonsterAttribute;
    atk: number;
    def: number;
    hp: number;
    maxHp: number;
    position: MonsterPosition;  // 攻击表示/守备表示
}

/**
 * 怪兽渲染实例
 */
export class ClMonsterMesh {
    private root: TransformNode;
    private bodyMesh: Mesh;
    private labelMesh: Mesh;
    private hpBarBg!: Mesh;
    private hpBarFill!: Mesh;
    private scene: Scene;
    public data: MonsterDisplayData;

    constructor(scene: Scene, parent: TransformNode, data: MonsterDisplayData, position: Vector3) {
        this.scene = scene;
        this.data = data;
        
        this.root = new TransformNode(`monster_${data.id}`, scene);
        this.root.parent = parent;
        this.root.position = position;

        // 创建身体
        this.bodyMesh = this.createBody(data.attribute);
        this.bodyMesh.parent = this.root;
        this.bodyMesh.position.y = 1;

        // 创建标签
        this.labelMesh = this.createLabel(data);
        this.labelMesh.parent = this.root;
        this.labelMesh.position.y = 2.5;

        // 创建 HP 血条
        this.createHpBar();
    }

    private createBody(attr: MonsterAttribute): Mesh {
        const config = ATTR_CONFIG[attr];
        let mesh: Mesh;

        switch (config.shape) {
            case 'capsule':
                mesh = MeshBuilder.CreateCapsule('body', { height: 1.5, radius: 0.4 }, this.scene);
                break;
            case 'box':
                mesh = MeshBuilder.CreateBox('body', { size: 1 }, this.scene);
                break;
            case 'cone':
                mesh = MeshBuilder.CreateCylinder('body', { height: 1.5, diameterTop: 0, diameterBottom: 1 }, this.scene);
                break;
            case 'cylinder':
                mesh = MeshBuilder.CreateCylinder('body', { height: 1.5, diameter: 0.8 }, this.scene);
                break;
            case 'sphere':
                mesh = MeshBuilder.CreateSphere('body', { diameter: 1.2 }, this.scene);
                break;
            default:
                mesh = MeshBuilder.CreateBox('body', { size: 1 }, this.scene);
        }

        const mat = new StandardMaterial('mat_body', this.scene);
        mat.diffuseColor = config.color;
        mat.emissiveColor = config.color.scale(0.3);
        mesh.material = mat;

        return mesh;
    }

    private createLabel(data: MonsterDisplayData): Mesh {
        const planeSize = 2;
        const plane = MeshBuilder.CreatePlane('label', { width: planeSize, height: 0.6 }, this.scene);
        plane.billboardMode = Mesh.BILLBOARDMODE_ALL;

        const texture = new DynamicTexture('labelTex', { width: 256, height: 64 }, this.scene, false);
        texture.drawText(data.name, null, 25, 'bold 20px Arial', 'white', 'rgba(0,0,0,0.7)');
        texture.drawText(`ATK:${data.atk} DEF:${data.def}`, null, 50, '16px Arial', '#ffcc00', null);

        const mat = new StandardMaterial('mat_label', this.scene);
        mat.diffuseTexture = texture;
        mat.emissiveTexture = texture;
        mat.useAlphaFromDiffuseTexture = true;
        mat.backFaceCulling = false;
        plane.material = mat;

        return plane;
    }

    private createHpBar(): void {
        const barWidth = 1.2;
        const barHeight = 0.15;
        
        // 血条背景 (灰黑色)
        this.hpBarBg = MeshBuilder.CreatePlane('hpBg', { width: barWidth, height: barHeight }, this.scene);
        this.hpBarBg.parent = this.root;
        this.hpBarBg.position.y = 2.2;
        this.hpBarBg.billboardMode = Mesh.BILLBOARDMODE_ALL;
        const bgMat = new StandardMaterial('hpBgMat', this.scene);
        bgMat.diffuseColor = new Color3(0.2, 0.2, 0.2);
        bgMat.emissiveColor = new Color3(0.1, 0.1, 0.1);
        bgMat.backFaceCulling = false;
        this.hpBarBg.material = bgMat;
        
        // 血条填充 (绿色 → 黄色 → 红色)
        this.hpBarFill = MeshBuilder.CreatePlane('hpFill', { width: barWidth * 0.98, height: barHeight * 0.7 }, this.scene);
        this.hpBarFill.parent = this.root;
        this.hpBarFill.position.y = 2.2;
        this.hpBarFill.position.z = -0.01; // 在背景前面
        this.hpBarFill.billboardMode = Mesh.BILLBOARDMODE_ALL;
        const fillMat = new StandardMaterial('hpFillMat', this.scene);
        fillMat.diffuseColor = new Color3(0.2, 0.8, 0.2);
        fillMat.emissiveColor = new Color3(0.1, 0.5, 0.1);
        fillMat.backFaceCulling = false;
        this.hpBarFill.material = fillMat;
        
        // 根据当前 HP 更新
        this.updateHpBar();
    }
    
    private updateHpBar(): void {
        const ratio = Math.max(0, Math.min(1, this.data.hp / this.data.maxHp));
        
        // 缩放血条
        this.hpBarFill.scaling.x = ratio;
        // 偏移使血条从左向右减少
        const barWidth = 1.2 * 0.98;
        this.hpBarFill.position.x = -barWidth * (1 - ratio) * 0.5;
        
        // 根据血量调整颜色
        const mat = this.hpBarFill.material as StandardMaterial;
        if (ratio > 0.5) {
            // 绿色
            mat.diffuseColor = new Color3(0.2, 0.8, 0.2);
            mat.emissiveColor = new Color3(0.1, 0.5, 0.1);
        } else if (ratio > 0.25) {
            // 黄色
            mat.diffuseColor = new Color3(0.9, 0.8, 0.1);
            mat.emissiveColor = new Color3(0.6, 0.5, 0.05);
        } else {
            // 红色
            mat.diffuseColor = new Color3(0.9, 0.2, 0.1);
            mat.emissiveColor = new Color3(0.6, 0.1, 0.05);
        }
    }

    public updateHp(hp: number): void {
        this.data.hp = hp;
        this.updateHpBar();
    }

    /**
     * 获取主 mesh (用于点击检测)
     */
    public get mesh(): Mesh {
        return this.bodyMesh;
    }

    /**
     * 设置高亮效果
     */
    public setHighlight(enabled: boolean, color?: Color3): void {
        const mat = this.bodyMesh.material as StandardMaterial;
        if (!mat) return;
        
        if (enabled && color) {
            mat.emissiveColor = color.scale(0.5);
        } else {
            // 恢复原始发光色
            const attrConfig = ATTR_CONFIG[this.data.attribute];
            mat.emissiveColor = attrConfig.color.scale(0.3);
        }
    }

    public dispose(): void {
        this.bodyMesh.dispose();
        this.labelMesh.dispose();
        this.hpBarBg.dispose();
        this.hpBarFill.dispose();
        this.root.dispose();
    }

    public getPosition(): Vector3 {
        return this.root.position.clone();
    }

    /**
     * 切换攻守表示
     */
    public togglePosition(): MonsterPosition {
        this.data.position = this.data.position === 'attack' ? 'defense' : 'attack';
        this.updatePositionVisual();
        return this.data.position;
    }

    /**
     * 设置表示模式
     */
    public setPosition(position: MonsterPosition): void {
        this.data.position = position;
        this.updatePositionVisual();
    }

    /**
     * 获取当前表示
     */
    public getPositionMode(): MonsterPosition {
        return this.data.position;
    }

    /**
     * 更新表示的视觉效果
     * - 攻击表示: 直立
     * - 守备表示: 横躺 (旋转90度)
     */
    private updatePositionVisual(): void {
        if (this.data.position === 'defense') {
            // 守备表示: 横向旋转90度
            this.bodyMesh.rotation.z = Math.PI / 2;
            this.bodyMesh.position.y = 0.5;  // 降低高度
            
            // 标签显示 DEF 高亮
            this.updateLabelForPosition();
        } else {
            // 攻击表示: 直立
            this.bodyMesh.rotation.z = 0;
            this.bodyMesh.position.y = 1;
            
            // 标签显示 ATK 高亮
            this.updateLabelForPosition();
        }
    }

    /**
     * 根据表示模式更新标签
     */
    private updateLabelForPosition(): void {
        // 重新创建标签
        if (this.labelMesh) {
            this.labelMesh.dispose();
        }
        
        const planeSize = 2;
        const plane = MeshBuilder.CreatePlane('label', { width: planeSize, height: 0.6 }, this.scene);
        plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
        plane.parent = this.root;
        plane.position.y = 2.5;

        const texture = new DynamicTexture('labelTex', { width: 256, height: 64 }, this.scene, false);
        texture.drawText(this.data.name, null, 25, 'bold 20px Arial', 'white', 'rgba(0,0,0,0.7)');
        
        // 根据表示高亮不同数值
        if (this.data.position === 'attack') {
            texture.drawText(`ATK:${this.data.atk}`, 30, 50, 'bold 16px Arial', '#ff6600', null);
            texture.drawText(`DEF:${this.data.def}`, 150, 50, '14px Arial', '#aaaaaa', null);
        } else {
            texture.drawText(`ATK:${this.data.atk}`, 30, 50, '14px Arial', '#aaaaaa', null);
            texture.drawText(`DEF:${this.data.def}`, 150, 50, 'bold 16px Arial', '#00aaff', null);
        }

        const mat = new StandardMaterial('mat_label', this.scene);
        mat.diffuseTexture = texture;
        mat.emissiveTexture = texture;
        mat.useAlphaFromDiffuseTexture = true;
        mat.backFaceCulling = false;
        plane.material = mat;
        
        this.labelMesh = plane;
    }
}
