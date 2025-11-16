import React, { useState } from 'react';
import { Property, PropertyStrategy } from '../types';
import { formatMoney } from '../utils/gameLogic';

interface PropertiesListProps {
  properties: Property[];
  onStrategyChange: (property: Property, strategy: PropertyStrategy) => void;
  onRenovation: (property: Property, type: "косметика" | "капремонт") => void;
  onTakeLoan: (property: Property) => void;
  loans: Array<{ id: string; remainingPrincipal: number }>;
}

export const PropertiesList: React.FC<PropertiesListProps> = ({
  properties,
  onStrategyChange,
  onRenovation,
  onTakeLoan,
  loans
}) => {
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);

  if (properties.length === 0) {
    return (
      <div style={styles.empty}>
        <p>У вас пока нет объектов недвижимости. Купите первый объект на рынке!</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Ваши объекты недвижимости</h2>
      <div style={styles.list}>
        {properties.map(property => {
          const loan = property.mortgageId
            ? loans.find(l => l.id === property.mortgageId)
            : null;
          const isExpanded = expandedProperty === property.id;

          return (
            <div key={property.id} style={styles.card}>
              <div
                style={styles.cardHeader}
                onClick={() => setExpandedProperty(isExpanded ? null : property.id)}
              >
                <div>
                  <h3 style={styles.propertyName}>{property.name}</h3>
                  <div style={styles.propertyInfo}>
                    {property.district} • {property.type} • {property.condition}
                  </div>
                </div>
                <div style={styles.propertyValue}>
                  {formatMoney(property.currentValue)}
                </div>
              </div>

              {isExpanded && (
                <div style={styles.cardBody}>
                  <div style={styles.details}>
                    <div style={styles.detailItem}>
                      <strong>Покупная цена:</strong> {formatMoney(property.purchasePrice)}
                    </div>
                    <div style={styles.detailItem}>
                      <strong>Аренда:</strong> {formatMoney(property.baseMonthlyRent)}/мес
                    </div>
                    <div style={styles.detailItem}>
                      <strong>Расходы:</strong> {formatMoney(property.monthlyExpenses)}/мес
                    </div>
                    <div style={styles.detailItem}>
                      <strong>Стратегия:</strong> {getStrategyName(property.strategy)}
                    </div>
                    {loan && (
                      <div style={styles.detailItem}>
                        <strong>Долг по кредиту:</strong> {formatMoney(loan.remainingPrincipal)}
                      </div>
                    )}
                    {property.isUnderRenovation && (
                      <div style={styles.detailItem}>
                        <strong>Ремонт:</strong> осталось {property.renovationMonthsLeft} месяцев
                      </div>
                    )}
                  </div>

                  <div style={styles.actions}>
                    <div style={styles.actionGroup}>
                      <strong>Стратегия:</strong>
                      <div style={styles.buttonGroup}>
                        <button
                          style={{
                            ...styles.button,
                            ...(property.strategy === "hold" ? styles.buttonActive : {})
                          }}
                          onClick={() => onStrategyChange(property, "hold")}
                          disabled={property.isUnderRenovation}
                        >
                          Держать
                        </button>
                        <button
                          style={{
                            ...styles.button,
                            ...(property.strategy === "rent" ? styles.buttonActive : {})
                          }}
                          onClick={() => onStrategyChange(property, "rent")}
                          disabled={property.isUnderRenovation}
                        >
                          Сдавать
                        </button>
                        <button
                          style={{
                            ...styles.button,
                            ...(property.strategy === "flip" ? styles.buttonActive : {})
                          }}
                          onClick={() => onStrategyChange(property, "flip")}
                          disabled={property.isUnderRenovation}
                        >
                          Продавать
                        </button>
                      </div>
                    </div>

                    <div style={styles.actionGroup}>
                      <strong>Ремонт:</strong>
                      <div style={styles.buttonGroup}>
                        <button
                          style={styles.button}
                          onClick={() => onRenovation(property, "косметика")}
                          disabled={property.isUnderRenovation || property.condition === "после ремонта"}
                        >
                          Косметика
                        </button>
                        <button
                          style={styles.button}
                          onClick={() => onRenovation(property, "капремонт")}
                          disabled={property.isUnderRenovation || property.condition === "после ремонта"}
                        >
                          Капремонт
                        </button>
                      </div>
                    </div>

                    {!property.mortgageId && (
                      <div style={styles.actionGroup}>
                        <button
                          style={styles.button}
                          onClick={() => onTakeLoan(property)}
                        >
                          Взять залог
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

function getStrategyName(strategy: PropertyStrategy): string {
  switch (strategy) {
    case "hold":
      return "Держать";
    case "rent":
      return "Сдавать в аренду";
    case "flip":
      return "Продавать";
    default:
      return "Не выбрана";
  }
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    marginBottom: '20px'
  },
  title: {
    margin: '0 0 15px 0',
    fontSize: '20px',
    color: '#2c3e50'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  card: {
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  cardHeader: {
    padding: '15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    backgroundColor: '#f8f9fa'
  },
  propertyName: {
    margin: '0 0 5px 0',
    fontSize: '18px',
    color: '#2c3e50'
  },
  propertyInfo: {
    fontSize: '14px',
    color: '#7f8c8d'
  },
  propertyValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#27ae60'
  },
  cardBody: {
    padding: '15px'
  },
  details: {
    marginBottom: '15px',
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px'
  },
  detailItem: {
    marginBottom: '8px',
    fontSize: '14px',
    color: '#2c3e50'
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  actionGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  button: {
    padding: '8px 16px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  buttonActive: {
    backgroundColor: '#27ae60'
  },
  empty: {
    padding: '40px',
    textAlign: 'center',
    backgroundColor: '#ecf0f1',
    borderRadius: '8px',
    color: '#7f8c8d'
  }
};

