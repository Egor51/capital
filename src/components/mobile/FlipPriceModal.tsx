import React, { useState, useEffect } from 'react';
import { Property } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatMoney } from '../../utils/gameLogic';

interface FlipPriceModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (price: number) => void;
  marketPrice: number;
}

export const FlipPriceModal: React.FC<FlipPriceModalProps> = ({
  property,
  isOpen,
  onClose,
  onConfirm,
  marketPrice
}) => {
  const [salePrice, setSalePrice] = useState(marketPrice);
  
  useEffect(() => {
    if (marketPrice > 0) {
      setSalePrice(marketPrice);
    }
  }, [marketPrice]);

  if (!property) return null;

  const minPrice = Math.round(marketPrice * 0.85); // Минимум 85% от рыночной
  const maxPrice = Math.round(marketPrice * 1.3); // Максимум 130% от рыночной

  const profit = salePrice - property.purchasePrice;
  const profitPercent = Math.round((profit / property.purchasePrice) * 100);
  const tax = profit > 0 ? Math.round(profit * 0.13) : 0;
  const netProfit = profit - tax;

  const getSaleChance = (price: number): number => {
    const ratio = price / marketPrice;
    if (ratio <= 0.95) return 50; // Дешевле рынка - быстрее продастся
    if (ratio <= 1.0) return 30; // На уровне рынка
    if (ratio <= 1.1) return 15; // Немного дороже
    return 5; // Значительно дороже - сложно продать
  };

  const saleChance = getSaleChance(salePrice);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Выставить на продажу">
      <div className="flip-price-modal">
        <div className="flip-price-modal__property">
          <h3>{property.name}</h3>
          <div className="flip-price-modal__info">
            <div className="flip-price-modal__info-row">
              <span className="text-secondary">Покупная цена:</span>
              <strong>{formatMoney(property.purchasePrice)}</strong>
            </div>
            <div className="flip-price-modal__info-row">
              <span className="text-secondary">Рыночная стоимость:</span>
              <strong className="text-success">{formatMoney(marketPrice)}</strong>
            </div>
          </div>
        </div>

        <div className="flip-price-modal__price">
          <label className="flip-price-modal__label">
            Цена продажи:
          </label>
          <div className="flip-price-modal__input-group">
            <input
              type="number"
              className="flip-price-modal__input"
              value={salePrice}
              onChange={(e) => {
                const value = parseInt(e.target.value) || minPrice;
                const clamped = Math.max(minPrice, Math.min(maxPrice, value));
                setSalePrice(clamped);
              }}
              min={minPrice}
              max={maxPrice}
            />
            <span className="flip-price-modal__currency">₽</span>
          </div>
        </div>

        <div className="flip-price-modal__range">
          <div className="flip-price-modal__range-labels">
            <span>{formatMoney(minPrice)}</span>
            <span>{formatMoney(maxPrice)}</span>
          </div>
          <input
            type="range"
            className="flip-price-modal__slider"
            min={minPrice}
            max={maxPrice}
            step={10000}
            value={salePrice}
            onChange={(e) => setSalePrice(parseInt(e.target.value))}
          />
        </div>

        <div className="flip-price-modal__calculations">
          <div className="flip-price-modal__calc-item">
            <span className="text-secondary">Прибыль:</span>
            <strong className={profit >= 0 ? 'text-success' : 'text-error'}>
              {formatMoney(profit)} ({profitPercent > 0 ? '+' : ''}{profitPercent}%)
            </strong>
          </div>
          <div className="flip-price-modal__calc-item">
            <span className="text-secondary">Налог (13%):</span>
            <strong>{formatMoney(tax)}</strong>
          </div>
          <div className="flip-price-modal__calc-item flip-price-modal__calc-item--total">
            <span>Чистая прибыль:</span>
            <strong className={netProfit >= 0 ? 'text-success' : 'text-error'}>
              {formatMoney(netProfit)}
            </strong>
          </div>
        </div>

        <div className="flip-price-modal__chance">
          <div className="flip-price-modal__chance-label">
            Вероятность продажи в этом месяце:
          </div>
          <div className="flip-price-modal__chance-value">
            {saleChance}%
          </div>
          <div className="flip-price-modal__chance-hint text-secondary">
            {saleChance >= 40 && 'Отличная цена! Продастся быстро'}
            {saleChance >= 20 && saleChance < 40 && 'Нормальная цена, может занять время'}
            {saleChance < 20 && 'Высокая цена, продажа может затянуться'}
          </div>
        </div>

        <div className="flip-price-modal__actions">
          <Button variant="secondary" fullWidth onClick={onClose} className="mb-sm">
            Отмена
          </Button>
          <Button variant="primary" fullWidth onClick={() => onConfirm(salePrice)}>
            Выставить на продажу
          </Button>
        </div>
      </div>
    </Modal>
  );
};

