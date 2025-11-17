import React, { useState } from 'react';
import { GameEvent } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface EventsScreenProps {
  events: GameEvent[];
  onRiskClick?: (eventId: string) => void;
}

export const EventsScreen: React.FC<EventsScreenProps> = ({ events, onRiskClick }) => {
  const [showAll, setShowAll] = useState(false);
  const recentEvents = showAll ? [...events].reverse() : [...events].slice(-10).reverse();

  const getEventIcon = (type: GameEvent['type']) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const getEventStyle = (type: GameEvent['type']) => {
    const baseClass = 'event-item';
    switch (type) {
      case 'success':
        return `${baseClass} event-item--success`;
      case 'warning':
        return `${baseClass} event-item--warning`;
      case 'error':
        return `${baseClass} event-item--error`;
      default:
        return `${baseClass} event-item--info`;
    }
  };

  return (
    <div className="events-screen">
      <h2 className="events-screen__title mb-lg">События и лог</h2>
      {events.length === 0 ? (
        <Card>
          <div className="text-center text-secondary">
            Пока нет событий
          </div>
        </Card>
      ) : (
        <>
          <div className="events-screen__list">
            {recentEvents.map(event => (
              <Card
                key={event.id}
                className={getEventStyle(event.type)}
                onClick={() => {
                  if (event.type === 'warning' && event.message.includes('риск') && onRiskClick) {
                    onRiskClick(event.id);
                  }
                }}
                style={{
                  cursor: event.type === 'warning' && event.message.includes('риск') ? 'pointer' : 'default'
                }}
              >
                <div className="event-item__header">
                  <span className="event-item__icon">{getEventIcon(event.type)}</span>
                  <span className="event-item__month text-secondary">
                    {event.timestamp 
                      ? new Date(event.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                      : event.month !== undefined ? `Месяц ${event.month + 1}` : 'Сейчас'}
                  </span>
                </div>
                <div className="event-item__message">
                  {event.message}
                  {event.type === 'warning' && event.message.includes('риск') && (
                    <div className="event-item__action-hint text-secondary">
                      Нажмите для действий
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
          {events.length > 10 && (
            <div className="events-screen__toggle mt-lg">
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? 'Показать меньше' : `Показать все (${events.length})`}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

