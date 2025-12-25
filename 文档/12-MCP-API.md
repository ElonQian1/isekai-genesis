# MCP (Model Context Protocol) API 文档

> ⚠️ **AI 代理专用文档**

本项目支持通过 MCP 协议控制游戏世界。AI 代理可以通过 SSE 连接接收事件，并通过 HTTP POST 发送 JSON-RPC 命令来编辑世界。

## 🔗 连接信息

- **SSE 端点**: `GET /mcp/sse`
- **消息端点**: `POST /mcp/message`

## 🛠️ 可用工具 (Tools)

### 1. `list_prefabs` - 查询可用素材 ⭐ 推荐首先调用
获取所有可用的预制体素材列表，包含分类、ID、名称。**AI 在生成实体前应先调用此工具了解可用素材。**

**参数**:
- `category` (string, optional): 筛选分类 (`trees`, `bushes`, `plants`, `flowers`, `grass`, `rocks`, `paths`, `mushrooms`)

**示例**:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "list_prefabs",
    "arguments": {}
  },
  "id": 1
}
```

**返回示例**:
```
# 可用预制体素材列表

## 树木 (trees)
- `pine_1`: 松树 1 (文件: Pine_1.gltf)
- `common_tree_1`: 普通树 1 (文件: CommonTree_1.gltf)
...
```

### 2. `spawn_entity` - 生成实体
在指定位置生成一个实体（树木、建筑、敌人等）。

**参数**:
- `entity_type` (string): 实体类型 (`tree`, `rock`, `building`, `enemy`, `npc`)
- `prefab_id` (string): 预制体 ID (例如: `pine_1`, `rock_medium_1`)
- `x` (number): X 坐标
- `y` (number): Y 坐标 (对应游戏世界的 Z 轴)
- `rotation` (number, optional): 旋转角度 (默认 0)
- `scale` (number, optional): 缩放比例 (默认 1)

**示例**:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "spawn_entity",
    "arguments": {
      "entity_type": "tree",
      "prefab_id": "pine_1",
      "x": 10,
      "y": 20
    }
  },
  "id": 2
}
```

### 3. `spawn_batch` - 批量生成 🌲
批量生成多个实体，适合创建森林、花园等区域。

**参数**:
- `entity_type` (string): 实体类型 (`tree`, `rock`, `plant`, `flower`, `grass`)
- `prefab_ids` (array): 预制体 ID 列表，随机选择
- `center_x` (number): 中心 X 坐标
- `center_y` (number): 中心 Y 坐标
- `radius` (number): 生成区域半径
- `count` (integer): 生成数量

**示例**:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "spawn_batch",
    "arguments": {
      "entity_type": "tree",
      "prefab_ids": ["pine_1", "pine_2", "pine_3"],
      "center_x": 0,
      "center_y": 0,
      "radius": 20,
      "count": 15
    }
  },
  "id": 3
}
```

### 4. `delete_entity` - 删除实体
删除指定 ID 的实体。

**参数**:
- `entity_id` (string): 实体的唯一 ID

### 5. `clear_area` - 清空区域
清空指定区域内的所有物体。

**参数**:
- `x` (number): 中心 X 坐标
- `y` (number): 中心 Y 坐标
- `radius` (number): 半径

### 6. `undo` - 撤销
撤销上一次操作。（⚠️ 尚未完全实现）

## 🔄 工作流程

1. AI 代理连接到 `/mcp/sse` 监听事件。
2. **首先调用 `list_prefabs`** 了解可用素材。
3. 根据用户需求调用 `spawn_entity` 或 `spawn_batch`。
4. 服务器验证请求，并通过 WebSocket 广播给所有连接的游戏客户端。
5. 游戏客户端收到命令，立即执行操作（如生成树木）。
6. 用户的游戏世界实时更新。

## 📝 AI 提示词示例 (Prompts)

### 场景 1：种一片森林
> 用户说：「在我的城堡旁边种一片松树林」
> 
> AI 应该：
> 1. 调用 `list_prefabs(category="trees")` 获取树木列表
> 2. 调用 `spawn_batch(entity_type="tree", prefab_ids=["pine_1","pine_2","pine_3"], center_x=..., center_y=..., radius=25, count=20)`

### 场景 2：放置装饰
> 用户说：「在路边放几块石头」
> 
> AI 应该：
> 1. 调用 `list_prefabs(category="rocks")` 获取岩石列表
> 2. 多次调用 `spawn_entity(entity_type="rock", prefab_id="pebble_round_1", x=..., y=...)`

### 场景 3：清理区域
> 用户说：「把这片区域的树都清掉」
> 
> AI 应该：
> 调用 `clear_area(x=..., y=..., radius=15)`

## 📋 素材分类速查

| 分类 | category | 常用 prefab_id |
|------|----------|----------------|
| 树木 | trees | `pine_1`~`pine_5`, `common_tree_1`~`common_tree_5` |
| 灌木 | bushes | `bush_common`, `bush_flowers` |
| 岩石 | rocks | `rock_medium_1`~`rock_medium_3`, `pebble_round_*` |
| 植物 | plants | `fern_1`, `clover_1`, `plant_1` |
| 花朵 | flowers | `flower_3_group`, `flower_4_single`, `petal_*` |
| 草 | grass | `grass_common_short`, `grass_common_tall` |
