import React from 'react';
import { GameEvent } from '../types';

interface EventsLogProps {
  events: GameEvent[];
}

export const EventsLog: React.FC<EventsLogProps> = ({ events }) => {
  const recentEvents = events.slice(-15).reverse(); // Последние 15 событий

  const getEventStyle = (type: GameEvent['type']): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      padding: '10px',
      marginBottom: '8px',
      borderRadius: '6px',
      fontSize: '14px',
      borderLeft: '4px solid'
    };

    switch (type) {
      case 'success':
        return { ...baseStyle, backgroundColor: '#d4edda', borderColor: '#27ae60', color: '#155724' };
      case 'warning':
        return { ...baseStyle, backgroundColor: '#fff3cd', borderColor: '#f39c12', color: '#856404' };
      case 'error':
        return { ...baseStyle, backgroundColor: '#f8d7da', borderColor: '#e74c3c', color: '#721c24' };
      default:
        return { ...baseStyle, backgroundColor: '#d1ecf1', borderColor: '#3498db', color: '#0c5460' };
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>События и лог</h2>
      <div style={styles.log}>
        {recentEvents.length === 0 ? (
          <div style={styles.empty}>Пока нет событий</div>
        ) : (
          recentEvents.map(event => (
            <div key={event.id} style={getEventStyle(event.type)}>
              <div style={styles.eventHeader}>
                <span style={styles.month}>Месяц {event.month + 1}</span>
              </div>
              <div style={styles.eventMessage}>{event.message}</div>
            </div>
          ))
        )}
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
  log: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    maxHeight: '400px',
    overflowY: 'auto'
  },
  eventHeader: {
    marginBottom: '5px'
  },
  month: {
    fontSize: '12px',
    fontWeight: 'bold',
    opacity: 0.7
  },
  eventMessage: {
    fontSize: '14px'
  },
  empty: {
    padding: '20px',
    textAlign: 'center',
    color: '#7f8c8d'
  }
};

