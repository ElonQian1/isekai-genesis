/**
 * 敌人 AI 状态机
 * 
 * 模块: client/render/world/entities
 * 前缀: Cl
 * 
 * 职责:
 * - 管理单个敌人的状态 (巡逻、追击、攻击、返回)
 * - 控制敌人的移动和旋转
 * - 处理与玩家的距离检测
 */

import { Vector3, TransformNode, Scalar } from '@babylonjs/core';
import { ClWaypointSystem } from '../systems/cl_waypoint_system';

export enum EnemyState {
    IDLE,       // 待机
    PATROL,     // 巡逻
    CHASE,      // 追击
    ATTACK,     // 攻击
    RETURN      // 返回出生点
}

export interface AIConfig {
    moveSpeed: number;          // 移动速度
    chaseSpeed: number;         // 追击速度
    patrolRadius: number;       // 巡逻半径
    aggroRadius: number;        // 警戒半径 (发现玩家)
    attackRange: number;        // 攻击距离
    leashRadius: number;        // 脱战距离 (离出生点多远后放弃追击)
    idleTime: number;           // 巡逻间歇停留时间
    patrolType?: 'random' | 'waypoint'; // 巡逻类型
    nextWaypointId?: string;    // 下一个路径点 ID
}

export class ClEnemyAI {
    private root: TransformNode;
    private spawnPoint: Vector3;
    private state: EnemyState = EnemyState.IDLE;
    
    private targetPoint: Vector3 | null = null;
    private stateTimer: number = 0;
    private config: AIConfig;
    private waypointSystem: ClWaypointSystem | null = null;
    private getTerrainHeight: ((x: number, z: number) => number) | null = null;

    constructor(root: TransformNode, config?: Partial<AIConfig>, waypointSystem: ClWaypointSystem | null = null) {
        this.root = root;
        this.spawnPoint = root.position.clone();
        this.waypointSystem = waypointSystem;
        
        // 默认配置
        this.config = {
            moveSpeed: 2.0,
            chaseSpeed: 3.5,
            patrolRadius: 8.0,
            aggroRadius: 6.0,
            attackRange: 1.5,
            leashRadius: 15.0,
            idleTime: 2.0,
            patrolType: 'random',
            ...config
        };
    }

    /**
     * 设置路径点系统
     */
    public setWaypointSystem(system: ClWaypointSystem): void {
        this.waypointSystem = system;
    }
    
    /**
     * 设置地形高度检测回调
     */
    public setTerrainHeightCallback(callback: (x: number, z: number) => number): void {
        this.getTerrainHeight = callback;
    }

    /**
     * 更新 AI 配置
     */
    public setConfig(config: Partial<AIConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * 获取当前配置
     */
    public getConfig(): AIConfig {
        return { ...this.config };
    }

    /**
     * 获取出生点
     */
    public getSpawnPoint(): Vector3 {
        return this.spawnPoint;
    }

    /**
     * 每帧更新 AI
     * @param deltaTime 秒
     * @param playerPosition 玩家位置
     */
    public update(deltaTime: number, playerPosition: Vector3 | null): void {
        // 状态机逻辑
        switch (this.state) {
            case EnemyState.IDLE:
                this.updateIdle(deltaTime, playerPosition);
                break;
            case EnemyState.PATROL:
                this.updatePatrol(deltaTime, playerPosition);
                break;
            case EnemyState.CHASE:
                this.updateChase(deltaTime, playerPosition);
                break;
            case EnemyState.ATTACK:
                this.updateAttack(deltaTime, playerPosition);
                break;
            case EnemyState.RETURN:
                this.updateReturn(deltaTime);
                break;
        }

        // 始终保持贴合地形
        this.updateHeight();
    }

    private updateIdle(dt: number, playerPos: Vector3 | null): void {
        this.stateTimer -= dt;
        
        // 检测玩家
        if (this.checkAggro(playerPos)) return;

        // 计时结束，开始巡逻
        if (this.stateTimer <= 0) {
            this.pickPatrolPoint();
            this.transitionTo(EnemyState.PATROL);
        }
    }

    private updatePatrol(dt: number, playerPos: Vector3 | null): void {
        // 检测玩家
        if (this.checkAggro(playerPos)) return;

        if (!this.targetPoint) {
            this.transitionTo(EnemyState.IDLE);
            return;
        }

        // 移动到目标点
        if (this.moveTo(this.targetPoint, this.config.moveSpeed, dt)) {
            // 到达目标
            
            if (this.config.patrolType === 'waypoint' && this.waypointSystem && this.config.nextWaypointId) {
                // 获取当前到达的路径点配置
                const wpConfig = this.waypointSystem.getWaypointConfig(this.config.nextWaypointId);
                
                // 设置停留时间
                this.stateTimer = wpConfig?.waitTime || this.config.idleTime;
                
                // 更新下一个路径点
                if (wpConfig && wpConfig.nextWaypointId) {
                    this.config.nextWaypointId = wpConfig.nextWaypointId;
                } else {
                    // 路径结束，可能需要反向或者停止
                    // 这里简单处理：如果没有下一个点，就停在这里
                    this.config.nextWaypointId = undefined;
                }
            } else {
                // 随机巡逻
                this.stateTimer = this.config.idleTime;
            }
            
            this.transitionTo(EnemyState.IDLE);
        }
    }

    private pickPatrolPoint(): void {
        if (this.config.patrolType === 'waypoint' && this.waypointSystem && this.config.nextWaypointId) {
            // 路径点模式
            const pos = this.waypointSystem.getWaypointPosition(this.config.nextWaypointId);
            if (pos) {
                this.targetPoint = pos;
                return;
            }
        }

        // 随机模式 (默认或回退)
        this.pickRandomPatrolPoint();
    }

    private pickRandomPatrolPoint(): void {
        // 在巡逻半径内随机选一点
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * this.config.patrolRadius;
        
        const offsetX = Math.cos(angle) * dist;
        const offsetZ = Math.sin(angle) * dist;
        
        this.targetPoint = this.spawnPoint.add(new Vector3(offsetX, 0, offsetZ));
    }

    private updateChase(dt: number, playerPos: Vector3 | null): void {
        if (!playerPos) {
            this.transitionTo(EnemyState.RETURN);
            return;
        }

        const distToSpawn = Vector3.Distance(this.root.position, this.spawnPoint);
        const distToPlayer = Vector3.Distance(this.root.position, playerPos);

        // 脱战检测
        if (distToSpawn > this.config.leashRadius) {
            this.transitionTo(EnemyState.RETURN);
            return;
        }

        // 攻击检测
        if (distToPlayer <= this.config.attackRange) {
            this.transitionTo(EnemyState.ATTACK);
            return;
        }

        // 追击移动
        this.moveTo(playerPos, this.config.chaseSpeed, dt);
    }

    private updateAttack(_dt: number, playerPos: Vector3 | null): void {
        if (!playerPos) {
            this.transitionTo(EnemyState.RETURN);
            return;
        }

        const distToPlayer = Vector3.Distance(this.root.position, playerPos);

        // 玩家跑远了，继续追
        if (distToPlayer > this.config.attackRange * 1.2) {
            this.transitionTo(EnemyState.CHASE);
            return;
        }

        // 面向玩家
        this.lookAt(playerPos);

        // TODO: 触发攻击动画或逻辑
        // 这里可以加一个攻击冷却计时器
    }

    private updateReturn(dt: number): void {
        // 快速返回出生点，并回血
        if (this.moveTo(this.spawnPoint, this.config.chaseSpeed, dt)) {
            this.stateTimer = this.config.idleTime;
            this.transitionTo(EnemyState.IDLE);
        }
    }

    // --- 辅助方法 ---

    private checkAggro(playerPos: Vector3 | null): boolean {
        if (!playerPos) return false;
        
        const dist = Vector3.Distance(this.root.position, playerPos);
        if (dist <= this.config.aggroRadius) {
            this.transitionTo(EnemyState.CHASE);
            return true;
        }
        return false;
    }

    private moveTo(target: Vector3, speed: number, dt: number): boolean {
        const direction = target.subtract(this.root.position);
        direction.y = 0; // 忽略高度差，只在平面移动
        
        const dist = direction.length();
        
        if (dist < 0.1) return true; // 到达目标

        direction.normalize();
        
        // 移动
        const moveVector = direction.scale(speed * dt);
        this.root.position.addInPlace(moveVector);
        
        // 更新高度以贴合地形
        this.updateHeight();
        
        // 旋转
        this.lookAt(target);

        return false;
    }
    
    /**
     * 更新高度以贴合地形
     */
    private updateHeight(): void {
        if (this.getTerrainHeight) {
            const x = this.root.position.x;
            const z = this.root.position.z;
            const terrainY = this.getTerrainHeight(x, z);
            // 平滑过渡高度，避免跳动
            this.root.position.y = Scalar.Lerp(this.root.position.y, terrainY, 0.3);
        }
    }

    private lookAt(target: Vector3): void {
        const direction = target.subtract(this.root.position);
        const angle = Math.atan2(direction.x, direction.z);
        
        // 平滑旋转
        const currentRotation = this.root.rotation.y;
        this.root.rotation.y = Scalar.Lerp(currentRotation, angle, 0.1);
    }

    private transitionTo(newState: EnemyState): void {
        if (this.state === newState) return;
        
        // console.log(`Enemy State: ${EnemyState[this.state]} -> ${EnemyState[newState]}`);
        this.state = newState;
        
        // 状态进入逻辑
        if (newState === EnemyState.RETURN) {
            // 可以在这里重置仇恨、回血等
        }
    }

    public getState(): EnemyState {
        return this.state;
    }
}
