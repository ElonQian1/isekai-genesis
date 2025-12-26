/**
 * 战斗音效管理器
 * 
 * 职责：
 * - 管理战斗中的各种音效
 * - 使用 Web Audio API 生成简单的程序化音效
 * - 支持音量控制和静音
 * 
 * 模块: client/render/battle/effects
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

// =============================================================================
// 音效配置
// =============================================================================

export const CL_BATTLE_SOUND_CONFIG = {
    // 主音量 (0.0 - 1.0)
    MASTER_VOLUME: 0.3,
    
    // 各类音效配置
    SOUNDS: {
        // 攻击音效
        attack: { frequency: 220, duration: 0.15, type: 'sawtooth' as OscillatorType, gain: 0.4 },
        // 伤害音效
        damage: { frequency: 150, duration: 0.2, type: 'square' as OscillatorType, gain: 0.35 },
        // 治疗音效
        heal: { frequency: 523, duration: 0.3, type: 'sine' as OscillatorType, gain: 0.25 },
        // 召唤音效
        summon: { frequency: 440, duration: 0.25, type: 'triangle' as OscillatorType, gain: 0.3 },
        // 按钮点击
        click: { frequency: 880, duration: 0.05, type: 'sine' as OscillatorType, gain: 0.15 },
        // 阶段转换
        phase: { frequency: 660, duration: 0.15, type: 'triangle' as OscillatorType, gain: 0.2 },
        // 胜利音效
        victory: { frequency: 523, duration: 0.5, type: 'sine' as OscillatorType, gain: 0.35 },
        // 失败音效
        defeat: { frequency: 165, duration: 0.5, type: 'sawtooth' as OscillatorType, gain: 0.3 },
        // 抽卡音效
        draw: { frequency: 1000, duration: 0.08, type: 'sine' as OscillatorType, gain: 0.2 },
        // 陷阱触发
        trap: { frequency: 300, duration: 0.2, type: 'square' as OscillatorType, gain: 0.3 },
        // 怪兽被消灭
        destroy: { frequency: 100, duration: 0.3, type: 'sawtooth' as OscillatorType, gain: 0.35 },
    }
};

export type ClBattleSoundType = keyof typeof CL_BATTLE_SOUND_CONFIG.SOUNDS;

// =============================================================================
// 战斗音效管理器
// =============================================================================

export class ClBattleSoundManager {
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private enabled: boolean = true;
    
    constructor() {
        this.initAudioContext();
    }
    
    /**
     * 初始化音频上下文 (需要用户交互后才能启用)
     */
    private initAudioContext(): void {
        try {
            // 某些浏览器需要用户交互后才能创建 AudioContext
            this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = CL_BATTLE_SOUND_CONFIG.MASTER_VOLUME;
            this.masterGain.connect(this.audioContext.destination);
            
            console.log('🔊 战斗音效系统初始化成功');
        } catch (e) {
            console.warn('⚠️ 无法初始化音频系统:', e);
            this.audioContext = null;
        }
    }
    
    /**
     * 确保音频上下文已恢复 (处理浏览器自动暂停策略)
     */
    private async ensureResumed(): Promise<boolean> {
        if (!this.audioContext) return false;
        
        if (this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
            } catch {
                return false;
            }
        }
        return true;
    }
    
    /**
     * 播放指定类型的音效
     */
    async play(soundType: ClBattleSoundType): Promise<void> {
        if (!this.enabled || !this.audioContext || !this.masterGain) return;
        
        const resumed = await this.ensureResumed();
        if (!resumed) return;
        
        const config = CL_BATTLE_SOUND_CONFIG.SOUNDS[soundType];
        if (!config) return;
        
        try {
            // 创建振荡器
            const oscillator = this.audioContext.createOscillator();
            oscillator.type = config.type;
            oscillator.frequency.value = config.frequency;
            
            // 创建增益节点 (音量包络)
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = config.gain;
            
            // 连接节点
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // 音量包络 (淡入淡出)
            const now = this.audioContext.currentTime;
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(config.gain, now + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, now + config.duration);
            
            // 特殊处理：胜利音效添加上行音阶
            if (soundType === 'victory') {
                oscillator.frequency.setValueAtTime(config.frequency, now);
                oscillator.frequency.linearRampToValueAtTime(config.frequency * 1.5, now + config.duration * 0.5);
                oscillator.frequency.linearRampToValueAtTime(config.frequency * 2, now + config.duration);
            }
            
            // 特殊处理：失败音效添加下行音阶
            if (soundType === 'defeat') {
                oscillator.frequency.setValueAtTime(config.frequency, now);
                oscillator.frequency.linearRampToValueAtTime(config.frequency * 0.5, now + config.duration);
            }
            
            // 播放
            oscillator.start(now);
            oscillator.stop(now + config.duration + 0.05);
            
            // 清理
            oscillator.onended = () => {
                oscillator.disconnect();
                gainNode.disconnect();
            };
        } catch (e) {
            console.warn('音效播放失败:', e);
        }
    }
    
    /**
     * 播放攻击音效
     */
    playAttack(): void {
        this.play('attack');
    }
    
    /**
     * 播放伤害音效
     */
    playDamage(): void {
        this.play('damage');
    }
    
    /**
     * 播放召唤音效
     */
    playSummon(): void {
        this.play('summon');
    }
    
    /**
     * 播放按钮点击音效
     */
    playClick(): void {
        this.play('click');
    }
    
    /**
     * 播放阶段转换音效
     */
    playPhase(): void {
        this.play('phase');
    }
    
    /**
     * 播放抽卡音效
     */
    playDraw(): void {
        this.play('draw');
    }
    
    /**
     * 播放陷阱触发音效
     */
    playTrap(): void {
        this.play('trap');
    }
    
    /**
     * 播放怪兽消灭音效
     */
    playDestroy(): void {
        this.play('destroy');
    }
    
    /**
     * 播放胜利音效
     */
    playVictory(): void {
        this.play('victory');
    }
    
    /**
     * 播放失败音效
     */
    playDefeat(): void {
        this.play('defeat');
    }
    
    /**
     * 设置主音量 (0.0 - 1.0)
     */
    setVolume(volume: number): void {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
        }
    }
    
    /**
     * 设置启用状态
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }
    
    /**
     * 切换静音
     */
    toggleMute(): boolean {
        this.enabled = !this.enabled;
        return this.enabled;
    }
    
    /**
     * 销毁音效系统
     */
    dispose(): void {
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
            this.masterGain = null;
        }
    }
}

// =============================================================================
// 单例导出 (全局音效管理器)
// =============================================================================

let globalSoundManager: ClBattleSoundManager | null = null;

export function getGlobalSoundManager(): ClBattleSoundManager {
    if (!globalSoundManager) {
        globalSoundManager = new ClBattleSoundManager();
    }
    return globalSoundManager;
}
