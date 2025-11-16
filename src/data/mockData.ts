import { Property, MarketEvent, LoanPreset } from '../types';

export const initialMarketProperties: Property[] = [
  {
    id: "p1",
    name: "Однушка в центре",
    district: "Центр",
    type: "Квартира",
    purchasePrice: 4200000,
    currentValue: 4200000,
    baseMonthlyRent: 32000,
    condition: "нормальная",
    strategy: null,
    monthlyExpenses: 5000,
    monthsOwned: 0,
    isForSale: false
  },
  {
    id: "p2",
    name: "Студия в спальном районе",
    district: "Спальный район",
    type: "Студия",
    purchasePrice: 2800000,
    currentValue: 2800000,
    baseMonthlyRent: 23000,
    condition: "требует ремонта",
    strategy: null,
    monthlyExpenses: 4000,
    monthsOwned: 0,
    isForSale: false
  },
  {
    id: "p3",
    name: "Коммерция возле порта",
    district: "Возле порта",
    type: "Коммерция",
    purchasePrice: 5500000,
    currentValue: 5500000,
    baseMonthlyRent: 60000,
    condition: "нормальная",
    strategy: null,
    monthlyExpenses: 12000,
    monthsOwned: 0,
    isForSale: false
  },
  {
    id: "p4",
    name: "Комната в хрущёвке",
    district: "Спальный район",
    type: "Комната",
    purchasePrice: 1200000,
    currentValue: 1200000,
    baseMonthlyRent: 14000,
    condition: "убитая",
    strategy: null,
    monthlyExpenses: 2500,
    monthsOwned: 0,
    isForSale: false
  },
  {
    id: "p5",
    name: "Студия у набережной",
    district: "Центр",
    type: "Студия",
    purchasePrice: 3500000,
    currentValue: 3500000,
    baseMonthlyRent: 29000,
    condition: "после ремонта",
    strategy: null,
    monthlyExpenses: 4500,
    monthsOwned: 0,
    isForSale: false
  }
];

export const mockMarketEvents: MarketEvent[] = [
  {
    id: "e1",
    name: "Зимний туристический сезон",
    description: "Всплеск поездок за северным сиянием: растут ставки аренды и загрузка.",
    monthImpactStart: 2,
    durationMonths: 4,
    priceImpactPercent: 0,
    rentImpactPercent: 15,
    vacancyImpactPercent: -10
  },
  {
    id: "e2",
    name: "Лёгкий кризис",
    description: "Небольшой экономический спад, цены немного падают, аренда проседает.",
    monthImpactStart: 8,
    durationMonths: 6,
    priceImpactPercent: -10,
    rentImpactPercent: -5,
    vacancyImpactPercent: 10
  },
  {
    id: "e3",
    name: "Запуск нового ТЦ",
    description: "В одном из спальных районов открывается новый ТЦ, что подтягивает спрос.",
    monthImpactStart: 12,
    durationMonths: 8,
    priceImpactPercent: 5,
    rentImpactPercent: 5,
    vacancyImpactPercent: -5
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

