-- 添加玩家进度表 (保存位置、游戏状态等)
CREATE TABLE IF NOT EXISTS player_progress (
    player_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    world_position_x REAL DEFAULT 0,
    world_position_y REAL DEFAULT 0,
    world_position_z REAL DEFAULT 0,
    current_map VARCHAR(100) DEFAULT 'main_world',
    game_flags JSONB DEFAULT '{}',
    statistics JSONB DEFAULT '{}',
    last_save_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 更新 player_profiles 添加外键 (如果 player_id 是 users.id)
-- ALTER TABLE player_profiles ADD CONSTRAINT fk_player_user 
--     FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE;

-- 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_player_progress_map ON player_progress(current_map);
