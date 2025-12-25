/**
 * 渲染模块导出
 * 
 * 模块: client/render
 * 前缀: Cl
 * 文档: 文档/04-client.md
 */

// 卡牌网格
export * from './cl_card_mesh';

// 卡牌材质
export * from './cl_card_material';

// 卡牌动画
export * from './cl_card_animation';

// 手牌管理
export * from './cl_hand_manager';

// 战斗场景
export * from './cl_battle_scene';

// 卡牌渲染器
export * from './cl_card_renderer';

// 大世界场景 (模块化版本)
export * from './world/cl_world_scene_modular';

// 战斗渲染模块 (新模块化版本，单独导出避免冲突)
export * as BattleRender from './battle';
