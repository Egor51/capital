import { cities } from '../data/cities';
import { achievements as initialAchievements, initialMissions } from '../data/missions';
import {
  initialMarketProperties,
  loanPresetsByDifficulty,
  mockMarketEvents,
  startingCashByDifficulty
} from '../data/mockData';
import { initializeMarket } from '../utils/marketLogic';
import { DEFAULT_TIMERS } from '../utils/realtimeLogic';
import { hydrateReferenceConfig } from './serverConfig';
import {
  City,
  Difficulty,
  GameEvent,
  LoanPreset,
  MarketEvent,
  MarketPhase,
  MarketState,
  Player,
  Property
} from '../types';
import { ServerSyncState, SyncState } from '../types/sync';

export interface ReferenceDataPayload {
  cities: City[];
  properties: Property[];
  districtModifiers: Array<{
    cityId: string;
    district: string;
    priceMultiplier: number;
    rentMultiplier: number;
  }>;
  loanPresets: Record<Difficulty, LoanPreset>;
  marketEvents: MarketEvent[];
  marketPhases: MarketPhase[];
  marketParameters: Pick<MarketState, 'priceIndex' | 'rentIndex' | 'vacancyRate'>;
  rentCoefficients: Record<string, number>;
  priceCoefficients: Record<string, number>;
  startingCash: Record<Difficulty, number>;
}

const GLOBAL_MARKET_PHASES: MarketPhase[] = ['рост', 'стабильность', 'кризис'];

const referenceData: ReferenceDataPayload = buildReferenceData();

hydrateReferenceConfig({
  loanPresets: referenceData.loanPresets,
  rentCoefficients: referenceData.rentCoefficients,
  priceCoefficients: referenceData.priceCoefficients,
  marketPhases: referenceData.marketPhases
});

let playerSnapshot: ServerSyncState | null = null;

export async function fetchReferenceData(): Promise<ReferenceDataPayload> {
  return simulateResponse(referenceData);
}

export async function fetchPlayerSnapshot(): Promise<ServerSyncState> {
  return simulateResponse(ensurePlayerSnapshot());
}

export async function persistPlayerSnapshot(
  snapshot: SyncState,
  extras: Partial<Pick<ServerSyncState, 'missions' | 'achievements' | 'availableProperties'>> = {}
): Promise<void> {
  const current = ensurePlayerSnapshot();
  playerSnapshot = {
    ...current,
    ...clone({
      player: snapshot.player,
      market: snapshot.market,
      events: snapshot.events,
      lastSyncedAt: snapshot.lastSyncedAt
    }),
    missions: extras.missions ? clone(extras.missions) : current.missions,
    achievements: extras.achievements ? clone(extras.achievements) : current.achievements,
    availableProperties: extras.availableProperties
      ? clone(extras.availableProperties)
      : current.availableProperties
  };

  await simulateResponse(undefined, 120);
}

function ensurePlayerSnapshot(): ServerSyncState {
  if (!playerSnapshot) {
    playerSnapshot = buildInitialSnapshot();
  }
  return playerSnapshot;
}

function buildReferenceData(): ReferenceDataPayload {
  const marketTemplate = initializeMarket();
  const districtModifiers = cities.flatMap(city =>
    Object.entries(city.districtModifiers).map(([district, modifiers]) => ({
      cityId: city.id,
      district,
      priceMultiplier: modifiers.priceMultiplier,
      rentMultiplier: modifiers.rentMultiplier
    }))
  );

  const rentCoefficients = districtModifiers.reduce<Record<string, number>>((acc, modifier) => {
    acc[`${modifier.cityId}:${modifier.district}:rent`] = modifier.rentMultiplier;
    return acc;
  }, {});

  const priceCoefficients = districtModifiers.reduce<Record<string, number>>((acc, modifier) => {
    acc[`${modifier.cityId}:${modifier.district}:price`] = modifier.priceMultiplier;
    return acc;
  }, {});

  return {
    cities: clone(cities),
    properties: clone(initialMarketProperties),
    districtModifiers,
    loanPresets: clone(loanPresetsByDifficulty),
    marketEvents: clone(mockMarketEvents),
    marketPhases: GLOBAL_MARKET_PHASES,
    marketParameters: {
      priceIndex: marketTemplate.priceIndex,
      rentIndex: marketTemplate.rentIndex,
      vacancyRate: marketTemplate.vacancyRate
    },
    rentCoefficients,
    priceCoefficients,
    startingCash: clone(startingCashByDifficulty)
  };
}

function buildInitialSnapshot(): ServerSyncState {
  const difficulty: Difficulty = 'normal';
  const player = createInitialPlayer(difficulty);
  const market = initializeMarket(player.cityId);
  const now = Date.now();

  const welcomeEvent: GameEvent = {
    id: `server-welcome-${now}`,
    timestamp: now,
    message: `Добро пожаловать! Сервер инициализировал сессию для ${player.name}.`,
    type: 'info'
  };

  return {
    player,
    market,
    events: [welcomeEvent],
    lastSyncedAt: now,
    missions: clone(initialMissions),
    achievements: clone(initialAchievements),
    availableProperties: clone(
      initialMarketProperties.map(property => ({
        ...property,
        rentIntervalMs: property.rentIntervalMs ?? DEFAULT_TIMERS.rentIntervalMs,
        nextRentAt: property.nextRentAt ?? null,
        renovationStartsAt: property.renovationStartsAt ?? null,
        renovationEndsAt: property.renovationEndsAt ?? null,
        isUnderRenovation: property.isUnderRenovation ?? false
      }))
    )
  };
}

function createInitialPlayer(difficulty: Difficulty): Player {
  const cash = startingCashByDifficulty[difficulty];
  const now = Date.now();

  return {
    id: 'player-1',
    name: 'Игрок',
    cash,
    netWorth: cash,
    loans: [],
    properties: [],
    cityId: 'murmansk',
    difficulty,
    experience: 0,
    level: 1,
    stats: {
      totalSales: 0,
      totalRentIncome: 0,
      totalRenovations: 0,
      propertiesOwned: 0
    },
    lastSyncedAt: now,
    createdAt: now,
    currentMonth: 0,
    totalMonths: 0
  };
}

function clone<T>(payload: T): T {
  if (payload === undefined || payload === null) {
    return payload;
  }
  return JSON.parse(JSON.stringify(payload));
}

function simulateResponse<T>(payload: T, latency = 250): Promise<T> {
  return new Promise(resolve => {
    setTimeout(() => resolve(clone(payload)), latency);
  });
}

