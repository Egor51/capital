import React from 'react';
import { Player } from '../types';
import { formatMoney } from '../utils/gameLogic';

interface PlayerPanelProps {
  player: Player;
}

export const PlayerPanel: React.FC<PlayerPanelProps> = ({ player }) => {
  const totalDebt = player.loans.reduce((sum, loan) => sum + loan.remainingPrincipal, 0);
  
  const getStatusComment = (): string => {
    if (player.cash < 0) {
      return "⚠️ Критическая ситуация: отрицательный баланс!";
    }
    if (totalDebt > player.netWorth * 0.5) {
      return "⚠️ Высокая закредитованность";
    }
    if (player.properties.length === 0) {
      return "💡 Начните с покупки первого объекта";
    }
    if (player.properties.length > 5) {
      return "📈 Крупный портфель недвижимости";
    }
    return "✅ Умеренно рискованный портфель";
  };

  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>Финансы игрока</h2>
      <div style={styles.grid}>
        <div style={styles.item}>
          <div style={styles.label}>Свободные деньги</div>
          <div style={{ ...styles.value, color: player.cash < 0 ? '#e74c3c' : '#27ae60' }}>
            {formatMoney(player.cash)}
          </div>
        </div>
        <div style={styles.item}>
          <div style={styles.label}>Чистый капитал</div>
          <div style={{ ...styles.value, color: player.netWorth > 0 ? '#27ae60' : '#e74c3c' }}>
            {formatMoney(player.netWorth)}
          </div>
        </div>
        <div style={styles.item}>
          <div style={styles.label}>Общая задолженность</div>
          <div style={styles.value}>{formatMoney(totalDebt)}</div>
        </div>
        <div style={styles.item}>
          <div style={styles.label}>Количество объектов</div>
          <div style={styles.value}>{player.properties.length}</div>
        </div>
      </div>
      <div style={styles.comment}>
        {getStatusComment()}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  panel: {
    backgroundColor: '#ecf0f1',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  title: {
    margin: '0 0 15px 0',
    fontSize: '20px',
    color: '#2c3e50'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '15px'
  },
  item: {
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '6px'
  },
  label: {
    fontSize: '14px',
    color: '#7f8c8d',
    marginBottom: '5px'
  },
  value: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  comment: {
    padding: '10px',
    backgroundColor: 'white',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#2c3e50'
  }
};

