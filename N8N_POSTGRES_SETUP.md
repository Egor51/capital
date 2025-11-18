# Настройка PostgreSQL для n8n

## Рекомендация: PostgreSQL

**Почему PostgreSQL:**
- ✅ Надёжная реляционная БД
- ✅ Отличная поддержка JSON/JSONB для сложных структур
- ✅ Высокая производительность
- ✅ Встроенная поддержка в n8n
- ✅ Масштабируемость
- ✅ ACID транзакции

**Vector DB не нужна** - она используется для семантического поиска и embeddings, не для хранения игровых данных.

## Шаг 1: Установка PostgreSQL

### Локально (для разработки)
```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Linux (Ubuntu/Debian)
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql

# Docker
docker run -d \
  --name postgres-capital \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=capital_game \
  -p 5432:5432 \
  postgres:15-alpine
```

### В продакшене
- **Heroku Postgres** (бесплатный tier для начала)
- **Supabase** (бесплатный PostgreSQL)
- **AWS RDS** (для масштабирования)
- **DigitalOcean Managed Database**

## Шаг 2: Создание базы данных

```sql
-- Подключитесь к PostgreSQL
psql -U postgres

-- Создайте базу данных
CREATE DATABASE capital_game;

-- Подключитесь к базе
\c capital_game

-- Выполните схему из postgres-schema.sql
\i postgres-schema.sql
```

## Шаг 3: Настройка n8n

### 3.1. Установка PostgreSQL node

1. Откройте n8n
2. Перейдите в **Settings** → **Community Nodes**
3. Найдите и установите **Postgres** node (встроенный в n8n)

### 3.2. Создание подключения

1. Создайте новый workflow
2. Добавьте **Postgres** node
3. Нажмите **Create New Credential**
4. Заполните данные:
   - **Host**: `localhost` (или IP вашего сервера)
   - **Port**: `5432`
   - **Database**: `capital_game`
   - **User**: `postgres` (или ваш пользователь)
   - **Password**: ваш пароль
   - **SSL**: `disable` (для локальной разработки) или `require` (для продакшена)

### 3.3. Создание workflow для сохранения snapshot

1. **Webhook Node** (Trigger)
   - Method: `POST`
   - Path: `/player-snapshot`
   - Response Mode: `Last Node`

2. **Code Node** (JavaScript)
   - Вставьте код из `n8n-postgres-workflow.js`
   - Этот код подготовит SQL запрос

3. **Postgres Node** (Execute Query)
   - Operation: `Execute Query`
   - Query: `={{ $json.query }}`
   - Parameters: `={{ $json.parameters }}`
   - Options: 
     - Query Replacement: `Enabled`

4. **Code Node** (Обработка результата)
   ```javascript
   const result = $input.first().json;
   
   return [{
     json: {
       success: true,
       telegramId: $('Code').item.json._metadata.telegramId,
       lastSyncedAt: $('Code').item.json._metadata.lastSyncedAt,
       message: 'Snapshot saved successfully'
     }
   }];
   ```

### 3.4. Создание workflow для получения snapshot

1. **Webhook Node** (Trigger)
   - Method: `GET`
   - Path: `/player-snapshot`
   - Response Mode: `Last Node`

2. **Code Node** (JavaScript)
   - Вставьте код из `n8n-get-snapshot-workflow.js`

3. **Postgres Node** (Execute Query)
   - Operation: `Execute Query`
   - Query: `={{ $json.query }}`
   - Parameters: `={{ $json.parameters }}`

4. **Code Node** (Форматирование ответа)
   ```javascript
   const result = $input.first().json;
   
   if (!result || result.length === 0) {
     return [{
       json: {
         success: false,
         message: 'Player snapshot not found'
       }
     }];
   }
   
   const snapshot = result[0];
   
   return [{
     json: {
       success: true,
       player: snapshot.player_data,
       market: snapshot.market_data,
       events: snapshot.events_data,
       missions: snapshot.missions_data,
       achievements: snapshot.achievements_data,
       availableProperties: snapshot.available_properties_data,
       lastSyncedAt: snapshot.last_synced_at
     }
   }];
   ```

## Шаг 4: Тестирование

### Тест сохранения
```bash
curl -X POST https://your-n8n-url/webhook/player-snapshot \
  -H "Content-Type: application/json" \
  -d '{
    "telegramId": 299235877,
    "player": {...},
    "market": {...},
    "events": [],
    "lastSyncedAt": 1763473218056
  }'
```

### Тест получения
```bash
curl "https://your-n8n-url/webhook/player-snapshot?telegramId=299235877"
```

## Оптимизация для частых обновлений (каждые 30 секунд)

### 1. Используйте connection pooling
```javascript
// В настройках PostgreSQL node
// Options → Connection Pooling: Enabled
// Max Connections: 10
```

### 2. Добавьте индексы (уже в схеме)
- GIN индексы для JSONB полей
- Индексы на telegram_id и last_synced_at

### 3. Используйте UPSERT (уже реализовано)
- Функция `upsert_player_snapshot` использует `ON CONFLICT`
- Не нужно проверять существование перед вставкой

### 4. Batch обновления (опционально)
Если нужно обновлять несколько игроков одновременно:
```sql
-- Можно создать функцию для batch upsert
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

## Мониторинг и обслуживание

### Проверка размера БД
```sql
SELECT 
    pg_size_pretty(pg_database_size('capital_game')) as database_size;
```

### Проверка количества записей
```sql
SELECT COUNT(*) as total_players FROM players;
SELECT COUNT(*) as total_snapshots FROM player_snapshots;
```

### Очистка старых данных (опционально)
```sql
-- Удалить игроков, которые не синхронизировались более 30 дней
DELETE FROM players 
WHERE last_synced_at < EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days')::BIGINT * 1000;
```

## Альтернативы PostgreSQL

Если по каким-то причинам PostgreSQL не подходит:

1. **MongoDB** - документная БД, хорошо для JSON
2. **MySQL 8.0+** - поддержка JSON полей
3. **SQLite** - для небольших проектов (не рекомендуется для продакшена)

Но PostgreSQL - лучший выбор для вашего случая! 🚀

