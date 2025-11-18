/**
 * N8N WORKFLOW: Получение snapshot игрока из PostgreSQL
 * 
 * ЭНДПОИНТ: GET /webhook/player-snapshot?telegramId=XXX
 * 
 * ТРЕБОВАНИЯ:
 * - Установите PostgreSQL node в n8n
 * - Настройте подключение к БД
 * 
 * ВХОДЯЩИЕ ДАННЫЕ:
 * - Query параметр: telegramId (обязательно)
 */

// Извлекаем telegramId из query параметров
const telegramId = $input.first().json?.query?.telegramId || 
                   $input.first().json?.telegramId ||
                   $('Webhook').item.json.query?.telegramId;

if (!telegramId || telegramId <= 0) {
	return [{
		json: {
			success: false,
			message: 'telegramId is required in query parameters',
			received: { telegramId }
		},
	}];
}

// SQL запрос для получения snapshot
// ВАЖНО: Используем однострочный запрос для совместимости с n8n
const query = "SELECT player_data, market_data, events_data, missions_data, achievements_data, available_properties_data, last_synced_at FROM player_snapshots WHERE telegram_id = $1::BIGINT;";

// Возвращаем данные для PostgreSQL node
return [{
	json: {
		query: query,
		parameters: [telegramId],
		_metadata: {
			telegramId: telegramId,
			operation: 'get_snapshot'
		}
	}
}];

