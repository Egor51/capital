import React from 'react';
import { PropertyRisk, Property } from '../../types';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { formatMoney } from '../../utils/gameLogic';

interface RiskResolutionModalProps {
  risk: PropertyRisk | null;
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onFix: () => void;
  onIgnore: () => void;
  onDelay: () => void;
  playerCash: number;
}

export const RiskResolutionModal: React.FC<RiskResolutionModalProps> = ({
  risk,
  property,
  isOpen,
  onClose,
  onFix,
  onIgnore,
  onDelay,
  playerCash
}) => {
  if (!risk || !property) return null;

  const canAfford = playerCash >= risk.cost;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={risk.name}>
      <div className="risk-resolution">
        <div className="risk-resolution__description">
          <p>{risk.description}</p>
        </div>

        <div className="risk-resolution__impact">
          <h3 className="risk-resolution__section-title">Последствия:</h3>
          <ul className="risk-resolution__impact-list">
            {risk.impact.valueChange && (
              <li>
                Изменение стоимости: {risk.impact.valueChange > 0 ? '+' : ''}
                {formatMoney(risk.impact.valueChange)}
              </li>
            )}
            {risk.impact.requiresRenovation && (
              <li>Требуется ремонт</li>
            )}
            {risk.impact.monthsWithoutRent && (
              <li>Потеря аренды: {risk.impact.monthsWithoutRent} месяцев</li>
            )}
          </ul>
        </div>

        <div className="risk-resolution__actions">
          <h3 className="risk-resolution__section-title">Ваши действия:</h3>
          
          <Button
            variant="primary"
            fullWidth
            onClick={onFix}
            disabled={!canAfford}
            className="mb-sm"
          >
            Устранить за {formatMoney(risk.cost)}
            {!canAfford && ' (недостаточно средств)'}
          </Button>

          <Button
            variant="secondary"
            fullWidth
            onClick={onDelay}
            className="mb-sm"
          >
            Отложить (ухудшит ситуацию)
          </Button>

          <Button
            variant="ghost"
            fullWidth
            onClick={onIgnore}
          >
            Игнорировать (риск останется)
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};

