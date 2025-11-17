import { Player, Mission, Achievement, District, GameEvent } from '../types';

export function updateMissions(
  missions: Mission[],
  player: Player
): Mission[] {
  return missions.map(mission => {
    if (mission.completed) return mission;

    let current = 0;

    switch (mission.type) {
      case 'portfolio_value':
        current = player.netWorth;
        break;
      case 'monthly_rent':
        current = player.properties
          .filter(p => p.strategy === 'rent' && !p.isUnderRenovation)
          .reduce((sum, p) => sum + (p.baseRent || 0), 0);
        break;
      case 'districts':
        const districts = new Set<District>();
        player.properties.forEach(p => districts.add(p.district));
        current = districts.size;
        break;
      case 'properties_count':
        current = player.properties.length;
        break;
    }

    const completed = current >= mission.target;

    return {
      ...mission,
      current,
      completed,
      completedAt: completed && !mission.completedAt ? player.currentMonth : mission.completedAt
    };
  });
}

export function checkAchievements(
  achievements: Achievement[],
  player: Player,
  stats: {
    totalSales: number;
    totalRentIncome: number;
  }
): Achievement[] {
  return achievements.map(achievement => {
    if (achievement.unlocked) return achievement;

    let unlocked = false;

    switch (achievement.type) {
      case 'novice':
      case 'first_property':
        unlocked = player.properties.length >= 1;
        break;
      case 'rent_king':
        unlocked = stats.totalRentIncome >= 200000;
        break;
      case 'flip_master':
        unlocked = stats.totalSales >= 10;
        break;
      case 'port_magnate':
        const portCommercial = player.properties.filter(
          p => p.district === 'Возле порта' && p.type === 'Коммерция'
        );
        unlocked = portCommercial.length >= 3;
        break;
      case 'millionaire':
        unlocked = player.netWorth >= 5000000;
        break;
    }

    return {
      ...achievement,
      unlocked,
      unlockedAt: unlocked && !achievement.unlockedAt ? player.currentMonth : achievement.unlockedAt
    };
  });
}

export function calculateExperience(
  player: Player,
  completedMissions: Mission[],
  unlockedAchievements: Achievement[]
): number {
  let exp = 0;

  // Опыт за миссии
  completedMissions.forEach(mission => {
    exp += mission.reward;
  });

  // Опыт за достижения
  unlockedAchievements.forEach(() => {
    exp += 200; // Базовый опыт за достижение
  });

  // Опыт за объекты (мало, но стабильно)
  exp += player.properties.length * 10;

  return exp;
}

export function calculateLevel(experience: number): { level: number; expToNext: number; title: string } {
  const levels = [
    { level: 1, exp: 0, title: 'Начинающий инвестор' },
    { level: 2, exp: 500, title: 'Новичок' },
    { level: 3, exp: 1500, title: 'Опытный инвестор' },
    { level: 4, exp: 3000, title: 'Рантье' },
    { level: 5, exp: 5000, title: 'Профессионал' },
    { level: 6, exp: 7500, title: 'Магнат' },
    { level: 7, exp: 10000, title: 'Титан недвижимости' },
    { level: 8, exp: 15000, title: 'Король рынка' },
    { level: 9, exp: 20000, title: 'Легенда инвестиций' },
    { level: 10, exp: 30000, title: 'Властелин недвижимости' }
  ];

  for (let i = levels.length - 1; i >= 0; i--) {
    if (experience >= levels[i].exp) {
      const nextLevel = levels[i + 1];
      return {
        level: levels[i].level,
        expToNext: nextLevel ? nextLevel.exp - experience : 0,
        title: levels[i].title
      };
    }
  }

  return {
    level: 1,
    expToNext: 500,
    title: 'Начинающий инвестор'
  };
}

export function applyMissionRewards(
  previousMissions: Mission[],
  nextMissions: Mission[],
  player: Player
): { player: Player; missions: Mission[]; events: GameEvent[] } {
  let accumulatedExperience = 0;
  const rewardEvents: GameEvent[] = [];

  nextMissions.forEach(mission => {
    const wasCompleted = previousMissions.some(prev => prev.id === mission.id && prev.completed);
    if (mission.completed && !wasCompleted) {
      accumulatedExperience += mission.reward;
      rewardEvents.push({
        id: `mission-${Date.now()}-${mission.id}`,
        timestamp: Date.now(),
        message: `🎯 Миссия выполнена: ${mission.title}! +${mission.reward} опыта`,
        type: 'success'
      });
    }
  });

  return {
    player: {
      ...player,
      experience: player.experience + accumulatedExperience
    },
    missions: nextMissions,
    events: rewardEvents
  };
}

export function applyAchievementRewards(
  previousAchievements: Achievement[],
  nextAchievements: Achievement[],
  player: Player
): { player: Player; achievements: Achievement[]; events: GameEvent[] } {
  let accumulatedExperience = 0;
  const rewardEvents: GameEvent[] = [];
  const ACHIEVEMENT_REWARD = 200;

  nextAchievements.forEach(achievement => {
    const wasUnlocked = previousAchievements.some(prev => prev.id === achievement.id && prev.unlocked);
    if (achievement.unlocked && !wasUnlocked) {
      accumulatedExperience += ACHIEVEMENT_REWARD;
      rewardEvents.push({
        id: `achievement-${Date.now()}-${achievement.id}`,
        timestamp: Date.now(),
        message: `🏆 Достижение разблокировано: ${achievement.icon} ${achievement.title}! +${ACHIEVEMENT_REWARD} опыта`,
        type: 'success'
      });
    }
  });

  return {
    player: {
      ...player,
      experience: player.experience + accumulatedExperience
    },
    achievements: nextAchievements,
    events: rewardEvents
  };
}

