import React from 'react';
import { Difficulty } from '../types';
import { Card } from './ui/Card';

interface DifficultySelectorProps {
  onSelect: (difficulty: Difficulty) => void;
}

export const DifficultySelector: React.FC<DifficultySelectorProps> = ({ onSelect }) => {
  return (
    <div className="difficulty-selector">
      <div className="difficulty-selector__content">
        <h1 className="difficulty-selector__title">Симулятор инвестора в недвижимость Мурманска</h1>
        <p className="difficulty-selector__subtitle">Выберите уровень сложности:</p>
        
        <div className="difficulty-selector__options">
          <Card className="difficulty-option" onClick={() => onSelect("easy")}>
            <h3 className="difficulty-option__title">Легко</h3>
            <p className="difficulty-option__description">
              Стартовый капитал: 2 000 000 ₽<br />
              Низкие ставки по кредитам (9.5%)<br />
              Меньше кризисов
            </p>
          </Card>
          
          <Card className="difficulty-option" onClick={() => onSelect("normal")}>
            <h3 className="difficulty-option__title">Нормально</h3>
            <p className="difficulty-option__description">
              Стартовый капитал: 1 500 000 ₽<br />
              Обычные ставки (12.5%)<br />
              Стандартные условия
            </p>
          </Card>
          
          <Card className="difficulty-option" onClick={() => onSelect("hard")}>
            <h3 className="difficulty-option__title">Сложно</h3>
            <p className="difficulty-option__description">
              Стартовый капитал: 1 000 000 ₽<br />
              Высокие ставки (15.5%)<br />
              Больше кризисов
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

