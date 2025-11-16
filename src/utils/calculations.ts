import { Loan, Property, MarketState } from '../types';

/**
 * Рассчитывает аннуитетный платёж по кредиту
 */
export function calculateAnnuityPayment(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  if (termMonths === 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / termMonths;
  
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);
  
  return Math.round(payment);
}

/**
 * Рассчитывает чистый капитал игрока
 */
export function calculateNetWorth(
  cash: number,
  properties: Property[],
  loans: Loan[]
): number {
  const totalPropertyValue = properties.reduce((sum, prop) => sum + prop.currentValue, 0);
  const totalDebt = loans.reduce((sum, loan) => sum + loan.remainingPrincipal, 0);
  return cash + totalPropertyValue - totalDebt;
}

/**
 * Рассчитывает доход от аренды с учётом рынка
 */
export function calculateRentIncome(
  property: Property,
  market: MarketState
): number {
  if (property.strategy !== "rent" || property.isUnderRenovation) {
    return 0;
  }

  // Базовая аренда с учётом рыночного индекса
  let rent = property.baseMonthlyRent * market.rentIndex;

  // Применяем влияние активных событий
  market.activeEvents.forEach(event => {
    rent *= (1 + event.rentImpactPercent / 100);
  });

  // Учитываем простой (вакансию)
  const vacancyChance = market.vacancyRate / 100;
  if (Math.random() < vacancyChance) {
    return 0; // Арендатор съехал
  }

  // Вычитаем расходы
  return Math.round(rent - property.monthlyExpenses);
}

/**
 * Обновляет стоимость объекта с учётом рыночной фазы
 */
export function updatePropertyValue(
  property: Property,
  market: MarketState
): number {
  let newValue = property.currentValue;

  // Базовое изменение в зависимости от фазы рынка
  const phaseMultiplier = market.currentPhase === "рост" ? 1.01 :
                         market.currentPhase === "кризис" ? 0.98 : 1.0;
  
  newValue *= phaseMultiplier;

  // Применяем влияние активных событий
  market.activeEvents.forEach(event => {
    newValue *= (1 + event.priceImpactPercent / 100);
  });

  // Применяем общий индекс цен
  newValue *= market.priceIndex;

  // Не даём цене упасть ниже 70% от покупной
  const minValue = property.purchasePrice * 0.7;
  newValue = Math.max(newValue, minValue);

  return Math.round(newValue);
}

/**
 * Рассчитывает налог на прибыль при продаже
 */
export function calculateSaleTax(
  salePrice: number,
  purchasePrice: number,
  renovationCost: number = 0
): number {
  const profit = salePrice - purchasePrice - renovationCost;
  if (profit <= 0) return 0;
  const taxRate = 0.13; // 13% налог на прибыль
  return Math.round(profit * taxRate);
}

/**
 * Проверяет, может ли игрок позволить себе покупку
 */
export function canAffordPurchase(
  cash: number,
  price: number,
  downPaymentPercent: number = 0.2
): boolean {
  return cash >= price * downPaymentPercent;
}

