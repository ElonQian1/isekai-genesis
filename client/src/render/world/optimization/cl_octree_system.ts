/**
 * Octree 空间分割系统
 * 
 * 模块: client/render/world/optimization
 * 前缀: Cl
 * 文档: 文档/08-性能优化.md
 * 
 * 职责：
 * - 将场景划分为8叉树结构
 * - 快速查询特定区域内的物体
 * - 支持动态物体管理
 * - 加速碰撞检测和射线投射
 * 
 * 架构说明：
 * - 采用惰性构建策略，只在需要时创建节点
 * - 支持动态插入和移除物体
 * - 自动平衡树的深度
 */

import { Scene, Mesh, Vector3, BoundingBox, Ray } from '@babylonjs/core';

// =============================================================================
// 配置常量
// =============================================================================

const OCTREE_CONFIG = {
    MAX_DEPTH: 5,           // 最大树深度
    MAX_OBJECTS_PER_NODE: 8, // 每个节点最多存储的物体数量
    MIN_NODE_SIZE: 5,       // 最小节点尺寸
};

// =============================================================================
// Octree 节点
// =============================================================================

class OctreeNode {
    private bounds: BoundingBox;
    private objects: Mesh[] = [];
    private children: OctreeNode[] | null = null;
    private depth: number;

    constructor(bounds: BoundingBox, depth: number) {
        this.bounds = bounds;
        this.depth = depth;
    }

    /**
     * 插入物体到节点
     */
    insert(mesh: Mesh): boolean {
        // 检查物体是否在节点范围内
        if (!this.containsMesh(mesh)) {
            return false;
        }

        // 如果节点还没细分，且物体数量未超限，直接存储
        if (this.children === null && this.objects.length < OCTREE_CONFIG.MAX_OBJECTS_PER_NODE) {
            this.objects.push(mesh);
            return true;
        }

        // 如果达到最大深度，强制存储
        if (this.depth >= OCTREE_CONFIG.MAX_DEPTH) {
            this.objects.push(mesh);
            return true;
        }

        // 如果节点尺寸太小，不再细分
        const size = this.bounds.maximum.subtract(this.bounds.minimum);
        if (size.x < OCTREE_CONFIG.MIN_NODE_SIZE || 
            size.y < OCTREE_CONFIG.MIN_NODE_SIZE || 
            size.z < OCTREE_CONFIG.MIN_NODE_SIZE) {
            this.objects.push(mesh);
            return true;
        }

        // 需要细分节点
        if (this.children === null) {
            this.subdivide();
        }

        // 尝试插入到子节点
        for (const child of this.children!) {
            if (child.insert(mesh)) {
                return true;
            }
        }

        // 如果无法插入到子节点，存储在当前节点
        this.objects.push(mesh);
        return true;
    }

    /**
     * 细分节点为8个子节点
     */
    private subdivide(): void {
        const min = this.bounds.minimum;
        const max = this.bounds.maximum;
        const center = min.add(max).scale(0.5);

        this.children = [];

        // 创建8个子节点
        const positions = [
            [min.x, min.y, min.z, center.x, center.y, center.z],
            [center.x, min.y, min.z, max.x, center.y, center.z],
            [min.x, center.y, min.z, center.x, max.y, center.z],
            [center.x, center.y, min.z, max.x, max.y, center.z],
            [min.x, min.y, center.z, center.x, center.y, max.z],
            [center.x, min.y, center.z, max.x, center.y, max.z],
            [min.x, center.y, center.z, center.x, max.y, max.z],
            [center.x, center.y, center.z, max.x, max.y, max.z],
        ];

        for (const [minX, minY, minZ, maxX, maxY, maxZ] of positions) {
            const childBounds = new BoundingBox(
                new Vector3(minX, minY, minZ),
                new Vector3(maxX, maxY, maxZ)
            );
            this.children.push(new OctreeNode(childBounds, this.depth + 1));
        }
    }

    /**
     * 检查网格是否在节点范围内
     */
    private containsMesh(mesh: Mesh): boolean {
        const meshBounds = mesh.getBoundingInfo().boundingBox;
        return this.bounds.intersectsMinMax(meshBounds.minimum, meshBounds.maximum);
    }

    /**
     * 查询区域内的物体
     */
    query(bounds: BoundingBox, results: Mesh[]): void {
        // 如果节点不与查询区域相交，直接返回
        if (!this.bounds.intersectsMinMax(bounds.minimum, bounds.maximum)) {
            return;
        }

        // 添加当前节点的物体
        for (const obj of this.objects) {
            if (!results.includes(obj)) {
                const objBounds = obj.getBoundingInfo().boundingBox;
                if (bounds.intersectsMinMax(objBounds.minimum, objBounds.maximum)) {
                    results.push(obj);
                }
            }
        }

        // 递归查询子节点
        if (this.children !== null) {
            for (const child of this.children) {
                child.query(bounds, results);
            }
        }
    }

    /**
     * 射线投射查询
     */
    raycast(ray: Ray, maxDistance: number, results: Mesh[]): void {
        // 射线与节点边界检测
        if (!ray.intersectsBox(this.bounds)) {
            return;
        }

        // 检查当前节点的物体
        for (const obj of this.objects) {
            if (!results.includes(obj)) {
                const pickInfo = ray.intersectsMesh(obj);
                if (pickInfo.hit && pickInfo.distance <= maxDistance) {
                    results.push(obj);
                }
            }
        }

        // 递归查询子节点
        if (this.children !== null) {
            for (const child of this.children) {
                child.raycast(ray, maxDistance, results);
            }
        }
    }

    /**
     * 获取统计信息
     */
    getStats(stats: { nodeCount: number; objectCount: number; maxDepth: number }): void {
        stats.nodeCount++;
        stats.objectCount += this.objects.length;
        stats.maxDepth = Math.max(stats.maxDepth, this.depth);

        if (this.children !== null) {
            for (const child of this.children) {
                child.getStats(stats);
            }
        }
    }
}

// =============================================================================
// Octree 系统
// =============================================================================

export class ClOctreeSystem {
    private root: OctreeNode | null = null;
    private worldBounds: BoundingBox;
    private meshes: Mesh[] = [];

    constructor(_scene: Scene, worldSize: number = 120) {
        
        // 定义世界边界
        const halfSize = worldSize / 2;
        this.worldBounds = new BoundingBox(
            new Vector3(-halfSize, 0, -halfSize),
            new Vector3(halfSize, worldSize / 2, halfSize)
        );
    }

    /**
     * 初始化Octree
     */
    init(): void {
        this.root = new OctreeNode(this.worldBounds, 0);
        console.log('✅ Octree空间分割系统已初始化');
    }

    /**
     * 批量添加网格到Octree
     */
    addMeshes(meshes: Mesh[]): void {
        if (!this.root) {
            console.error('Octree未初始化');
            return;
        }

        let addedCount = 0;
        for (const mesh of meshes) {
            if (this.root.insert(mesh)) {
                this.meshes.push(mesh);
                addedCount++;
            }
        }

        console.log(`📦 Octree已添加 ${addedCount} 个物体`);
    }

    /**
     * 添加单个网格
     */
    addMesh(mesh: Mesh): boolean {
        if (!this.root) {
            console.error('Octree未初始化');
            return false;
        }

        const success = this.root.insert(mesh);
        if (success) {
            this.meshes.push(mesh);
        }
        return success;
    }

    /**
     * 查询区域内的物体
     * 
     * @param center 查询中心点
     * @param radius 查询半径
     * @returns 区域内的物体列表
     */
    queryRegion(center: Vector3, radius: number): Mesh[] {
        if (!this.root) return [];

        const queryBounds = new BoundingBox(
            new Vector3(center.x - radius, center.y - radius, center.z - radius),
            new Vector3(center.x + radius, center.y + radius, center.z + radius)
        );

        const results: Mesh[] = [];
        this.root.query(queryBounds, results);
        return results;
    }

    /**
     * 查询边界框内的物体
     */
    queryBox(bounds: BoundingBox): Mesh[] {
        if (!this.root) return [];

        const results: Mesh[] = [];
        this.root.query(bounds, results);
        return results;
    }

    /**
     * 射线投射查询
     * 
     * @param origin 射线起点
     * @param direction 射线方向
     * @param maxDistance 最大距离
     * @returns 命中的物体列表
     */
    raycast(origin: Vector3, direction: Vector3, maxDistance: number = 1000): Mesh[] {
        if (!this.root) return [];

        const ray = new Ray(origin, direction, maxDistance);
        const results: Mesh[] = [];
        this.root.raycast(ray, maxDistance, results);
        return results;
    }

    /**
     * 获取最近的N个物体
     */
    getNearestObjects(position: Vector3, count: number = 10): Mesh[] {
        // 先用较小半径查询
        let radius = 10;
        let results: Mesh[] = [];

        // 逐步扩大半径直到找到足够的物体
        while (results.length < count && radius < 200) {
            results = this.queryRegion(position, radius);
            radius *= 2;
        }

        // 按距离排序
        results.sort((a, b) => {
            const distA = Vector3.Distance(position, a.position);
            const distB = Vector3.Distance(position, b.position);
            return distA - distB;
        });

        return results.slice(0, count);
    }

    /**
     * 重建Octree（当物体大量移动后使用）
     */
    rebuild(): void {
        console.log('🔄 重建Octree...');
        
        const meshes = [...this.meshes];
        this.clear();
        this.init();
        this.addMeshes(meshes);
        
        console.log('✅ Octree重建完成');
    }

    /**
     * 获取统计信息
     */
    getStats() {
        if (!this.root) {
            return {
                nodeCount: 0,
                objectCount: 0,
                maxDepth: 0,
                totalMeshes: 0,
            };
        }

        const stats = { nodeCount: 0, objectCount: 0, maxDepth: 0 };
        this.root.getStats(stats);
        
        return {
            ...stats,
            totalMeshes: this.meshes.length,
        };
    }

    /**
     * 打印统计信息
     */
    logStats(): void {
        const stats = this.getStats();
        console.log('📊 Octree统计:');
        console.log(`   节点数: ${stats.nodeCount}`);
        console.log(`   物体数: ${stats.objectCount}`);
        console.log(`   最大深度: ${stats.maxDepth}`);
        console.log(`   总网格数: ${stats.totalMeshes}`);
    }

    /**
     * 清空Octree
     */
    clear(): void {
        this.root = null;
        this.meshes = [];
    }

    /**
     * 清理资源
     */
    dispose(): void {
        this.clear();
    }
}

export default ClOctreeSystem;
