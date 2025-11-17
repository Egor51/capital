import { Player, Property, PropertyStrategy } from '../types';

/**
 * Обновляет стратегию конкретного объекта в портфеле игрока.
 * Используется для синхронизации UI c выбранным режимом владения.
 */
export function changePropertyStrategy(
  player: Player,
  property: Property,
  strategy: PropertyStrategy,
  salePrice?: number
): Player {
  return {
    ...player,
    properties: player.properties.map(currentProperty =>
      currentProperty.id === property.id
        ? {
            ...currentProperty,
            strategy,
            isForSale: strategy === 'flip',
            salePrice: strategy === 'flip'
              ? salePrice ?? currentProperty.currentValue
              : undefined
          }
        : currentProperty
    )
  };
}

/**
 * Унифицированное форматирование денежных значений.
 */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(amount);
}

