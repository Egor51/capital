/**
 * N8N WORKFLOW: Сохранение и обновление snapshot игрока
 * 
 * ЭНДПОИНТ: POST /webhook/player-snapshot
 * 
 * НАЗНАЧЕНИЕ:
 * - Принимает snapshot состояния игры от клиента
 * - Хранит данные в глобальном хранилище n8n
 * - Обновляет существующие данные (merge)
 * - Создаёт начальное состояние для новых игроков
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
// В n8n webhook данные могут быть в разных местах, пробуем все варианты
const body = $input.first().json?.body || $input.first().json || $json?.body || $json;

// Проверяем наличие telegramId
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

// Получаем глобальное хранилище
const store = $getWorkflowStaticData('global');

// Инициализируем хранилище игроков, если его нет
if (!store.playersByTelegramId) {
	store.playersByTelegramId = {};
}

/**
 * Глубокое клонирование объекта
 */
function clone(obj) {
	if (obj === null || obj === undefined) return obj;
	return JSON.parse(JSON.stringify(obj));
}

/**
 * Создаёт начальный snapshot для нового игрока
 */
function buildInitialSnapshot(telegramId) {
	const difficulty = 'normal';
	const startingCash = 1500000; // normal difficulty
	const now = Date.now();
	
	const initialPlayer = {
		id: `player-${telegramId}`,
		telegramId: telegramId,
		name: 'Игрок',
		cash: startingCash,
		netWorth: startingCash,
		loans: [],
		properties: [],
		cityId: 'murmansk',
		difficulty: difficulty,
		experience: 0,
		level: 1,
		stats: {
			totalSales: 0,
			totalRentIncome: 0,
			totalRenovations: 0,
			propertiesOwned: 0
		},
		lastSyncedAt: now,
		createdAt: now,
		currentMonth: 0,
		totalMonths: 0
	};
	
	const initialMarket = {
		cityId: 'murmansk',
		phase: 'стабильность',
		priceIndex: 1,
		rentIndex: 1,
		vacancyRate: 0.05,
		activeEvents: [],
		lastUpdatedAt: now,
		currentPhase: 'стабильность'
	};
	
	const welcomeEvent = {
		id: `server-welcome-${now}`,
		timestamp: now,
		message: `Добро пожаловать! Сервер инициализировал сессию для ${initialPlayer.name}.`,
		type: 'info'
	};
	
	const initialMissions = [
		{
			id: 'mission-1',
			type: 'portfolio_value',
			title: 'Портфель 10 млн',
			description: 'Достигните чистого капитала 10 000 000 ₽',
			target: 10000000,
			current: 0,
			reward: 500,
			completed: false
		},
		{
			id: 'mission-2',
			type: 'monthly_rent',
			title: 'Аренда 150 000₽/мес',
			description: 'Получайте 150 000 ₽ аренды в месяц',
			target: 150000,
			current: 0,
			reward: 300,
			completed: false
		},
		{
			id: 'mission-3',
			type: 'districts',
			title: 'Все районы',
			description: 'Купите объект в каждом районе города',
			target: 4,
			current: 0,
			reward: 400,
			completed: false
		},
		{
			id: 'mission-4',
			type: 'properties_count',
			title: 'Портфель из 5 объектов',
			description: 'Владейте одновременно 5 объектами',
			target: 5,
			current: 0,
			reward: 250,
			completed: false
		}
	];
	
	const initialAchievements = [
		{
			id: 'ach-1',
			type: 'novice',
			title: 'Инвестор-новичок',
			description: 'Купите первый объект недвижимости',
			icon: '🏠',
			unlocked: false
		},
		{
			id: 'ach-2',
			type: 'rent_king',
			title: 'Король аренды',
			description: 'Получайте 200 000 ₽ аренды в месяц',
			icon: '👑',
			unlocked: false
		},
		{
			id: 'ach-3',
			type: 'flip_master',
			title: 'Флип-мастер',
			description: 'Успешно продайте 10 объектов',
			icon: '🔄',
			unlocked: false
		},
		{
			id: 'ach-4',
			type: 'port_magnate',
			title: 'Магнат порта',
			description: 'Владейте 3 коммерческими объектами возле порта',
			icon: '🚢',
			unlocked: false
		},
		{
			id: 'ach-5',
			type: 'first_property',
			title: 'Первый шаг',
			description: 'Купите первый объект',
			icon: '🎯',
			unlocked: false
		},
		{
			id: 'ach-6',
			type: 'millionaire',
			title: 'Миллионер',
			description: 'Достигните капитала 5 000 000 ₽',
			icon: '💰',
			unlocked: false
		}
	];
	
	return {
		player: clone(initialPlayer),
		market: clone(initialMarket),
		events: [welcomeEvent],
		lastSyncedAt: now,
		missions: clone(initialMissions),
		achievements: clone(initialAchievements),
		availableProperties: []
	};
}

// Получаем текущее состояние игрока или создаём новое
let current = store.playersByTelegramId[telegramId];

if (!current) {
	// Создаём начальный snapshot для нового игрока
	current = buildInitialSnapshot(telegramId);
}

// Обновляем состояние, объединяя текущие данные с новыми
// Используем глубокое клонирование для предотвращения мутаций
const updated = {
	...current,
	// Обновляем основные данные snapshot, если они пришли
	...(player ? { player: clone(player) } : {}),
	...(market ? { market: clone(market) } : {}),
	...(events ? { events: clone(events) } : {}),
	...(lastSyncedAt !== undefined ? { lastSyncedAt: lastSyncedAt } : {}),
	// Обновляем дополнительные данные, если они пришли
	...(missions ? { missions: clone(missions) } : {}),
	...(achievements ? { achievements: clone(achievements) } : {}),
	...(availableProperties ? { availableProperties: clone(availableProperties) } : {})
};

// Сохраняем обновлённое состояние
store.playersByTelegramId[telegramId] = updated;

// Возвращаем успешный ответ
return [{
	json: {
		success: true,
		telegramId: telegramId,
		lastSyncedAt: updated.lastSyncedAt,
		message: 'Snapshot saved successfully'
	},
}];

