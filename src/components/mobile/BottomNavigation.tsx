import React from 'react';

type Screen = 'dashboard' | 'market' | 'events' | 'missions';

interface BottomNavigationProps {
  currentScreen: Screen;
  onScreenChange: (screen: Screen) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentScreen,
  onScreenChange
}) => {
  return (
    <nav className="bottom-nav">
      <button
        className={`bottom-nav__item ${currentScreen === 'dashboard' ? 'bottom-nav__item--active' : ''}`}
        onClick={() => onScreenChange('dashboard')}
      >
        <span className="bottom-nav__icon">◉</span>
        <span className="bottom-nav__label">Главная</span>
      </button>
      <button
        className={`bottom-nav__item ${currentScreen === 'market' ? 'bottom-nav__item--active' : ''}`}
        onClick={() => onScreenChange('market')}
      >
        <span className="bottom-nav__icon">⬟</span>
        <span className="bottom-nav__label">Рынок</span>
      </button>
      <button
        className={`bottom-nav__item ${currentScreen === 'events' ? 'bottom-nav__item--active' : ''}`}
        onClick={() => onScreenChange('events')}
      >
        <span className="bottom-nav__icon">▣</span>
        <span className="bottom-nav__label">Лог</span>
      </button>
      <button
        className={`bottom-nav__item ${currentScreen === 'missions' ? 'bottom-nav__item--active' : ''}`}
        onClick={() => onScreenChange('missions')}
      >
        <span className="bottom-nav__icon">⚡</span>
        <span className="bottom-nav__label">Миссии</span>
      </button>
    </nav>
  );
};

