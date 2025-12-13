import React, { useEffect, useCallback, useState } from 'react';
import { Socket } from 'socket.io-client';
import {
  GameMap,
  TileType,
  TILE_VISUALS,
  Position,
  Direction,
  DIRECTION_DELTA,
  MapNPC,
  WorldPlayer,
} from '@card-game/shared';
import '../styles/pixel.css';
import '../styles/world.css';

// 示例地图数据 - 避难所大厅
const SHELTER_MAP: GameMap = {
  id: 'shelter_main',
  name: '避难所 - 中央大厅',
  width: 20,
  height: 15,
  spawnPoint: { x: 10, y: 12 },
  tiles: generateShelterMap(),
  portals: [
    {
      id: 'portal_battle',
      position: { x: 10, y: 2 },
      targetMapId: 'battle_area',
      targetPosition: { x: 5, y: 10 },
      name: '战斗区域',
    },
  ],
  npcs: [
    {
      id: 'npc_commander',
      name: '指挥官',
      position: { x: 5, y: 5 },
      sprite: '👨‍✈️',
      dialogues: ['欢迎来到避难所，幸存者。', '这里是人类最后的堡垒。'],
      type: 'quest',
    },
    {
      id: 'npc_merchant',
      name: '商人',
      position: { x: 15, y: 5 },
      sprite: '🧙',
      dialogues: ['需要装备吗？看看我的货物吧。'],
      type: 'shop',
    },
  ],
  monsters: [
    {
      id: 'boss_titan',
      name: '深渊泰坦',
      position: { x: 10, y: 3 },
      sprite: '🐉',
      level: 99,
      isBoss: true,
      bossId: 'abyssal_titan',
    },
  ],
};

// 生成避难所地图
function generateShelterMap(): GameMap['tiles'] {
  const tiles: GameMap['tiles'] = [];
  
  for (let y = 0; y < 15; y++) {
    tiles[y] = [];
    for (let x = 0; x < 20; x++) {
      // 边界墙壁
      if (x === 0 || x === 19 || y === 0 || y === 14) {
        tiles[y][x] = { type: TileType.WALL, walkable: false };
      }
      // 中央建筑区域
      else if (y >= 1 && y <= 3 && x >= 8 && x <= 12) {
        if (y === 1 || (y === 3 && (x === 8 || x === 12))) {
          tiles[y][x] = { type: TileType.WALL, walkable: false };
        } else if (y === 2 && x === 10) {
          tiles[y][x] = { type: TileType.PORTAL, walkable: true, interactable: true, interactionId: 'portal_battle' };
        } else {
          tiles[y][x] = { type: TileType.STONE, walkable: true };
        }
      }
      // 石头路
      else if ((y === 7 && x >= 3 && x <= 17) || (x === 10 && y >= 3 && y <= 12)) {
        tiles[y][x] = { type: TileType.STONE, walkable: true };
      }
      // 树木装饰
      else if ((x === 3 || x === 17) && (y === 3 || y === 11)) {
        tiles[y][x] = { type: TileType.TREE, walkable: false };
      }
      // 水池
      else if (x >= 2 && x <= 4 && y >= 9 && y <= 11) {
        tiles[y][x] = { type: TileType.WATER, walkable: false };
      }
      // 默认草地
      else {
        tiles[y][x] = { type: TileType.GRASS, walkable: true };
      }
    }
  }
  
  return tiles;
}

interface WorldMapProps {
  playerName: string;
  playerId: string;
  playerSprite?: string;
  socket: Socket;
  onEnterBattle?: () => void;
  onOpenShop?: () => void;
}

export const WorldMap: React.FC<WorldMapProps> = ({
  playerName,
  playerId,
  playerSprite = '🧑',
  socket,
  onEnterBattle,
  onOpenShop,
}) => {
  const [map] = useState<GameMap>(SHELTER_MAP);
  const [playerPos, setPlayerPos] = useState<Position>(map.spawnPoint);
  const [playerDir, setPlayerDir] = useState<Direction>('down');
  const [isMoving, setIsMoving] = useState(false);
  const [showDialog, setShowDialog] = useState<{ npc: MapNPC; index: number } | null>(null);
  const [showInteraction, setShowInteraction] = useState<string | null>(null);
  const [otherPlayers, setOtherPlayers] = useState<WorldPlayer[]>([]);

  // 加入世界地图并监听其他玩家
  useEffect(() => {
    // 加入世界地图
    socket.emit('world:join', {
      mapId: map.id,
      position: map.spawnPoint,
      direction: 'down',
      sprite: playerSprite,
    });

    // 监听世界地图事件
    const handlePlayers = (data: { players: WorldPlayer[] }) => {
      // 过滤掉自己
      setOtherPlayers(data.players.filter(p => p.id !== playerId));
    };

    const handlePlayerJoined = (data: { player: WorldPlayer }) => {
      if (data.player.id !== playerId) {
        setOtherPlayers(prev => [...prev, data.player]);
      }
    };

    const handlePlayerLeft = (data: { playerId: string }) => {
      setOtherPlayers(prev => prev.filter(p => p.id !== data.playerId));
    };

    const handlePlayerMoved = (data: { playerId: string; position: Position; direction: Direction }) => {
      setOtherPlayers(prev => prev.map(p => 
        p.id === data.playerId 
          ? { ...p, position: data.position, direction: data.direction }
          : p
      ));
    };

    socket.on('world:players', handlePlayers);
    socket.on('world:playerJoined', handlePlayerJoined);
    socket.on('world:playerLeft', handlePlayerLeft);
    socket.on('world:playerMoved', handlePlayerMoved);

    return () => {
      socket.emit('world:leave');
      socket.off('world:players', handlePlayers);
      socket.off('world:playerJoined', handlePlayerJoined);
      socket.off('world:playerLeft', handlePlayerLeft);
      socket.off('world:playerMoved', handlePlayerMoved);
    };
  }, [socket, map.id, map.spawnPoint, playerId, playerSprite]);

  // 检查位置是否可通行
  const canMoveTo = useCallback((pos: Position): boolean => {
    if (pos.x < 0 || pos.x >= map.width || pos.y < 0 || pos.y >= map.height) {
      return false;
    }
    const tile = map.tiles[pos.y][pos.x];
    return tile.walkable;
  }, [map]);

  // 获取位置上的实体
  const getEntityAt = useCallback((pos: Position) => {
    const npc = map.npcs.find(n => n.position.x === pos.x && n.position.y === pos.y);
    const monster = map.monsters.find(m => m.position.x === pos.x && m.position.y === pos.y);
    const portal = map.portals.find(p => p.position.x === pos.x && p.position.y === pos.y);
    return { npc, monster, portal };
  }, [map]);

  // 移动玩家
  const movePlayer = useCallback((direction: Direction) => {
    if (isMoving) return;

    setPlayerDir(direction);
    const delta = DIRECTION_DELTA[direction];
    const newPos = {
      x: playerPos.x + delta.x,
      y: playerPos.y + delta.y,
    };

    if (canMoveTo(newPos)) {
      setIsMoving(true);
      setPlayerPos(newPos);
      
      // 通知服务器玩家移动
      socket.emit('world:move', {
        position: newPos,
        direction,
      });
      
      // 检查新位置上的实体
      const entity = getEntityAt(newPos);
      
      if (entity.portal) {
        setShowInteraction(`传送到: ${entity.portal.name}`);
        setTimeout(() => setShowInteraction(null), 1500);
      }
      
      setTimeout(() => setIsMoving(false), 150);
    }
  }, [playerPos, canMoveTo, getEntityAt, isMoving, socket]);

  // 交互
  const interact = useCallback(() => {
    // 检查面前的位置
    const delta = DIRECTION_DELTA[playerDir];
    const frontPos = {
      x: playerPos.x + delta.x,
      y: playerPos.y + delta.y,
    };
    
    const { npc, monster, portal } = getEntityAt(frontPos);
    
    if (npc) {
      setShowDialog({ npc, index: 0 });
    } else if (monster) {
      if (monster.isBoss) {
        setShowInteraction(`挑战 ${monster.name}！`);
        setTimeout(() => {
          setShowInteraction(null);
          onEnterBattle?.();
        }, 1000);
      }
    } else if (portal) {
      setShowInteraction(`传送到 ${portal.name}...`);
      setTimeout(() => {
        setShowInteraction(null);
        onEnterBattle?.();
      }, 1000);
    }
    
    // 也检查当前位置
    const currentEntity = getEntityAt(playerPos);
    if (currentEntity.portal) {
      setShowInteraction(`传送到 ${currentEntity.portal.name}...`);
      setTimeout(() => {
        setShowInteraction(null);
        onEnterBattle?.();
      }, 1000);
    }
  }, [playerPos, playerDir, getEntityAt, onEnterBattle]);

  // 键盘控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果正在对话，处理对话逻辑
      if (showDialog) {
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'z') {
          e.preventDefault();
          if (showDialog.index < showDialog.npc.dialogues.length - 1) {
            setShowDialog({ ...showDialog, index: showDialog.index + 1 });
          } else {
            setShowDialog(null);
            // 如果是商人，打开商店
            if (showDialog.npc.type === 'shop') {
              onOpenShop?.();
            }
          }
        }
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          movePlayer('up');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          movePlayer('down');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          movePlayer('left');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          movePlayer('right');
          break;
        case ' ':
        case 'Enter':
        case 'z':
        case 'Z':
          e.preventDefault();
          interact();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePlayer, interact, showDialog, onOpenShop]);

  // 渲染瓷砖
  const renderTile = (tile: GameMap['tiles'][0][0], x: number, y: number) => {
    const visual = TILE_VISUALS[tile.type];
    const isPlayerHere = playerPos.x === x && playerPos.y === y;
    
    // 检查实体
    const npc = map.npcs.find(n => n.position.x === x && n.position.y === y);
    const monster = map.monsters.find(m => m.position.x === x && m.position.y === y);
    
    // 检查其他玩家
    const otherPlayerHere = otherPlayers.find(p => p.position.x === x && p.position.y === y);
    
    return (
      <div
        key={`${x}-${y}`}
        className={`map-tile ${tile.type} ${tile.interactable ? 'interactable' : ''}`}
        style={{
          backgroundColor: visual.bgColor,
          color: visual.color,
        }}
      >
        {/* 地面层 */}
        <span className="tile-char">{visual.char}</span>
        
        {/* NPC层 */}
        {npc && !isPlayerHere && !otherPlayerHere && (
          <span className="entity-sprite npc animate-float">{npc.sprite}</span>
        )}
        
        {/* 怪物层 */}
        {monster && !isPlayerHere && !otherPlayerHere && (
          <span className={`entity-sprite monster ${monster.isBoss ? 'boss animate-float' : ''}`}>
            {monster.sprite}
          </span>
        )}
        
        {/* 其他玩家层 */}
        {otherPlayerHere && !isPlayerHere && (
          <div className="other-player-container">
            <span className={`player-sprite other-player dir-${otherPlayerHere.direction}`}>
              {otherPlayerHere.sprite}
            </span>
            <span className="player-name-tag pixel-text-xs">{otherPlayerHere.username}</span>
          </div>
        )}
        
        {/* 玩家层 */}
        {isPlayerHere && (
          <span className={`player-sprite dir-${playerDir} ${isMoving ? 'moving' : ''}`}>
            {playerSprite}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="pixel-world-screen">
      {/* 顶部信息栏 */}
      <div className="world-header pixel-panel">
        <div className="location-info">
          <span className="location-icon">📍</span>
          <span className="pixel-text">{map.name}</span>
        </div>
        <div className="online-players-info">
          <span className="online-icon">👥</span>
          <span className="pixel-text-small">{otherPlayers.length + 1} 在线</span>
        </div>
        <div className="player-info-mini">
          <span>{playerSprite} {playerName}</span>
        </div>
      </div>

      {/* 地图区域 */}
      <div className="world-map-container">
        <div 
          className="world-map pixel-panel"
          style={{
            gridTemplateColumns: `repeat(${map.width}, 32px)`,
            gridTemplateRows: `repeat(${map.height}, 32px)`,
          }}
        >
          {map.tiles.map((row, y) =>
            row.map((tile, x) => renderTile(tile, x, y))
          )}
        </div>
      </div>

      {/* 控制提示 */}
      <div className="control-hints pixel-panel pixel-panel-dark">
        <div className="hint-row">
          <span className="pixel-badge">W A S D</span>
          <span className="pixel-text-small">移动</span>
        </div>
        <div className="hint-row">
          <span className="pixel-badge">空格/Z</span>
          <span className="pixel-text-small">交互</span>
        </div>
      </div>

      {/* 移动控制器（移动端） */}
      <div className="mobile-controls">
        <button className="ctrl-btn up" onClick={() => movePlayer('up')}>▲</button>
        <div className="ctrl-row">
          <button className="ctrl-btn left" onClick={() => movePlayer('left')}>◄</button>
          <button className="ctrl-btn action" onClick={interact}>○</button>
          <button className="ctrl-btn right" onClick={() => movePlayer('right')}>►</button>
        </div>
        <button className="ctrl-btn down" onClick={() => movePlayer('down')}>▼</button>
      </div>

      {/* 对话框 */}
      {showDialog && (
        <div className="pixel-dialog-box">
          <div className="dialog-speaker">
            <span className="speaker-sprite">{showDialog.npc.sprite}</span>
            <span className="speaker-name pixel-text">{showDialog.npc.name}</span>
          </div>
          <div className="dialog-content pixel-text">
            {showDialog.npc.dialogues[showDialog.index]}
          </div>
          <div className="dialog-hint pixel-text-small animate-blink">
            按 空格/Z 继续...
          </div>
        </div>
      )}

      {/* 交互提示 */}
      {showInteraction && (
        <div className="interaction-toast pixel-panel">
          <span className="pixel-text">{showInteraction}</span>
        </div>
      )}
    </div>
  );
};
