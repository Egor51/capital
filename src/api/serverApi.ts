/**
 * МОДУЛЬ: Server API Router
 * 
 * НАЗНАЧЕНИЕ:
 * Единая точка входа для API запросов.
 * Позволяет переключаться между мок-сервером и реальным API.
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * - В development можно использовать мок-сервер
 * - В production используется реальный API
 * - Переключение через переменную окружения или константу
 */

import { AuthRequest, AuthResponse } from '../types/auth';
import { ServerSyncState, SyncState } from '../types/sync';
import { ReferenceDataPayload } from './mockServer';

// Переключение между мок-сервером и реальным API
// true = реальный API с fallback на мок, false = только мок-сервер
// Можно переключить на false для использования только мок-сервера
const USE_REAL_API = true; // По умолчанию используем реальный API с fallback

// Импортируем функции из обоих модулей
import * as mockServer from './mockServer';
import * as realServer from './realServer';

/**
 * Проверяет, является ли ошибка сетевой/CORS ошибкой
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('Network or CORS error') ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('Load failed') ||
      (error as any).isNetworkError === true
    );
  }
  return false;
}

/**
 * Обёртка с автоматическим fallback на мок-сервер при сетевых ошибках
 */
async function withFallback<T>(
  realApiCall: () => Promise<T>,
  mockApiCall: () => Promise<T>,
  operationName: string
): Promise<T> {
  if (!USE_REAL_API) {
    return mockApiCall();
  }

  try {
    return await realApiCall();
  } catch (error) {
    if (isNetworkError(error)) {
      console.warn(
        `⚠️ Сетевая ошибка при ${operationName}, переключаемся на мок-сервер`,
        error
      );
      return mockApiCall();
    }
    // Если это не сетевая ошибка, пробрасываем дальше
    throw error;
  }
}

/**
 * Авторизация по Telegram ID
 */
export async function authenticate(
  request: AuthRequest
): Promise<AuthResponse> {
  return withFallback(
    () => realServer.authenticate(request),
    () => mockServer.authenticate(request),
    'авторизации'
  );
}

/**
 * Получение справочных данных игры
 */
export async function fetchReferenceData(): Promise<ReferenceDataPayload> {
  return withFallback(
    () => realServer.fetchReferenceData(),
    () => mockServer.fetchReferenceData(),
    'загрузке справочных данных'
  );
}

/**
 * Получение полного снапшота состояния игрока
 */
export async function fetchPlayerSnapshot(
  telegramId: number
): Promise<ServerSyncState> {
  return withFallback(
    () => realServer.fetchPlayerSnapshot(telegramId),
    () => mockServer.fetchPlayerSnapshot(telegramId),
    'загрузке снапшота игрока'
  );
}

/**
 * Сохранение состояния игры на сервере
 */
export async function persistPlayerSnapshot(
  telegramId: number,
  snapshot: SyncState,
  extras: Partial<
    Pick<ServerSyncState, 'missions' | 'achievements' | 'availableProperties'>
  > = {}
): Promise<void> {
  return withFallback(
    () => realServer.persistPlayerSnapshot(telegramId, snapshot, extras),
    () => mockServer.persistPlayerSnapshot(telegramId, snapshot, extras),
    'сохранении снапшота игрока'
  );
}

