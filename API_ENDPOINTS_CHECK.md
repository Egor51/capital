# Проверка всех API эндпоинтов

## Базовый URL
```
https://my-traffic.space/webhook
```

## Эндпоинты

### 1. POST /webhook/auth - Авторизация
**URL:** `https://my-traffic.space/webhook/auth`

**Запрос:**
```json
{
  "telegramId": 123456789,
  "initData": "..." // опционально
}
```

**Ожидаемый ответ:**
```json
{
  "success": true,
  "playerId": "player-123456789",
  "isNewPlayer": false,
  "token": "token-123456789-1763481109700",
  "createdAt": 1763481109700
}
```

**Проверка:**
- ✅ URL правильный: `/auth`
- ✅ Метод: POST
- ✅ Обработка ответа: сохраняет поле `success` (важно для клиента)

### 2. GET /webhook/player-snapshot - Получение snapshot
**URL:** `https://my-traffic.space/webhook/player-snapshot?telegramId=123456789`

**Запрос:**
- Query параметр: `telegramId` (обязательно)

**Ожидаемый ответ:**
```json
{
  "success": true,
  "player": {...},
  "market": {...},
  "events": [...],
  "missions": [...],
  "achievements": [...],
  "availableProperties": [...],
  "lastSyncedAt": 1763481109700
}
```

**Проверка:**
- ✅ URL правильный: `/player-snapshot?telegramId=XXX`
- ✅ Метод: GET
- ✅ Обработка ответа: извлекает данные без `success` (для snapshot)

### 3. POST /webhook/player-snapshot - Сохранение snapshot
**URL:** `https://my-traffic.space/webhook/player-snapshot`

**Запрос:**
```json
{
  "telegramId": 123456789,
  "player": {...},
  "market": {...},
  "events": [...],
  "lastSyncedAt": 1763481109700,
  "missions": [...],
  "achievements": [...],
  "availableProperties": [...]
}
```

**Ожидаемый ответ:**
```json
{
  "success": true,
  "telegramId": 123456789,
  "lastSyncedAt": 1763481109700,
  "message": "Snapshot saved successfully"
}
```

**Проверка:**
- ✅ URL правильный: `/player-snapshot`
- ✅ Метод: POST
- ✅ Обработка ответа: извлекает данные без `success`

### 4. GET /webhook/reference-data - Справочные данные
**URL:** `https://my-traffic.space/webhook/reference-data`

**Запрос:**
- Нет параметров

**Ожидаемый ответ:**
```json
{
  "cities": [...],
  "loanPresets": {...},
  "marketPhases": [...],
  "startingCash": {...}
}
```

**Проверка:**
- ✅ URL правильный: `/reference-data`
- ✅ Метод: GET
- ✅ Обработка ответа: возвращает данные напрямую

## Исправления в коде

### 1. Функция `extractData()` - улучшена обработка AuthResponse
- ✅ Для AuthResponse сохраняет поле `success` (нужно клиенту)
- ✅ Для других типов извлекает данные без `success`
- ✅ Правильно обрабатывает массивы и объекты

### 2. Функция `authenticate()` - добавлена обработка ответа
- ✅ Проверяет наличие поля `success`
- ✅ Логирует ответ для отладки
- ✅ Обрабатывает ошибки

### 3. Логирование - добавлено для отладки
- ✅ Логирует сырые ответы от сервера
- ✅ Логирует извлечённые данные
- ✅ Помогает понять, что приходит от n8n

## Как проверить

1. Откройте консоль браузера
2. Проверьте логи:
   - `[API] /auth - Raw response:` - что приходит от n8n
   - `[API] /auth - Extracted data:` - что извлекается
   - `[API] Auth response:` - финальный ответ

3. Если ошибка сохраняется, проверьте:
   - Правильно ли n8n возвращает данные
   - Есть ли поле `success: true` в ответе
   - Есть ли поле `playerId` в ответе

## Возможные проблемы

1. **CORS ошибка** - проверьте настройки CORS в n8n
2. **Неправильный формат ответа** - проверьте логи в консоли
3. **Отсутствие поля success** - проверьте, что n8n возвращает правильный формат
4. **Сетевая ошибка** - проверьте доступность сервера

