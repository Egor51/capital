import { Property, MarketEvent, LoanPreset } from '../types';
const RENT_INTERVAL_MS = 60000;

export const initialMarketProperties: Property[] = [
  {
    id: "p1",
    name: "Однушка в центре",
    cityId: "murmansk",
    district: "Центр",
    type: "Квартира",
    purchasePrice: 4200000,
    currentValue: 4200000,
    baseRent: 32000,
    condition: "нормальная",
    strategy: "none",
    monthlyExpenses: 5000,
    rentIntervalMs: RENT_INTERVAL_MS,
    nextRentAt: null,
    isUnderRenovation: false,
    renovationEndsAt: null
  },
  {
    id: "p2",
    name: "Студия в спальном районе",
    cityId: "murmansk",
    district: "Спальный район",
    type: "Студия",
    purchasePrice: 2800000,
    currentValue: 2800000,
    baseRent: 23000,
    condition: "требует ремонта",
    strategy: "none",
    monthlyExpenses: 4000,
    rentIntervalMs: RENT_INTERVAL_MS,
    nextRentAt: null,
    isUnderRenovation: false,
    renovationEndsAt: null
  },
  {
    id: "p3",
    name: "Коммерция возле порта",
    cityId: "murmansk",
    district: "Возле порта",
    type: "Коммерция",
    purchasePrice: 5500000,
    currentValue: 5500000,
    baseRent: 60000,
    condition: "нормальная",
    strategy: "none",
    monthlyExpenses: 12000,
    rentIntervalMs: RENT_INTERVAL_MS,
    nextRentAt: null,
    isUnderRenovation: false,
    renovationEndsAt: null
  },
  {
    id: "p4",
    name: "Комната в хрущёвке",
    cityId: "murmansk",
    district: "Спальный район",
    type: "Комната",
    purchasePrice: 1200000,
    currentValue: 1200000,
    baseRent: 14000,
    condition: "убитая",
    strategy: "none",
    monthlyExpenses: 2500,
    rentIntervalMs: RENT_INTERVAL_MS,
    nextRentAt: null,
    isUnderRenovation: false,
    renovationEndsAt: null
  },
  {
    id: "p5",
    name: "Студия у набережной",
    cityId: "murmansk",
    district: "Центр",
    type: "Студия",
    purchasePrice: 3500000,
    currentValue: 3500000,
    baseRent: 29000,
    condition: "после ремонта",
    strategy: "none",
    monthlyExpenses: 4500,
    rentIntervalMs: RENT_INTERVAL_MS,
    nextRentAt: null,
    isUnderRenovation: false,
    renovationEndsAt: null
  }
];

// Создаем события с timestamps (для примера используем текущее время + смещение)
const now = Date.now();
const ONE_MINUTE = 60000; // 1 минута = 1 игровой месяц

export const mockMarketEvents: MarketEvent[] = [
  {
    id: "e1",
    cityId: "murmansk",
    name: "Зимний туристический сезон",
    description: "Всплеск поездок за северным сиянием: растут ставки аренды и загрузка.",
    startsAt: now + (2 * ONE_MINUTE), // Через 2 минуты
    endsAt: now + (6 * ONE_MINUTE),   // Длится 4 минуты
    priceIndexModifier: 0,
    rentIndexModifier: 15,
    vacancyModifier: -10
  },
  {
    id: "e2",
    cityId: "murmansk",
    name: "Лёгкий кризис",
    description: "Небольшой экономический спад, цены немного падают, аренда проседает.",
    startsAt: now + (8 * ONE_MINUTE),
    endsAt: now + (14 * ONE_MINUTE),
    priceIndexModifier: -10,
    rentIndexModifier: -5,
    vacancyModifier: 10
  },
  {
    id: "e3",
    cityId: "murmansk",
    name: "Запуск нового ТЦ",
    description: "В одном из спальных районов открывается новый ТЦ, что подтягивает спрос.",
    startsAt: now + (12 * ONE_MINUTE),
    endsAt: now + (20 * ONE_MINUTE),
    priceIndexModifier: 5,
    rentIndexModifier: 5,
    vacancyModifier: -5
  }
];

export const loanPresetsByDifficulty: Record<string, LoanPreset> = {
  easy: {
    baseInterestRate: 9.5,
    maxLtv: 0.8,
    description: "Мягкий рынок кредитования, низкие ставки."
  },
  normal: {
    baseInterestRate: 12.5,
    maxLtv: 0.75,
    description: "Обычные условия кредитования."
  },
  hard: {
    baseInterestRate: 15.5,
    maxLtv: 0.7,
    description: "Жёсткие условия: высокие ставки, меньше доступный кредит."
  }
};

export const startingCashByDifficulty: Record<string, number> = {
  easy: 2000000,
  normal: 1500000,
  hard: 1000000
};

