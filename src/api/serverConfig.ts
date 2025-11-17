import { Difficulty, LoanPreset, MarketPhase } from '../types';

export interface ServerReferenceConfig {
  loanPresets: Record<Difficulty, LoanPreset>;
  rentCoefficients: Record<string, number>;
  priceCoefficients: Record<string, number>;
  marketPhases: MarketPhase[];
}

let referenceConfig: ServerReferenceConfig | null = null;

export function hydrateReferenceConfig(config: ServerReferenceConfig): void {
  referenceConfig = config;
}

export function getLoanPreset(difficulty: Difficulty): LoanPreset {
  if (!referenceConfig) {
    throw new Error('Server reference config has not been hydrated yet.');
  }

  return referenceConfig.loanPresets[difficulty];
}

export function getReferenceConfig(): ServerReferenceConfig | null {
  return referenceConfig;
}

