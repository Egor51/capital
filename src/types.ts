export type District = "Центр" | "Спальный район" | "Возле порта" | "Отдалённый район";
export type PropertyType = "Квартира" | "Студия" | "Коммерция" | "Комната";
export type PropertyCondition = "убитая" | "требует ремонта" | "нормальная" | "после ремонта";
export type PropertyStrategy = "none" | "hold" | "rent" | "flip";
export type LoanType = "ипотека" | "залог" | "потребкредит";
export type MarketPhase = "рост" | "стабильность" | "кризис";
export type Difficulty = "easy" | "normal" | "hard";

// Город
export interface City {
  id: string;
  name: string;
  districtModifiers: Record<District, {
    priceMultiplier: number;
    rentMultiplier: number;
  }>;
  basePriceIndex: number;
  baseRentIndex: number;
}

// Конфигурация таймеров (в миллисекундах)
export interface GameTimers {
  rentIntervalMs: number;        // Интервал начисления аренды (по умолчанию 1 минута = 60000)
  loanPaymentIntervalMs: number;  // Интервал платежей по кредитам (по умолчанию 1 минута = 60000)
  renovationCheckIntervalMs: number; // Интервал проверки ремонта (по умолчанию 1 секунда = 1000)
  marketUpdateIntervalMs: number;   // Интервал обновления рынка (по умолчанию 1 минута = 60000)
}

export interface Property {
  id: string;
  cityId: string;              // ID города
  name: string;
  district: District;
  type: PropertyType;
  purchasePrice: number;        // Цена покупки (неизменна)
  currentValue: number;        // Текущая серверная оценка
  baseRent: number;            // Базовая аренда (переименовано из baseMonthlyRent)
  condition: PropertyCondition;
  strategy: PropertyStrategy;
  monthlyExpenses: number;
  loanId?: string;             // ID кредита (ипотека или залог)

  // Таймеры реального времени
  rentIntervalMs: number;     // Интервал начисления аренды
  nextRentAt: number | null;   // Timestamp следующего начисления аренды
  isUnderRenovation: boolean;
  renovationStartsAt?: number | null; // Timestamp начала ремонта (для прогресса)
  renovationEndsAt: number | null; // Timestamp завершения ремонта

  salePrice?: number;          // Цена, по которой выставлен на продажу (для flip)
}

export interface Loan {
  id: string;
  playerId: string;            // ID игрока
  propertyId?: string;         // ID объекта (если залог/ипотека)
  principal: number;           // Первоначальная сумма
  remainingPrincipal: number; // Остаток по кредиту
  annualRate: number;         // Годовая процентная ставка
  monthlyPayment: number;      // Ежемесячный платёж
  type: LoanType;

  // Таймеры реального времени
  paymentIntervalMs: number;  // Интервал платежей (по умолчанию 1 минута = 60000)
  nextPaymentAt: number;      // Timestamp следующего платежа
}

export interface MarketEvent {
  id: string;
  cityId: string;             // ID города
  name: string;
  description: string;

  // Реальное время вместо месяцев
  startsAt: number;         // Timestamp начала события
  endsAt: number;            // Timestamp окончания события

  // Модификаторы (в процентах)
  priceIndexModifier: number;    // Изменение индекса цен (%)
  rentIndexModifier: number;     // Изменение индекса аренды (%)
  vacancyModifier: number;        // Изменение простоя (%)
}

export interface MarketState {
  cityId: string;            // ID города
  phase: MarketPhase;        // Переименовано из currentPhase
  priceIndex: number;        // Множитель цен (0.7—1.3)
  rentIndex: number;         // Множитель аренды (0.8—1.2)
  vacancyRate: number;       // Вероятность простоя (0.02—0.15)
  activeEvents: MarketEvent[];
  lastUpdatedAt: number;     // Timestamp последнего обновления
}

export interface Player {
  id: string;
  telegramId?: number;      // ID пользователя из Telegram (для авторизации)
  name: string;
  cash: number;              // Свободные деньги (₽)
  softCurrency?: number;     // MRC (если Web3)
  hardCurrency?: number;     // MURT (если Web3)
  netWorth: number;
  loans: Loan[];
  properties: Property[];
  cityId: string;           // Текущий город
  difficulty: Difficulty;

  // Новая система геймификации
  experience: number;
  level: number;
  stats: {
    totalSales: number;
    totalRentIncome: number;
    totalRenovations: number;
    propertiesOwned: number;
  };

  // Timestamps для синхронизации
  lastSyncedAt: number;     // Timestamp последней синхронизации с сервером
  createdAt: number;        // Timestamp создания игрока
  currentMonth: number;     // Текущий игровой месяц (для статистики)
  totalMonths: number;      // Всего месяцев в игре
}

export interface GameEvent {
  id: string;
  timestamp?: number;        // Timestamp события (опционально для обратной совместимости)
  message: string;
  type: "info" | "success" | "warning" | "error";
  month?: number;            // Игровой месяц события (опционально)
}

export interface LoanPreset {
  baseInterestRate: number;
  maxLtv: number;
  description: string;
}

// Миссии и достижения
export type MissionType = 'portfolio_value' | 'monthly_rent' | 'districts' | 'properties_count';
export type AchievementType = 'novice' | 'rent_king' | 'flip_master' | 'port_magnate' | 'first_property' | 'millionaire';

export interface Mission {
  id: string;
  type: MissionType;
  title: string;
  description: string;
  target: number;
  current: number;
  reward: number; // Опыт за выполнение
  completed: boolean;
  completedAt?: number; // Месяц выполнения
}

export interface Achievement {
  id: string;
  type: AchievementType;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number; // Месяц разблокировки
}

// Система уровней
export interface PlayerLevel {
  level: number;
  experience: number;
  experienceToNext: number;
  title: string;
}

// Риски на объектах
export type PropertyRiskType = 'leak' | 'tenant_left' | 'utility_breakdown' | 'flooding' | 'tax_audit' | 'fire';

export interface PropertyRisk {
  id: string;
  propertyId: string;
  type: PropertyRiskType;
  name: string;
  description: string;
  cost: number; // Стоимость устранения
  impact: {
    valueChange?: number; // Изменение стоимости
    requiresRenovation?: boolean;
    rentPeriodsWithoutIncome?: number; // Количество периодов без аренды
  };
  resolved: boolean;
  timestamp?: number;         // Timestamp возникновения риска (опционально для обратной совместимости)
  month?: number;             // Игровой месяц возникновения (опционально)
  actionTaken?: 'fixed' | 'ignored' | 'delayed';
}

// Торг при покупке
export interface NegotiationResult {
  success: boolean;
  finalPrice: number;
  message: string;
}

// Расширенные рыночные события
export type ExtendedMarketEventType =
  | 'key_rate_change'
  | 'new_construction'
  | 'port_expansion'
  | 'anomalous_winter'
  | 'rental_law'
  | 'repair_peak'
  | 'tourist_season'
  | 'crisis'
  | 'mall_opening';

export interface ExtendedMarketEvent extends MarketEvent {
  eventType: ExtendedMarketEventType;
  affectsDistricts?: District[];
  affectsPropertyTypes?: PropertyType[];
  mortgageRateChange?: number; // Изменение ставки по ипотеке (%)
  repairCostMultiplier?: number; // Множитель стоимости ремонта
}

