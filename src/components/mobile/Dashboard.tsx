import React from 'react';
import { Player, MarketState, Property } from '../../types';
import { Card } from '../ui/Card';
import { Tag } from '../ui/Tag';
import { formatMoney } from '../../utils/gameLogic';
import { calculateMonthlyIncome, calculateMonthlyExpenses } from '../../utils/calculations';

interface DashboardProps {
  player: Player;
  market: MarketState;
  properties: Property[];
  onPropertyClick: (property: Property) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  player,
  market,
  properties,
  onPropertyClick
}) => {
  const monthlyIncome = calculateMonthlyIncome(player.properties, player.loans, market);
  const monthlyExpenses = calculateMonthlyExpenses(player.properties, player.loans);

  // Генерация аватара (инициалы)
  const getAvatar = (name: string): string => {
    const initials = name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    return initials || 'ИГ';
  };

  // Расчет рейтинга на основе уровня и капитала
  const calculateRating = (): number => {
    const levelScore = player.level * 100;
    const capitalScore = Math.floor(player.netWorth / 100000);
    const propertiesScore = player.properties.length * 50;
    return levelScore + capitalScore + propertiesScore;
  };

  const rating = calculateRating();

  return (
    <div className="dashboard">
      {/* Header Card */}
      <Card className="dashboard__user-info">
        
       
          <div className="dashboard__user-avatar">
            {getAvatar(player.name)}
          </div>
          <div className="dashboard__user-details">
            <div className="dashboard__user-name">{player.name}</div>
            <div className="dashboard__user-rating">
              <span className="dashboard__rating-label">Рейтинг:</span>
              <span className="dashboard__rating-value">{rating.toLocaleString('ru-RU')}</span>
            </div>
        </div>
      
      </Card>

      {/* Financial Status Card */}
      <Card className="dashboard__finance-card">
        <h2 className="dashboard__section-title">Финансовое состояние</h2>
        <div className="dashboard__finance-grid">
          <div className="dashboard__finance-item">
            <div className="text-secondary mb-sm">Свободные деньги</div>
            <div className={`dashboard__finance-value ${player.cash < 0 ? 'dashboard__finance-value--negative' : ''}`}>
              {formatMoney(player.cash)}
            </div>
          </div>
          <div className="dashboard__finance-item">
            <div className="text-secondary mb-sm">Чистый капитал</div>
            <div className="dashboard__finance-value dashboard__finance-value--primary">
              {formatMoney(player.netWorth)}
            </div>
          </div>
        </div>
        {/* <div className="dashboard__finance-item mt-md">
          <div className="text-secondary mb-sm">Долги</div>
          <div className="dashboard__finance-value">{formatMoney(totalDebt)}</div>
        </div> */}
        <div className="dashboard__finance-item mt-md">
          <div className="text-secondary mb-sm">Расход в месяц</div>
          <div className="dashboard__finance-value dashboard__finance-value--negative">
            {formatMoney(monthlyExpenses)}/мес
          </div>
        </div>
        <div className="dashboard__finance-item mt-md">
          <div className="text-secondary mb-sm">Месячный доход</div>
          <div className={`dashboard__finance-value ${monthlyIncome >= 0 ? 'dashboard__finance-value--success' : 'dashboard__finance-value--negative'}`}>
            {monthlyIncome >= 0 ? '+' : ''}{formatMoney(monthlyIncome)}/мес
          </div>
        </div>

      </Card>

      {/* Properties List */}
      <div className="dashboard__properties">
        <h2 className="dashboard__section-title mb-md">Ваши объекты ({properties.length})</h2>
        {properties.length === 0 ? (
          <Card>
            <div className="text-center text-secondary">
              У вас пока нет объектов недвижимости
            </div>
          </Card>
        ) : (
          <div className="dashboard__properties-list">
            {properties.map(property => (
              <PropertyCard
                key={property.id}
                property={property}
                onClick={() => onPropertyClick(property)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface PropertyCardProps {
  property: Property;
  onClick: () => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, onClick }) => {
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

  const getStrategyName = (strategy: Property['strategy']) => {
    switch (strategy) {
      case 'hold':
        return 'Держать';
      case 'rent':
        return 'Сдавать';
      case 'flip':
        return 'Продавать';
      default:
        return 'Не выбрана';
    }
  };

  const getStrategyIcon = (strategy: Property['strategy']) => {
    switch (strategy) {
      case 'hold':
        return '📦';
      case 'rent':
        return '💰';
      case 'flip':
        return '🏷️';
      default:
        return '❓';
    }
  };

  // Генерируем изображение
  const getPropertyImage = (type: Property['type'], condition: Property['condition']) => {
    const imageHue = type === 'Квартира' ? 200 : type === 'Студия' ? 250 : type === 'Коммерция' ? 300 : 150;
    const saturation = condition === 'после ремонта' ? 70 : condition === 'нормальная' ? 50 : 30;
    return `linear-gradient(135deg, hsl(${imageHue}, ${saturation}%, 40%), hsl(${imageHue}, ${saturation}%, 20%))`;
  };

  // Извлекаем детали из названия
  const extractDetails = () => {
    const match = property.name.match(/(\d+)\s*этаж.*?(\d+)\s*м²/);
    if (match) {
      return {
        floor: match[1],
        area: match[2]
      };
    }
    return {
      floor: Math.floor(Math.random() * 9) + 1,
      area: Math.floor(Math.random() * 40) + 25
    };
  };

  const details = extractDetails();
  const profit = property.currentValue - property.purchasePrice;
  const profitPercent = ((profit / property.purchasePrice) * 100).toFixed(1);

  return (
    <Card className="property-card" onClick={onClick}>
      {/* Изображение */}
      <div 
        className="property-card__image"
        style={{ background: getPropertyImage(property.type, property.condition) }}
      >
        <div className="property-card__image-overlay">
          <Tag variant={getConditionVariant(property.condition)} className="property-card__condition-badge">
            {property.condition}
          </Tag>
          {property.isUnderRenovation && (
            <div className="property-card__renovation-badge">
              🔨 Ремонт ({property.renovationMonthsLeft} мес.)
            </div>
          )}
        </div>
      </div>

      {/* Контент */}
      <div className="property-card__content">
        <div className="property-card__header">
          <h3 className="property-card__title">{property.name}</h3>
          <div className="property-card__value">{formatMoney(property.currentValue)}</div>
        </div>

        <div className="property-card__location">
          <span className="property-card__location-icon">📍</span>
          <span>{property.district}</span>
        </div>

        {/* Характеристики */}
        <div className="property-card__features">
          <div className="property-card__feature">
            <span className="property-card__feature-icon">📐</span>
            <span>{details.area} м²</span>
          </div>
          <div className="property-card__feature">
            <span className="property-card__feature-icon">🏢</span>
            <span>{details.floor} этаж</span>
          </div>
          <div className="property-card__feature">
            <span className="property-card__feature-icon">🏠</span>
            <span>{property.type}</span>
          </div>
        </div>

        {/* Стратегия и доход */}
        <div className="property-card__strategy">
          <div className="property-card__strategy-item">
            <span className="property-card__strategy-icon">{getStrategyIcon(property.strategy)}</span>
            <span>{getStrategyName(property.strategy)}</span>
          </div>
          {property.strategy === 'rent' && (
            <div className="property-card__strategy-item property-card__strategy-item--income">
              <span className="property-card__strategy-icon">💰</span>
              <span>+{formatMoney(property.baseMonthlyRent)}/мес</span>
            </div>
          )}
          {property.strategy === 'flip' && property.isForSale && (
            <div className="property-card__strategy-item property-card__strategy-item--sale">
              <span className="property-card__strategy-icon">🏷️</span>
              <span>Продажа: {formatMoney(property.salePrice || property.currentValue)}</span>
            </div>
          )}
        </div>

        {/* Прибыль/убыток */}
        {profit !== 0 && (
          <div className={`property-card__profit ${profit > 0 ? 'property-card__profit--positive' : 'property-card__profit--negative'}`}>
            {profit > 0 ? '📈' : '📉'} {profit > 0 ? '+' : ''}{formatMoney(profit)} ({profitPercent}%)
          </div>
        )}
      </div>
    </Card>
  );
};

