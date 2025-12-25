/**
 * 角色属性状态系统 (纯数据层)
 * 
 * 模块: client/render/world/gameplay/stats
 * 前缀: Cl
 * 文档: 文档/04-client.md
 * 
 * 职责：
 * - 管理生命值 (HP)、体力值 (Stamina) 等核心属性
 * - 提供属性变更的观察者 (Observable)
 * - 处理属性的计算逻辑 (如回复、消耗)
 * 
 * 长期主义架构：
 * - 这是一个纯逻辑类，不包含任何 UI 或 渲染代码
 * - 可以被 UI 系统监听，也可以被 战斗系统 调用
 */

import { Observable, Scalar } from '@babylonjs/core';

export class ClCharacterStats {
    // 基础属性
    private _currentHp: number;
    private _maxHp: number;
    private _currentStamina: number;
    private _maxStamina: number;
    
    // 状态标志
    public isDead: boolean = false;
    
    // 事件通知
    public onHpChanged: Observable<{current: number, max: number}>;
    public onStaminaChanged: Observable<{current: number, max: number}>;
    public onDeath: Observable<void>;

    constructor(maxHp: number = 100, maxStamina: number = 100) {
        this._maxHp = maxHp;
        this._currentHp = maxHp;
        this._maxStamina = maxStamina;
        this._currentStamina = maxStamina;
        
        this.onHpChanged = new Observable();
        this.onStaminaChanged = new Observable();
        this.onDeath = new Observable();
    }

    /**
     * 受到伤害
     */
    takeDamage(amount: number): void {
        if (this.isDead) return;
        
        this._currentHp -= amount;
        this._currentHp = Scalar.Clamp(this._currentHp, 0, this._maxHp);
        
        this.onHpChanged.notifyObservers({
            current: this._currentHp,
            max: this._maxHp
        });
        
        if (this._currentHp <= 0) {
            this.isDead = true;
            this.onDeath.notifyObservers();
        }
    }

    /**
     * 恢复生命
     */
    heal(amount: number): void {
        if (this.isDead) return; // 死亡无法治疗? 或者可以复活
        
        this._currentHp += amount;
        this._currentHp = Scalar.Clamp(this._currentHp, 0, this._maxHp);
        
        this.onHpChanged.notifyObservers({
            current: this._currentHp,
            max: this._maxHp
        });
    }

    /**
     * 消耗体力
     * @returns 是否消耗成功
     */
    consumeStamina(amount: number): boolean {
        if (this._currentStamina >= amount) {
            this._currentStamina -= amount;
            this.onStaminaChanged.notifyObservers({
                current: this._currentStamina,
                max: this._maxStamina
            });
            return true;
        }
        return false;
    }

    /**
     * 恢复体力
     */
    restoreStamina(amount: number): void {
        this._currentStamina += amount;
        this._currentStamina = Scalar.Clamp(this._currentStamina, 0, this._maxStamina);
        
        this.onStaminaChanged.notifyObservers({
            current: this._currentStamina,
            max: this._maxStamina
        });
    }

    // Getters
    get currentHp(): number { return this._currentHp; }
    get maxHp(): number { return this._maxHp; }
    get currentStamina(): number { return this._currentStamina; }
    get maxStamina(): number { return this._maxStamina; }
}
