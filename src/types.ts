export type District = "Центр" | "Спальный район" | "Возле порта" | "Отдалённый район";
export type PropertyType = "Квартира" | "Студия" | "Коммерция" | "Комната";
export type PropertyCondition = "убитая" | "требует ремонта" | "нормальная" | "после ремонта";
export type PropertyStrategy = "hold" | "rent" | "flip" | null;
export type LoanType = "ипотека" | "залог" | "потребкредит";
export type MarketPhase = "рост" | "стабильность" | "кризис";
export type Difficulty = "easy" | "normal" | "hard";

export interface Property {
  id: string;
  name: string;
  district: District;
  type: PropertyType;
  purchasePrice: number;
  currentValue: number;
  baseMonthlyRent: number;
  condition: PropertyCondition;
  strategy: PropertyStrategy;
  monthlyExpenses: number;
  mortgageId?: string;
  monthsOwned: number;
  isForSale: boolean;
  isUnderRenovation?: boolean;
  renovationMonthsLeft?: number;
}

export interface Loan {
  id: string;
  propertyId?: string;
  principal: number;
  interestRate: number;
  monthlyPayment: number;
  remainingTermMonths: number;
  type: LoanType;
  remainingPrincipal: number;
}

export interface MarketEvent {
  id: string;
  name: string;
  description: string;
  monthImpactStart: number;
  durationMonths: number;
  priceImpactPercent: number;
  rentImpactPercent: number;
  vacancyImpactPercent: number;
}

export interface MarketState {
  currentPhase: MarketPhase;
  priceIndex: number;
  rentIndex: number;
  vacancyRate: number;
  activeEvents: MarketEvent[];
}

export interface Player {
  id: string;
  name: string;
  cash: number;
  netWorth: number;
  loans: Loan[];
  properties: Property[];
  currentMonth: number;
  difficulty: Difficulty;
  totalMonths: number;
  // Новая система геймификации
  experience: number;
  level: number;
  stats: {
    totalSales: number;
    totalRentIncome: number;
    totalRenovations: number;
    propertiesOwned: number;
  };
}

export interface GameEvent {
  id: string;
  month: number;
  message: string;
  type: "info" | "success" | "warning" | "error";
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
    monthsWithoutRent?: number;
  };
  resolved: boolean;
  month: number;
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
  mortgageRateChange?: number; // Изменение ставки по ипотеке
  repairCostMultiplier?: number; // Множитель стоимости ремонта
}

