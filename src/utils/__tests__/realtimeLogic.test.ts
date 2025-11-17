import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { processRealtimeTick, DEFAULT_TIMERS } from '../realtimeLogic';
import { Player, MarketState, Property } from '../../types';

const basePlayer = (): Player => ({
  id: 'player-1',
  name: 'Игрок',
  cash: 1_000_000,
  netWorth: 1_000_000,
  loans: [],
  properties: [],
  cityId: 'murmansk',
  difficulty: 'normal',
  experience: 0,
  level: 1,
  stats: {
    totalSales: 0,
    totalRentIncome: 0,
    totalRenovations: 0,
    propertiesOwned: 0
  },
  lastSyncedAt: Date.now(),
  createdAt: Date.now(),
  currentMonth: 0,
  totalMonths: 0
});

const baseMarket = (): MarketState => ({
  cityId: 'murmansk',
  phase: 'стабильность',
  priceIndex: 1,
  rentIndex: 1,
  vacancyRate: 0.05,
  activeEvents: [],
  lastUpdatedAt: Date.now()
});

describe('processRealtimeTick', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('начисляет аренду и переносит таймер следующего платежа', () => {
    const rentProperty: Property = {
      id: 'prop-1',
      cityId: 'murmansk',
      name: 'Тестовый объект',
      district: 'Центр',
      type: 'Квартира',
      purchasePrice: 1_000_000,
      currentValue: 1_000_000,
      baseRent: 25_000,
      condition: 'нормальная',
      strategy: 'rent',
      monthlyExpenses: 0,
      loanId: undefined,
      rentIntervalMs: DEFAULT_TIMERS.rentIntervalMs,
      nextRentAt: Date.now(),
      isUnderRenovation: false,
      renovationStartsAt: null,
      renovationEndsAt: null
    };

    const player = {
      ...basePlayer(),
      properties: [rentProperty]
    };

    const result = processRealtimeTick(player, baseMarket(), DEFAULT_TIMERS);
    const updatedProperty = result.player.properties[0];

    expect(result.player.cash).toBe(player.cash + rentProperty.baseRent);
    expect(result.player.stats.totalRentIncome).toBe(rentProperty.baseRent);
    expect(updatedProperty.nextRentAt).toBe(Date.now() + DEFAULT_TIMERS.rentIntervalMs);
    expect(result.events.some(event => event.message.includes('Аренда'))).toBe(true);
  });

  it('списывает платеж по кредиту и удаляет погашенный займ', () => {
    const playerWithLoan: Player = {
      ...basePlayer(),
      loans: [{
        id: 'loan-1',
        playerId: 'player-1',
        propertyId: undefined,
        principal: 500_000,
        remainingPrincipal: 400,
        annualRate: 12,
        monthlyPayment: 500,
        type: 'ипотека',
        paymentIntervalMs: DEFAULT_TIMERS.loanPaymentIntervalMs,
        nextPaymentAt: Date.now()
      }],
      properties: []
    };

    const result = processRealtimeTick(playerWithLoan, baseMarket(), DEFAULT_TIMERS);

    expect(result.player.cash).toBe(playerWithLoan.cash - 500);
    expect(result.player.loans.length).toBe(0);
    expect(result.events.some(event => event.id.includes('loan-paid'))).toBe(true);
  });
});

