import React, { useState } from 'react';
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
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

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
            isExpanded={expandedCardId === property.id}
            onToggle={() => setExpandedCardId(expandedCardId === property.id ? null : property.id)}
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
  isExpanded: boolean;
  onToggle: () => void;
  onBuyWithCash: () => void;
  onBuyWithMortgage: () => void;
  onNegotiate?: () => void;
}

const MarketPropertyCard: React.FC<MarketPropertyCardProps> = ({
  property,
  playerCash,
  isExpanded,
  onToggle,
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

  // Генерируем детали для отображения
  const getPropertyImage = (type: Property['type'], condition: Property['condition']) => {
    // Заглушки изображений на основе типа и состояния
    const imageHue = type === 'Квартира' ? 200 : type === 'Студия' ? 250 : type === 'Коммерция' ? 300 : 150;
    const saturation = condition === 'после ремонта' ? 70 : condition === 'нормальная' ? 50 : 30;
    return `linear-gradient(135deg, hsl(${imageHue}, ${saturation}%, 40%), hsl(${imageHue}, ${saturation}%, 20%))`;
  };

  // Извлекаем детали из названия или генерируем
  const extractDetails = () => {
    const match = property.name.match(/(\d+)\s*этаж.*?(\d+)\s*м²/);
    if (match) {
      return {
        floor: match[1],
        area: match[2]
      };
    }
    // Генерируем случайные значения если не найдено
    return {
      floor: Math.floor(Math.random() * 9) + 1,
      area: Math.floor(Math.random() * 40) + 25
    };
  };

  const details = extractDetails();
  const monthlyProfit = property.baseMonthlyRent - property.monthlyExpenses;
  const roi = ((monthlyProfit * 12) / property.purchasePrice * 100).toFixed(1);

  return (
    <Card 
      className={`market-property-card ${isExpanded ? 'market-property-card--expanded' : ''}`}
      onClick={onToggle}
    >
      {/* Компактный заголовок */}
      <div className="market-property-card__compact-header">
        <div className="market-property-card__compact-info">
          <h3 className="market-property-card__title">{property.name}</h3>
          <div className="market-property-card__compact-details">
            <span className="market-property-card__compact-location">📍 {property.district}</span>
            <span className="market-property-card__compact-features">
              {details.area} м² • {details.floor} эт • {property.type}
            </span>
          </div>
        </div>
        <div className="market-property-card__compact-price">
          <div className="market-property-card__price">{formatMoney(property.purchasePrice)}</div>
          <div className="market-property-card__expand-icon">
            {isExpanded ? '▲' : '▼'}
          </div>
        </div>
      </div>

      {/* Раскрываемая часть */}
      <div className={`market-property-card__expandable ${isExpanded ? 'market-property-card__expandable--visible' : ''}`}>
        {/* Изображение */}
        <div 
          className="market-property-card__image"
          style={{ background: getPropertyImage(property.type, property.condition) }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="market-property-card__image-overlay">
            <Tag variant={getConditionVariant(property.condition)} className="market-property-card__condition-badge">
              {property.condition}
            </Tag>
          </div>
        </div>

        {/* Финансовые показатели */}
        <div className="market-property-card__metrics">
          <div className="market-property-card__metric">
            <div className="market-property-card__metric-label">Аренда</div>
            <div className="market-property-card__metric-value market-property-card__metric-value--positive">
              +{formatMoney(property.baseMonthlyRent)}/мес
            </div>
          </div>
          <div className="market-property-card__metric">
            <div className="market-property-card__metric-label">Расходы</div>
            <div className="market-property-card__metric-value market-property-card__metric-value--negative">
              -{formatMoney(property.monthlyExpenses)}/мес
            </div>
          </div>
          <div className="market-property-card__metric">
            <div className="market-property-card__metric-label">Доходность</div>
            <div className="market-property-card__metric-value market-property-card__metric-value--roi">
              {roi}% годовых
            </div>
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="market-property-card__actions" onClick={(e) => e.stopPropagation()}>
          {onNegotiate && (
            <Button
              variant="ghost"
              fullWidth
              onClick={() => {
                onNegotiate();
              }}
              className="mb-sm"
            >
              💬 Торговаться
            </Button>
          )}
          <Button
            variant="primary"
            fullWidth
            onClick={() => {
              onBuyWithCash();
            }}
            disabled={!canAffordCash}
            className="mb-sm"
          >
            {canAffordCash ? '💰 Купить за наличные' : '❌ Недостаточно средств'}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              onBuyWithMortgage();
            }}
            disabled={!canAffordMortgage}
          >
            {canAffordMortgage ? '🏦 Купить в ипотеку' : '❌ Недостаточно для взноса'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

