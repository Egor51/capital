/**
 * МОДУЛЬ: Real Server API
 * 
 * НАЗНАЧЕНИЕ:
 * Реальный API клиент для взаимодействия с сервером.
 * Использует реальные HTTP запросы к эндпоинтам.
 * 
 * API ЭНДПОИНТЫ:
 * - POST /webhook-test/auth - авторизация по Telegram ID
 * - GET /webhook-test/player-snapshot - получение снапшота игрока
 * - GET /webhook-test/reference-data - получение справочных данных
 * - POST /webhook-test/player-snapshot - сохранение снапшота игрока
 */

import { AuthRequest, AuthResponse } from '../types/auth';
import { ServerSyncState, SyncState } from '../types/sync';
import { ReferenceDataPayload } from './mockServer';

const API_BASE_URL = 'https://my-traffic.space/webhook';

/**
 * Проверяет, является ли ошибка сетевой/CORS ошибкой
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return error.message.includes('Failed to fetch') || 
           error.message.includes('Load failed') ||
           error.message.includes('network');
  }
  return false;
}

/**
 * Выполняет HTTP запрос с обработкой ошибок
 */
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      // Добавляем credentials для CORS
      credentials: 'omit',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      const error = new Error(
        `API Error ${response.status}: ${errorText || response.statusText}`
      );
      (error as any).status = response.status;
      throw error;
    }

    return response.json();
  } catch (error) {
    // Если это сетевая ошибка или CORS, пробрасываем дальше
    if (isNetworkError(error)) {
      const networkError = new Error('Network or CORS error');
      (networkError as any).isNetworkError = true;
      (networkError as any).originalError = error;
      throw networkError;
    }
    throw error;
  }
}

/**
 * ЗАПРОС 0: Авторизация по Telegram ID
 * 
 * POST /webhook-test/auth
 * 
 * @param request - Данные авторизации (telegramId, initData)
 * @returns Ответ авторизации с playerId и токеном
 */
export async function authenticate(
  request: AuthRequest
): Promise<AuthResponse> {
  return await fetchAPI<AuthResponse>('/auth', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * ЗАПРОС 1: Получение справочных данных игры
 * 
 * GET /webhook-test/reference-data
 * 
 * @returns Справочные данные (города, объекты, кредиты, события и т.д.)
 */
export async function fetchReferenceData(): Promise<ReferenceDataPayload> {
  return await fetchAPI<ReferenceDataPayload>('/reference-data', {
    method: 'GET',
  });
}

/**
 * ЗАПРОС 2: Получение полного снапшота состояния игрока
 * 
 * GET /webhook-test/player-snapshot
 * 
 * @param telegramId - ID пользователя из Telegram (передаётся как query параметр или header)
 * @returns Полный снапшот состояния игрока
 */
export async function fetchPlayerSnapshot(
  telegramId: number
): Promise<ServerSyncState> {
  return await fetchAPI<ServerSyncState>(
    `/player-snapshot?telegramId=${telegramId}`,
    {
      method: 'GET',
    }
  );
}

/**
 * ЗАПРОС 3: Сохранение состояния игры на сервере
 * 
 * POST /webhook-test/player-snapshot
 * 
 * @param telegramId - ID пользователя из Telegram
 * @param snapshot - Основное состояние (player, market, events)
 * @param extras - Дополнительные данные (миссии, достижения, доступные объекты)
 */
export async function persistPlayerSnapshot(
  telegramId: number,
  snapshot: SyncState,
  extras: Partial<
    Pick<ServerSyncState, 'missions' | 'achievements' | 'availableProperties'>
  > = {}
): Promise<void> {
  const payload = {
    telegramId,
    ...snapshot,
    ...extras,
  };

  await fetchAPI<void>('/player-snapshot', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

