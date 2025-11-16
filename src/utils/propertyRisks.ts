import { Property, PropertyRisk, PropertyRiskType } from '../types';

const riskChance = 0.05; // 5% вероятность события каждый месяц

export function checkPropertyRisks(property: Property, month: number): PropertyRisk | null {
  // Не проверяем риски для объектов на продаже или в ремонте
  if (property.isForSale || property.isUnderRenovation) {
    return null;
  }

  // Проверяем вероятность события
  if (Math.random() > riskChance) {
    return null;
  }

  const risks: Array<{
    type: PropertyRiskType;
    name: string;
    description: string;
    cost: number;
    impact: PropertyRisk['impact'];
    condition?: Property['condition'];
    strategy?: Property['strategy'];
  }> = [
    {
      type: 'leak',
      name: 'Протечка в квартире',
      description: 'Обнаружена протечка. Требуется срочный ремонт',
      cost: property.purchasePrice * 0.03,
      impact: {
        requiresRenovation: true,
        valueChange: -property.currentValue * 0.05
      },
      condition: 'нормальная'
    },
    {
      type: 'tenant_left',
      name: 'Арендатор съехал',
      description: 'Арендатор внезапно съехал. Потерян доход на 2 месяца',
      cost: 0,
      impact: {
        monthsWithoutRent: 2
      },
      strategy: 'rent'
    },
    {
      type: 'utility_breakdown',
      name: 'Поломка коммуникаций',
      description: 'Сломались коммуникации. Требуется ремонт',
      cost: property.purchasePrice * 0.02,
      impact: {
        valueChange: -property.currentValue * 0.03
      }
    },
    {
      type: 'flooding',
      name: 'Затопили соседи',
      description: 'Соседи сверху затопили квартиру. Нужен ремонт',
      cost: property.purchasePrice * 0.04,
      impact: {
        requiresRenovation: true,
        valueChange: -property.currentValue * 0.08
      }
    },
    {
      type: 'tax_audit',
      name: 'Проверка налоговой',
      description: 'Налоговая проверила продажу. Штраф за некорректное оформление',
      cost: property.purchasePrice * 0.05,
      impact: {}
    }
  ];

  // Фильтруем подходящие риски
  const availableRisks = risks.filter(risk => {
    if (risk.condition && property.condition !== risk.condition) return false;
    if (risk.strategy && property.strategy !== risk.strategy) return false;
    return true;
  });

  if (availableRisks.length === 0) {
    return null;
  }

  // Выбираем случайный риск
  const selectedRisk = availableRisks[Math.floor(Math.random() * availableRisks.length)];

  return {
    id: `risk-${Date.now()}-${property.id}`,
    propertyId: property.id,
    type: selectedRisk.type,
    name: selectedRisk.name,
    description: selectedRisk.description,
    cost: Math.round(selectedRisk.cost),
    impact: selectedRisk.impact,
    resolved: false,
    month
  };
}

export function resolvePropertyRisk(
  property: Property,
  risk: PropertyRisk
): { property: Property; cost: number } {
  let updatedProperty = { ...property };
  let totalCost = risk.cost;

  // Применяем влияние риска
  if (risk.impact.valueChange) {
    updatedProperty.currentValue = Math.max(
      updatedProperty.currentValue + risk.impact.valueChange,
      property.purchasePrice * 0.7
    );
  }

  if (risk.impact.requiresRenovation) {
    // Объект требует ремонта
    if (updatedProperty.condition === 'нормальная') {
      updatedProperty.condition = 'требует ремонта';
    } else if (updatedProperty.condition === 'после ремонта') {
      updatedProperty.condition = 'нормальная';
    }
  }

  return {
    property: updatedProperty,
    cost: totalCost
  };
}

