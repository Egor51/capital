import React, { useState, useEffect } from 'react';
import { Player, MarketState, Property, PropertyStrategy, Loan } from '../../types';
import { Card } from '../ui/Card';
import { Tag } from '../ui/Tag';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { formatMoney } from '../../utils/gameLogic';
import { calculateMonthlyIncome, calculateMonthlyExpenses } from '../../utils/calculations';

interface DashboardProps {
  player: Player;
  market: MarketState;
  properties: Property[];
  loans: Loan[];
  onStrategyChange?: (property: Property, strategy: PropertyStrategy) => void;
  onRenovation?: (property: Property, type: "косметика" | "капремонт") => void;
  onTakeLoan?: (property: Property) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  player,
  market,
  properties,
  loans,
  onStrategyChange,
  onRenovation,
  onTakeLoan
}) => {
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const monthlyIncome = calculateMonthlyIncome(player.properties, player.loans, market);
  const monthlyExpenses = calculateMonthlyExpenses(player.properties, player.loans);
  const totalDebt = player.loans.reduce((sum, loan) => sum + loan.remainingPrincipal, 0);
  const totalPropertyValue = properties.reduce((sum, prop) => sum + prop.currentValue, 0);
  const netCashFlow = monthlyIncome;

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
          <div className="dashboard__user-name">{player.telegramId}</div>
          <div className="dashboard__user-rating">
            <span className="dashboard__rating-label">Рейтинг:</span>
            <span className="dashboard__rating-value">{rating.toLocaleString('ru-RU')}</span>
          </div>
        </div>

      </Card>

      {/* Financial Status Card - Crypto Exchange Style */}
      <Card className="dashboard__finance-card dashboard__finance-card--crypto">
        <div className="dashboard__finance-header-crypto">
          <h2 className="dashboard__section-title">ПОРТФЕЛЬ</h2>
          <div className={`dashboard__finance-status-badge ${netCashFlow >= 0 ? 'dashboard__finance-status-badge--positive' : 'dashboard__finance-status-badge--negative'}`}>
            {netCashFlow >= 0 ? '▲' : '▼'}
          </div>
        </div>

        {/* Главная метрика - как цена на бирже */}
        <div className="dashboard__finance-main-price">
          <div className="dashboard__finance-price-label">Общий баланс</div>
          <div className={`dashboard__finance-price-value ${player.netWorth >= 0 ? 'dashboard__finance-price-value--up' : 'dashboard__finance-price-value--down'}`}>
            {formatMoney(player.netWorth)}
          </div>
        </div>

        {/* Таблица метрик - как на криптобирже */}
        <div className="dashboard__finance-table">
          <div className="dashboard__finance-row">
            <div className="dashboard__finance-cell dashboard__finance-cell--label">Баланс</div>
            <div className={`dashboard__finance-cell dashboard__finance-cell--value ${player.cash >= 0 ? 'dashboard__finance-cell--value-up' : 'dashboard__finance-cell--value-down'}`}>
              {formatMoney(player.cash)}
            </div>
          </div>

          <div className="dashboard__finance-row">
            <div className="dashboard__finance-cell dashboard__finance-cell--label">Активы</div>
            <div className="dashboard__finance-cell dashboard__finance-cell--value dashboard__finance-cell--value-up">
              {formatMoney(totalPropertyValue)}
            </div>
          </div>

          <div className="dashboard__finance-row">
            <div className="dashboard__finance-cell dashboard__finance-cell--label">Долги</div>
            <div className={`dashboard__finance-cell dashboard__finance-cell--value ${totalDebt > 0 ? 'dashboard__finance-cell--value-down' : 'dashboard__finance-cell--value-neutral'}`}>
              {formatMoney(totalDebt)}
            </div>
          </div>

          {/* <div className="dashboard__finance-row dashboard__finance-row--divider"></div> */}

          <div className="dashboard__finance-row">
            <div className="dashboard__finance-cell dashboard__finance-cell--label">Доход/мес</div>
            <div className={`dashboard__finance-cell dashboard__finance-cell--value ${monthlyIncome >= 0 ? 'dashboard__finance-cell--value-up' : 'dashboard__finance-cell--value-down'}`}>
              {monthlyIncome >= 0 ? '+' : ''}{formatMoney(monthlyIncome)}
            </div>
          </div>

          <div className="dashboard__finance-row">
            <div className="dashboard__finance-cell dashboard__finance-cell--label">Расход/мес</div>
            <div className="dashboard__finance-cell dashboard__finance-cell--value dashboard__finance-cell--value-down">
              {formatMoney(monthlyExpenses)}
            </div>
          </div>
        </div>
      </Card>

      {/* Properties List */}
      <div className="dashboard__properties">
        <h2 className="dashboard__section-title mb-md">Ваши объекты ({properties.length})</h2>
        {properties.length === 0 ? (
          <Card style={{ marginTop: '16px' }}>
            <div className="text-center text-secondary">
              У вас пока нет объектов недвижимости
            </div>
          </Card>
        ) : (
          <div className="dashboard__properties-list">
            {properties.map(property => {
              const propertyLoan = property.loanId ? loans.find(l => l.id === property.loanId) : undefined;
              return (
                <PropertyCard
                  key={property.id}
                  property={property}
                  loan={propertyLoan}
                  isExpanded={expandedCardId === property.id}
                  onToggle={() => setExpandedCardId(expandedCardId === property.id ? null : property.id)}
                  onStrategyChange={onStrategyChange ? (strategy) => onStrategyChange(property, strategy) : undefined}
                  onRenovation={onRenovation ? (type) => onRenovation(property, type) : undefined}
                  onTakeLoan={onTakeLoan ? () => onTakeLoan(property) : undefined}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

interface PropertyCardProps {
  property: Property;
  loan?: Loan;
  isExpanded: boolean;
  onToggle: () => void;
  onStrategyChange?: (strategy: PropertyStrategy) => void;
  onRenovation?: (type: "косметика" | "капремонт") => void;
  onTakeLoan?: () => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  loan,
  isExpanded,
  onToggle,
  onStrategyChange,
  onRenovation,
  onTakeLoan
}) => {
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


  // Генерируем изображение
  const getPropertyImage = (type: Property['type'], condition: Property['condition']) => {
    const imageHue = type === 'Квартира' ? 200 : type === 'Студия' ? 250 : type === 'Коммерция' ? 300 : 150;
    const saturation = condition === 'после ремонта' ? 70 : condition === 'нормальная' ? 50 : 30;
    return `linear-gradient(135deg, hsl(${imageHue}, ${saturation}%, 40%), hsl(${imageHue}, ${saturation}%, 20%))`;
  };

  // Извлекаем детали из названия или генерируем стабильные значения на основе ID
  const extractDetails = () => {
    const match = property.name.match(/(\d+)\s*этаж.*?(\d+)\s*м²/);
    if (match) {
      return {
        floor: match[1],
        area: match[2]
      };
    }
    // Генерируем стабильные значения на основе ID объекта
    // Используем простой хеш от ID для получения псевдослучайных, но стабильных значений
    const hash = property.id.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    const stableFloor = Math.abs(hash % 9) + 1;
    const stableArea = Math.abs(hash % 40) + 25;
    return {
      floor: stableFloor,
      area: stableArea
    };
  };

  const details = extractDetails();
  const profit = property.currentValue - property.purchasePrice;
  const profitPercent = ((profit / property.purchasePrice) * 100).toFixed(1);

  // Компонент для отображения прогресса ремонта
  const RenovationProgress: React.FC<{ startsAt: number; endsAt: number }> = ({ startsAt, endsAt }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
      const updateProgress = () => {
        const now = Date.now();
        const totalDuration = endsAt - startsAt;
        const elapsed = now - startsAt;
        const calculatedProgress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
        setProgress(calculatedProgress);
      };

      updateProgress();
      const interval = setInterval(updateProgress, 1000); // Обновляем каждую секунду

      return () => clearInterval(interval);
    }, [startsAt, endsAt]);

    const remainingMs = Math.max(0, endsAt - Date.now());
    const remainingMinutes = Math.ceil(remainingMs / 60000);

    return (
      <div className="renovation-progress">
        <ProgressBar
          value={progress}
          variant="warning"
          showValue={true}
        />
        <div className="renovation-progress__time">
          Осталось: {remainingMinutes} мин.
        </div>
      </div>
    );
  };

  return (
    <Card
      className={`property-card ${isExpanded ? 'property-card--expanded' : ''}`}
      onClick={onToggle}
    >
      {/* Компактный заголовок */}
      <div className="property-card__compact-header">
        <div className="property-card__compact-info">
          <h3 className="property-card__title">{property.name}</h3>
          <div className="property-card__compact-details">
            <span className="property-card__compact-location">📍 {property.district}</span>
            <span className="property-card__compact-features">
              {details.area} м² • {details.floor} эт • {getStrategyName(property.strategy)}
            </span>
          </div>
        </div>
        <div className="property-card__compact-price">
          <div className="property-card__value">{formatMoney(property.currentValue)}</div>
          <div className="property-card__expand-icon">
            {isExpanded ? '▲' : '▼'}
          </div>
        </div>
      </div>

      {/* Компактные кнопки действий */}
      {!property.isUnderRenovation && onRenovation && property.condition !== 'после ремонта' && (
        <div className="property-card__compact-actions" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="secondary"
            size="small"
            onClick={() => onRenovation('косметика')}
            className="property-card__compact-btn"
            fullWidth
          >
            🔨 Ремонт
          </Button>
        </div>
      )}

      {/* Индикатор ремонта в компактном виде (только когда карточка закрыта) */}
      {!isExpanded && property.isUnderRenovation && property.renovationEndsAt && (
        <div className="property-card__renovation-indicator" onClick={(e) => e.stopPropagation()}>
          <div className="property-card__renovation-badge property-card__renovation-badge--compact">
            🔨 Ремонт (завершится через {Math.ceil((property.renovationEndsAt - Date.now()) / 60000)} мин.)
          </div>
        </div>
      )}

      {/* Раскрываемая часть */}
      <div className={`property-card__expandable ${isExpanded ? 'property-card__expandable--visible' : ''}`}>
        {/* Изображение */}
        <div
          className="property-card__image"
          style={{ background: getPropertyImage(property.type, property.condition) }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="property-card__image-overlay">
            <Tag variant={getConditionVariant(property.condition)} className="property-card__condition-badge">
              {property.condition}
            </Tag>
            {property.isUnderRenovation && property.renovationEndsAt && (
              <div className="property-card__renovation-badge">
                🔨 Ремонт (завершится через {Math.ceil((property.renovationEndsAt - Date.now()) / 60000)} мин.)
              </div>
            )}
          </div>
        </div>

        {/* Детали */}
        <div className="property-card__details">
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

          {property.strategy === 'rent' && (
            <div className="property-card__income-info">
              <span className="property-card__income-label">Доход:</span>
              <span className="property-card__income-value">+{formatMoney(property.baseRent || 0)}/период</span>
            </div>
          )}

          {/* Прогресс ремонта */}
          {property.isUnderRenovation && property.renovationStartsAt && property.renovationEndsAt && (
            <div className="property-card__renovation-progress">
              <div className="property-card__renovation-progress-label">
                🔨 Ремонт в процессе
              </div>
              <RenovationProgress
                startsAt={property.renovationStartsAt}
                endsAt={property.renovationEndsAt}
              />
            </div>
          )}

          {profit !== 0 && (
            <div className={`property-card__profit ${profit > 0 ? 'property-card__profit--positive' : 'property-card__profit--negative'}`}>
              {profit > 0 ? '📈' : '📉'} {profit > 0 ? '+' : ''}{formatMoney(profit)} ({profitPercent}%)
            </div>
          )}

          {loan && (
            <div className="property-card__loan-info">
              <span className="property-card__loan-label">Долг:</span>
              <span className="property-card__loan-value">{formatMoney(loan.remainingPrincipal)}</span>
            </div>
          )}
        </div>

        {/* Действия */}
        {!property.isUnderRenovation && (
          <div className="property-card__actions" onClick={(e) => e.stopPropagation()}>
            {/* Стратегии */}
            {onStrategyChange && (
              <div className="property-card__strategy-buttons">
                <div className="property-card__strategy-label">Стратегия:</div>
                <div className="property-card__strategy-buttons-group">
                  <Button
                    variant={property.strategy === 'rent' ? 'primary' : 'secondary'}
                    fullWidth
                    onClick={() => onStrategyChange('rent')}
                    className="property-card__strategy-btn property-card__strategy-btn--large mb-sm"
                  >
                    💰 Сдавать
                  </Button>
                  <Button
                    variant={property.strategy === 'flip' ? 'primary' : 'secondary'}
                    fullWidth
                    onClick={() => onStrategyChange('flip')}
                    className="property-card__strategy-btn property-card__strategy-btn--large"
                  >
                    🏷️ Продавать
                  </Button>
                </div>
              </div>
            )}

            {/* Залог */}
            {onTakeLoan && !loan && (
              <Button
                variant="ghost"
                fullWidth
                onClick={onTakeLoan}
                className="mb-sm"
              >
                💰 Взять залог под объект
              </Button>
            )}

          </div>
        )}
      </div>
    </Card>
  );
};

