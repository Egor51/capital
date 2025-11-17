import { Achievement, GameEvent, MarketState, Mission, Player, Property } from '../types';

export interface SyncState {
  player: Player;
  market: MarketState;
  events: GameEvent[];
  lastSyncedAt: number;
}

export interface ServerSyncState extends SyncState {
  missions: Mission[];
  achievements: Achievement[];
  availableProperties: Property[];
}

