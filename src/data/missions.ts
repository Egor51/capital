import { Mission, Achievement } from '../types';

export const initialMissions: Mission[] = [
  {
    id: 'mission-1',
    type: 'portfolio_value',
    title: 'Портфель 10 млн',
    description: 'Достигните чистого капитала 10 000 000 ₽',
    target: 10000000,
    current: 0,
    reward: 500,
    completed: false
  },
  {
    id: 'mission-2',
    type: 'monthly_rent',
    title: 'Аренда 150 000₽/мес',
    description: 'Получайте 150 000 ₽ аренды в месяц',
    target: 150000,
    current: 0,
    reward: 300,
    completed: false
  },
  {
    id: 'mission-3',
    type: 'districts',
    title: 'Все районы',
    description: 'Купите объект в каждом районе города',
    target: 4,
    current: 0,
    reward: 400,
    completed: false
  },
  {
    id: 'mission-4',
    type: 'properties_count',
    title: 'Портфель из 5 объектов',
    description: 'Владейте одновременно 5 объектами',
    target: 5,
    current: 0,
    reward: 250,
    completed: false
  }
];

export const achievements: Achievement[] = [
  {
    id: 'ach-1',
    type: 'novice',
    title: 'Инвестор-новичок',
    description: 'Купите первый объект недвижимости',
    icon: '🏠',
    unlocked: false
  },
  {
    id: 'ach-2',
    type: 'rent_king',
    title: 'Король аренды',
    description: 'Получайте 200 000 ₽ аренды в месяц',
    icon: '👑',
    unlocked: false
  },
  {
    id: 'ach-3',
    type: 'flip_master',
    title: 'Флип-мастер',
    description: 'Успешно продайте 10 объектов',
    icon: '🔄',
    unlocked: false
  },
  {
    id: 'ach-4',
    type: 'port_magnate',
    title: 'Магнат порта',
    description: 'Владейте 3 коммерческими объектами возле порта',
    icon: '🚢',
    unlocked: false
  },
  {
    id: 'ach-5',
    type: 'first_property',
    title: 'Первый шаг',
    description: 'Купите первый объект',
    icon: '🎯',
    unlocked: false
  },
  {
    id: 'ach-6',
    type: 'millionaire',
    title: 'Миллионер',
    description: 'Достигните капитала 5 000 000 ₽',
    icon: '💰',
    unlocked: false
  }
];

