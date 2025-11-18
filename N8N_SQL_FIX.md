# Исправление ошибки SQL в n8n

## Проблема

Ошибка: `unterminated dollar-quoted string at or near "$$ BEGIN"`

## Причина

n8n PostgreSQL node с `queryReplacement: true` может неправильно обрабатывать:
- Многострочные SQL запросы
- SQL запросы с комментариями
- Шаблонные строки (template literals) с обратными кавычками

## Решение

Все SQL запросы должны быть **однострочными** и использовать **обычные кавычки** вместо шаблонных строк.

### ❌ Неправильно (многострочный запрос):

```javascript
const query = `
    SELECT upsert_player_snapshot(
        $1::BIGINT,
        $2::JSONB,
        $3::JSONB
    ) as result;
`;
```

### ✅ Правильно (однострочный запрос):

```javascript
const query = "SELECT upsert_player_snapshot($1::BIGINT, $2::JSONB, $3::JSONB, $4::JSONB, $5::BIGINT, $6::JSONB, $7::JSONB, $8::JSONB) as result;";
```

## Исправленные запросы в workflow

### 1. Сохранение snapshot

```javascript
const query = "SELECT upsert_player_snapshot($1::BIGINT, $2::JSONB, $3::JSONB, $4::JSONB, $5::BIGINT, $6::JSONB, $7::JSONB, $8::JSONB) as result;";
```

### 2. Получение snapshot

```javascript
const query = "SELECT player_data, market_data, events_data, missions_data, achievements_data, available_properties_data, last_synced_at FROM player_snapshots WHERE telegram_id = $1::BIGINT;";
```

### 3. Проверка существования игрока

```javascript
const query = "SELECT telegram_id, player_id, created_at FROM players WHERE telegram_id = $1::BIGINT;";
```

### 4. Создание нового игрока

```javascript
const query = "SELECT upsert_player_snapshot($1::BIGINT, $2::JSONB, $3::JSONB, $4::JSONB, $5::BIGINT, $6::JSONB, $7::JSONB, $8::JSONB) as result;";
```

## Проверка исправления

1. Импортируйте обновлённый `n8n-workflow-complete.json`
2. Убедитесь, что все SQL запросы однострочные
3. Протестируйте каждый эндпоинт
4. Проверьте логи выполнения в n8n

## Дополнительные рекомендации

1. **Не используйте комментарии в SQL** внутри строки запроса
2. **Используйте обычные кавычки** `"` вместо шаблонных строк `` ` ``
3. **Проверяйте запросы** перед выполнением в n8n
4. **Используйте queryReplacement: true** для безопасной передачи параметров

## Альтернативное решение

Если однострочные запросы слишком длинные, можно использовать переменные:

```javascript
const functionName = "upsert_player_snapshot";
const query = `SELECT ${functionName}($1::BIGINT, $2::JSONB, $3::JSONB, $4::JSONB, $5::BIGINT, $6::JSONB, $7::JSONB, $8::JSONB) as result;`;
```

Но лучше использовать однострочный вариант с обычными кавычками.

