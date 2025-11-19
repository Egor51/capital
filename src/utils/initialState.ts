import { Player, Difficulty } from '../types';
import { startingCashByDifficulty } from '../data/mockData';

/**
 * Creates an initial player state on the client side.
 * Used when the server returns no snapshot (new player) or when offline.
 */
export function createInitialPlayer(telegramId: number, difficulty: Difficulty = 'normal'): Player {
    const cash = startingCashByDifficulty[difficulty];
    const now = Date.now();

    return {
        id: `player-${telegramId}`,
        telegramId,
        name: 'Игрок',
        cash,
        netWorth: cash,
        loans: [],
        properties: [],
        cityId: 'murmansk',
        difficulty,
        experience: 0,
        level: 1,
        stats: {
            totalSales: 0,
            totalRentIncome: 0,
            totalRenovations: 0,
            propertiesOwned: 0
        },
        lastSyncedAt: now,
        createdAt: now,
        currentMonth: 0,
        totalMonths: 0
    };
}
