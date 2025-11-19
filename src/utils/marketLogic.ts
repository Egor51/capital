import { MarketState, MarketPhase } from '../types';
import { mockMarketEvents } from '../data/mockData';
import { extendedMarketEvents } from '../data/extendedEvents';

/**
 * Инициализирует начальное состояние рынка
 */
export function initializeMarket(cityId: string = 'murmansk'): MarketState {
  const now = Date.now();
  return {
    cityId,
    phase: "стабильность",
    priceIndex: 1.0,
    rentIndex: 1.0,
    vacancyRate: 0.05, // 5% базовый простой
    activeEvents: [],
    lastUpdatedAt: now,
    // Устаревшие поля для обратной совместимости

  };
}

/**
 * Обновляет рыночную фазу (может измениться случайно)
 */
export function updateMarketPhase(
  currentPhase: MarketPhase
): MarketPhase {
  // Вероятность смены фазы: 5% каждый месяц
  if (Math.random() < 0.05) {
    const phases: MarketPhase[] = ["рост", "стабильность", "кризис"];
    const randomPhase = phases[Math.floor(Math.random() * phases.length)];
    return randomPhase;
  }
  return currentPhase;
}

/**
 * Обновляет индексы рынка в зависимости от фазы
 */
export function updateMarketIndexes(
  market: MarketState
): MarketState {
  let { priceIndex, rentIndex, vacancyRate } = market;

  // Обновление индексов в зависимости от фазы
  switch (market.phase) {
    case "рост":
      priceIndex = Math.min(priceIndex * 1.005, 1.3); // Медленный рост до 130%
      rentIndex = Math.min(rentIndex * 1.003, 1.2);
      vacancyRate = Math.max(vacancyRate * 0.99, 0.02); // Снижение простоя
      break;
    case "стабильность":
      priceIndex = priceIndex * 0.999 + 1.0 * 0.001; // Стремление к 1.0
      rentIndex = rentIndex * 0.999 + 1.0 * 0.001;
      vacancyRate = vacancyRate * 0.99 + 0.05 * 0.01; // Стремление к 5%
      break;
    case "кризис":
      priceIndex = Math.max(priceIndex * 0.995, 0.7); // Падение до 70%
      rentIndex = Math.max(rentIndex * 0.997, 0.8);
      vacancyRate = Math.min(vacancyRate * 1.02, 0.15); // Увеличение простоя до 15%
      break;
  }

  return {
    ...market,
    priceIndex,
    rentIndex,
    vacancyRate
  };
}

/**
 * Проверяет и активирует рыночные события (реальное время)
 */
export function checkAndActivateEvents(
  market: MarketState
): MarketState {
  const now = Date.now();
  const activeEvents = [...market.activeEvents];

  // Удаляем завершившиеся события (по timestamp)
  const stillActive = activeEvents.filter(event => {
    if (event.endsAt) {
      return now < event.endsAt;
    }
    return true;
  });

  // Проверяем новые события из базового списка (по timestamp)
  mockMarketEvents.forEach(event => {
    if (event.startsAt && now >= event.startsAt && now < event.endsAt) {
      // Проверяем, не добавлено ли уже это событие
      if (!stillActive.find(e => e.id === event.id)) {
        stillActive.push(event);
      }
    }
  });

  // Проверяем расширенные события (по timestamp)
  extendedMarketEvents.forEach(event => {
    if (event.startsAt && now >= event.startsAt && now < event.endsAt) {
      if (!stillActive.find(e => e.id === event.id)) {
        stillActive.push(event);
      }
    }
  });

  return {
    ...market,
    activeEvents: stillActive
  };
}

/**
 * Получает описание текущей фазы рынка
 */
export function getMarketPhaseDescription(phase: MarketPhase): string {
  switch (phase) {
    case "рост":
      return "Рынок растёт, цены и аренда увеличиваются";
    case "стабильность":
      return "Рынок стабилен, небольшие колебания";
    case "кризис":
      return "Кризис: цены падают, растёт простой";
    default:
      return "Неизвестная фаза";
  }
}

