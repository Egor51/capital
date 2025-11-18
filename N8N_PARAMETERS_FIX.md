# Исправление ошибки "Query Parameters must be a string or array"

## Проблема

Ошибка: `Query Parameters must be a string of comma-separated values or an array of values`

## Причина

В n8n PostgreSQL node параметры запроса должны передаваться в правильном формате:
- Как массив значений: `[value1, value2, ...]`
- Как строка с разделителями-запятыми: `"value1,value2,..."`

Когда используется выражение `={{ $json.parameters }}`, n8n может неправильно интерпретировать формат данных.

## Решение

### Вариант 1: Использовать прямое указание массива (рекомендуется)

В PostgreSQL node измените `queryParameters` на:

```json
"queryParameters": "={{ $json.parameters || [] }}"
```

Это гарантирует, что всегда передаётся массив.

### Вариант 2: Убедиться, что Code node возвращает массив

В Code node убедитесь, что параметры возвращаются как массив:

```javascript
return [{
    json: {
        query: query,
        parameters: [  // ← Это должен быть массив
            telegramId,
            playerData,
            marketData,
            // ...
        ]
    }
}];
```

### Вариант 3: Использовать строку с разделителями (альтернатива)

Если массив не работает, можно передать параметры как строку:

```javascript
// В Code node
const paramsString = [
    telegramId,
    playerData,
    marketData,
    // ...
].join(',');

return [{
    json: {
        query: query,
        parameters: paramsString  // Строка вместо массива
    }
}];
```

И в PostgreSQL node:
```json
"queryParameters": "={{ $json.parameters }}"
```

## Проверка формата параметров

Добавьте в Code node перед PostgreSQL node проверку:

```javascript
// Проверка формата параметров
const params = $json.parameters;
console.log('Parameters type:', typeof params);
console.log('Is array:', Array.isArray(params));
console.log('Parameters:', params);

return [{
    json: {
        query: $json.query,
        parameters: Array.isArray(params) ? params : []
    }
}];
```

## Исправленные конфигурации

### PostgreSQL Node для сохранения snapshot:

```json
{
  "operation": "executeQuery",
  "query": "={{ $json.query }}",
  "options": {
    "queryReplacement": true
  },
  "additionalFields": {
    "queryParameters": "={{ $json.parameters || [] }}"
  }
}
```

### PostgreSQL Node для получения snapshot:

```json
{
  "operation": "executeQuery",
  "query": "={{ $json.query }}",
  "options": {
    "queryReplacement": true
  },
  "additionalFields": {
    "queryParameters": "={{ $json.parameters || [] }}"
  }
}
```

## Альтернативное решение: Без queryReplacement

Если проблема сохраняется, можно использовать встроенные параметры напрямую в запросе:

### В Code node:

```javascript
// Формируем запрос с параметрами напрямую
const query = `SELECT upsert_player_snapshot(
    ${telegramId}::BIGINT,
    '${playerData.replace(/'/g, "''")}'::JSONB,
    '${marketData.replace(/'/g, "''")}'::JSONB,
    '${eventsData.replace(/'/g, "''")}'::JSONB,
    ${lastSyncedAt}::BIGINT,
    '${missionsData.replace(/'/g, "''")}'::JSONB,
    '${achievementsData.replace(/'/g, "''")}'::JSONB,
    '${availablePropertiesData.replace(/'/g, "''")}'::JSONB
) as result;`;

return [{
    json: {
        query: query
        // Без parameters
    }
}];
```

И в PostgreSQL node убрать `queryParameters` и `queryReplacement`:

```json
{
  "operation": "executeQuery",
  "query": "={{ $json.query }}",
  "options": {}
}
```

**⚠️ ВНИМАНИЕ:** Этот подход менее безопасен, так как не использует параметризованные запросы. Используйте только если другие варианты не работают.

## Рекомендуемое решение

Используйте **Вариант 1** с проверкой массива:

1. В Code node убедитесь, что возвращаете массив:
```javascript
parameters: [telegramId, playerData, ...]  // Массив
```

2. В PostgreSQL node используйте:
```json
"queryParameters": "={{ $json.parameters || [] }}"
```

Это гарантирует, что всегда передаётся массив, даже если данные пришли в неправильном формате.

