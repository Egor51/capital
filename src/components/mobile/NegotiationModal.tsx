import React, { useState, useEffect } from 'react';
import { Property } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatMoney } from '../../utils/gameLogic';

interface NegotiationModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (price: number) => void;
}

export const NegotiationModal: React.FC<NegotiationModalProps> = ({
  property,
  isOpen,
  onClose,
  onConfirm
}) => {
  const [offerPrice, setOfferPrice] = useState(0);
  
  useEffect(() => {
    if (property) {
      setOfferPrice(property.purchasePrice);
    }
  }, [property]);

  if (!property) return null;

  const minPrice = Math.round(property.purchasePrice * 0.9); // 90% минимум
  const maxPrice = Math.round(property.purchasePrice * 1.1); // 110% максимум

  const discount = property.purchasePrice - offerPrice;
  const discountPercent = Math.round((discount / property.purchasePrice) * 100);

  const handleConfirm = () => {
    onConfirm(offerPrice);
    onClose();
  };

  const quickOffers = [
    { label: '-10%', value: minPrice },
    { label: '-5%', value: Math.round(property.purchasePrice * 0.95) },
    { label: 'Базовая', value: property.purchasePrice },
    { label: '+5%', value: Math.round(property.purchasePrice * 1.05) },
    { label: '+10%', value: maxPrice }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Торг при покупке">
      <div className="negotiation-modal">
        <div className="negotiation-modal__property">
          <h3 className="negotiation-modal__property-name">{property.name}</h3>
          <div className="negotiation-modal__property-info">
            <div className="negotiation-modal__price-row">
              <span className="text-secondary">Выставленная цена:</span>
              <strong>{formatMoney(property.purchasePrice)}</strong>
            </div>
          </div>
        </div>

        <div className="negotiation-modal__offer">
          <label className="negotiation-modal__label">
            Ваше предложение:
          </label>
          <div className="negotiation-modal__input-group">
            <input
              type="number"
              className="negotiation-modal__input"
              value={offerPrice}
              onChange={(e) => {
                const value = parseInt(e.target.value) || minPrice;
                const clamped = Math.max(minPrice, Math.min(maxPrice, value));
                setOfferPrice(clamped);
              }}
              min={minPrice}
              max={maxPrice}
            />
            <span className="negotiation-modal__currency">₽</span>
          </div>
          {discount > 0 && (
            <div className="negotiation-modal__discount text-success">
              Экономия: {formatMoney(discount)} ({discountPercent}%)
            </div>
          )}
          {discount < 0 && (
            <div className="negotiation-modal__discount text-warning">
              Переплата: {formatMoney(Math.abs(discount))} ({Math.abs(discountPercent)}%)
            </div>
          )}
        </div>

        <div className="negotiation-modal__quick-offers">
          <div className="negotiation-modal__quick-label">Быстрые предложения:</div>
          <div className="negotiation-modal__quick-buttons">
            {quickOffers.map((offer, index) => (
              <button
                key={index}
                className={`negotiation-modal__quick-btn ${
                  offerPrice === offer.value ? 'negotiation-modal__quick-btn--active' : ''
                }`}
                onClick={() => setOfferPrice(offer.value)}
              >
                {offer.label}
              </button>
            ))}
          </div>
        </div>

        <div className="negotiation-modal__range">
          <div className="negotiation-modal__range-labels">
            <span>{formatMoney(minPrice)}</span>
            <span>{formatMoney(maxPrice)}</span>
          </div>
          <input
            type="range"
            className="negotiation-modal__slider"
            min={minPrice}
            max={maxPrice}
            step={10000}
            value={offerPrice}
            onChange={(e) => setOfferPrice(parseInt(e.target.value))}
          />
        </div>

        <div className="negotiation-modal__actions">
          <Button variant="secondary" fullWidth onClick={onClose} className="mb-sm">
            Отмена
          </Button>
          <Button variant="primary" fullWidth onClick={handleConfirm}>
            Предложить цену
          </Button>
        </div>
      </div>
    </Modal>
  );
};

