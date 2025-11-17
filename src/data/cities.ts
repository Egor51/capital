import { City } from '../types';

/**
 * Данные о городах
 * В реальной реализации будут приходить с сервера
 */
export const cities: City[] = [
  {
    id: 'murmansk',
    name: 'Мурманск',
    basePriceIndex: 1.0,
    baseRentIndex: 1.0,
    districtModifiers: {
      'Центр': {
        priceMultiplier: 1.2,
        rentMultiplier: 1.15
      },
      'Спальный район': {
        priceMultiplier: 0.9,
        rentMultiplier: 0.95
      },
      'Возле порта': {
        priceMultiplier: 1.1,
        rentMultiplier: 1.2
      },
      'Отдалённый район': {
        priceMultiplier: 0.7,
        rentMultiplier: 0.8
      }
    }
  }
];

/**
 * Получает город по ID
 */
export function getCityById(cityId: string): City | undefined {
  return cities.find(city => city.id === cityId);
}

/**
 * Получает город по умолчанию
 */
export function getDefaultCity(): City {
  return cities[0]; // Мурманск
}

