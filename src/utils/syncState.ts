import { persistPlayerSnapshot, fetchPlayerSnapshot } from '../api/serverApi';
import { Player, MarketState, GameEvent } from '../types';
import { ServerSyncState, SyncState } from '../types/sync';
import { processOfflinePeriod } from './realtimeLogic';
import { migratePlayerToRealtime, migrateMarketToRealtime } from './dataMigration';

/**
 * Сохраняет состояние игры на сервере (мок API)
 * 
 * @param telegramId - ID пользователя из Telegram (обязательно)
 */
export async function saveGameState(
  telegramId: number,
  player: Player,
  market: MarketState,
  events: GameEvent[],
  extras: Partial<Pick<ServerSyncState, 'missions' | 'achievements' | 'availableProperties'>> = {}
): Promise<void> {
  try {
    const state: SyncState = {
      player: {
        ...player,
        lastSyncedAt: Date.now()
      },
      market: {
        ...market,
        lastUpdatedAt: Date.now()
      },
      events: events.slice(-100),
      lastSyncedAt: Date.now()
    };
    
    await persistPlayerSnapshot(telegramId, state, extras);
  } catch (error) {
    console.error('Ошибка сохранения состояния игры:', error);
  }
}

/**
 * Загружает состояние игры с сервера (мок API)
 * 
 * @param telegramId - ID пользователя из Telegram (обязательно)
 */
export async function loadGameState(telegramId: number): Promise<ServerSyncState | null> {
  try {
    console.log('[loadGameState] Загрузка snapshot для telegramId:', telegramId);
    const state = await fetchPlayerSnapshot(telegramId);
    console.log('[loadGameState] Получен snapshot:', state);
    
    // Проверяем, что состояние загружено и содержит необходимые данные
    if (!state) {
      console.warn('[loadGameState] Snapshot пустой или null');
      return null;
    }
    
    // Нормализуем lastSyncedAt (может прийти как строка из JSONB)
    if (state.lastSyncedAt && typeof state.lastSyncedAt === 'string') {
      state.lastSyncedAt = parseInt(state.lastSyncedAt, 10);
    }
    
    if (!state.player || !state.market) {
      console.warn('[loadGameState] Загруженное состояние неполное:', {
        hasPlayer: !!state.player,
        hasMarket: !!state.market,
        stateKeys: Object.keys(state),
        state: state
      });
      return null;
    }
    
    console.log('[loadGameState] Миграция данных...');
    console.log('[loadGameState] Исходный market:', {
      hasMarket: !!state.market,
      marketPhase: state.market?.phase,
      marketCityId: state.market?.cityId,
      marketKeys: state.market ? Object.keys(state.market) : []
    });
    
    const migratedPlayer = migratePlayerToRealtime(state.player);
    const migratedMarket = migrateMarketToRealtime(
      state.market, 
      state.player.cityId || 'murmansk'
    );
    
    console.log('[loadGameState] После миграции:', {
      hasMigratedPlayer: !!migratedPlayer,
      hasMigratedMarket: !!migratedMarket,
      migratedMarketPhase: migratedMarket?.phase,
      migratedMarketCityId: migratedMarket?.cityId,
      migratedMarketKeys: migratedMarket ? Object.keys(migratedMarket) : []
    });
    
    if (!migratedMarket) {
      console.error('[loadGameState] ОШИБКА: migrateMarketToRealtime вернул null/undefined!');
      return null;
    }
    
    const result: ServerSyncState = {
      ...state,
      player: migratedPlayer,
      market: migratedMarket,
      events: Array.isArray(state.events) ? state.events : [],
      missions: Array.isArray(state.missions) ? state.missions : [],
      achievements: Array.isArray(state.achievements) ? state.achievements : [],
      availableProperties: Array.isArray(state.availableProperties) ? state.availableProperties : [],
      lastSyncedAt: typeof state.lastSyncedAt === 'number' ? state.lastSyncedAt : Date.now()
    };
    
    console.log('[loadGameState] Snapshot успешно загружен и обработан:', {
      hasPlayer: !!result.player,
      hasMarket: !!result.market,
      playerCash: result.player?.cash,
      playerPropertiesCount: result.player?.properties?.length || 0,
      playerProperties: result.player?.properties?.map(p => ({ id: p.id, name: p.name })) || [],
      marketPhase: result.market?.phase,
      marketCityId: result.market?.cityId
    });
    return result;
  } catch (error) {
    console.error('[loadGameState] Ошибка загрузки состояния игры:', error);
    return null;
  }
}

/**
 * Синхронизирует состояние с сервером
 * В реальной реализации будет делать API запрос
 * 
 * @param telegramId - ID пользователя из Telegram (обязательно)
 */
export async function syncWithServer(
  telegramId: number,
  _player: Player,
  _market: MarketState
): Promise<{ player: Player; market: MarketState; events: GameEvent[] } | null> {
  try {
    const snapshot = await fetchPlayerSnapshot(telegramId);
    if (!snapshot) return null;
    return {
      player: snapshot.player,
      market: snapshot.market,
      events: snapshot.events
    };
  } catch (error) {
    console.error('Ошибка синхронизации с сервером:', error);
    return null;
  }
}

/**
 * Обрабатывает вход в игру
 * Проверяет, нужно ли обработать офлайн-период
 * 
 * @param telegramId - ID пользователя из Telegram (обязательно)
 */
export function handleGameEntry(
  telegramId: number,
  player: Player,
  market: MarketState,
  events: GameEvent[]
): { player: Player; market: MarketState; events: GameEvent[] } {
  console.log('[handleGameEntry] Вход:', {
    telegramId,
    hasPlayer: !!player,
    hasMarket: !!market,
    marketPhase: market?.phase,
    lastSyncedAt: player.lastSyncedAt
  });
  
  const now = Date.now();
  const lastSyncedAt = player.lastSyncedAt || player.createdAt || now;
  
  // Если прошло больше минуты с последней синхронизации, обрабатываем офлайн-период
  if (now - lastSyncedAt > 60000) {
    console.log('[handleGameEntry] Обработка офлайн-периода...');
    const result = processOfflinePeriod(player, market, lastSyncedAt, now);
    
    console.log('[handleGameEntry] Результат после processOfflinePeriod:', {
      hasPlayer: !!result.player,
      hasMarket: !!result.market,
      marketPhase: result.market?.phase
    });
    
    // Сохраняем обновленное состояние
    void saveGameState(telegramId, result.player, result.market, result.events);
    
    return result;
  }
  
  console.log('[handleGameEntry] Возврат без обработки офлайн-периода:', {
    hasPlayer: !!player,
    hasMarket: !!market,
    marketPhase: market?.phase
  });
  
  return { player, market, events };
}

/**
 * Автоматическая синхронизация состояния
 * Вызывается периодически для сохранения прогресса
 * 
 * @param telegramId - ID пользователя из Telegram (обязательно)
 */
export function autoSync(
  telegramId: number,
  player: Player,
  market: MarketState,
  events: GameEvent[],
  extras: Partial<Pick<ServerSyncState, 'missions' | 'achievements' | 'availableProperties'>> = {},
  intervalMs: number = 30000
): () => void {
  const intervalId = setInterval(() => {
    saveGameState(telegramId, player, market, events, extras).catch(error => {
      console.error('Ошибка авто-синхронизации:', error);
    });
  }, intervalMs);
  
  return () => clearInterval(intervalId);
}

/**
 * Экспортирует состояние игры для бэкапа
 */
export function exportGameState(
  player: Player,
  market: MarketState,
  events: GameEvent[]
): string {
  const state: SyncState = {
    player,
    market,
    events,
    lastSyncedAt: Date.now()
  };
  
  return JSON.stringify(state, null, 2);
}

/**
 * Импортирует состояние игры из бэкапа
 */
export function importGameState(
  json: string
): SyncState | null {
  try {
    const state: SyncState = JSON.parse(json);
    
    // Мигрируем данные
    const migratedPlayer = migratePlayerToRealtime(state.player);
    const migratedMarket = migrateMarketToRealtime(state.market, state.player.cityId || 'murmansk');
    
    return {
      ...state,
      player: migratedPlayer,
      market: migratedMarket
    };
  } catch (error) {
    console.error('Ошибка импорта состояния игры:', error);
    return null;
  }
}

