-- PostgreSQL Schema для игры Capital
-- База данных для хранения состояния игроков

-- Таблица игроков (основная информация)
CREATE TABLE IF NOT EXISTS players (
    telegram_id BIGINT PRIMARY KEY,
    player_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL DEFAULT 'Игрок',
    cash DECIMAL(15, 2) NOT NULL DEFAULT 1500000,
    net_worth DECIMAL(15, 2) NOT NULL DEFAULT 1500000,
    city_id VARCHAR(50) NOT NULL DEFAULT 'murmansk',
    difficulty VARCHAR(20) NOT NULL DEFAULT 'normal',
    experience INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    stats JSONB NOT NULL DEFAULT '{"totalSales": 0, "totalRentIncome": 0, "totalRenovations": 0, "propertiesOwned": 0}'::jsonb,
    created_at BIGINT NOT NULL,
    last_synced_at BIGINT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Индексы для быстрого поиска
    CONSTRAINT valid_telegram_id CHECK (telegram_id > 0),
    CONSTRAINT valid_cash CHECK (cash >= 0),
    CONSTRAINT valid_net_worth CHECK (net_worth >= 0)
);

-- Таблица snapshot'ов (полное состояние игры)
CREATE TABLE IF NOT EXISTS player_snapshots (
    telegram_id BIGINT PRIMARY KEY REFERENCES players(telegram_id) ON DELETE CASCADE,
    
    -- Основные данные (JSONB для гибкости)
    player_data JSONB NOT NULL,
    market_data JSONB NOT NULL,
    events_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Дополнительные данные
    missions_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    achievements_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    available_properties_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Метаданные
    last_synced_at BIGINT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Индексы GIN для быстрого поиска по JSONB
    CONSTRAINT valid_last_synced CHECK (last_synced_at > 0)
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_players_telegram_id ON players(telegram_id);
CREATE INDEX IF NOT EXISTS idx_players_player_id ON players(player_id);
CREATE INDEX IF NOT EXISTS idx_players_last_synced ON players(last_synced_at);
CREATE INDEX IF NOT EXISTS idx_snapshots_telegram_id ON player_snapshots(telegram_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_last_synced ON player_snapshots(last_synced_at);

-- GIN индексы для JSONB полей (для поиска внутри JSON)
CREATE INDEX IF NOT EXISTS idx_snapshots_player_data ON player_snapshots USING GIN (player_data);
CREATE INDEX IF NOT EXISTS idx_snapshots_market_data ON player_snapshots USING GIN (market_data);
CREATE INDEX IF NOT EXISTS idx_snapshots_events_data ON player_snapshots USING GIN (events_data);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_snapshots_updated_at BEFORE UPDATE ON player_snapshots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Представление для удобного получения полных данных игрока
CREATE OR REPLACE VIEW player_full_data AS
SELECT 
    p.telegram_id,
    p.player_id,
    p.name,
    p.cash,
    p.net_worth,
    p.city_id,
    p.difficulty,
    p.experience,
    p.level,
    p.stats,
    p.created_at,
    p.last_synced_at,
    ps.player_data,
    ps.market_data,
    ps.events_data,
    ps.missions_data,
    ps.achievements_data,
    ps.available_properties_data,
    ps.updated_at
FROM players p
LEFT JOIN player_snapshots ps ON p.telegram_id = ps.telegram_id;

-- Функция для получения snapshot игрока
CREATE OR REPLACE FUNCTION get_player_snapshot(p_telegram_id BIGINT)
RETURNS TABLE (
    telegram_id BIGINT,
    player_data JSONB,
    market_data JSONB,
    events_data JSONB,
    missions_data JSONB,
    achievements_data JSONB,
    available_properties_data JSONB,
    last_synced_at BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.telegram_id,
        ps.player_data,
        ps.market_data,
        ps.events_data,
        ps.missions_data,
        ps.achievements_data,
        ps.available_properties_data,
        ps.last_synced_at
    FROM player_snapshots ps
    WHERE ps.telegram_id = p_telegram_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ФУНКЦИЯ: upsert_player_snapshot()
-- 
-- НАЗНАЧЕНИЕ: Создание или обновление snapshot'а игрока
-- 
-- СХЕМА ОБНОВЛЕНИЯ:
--   1. Если игрок НЕ существует → создаёт новую запись (INSERT)
--   2. Если игрок существует → обновляет существующую запись (UPDATE)
-- 
-- ОБНОВЛЯЕТ:
--   - Таблица players: основная информация (cash, net_worth, stats, etc.)
--   - Таблица player_snapshots: полные данные в JSONB (player_data, market_data, etc.)
-- 
-- АВТОМАТИЧЕСКИ:
--   - updated_at обновляется через триггер
--   - created_at сохраняется при первом создании
-- 
-- ИСПОЛЬЗОВАНИЕ:
--   SELECT upsert_player_snapshot(
--       299235877::BIGINT,
--       '{"id": "player-299235877", ...}'::JSONB,
--       '{"cityId": "murmansk", ...}'::JSONB,
--       '[]'::JSONB,
--       1763473218056::BIGINT,
--       '[]'::JSONB,  -- missions (опционально)
--       '[]'::JSONB,  -- achievements (опционально)
--       '[]'::JSONB   -- availableProperties (опционально)
--   );
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_player_snapshot(
    p_telegram_id BIGINT,
    p_player_data JSONB,
    p_market_data JSONB,
    p_events_data JSONB,
    p_last_synced_at BIGINT,
    p_missions_data JSONB DEFAULT '[]'::jsonb,
    p_achievements_data JSONB DEFAULT '[]'::jsonb,
    p_available_properties_data JSONB DEFAULT '[]'::jsonb
)
RETURNS VOID AS $$
BEGIN
    -- ========================================================================
    -- ШАГ 1: Обновление таблицы players (основная информация)
    -- Использует UPSERT: если запись существует - обновляет, иначе создаёт
    -- ========================================================================
    INSERT INTO players (
        telegram_id,
        player_id,
        name,
        cash,
        net_worth,
        city_id,
        difficulty,
        experience,
        level,
        stats,
        created_at,
        last_synced_at
    )
    VALUES (
        p_telegram_id,
        COALESCE((p_player_data->>'id')::VARCHAR, 'player-' || p_telegram_id),
        COALESCE((p_player_data->>'name')::VARCHAR, 'Игрок'),
        COALESCE((p_player_data->>'cash')::DECIMAL, 1500000),
        COALESCE((p_player_data->>'netWorth')::DECIMAL, 1500000),
        COALESCE((p_player_data->>'cityId')::VARCHAR, 'murmansk'),
        COALESCE((p_player_data->>'difficulty')::VARCHAR, 'normal'),
        COALESCE((p_player_data->>'experience')::INTEGER, 0),
        COALESCE((p_player_data->>'level')::INTEGER, 1),
        COALESCE(p_player_data->'stats', '{"totalSales": 0, "totalRentIncome": 0, "totalRenovations": 0, "propertiesOwned": 0}'::jsonb),
        COALESCE((p_player_data->>'createdAt')::BIGINT, EXTRACT(EPOCH FROM NOW())::BIGINT * 1000),
        p_last_synced_at
    )
    ON CONFLICT (telegram_id) DO UPDATE SET
        -- При конфликте (игрок уже существует) обновляем все поля:
        player_id = EXCLUDED.player_id,
        name = EXCLUDED.name,
        cash = EXCLUDED.cash,
        net_worth = EXCLUDED.net_worth,
        city_id = EXCLUDED.city_id,
        difficulty = EXCLUDED.difficulty,
        experience = EXCLUDED.experience,
        level = EXCLUDED.level,
        stats = EXCLUDED.stats,
        last_synced_at = EXCLUDED.last_synced_at;
        -- Примечание: created_at НЕ обновляется (сохраняется первоначальное значение)
    
    -- ========================================================================
    -- ШАГ 2: Обновление таблицы player_snapshots (полные данные в JSONB)
    -- Использует UPSERT: если snapshot существует - обновляет, иначе создаёт
    -- ========================================================================
    INSERT INTO player_snapshots (
        telegram_id,
        player_data,
        market_data,
        events_data,
        missions_data,
        achievements_data,
        available_properties_data,
        last_synced_at
    )
    VALUES (
        p_telegram_id,
        p_player_data,
        p_market_data,
        p_events_data,
        p_missions_data,
        p_achievements_data,
        p_available_properties_data,
        p_last_synced_at
    )
    ON CONFLICT (telegram_id) DO UPDATE SET
        -- При конфликте (snapshot уже существует) полностью заменяем JSONB объекты:
        player_data = EXCLUDED.player_data,              -- Полный объект Player
        market_data = EXCLUDED.market_data,               -- Полный объект MarketState
        events_data = EXCLUDED.events_data,               -- Массив событий
        missions_data = EXCLUDED.missions_data,           -- Массив миссий
        achievements_data = EXCLUDED.achievements_data,   -- Массив достижений
        available_properties_data = EXCLUDED.available_properties_data, -- Массив доступных объектов
        last_synced_at = EXCLUDED.last_synced_at;
        -- Примечание: updated_at обновляется автоматически через триггер
END;
$$ LANGUAGE plpgsql;

