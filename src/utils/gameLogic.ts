import { Player, Property, Loan, MarketState, GameEvent, PropertyStrategy } from '../types';
import {
  calculateNetWorth,
  calculateRentIncome,
  updatePropertyValue,
  calculateSaleTax,
  calculateAnnuityPayment
} from './calculations';
import { updateMarketPhase, updateMarketIndexes, checkAndActivateEvents } from './marketLogic';
import { loanPresetsByDifficulty } from '../data/mockData';

/**
 * Обрабатывает один игровой месяц
 */
export function processMonth(
  player: Player,
  market: MarketState,
  events: GameEvent[]
): { player: Player; market: MarketState; events: GameEvent[] } {
  let newPlayer = { ...player };
  let newMarket = { ...market };
  let newEvents = [...events];

  // 1. Обновляем рынок
  newMarket.currentPhase = updateMarketPhase(newMarket.currentPhase);
  newMarket = updateMarketIndexes(newMarket);
  newMarket = checkAndActivateEvents(newMarket, newPlayer.currentMonth);

  // Логируем смену фазы, если произошла
  if (newMarket.currentPhase !== market.currentPhase) {
    newEvents.push({
      id: `event-${Date.now()}`,
      month: newPlayer.currentMonth,
      message: `Рынок перешёл в фазу: ${newMarket.currentPhase}`,
      type: "info"
    });
  }

  // Логируем новые события
  newMarket.activeEvents.forEach(event => {
    if (!market.activeEvents.find(e => e.id === event.id)) {
      newEvents.push({
        id: `event-${Date.now()}-${event.id}`,
        month: newPlayer.currentMonth,
        message: event.description,
        type: "info"
      });
    }
  });

  // 2. Обновляем стоимость объектов
  newPlayer.properties = newPlayer.properties.map(prop => {
    const newValue = updatePropertyValue(prop, newMarket);
    return {
      ...prop,
      currentValue: newValue,
      monthsOwned: prop.monthsOwned + 1
    };
  });

  // 3. Обрабатываем ремонт
  newPlayer.properties = newPlayer.properties.map(prop => {
    if (prop.isUnderRenovation && prop.renovationMonthsLeft) {
      const monthsLeft = prop.renovationMonthsLeft - 1;
      if (monthsLeft === 0) {
        // Ремонт завершён
        return {
          ...prop,
          isUnderRenovation: false,
          renovationMonthsLeft: undefined,
          condition: upgradeCondition(prop.condition)
        };
      }
      return {
        ...prop,
        renovationMonthsLeft: monthsLeft
      };
    }
    return prop;
  });

  // 4. Обрабатываем продажи (flip стратегия)
  newPlayer.properties = newPlayer.properties.filter(prop => {
    if (prop.strategy === "flip" && prop.isForSale) {
      // Вероятность продажи зависит от цены продажи относительно рыночной
      const marketPrice = updatePropertyValue(prop, newMarket);
      const salePrice = prop.salePrice || prop.currentValue; // Используем установленную цену или текущую стоимость
      const priceRatio = salePrice / marketPrice;
      
      // Рассчитываем вероятность продажи
      let saleChance = 0.3; // Базовая вероятность
      if (priceRatio <= 0.95) saleChance = 0.5; // Дешевле рынка - быстрее
      else if (priceRatio <= 1.0) saleChance = 0.3; // На уровне рынка
      else if (priceRatio <= 1.1) saleChance = 0.15; // Немного дороже
      else saleChance = 0.05; // Значительно дороже
      
      if (Math.random() < saleChance) {
        const salePrice = prop.salePrice || prop.currentValue; // Используем установленную цену или текущую стоимость
        const tax = calculateSaleTax(salePrice, prop.purchasePrice);
        const profit = salePrice - prop.purchasePrice - tax;
        
        newPlayer.cash += salePrice - tax;
        
        // Погашаем кредит, если есть
        if (prop.mortgageId) {
          const loan = newPlayer.loans.find(l => l.id === prop.mortgageId);
          if (loan) {
            newPlayer.cash -= loan.remainingPrincipal;
            newPlayer.loans = newPlayer.loans.filter(l => l.id !== loan.id);
          }
        }

        // Обновляем статистику
        newPlayer.stats.totalSales += 1;
        newPlayer.experience += 50; // Опыт за продажу

        newEvents.push({
          id: `sale-${Date.now()}`,
          month: newPlayer.currentMonth,
          message: `Продана ${prop.name} за ${formatMoney(salePrice)}. Прибыль: ${formatMoney(profit)}`,
          type: "success"
        });

        return false; // Удаляем объект
      }
    }
    return true;
  });

  // 5. Начисляем аренду
  newPlayer.properties.forEach(prop => {
    if (prop.strategy === "rent" && !prop.isUnderRenovation) {
      const income = calculateRentIncome(prop, newMarket);
      if (income > 0) {
        newPlayer.cash += income;
        newPlayer.stats.totalRentIncome += income;
        newPlayer.experience += Math.floor(income / 1000); // Опыт пропорционален доходу
        
        newEvents.push({
          id: `rent-${Date.now()}-${prop.id}`,
          month: newPlayer.currentMonth,
          message: `Аренда ${prop.name}: +${formatMoney(income)}`,
          type: "success"
        });
      } else if (income === 0 && prop.strategy === "rent") {
        newEvents.push({
          id: `vacancy-${Date.now()}-${prop.id}`,
          month: newPlayer.currentMonth,
          message: `Арендатор съехал из ${prop.name}, потерян месяц аренды`,
          type: "warning"
        });
      }
    }
  });

  // 6. Списываем расходы на содержание
  newPlayer.properties.forEach(prop => {
    newPlayer.cash -= prop.monthlyExpenses;
  });

  // 7. Обрабатываем кредиты
  newPlayer.loans = newPlayer.loans.map(loan => {
    newPlayer.cash -= loan.monthlyPayment;
    
    // Уменьшаем остаток по кредиту
    const interest = loan.remainingPrincipal * (loan.interestRate / 100 / 12);
    const principalPayment = loan.monthlyPayment - interest;
    const newRemaining = Math.max(0, loan.remainingPrincipal - principalPayment);

    return {
      ...loan,
      remainingPrincipal: newRemaining,
      remainingTermMonths: Math.max(0, loan.remainingTermMonths - 1)
    };
  });

  // Удаляем погашенные кредиты
  newPlayer.loans = newPlayer.loans.filter(loan => loan.remainingPrincipal > 0);

  // 8. Проверяем банкротство
  if (newPlayer.cash < 0) {
    newEvents.push({
      id: `bankruptcy-${Date.now()}`,
      month: newPlayer.currentMonth,
      message: "⚠️ Отрицательный баланс! Нужно срочно продать активы или взять кредит.",
      type: "error"
    });
  }

  // 9. Обновляем чистый капитал
  newPlayer.netWorth = calculateNetWorth(newPlayer.cash, newPlayer.properties, newPlayer.loans);

  // 10. Переходим к следующему месяцу
  newPlayer.currentMonth += 1;

  return { player: newPlayer, market: newMarket, events: newEvents };
}

/**
 * Покупает объект за наличные
 */
export function buyPropertyWithCash(
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
    monthsOwned: 0
  };

  // Обновляем статистику и опыт
  const newStats = { ...player.stats };
  newStats.propertiesOwned = Math.max(newStats.propertiesOwned, player.properties.length + 1);
  const newExperience = player.experience + 25; // Опыт за покупку

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
 * Покупает объект в ипотеку
 */
export function buyPropertyWithMortgage(
  player: Player,
  property: Property
): { player: Player; success: boolean; message: string } {
  const preset = loanPresetsByDifficulty[player.difficulty];
  const downPaymentPercent = 0.2; // 20% первоначальный взнос
  const downPayment = property.purchasePrice * downPaymentPercent;
  const loanAmount = property.purchasePrice - downPayment;

  if (player.cash < downPayment) {
    return {
      player,
      success: false,
      message: "Недостаточно средств для первоначального взноса"
    };
  }

  // Создаём кредит
  const loanTermMonths = 120; // 10 лет
  const monthlyPayment = calculateAnnuityPayment(loanAmount, preset.baseInterestRate, loanTermMonths);

  const newLoan: Loan = {
    id: `loan-${Date.now()}`,
    propertyId: property.id,
    principal: loanAmount,
    interestRate: preset.baseInterestRate,
    monthlyPayment,
    remainingTermMonths: loanTermMonths,
    type: "ипотека",
    remainingPrincipal: loanAmount
  };

  const newProperty: Property = {
    ...property,
    monthsOwned: 0,
    mortgageId: newLoan.id
  };

  // Обновляем статистику и опыт
  const newStats = { ...player.stats };
  newStats.propertiesOwned = Math.max(newStats.propertiesOwned, player.properties.length + 1);
  const newExperience = player.experience + 25; // Опыт за покупку

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
 * Берет залог под объект
 */
export function takeLoanAgainstProperty(
  player: Player,
  property: Property
): { player: Player; success: boolean; message: string } {
  if (property.mortgageId) {
    return {
      player,
      success: false,
      message: "На объект уже оформлен кредит"
    };
  }

  const preset = loanPresetsByDifficulty[player.difficulty];
  const maxLoanAmount = property.currentValue * 0.6; // До 60% от стоимости
  const loanTermMonths = 60; // 5 лет
  const monthlyPayment = calculateAnnuityPayment(maxLoanAmount, preset.baseInterestRate + 2, loanTermMonths);

  const newLoan: Loan = {
    id: `loan-${Date.now()}`,
    propertyId: property.id,
    principal: maxLoanAmount,
    interestRate: preset.baseInterestRate + 2,
    monthlyPayment,
    remainingTermMonths: loanTermMonths,
    type: "залог",
    remainingPrincipal: maxLoanAmount
  };

  return {
    player: {
      ...player,
      cash: player.cash + maxLoanAmount,
      loans: [...player.loans, newLoan],
      properties: player.properties.map(p =>
        p.id === property.id ? { ...p, mortgageId: newLoan.id } : p
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
 * Начинает ремонт объекта
 */
export function startRenovation(
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
    косметика: property.purchasePrice * 0.05, // 5% от покупной цены
    капремонт: property.purchasePrice * 0.15 // 15% от покупной цены
  };

  const cost = costs[renovationType];
  const months = renovationType === "косметика" ? 1 : 3;

  if (player.cash < cost) {
    const shortage = cost - player.cash;
    return {
      player,
      success: false,
      message: `Недостаточно средств для ремонта. Нужно: ${formatMoney(cost)}, у вас: ${formatMoney(player.cash)}. Не хватает: ${formatMoney(shortage)}`
    };
  }

  const updatedProperties = player.properties.map(p =>
    p.id === property.id
      ? {
          ...p,
          isUnderRenovation: true,
          renovationMonthsLeft: months,
          currentValue: p.currentValue * (renovationType === "капремонт" ? 1.2 : 1.1)
        }
      : p
  );

  // Обновляем статистику и опыт
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
 * Меняет стратегию объекта
 */
export function changePropertyStrategy(
  player: Player,
  property: Property,
  strategy: PropertyStrategy,
  salePrice?: number
): Player {
  return {
    ...player,
    properties: player.properties.map(p =>
      p.id === property.id
        ? {
            ...p,
            strategy,
            isForSale: strategy === "flip",
            salePrice: strategy === "flip" ? (salePrice || p.currentValue) : undefined
          }
        : p
    )
  };
}

/**
 * Улучшает состояние объекта после ремонта
 */
function upgradeCondition(condition: Property["condition"]): Property["condition"] {
  switch (condition) {
    case "убитая":
      return "требует ремонта";
    case "требует ремонта":
      return "нормальная";
    case "нормальная":
      return "после ремонта";
    default:
      return condition;
  }
}

/**
 * Форматирует деньги для отображения
 */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(amount);
}

