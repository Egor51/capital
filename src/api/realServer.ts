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
 * Извлекает данные из ответа сервера
 * Сервер может возвращать данные как массив с одним элементом или как объект
 * n8n может возвращать данные в формате { success: true, ...data } или { success: false, message: ... }
 * 
 * ВАЖНО: Для AuthResponse сохраняем поле success, так как оно нужно клиенту
 */
function extractData<T>(response: T | T[] | { success: boolean; [key: string]: any }): T {
  // Если это массив
  if (Array.isArray(response)) {
    if (response.length === 0) {
      throw new Error('Server returned empty array');
    }
    const firstItem = response[0] as any;
    // Проверяем, не обёрнут ли ответ в { success, ... }
    if (firstItem && typeof firstItem === 'object' && 'success' in firstItem) {
      if (!firstItem.success) {
        throw new Error(firstItem.message || 'Server returned error');
      }
      // Для AuthResponse возвращаем весь объект (включая success)
      // Для других типов извлекаем данные без success
      if ('playerId' in firstItem || 'isNewPlayer' in firstItem) {
        // Это AuthResponse - возвращаем как есть
        return firstItem as T;
      }
      // Для других типов извлекаем данные
      const { success, message, ...data } = firstItem;
      return data as T;
    }
    return firstItem;
  }
  
  // Если это объект с полем success (ответ от n8n)
  const responseObj = response as any;
  if (responseObj && typeof responseObj === 'object' && 'success' in responseObj) {
    if (!responseObj.success) {
      throw new Error(responseObj.message || 'Server returned error');
    }
    // Для AuthResponse возвращаем весь объект (включая success)
    // Для других типов извлекаем данные без success
    if ('playerId' in responseObj || 'isNewPlayer' in responseObj) {
      // Это AuthResponse - возвращаем как есть
      return responseObj as T;
    }
    // Для других типов извлекаем данные
    const { success, message, ...data } = responseObj;
    return data as T;
  }
  
  return response as T;
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

    const data = await response.json();
    // Логируем для отладки (можно убрать в продакшене)
    if (endpoint.includes('player-snapshot') || endpoint.includes('auth')) {
      console.log(`[API] ${endpoint} - Raw response:`, data);
    }
    // Извлекаем данные, если ответ пришёл в виде массива или обёрнут в { success, ... }
    const extracted = extractData<T>(data);
    if (endpoint.includes('player-snapshot') || endpoint.includes('auth')) {
      console.log(`[API] ${endpoint} - Extracted data:`, extracted);
    }
    return extracted;
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
  try {
    const response = await fetchAPI<AuthResponse>('/auth', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    
    // Логируем для отладки
    console.log('[API] Auth response:', response);
    
    // Проверяем, что ответ содержит success
    if (response && typeof response === 'object' && 'success' in response) {
      return response as AuthResponse;
    }
    
    // Если success нет, но есть другие поля, создаём ответ
    if (response && typeof response === 'object') {
      return {
        success: true,
        ...(response as any)
      } as AuthResponse;
    }
    
    throw new Error('Invalid auth response format');
  } catch (error) {
    console.error('[API] Auth error:', error);
    throw error;
  }
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

