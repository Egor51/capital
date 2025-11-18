/**
 * N8N WORKFLOW: Сохранение snapshot игрока в PostgreSQL
 * 
 * ЭНДПОИНТ: POST /webhook/player-snapshot
 * 
 * ТРЕБОВАНИЯ:
 * - Установите PostgreSQL node в n8n
 * - Настройте подключение к БД
 * - Выполните SQL схему из postgres-schema.sql
 * 
 * ВХОДЯЩИЕ ДАННЫЕ:
 * {
 *   telegramId: number,
 *   player: Player,
 *   market: MarketState,
 *   events: GameEvent[],
 *   lastSyncedAt: number,
 *   missions?: Mission[],
 *   achievements?: Achievement[],
 *   availableProperties?: Property[]
 * }
 */

// Извлекаем данные из body запроса
const body = $input.first().json?.body || $input.first().json || $json?.body || $json;

// Проверяем наличие обязательных полей
const { telegramId, player, market, events, lastSyncedAt, missions, achievements, availableProperties } = body || {};

if (!telegramId || telegramId <= 0) {
	return [{
		json: {
			success: false,
			message: 'telegramId is required and must be positive',
			received: { telegramId, hasBody: !!body }
		},
	}];
}

if (!player || !market || lastSyncedAt === undefined) {
	return [{
		json: {
			success: false,
			message: 'player, market, and lastSyncedAt are required',
			received: {
				hasPlayer: !!player,
				hasMarket: !!market,
				hasLastSyncedAt: lastSyncedAt !== undefined
			}
		},
	}];
}

// Подготавливаем данные для сохранения
const playerData = JSON.stringify(player);
const marketData = JSON.stringify(market);
const eventsData = JSON.stringify(events || []);
const missionsData = JSON.stringify(missions || []);
const achievementsData = JSON.stringify(achievements || []);
const availablePropertiesData = JSON.stringify(availableProperties || []);

// Вызываем функцию upsert в PostgreSQL
// Используем Execute Query node в n8n
// ВАЖНО: Используем однострочный запрос для совместимости с n8n
const query = "SELECT upsert_player_snapshot($1::BIGINT, $2::JSONB, $3::JSONB, $4::JSONB, $5::BIGINT, $6::JSONB, $7::JSONB, $8::JSONB) as result;";

// Возвращаем данные для PostgreSQL node
return [{
	json: {
		query: query,
		parameters: [
			telegramId,
			playerData,
			marketData,
			eventsData,
			lastSyncedAt,
			missionsData,
			achievementsData,
			availablePropertiesData
		],
		// Метаданные для отладки
		_metadata: {
			telegramId: telegramId,
			lastSyncedAt: lastSyncedAt,
			hasMissions: !!missions && missions.length > 0,
			hasAchievements: !!achievements && achievements.length > 0,
			hasAvailableProperties: !!availableProperties && availableProperties.length > 0
		}
	}
}];

