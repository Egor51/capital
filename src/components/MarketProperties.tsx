import React from 'react';
import { Property } from '../types';
import { formatMoney } from '../utils/gameLogic';

interface MarketPropertiesProps {
  properties: Property[];
  onBuyWithCash: (property: Property) => void;
  onBuyWithMortgage: (property: Property) => void;
  playerCash: number;
}

export const MarketProperties: React.FC<MarketPropertiesProps> = ({
  properties,
  onBuyWithCash,
  onBuyWithMortgage,
  playerCash
}) => {
  if (properties.length === 0) {
    return (
      <div style={styles.empty}>
        <p>На рынке нет доступных объектов</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Рынок объектов</h2>
      <div style={styles.list}>
        {properties.map(property => {
          const canAffordCash = playerCash >= property.purchasePrice;
          const canAffordMortgage = playerCash >= property.purchasePrice * 0.2;

          return (
            <div key={property.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.propertyName}>{property.name}</h3>
                <div style={styles.propertyPrice}>{formatMoney(property.purchasePrice)}</div>
              </div>
              <div style={styles.cardBody}>
                <div style={styles.propertyInfo}>
                  <div><strong>Район:</strong> {property.district}</div>
                  <div><strong>Тип:</strong> {property.type}</div>
                  <div><strong>Состояние:</strong> {property.condition}</div>
                  <div><strong>Аренда:</strong> {formatMoney(property.baseMonthlyRent)}/мес</div>
                  <div><strong>Расходы:</strong> {formatMoney(property.monthlyExpenses)}/мес</div>
                </div>
                <div style={styles.actions}>
                  <button
                    style={{
                      ...styles.button,
                      ...(!canAffordCash ? styles.buttonDisabled : {})
                    }}
                    onClick={() => onBuyWithCash(property)}
                    disabled={!canAffordCash}
                  >
                    Купить за наличные
                  </button>
                  <button
                    style={{
                      ...styles.button,
                      ...styles.buttonSecondary,
                      ...(!canAffordMortgage ? styles.buttonDisabled : {})
                    }}
                    onClick={() => onBuyWithMortgage(property)}
                    disabled={!canAffordMortgage}
                  >
                    Купить в ипотеку (20% взнос)
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

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
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
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
    backgroundColor: '#3498db',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  propertyName: {
    margin: 0,
    fontSize: '18px'
  },
  propertyPrice: {
    fontSize: '20px',
    fontWeight: 'bold'
  },
  cardBody: {
    padding: '15px'
  },
  propertyInfo: {
    marginBottom: '15px',
    fontSize: '14px',
    color: '#2c3e50',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  button: {
    padding: '10px',
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  buttonSecondary: {
    backgroundColor: '#3498db'
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
    cursor: 'not-allowed',
    opacity: 0.6
  },
  empty: {
    padding: '40px',
    textAlign: 'center',
    backgroundColor: '#ecf0f1',
    borderRadius: '8px',
    color: '#7f8c8d'
  }
};

