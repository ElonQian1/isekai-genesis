-- 创建玩家档案表
CREATE TABLE IF NOT EXISTS player_profiles (
    player_id VARCHAR(255) PRIMARY KEY,
    profession VARCHAR(50),
    level INTEGER DEFAULT 1,
    exp BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建玩家背包表
CREATE TABLE IF NOT EXISTS player_inventories (
    player_id VARCHAR(255) PRIMARY KEY,
    inventory_data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
