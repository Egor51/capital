import { ExtendedMarketEvent } from '../types';

// Создаем события с timestamps
const now = Date.now();
const ONE_MINUTE = 60000; // 1 минута = 1 игровой месяц

export const extendedMarketEvents: ExtendedMarketEvent[] = [
  // Ключевая ставка
  {
    id: 'event-key-rate-up',
    cityId: 'murmansk',
    name: 'Повышение ключевой ставки',
    description: 'Центробанк повысил ключевую ставку. Ипотека подорожала на 2%',
    startsAt: now + (6 * ONE_MINUTE),
    endsAt: now + (18 * ONE_MINUTE),
    priceIndexModifier: -3,
    rentIndexModifier: 0,
    vacancyModifier: 5,
    eventType: 'key_rate_change',
    mortgageRateChange: 2,

  },
  {
    id: 'event-key-rate-down',
    cityId: 'murmansk',
    name: 'Снижение ключевой ставки',
    description: 'Центробанк снизил ключевую ставку. Ипотека подешевела на 1.5%',
    startsAt: now + (18 * ONE_MINUTE),
    endsAt: now + (30 * ONE_MINUTE),
    priceIndexModifier: 2,
    rentIndexModifier: 0,
    vacancyModifier: -3,
    eventType: 'key_rate_change',
    mortgageRateChange: -1.5,

  },

  // Строительство
  {
    id: 'event-new-construction',
    cityId: 'murmansk',
    name: 'Строительство нового ЖК',
    description: 'В спальном районе началось строительство нового жилого комплекса. Цены на вторичку падают',
    startsAt: now + (10 * ONE_MINUTE),
    endsAt: now + (28 * ONE_MINUTE),
    priceIndexModifier: -8,
    rentIndexModifier: -3,
    vacancyModifier: 8,
    eventType: 'new_construction',
    affectsDistricts: ['Спальный район'],
    affectsPropertyTypes: ['Квартира', 'Студия'],

  },

  // Расширение порта
  {
    id: 'event-port-expansion',
    cityId: 'murmansk',
    name: 'Расширение порта Мурманска',
    description: 'Порт расширяется! Коммерческая недвижимость резко дорожает',
    startsAt: now + (15 * ONE_MINUTE),
    endsAt: now + (39 * ONE_MINUTE),
    priceIndexModifier: 15,
    rentIndexModifier: 20,
    vacancyModifier: -10,
    eventType: 'port_expansion',
    affectsDistricts: ['Возле порта'],
    affectsPropertyTypes: ['Коммерция'],

  },

  // Аномальная зима
  {
    id: 'event-anomalous-winter',
    cityId: 'murmansk',
    name: 'Аномально тёплая зима',
    description: 'Зима оказалась тёплой. Туристов меньше, аренда просела',
    startsAt: now + (3 * ONE_MINUTE),
    endsAt: now + (6 * ONE_MINUTE),
    priceIndexModifier: 0,
    rentIndexModifier: -15,
    vacancyModifier: 15,
    eventType: 'anomalous_winter',

  },

  // Закон об аренде
  {
    id: 'event-rental-law',
    cityId: 'murmansk',
    name: 'Новый закон об аренде',
    description: 'Принят закон, защищающий арендаторов. Аренда выросла',
    startsAt: now + (20 * ONE_MINUTE),
    endsAt: now + (56 * ONE_MINUTE),
    priceIndexModifier: 3,
    rentIndexModifier: 10,
    vacancyModifier: -5,
    eventType: 'rental_law',

  },

  // Пик ремонтов
  {
    id: 'event-repair-peak',
    cityId: 'murmansk',
    name: 'Сезон ремонтов',
    description: 'Начался сезон ремонтов. Стоимость работ выросла на 20%',
    startsAt: now + (5 * ONE_MINUTE),
    endsAt: now + (9 * ONE_MINUTE),
    priceIndexModifier: 0,
    rentIndexModifier: 0,
    vacancyModifier: 0,
    eventType: 'repair_peak',
    repairCostMultiplier: 1.2,

  }
];

