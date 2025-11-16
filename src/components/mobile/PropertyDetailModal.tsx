import React from 'react';
import { Property, PropertyStrategy, Loan } from '../../types';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { formatMoney } from '../../utils/gameLogic';

interface PropertyDetailModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onStrategyChange: (strategy: PropertyStrategy) => void;
  onRenovation: (type: "косметика" | "капремонт") => void;
  onTakeLoan: () => void;
  loan?: Loan;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  isOpen,
  onClose,
  onStrategyChange,
  onRenovation,
  onTakeLoan,
  loan
}) => {
  if (!property) return null;

  const getConditionVariant = (condition: Property['condition']) => {
    switch (condition) {
      case 'после ремонта':
        return 'success';
      case 'требует ремонта':
      case 'убитая':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={property.name}>
      <div className="property-detail">
        {/* Basic Info */}
        <div className="property-detail__section">
          <div className="property-detail__tags mb-md">
            <Tag variant="default">{property.district}</Tag>
            <Tag variant="info">{property.type}</Tag>
            <Tag variant={getConditionVariant(property.condition)}>
              {property.condition}
            </Tag>
          </div>
          <div className="property-detail__info-grid">
            <div className="property-detail__info-item">
              <span className="text-secondary">Покупная цена</span>
              <strong>{formatMoney(property.purchasePrice)}</strong>
            </div>
            <div className="property-detail__info-item">
              <span className="text-secondary">Текущая стоимость</span>
              <strong className="text-success">{formatMoney(property.currentValue)}</strong>
            </div>
            <div className="property-detail__info-item">
              <span className="text-secondary">Аренда</span>
              <strong>{formatMoney(property.baseMonthlyRent)}/мес</strong>
            </div>
            <div className="property-detail__info-item">
              <span className="text-secondary">Расходы</span>
              <strong>{formatMoney(property.monthlyExpenses)}/мес</strong>
            </div>
          </div>
        </div>

        {/* Loan Info */}
        {loan && (
          <div className="property-detail__section">
            <h3 className="property-detail__section-title">Кредит</h3>
            <div className="property-detail__info-grid">
              <div className="property-detail__info-item">
                <span className="text-secondary">Остаток долга</span>
                <strong>{formatMoney(loan.remainingPrincipal)}</strong>
              </div>
              <div className="property-detail__info-item">
                <span className="text-secondary">Ежемесячный платёж</span>
                <strong>{formatMoney(loan.monthlyPayment)}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Renovation Status */}
        {property.isUnderRenovation && (
          <div className="property-detail__section">
            <div className="property-detail__renovation-status">
              🔨 Ремонт в процессе. Осталось {property.renovationMonthsLeft} месяцев
            </div>
          </div>
        )}

        {/* Strategy Selection */}
        {!property.isUnderRenovation && (
          <div className="property-detail__section">
            <h3 className="property-detail__section-title mb-md">Стратегия</h3>
            <div className="property-detail__strategy-buttons">
              <Button
                variant={property.strategy === 'hold' ? 'primary' : 'secondary'}
                fullWidth
                onClick={() => onStrategyChange('hold')}
                className="mb-sm"
              >
                Держать
              </Button>
              <Button
                variant={property.strategy === 'rent' ? 'primary' : 'secondary'}
                fullWidth
                onClick={() => onStrategyChange('rent')}
                className="mb-sm"
              >
                Сдавать в аренду
              </Button>
              <Button
                variant={property.strategy === 'flip' ? 'primary' : 'secondary'}
                fullWidth
                onClick={() => onStrategyChange('flip')}
              >
                Перепродавать (установить цену)
              </Button>
            </div>
          </div>
        )}

        {/* Actions */}
        {!property.isUnderRenovation && (
          <div className="property-detail__section">
            <h3 className="property-detail__section-title mb-md">Действия</h3>
            {property.condition !== 'после ремонта' && (
              <div className="property-detail__actions">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    onRenovation('косметика');
                  }}
                  className="mb-sm"
                >
                  🔨 Косметический ремонт
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    onRenovation('капремонт');
                  }}
                  className="mb-sm"
                >
                  🏗️ Капитальный ремонт
                </Button>
              </div>
            )}
            {!loan && (
              <Button
                variant="ghost"
                fullWidth
                onClick={onTakeLoan}
              >
                💰 Взять залог под объект
              </Button>
            )}
          </div>
        )}
        
        {/* Current Strategy Display */}
        {property.strategy && (
          <div className="property-detail__section">
            <div className="property-detail__current-strategy">
              <span className="text-secondary">Текущая стратегия: </span>
              <strong>
                {property.strategy === 'hold' && '📦 Держать'}
                {property.strategy === 'rent' && '🏠 Сдавать в аренду'}
                {property.strategy === 'flip' && property.isForSale && `🔄 Перепродажа (${formatMoney(property.salePrice || property.currentValue)})`}
                {property.strategy === 'flip' && !property.isForSale && '🔄 Перепродажа'}
              </strong>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};

