import React, { useState, useEffect, useCallback } from 'react';
import '../styles/monster-battle.css';

// 卡牌类型
interface BattleCard {
  id: string;
  type: 'attack' | 'defense' | 'heal';
  value: number;
  name: string;
  emoji: string;
}

// 怪物信息
interface MonsterInfo {
  id: string;
  name: string;
  sprite: string;
  level: number;
  maxHealth: number;
}

interface MonsterBattleProps {
  monster: MonsterInfo;
  playerName: string;
  playerSprite: string;
  onBattleEnd: (victory: boolean) => void;
}

// 生成卡池（50张卡牌）
const generateCardPool = (): BattleCard[] => {
  const pool: BattleCard[] = [];
  let cardId = 0;

  // 20张攻击卡（攻击1点）
  for (let i = 0; i < 20; i++) {
    pool.push({
      id: `card_${cardId++}`,
      type: 'attack',
      value: 1,
      name: '斩击',
      emoji: '⚔️',
    });
  }

  // 10张防御卡（防御2点）
  for (let i = 0; i < 10; i++) {
    pool.push({
      id: `card_${cardId++}`,
      type: 'defense',
      value: 2,
      name: '格挡',
      emoji: '🛡️',
    });
  }

  // 20张回复卡（回复1点）
  for (let i = 0; i < 20; i++) {
    pool.push({
      id: `card_${cardId++}`,
      type: 'heal',
      value: 1,
      name: '治疗',
      emoji: '💚',
    });
  }

  return pool;
};

// 洗牌函数
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const MonsterBattle: React.FC<MonsterBattleProps> = ({
  monster,
  playerName,
  playerSprite,
  onBattleEnd,
}) => {
  // 游戏状态
  const [playerHealth, setPlayerHealth] = useState(10);
  const [monsterHealth, setMonsterHealth] = useState(10);
  const [playerDefense, setPlayerDefense] = useState(0);
  const [monsterDefense, setMonsterDefense] = useState(0);
  const [actionPoints, setActionPoints] = useState(5);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [round, setRound] = useState(1);
  
  // 卡牌状态
  const [cardPool, setCardPool] = useState<BattleCard[]>([]);
  const [publicCards, setPublicCards] = useState<BattleCard[]>([]);
  const [playerHand, setPlayerHand] = useState<BattleCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<BattleCard | null>(null);
  
  // 战场部署区域（玩家和怪物各有5个槽位）
  const [playerField, setPlayerField] = useState<(BattleCard | null)[]>([null, null, null, null, null]);
  const [monsterField, setMonsterField] = useState<(BattleCard | null)[]>([null, null, null, null, null]);
  
  // 战斗日志
  const [battleLog, setBattleLog] = useState<string[]>([]);
  
  // 游戏结束状态
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  
  // AI思考中
  const [aiThinking, setAiThinking] = useState(false);

  // 添加日志
  const addLog = useCallback((message: string) => {
    setBattleLog(prev => [...prev, message]);
  }, []);

  // 初始化战斗
  useEffect(() => {
    const pool = shuffleArray(generateCardPool());
    setCardPool(pool);
    // 抽取5张公共卡牌
    setPublicCards(pool.slice(0, 5));
    setCardPool(pool.slice(5));
    addLog(`⚔️ 战斗开始！${playerName} VS ${monster.name}`);
  }, [monster.name, playerName, addLog]);

  // 刷新公共卡牌区
  const refreshPublicCards = useCallback(() => {
    if (cardPool.length < 5) {
      // 如果卡池不足，重新生成并洗牌
      const newPool = shuffleArray(generateCardPool());
      setPublicCards(newPool.slice(0, 5));
      setCardPool(newPool.slice(5));
    } else {
      setPublicCards(cardPool.slice(0, 5));
      setCardPool(prev => prev.slice(5));
    }
  }, [cardPool]);

  // 玩家获取卡牌（消耗1行动力）
  const acquireCard = useCallback((card: BattleCard) => {
    if (actionPoints < 1 || !isPlayerTurn || gameOver) return;
    
    setPlayerHand(prev => [...prev, card]);
    setPublicCards(prev => prev.filter(c => c.id !== card.id));
    setActionPoints(prev => prev - 1);
    addLog(`📥 获取卡牌：${card.emoji} ${card.name}`);
    
    // 补充公共卡牌
    if (cardPool.length > 0) {
      const newCard = cardPool[0];
      setPublicCards(prev => [...prev, newCard]);
      setCardPool(prev => prev.slice(1));
    }
  }, [actionPoints, isPlayerTurn, gameOver, cardPool, addLog]);

  // 玩家使用卡牌（消耗1行动力）
  const useCard = useCallback((card: BattleCard) => {
    if (actionPoints < 1 || !isPlayerTurn || gameOver) return;

    setPlayerHand(prev => prev.filter(c => c.id !== card.id));
    setActionPoints(prev => prev - 1);
    setSelectedCard(null);

    switch (card.type) {
      case 'attack':
        const actualDamage = Math.max(0, card.value - monsterDefense);
        if (monsterDefense > 0) {
          setMonsterDefense(prev => Math.max(0, prev - card.value));
        }
        setMonsterHealth(prev => {
          const newHealth = Math.max(0, prev - actualDamage);
          return newHealth;
        });
        addLog(`⚔️ 对 ${monster.name} 造成 ${actualDamage} 点伤害！`);
        break;
      case 'defense':
        setPlayerDefense(prev => prev + card.value);
        addLog(`🛡️ 获得 ${card.value} 点护甲！`);
        break;
      case 'heal':
        setPlayerHealth(prev => Math.min(10, prev + card.value));
        addLog(`💚 恢复 ${card.value} 点生命！`);
        break;
    }
  }, [actionPoints, isPlayerTurn, gameOver, monsterDefense, monster.name, addLog]);

  // 部署卡牌到战场（消耗1行动力）
  const deployCard = useCallback((card: BattleCard, slotIndex: number) => {
    if (actionPoints < 1 || !isPlayerTurn || gameOver) return;
    if (playerField[slotIndex] !== null) return; // 槽位已占用

    setPlayerHand(prev => prev.filter(c => c.id !== card.id));
    setPlayerField(prev => {
      const newField = [...prev];
      newField[slotIndex] = card;
      return newField;
    });
    setActionPoints(prev => prev - 1);
    setSelectedCard(null);
    addLog(`📍 部署 ${card.emoji} ${card.name} 到战场槽位 ${slotIndex + 1}`);
  }, [actionPoints, isPlayerTurn, gameOver, playerField, addLog]);

  // 执行战场上的卡牌效果
  const executeFieldCards = useCallback((field: (BattleCard | null)[], isPlayer: boolean) => {
    const actions: (() => void)[] = [];
    
    field.forEach((card, index) => {
      if (!card) return;
      
      actions.push(() => {
        if (isPlayer) {
          switch (card.type) {
            case 'attack':
              const actualDamage = Math.max(0, card.value - monsterDefense);
              if (monsterDefense > 0) {
                setMonsterDefense(prev => Math.max(0, prev - card.value));
              }
              setMonsterHealth(prev => Math.max(0, prev - actualDamage));
              addLog(`⚔️ 战场卡牌[${index + 1}] 对 ${monster.name} 造成 ${actualDamage} 点伤害！`);
              break;
            case 'defense':
              setPlayerDefense(prev => prev + card.value);
              addLog(`🛡️ 战场卡牌[${index + 1}] 提供 ${card.value} 点护甲！`);
              break;
            case 'heal':
              setPlayerHealth(prev => Math.min(10, prev + card.value));
              addLog(`💚 战场卡牌[${index + 1}] 恢复 ${card.value} 点生命！`);
              break;
          }
        } else {
          switch (card.type) {
            case 'attack':
              const actualDamage = Math.max(0, card.value - playerDefense);
              if (playerDefense > 0) {
                setPlayerDefense(prev => Math.max(0, prev - card.value));
              }
              setPlayerHealth(prev => Math.max(0, prev - actualDamage));
              addLog(`🔥 敌方战场卡牌[${index + 1}] 造成 ${actualDamage} 点伤害！`);
              break;
            case 'defense':
              setMonsterDefense(prev => prev + card.value);
              addLog(`🛡️ 敌方战场卡牌[${index + 1}] 提供 ${card.value} 点护甲！`);
              break;
            case 'heal':
              setMonsterHealth(prev => Math.min(10, prev + card.value));
              addLog(`💚 敌方战场卡牌[${index + 1}] 恢复 ${card.value} 点生命！`);
              break;
          }
        }
      });
    });
    
    return actions;
  }, [monsterDefense, playerDefense, monster.name, addLog]);

  // 结束玩家回合
  const endPlayerTurn = useCallback(() => {
    if (!isPlayerTurn || gameOver) return;
    
    addLog(`🔄 ${playerName} 结束回合`);
    
    // 先执行玩家战场上的卡牌效果
    const playerFieldActions = executeFieldCards(playerField, true);
    
    let delay = 0;
    playerFieldActions.forEach((action, index) => {
      setTimeout(() => {
        action();
      }, delay + index * 400);
    });
    
    delay += playerFieldActions.length * 400 + 500;
    
    setTimeout(() => {
      setIsPlayerTurn(false);
      setAiThinking(true);
      setActionPoints(5);
      
      // AI回合
      setTimeout(() => {
        executeAiTurn();
      }, 1000);
    }, delay);
  }, [isPlayerTurn, gameOver, playerName, addLog, executeFieldCards, playerField]);

  // AI执行回合
  const executeAiTurn = useCallback(() => {
    addLog(`🤖 ${monster.name} 的回合`);
    
    let aiActionPoints = 5;
    const aiHand: BattleCard[] = [];
    let currentMonsterHealth = monsterHealth;
    let currentPlayerHealth = playerHealth;
    let currentPlayerDefense = playerDefense;
    let currentMonsterDefense = monsterDefense;
    
    const aiActions: (() => void)[] = [];
    
    // AI策略：先获取卡牌，再部署或使用
    // 获取阶段 - AI获取2-3张卡牌
    const cardsToAcquire = Math.min(3, Math.floor(aiActionPoints / 2));
    
    for (let i = 0; i < cardsToAcquire && aiActionPoints > 0 && publicCards.length > 0; i++) {
      // AI优先选择：如果血量低选治疗，否则选攻击
      let selectedIndex = 0;
      
      if (currentMonsterHealth <= 4) {
        // 血量低，优先找治疗卡
        const healIndex = publicCards.findIndex(c => c.type === 'heal');
        if (healIndex !== -1) selectedIndex = healIndex;
        else {
          const defIndex = publicCards.findIndex(c => c.type === 'defense');
          if (defIndex !== -1) selectedIndex = defIndex;
        }
      } else {
        // 血量健康，优先攻击
        const atkIndex = publicCards.findIndex(c => c.type === 'attack');
        if (atkIndex !== -1) selectedIndex = atkIndex;
      }
      
      const card = publicCards[selectedIndex];
      if (card) {
        aiHand.push(card);
        aiActionPoints--;
      }
    }

    // AI部署和使用阶段
    let deploySlotIndex = 0;
    for (const card of aiHand) {
      if (aiActionPoints <= 0) break;
      
      // AI有50%概率部署卡牌到战场，50%直接使用
      const shouldDeploy = Math.random() > 0.5 && deploySlotIndex < 5 && monsterField[deploySlotIndex] === null;
      
      if (shouldDeploy) {
        const slotIdx = deploySlotIndex;
        aiActions.push(() => {
          setMonsterField(prev => {
            const newField = [...prev];
            newField[slotIdx] = card;
            return newField;
          });
          addLog(`📍 ${monster.name} 部署 ${card.emoji} ${card.name} 到战场`);
        });
        deploySlotIndex++;
      } else {
        aiActions.push(() => {
          switch (card.type) {
            case 'attack':
              const actualDamage = Math.max(0, card.value - currentPlayerDefense);
              if (currentPlayerDefense > 0) {
                currentPlayerDefense = Math.max(0, currentPlayerDefense - card.value);
                setPlayerDefense(currentPlayerDefense);
              }
              currentPlayerHealth = Math.max(0, currentPlayerHealth - actualDamage);
              setPlayerHealth(currentPlayerHealth);
              addLog(`🔥 ${monster.name} 攻击，造成 ${actualDamage} 点伤害！`);
              break;
            case 'defense':
              currentMonsterDefense += card.value;
              setMonsterDefense(currentMonsterDefense);
              addLog(`🛡️ ${monster.name} 获得 ${card.value} 点护甲！`);
              break;
            case 'heal':
              currentMonsterHealth = Math.min(10, currentMonsterHealth + card.value);
              setMonsterHealth(currentMonsterHealth);
              addLog(`💚 ${monster.name} 恢复 ${card.value} 点生命！`);
              break;
          }
        });
      }
      aiActionPoints--;
    }

    // 执行AI动作（带延迟）
    let delay = 500;
    aiActions.forEach((action, index) => {
      setTimeout(() => {
        action();
      }, delay * (index + 1));
    });

    // AI回合结束时执行怪物战场卡牌效果
    const totalAiActionDelay = delay * (aiActions.length + 1);
    
    setTimeout(() => {
      addLog(`⚡ ${monster.name} 战场结算...`);
      const monsterFieldActions = executeFieldCards(monsterField, false);
      
      monsterFieldActions.forEach((action, index) => {
        setTimeout(() => {
          action();
        }, index * 400);
      });
      
      const fieldDelay = monsterFieldActions.length * 400 + 500;
      
      setTimeout(() => {
        addLog(`🔄 ${monster.name} 结束回合`);
        setAiThinking(false);
        setIsPlayerTurn(true);
        setActionPoints(5);
        setRound(prev => prev + 1);
        refreshPublicCards();
      }, fieldDelay);
    }, totalAiActionDelay);
    
  }, [monster.name, monsterHealth, playerHealth, playerDefense, monsterDefense, publicCards, monsterField, addLog, refreshPublicCards, executeFieldCards]);

  // 检查战斗结束
  useEffect(() => {
    if (gameOver) return;
    
    if (monsterHealth <= 0) {
      setGameOver(true);
      setVictory(true);
      addLog(`🎉 胜利！${monster.name} 被击败了！`);
      setTimeout(() => onBattleEnd(true), 2000);
    } else if (playerHealth <= 0) {
      setGameOver(true);
      setVictory(false);
      addLog(`💀 失败！${playerName} 被击败了...`);
      setTimeout(() => onBattleEnd(false), 2000);
    }
  }, [playerHealth, monsterHealth, gameOver, monster.name, playerName, addLog, onBattleEnd]);

  // 渲染血条
  const renderHealthBar = (current: number, max: number, isPlayer: boolean) => {
    const percentage = (current / max) * 100;
    return (
      <div className="health-bar-container">
        <div 
          className={`health-bar ${isPlayer ? 'player' : 'monster'}`}
          style={{ width: `${percentage}%` }}
        />
        <span className="health-text">{current}/{max}</span>
      </div>
    );
  };

  // 渲染卡牌
  const renderCard = (card: BattleCard, onClick?: () => void, disabled?: boolean) => {
    const typeColors = {
      attack: 'card-attack',
      defense: 'card-defense',
      heal: 'card-heal',
    };
    
    return (
      <div
        key={card.id}
        className={`battle-card ${typeColors[card.type]} ${disabled ? 'disabled' : ''} ${selectedCard?.id === card.id ? 'selected' : ''}`}
        onClick={disabled ? undefined : onClick}
      >
        <div className="card-emoji">{card.emoji}</div>
        <div className="card-name">{card.name}</div>
        <div className="card-value">
          {card.type === 'attack' && `伤害 ${card.value}`}
          {card.type === 'defense' && `护甲 ${card.value}`}
          {card.type === 'heal' && `回复 ${card.value}`}
        </div>
      </div>
    );
  };

  // 游戏失败画面
  if (gameOver && !victory) {
    return (
      <div className="game-over-screen">
        <div className="game-over-content">
          <div className="game-over-icon">💀</div>
          <h1 className="game-over-title">游戏失败</h1>
          <p className="game-over-text">你被 {monster.name} 击败了...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="monster-battle-screen">
      {/* 战斗信息栏 */}
      <div className="battle-header">
        <div className="round-info pixel-panel">
          <span>第 {round} 回合</span>
        </div>
        <div className="turn-info pixel-panel">
          <span>{isPlayerTurn ? '你的回合' : `${monster.name}的回合`}</span>
        </div>
        <div className="action-points pixel-panel">
          <span>行动力: </span>
          {[...Array(5)].map((_, i) => (
            <span key={i} className={`ap-dot ${i < actionPoints ? 'active' : ''}`}>●</span>
          ))}
        </div>
      </div>

      {/* 战斗区域 */}
      <div className="battle-arena">
        {/* 怪物区域 */}
        <div className="combatant monster-side">
          <div className="combatant-sprite monster-sprite">
            {monster.sprite}
          </div>
          <div className="combatant-info">
            <div className="combatant-name">{monster.name}</div>
            <div className="combatant-level">Lv.{monster.level}</div>
            {renderHealthBar(monsterHealth, 10, false)}
            {monsterDefense > 0 && (
              <div className="defense-indicator">🛡️ {monsterDefense}</div>
            )}
          </div>
        </div>

        {/* VS */}
        <div className="vs-indicator">
          <span>⚔️</span>
          <span className="vs-text">VS</span>
        </div>

        {/* 玩家区域 */}
        <div className="combatant player-side">
          <div className="combatant-info">
            <div className="combatant-name">{playerName}</div>
            {renderHealthBar(playerHealth, 10, true)}
            {playerDefense > 0 && (
              <div className="defense-indicator">🛡️ {playerDefense}</div>
            )}
          </div>
          <div className="combatant-sprite player-sprite">
            {playerSprite}
          </div>
        </div>
      </div>

      {/* 公共卡牌区 */}
      <div className="public-cards-area pixel-panel">
        <div className="area-title">
          <span>📋 公共卡牌区</span>
          <span className="hint">（点击获取，消耗1行动力）</span>
        </div>
        <div className="cards-row">
          {publicCards.map(card => 
            renderCard(card, () => acquireCard(card), !isPlayerTurn || actionPoints < 1 || aiThinking)
          )}
        </div>
      </div>

      {/* 战场部署区域 */}
      <div className="battlefield-area pixel-panel">
        <div className="area-title">
          <span>🏟️ 战场部署</span>
          <span className="hint">（选中手牌后点击槽位部署，每回合结算时自动触发效果）</span>
        </div>
        
        {/* 怪物战场 */}
        <div className="monster-field">
          <div className="field-label">敌方战场</div>
          <div className="field-slots">
            {monsterField.map((card, index) => (
              <div key={`monster-slot-${index}`} className={`field-slot monster-slot ${card ? 'occupied' : ''}`}>
                {card ? (
                  <div className={`deployed-card card-${card.type}`}>
                    <span className="deployed-emoji">{card.emoji}</span>
                    <span className="deployed-value">{card.value}</span>
                  </div>
                ) : (
                  <span className="slot-number">{index + 1}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 分隔线 */}
        <div className="field-divider">
          <span>⚔️ 战线 ⚔️</span>
        </div>

        {/* 玩家战场 */}
        <div className="player-field">
          <div className="field-label">我方战场</div>
          <div className="field-slots">
            {playerField.map((card, index) => (
              <div 
                key={`player-slot-${index}`} 
                className={`field-slot player-slot ${card ? 'occupied' : ''} ${selectedCard && !card ? 'deployable' : ''}`}
                onClick={() => {
                  if (selectedCard && !card && isPlayerTurn && actionPoints >= 1 && !aiThinking) {
                    deployCard(selectedCard, index);
                  }
                }}
              >
                {card ? (
                  <div className={`deployed-card card-${card.type}`}>
                    <span className="deployed-emoji">{card.emoji}</span>
                    <span className="deployed-value">{card.value}</span>
                  </div>
                ) : (
                  <span className="slot-number">{index + 1}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 玩家手牌 */}
      <div className="player-hand-area pixel-panel">
        <div className="area-title">
          <span>🎴 我的手牌</span>
          <span className="hint">（点击选中，再点击使用，消耗1行动力）</span>
        </div>
        <div className="cards-row">
          {playerHand.length === 0 ? (
            <div className="empty-hand">暂无手牌，请从公共区获取</div>
          ) : (
            playerHand.map(card => 
              renderCard(
                card, 
                () => {
                  if (selectedCard?.id === card.id) {
                    useCard(card);
                  } else {
                    setSelectedCard(card);
                  }
                }, 
                !isPlayerTurn || actionPoints < 1 || aiThinking
              )
            )
          )}
        </div>
        {selectedCard && (
          <div className="selected-card-hint">
            已选中: {selectedCard.emoji} {selectedCard.name} - 点击手牌使用 / 点击战场槽位部署
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="battle-actions">
        <button 
          className="pixel-btn end-turn-btn"
          onClick={endPlayerTurn}
          disabled={!isPlayerTurn || gameOver || aiThinking}
        >
          结束回合
        </button>
      </div>

      {/* 战斗日志 */}
      <div className="battle-log pixel-panel">
        <div className="log-title">📜 战斗日志</div>
        <div className="log-content">
          {battleLog.slice(-8).map((log, index) => (
            <div key={index} className="log-entry">{log}</div>
          ))}
        </div>
      </div>

      {/* AI思考提示 */}
      {aiThinking && (
        <div className="ai-thinking">
          <span className="thinking-icon">🤔</span>
          <span>{monster.name} 正在思考...</span>
        </div>
      )}

      {/* 胜利提示 */}
      {gameOver && victory && (
        <div className="victory-overlay">
          <div className="victory-content pixel-panel">
            <div className="victory-icon">🎉</div>
            <h2>战斗胜利！</h2>
            <p>你击败了 {monster.name}！</p>
          </div>
        </div>
      )}
    </div>
  );
};
