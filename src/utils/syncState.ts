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
    const state = await fetchPlayerSnapshot(telegramId);
    
    const migratedPlayer = migratePlayerToRealtime(state.player);
    const migratedMarket = migrateMarketToRealtime(state.market, state.player.cityId || 'murmansk');
    
    return {
      ...state,
      player: migratedPlayer,
      market: migratedMarket
    };
  } catch (error) {
    console.error('Ошибка загрузки состояния игры:', error);
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
  const now = Date.now();
  const lastSyncedAt = player.lastSyncedAt || player.createdAt || now;
  
  // Если прошло больше минуты с последней синхронизации, обрабатываем офлайн-период
  if (now - lastSyncedAt > 60000) {
    const result = processOfflinePeriod(player, market, lastSyncedAt, now);
    
    // Сохраняем обновленное состояние
    void saveGameState(telegramId, result.player, result.market, result.events);
    
    return result;
  }
  
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

