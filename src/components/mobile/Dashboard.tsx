import React from 'react';
import { Player, MarketState, Property } from '../../types';
import { Card } from '../ui/Card';
import { Tag } from '../ui/Tag';
import { ProgressBar } from '../ui/ProgressBar';
import { formatMoney } from '../../utils/gameLogic';
import { getMarketPhaseDescription } from '../../utils/marketLogic';

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
  const totalDebt = player.loans.reduce((sum, loan) => sum + loan.remainingPrincipal, 0);
  const riskLevel = totalDebt > 0 ? Math.min((totalDebt / player.netWorth) * 100, 100) : 0;
  const riskVariant = riskLevel > 50 ? 'error' : riskLevel > 30 ? 'warning' : 'success';

  const years = Math.floor(player.currentMonth / 12);
  const months = player.currentMonth % 12;

  const getPhaseVariant = (phase: MarketState['currentPhase']) => {
    switch (phase) {
      case 'рост':
        return 'success';
      case 'кризис':
        return 'error';
      default:
        return 'info';
    }
  };

  return (
    <div className="dashboard">
      {/* Header Card */}
      <Card className="dashboard__header-card">
        <div className="dashboard__header-top">
          <h1 className="dashboard__title">Симулятор инвестора</h1>
          <div className="dashboard__level-badge">
            <span className="dashboard__level-icon">⭐</span>
            <span className="dashboard__level-number">{player.level}</span>
          </div>
        </div>
        <div className="dashboard__header-info">
          <div className="dashboard__header-item">
            <span className="text-secondary">Время игры:</span>
            <strong>{years}г {months}м</strong>
          </div>
          <div className="dashboard__header-item">
            <span className="text-secondary">⏱️ Время:</span>
            <strong>1 месяц = 1 минута</strong>
          </div>
        </div>
        <div className="dashboard__phase">
          <Tag variant={getPhaseVariant(market.currentPhase)}>
            {market.currentPhase}
          </Tag>
          <span className="dashboard__phase-desc text-secondary">
            {getMarketPhaseDescription(market.currentPhase)}
          </span>
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
        <div className="dashboard__finance-item mt-md">
          <div className="text-secondary mb-sm">Долги</div>
          <div className="dashboard__finance-value">{formatMoney(totalDebt)}</div>
        </div>
        <div className="mt-md">
          <ProgressBar
            value={riskLevel}
            label="Уровень риска"
            variant={riskVariant}
            showValue
          />
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

  return (
    <Card className="property-card" onClick={onClick}>
      <div className="property-card__header">
        <h3 className="property-card__title">{property.name}</h3>
        <div className="property-card__value">{formatMoney(property.currentValue)}</div>
      </div>
      <div className="property-card__tags">
        <Tag variant="default">{property.district}</Tag>
        <Tag variant="info">{property.type}</Tag>
        <Tag variant={getConditionVariant(property.condition)}>
          {property.condition}
        </Tag>
      </div>
      <div className="property-card__info">
        <div className="property-card__info-item">
          <span className="text-secondary">Стратегия:</span>
          <strong>{getStrategyName(property.strategy)}</strong>
        </div>
        {property.strategy === 'rent' && (
          <div className="property-card__info-item">
            <span className="text-secondary">Аренда:</span>
            <strong className="text-success">{formatMoney(property.baseMonthlyRent)}/мес</strong>
          </div>
        )}
      </div>
      {property.isUnderRenovation && (
        <div className="property-card__renovation">
          🔨 Ремонт: осталось {property.renovationMonthsLeft} месяцев
        </div>
      )}
    </Card>
  );
};

