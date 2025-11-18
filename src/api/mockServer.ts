/**
 * МОДУЛЬ: Mock Server API
 * 
 * НАЗНАЧЕНИЕ:
 * Имитирует серверное API для игры. Содержит три основных запроса:
 * 1. fetchReferenceData() - получение справочных данных
 * 2. fetchPlayerSnapshot() - получение состояния игрока
 * 3. persistPlayerSnapshot() - сохранение состояния игрока
 * 
 * АРХИТЕКТУРА:
 * - Все данные хранятся в памяти (в продакшене будет PostgreSQL)
 * - Использует симуляцию сетевой задержки (250ms)
 * - Клонирует все данные для предотвращения мутаций
 * - Инициализирует serverConfig при загрузке модуля
 * 
 * МИГРАЦИЯ НА РЕАЛЬНЫЙ СЕРВЕР:
 * - Заменить simulateResponse на fetch() запросы
 * - Заменить in-memory хранилище на PostgreSQL через Spring Boot
 * - Добавить аутентификацию и авторизацию
 * - Добавить валидацию и обработку ошибок
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * - Вызывается из App.tsx при bootstrap
 * - Используется в syncState.ts для синхронизации
 * - Все методы асинхронные и возвращают Promise
 */

import { cities } from '../data/cities';
import { achievements as initialAchievements, initialMissions } from '../data/missions';
import {
  initialMarketProperties,
  loanPresetsByDifficulty,
  mockMarketEvents,
  startingCashByDifficulty
} from '../data/mockData';
import { initializeMarket } from '../utils/marketLogic';
import { DEFAULT_TIMERS } from '../utils/realtimeLogic';
import { hydrateReferenceConfig } from './serverConfig';
import {
  City,
  Difficulty,
  GameEvent,
  LoanPreset,
  MarketEvent,
  MarketPhase,
  MarketState,
  Player,
  Property
} from '../types';
import { ServerSyncState, SyncState } from '../types/sync';
import { AuthRequest, AuthResponse } from '../types/auth';

/**
 * Интерфейс справочных данных игры
 * Содержит все статические данные, необходимые для работы игры
 */
export interface ReferenceDataPayload {
  cities: City[];
  properties: Property[];
  districtModifiers: Array<{
    cityId: string;
    district: string;
    priceMultiplier: number;
    rentMultiplier: number;
  }>;
  loanPresets: Record<Difficulty, LoanPreset>;
  marketEvents: MarketEvent[];
  marketPhases: MarketPhase[];
  marketParameters: Pick<MarketState, 'priceIndex' | 'rentIndex' | 'vacancyRate'>;
  rentCoefficients: Record<string, number>;
  priceCoefficients: Record<string, number>;
  startingCash: Record<Difficulty, number>;
}

const GLOBAL_MARKET_PHASES: MarketPhase[] = ['рост', 'стабильность', 'кризис'];

const referenceData: ReferenceDataPayload = buildReferenceData();

hydrateReferenceConfig({
  loanPresets: referenceData.loanPresets,
  rentCoefficients: referenceData.rentCoefficients,
  priceCoefficients: referenceData.priceCoefficients,
  marketPhases: referenceData.marketPhases
});

// Хранилище игроков по telegramId (в продакшене будет PostgreSQL)
const playersByTelegramId = new Map<number, ServerSyncState>();

/**
 * ЗАПРОС 0: Авторизация по Telegram ID
 * 
 * НАЗНАЧЕНИЕ:
 * Авторизует пользователя по ID из Telegram Mini Apps:
 * - Проверяет существование игрока с таким telegramId
 * - Создаёт нового игрока, если не найден
 * - Возвращает playerId для последующих запросов
 * 
 * КОГДА ВЫЗЫВАЕТСЯ:
 * - При первой загрузке приложения (до загрузки данных)
 * - При восстановлении сессии
 * - Перед любыми операциями с данными игрока
 * 
 * ЧТО ПОЛУЧАЕТ:
 * @param request: AuthRequest {
 *   telegramId: number              // ID пользователя из Telegram
 *   initData?: string                // Полная строка initData для валидации (опционально)
 * }
 * 
 * ЧТО ВОЗВРАЩАЕТ:
 * AuthResponse {
 *   success: boolean                 // Успешна ли авторизация
 *   playerId: string                 // ID игрока в системе (если успешно)
 *   isNewPlayer: boolean             // Создан ли новый игрок
 *   message?: string                 // Сообщение об ошибке (если не успешно)
 *   token?: string                   // JWT токен для последующих запросов (в реальном API)
 * }
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * - Первый шаг при загрузке приложения
 * - Определяет, какой игрок загружается
 * - В реальном API здесь будет валидация initData через Telegram Bot API
 * 
 * ПРИМЕЧАНИЕ:
 * - В мок-версии initData не валидируется
 * - В продакшене нужно валидировать через Telegram Bot API
 * - playerId генерируется как "player-{telegramId}"
 */
export async function authenticate(request: AuthRequest): Promise<AuthResponse> {
  const { telegramId, initData } = request;

  if (!telegramId || telegramId <= 0) {
    return {
      success: false,
      message: 'Неверный Telegram ID'
    };
  }

  // В реальном API здесь будет валидация initData
  // const isValid = await validateTelegramInitData(initData);
  // if (!isValid) {
  //   return { success: false, message: 'Неверные данные авторизации' };
  // }
  // Пока initData не используется, но будет нужен для валидации на сервере
  void initData;

  // Проверяем, существует ли игрок
  const existingSnapshot = playersByTelegramId.get(telegramId);
  
  if (existingSnapshot) {
    // Игрок существует - возвращаем его ID
    return simulateResponse({
      success: true,
      playerId: existingSnapshot.player.id,
      isNewPlayer: false,
      token: `mock-token-${telegramId}` // В реальном API будет JWT
    });
  }

  // Создаём нового игрока
  const newSnapshot = buildInitialSnapshot(telegramId);
  playersByTelegramId.set(telegramId, newSnapshot);

  return simulateResponse({
    success: true,
    playerId: newSnapshot.player.id,
    isNewPlayer: true,
    token: `mock-token-${telegramId}` // В реальном API будет JWT
  });
}

/**
 * ЗАПРОС 1: Получение справочных данных игры
 * 
 * НАЗНАЧЕНИЕ:
 * Загружает все статические данные, необходимые для работы игры:
 * - Список городов с их параметрами
 * - Доступные объекты недвижимости на рынке
 * - Модификаторы районов (коэффициенты цен и аренды)
 * - Кредитные ставки по уровням сложности
 * - Рыночные события и фазы
 * - Стартовый капитал по сложностям
 * 
 * КОГДА ВЫЗЫВАЕТСЯ:
 * - При первой загрузке приложения (bootstrap)
 * - Перед инициализацией игрового состояния
 * - Используется для гидратации serverConfig (коэффициенты, пресеты)
 * 
 * ЧТО ПОЛУЧАЕТ:
 * Ничего (нет параметров)
 * 
 * ЧТО ВОЗВРАЩАЕТ:
 * ReferenceDataPayload {
 *   cities: City[]                    // Все доступные города (Мурманск и др.)
 *   properties: Property[]            // Начальный список объектов на рынке
 *   districtModifiers: Array<{        // Модификаторы по районам
 *     cityId: string
 *     district: string                // "Центр", "Спальный район", "Возле порта"
 *     priceMultiplier: number         // Множитель цены (0.7-1.2)
 *     rentMultiplier: number          // Множитель аренды (0.8-1.2)
 *   }>
 *   loanPresets: Record<Difficulty, LoanPreset>  // Ставки по кредитам
 *   marketEvents: MarketEvent[]       // Предзаданные рыночные события
 *   marketPhases: MarketPhase[]       // ["рост", "стабильность", "кризис"]
 *   marketParameters: {               // Базовые параметры рынка
 *     priceIndex: number              // 1.0 (базовый индекс цен)
 *     rentIndex: number               // 1.0 (базовый индекс аренды)
 *     vacancyRate: number             // 0.05 (5% простой)
 *   }
 *   rentCoefficients: Record<string, number>     // Коэффициенты аренды по ключам "cityId:district:rent"
 *   priceCoefficients: Record<string, number>     // Коэффициенты цен по ключам "cityId:district:price"
 *   startingCash: Record<Difficulty, number>      // Стартовый капитал: {easy: 2000000, normal: 1500000, hard: 1000000}
 * }
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * - Клиент получает все справочники для расчётов
 * - Коэффициенты сохраняются в serverConfig для бизнес-логики
 * - Список городов используется для выбора локации
 * - Кредитные пресеты применяются при оформлении ипотеки/залога
 */
export async function fetchReferenceData(): Promise<ReferenceDataPayload> {
  return simulateResponse(referenceData);
}

/**
 * ЗАПРОС 2: Получение полного снапшота состояния игрока
 * 
 * НАЗНАЧЕНИЕ:
 * Загружает полное состояние игры с сервера:
 * - Данные игрока (деньги, опыт, уровень, статистика)
 * - Состояние рынка (фаза, индексы, активные события)
 * - История событий игры
 * - Текущие миссии и достижения
 * - Список доступных объектов на рынке
 * 
 * КОГДА ВЫЗЫВАЕТСЯ:
 * - При первой загрузке приложения (bootstrap) - после авторизации
 * - При восстановлении сессии после перезапуска
 * - При синхронизации с сервером (loadGameState)
 * 
 * ЧТО ПОЛУЧАЕТ:
 * @param telegramId: number - ID пользователя из Telegram (обязательно)
 * 
 * ЧТО ВОЗВРАЩАЕТ:
 * ServerSyncState {
 *   player: Player {                  // Полные данные игрока
 *     id: string                      // "player-1"
 *     name: string                    // "Игрок"
 *     cash: number                    // Текущие деньги (₽)
 *     netWorth: number                // Чистый капитал
 *     cityId: string                  // "murmansk"
 *     difficulty: Difficulty          // "easy" | "normal" | "hard"
 *     experience: number              // Накопленный опыт
 *     level: number                   // Текущий уровень (1-10)
 *     stats: {                        // Статистика
 *       totalSales: number            // Всего продаж
 *       totalRentIncome: number       // Всего аренды получено
 *       totalRenovations: number      // Всего ремонтов
 *       propertiesOwned: number        // Макс объектов одновременно
 *     }
 *     properties: Property[]           // Объекты в собственности
 *     loans: Loan[]                   // Активные кредиты
 *     lastSyncedAt: number            // Timestamp последней синхронизации
 *     createdAt: number               // Timestamp создания
 *   }
 *   market: MarketState {             // Состояние рынка
 *     cityId: string
 *     phase: MarketPhase              // "рост" | "стабильность" | "кризис"
 *     priceIndex: number              // Текущий индекс цен (0.7-1.3)
 *     rentIndex: number               // Текущий индекс аренды (0.8-1.2)
 *     vacancyRate: number             // Процент простоя (0.02-0.15)
 *     activeEvents: MarketEvent[]     // Активные рыночные события
 *     lastUpdatedAt: number           // Timestamp обновления рынка
 *   }
 *   events: GameEvent[]               // История событий (последние 100)
 *   missions: Mission[]                // Текущее состояние миссий
 *   achievements: Achievement[]        // Текущее состояние достижений
 *   availableProperties: Property[]   // Объекты доступные для покупки
 *   lastSyncedAt: number              // Timestamp синхронизации
 * }
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * - Восстановление состояния игры после перезапуска
 * - Отображение всех данных в UI (Dashboard, MarketScreen и т.д.)
 * - Обработка офлайн-периода (processOfflinePeriod)
 */
export async function fetchPlayerSnapshot(telegramId: number): Promise<ServerSyncState> {
  return simulateResponse(ensurePlayerSnapshot(telegramId));
}

/**
 * ЗАПРОС 3: Сохранение состояния игры на сервере
 * 
 * НАЗНАЧЕНИЕ:
 * Сохраняет текущее состояние игры на сервере:
 * - Обновляет данные игрока (деньги, опыт, объекты, кредиты)
 * - Сохраняет состояние рынка
 * - Обновляет историю событий
 * - Синхронизирует прогресс миссий и достижений
 * - Обновляет список доступных объектов (после покупок)
 * 
 * КОГДА ВЫЗЫВАЕТСЯ:
 * - Автоматически каждые 30 секунд (autoSync)
 * - После каждого игрового действия (покупка, продажа, ремонт)
 * - При обработке офлайн-периода
 * - При изменении стратегии объекта
 * 
 * ЧТО ПОЛУЧАЕТ:
 * @param snapshot: SyncState {       // Основное состояние
 *   player: Player                    // Обновлённые данные игрока
 *   market: MarketState               // Текущее состояние рынка
 *   events: GameEvent[]               // Новые события
 *   lastSyncedAt: number              // Timestamp синхронизации
 * }
 * 
 * @param extras: {                    // Дополнительные данные (опционально)
 *   missions?: Mission[]              // Обновлённые миссии
 *   achievements?: Achievement[]      // Обновлённые достижения
 *   availableProperties?: Property[] // Обновлённый список объектов на рынке
 * }
 * 
 * ЧТО ВОЗВРАЩАЕТ:
 * Promise<void> (ничего, только подтверждение сохранения)
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * - Сохранение прогресса игрока
 * - Синхронизация между устройствами
 * - Резервное копирование состояния
 * - Обновление списка доступных объектов после покупок
 * 
 * ПРИМЕЧАНИЕ:
 * - Если extras не передан, сохраняются только основные данные
 * - Если передан, обновляются соответствующие части снапшота
 * - Все данные клонируются для предотвращения мутаций
 * 
 * @param telegramId: number - ID пользователя из Telegram (обязательно)
 */
export async function persistPlayerSnapshot(
  telegramId: number,
  snapshot: SyncState,
  extras: Partial<Pick<ServerSyncState, 'missions' | 'achievements' | 'availableProperties'>> = {}
): Promise<void> {
  const current = ensurePlayerSnapshot(telegramId);
  const updatedSnapshot: ServerSyncState = {
    ...current,
    ...clone({
      player: snapshot.player,
      market: snapshot.market,
      events: snapshot.events,
      lastSyncedAt: snapshot.lastSyncedAt
    }),
    missions: extras.missions ? clone(extras.missions) : current.missions,
    achievements: extras.achievements ? clone(extras.achievements) : current.achievements,
    availableProperties: extras.availableProperties
      ? clone(extras.availableProperties)
      : current.availableProperties
  };

  // Сохраняем в хранилище по telegramId
  playersByTelegramId.set(telegramId, updatedSnapshot);

  await simulateResponse(undefined, 120);
}

/**
 * ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: Обеспечивает наличие снапшота игрока
 * 
 * НАЗНАЧЕНИЕ:
 * Проверяет, существует ли сохранённый снапшот игрока по telegramId.
 * Если нет - создаёт новый начальный снапшот.
 * 
 * ПАРАМЕТРЫ:
 * @param telegramId - ID пользователя из Telegram
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * Вызывается внутри fetchPlayerSnapshot и persistPlayerSnapshot
 * для гарантии наличия данных игрока.
 */
function ensurePlayerSnapshot(telegramId: number): ServerSyncState {
  const existing = playersByTelegramId.get(telegramId);
  if (existing) {
    return existing;
  }
  
  // Создаём новый снапшот
  const newSnapshot = buildInitialSnapshot(telegramId);
  playersByTelegramId.set(telegramId, newSnapshot);
  return newSnapshot;
}

/**
 * ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: Строит справочные данные
 * 
 * НАЗНАЧЕНИЕ:
 * Собирает все статические данные игры в единый объект:
 * - Преобразует города и районы в плоский список модификаторов
 * - Создаёт ключи для коэффициентов (cityId:district:rent/price)
 * - Инициализирует базовые параметры рынка
 * 
 * ВОЗВРАЩАЕТ:
 * ReferenceDataPayload - полный набор справочных данных
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * Вызывается один раз при инициализации модуля
 * для создания глобального объекта referenceData
 */
function buildReferenceData(): ReferenceDataPayload {
  const marketTemplate = initializeMarket();
  const districtModifiers = cities.flatMap(city =>
    Object.entries(city.districtModifiers).map(([district, modifiers]) => ({
      cityId: city.id,
      district,
      priceMultiplier: modifiers.priceMultiplier,
      rentMultiplier: modifiers.rentMultiplier
    }))
  );

  const rentCoefficients = districtModifiers.reduce<Record<string, number>>((acc, modifier) => {
    acc[`${modifier.cityId}:${modifier.district}:rent`] = modifier.rentMultiplier;
    return acc;
  }, {});

  const priceCoefficients = districtModifiers.reduce<Record<string, number>>((acc, modifier) => {
    acc[`${modifier.cityId}:${modifier.district}:price`] = modifier.priceMultiplier;
    return acc;
  }, {});

  return {
    cities: clone(cities),
    properties: clone(initialMarketProperties),
    districtModifiers,
    loanPresets: clone(loanPresetsByDifficulty),
    marketEvents: clone(mockMarketEvents),
    marketPhases: GLOBAL_MARKET_PHASES,
    marketParameters: {
      priceIndex: marketTemplate.priceIndex,
      rentIndex: marketTemplate.rentIndex,
      vacancyRate: marketTemplate.vacancyRate
    },
    rentCoefficients,
    priceCoefficients,
    startingCash: clone(startingCashByDifficulty)
  };
}

/**
 * ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: Создаёт начальный снапшот игры
 * 
 * НАЗНАЧЕНИЕ:
 * Создаёт полное начальное состояние для нового игрока:
 * - Создаёт игрока с начальным капиталом
 * - Инициализирует рынок для выбранного города
 * - Добавляет приветственное событие
 * - Настраивает начальные миссии и достижения
 * - Подготавливает список доступных объектов
 * 
 * ПАРАМЕТРЫ:
 * @param telegramId - ID пользователя из Telegram
 * 
 * ВОЗВРАЩАЕТ:
 * ServerSyncState - полный начальный снапшот игры
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * Вызывается при первом запуске игры или когда нет сохранённого состояния
 */
function buildInitialSnapshot(telegramId: number): ServerSyncState {
  const difficulty: Difficulty = 'normal';
  const player = createInitialPlayer(telegramId, difficulty);
  const market = initializeMarket(player.cityId);
  const now = Date.now();

  const welcomeEvent: GameEvent = {
    id: `server-welcome-${now}`,
    timestamp: now,
    message: `Добро пожаловать! Сервер инициализировал сессию для ${player.name}.`,
    type: 'info'
  };

  return {
    player,
    market,
    events: [welcomeEvent],
    lastSyncedAt: now,
    missions: clone(initialMissions),
    achievements: clone(initialAchievements),
    availableProperties: clone(
      initialMarketProperties.map(property => ({
        ...property,
        rentIntervalMs: property.rentIntervalMs ?? DEFAULT_TIMERS.rentIntervalMs,
        nextRentAt: property.nextRentAt ?? null,
        renovationStartsAt: property.renovationStartsAt ?? null,
        renovationEndsAt: property.renovationEndsAt ?? null,
        isUnderRenovation: property.isUnderRenovation ?? false
      }))
    )
  };
}

/**
 * ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: Создаёт начального игрока
 * 
 * НАЗНАЧЕНИЕ:
 * Создаёт объект игрока с начальными параметрами:
 * - Устанавливает стартовый капитал по сложности
 * - Инициализирует все статистики нулями
 * - Устанавливает начальный уровень и опыт
 * - Создаёт пустые массивы объектов и кредитов
 * 
 * ПАРАМЕТРЫ:
 * @param telegramId - ID пользователя из Telegram
 * @param difficulty - Уровень сложности ("easy" | "normal" | "hard")
 * 
 * ВОЗВРАЩАЕТ:
 * Player - объект игрока с начальными данными
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * Вызывается при создании нового игрока или начального снапшота
 */
function createInitialPlayer(telegramId: number, difficulty: Difficulty): Player {
  const cash = startingCashByDifficulty[difficulty];
  const now = Date.now();

  return {
    id: `player-${telegramId}`,
    telegramId,
    name: 'Игрок',
    cash,
    netWorth: cash,
    loans: [],
    properties: [],
    cityId: 'murmansk',
    difficulty,
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
}

/**
 * ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: Глубокое клонирование объектов
 * 
 * НАЗНАЧЕНИЕ:
 * Создаёт глубокую копию объекта через JSON сериализацию.
 * Используется для предотвращения мутаций исходных данных.
 * 
 * ПАРАМЕТРЫ:
 * @param payload - Объект для клонирования
 * 
 * ВОЗВРАЩАЕТ:
 * T - полная копия объекта
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * - При возврате данных из API (чтобы клиент не мог изменить серверные данные)
 * - При сохранении состояния (чтобы избежать побочных эффектов)
 * 
 * ОГРАНИЧЕНИЯ:
 * - Не работает с функциями, undefined в массивах, Symbol, Date
 * - Для игровых данных этого достаточно
 */
function clone<T>(payload: T): T {
  if (payload === undefined || payload === null) {
    return payload;
  }
  return JSON.parse(JSON.stringify(payload));
}

/**
 * ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: Симуляция сетевой задержки
 * 
 * НАЗНАЧЕНИЕ:
 * Имитирует реальный API запрос с задержкой сети.
 * Возвращает промис, который резолвится через указанное время.
 * 
 * ПАРАМЕТРЫ:
 * @param payload - Данные для возврата
 * @param latency - Задержка в миллисекундах (по умолчанию 250ms)
 * 
 * ВОЗВРАЩАЕТ:
 * Promise<T> - промис с клонированными данными после задержки
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * - Все API методы используют эту функцию для имитации реального сервера
 * - Помогает тестировать асинхронную логику на клиенте
 * - В продакшене будет заменена на реальные fetch запросы
 * 
 * ПРИМЕЧАНИЕ:
 * - Для persistPlayerSnapshot используется задержка 120ms (быстрее)
 * - Для fetch методов используется 250ms (стандартная задержка)
 */
function simulateResponse<T>(payload: T, latency = 250): Promise<T> {
  return new Promise(resolve => {
    setTimeout(() => resolve(clone(payload)), latency);
  });
}

