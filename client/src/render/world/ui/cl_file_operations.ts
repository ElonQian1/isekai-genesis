/**
 * 编辑器文件操作模块
 * 
 * 模块: client/render/world/ui
 * 前缀: Cl
 * 
 * 职责:
 * - 文件上传 (模型、纹理)
 * - 地图导入/导出
 * - 地图保存 (服务器/本地)
 */

import { Scene, Vector3 } from "@babylonjs/core";
import { ClAssetManager } from "../cl_asset_manager";
import { ClLevelLoader } from "../core/cl_level_loader";

// =============================================================================
// 类型定义
// =============================================================================

export interface FileUploadResult {
    success: boolean;
    filename?: string;
    error?: string;
}

export interface MapSaveResult {
    success: boolean;
    savedLocally: boolean;
    error?: string;
}

// =============================================================================
// 文件操作管理器
// =============================================================================

export class ClFileOperations {
    private scene: Scene;
    private assetManager: ClAssetManager;
    private levelLoader: ClLevelLoader | null;
    
    // HTML 文件输入
    private fileInput: HTMLInputElement | null = null;
    private jsonInput: HTMLInputElement | null = null;
    
    // 回调
    private onModelSpawned?: () => void;
    private onMapLoaded?: () => void;

    constructor(
        scene: Scene,
        assetManager: ClAssetManager,
        levelLoader: ClLevelLoader | null
    ) {
        this.scene = scene;
        this.assetManager = assetManager;
        this.levelLoader = levelLoader;
        
        this.createHiddenInputs();
    }

    /**
     * 设置回调
     */
    setCallbacks(onModelSpawned?: () => void, onMapLoaded?: () => void): void {
        this.onModelSpawned = onModelSpawned;
        this.onMapLoaded = onMapLoaded;
    }

    /**
     * 创建隐藏的文件输入元素
     */
    private createHiddenInputs(): void {
        // 模型/纹理上传
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = '.glb,.gltf,.png,.jpg';
        this.fileInput.style.display = 'none';
        document.body.appendChild(this.fileInput);

        this.fileInput.addEventListener('change', async (e) => {
            const target = e.target as HTMLInputElement;
            if (target.files && target.files.length > 0) {
                await this.uploadFile(target.files[0]);
                target.value = '';
            }
        });

        // JSON 地图导入
        this.jsonInput = document.createElement('input');
        this.jsonInput.type = 'file';
        this.jsonInput.accept = '.json';
        this.jsonInput.style.display = 'none';
        document.body.appendChild(this.jsonInput);

        this.jsonInput.addEventListener('change', async (e) => {
            const target = e.target as HTMLInputElement;
            if (target.files && target.files.length > 0) {
                await this.importMapFromFile(target.files[0]);
                target.value = '';
            }
        });
    }

    /**
     * 触发文件选择对话框
     */
    triggerFileSelect(): void {
        this.fileInput?.click();
    }

    /**
     * 触发地图导入对话框
     */
    triggerMapImport(): void {
        this.jsonInput?.click();
    }

    /**
     * 上传文件到服务器
     */
    async uploadFile(file: File): Promise<FileUploadResult> {
        console.log(`📤 开始上传: ${file.name}`);
        
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ 上传成功:', result);
            
            // 如果是模型文件，自动生成
            if (file.name.endsWith('.glb') || file.name.endsWith('.gltf')) {
                await this.spawnUploadedModel(result.filename);
            } else {
                alert(`文件已上传: ${result.filename}`);
            }

            return { success: true, filename: result.filename };
        } catch (error) {
            console.error('❌ 上传出错:', error);
            alert('上传失败，请检查控制台日志');
            return { success: false, error: String(error) };
        }
    }

    /**
     * 在场景中生成上传的模型
     */
    async spawnUploadedModel(filename: string): Promise<void> {
        const id = `user_upload_${filename}`;
        const mesh = await this.assetManager.loadUploadedMesh(filename, id);
        
        if (mesh) {
            mesh.metadata = { type: 'structure', prefab: id };

            // 计算生成位置
            const camera = this.scene.activeCamera;
            const position = camera ? 
                camera.position.add(camera.getForwardRay().direction.scale(8)) : 
                new Vector3(0, 0, 0);
            
            if (this.levelLoader) {
                position.y = this.levelLoader.getTerrainHeight(position.x, position.z);
            } else {
                position.y = 0;
            }
            
            mesh.position = position.clone();
            mesh.setEnabled(true);
            console.log(`✅ 上传模型已生成: ${filename}`);
            
            this.onModelSpawned?.();
            alert(`模型已生成: ${filename}`);
        } else {
            alert('模型加载失败');
        }
    }

    /**
     * 从文件导入地图
     */
    private async importMapFromFile(file: File): Promise<void> {
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const json = JSON.parse(ev.target?.result as string);
                await this.loadMapData(json);
            } catch (err) {
                console.error("导入失败:", err);
                alert("导入失败，请检查JSON格式");
            }
        };
        reader.readAsText(file);
    }

    /**
     * 加载地图数据
     */
    async loadMapData(mapData: any): Promise<boolean> {
        if (!this.levelLoader) {
            alert("无法加载：LevelLoader 未初始化");
            return false;
        }

        try {
            // 清空当前场景
            this.levelLoader.clearMap();
            // 加载新地图
            await this.levelLoader.loadMapData(mapData);
            this.onMapLoaded?.();
            alert("地图导入成功！");
            return true;
        } catch (err) {
            console.error("导入失败:", err);
            alert("导入失败，请检查JSON格式");
            return false;
        }
    }

    /**
     * 保存地图
     */
    async saveMap(): Promise<MapSaveResult> {
        if (!this.levelLoader) {
            alert("无法保存：LevelLoader 未初始化");
            return { success: false, savedLocally: false, error: "LevelLoader 未初始化" };
        }
        
        console.log("💾 开始保存地图...");
        const mapData = this.levelLoader.exportMapData();
        
        try {
            const response = await fetch('/api/maps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mapData)
            });
            
            if (!response.ok) {
                throw new Error(`Save failed: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log("✅ 地图保存成功:", result);
            alert("地图保存成功！");
            return { success: true, savedLocally: false };
            
        } catch (error) {
            console.error("❌ 服务器保存失败，尝试本地下载...", error);
            this.downloadMapAsJson(mapData);
            return { success: true, savedLocally: true };
        }
    }

    /**
     * 下载地图为 JSON 文件
     */
    private downloadMapAsJson(mapData: any): void {
        try {
            const jsonStr = JSON.stringify(mapData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `map_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log("✅ 地图已下载到本地");
            alert("服务器保存失败，地图已下载为JSON文件！");
        } catch (e) {
            console.error("❌ 下载失败:", e);
            alert("保存失败，请检查控制台");
        }
    }

    /**
     * 销毁
     */
    dispose(): void {
        this.fileInput?.remove();
        this.jsonInput?.remove();
    }
}
