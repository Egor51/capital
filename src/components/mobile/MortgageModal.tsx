import React from 'react';
import { Property } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatMoney } from '../../utils/gameLogic';
import { calculateAnnuityPayment } from '../../utils/calculations';
import { loanPresetsByDifficulty } from '../../data/mockData';

interface MortgageModalProps {
  isOpen: boolean;
  property: Property | null;
  playerCash: number;
  difficulty: 'easy' | 'normal' | 'hard';
  onConfirm: () => void;
  onClose: () => void;
}

export const MortgageModal: React.FC<MortgageModalProps> = ({
  isOpen,
  property,
  playerCash,
  difficulty,
  onConfirm,
  onClose
}) => {
  if (!isOpen || !property) return null;

  const preset = loanPresetsByDifficulty[difficulty];
  const downPaymentPercent = 0.2; // 20% первоначальный взнос
  const downPayment = property.purchasePrice * downPaymentPercent;
  const loanAmount = property.purchasePrice - downPayment;
  const loanTermMonths = 120; // 10 лет
  const monthlyPayment = calculateAnnuityPayment(loanAmount, preset.baseInterestRate, loanTermMonths);
  const canAfford = playerCash >= downPayment;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ипотечная программа">
      <div className="mortgage-modal">
        <div className="mortgage-modal__property">
          <h3 className="mortgage-modal__property-name">{property.name}</h3>
          <div className="mortgage-modal__property-price">
            {formatMoney(property.purchasePrice)}
          </div>
        </div>

        <div className="mortgage-modal__details">
          <div className="mortgage-modal__detail-item">
            <span className="text-secondary">Первоначальный взнос:</span>
            <strong>{formatMoney(downPayment)} (20%)</strong>
          </div>
          <div className="mortgage-modal__detail-item">
            <span className="text-secondary">Сумма кредита:</span>
            <strong>{formatMoney(loanAmount)}</strong>
          </div>
          <div className="mortgage-modal__detail-item">
            <span className="text-secondary">Процентная ставка:</span>
            <strong>{preset.baseInterestRate}% годовых</strong>
          </div>
          <div className="mortgage-modal__detail-item">
            <span className="text-secondary">Срок кредита:</span>
            <strong>{loanTermMonths} месяцев (10 лет)</strong>
          </div>
          <div className="mortgage-modal__detail-item mortgage-modal__detail-item--highlight">
            <span className="text-secondary">Ежемесячный платёж:</span>
            <strong className="text-neon">{formatMoney(monthlyPayment)}/мес</strong>
          </div>
        </div>

        <div className="mortgage-modal__info">
          <p className="text-secondary">{preset.description}</p>
        </div>

        {!canAfford && (
          <div className="mortgage-modal__warning">
            ⚠️ Недостаточно средств для первоначального взноса
          </div>
        )}

        <div className="mortgage-modal__actions">
          <Button
            variant="secondary"
            fullWidth
            onClick={onClose}
            className="mb-sm"
          >
            Отмена
          </Button>
          <Button
            variant="primary"
            fullWidth
            onClick={onConfirm}
            disabled={!canAfford}
          >
            Оформить ипотеку
          </Button>
        </div>
      </div>
    </Modal>
  );
};

