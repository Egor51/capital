import React from 'react';
import { MarketPhase } from '../types';
import { getMarketPhaseDescription } from '../utils/marketLogic';

interface GameHeaderProps {
  currentMonth: number;
  totalMonths: number;
  marketPhase: MarketPhase;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  currentMonth,
  totalMonths,
  marketPhase
}) => {
  const monthsLeft = totalMonths - currentMonth;
  const years = Math.floor(currentMonth / 12);
  const months = currentMonth % 12;

  return (
    <header style={styles.header}>
      <h1 style={styles.title}>Симулятор инвестора в недвижимость Мурманска</h1>
      <div style={styles.info}>
        <div style={styles.infoItem}>
          <strong>Месяц:</strong> {years} год(а), {months} мес. ({currentMonth}/{totalMonths})
        </div>
        <div style={styles.infoItem}>
          <strong>Осталось:</strong> {monthsLeft} месяцев
        </div>
        <div style={styles.infoItem}>
          <strong>Фаза рынка:</strong> {marketPhase} — {getMarketPhaseDescription(marketPhase)}
        </div>
      </div>
    </header>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  header: {
    backgroundColor: '#2c3e50',
    color: 'white',
    padding: '20px',
    marginBottom: '20px',
    borderRadius: '8px'
  },
  title: {
    margin: '0 0 15px 0',
    fontSize: '24px'
  },
  info: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap'
  },
  infoItem: {
    fontSize: '14px'
  }
};

