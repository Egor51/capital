/**
 * Типы для авторизации через Telegram Mini Apps
 */

/**
 * Данные пользователя из Telegram WebApp API
 */
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

/**
 * Данные авторизации из Telegram WebApp
 */
export interface TelegramAuthData {
  user: TelegramUser;
  auth_date: number;
  hash: string;
  query_id?: string;
}

/**
 * Запрос на авторизацию
 */
export interface AuthRequest {
  telegramId: number;
  initData?: string; // Полная строка initData для валидации на сервере
}

/**
 * Ответ авторизации
 */
export interface AuthResponse {
  success: boolean;
  playerId?: string;
  isNewPlayer?: boolean;
  message?: string;
  token?: string; // JWT токен для последующих запросов (в реальном API)
}

/**
 * Состояние авторизации
 */
export interface AuthState {
  isAuthenticated: boolean;
  telegramId: number | null;
  playerId: string | null;
  userName: string | null;
}


