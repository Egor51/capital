/**
 * Утилиты для работы с Telegram Mini Apps API
 */

import { TelegramUser, TelegramAuthData } from '../types/auth';

/**
 * Проверяет, запущено ли приложение в Telegram Mini App
 */
export function isTelegramWebApp(): boolean {
  return typeof window !== 'undefined' && 
         typeof (window as any).Telegram !== 'undefined' &&
         typeof (window as any).Telegram.WebApp !== 'undefined';
}

/**
 * Получает экземпляр Telegram WebApp
 */
export function getTelegramWebApp(): any {
  if (!isTelegramWebApp()) {
    return null;
  }
  return (window as any).Telegram.WebApp;
}

/**
 * Получает данные пользователя из Telegram WebApp
 * 
 * @returns Данные пользователя или null, если не в Telegram
 */
export function getTelegramUser(): TelegramUser | null {
  const webApp = getTelegramWebApp();
  if (!webApp) {
    return null;
  }

  try {
    // Инициализируем WebApp
    webApp.ready();
    
    // Получаем данные пользователя
    const user = webApp.initDataUnsafe?.user;
    
    if (!user || !user.id) {
      return null;
    }

    return {
      id: user.id,
      first_name: user.first_name || 'Игрок',
      last_name: user.last_name,
      username: user.username,
      language_code: user.language_code,
      is_premium: user.is_premium || false,
      photo_url: user.photo_url
    };
  } catch (error) {
    console.error('Ошибка получения данных пользователя Telegram:', error);
    return null;
  }
}

/**
 * Получает полную строку initData для отправки на сервер
 * 
 * @returns Строка initData или null
 */
export function getTelegramInitData(): string | null {
  const webApp = getTelegramWebApp();
  if (!webApp) {
    return null;
  }

  try {
    return webApp.initData || null;
  } catch (error) {
    console.error('Ошибка получения initData:', error);
    return null;
  }
}

/**
 * Получает все данные авторизации из Telegram
 * 
 * @returns Данные авторизации или null
 */
export function getTelegramAuthData(): TelegramAuthData | null {
  const user = getTelegramUser();
  
  if (!user) {
    return null;
  }

  const webApp = getTelegramWebApp();
  
  return {
    user,
    auth_date: webApp?.initDataUnsafe?.auth_date || Date.now(),
    hash: webApp?.initDataUnsafe?.hash || '',
    query_id: webApp?.initDataUnsafe?.query_id
  };
}

/**
 * Расширяет интерфейс WebApp для TypeScript
 */
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            is_premium?: boolean;
            photo_url?: string;
          };
          auth_date?: number;
          hash?: string;
          query_id?: string;
        };
        version: string;
        platform: string;
        colorScheme: 'light' | 'dark';
        themeParams: any;
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        headerColor: string;
        backgroundColor: string;
        BackButton: any;
        MainButton: any;
        HapticFeedback: any;
        CloudStorage: any;
        BiometricManager: any;
      };
    };
  }
}

