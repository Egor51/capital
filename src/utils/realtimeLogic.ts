import { Player, Property, Loan, MarketState, GameEvent, GameTimers, PropertyStrategy } from '../types';
import {
  calculateNetWorth,
  updatePropertyValue,
  calculateSaleTax,
  calculateAnnuityPayment
} from './calculations';
import { updateMarketPhase, updateMarketIndexes, checkAndActivateEvents } from './marketLogic';
import { getLoanPreset } from '../api/serverConfig';

// Константы таймеров (в миллисекундах)
export const DEFAULT_TIMERS: GameTimers = {
  rentIntervalMs: 60000,        // 1 минута = 1 игровой месяц аренды
  loanPaymentIntervalMs: 60000, // 1 минута = 1 игровой месяц платежа
  renovationCheckIntervalMs: 1000, // 1 секунда для проверки ремонта
  marketUpdateIntervalMs: 60000    // 1 минута для обновления рынка
};

/**
 * Получает текущий timestamp
 */
export function getCurrentTimestamp(): number {
  return Date.now();
}

/**
 * Обрабатывает пропущенные периоды при входе в игру
 * Рассчитывает, что произошло пока игрок был офлайн
 */
export function processOfflinePeriod(
  player: Player,
  market: MarketState,
  _lastSyncedAt: number,
  now: number
): { player: Player; market: MarketState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  let updatedPlayer = { ...player };
  let updatedMarket = { ...market };

  // Обрабатываем аренду для всех объектов
  updatedPlayer.properties = updatedPlayer.properties.map(prop => {
    if (prop.strategy === 'rent' && !prop.isUnderRenovation && prop.nextRentAt) {
      const periods = Math.floor((now - prop.nextRentAt) / prop.rentIntervalMs) + 1;

      if (periods > 0) {
        // Рассчитываем аренду за пропущенные периоды
        let totalRent = 0;
        for (let i = 0; i < periods; i++) {
          const rent = calculateRentForPeriod(prop, updatedMarket);
          totalRent += rent;
        }

        if (totalRent > 0) {
          updatedPlayer.cash += totalRent;
          updatedPlayer.stats.totalRentIncome += totalRent;
          updatedPlayer.experience += Math.floor(totalRent / 1000);

          events.push({
            id: `rent-offline-${Date.now()}-${prop.id}`,
            timestamp: now,
            message: `Аренда ${prop.name} (${periods} периодов): +${formatMoney(totalRent)}`,
            type: 'success'
          });
        }

        // Обновляем следующий период аренды
        prop.nextRentAt = prop.nextRentAt + (periods * prop.rentIntervalMs);
      }
    }

    return prop;
  });

  // Обрабатываем кредитные платежи
  updatedPlayer.loans = updatedPlayer.loans.map(loan => {
    if (now >= loan.nextPaymentAt) {
      const periods = Math.floor((now - loan.nextPaymentAt) / loan.paymentIntervalMs) + 1;

      for (let i = 0; i < periods; i++) {
        if (loan.remainingPrincipal > 0) {
          // Списываем платеж
          updatedPlayer.cash -= loan.monthlyPayment;

          // Рассчитываем процент и тело кредита
          const interest = loan.remainingPrincipal * (loan.annualRate / 100 / 12);
          const principalPayment = loan.monthlyPayment - interest;
          loan.remainingPrincipal = Math.max(0, loan.remainingPrincipal - principalPayment);

          events.push({
            id: `loan-payment-offline-${Date.now()}-${loan.id}`,
            timestamp: now,
            message: `💳 Платёж по кредиту: -${formatMoney(loan.monthlyPayment)}`,
            type: 'info'
          });
        }
      }

      // Обновляем следующий платеж
      loan.nextPaymentAt = loan.nextPaymentAt + (periods * loan.paymentIntervalMs);
    }

    return loan;
  });

  // Удаляем погашенные кредиты
  const paidOffLoans = updatedPlayer.loans.filter(loan => loan.remainingPrincipal <= 0);
  if (paidOffLoans.length > 0) {
    paidOffLoans.forEach(loan => {
      events.push({
        id: `loan-paid-offline-${Date.now()}-${loan.id}`,
        timestamp: now,
        message: `✅ Кредит погашен!`,
        type: 'success'
      });
    });
  }
  updatedPlayer.loans = updatedPlayer.loans.filter(loan => loan.remainingPrincipal > 0);

  // Обрабатываем завершение ремонта
  updatedPlayer.properties = updatedPlayer.properties.map(prop => {
    if (prop.isUnderRenovation && prop.renovationEndsAt && now >= prop.renovationEndsAt) {
      // Ремонт завершён
      prop.isUnderRenovation = false;
      prop.renovationEndsAt = null;
      prop.condition = upgradeCondition(prop.condition);

      events.push({
        id: `renovation-complete-offline-${Date.now()}-${prop.id}`,
        timestamp: now,
        message: `🔨 Ремонт завершён на объекте ${prop.name}`,
        type: 'success'
      });
    }

    return prop;
  });

  // Обновляем стоимость объектов
  updatedPlayer.properties = updatedPlayer.properties.map(prop => {
    const newValue = updatePropertyValue(prop, updatedMarket);
    return {
      ...prop,
      currentValue: newValue
    };
  });

  // Обновляем рынок
  updatedMarket = updateMarketIndexes(updatedMarket);
  updatedMarket.lastUpdatedAt = now;

  // Обновляем чистый капитал
  updatedPlayer.netWorth = calculateNetWorth(
    updatedPlayer.cash,
    updatedPlayer.properties,
    updatedPlayer.loans
  );

  // Обновляем timestamp последней синхронизации
  updatedPlayer.lastSyncedAt = now;

  return { player: updatedPlayer, market: updatedMarket, events };
}

/**
 * Обрабатывает один период реального времени
 * Вызывается регулярно (каждую минуту по умолчанию)
 */
export function processRealtimeTick(
  player: Player,
  market: MarketState,
  timers: GameTimers = DEFAULT_TIMERS
): { player: Player; market: MarketState; events: GameEvent[] } {
  const now = getCurrentTimestamp();
  const events: GameEvent[] = [];
  let updatedPlayer = { ...player };
  let updatedMarket = { ...market };

  // 1. Обрабатываем аренду
  updatedPlayer.properties = updatedPlayer.properties.map(prop => {
    if (
      prop.strategy === 'rent' &&
      !prop.isUnderRenovation &&
      prop.nextRentAt &&
      now >= prop.nextRentAt
    ) {
      const rent = calculateRentForPeriod(prop, updatedMarket);

      if (rent > 0) {
        updatedPlayer.cash += rent;
        updatedPlayer.stats.totalRentIncome += rent;
        updatedPlayer.experience += Math.floor(rent / 1000);

        events.push({
          id: `rent-${Date.now()}-${prop.id}`,
          timestamp: now,
          message: `Аренда ${prop.name}: +${formatMoney(rent)}`,
          type: 'success'
        });
      } else {
        events.push({
          id: `vacancy-${Date.now()}-${prop.id}`,
          timestamp: now,
          message: `Арендатор съехал из ${prop.name}, потерян период аренды`,
          type: 'warning'
        });
      }

      // Обновляем следующий период
      prop.nextRentAt = now + prop.rentIntervalMs;
    }

    return prop;
  });

  // 2. Списываем расходы на содержание (только один раз за период)
  // Проверяем, прошло ли достаточно времени с последнего списания
  const lastExpenseTime = (updatedPlayer as any).lastExpenseTime || 0;
  if (now - lastExpenseTime >= timers.rentIntervalMs) {
    updatedPlayer.properties.forEach(prop => {
      updatedPlayer.cash -= prop.monthlyExpenses;
    });
    (updatedPlayer as any).lastExpenseTime = now;
  }

  // 3. Обрабатываем кредитные платежи
  let totalLoanPayments = 0;
  updatedPlayer.loans = updatedPlayer.loans.map(loan => {
    if (now >= loan.nextPaymentAt) {
      updatedPlayer.cash -= loan.monthlyPayment;
      totalLoanPayments += loan.monthlyPayment;

      // Рассчитываем процент и тело кредита
      const interest = loan.remainingPrincipal * (loan.annualRate / 100 / 12);
      const principalPayment = loan.monthlyPayment - interest;
      loan.remainingPrincipal = Math.max(0, loan.remainingPrincipal - principalPayment);

      // Обновляем следующий платеж
      loan.nextPaymentAt = now + loan.paymentIntervalMs;
    }

    return loan;
  });

  if (totalLoanPayments > 0) {
    events.push({
      id: `loan-payment-${Date.now()}`,
      timestamp: now,
      message: `💳 Ежемесячный платёж по кредитам: -${formatMoney(totalLoanPayments)}`,
      type: 'info'
    });
  }

  // Удаляем погашенные кредиты
  const paidOffLoans = updatedPlayer.loans.filter(loan => loan.remainingPrincipal <= 0);
  if (paidOffLoans.length > 0) {
    paidOffLoans.forEach(loan => {
      events.push({
        id: `loan-paid-${Date.now()}-${loan.id}`,
        timestamp: now,
        message: `✅ Кредит погашен!`,
        type: 'success'
      });
    });
  }
  updatedPlayer.loans = updatedPlayer.loans.filter(loan => loan.remainingPrincipal > 0);

  // 4. Обрабатываем завершение ремонта
  updatedPlayer.properties = updatedPlayer.properties.map(prop => {
    if (prop.isUnderRenovation && prop.renovationEndsAt && now >= prop.renovationEndsAt) {
      prop.isUnderRenovation = false;
      prop.renovationStartsAt = null;
      prop.renovationEndsAt = null;
      prop.condition = upgradeCondition(prop.condition);

      events.push({
        id: `renovation-complete-${Date.now()}-${prop.id}`,
        timestamp: now,
        message: `🔨 Ремонт завершён на объекте ${prop.name}`,
        type: 'success'
      });
    }

    return prop;
  });

  // 5. Обрабатываем продажи (flip стратегия)
  updatedPlayer.properties = updatedPlayer.properties.filter(prop => {
    if (prop.strategy === 'flip' && prop.salePrice) {
      const marketPrice = updatePropertyValue(prop, updatedMarket);
      const priceRatio = prop.salePrice / marketPrice;

      // Вероятность продажи
      let saleChance = 0.3;
      if (priceRatio <= 0.95) saleChance = 0.5;
      else if (priceRatio <= 1.0) saleChance = 0.3;
      else if (priceRatio <= 1.1) saleChance = 0.15;
      else saleChance = 0.05;

      if (Math.random() < saleChance) {
        const salePrice = prop.salePrice || prop.currentValue;
        const tax = calculateSaleTax(salePrice, prop.purchasePrice);
        const profit = salePrice - prop.purchasePrice - tax;

        updatedPlayer.cash += salePrice - tax;

        // Погашаем кредит, если есть
        if (prop.loanId) {
          const loan = updatedPlayer.loans.find(l => l.id === prop.loanId);
          if (loan) {
            updatedPlayer.cash -= loan.remainingPrincipal;
            updatedPlayer.loans = updatedPlayer.loans.filter(l => l.id !== loan.id);
          }
        }

        updatedPlayer.stats.totalSales += 1;
        updatedPlayer.experience += 50;

        events.push({
          id: `sale-${Date.now()}`,
          timestamp: now,
          message: `Продана ${prop.name} за ${formatMoney(salePrice)}. Прибыль: ${formatMoney(profit)}`,
          type: 'success'
        });

        return false; // Удаляем объект
      }
    }
    return true;
  });

  // 6. Обновляем стоимость объектов (только один раз за период)
  // Проверяем, прошло ли достаточно времени с последнего обновления
  const lastValueUpdateTime = (updatedPlayer as any).lastValueUpdateTime || 0;
  if (now - lastValueUpdateTime >= timers.rentIntervalMs) {
    updatedPlayer.properties = updatedPlayer.properties.map(prop => {
      const newValue = updatePropertyValue(prop, updatedMarket);
      return {
        ...prop,
        currentValue: newValue
      };
    });
    (updatedPlayer as any).lastValueUpdateTime = now;
  }

  // 7. Обновляем рынок
  updatedMarket.phase = updateMarketPhase(updatedMarket.phase || 'стабильность');
  updatedMarket = updateMarketIndexes(updatedMarket);
  updatedMarket = checkAndActivateEventsRealtime(updatedMarket);
  updatedMarket.lastUpdatedAt = now;

  // 8. Проверяем банкротство
  if (updatedPlayer.cash < 0) {
    events.push({
      id: `bankruptcy-${Date.now()}`,
      timestamp: now,
      message: '⚠️ Отрицательный баланс! Нужно срочно продать активы или взять кредит.',
      type: 'error'
    });
  }

  // 9. Обновляем чистый капитал
  updatedPlayer.netWorth = calculateNetWorth(
    updatedPlayer.cash,
    updatedPlayer.properties,
    updatedPlayer.loans
  );

  return { player: updatedPlayer, market: updatedMarket, events };
}

/**
 * Рассчитывает аренду за один период
 */
function calculateRentForPeriod(property: Property, market: MarketState): number {
  if (property.strategy !== 'rent' || property.isUnderRenovation) {
    return 0;
  }

  // Базовая аренда с учётом рыночного индекса
  let rent = property.baseRent * market.rentIndex;

  // Применяем влияние активных событий
  market.activeEvents.forEach(event => {
    rent *= (1 + event.rentIndexModifier / 100);
  });

  // Учитываем простой (вакансию)
  const vacancyChance = market.vacancyRate;
  if (Math.random() < vacancyChance) {
    return 0; // Арендатор съехал
  }

  // Вычитаем расходы пропорционально периоду
  const expenseRatio = property.rentIntervalMs / (30 * 24 * 60 * 60 * 1000);
  return Math.round(rent - (property.monthlyExpenses * expenseRatio));
}

/**
 * Проверяет и активирует события в реальном времени
 */
function checkAndActivateEventsRealtime(
  market: MarketState
): MarketState {
  return checkAndActivateEvents(market);
}

/**
 * Улучшает состояние объекта после ремонта
 */
export function upgradeCondition(condition: Property['condition']): Property['condition'] {
  switch (condition) {
    case 'убитая':
      return 'требует ремонта';
    case 'требует ремонта':
      return 'нормальная';
    case 'нормальная':
      return 'после ремонта';
    default:
      return condition;
  }
}

/**
 * Покупает объект за наличные (реальное время)
 */
export function buyPropertyWithCashRealtime(
  player: Player,
  property: Property
): { player: Player; success: boolean; message: string } {
  if (player.cash < property.purchasePrice) {
    return {
      player,
      success: false,
      message: "Недостаточно средств"
    };
  }
  const newProperty: Property = {
    ...property,
    cityId: property.cityId || player.cityId,
    rentIntervalMs: property.rentIntervalMs || DEFAULT_TIMERS.rentIntervalMs,
    nextRentAt: null, // Устанавливается при выборе стратегии rent
    isUnderRenovation: false,
    renovationEndsAt: null,
    strategy: 'none',
    loanId: undefined
  };

  const newStats = { ...player.stats };
  newStats.propertiesOwned = Math.max(newStats.propertiesOwned, player.properties.length + 1);
  const newExperience = player.experience + 25;

  return {
    player: {
      ...player,
      cash: player.cash - property.purchasePrice,
      properties: [...player.properties, newProperty],
      stats: newStats,
      experience: newExperience,
      netWorth: calculateNetWorth(
        player.cash - property.purchasePrice,
        [...player.properties, newProperty],
        player.loans
      )
    },
    success: true,
    message: `Куплена ${property.name}`
  };
}

/**
 * Покупает объект в ипотеку (реальное время)
 */
export function buyPropertyWithMortgageRealtime(
  player: Player,
  property: Property
): { player: Player; success: boolean; message: string } {
  const preset = getLoanPreset(player.difficulty);
  const downPaymentPercent = 0.2;
  const downPayment = property.purchasePrice * downPaymentPercent;
  const loanAmount = property.purchasePrice - downPayment;

  if (player.cash < downPayment) {
    return {
      player,
      success: false,
      message: "Недостаточно средств для первоначального взноса"
    };
  }

  const now = getCurrentTimestamp();
  const loanTermMonths = 120;
  const monthlyPayment = calculateAnnuityPayment(loanAmount, preset.baseInterestRate, loanTermMonths);

  const newLoan: Loan = {
    id: `loan-${Date.now()}`,
    playerId: player.id,
    propertyId: property.id,
    principal: loanAmount,
    remainingPrincipal: loanAmount,
    annualRate: preset.baseInterestRate,
    monthlyPayment,
    type: "ипотека",
    paymentIntervalMs: DEFAULT_TIMERS.loanPaymentIntervalMs,
    nextPaymentAt: now + DEFAULT_TIMERS.loanPaymentIntervalMs
  };

  const newProperty: Property = {
    ...property,
    cityId: property.cityId || player.cityId,
    rentIntervalMs: property.rentIntervalMs || DEFAULT_TIMERS.rentIntervalMs,
    nextRentAt: null,
    isUnderRenovation: false,
    renovationEndsAt: null,
    strategy: 'none',
    loanId: newLoan.id
  };

  const newStats = { ...player.stats };
  newStats.propertiesOwned = Math.max(newStats.propertiesOwned, player.properties.length + 1);
  const newExperience = player.experience + 25;

  return {
    player: {
      ...player,
      cash: player.cash - downPayment,
      properties: [...player.properties, newProperty],
      loans: [...player.loans, newLoan],
      stats: newStats,
      experience: newExperience,
      netWorth: calculateNetWorth(
        player.cash - downPayment,
        [...player.properties, newProperty],
        [...player.loans, newLoan]
      )
    },
    success: true,
    message: `Куплена ${property.name} в ипотеку`
  };
}

/**
 * Меняет стратегию объекта (реальное время)
 */
export function changePropertyStrategyRealtime(
  player: Player,
  property: Property,
  strategy: PropertyStrategy,
  salePrice?: number
): Player {
  const now = getCurrentTimestamp();

  return {
    ...player,
    properties: player.properties.map(p =>
      p.id === property.id
        ? {
          ...p,
          strategy,
          salePrice: strategy === 'flip' ? (salePrice || p.currentValue) : undefined,
          nextRentAt: strategy === 'rent' && !p.nextRentAt
            ? now + (p.rentIntervalMs || DEFAULT_TIMERS.rentIntervalMs)
            : strategy === 'rent' ? p.nextRentAt : null
        }
        : p
    )
  };
}

/**
 * Начинает ремонт объекта (реальное время)
 */
export function startRenovationRealtime(
  player: Player,
  property: Property,
  renovationType: "косметика" | "капремонт"
): { player: Player; success: boolean; message: string } {
  if (property.isUnderRenovation) {
    return {
      player,
      success: false,
      message: "Ремонт уже идёт"
    };
  }

  const costs = {
    косметика: property.purchasePrice * 0.05,
    капремонт: property.purchasePrice * 0.15
  };

  const cost = costs[renovationType];
  const durationMs = renovationType === "косметика"
    ? 60 * 1000  // 1 минута для косметики
    : 3 * 60 * 1000; // 3 минуты для капремонта

  if (player.cash < cost) {
    const shortage = cost - player.cash;
    return {
      player,
      success: false,
      message: `Недостаточно средств для ремонта. Нужно: ${formatMoney(cost)}, у вас: ${formatMoney(player.cash)}. Не хватает: ${formatMoney(shortage)}`
    };
  }

  const now = getCurrentTimestamp();
  const updatedProperties = player.properties.map(p =>
    p.id === property.id
      ? {
        ...p,
        isUnderRenovation: true,
        renovationStartsAt: now,
        renovationEndsAt: now + durationMs,
        currentValue: p.currentValue * (renovationType === "капремонт" ? 1.2 : 1.1)
      }
      : p
  );

  const newStats = { ...player.stats };
  newStats.totalRenovations += 1;
  const newExperience = player.experience + (renovationType === "капремонт" ? 75 : 40);

  return {
    player: {
      ...player,
      cash: player.cash - cost,
      properties: updatedProperties,
      stats: newStats,
      experience: newExperience,
      netWorth: calculateNetWorth(
        player.cash - cost,
        updatedProperties,
        player.loans
      )
    },
    success: true,
    message: `Начат ${renovationType} на ${property.name}`
  };
}

/**
 * Берет залог под объект (реальное время)
 */
export function takeLoanAgainstPropertyRealtime(
  player: Player,
  property: Property
): { player: Player; success: boolean; message: string } {
  if (property.loanId) {
    return {
      player,
      success: false,
      message: "На объект уже оформлен кредит"
    };
  }

  const preset = getLoanPreset(player.difficulty);
  const maxLoanAmount = property.currentValue * 0.6;
  const loanTermMonths = 60;
  const monthlyPayment = calculateAnnuityPayment(maxLoanAmount, preset.baseInterestRate + 2, loanTermMonths);
  const now = getCurrentTimestamp();

  const newLoan: Loan = {
    id: `loan-${Date.now()}`,
    playerId: player.id,
    propertyId: property.id,
    principal: maxLoanAmount,
    remainingPrincipal: maxLoanAmount,
    annualRate: preset.baseInterestRate + 2,
    monthlyPayment,
    type: "залог",
    paymentIntervalMs: DEFAULT_TIMERS.loanPaymentIntervalMs,
    nextPaymentAt: now + DEFAULT_TIMERS.loanPaymentIntervalMs
  };

  return {
    player: {
      ...player,
      cash: player.cash + maxLoanAmount,
      loans: [...player.loans, newLoan],
      properties: player.properties.map(p =>
        p.id === property.id ? { ...p, loanId: newLoan.id } : p
      ),
      netWorth: calculateNetWorth(
        player.cash + maxLoanAmount,
        player.properties,
        [...player.loans, newLoan]
      )
    },
    success: true,
    message: `Взят залог под ${property.name} на сумму ${formatMoney(maxLoanAmount)}`
  };
}

/**
 * Форматирует деньги для отображения
 */
function formatMoney(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(amount);
}

