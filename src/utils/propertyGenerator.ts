import { Property, District, PropertyType } from '../types';

const streetNames = [
  'Ленина', 'Советская', 'Проспект Мира', 'Набережная', 'Портовый проезд',
  'Северная', 'Морская', 'Промышленная', 'Центральная', 'Заводская'
];

const buildingSeries = [
  'Хрущёвка', 'Брежневка', 'Сталинка', 'Новостройка', 'Панелька', 'Кирпичная'
];

export function generatePropertyName(
  _district: District,
  type: PropertyType,
  streetIndex: number,
  floor: number,
  area: number
): string {
  const street = streetNames[streetIndex % streetNames.length];
  const typeNames: Record<PropertyType, string> = {
    'Квартира': 'кв.',
    'Студия': 'студия',
    'Коммерция': 'помещение',
    'Комната': 'комната'
  };

  return `${typeNames[type]} ${street}, ${floor} этаж, ${area} м²`;
}

export function generatePropertyDetails(): {
  street: string;
  floor: number;
  totalFloors: number;
  area: number;
  buildingSeries: string;
  view: string;
  yearBuilt: number;
} {
  const floor = Math.floor(Math.random() * 9) + 1; // 1-9 этаж
  const totalFloors = Math.floor(Math.random() * 5) + 5; // 5-9 этажей
  const area = Math.floor(Math.random() * 40) + 20; // 20-60 м²
  const streetIndex = Math.floor(Math.random() * streetNames.length);
  const series = buildingSeries[Math.floor(Math.random() * buildingSeries.length)];
  
  const views = ['Во двор', 'На улицу', 'На море', 'На порт', 'На парк'];
  const view = views[Math.floor(Math.random() * views.length)];
  
  const yearBuilt = 1950 + Math.floor(Math.random() * 70); // 1950-2020

  return {
    street: streetNames[streetIndex],
    floor,
    totalFloors,
    area,
    buildingSeries: series,
    view,
    yearBuilt
  };
}

export function enhancePropertyWithDetails(property: Property): Property & {
  details?: {
    street: string;
    floor: number;
    totalFloors: number;
    area: number;
    buildingSeries: string;
    view: string;
    yearBuilt: number;
  };
} {
  const details = generatePropertyDetails();
  
  // Генерируем уникальное имя на основе деталей
  const streetIndex = streetNames.indexOf(details.street);
  const enhancedName = generatePropertyName(
    property.district,
    property.type,
    streetIndex,
    details.floor,
    details.area
  );

  return {
    ...property,
    name: enhancedName,
    details
  };
}

