import { useEffect, useRef } from 'react';
import {
  Achievement,
  GameEvent,
  MarketState,
  Mission,
  Player,
  Property
} from '../types';
import { DEFAULT_TIMERS, processRealtimeTick, upgradeCondition } from '../utils/realtimeLogic';
import { checkPropertyRisks } from '../utils/propertyRisks';
import { calculateLevel, updateMissions, checkAchievements, applyMissionRewards, applyAchievementRewards } from '../utils/missions';

type StateSnapshot = {
  player: Player;
  market: MarketState;
  events: GameEvent[];
  missions: Mission[];
  achievements: Achievement[];
};

export interface UseGameLoopOptions {
  isEnabled: boolean;
  player: Player | null;
  market: MarketState | null;
  events: GameEvent[];
  missions: Mission[];
  achievements: Achievement[];
  availableProperties: Property[];
  onStateChange: (snapshot: StateSnapshot) => void;
  onNotification?: (event: GameEvent) => void;
}

const NOTIFICATION_KEYWORDS = ['Продана', 'ремонт завершён', 'Ежемесячный платёж', 'Аренда'];

export function useGameLoop({
  isEnabled,
  player,
  market,
  events,
  missions,
  achievements,
  availableProperties,
  onStateChange,
  onNotification
}: UseGameLoopOptions): void {
  const playerRef = useRef<Player | null>(null);
  const marketRef = useRef<MarketState | null>(null);
  const eventsRef = useRef<GameEvent[]>([]);
  const missionsRef = useRef<Mission[]>([]);
  const achievementsRef = useRef<Achievement[]>([]);
  const availablePropertiesRef = useRef<Property[]>([]);
  const stateChangeRef = useRef(onStateChange);
  const notificationRef = useRef(onNotification);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    marketRef.current = market;
  }, [market]);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    missionsRef.current = missions;
  }, [missions]);

  useEffect(() => {
    achievementsRef.current = achievements;
  }, [achievements]);

  useEffect(() => {
    availablePropertiesRef.current = availableProperties;
  }, [availableProperties]);

  useEffect(() => {
    stateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useEffect(() => {
    notificationRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const rentIntervalId = setInterval(() => {
      const currentPlayer = playerRef.current;
      const currentMarket = marketRef.current;
      const currentEvents = eventsRef.current;
      const currentMissions = missionsRef.current ?? [];
      const currentAchievements = achievementsRef.current ?? [];

      if (!currentPlayer || !currentMarket) {
        return;
      }

      const result = processRealtimeTick(currentPlayer, currentMarket, DEFAULT_TIMERS);
      const riskEvents: GameEvent[] = [];

      result.player.properties.forEach(prop => {
        const risk = checkPropertyRisks(prop);
        if (risk) {
          riskEvents.push({
            id: `risk-${Date.now()}-${prop.id}`,
            timestamp: Date.now(),
            message: `${risk.name} на объекте ${prop.name}. ${risk.description}`,
            type: 'warning'
          });
        }
      });

      const updatedMissions = updateMissions(currentMissions, result.player);
      const missionReward = applyMissionRewards(currentMissions, updatedMissions, result.player);
      const updatedAchievements = checkAchievements(
        currentAchievements,
        missionReward.player,
        {
          totalSales: missionReward.player.stats.totalSales,
          totalRentIncome: missionReward.player.stats.totalRentIncome
        }
      );
      const achievementReward = applyAchievementRewards(currentAchievements, updatedAchievements, missionReward.player);
      const levelInfo = calculateLevel(achievementReward.player.experience);
      const finalPlayer: Player = {
        ...achievementReward.player,
        level: levelInfo.level
      };

      const newEventsForNotification = result.events.slice(currentEvents.length);
      newEventsForNotification.forEach(event => {
        if (NOTIFICATION_KEYWORDS.some(keyword => event.message.includes(keyword))) {
          notificationRef.current?.(event);
        }
      });

      const mergedEvents = [
        ...result.events,
        ...riskEvents,
        ...missionReward.events,
        ...achievementReward.events
      ];

      stateChangeRef.current?.({
        player: finalPlayer,
        market: result.market,
        events: mergedEvents,
        missions: updatedMissions,
        achievements: updatedAchievements
      });
    }, DEFAULT_TIMERS.rentIntervalMs);

    const renovationIntervalId = setInterval(() => {
      const currentPlayer = playerRef.current;
      const currentMarket = marketRef.current;
      const currentEvents = eventsRef.current;
      const currentMissions = missionsRef.current ?? [];
      const currentAchievements = achievementsRef.current ?? [];

      if (!currentPlayer || !currentMarket) {
        return;
      }

      const now = Date.now();
      let hasChanges = false;
      const renovationEvents: GameEvent[] = [];
      const updatedProperties = currentPlayer.properties.map(prop => {
        if (prop.isUnderRenovation && prop.renovationEndsAt && now >= prop.renovationEndsAt) {
          hasChanges = true;
          renovationEvents.push({
            id: `renovation-complete-${now}-${prop.id}`,
            timestamp: now,
            message: `🔨 Ремонт завершён на объекте ${prop.name}`,
            type: 'success'
          });

          return {
            ...prop,
            isUnderRenovation: false,
            renovationStartsAt: null,
            renovationEndsAt: null,
            condition: upgradeCondition(prop.condition)
          };
        }
        return prop;
      });

      if (!hasChanges) {
        return;
      }

      const updatedPlayer: Player = {
        ...currentPlayer,
        properties: updatedProperties
      };
      const mergedEvents = [...currentEvents, ...renovationEvents];

      stateChangeRef.current?.({
        player: updatedPlayer,
        market: currentMarket,
        events: mergedEvents,
        missions: currentMissions,
        achievements: currentAchievements
      });
    }, DEFAULT_TIMERS.renovationCheckIntervalMs);

    return () => {
      clearInterval(rentIntervalId);
      clearInterval(renovationIntervalId);
    };
  }, [isEnabled]);
}

