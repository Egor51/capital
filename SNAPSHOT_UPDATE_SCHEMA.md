# Схема обновления Snapshot'а игрока

## Обзор

Схема использует **UPSERT паттерн** (INSERT ... ON CONFLICT DO UPDATE) для автоматического создания или обновления данных игрока.

## Структура обновления

### 1. Основная функция: `upsert_player_snapshot()`

```sql
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
RETURNS VOID
```

**Как работает:**
1. **Если игрок НЕ существует** → создаёт новую запись (INSERT)
2. **Если игрок существует** → обновляет существующую запись (UPDATE)

### 2. Двухуровневое обновление

#### Уровень 1: Таблица `players` (основная информация)
```sql
INSERT INTO players (
    telegram_id, player_id, name, cash, net_worth, 
    city_id, difficulty, experience, level, stats,
    created_at, last_synced_at
)
VALUES (...)
ON CONFLICT (telegram_id) DO UPDATE SET
    player_id = EXCLUDED.player_id,
    name = EXCLUDED.name,
    cash = EXCLUDED.cash,
    -- ... остальные поля
    last_synced_at = EXCLUDED.last_synced_at;
```

**Обновляемые поля:**
- `player_id` - ID игрока
- `name` - Имя игрока
- `cash` - Наличные деньги
- `net_worth` - Чистый капитал
- `city_id` - ID города
- `difficulty` - Сложность игры
- `experience` - Опыт
- `level` - Уровень
- `stats` - Статистика (JSONB)
- `last_synced_at` - Время последней синхронизации

**НЕ обновляется:**
- `created_at` - Время создания (сохраняется при первом создании)

#### Уровень 2: Таблица `player_snapshots` (полные данные)
```sql
INSERT INTO player_snapshots (
    telegram_id,
    player_data,      -- Полный объект Player (JSONB)
    market_data,      -- Полный объект MarketState (JSONB)
    events_data,      -- Массив событий (JSONB)
    missions_data,    -- Массив миссий (JSONB)
    achievements_data,-- Массив достижений (JSONB)
    available_properties_data, -- Массив доступных объектов (JSONB)
    last_synced_at
)
VALUES (...)
ON CONFLICT (telegram_id) DO UPDATE SET
    player_data = EXCLUDED.player_data,
    market_data = EXCLUDED.market_data,
    events_data = EXCLUDED.events_data,
    missions_data = EXCLUDED.missions_data,
    achievements_data = EXCLUDED.achievements_data,
    available_properties_data = EXCLUDED.available_properties_data,
    last_synced_at = EXCLUDED.last_synced_at;
```

**Обновляются все поля полностью** - заменяется весь JSONB объект.

## Варианты обновления

### Вариант 1: Использование функции (рекомендуется)

```sql
-- Вызов функции через n8n
SELECT upsert_player_snapshot(
    299235877::BIGINT,
    '{"id": "player-299235877", "name": "Игрок", ...}'::JSONB,
    '{"cityId": "murmansk", "phase": "стабильность", ...}'::JSONB,
    '[]'::JSONB,
    1763473218056::BIGINT,
    '[...]'::JSONB,  -- missions
    '[...]'::JSONB,  -- achievements
    '[...]'::JSONB   -- availableProperties
);
```

### Вариант 2: Прямое обновление через SQL

```sql
-- Обновление только snapshot (если игрок уже существует)
UPDATE player_snapshots
SET 
    player_data = '{"id": "player-299235877", ...}'::JSONB,
    market_data = '{"cityId": "murmansk", ...}'::JSONB,
    events_data = '[]'::JSONB,
    last_synced_at = 1763473218056
WHERE telegram_id = 299235877;
```

### Вариант 3: Частичное обновление JSONB полей

```sql
-- Обновление только определённых полей внутри JSONB
UPDATE player_snapshots
SET 
    player_data = jsonb_set(
        player_data,
        '{cash}',
        '783365'::jsonb
    ),
    player_data = jsonb_set(
        player_data,
        '{netWorth}',
        '1495183.33'::jsonb
    ),
    last_synced_at = 1763473218056
WHERE telegram_id = 299235877;
```

### Вариант 4: Обновление с merge (сохранение существующих данных)

```sql
-- Объединение нового и существующего JSONB
UPDATE player_snapshots
SET 
    player_data = player_data || '{"cash": 783365}'::JSONB,
    events_data = events_data || '[{"id": "new-event", ...}]'::JSONB,
    last_synced_at = 1763473218056
WHERE telegram_id = 299235877;
```

## Схема данных для обновления

### Входящие данные (от клиента)

```json
{
  "telegramId": 299235877,
  "player": {
    "id": "player-299235877",
    "telegramId": 299235877,
    "name": "Игрок",
    "cash": 783365,
    "netWorth": 1495183.33,
    "loans": [...],
    "properties": [...],
    "cityId": "murmansk",
    "difficulty": "normal",
    "experience": 458,
    "level": 1,
    "stats": {...},
    "lastSyncedAt": 1763473218056,
    "createdAt": 1763470835049
  },
  "market": {
    "cityId": "murmansk",
    "phase": "стабильность",
    "priceIndex": 1,
    "rentIndex": 1,
    "vacancyRate": 0.05,
    "activeEvents": [],
    "lastUpdatedAt": 1763473218056
  },
  "events": [...],
  "lastSyncedAt": 1763473218056,
  "missions": [...],
  "achievements": [...],
  "availableProperties": [...]
}
```

### Структура в БД

#### Таблица `players`
```sql
telegram_id: 299235877
player_id: "player-299235877"
name: "Игрок"
cash: 783365.00
net_worth: 1495183.33
city_id: "murmansk"
difficulty: "normal"
experience: 458
level: 1
stats: {"totalSales": 0, "totalRentIncome": 33350, ...}
created_at: 1763470835049
last_synced_at: 1763473218056
updated_at: 2024-01-20 10:30:18
```

#### Таблица `player_snapshots`
```sql
telegram_id: 299235877
player_data: {"id": "player-299235877", "cash": 783365, ...}  -- JSONB
market_data: {"cityId": "murmansk", "phase": "стабильность", ...}  -- JSONB
events_data: [{"id": "rent-...", ...}, ...]  -- JSONB массив
missions_data: [{"id": "mission-1", ...}, ...]  -- JSONB массив
achievements_data: [{"id": "ach-1", ...}, ...]  -- JSONB массив
available_properties_data: [{"id": "p1", ...}, ...]  -- JSONB массив
last_synced_at: 1763473218056
updated_at: 2024-01-20 10:30:18
```

## Автоматические обновления

### Триггер `update_updated_at_column()`

Автоматически обновляет поле `updated_at` при каждом UPDATE:

```sql
CREATE TRIGGER update_snapshots_updated_at 
BEFORE UPDATE ON player_snapshots
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Результат:** Поле `updated_at` всегда содержит актуальное время последнего обновления.

## Использование в n8n

### Workflow для обновления

1. **Webhook Node** → получает данные от клиента
2. **Code Node** → подготавливает SQL запрос (см. `n8n-postgres-workflow.js`)
3. **Postgres Node** → выполняет функцию `upsert_player_snapshot()`

### Пример кода для n8n

```javascript
// В Code Node
const query = `
    SELECT upsert_player_snapshot(
        $1::BIGINT,
        $2::JSONB,
        $3::JSONB,
        $4::JSONB,
        $5::BIGINT,
        $6::JSONB,
        $7::JSONB,
        $8::JSONB
    ) as result;
`;

return [{
    json: {
        query: query,
        parameters: [
            telegramId,
            JSON.stringify(player),
            JSON.stringify(market),
            JSON.stringify(events || []),
            lastSyncedAt,
            JSON.stringify(missions || []),
            JSON.stringify(achievements || []),
            JSON.stringify(availableProperties || [])
        ]
    }
}];
```

## Оптимизация для частых обновлений (каждые 30 секунд)

### 1. Индексы
```sql
-- Уже созданы в схеме:
CREATE INDEX idx_snapshots_telegram_id ON player_snapshots(telegram_id);
CREATE INDEX idx_snapshots_last_synced ON player_snapshots(last_synced_at);
CREATE INDEX idx_snapshots_player_data ON player_snapshots USING GIN (player_data);
```

### 2. Connection Pooling
- Используйте connection pooling в n8n PostgreSQL node
- Рекомендуется: 5-10 соединений

### 3. Batch обновления (опционально)
Если нужно обновлять несколько игроков одновременно:

```sql
CREATE OR REPLACE FUNCTION batch_upsert_snapshots(snapshots JSONB[])
RETURNS VOID AS $$
DECLARE
    snapshot JSONB;
BEGIN
    FOREACH snapshot IN ARRAY snapshots
    LOOP
        PERFORM upsert_player_snapshot(
            (snapshot->>'telegramId')::BIGINT,
            snapshot->'player',
            snapshot->'market',
            snapshot->'events',
            (snapshot->>'lastSyncedAt')::BIGINT,
            COALESCE(snapshot->'missions', '[]'::jsonb),
            COALESCE(snapshot->'achievements', '[]'::jsonb),
            COALESCE(snapshot->'availableProperties', '[]'::jsonb)
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

## Проверка обновления

### Запрос для проверки последнего обновления
```sql
SELECT 
    telegram_id,
    last_synced_at,
    updated_at,
    EXTRACT(EPOCH FROM (NOW() - updated_at)) as seconds_ago
FROM player_snapshots
WHERE telegram_id = 299235877;
```

### Запрос для проверки всех недавно обновлённых
```sql
SELECT 
    telegram_id,
    last_synced_at,
    updated_at
FROM player_snapshots
WHERE updated_at > NOW() - INTERVAL '1 minute'
ORDER BY updated_at DESC;
```

## Важные замечания

1. **Полная замена JSONB**: При обновлении весь JSONB объект заменяется, а не объединяется
2. **Атомарность**: Функция `upsert_player_snapshot()` выполняется в одной транзакции
3. **Производительность**: GIN индексы ускоряют поиск внутри JSONB полей
4. **Целостность данных**: FOREIGN KEY гарантирует, что snapshot существует только для существующего игрока

