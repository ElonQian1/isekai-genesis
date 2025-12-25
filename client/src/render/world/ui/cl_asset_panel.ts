/**
 * 资源面板组件 - 显示和加载可用资源
 * 
 * 模块: client/render/world/ui
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

import { 
    StackPanel, 
    TextBlock, 
    Control,
    Button,
    ScrollViewer
} from "@babylonjs/gui";
import { Scene, Vector3 } from "@babylonjs/core";
import { ClAssetManager } from "../cl_asset_manager";
import { ClLevelLoader } from "../core/cl_level_loader";

/**
 * 资源面板 - 负责显示和加载可用资源
 */
export class ClAssetPanel {
    private scene: Scene;
    private assetManager: ClAssetManager;
    private levelLoader: ClLevelLoader | null = null;
    
    // 回调函数
    private onCreateSectionTitle: ((parent: StackPanel, text: string, color: string) => void) | null = null;
    private onRefreshHierarchy: (() => void) | null = null;
    private onSpawnUploadedModel: ((filename: string) => Promise<void>) | null = null;

    constructor(
        scene: Scene,
        assetManager: ClAssetManager,
        levelLoader: ClLevelLoader | null = null
    ) {
        this.scene = scene;
        this.assetManager = assetManager;
        this.levelLoader = levelLoader;
    }

    /**
     * 设置 UI 辅助回调
     */
    setUIHelpers(
        createSectionTitle: (parent: StackPanel, text: string, color: string) => void,
        refreshHierarchy: () => void,
        spawnUploadedModel: (filename: string) => Promise<void>
    ): void {
        this.onCreateSectionTitle = createSectionTitle;
        this.onRefreshHierarchy = refreshHierarchy;
        this.onSpawnUploadedModel = spawnUploadedModel;
    }

    /**
     * 创建资源面板
     */
    create(parent: StackPanel): void {
        if (this.onCreateSectionTitle) {
            this.onCreateSectionTitle(parent, "📦 资源库", "#7CFC00");
        }

        const assetScrollView = new ScrollViewer("assetScroll");
        assetScrollView.width = "100%";
        assetScrollView.height = "400px";
        assetScrollView.background = "#0d0d0d";
        assetScrollView.thickness = 1;
        assetScrollView.color = "#444";
        assetScrollView.cornerRadius = 8;
        assetScrollView.barSize = 10;
        assetScrollView.barColor = "#7CFC00";
        parent.addControl(assetScrollView);

        const assetListPanel = new StackPanel();
        assetListPanel.isVertical = true;
        assetListPanel.width = "100%";
        assetListPanel.paddingTop = "5px";
        assetListPanel.paddingBottom = "5px";
        assetScrollView.addControl(assetListPanel);

        this.loadAssetList(assetListPanel);
    }

    /**
     * 加载资源列表
     */
    private async loadAssetList(panel: StackPanel): Promise<void> {
        try {
            // 先加载自然素材
            await this.loadNatureAssetList(panel);
            
            // 分隔线
            const separator = new TextBlock();
            separator.text = "── 其他资源 ──";
            separator.color = "#888888";
            separator.height = "25px";
            separator.fontSize = 12;
            panel.addControl(separator);
            
            let assets: Array<{name: string, type: string, path: string}> = [];
            
            try {
                const response = await fetch('/api/assets');
                if (response.ok) {
                    assets = await response.json();
                }
            } catch (e) {
                console.warn("Failed to fetch assets, using defaults");
            }

            // 注入测试用的敌人资源
            if (!assets.some(a => a.name.includes('enemy'))) {
                assets.push({ name: "enemy_normal_goblin", type: "enemy", path: "virtual" });
                assets.push({ name: "enemy_elite_orc", type: "enemy", path: "virtual" });
                assets.push({ name: "enemy_boss_dragon", type: "enemy", path: "virtual" });
            }
            
            assets.forEach(asset => {
                const btn = Button.CreateSimpleButton("asset_" + asset.name, asset.name);
                btn.width = "100%";
                btn.height = "30px";
                btn.color = "white";
                btn.background = asset.type === 'enemy' || asset.name.includes('enemy') ? "#8B0000" : "#444444";
                btn.paddingBottom = "2px";
                btn.fontSize = 12;
                btn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
                
                btn.onPointerClickObservable.add(async () => {
                    await this.spawnAsset(asset);
                });
                
                panel.addControl(btn);
            });
            
        } catch (e) {
            console.error("Failed to load assets", e);
        }
    }

    /**
     * 加载自然素材资源列表
     */
    private async loadNatureAssetList(panel: StackPanel): Promise<void> {
        const config = await this.assetManager.loadNaturePrefabConfig();
        if (!config) {
            console.warn("无法加载自然素材配置");
            return;
        }

        // 创建分类标题
        const title = new TextBlock();
        title.text = "🌲 自然素材 (Quaternius风格化)";
        title.color = "#7CFC00";
        title.height = "40px";
        title.fontSize = 16;
        title.fontWeight = "bold";
        title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        panel.addControl(title);

        // 分类按钮颜色和图标
        const categoryInfo: Record<string, { color: string, icon: string }> = {
            trees:     { color: "#228B22", icon: "🌳" },
            bushes:    { color: "#32CD32", icon: "🌿" },
            plants:    { color: "#90EE90", icon: "🌱" },
            flowers:   { color: "#FF69B4", icon: "🌸" },
            grass:     { color: "#9ACD32", icon: "🌾" },
            rocks:     { color: "#708090", icon: "🪨" },
            paths:     { color: "#8B4513", icon: "🛤️" },
            mushrooms: { color: "#DDA0DD", icon: "🍄" }
        };

        // 遍历每个分类
        for (const [catKey, category] of Object.entries(config.categories)) {
            const info = categoryInfo[catKey] || { color: "#555", icon: "📦" };
            
            // 分类折叠按钮
            const catBtn = Button.CreateSimpleButton(`cat_${catKey}`, `${info.icon} ${category.name} (${category.models.length})`);
            catBtn.width = "100%";
            catBtn.height = "42px";
            catBtn.color = "white";
            catBtn.background = info.color;
            catBtn.cornerRadius = 6;
            catBtn.paddingBottom = "4px";
            catBtn.paddingTop = "4px";
            catBtn.fontSize = 16;
            catBtn.fontWeight = "bold";
            catBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            panel.addControl(catBtn);

            // 创建模型列表容器（默认隐藏）
            const modelContainer = new StackPanel();
            modelContainer.isVertical = true;
            modelContainer.width = "100%";
            modelContainer.background = "#1a1a1a";
            modelContainer.paddingLeft = "10px";
            modelContainer.isVisible = false;
            panel.addControl(modelContainer);

            // 添加模型按钮
            for (const model of category.models) {
                const modelBtn = Button.CreateSimpleButton(`nature_${model.id}`, `   ▪ ${model.name}`);
                modelBtn.width = "100%";
                modelBtn.height = "36px";
                modelBtn.color = "#ddd";
                modelBtn.background = "#2a2a2a";
                modelBtn.cornerRadius = 4;
                modelBtn.paddingBottom = "2px";
                modelBtn.paddingTop = "2px";
                modelBtn.fontSize = 14;
                modelBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

                // 悬停效果
                modelBtn.onPointerEnterObservable.add(() => {
                    modelBtn.background = info.color;
                    modelBtn.color = "white";
                });
                modelBtn.onPointerOutObservable.add(() => {
                    modelBtn.background = "#2a2a2a";
                    modelBtn.color = "#ddd";
                });

                modelBtn.onPointerClickObservable.add(async () => {
                    await this.spawnNatureAsset(model.id, model.name);
                });

                modelContainer.addControl(modelBtn);
            }

            // 折叠/展开逻辑
            let isExpanded = false;
            catBtn.onPointerClickObservable.add(() => {
                isExpanded = !isExpanded;
                modelContainer.isVisible = isExpanded;
                catBtn.textBlock!.text = `${isExpanded ? '▼' : '▶'} ${info.icon} ${category.name} (${category.models.length})`;
            });
        }
    }

    /**
     * 生成自然素材
     */
    private async spawnNatureAsset(prefabId: string, name: string): Promise<void> {
        console.log(`🌲 生成自然素材: ${name} (${prefabId})`);
        
        const camera = this.scene.activeCamera;
        const position = camera ? 
            camera.position.add(camera.getForwardRay().direction.scale(8)) : 
            new Vector3(0, 0, 0);
        
        if (this.levelLoader) {
            position.y = this.levelLoader.getTerrainHeight(position.x, position.z);
        } else {
            position.y = 0;
        }
        
        const mesh = await this.assetManager.loadNatureMesh(prefabId);
        if (mesh) {
            mesh.position = position.clone();
            mesh.setEnabled(true);
            
            mesh.metadata = {
                type: 'tree',
                prefab: prefabId,
                name: name
            };
            
            console.log(`✅ 自然素材生成成功: ${name} 位置: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
            
            if (this.onRefreshHierarchy) {
                this.onRefreshHierarchy();
            }
        } else {
            console.error(`❌ 自然素材生成失败: ${prefabId}`);
            alert(`加载失败: ${name}`);
        }
    }

    /**
     * 生成资源
     */
    private async spawnAsset(asset: {name: string, type: string, path: string}): Promise<void> {
        console.log(`📦 生成资源: ${asset.name}`);
        
        if (asset.path.includes("uploads")) {
            if (this.onSpawnUploadedModel) {
                await this.onSpawnUploadedModel(asset.name);
            }
        } else {
            if (!this.levelLoader) {
                console.error("LevelLoader not initialized");
                return;
            }

            let type: 'tree' | 'structure' | 'enemy' = 'structure';
            if (asset.name.includes('tree')) type = 'tree';
            if (asset.name.includes('enemy') || asset.name.includes('monster') || asset.type === 'enemy') type = 'enemy';
            
            const camera = this.scene.activeCamera;
            const position = camera ? 
                camera.position.add(camera.getForwardRay().direction.scale(8)) : 
                new Vector3(0, 0, 0);
                
            position.y = this.levelLoader.getTerrainHeight(position.x, position.z);
            
            await this.levelLoader.spawnEntity(type, asset.name, position);
            console.log(`✅ 资源生成成功: ${asset.name} 位置: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
            
            if (this.onRefreshHierarchy) {
                this.onRefreshHierarchy();
            }
        }
    }
}
