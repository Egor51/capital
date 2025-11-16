import React from 'react';
import { Property } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { formatMoney } from '../../utils/gameLogic';

interface MarketScreenProps {
  properties: Property[];
  playerCash: number;
  onBuyWithCash: (property: Property) => void;
  onBuyWithMortgage: (property: Property) => void;
  onNegotiate?: (property: Property) => void;
}

export const MarketScreen: React.FC<MarketScreenProps> = ({
  properties,
  playerCash,
  onBuyWithCash,
  onBuyWithMortgage,
  onNegotiate: _onNegotiate
}) => {
  if (properties.length === 0) {
    return (
      <div className="market-screen">
        <Card>
          <div className="text-center text-secondary">
            На рынке нет доступных объектов
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="market-screen">
      <h2 className="market-screen__title mb-lg">Рынок объектов</h2>
      <div className="market-screen__list">
        {properties.map(property => (
          <MarketPropertyCard
            key={property.id}
            property={property}
            playerCash={playerCash}
            onBuyWithCash={() => onBuyWithCash(property)}
            onBuyWithMortgage={() => onBuyWithMortgage(property)}
          />
        ))}
      </div>
    </div>
  );
};

interface MarketPropertyCardProps {
  property: Property;
  playerCash: number;
  onBuyWithCash: () => void;
  onBuyWithMortgage: () => void;
  onNegotiate?: () => void;
}

const MarketPropertyCard: React.FC<MarketPropertyCardProps> = ({
  property,
  playerCash,
  onBuyWithCash,
  onBuyWithMortgage,
  onNegotiate
}) => {
  const canAffordCash = playerCash >= property.purchasePrice;
  const canAffordMortgage = playerCash >= property.purchasePrice * 0.2;

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
    <Card className="market-property-card">
      <div className="market-property-card__header">
        <h3 className="market-property-card__title">{property.name}</h3>
        <div className="market-property-card__price">{formatMoney(property.purchasePrice)}</div>
      </div>
      <div className="market-property-card__tags mb-md">
        <Tag variant="default">{property.district}</Tag>
        <Tag variant="info">{property.type}</Tag>
        <Tag variant={getConditionVariant(property.condition)}>
          {property.condition}
        </Tag>
      </div>
      <div className="market-property-card__info mb-md">
        <div className="market-property-card__info-item">
          <span className="text-secondary">Аренда:</span>
          <strong>{formatMoney(property.baseMonthlyRent)}/мес</strong>
        </div>
        <div className="market-property-card__info-item">
          <span className="text-secondary">Расходы:</span>
          <strong>{formatMoney(property.monthlyExpenses)}/мес</strong>
        </div>
      </div>
      <div className="market-property-card__actions">
        {onNegotiate && (
          <Button
            variant="ghost"
            fullWidth
            onClick={onNegotiate}
            className="mb-sm"
          >
            💬 Торговаться
          </Button>
        )}
        <Button
          variant="primary"
          fullWidth
          onClick={onBuyWithCash}
          disabled={!canAffordCash}
          className="mb-sm"
        >
          Купить за наличные
        </Button>
        <Button
          variant="secondary"
          fullWidth
          onClick={onBuyWithMortgage}
          disabled={!canAffordMortgage}
        >
          Купить в ипотеку (20% взнос)
        </Button>
      </div>
    </Card>
  );
};

