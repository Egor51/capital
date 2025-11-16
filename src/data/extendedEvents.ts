import { ExtendedMarketEvent } from '../types';

export const extendedMarketEvents: ExtendedMarketEvent[] = [
  // Ключевая ставка
  {
    id: 'event-key-rate-up',
    name: 'Повышение ключевой ставки',
    description: 'Центробанк повысил ключевую ставку. Ипотека подорожала на 2%',
    monthImpactStart: 6,
    durationMonths: 12,
    priceImpactPercent: -3,
    rentImpactPercent: 0,
    vacancyImpactPercent: 5,
    eventType: 'key_rate_change',
    mortgageRateChange: 2
  },
  {
    id: 'event-key-rate-down',
    name: 'Снижение ключевой ставки',
    description: 'Центробанк снизил ключевую ставку. Ипотека подешевела на 1.5%',
    monthImpactStart: 18,
    durationMonths: 12,
    priceImpactPercent: 2,
    rentImpactPercent: 0,
    vacancyImpactPercent: -3,
    eventType: 'key_rate_change',
    mortgageRateChange: -1.5
  },
  
  // Строительство
  {
    id: 'event-new-construction',
    name: 'Строительство нового ЖК',
    description: 'В спальном районе началось строительство нового жилого комплекса. Цены на вторичку падают',
    monthImpactStart: 10,
    durationMonths: 18,
    priceImpactPercent: -8,
    rentImpactPercent: -3,
    vacancyImpactPercent: 8,
    eventType: 'new_construction',
    affectsDistricts: ['Спальный район'],
    affectsPropertyTypes: ['Квартира', 'Студия']
  },
  
  // Расширение порта
  {
    id: 'event-port-expansion',
    name: 'Расширение порта Мурманска',
    description: 'Порт расширяется! Коммерческая недвижимость резко дорожает',
    monthImpactStart: 15,
    durationMonths: 24,
    priceImpactPercent: 15,
    rentImpactPercent: 20,
    vacancyImpactPercent: -10,
    eventType: 'port_expansion',
    affectsDistricts: ['Возле порта'],
    affectsPropertyTypes: ['Коммерция']
  },
  
  // Аномальная зима
  {
    id: 'event-anomalous-winter',
    name: 'Аномально тёплая зима',
    description: 'Зима оказалась тёплой. Туристов меньше, аренда просела',
    monthImpactStart: 3,
    durationMonths: 3,
    priceImpactPercent: 0,
    rentImpactPercent: -15,
    vacancyImpactPercent: 15,
    eventType: 'anomalous_winter'
  },
  
  // Закон об аренде
  {
    id: 'event-rental-law',
    name: 'Новый закон об аренде',
    description: 'Принят закон, защищающий арендаторов. Аренда выросла',
    monthImpactStart: 20,
    durationMonths: 36,
    priceImpactPercent: 3,
    rentImpactPercent: 10,
    vacancyImpactPercent: -5,
    eventType: 'rental_law'
  },
  
  // Пик ремонтов
  {
    id: 'event-repair-peak',
    name: 'Сезон ремонтов',
    description: 'Начался сезон ремонтов. Стоимость работ выросла на 20%',
    monthImpactStart: 5,
    durationMonths: 4,
    priceImpactPercent: 0,
    rentImpactPercent: 0,
    vacancyImpactPercent: 0,
    eventType: 'repair_peak',
    repairCostMultiplier: 1.2
  }
];

