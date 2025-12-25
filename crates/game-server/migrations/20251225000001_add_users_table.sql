-- 创建用户表 (用于登录认证)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为 player_profiles 添加外键关联 (可选，如果 player_id 就是 user_id)
-- 这里假设 player_id 就是 users.id 的字符串形式，或者我们可以直接关联
-- 为了保持现有结构兼容，我们暂时不强制外键，但在逻辑上保持一致
