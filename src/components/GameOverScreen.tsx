import React from 'react';
import { Player } from '../types';
import { formatMoney } from '../utils/gameLogic';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface GameOverScreenProps {
  player: Player;
  onRestart: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({ player, onRestart }) => {
  const getVerdict = (): { text: string; emoji: string } => {
    const netWorth = player.netWorth;
    const propertiesCount = player.properties.length;
    const totalDebt = player.loans.reduce((sum, loan) => sum + loan.remainingPrincipal, 0);

    if (netWorth < 0) {
      return {
        text: "Ты довёл портфель до банкротства",
        emoji: "💸"
      };
    }

    if (netWorth < player.cash * 2) {
      return {
        text: "Ты осторожный инвестор, но мог бы быть активнее",
        emoji: "🤔"
      };
    }

    if (propertiesCount === 0) {
      return {
        text: "Ты не купил ни одного объекта — время упущено",
        emoji: "⏰"
      };
    }

    if (totalDebt > netWorth * 0.5) {
      return {
        text: "Ты агрессивный инвестор, но высокие долги создают риски",
        emoji: "⚡"
      };
    }

    if (netWorth > 5000000) {
      return {
        text: "Ты успешный инвестор! Отличный результат!",
        emoji: "🎉"
      };
    }

    return {
      text: "Ты умеренно успешный инвестор",
      emoji: "📈"
    };
  };

  const verdict = getVerdict();
  const totalDebt = player.loans.reduce((sum, loan) => sum + loan.remainingPrincipal, 0);
  const totalPropertyValue = player.properties.reduce((sum, prop) => sum + prop.currentValue, 0);

  return (
    <div className="game-over">
      <div className="game-over__content">
        <h1 className="game-over__title">Игра завершена!</h1>
        
        <Card className="game-over__verdict">
          <div className="game-over__emoji">{verdict.emoji}</div>
          <div className="game-over__verdict-text">{verdict.text}</div>
        </Card>

        <Card className="game-over__stats">
          <h2 className="game-over__stats-title">Итоговая статистика</h2>
          <div className="game-over__stats-list">
            <div className="game-over__stat-item">
              <span className="text-secondary">Чистый капитал:</span>
              <strong>{formatMoney(player.netWorth)}</strong>
            </div>
            <div className="game-over__stat-item">
              <span className="text-secondary">Свободные деньги:</span>
              <strong>{formatMoney(player.cash)}</strong>
            </div>
            <div className="game-over__stat-item">
              <span className="text-secondary">Количество объектов:</span>
              <strong>{player.properties.length}</strong>
            </div>
            <div className="game-over__stat-item">
              <span className="text-secondary">Общая стоимость объектов:</span>
              <strong>{formatMoney(totalPropertyValue)}</strong>
            </div>
            <div className="game-over__stat-item">
              <span className="text-secondary">Общая задолженность:</span>
              <strong>{formatMoney(totalDebt)}</strong>
            </div>
          </div>
        </Card>

        <Button
          variant="primary"
          size="large"
          fullWidth
          onClick={onRestart}
          className="game-over__restart-button"
        >
          Начать заново
        </Button>
      </div>
    </div>
  );
};
