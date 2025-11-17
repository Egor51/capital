import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { applyMissionRewards, applyAchievementRewards } from '../missions';
import { Achievement, Mission, Player } from '../../types';

const playerStub = (): Player => ({
  id: 'player-1',
  name: 'Игрок',
  cash: 100_000,
  netWorth: 100_000,
  loans: [],
  properties: [],
  cityId: 'murmansk',
  difficulty: 'normal',
  experience: 0,
  level: 1,
  stats: {
    totalSales: 0,
    totalRentIncome: 0,
    totalRenovations: 0,
    propertiesOwned: 0
  },
  lastSyncedAt: Date.now(),
  createdAt: Date.now()
});

describe('mission and achievement rewards', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-02-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('добавляет опыт и событие при новом выполнении миссии', () => {
    const previousMissions: Mission[] = [{
      id: 'mission-1',
      type: 'portfolio_value',
      title: 'Портфель 10 млн',
      description: '',
      target: 10_000_000,
      current: 5_000_000,
      reward: 400,
      completed: false
    }];

    const nextMissions: Mission[] = [{
      ...previousMissions[0],
      current: 11_000_000,
      completed: true
    }];

    const result = applyMissionRewards(previousMissions, nextMissions, playerStub());

    expect(result.player.experience).toBe(400);
    expect(result.missions[0].completed).toBe(true);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].message).toContain('Миссия выполнена');
  });

  it('начисляет опыт за новое достижение и не мутирует исходные данные', () => {
    const previousAchievements: Achievement[] = [{
      id: 'ach-1',
      type: 'novice',
      title: 'Новичок',
      description: '',
      icon: '🏠',
      unlocked: false
    }];

    const nextAchievements: Achievement[] = [{
      ...previousAchievements[0],
      unlocked: true
    }];

    const result = applyAchievementRewards(previousAchievements, nextAchievements, playerStub());

    expect(result.player.experience).toBe(200);
    expect(result.achievements[0].unlocked).toBe(true);
    expect(result.events).toHaveLength(1);
    expect(previousAchievements[0].unlocked).toBe(false); // без мутаций
  });
});

