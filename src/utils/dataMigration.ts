import { Player, Property, Loan, MarketState, GameEvent } from '../types';
import { DEFAULT_TIMERS } from './realtimeLogic';
import { getDefaultCity } from '../data/cities';

/**
 * Мигрирует старые данные игрока в новый формат с реальным временем
 */
export function migratePlayerToRealtime(player: Player): Player {
  const now = Date.now();
  const defaultCity = getDefaultCity();
  
  return {
    ...player,
    cityId: player.cityId || defaultCity.id,
    lastSyncedAt: player.lastSyncedAt || now,
    createdAt: player.createdAt || now,
    properties: player.properties.map(prop => migratePropertyToRealtime(prop, defaultCity.id)),
    loans: player.loans.map(loan => migrateLoanToRealtime(loan, player.id, now))
  };
}

/**
 * Мигрирует объект недвижимости в новый формат
 */
export function migratePropertyToRealtime(property: Property, cityId: string): Property {
  const now = Date.now();
  
  return {
    ...property,
    cityId: property.cityId || cityId,
    baseRent: property.baseRent || (property as any).baseMonthlyRent || 0,
    rentIntervalMs: property.rentIntervalMs || DEFAULT_TIMERS.rentIntervalMs,
    nextRentAt: property.nextRentAt || (property.strategy === 'rent' ? now + DEFAULT_TIMERS.rentIntervalMs : null),
    isUnderRenovation: property.isUnderRenovation || false,
    renovationEndsAt: property.renovationEndsAt || null,
    loanId: property.loanId || property.mortgageId,
    strategy: property.strategy === null ? 'none' : property.strategy,
    salePrice: property.salePrice || (property.isForSale ? property.currentValue : undefined)
  };
}

/**
 * Мигрирует кредит в новый формат
 */
export function migrateLoanToRealtime(loan: Loan, playerId: string, now: number): Loan {
  return {
    ...loan,
    playerId: loan.playerId || playerId,
    annualRate: loan.annualRate || loan.interestRate || 12.5,
    paymentIntervalMs: loan.paymentIntervalMs || DEFAULT_TIMERS.loanPaymentIntervalMs,
    nextPaymentAt: loan.nextPaymentAt || now + DEFAULT_TIMERS.loanPaymentIntervalMs
  };
}

/**
 * Мигрирует состояние рынка в новый формат
 */
export function migrateMarketToRealtime(market: MarketState, cityId: string): MarketState {
  const now = Date.now();
  
  return {
    ...market,
    cityId: market.cityId || cityId,
    phase: market.phase || market.currentPhase || 'стабильность',
    lastUpdatedAt: market.lastUpdatedAt || now,
    activeEvents: market.activeEvents.map(event => migrateEventToRealtime(event, cityId))
  };
}

/**
 * Мигрирует событие рынка в новый формат
 */
export function migrateEventToRealtime(event: any, cityId: string): any {
  const now = Date.now();
  
  // Если событие уже в новом формате
  if (event.startsAt && event.endsAt) {
    return {
      ...event,
      cityId: event.cityId || cityId,
      priceIndexModifier: event.priceIndexModifier || event.priceImpactPercent || 0,
      rentIndexModifier: event.rentIndexModifier || event.rentImpactPercent || 0,
      vacancyModifier: event.vacancyModifier || event.vacancyImpactPercent || 0
    };
  }
  
  // Миграция из старого формата (месяцы)
  if (event.monthImpactStart !== undefined) {
    const startsAt = now + (event.monthImpactStart * 30 * 24 * 60 * 60 * 1000);
    const endsAt = startsAt + (event.durationMonths * 30 * 24 * 60 * 60 * 1000);
    
    return {
      ...event,
      cityId: event.cityId || cityId,
      startsAt,
      endsAt,
      priceIndexModifier: event.priceIndexModifier || event.priceImpactPercent || 0,
      rentIndexModifier: event.rentIndexModifier || event.rentImpactPercent || 0,
      vacancyModifier: event.vacancyModifier || event.vacancyImpactPercent || 0
    };
  }
  
  return event;
}

/**
 * Мигрирует игровое событие в новый формат
 */
export function migrateGameEventToRealtime(event: GameEvent): GameEvent {
  const now = Date.now();
  
  return {
    ...event,
    timestamp: event.timestamp || (event.month ? now - (event.month * 30 * 24 * 60 * 60 * 1000) : now)
  };
}

