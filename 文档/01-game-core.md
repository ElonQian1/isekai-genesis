# 🦀 game-core 模块文档

> **模块前缀**: `gc_` | **语言**: Rust | **编译目标**: WASM + Native

---

## 📋 模块职责

```
game-core 是纯逻辑模块，被 game-wasm 和 game-server 共同引用

✅ 可以做:
├── 定义游戏数据结构 (Player, Card, Battle)
├── 实现游戏规则 (伤害计算、胜负判定)
├── 验证游戏操作 (出牌合法性)
└── 提供纯函数计算

❌ 不可以做:
├── 网络请求
├── 文件读写
├── 随机数 (由调用方提供)
└── 任何 IO 操作
```

---

## 📁 文件结构

```
crates/game-core/
├── Cargo.toml
└── src/
    ├── lib.rs              # 模块导出
    ├── gc_types.rs         # 🏷️ 核心类型定义
    ├── gc_player.rs        # 👤 玩家相关
    ├── gc_card.rs          # 🃏 卡牌相关
    ├── gc_battle.rs        # ⚔️ 战斗系统
    ├── gc_effect.rs        # ✨ 效果系统
    └── gc_validation.rs    # ✅ 规则验证
```

---

## 🏷️ 命名规范

### 文件名
```
gc_xxx.rs    # 全部小写，gc_ 前缀
```

### 结构体
```rust
// ✅ 正确: Gc 前缀 + PascalCase
pub struct GcPlayer { ... }
pub struct GcCard { ... }
pub struct GcBattleState { ... }

// ❌ 错误: 无前缀
pub struct Player { ... }      // 会与其他模块冲突
```

### 函数
```rust
// ✅ 正确: gc_ 前缀 + snake_case
pub fn gc_calculate_damage(...) -> u32 { ... }
pub fn gc_validate_play_card(...) -> Result<(), GcError> { ... }

// ❌ 错误: 无前缀
pub fn calculate_damage(...) { ... }  // 容易混淆
```

### 枚举
```rust
// ✅ 正确
pub enum GcCardType { Attack, Defense, Skill }
pub enum GcPlayerState { Alive, Dead, Stunned }

// ❌ 错误
pub enum CardType { ... }  // 无前缀
```

---

## 📊 核心类型

### GcPlayer - 玩家
```rust
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcPlayer {
    pub id: String,
    pub name: String,
    pub hp: u32,
    pub max_hp: u32,
    pub attack: u32,
    pub defense: u32,
    pub hand: Vec<GcCard>,
    pub state: GcPlayerState,
}
```

### GcCard - 卡牌
```rust
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcCard {
    pub id: String,
    pub name: String,
    pub card_type: GcCardType,
    pub cost: u32,
    pub base_damage: u32,
    pub effects: Vec<GcEffect>,
}
```

### GcBattleState - 战斗状态
```rust
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcBattleState {
    pub turn: u32,
    pub current_player_id: String,
    pub players: Vec<GcPlayer>,
    pub phase: GcBattlePhase,
}
```

---

## 🔧 核心函数

### 伤害计算
```rust
/// 计算攻击伤害
/// 
/// # Arguments
/// * `attacker` - 攻击者
/// * `target` - 目标
/// * `card` - 使用的卡牌
/// 
/// # Returns
/// * `GcDamageResult` - 伤害结果
pub fn gc_calculate_damage(
    attacker: &GcPlayer,
    target: &GcPlayer,
    card: &GcCard,
) -> GcDamageResult {
    let base = card.base_damage + attacker.attack;
    let reduced = (target.defense as f32 * 0.3) as u32;
    let final_damage = base.saturating_sub(reduced);
    
    GcDamageResult {
        raw_damage: base,
        reduced_damage: reduced,
        final_damage,
    }
}
```

### 出牌验证
```rust
/// 验证出牌是否合法
pub fn gc_validate_play_card(
    state: &GcBattleState,
    player_id: &str,
    card_id: &str,
    target_id: &str,
) -> Result<(), GcValidationError> {
    // 1. 检查是否轮到该玩家
    // 2. 检查卡牌是否在手中
    // 3. 检查目标是否有效
    // 4. 检查费用是否足够
    ...
}
```

---

## ⚠️ AI 代理注意事项

1. **此模块必须无 IO** - 不能有任何副作用
2. **所有随机数由外部传入** - 保证可重放
3. **所有函数必须是纯函数** - 相同输入 = 相同输出
4. **新增类型必须加 `Gc` 前缀** - 防止命名冲突
5. **必须实现 `Serialize + Deserialize`** - 用于 WASM 通信
