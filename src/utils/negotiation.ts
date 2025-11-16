import { Property, NegotiationResult, Difficulty } from '../types';

/**
 * Проводит торг при покупке объекта
 * @param property Объект недвижимости
 * @param offerPrice Предложенная цена
 * @param difficulty Сложность игры
 * @returns Результат переговоров
 */
export function negotiatePurchase(
  property: Property,
  offerPrice: number,
  difficulty: Difficulty
): NegotiationResult {
  const basePrice = property.purchasePrice;
  const discount = basePrice - offerPrice;
  const discountPercent = (discount / basePrice) * 100;

  // Вероятность принятия зависит от скидки и сложности
  let acceptChance = 0.5; // Базовая вероятность 50%

  if (discountPercent > 0) {
    // Предложение ниже базовой цены
    // Чем больше скидка, тем меньше шанс принятия
    acceptChance = Math.max(0.1, 0.5 - (discountPercent / 10));
    
    // На сложной сложности продавец менее сговорчив
    if (difficulty === 'hard') {
      acceptChance *= 0.7;
    } else if (difficulty === 'easy') {
      acceptChance *= 1.2;
    }
  } else if (discountPercent < 0) {
    // Предложение выше базовой цены - всегда принимается
    acceptChance = 1.0;
  }

  const accepted = Math.random() < acceptChance;

  if (accepted) {
    return {
      success: true,
      finalPrice: offerPrice,
      message: discountPercent > 0
        ? `Продавец согласился на вашу цену! Экономия: ${Math.round(discountPercent)}%`
        : 'Продавец принял ваше предложение'
    };
  } else {
    // Продавец может предложить компромисс
    const compromiseChance = 0.3;
    if (Math.random() < compromiseChance && discountPercent > 5) {
      const compromisePrice = Math.round(basePrice - (discount * 0.5));
      return {
        success: true,
        finalPrice: compromisePrice,
        message: `Продавец предложил компромисс: ${compromisePrice.toLocaleString('ru-RU')} ₽`
      };
    }

    return {
      success: false,
      finalPrice: basePrice,
      message: discountPercent > 10
        ? 'Продавец отклонил предложение. Слишком большая скидка.'
        : 'Продавец не согласился на вашу цену'
    };
  }
}

