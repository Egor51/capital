import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Player, Property, MarketState, GameEvent, Difficulty, PropertyStrategy } from './types';
import { initialMarketProperties, startingCashByDifficulty } from './data/mockData';
import { initializeMarket } from './utils/marketLogic';
import {
  processMonth,
  buyPropertyWithCash,
  buyPropertyWithMortgage,
  takeLoanAgainstProperty,
  startRenovation,
  changePropertyStrategy,
  formatMoney
} from './utils/gameLogic';
import { DifficultySelector } from './components/DifficultySelector';
import { Dashboard } from './components/mobile/Dashboard';
import { MarketScreen } from './components/mobile/MarketScreen';
import { EventsScreen } from './components/mobile/EventsScreen';
import { MissionsPanel } from './components/mobile/MissionsPanel';
import { PropertyDetailModal } from './components/mobile/PropertyDetailModal';
import { BottomNavigation } from './components/mobile/BottomNavigation';
import { initialMissions, achievements } from './data/missions';
import { updateMissions, checkAchievements, calculateLevel } from './utils/missions';
import { checkPropertyRisks, resolvePropertyRisk } from './utils/propertyRisks';
import { negotiatePurchase } from './utils/negotiation';
import { NegotiationModal } from './components/mobile/NegotiationModal';
import { RiskResolutionModal } from './components/mobile/RiskResolutionModal';
import { FlipPriceModal } from './components/mobile/FlipPriceModal';
import { Toast } from './components/ui/Toast';
import { PropertyRisk } from './types';
import { ThemeToggle } from './components/ui/ThemeToggle';
import { useTheme } from './hooks/useTheme';
import './styles/global.css';
import './styles/mobile.css';

type Screen = 'dashboard' | 'market' | 'events' | 'missions';

function createInitialPlayer(difficulty: Difficulty): Player {
  const cash = startingCashByDifficulty[difficulty];
  return {
    id: 'player-1',
    name: 'Игрок',
    cash,
    netWorth: cash,
    loans: [],
    properties: [],
    currentMonth: 0,
    difficulty,
    totalMonths: 0, // Бессрочная игра
    experience: 0,
    level: 1,
    stats: {
      totalSales: 0,
      totalRentIncome: 0,
      totalRenovations: 0,
      propertiesOwned: 0
    }
  };
}

function App() {
  useTheme(); // Инициализируем тему
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [market, setMarket] = useState<MarketState | null>(null);
  const [marketProperties, setMarketProperties] = useState<Property[]>(initialMarketProperties);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [missions, setMissions] = useState(initialMissions);
  const [playerAchievements, setPlayerAchievements] = useState(achievements);
  
  // Интерактивные модалки
  const [isNegotiationOpen, setIsNegotiationOpen] = useState(false);
  const [negotiationProperty, setNegotiationProperty] = useState<Property | null>(null);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [activeRisk, setActiveRisk] = useState<PropertyRisk | null>(null);
  const [isFlipPriceOpen, setIsFlipPriceOpen] = useState(false);
  
  // Toast notification
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    isVisible: boolean;
  }>({
    message: '',
    type: 'info',
    isVisible: false
  });

  const handleDifficultySelect = useCallback((selectedDifficulty: Difficulty) => {
    const newPlayer = createInitialPlayer(selectedDifficulty);
    const newMarket = initializeMarket();
    
    setDifficulty(selectedDifficulty);
    setPlayer(newPlayer);
    setMarket(newMarket);
    setEvents([{
      id: 'start',
      month: 0,
      message: `Игра началась! Стартовый капитал: ${formatMoney(newPlayer.cash)}`,
      type: 'info'
    }]);
  }, []);

  // Автоматическое прохождение времени: 1 игровой месяц = 1 реальная минута
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const playerRef = useRef<Player | null>(null);
  const marketRef = useRef<MarketState | null>(null);
  const eventsRef = useRef<GameEvent[]>([]);
  const missionsRef = useRef(initialMissions);
  const achievementsRef = useRef(achievements);

  // Обновляем refs при изменении состояния
  useEffect(() => {
    playerRef.current = player;
    marketRef.current = market;
    eventsRef.current = events;
    missionsRef.current = missions;
    achievementsRef.current = playerAchievements;
  }, [player, market, events, missions, playerAchievements]);

  useEffect(() => {
    // Запускаем таймер только если игра начата (бессрочная игра)
    if (player && market) {
      intervalRef.current = setInterval(() => {
        const currentPlayer = playerRef.current;
        const currentMarket = marketRef.current;
        const currentEvents = eventsRef.current;

        if (!currentPlayer || !currentMarket) return;

        // Обрабатываем месяц
        const result = processMonth(currentPlayer, currentMarket, currentEvents);
        
        // Проверяем риски на объектах
        result.player.properties.forEach(prop => {
          const risk = checkPropertyRisks(prop, result.player.currentMonth);
          if (risk) {
            // Добавляем событие о риске
            result.events.push({
              id: `risk-${Date.now()}-${prop.id}`,
              month: result.player.currentMonth,
              message: `${risk.name} на объекте ${prop.name}. ${risk.description}`,
              type: 'warning'
            });
          }
        });

        // Обновляем миссии
        const currentMissions = missionsRef.current || initialMissions;
        const updatedMissions = updateMissions(currentMissions, result.player);
        
        // Проверяем новые выполненные миссии для начисления опыта
        updatedMissions.forEach(mission => {
          if (mission.completed && !currentMissions.find(m => m.id === mission.id && m.completed)) {
            result.player.experience += mission.reward;
            result.events.push({
              id: `mission-${Date.now()}-${mission.id}`,
              month: result.player.currentMonth,
              message: `🎯 Миссия выполнена: ${mission.title}! +${mission.reward} опыта`,
              type: 'success'
            });
          }
        });

        // Обновляем достижения
        const currentAchievements = achievementsRef.current || achievements;
        const updatedAchievements = checkAchievements(
          currentAchievements,
          result.player,
          {
            totalSales: result.player.stats.totalSales,
            totalRentIncome: result.player.stats.totalRentIncome
          }
        );

        // Проверяем новые разблокированные достижения
        updatedAchievements.forEach(achievement => {
          if (achievement.unlocked && !currentAchievements.find(a => a.id === achievement.id && a.unlocked)) {
            result.player.experience += 200;
            result.events.push({
              id: `achievement-${Date.now()}-${achievement.id}`,
              month: result.player.currentMonth,
              message: `🏆 Достижение разблокировано: ${achievement.icon} ${achievement.title}! +200 опыта`,
              type: 'success'
            });
          }
        });

        // Рассчитываем уровень
        const levelInfo = calculateLevel(result.player.experience);

        // Обновляем состояние
        setPlayer({
          ...result.player,
          level: levelInfo.level
        });
        setMarket(result.market);
        setEvents(result.events);
        setMissions(updatedMissions);
        setPlayerAchievements(updatedAchievements);
      }, 60000); // 60000 мс = 1 минута

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      // Останавливаем таймер, если игра не начата
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [player, market, missions, playerAchievements]);

  const handleBuyWithCash = useCallback((property: Property) => {
    if (!player) return;
    
    // Открываем модалку торга
    setNegotiationProperty(property);
    setIsNegotiationOpen(true);
  }, [player]);

  const handleNegotiationConfirm = useCallback((price: number) => {
    if (!player || !negotiationProperty) return;

    const negotiation = negotiatePurchase(negotiationProperty, price, player.difficulty);
    
    if (negotiation.success) {
      // Покупаем по согласованной цене
      const propertyWithNewPrice = {
        ...negotiationProperty,
        purchasePrice: negotiation.finalPrice,
        currentValue: negotiation.finalPrice
      };
      
      const result = buyPropertyWithCash(player, propertyWithNewPrice);
      if (result.success) {
        setPlayer(result.player);
        setMarketProperties(prev => prev.filter(p => p.id !== negotiationProperty.id));
        
        // Обновляем миссии после покупки
        const updatedMissions = updateMissions(missions, result.player);
        setMissions(updatedMissions);
        
        setEvents(prev => [...prev, {
          id: `buy-${Date.now()}`,
          month: player.currentMonth,
          message: `${negotiation.message}. ${result.message}`,
          type: 'success'
        }]);
      }
    } else {
      setEvents(prev => [...prev, {
        id: `negotiation-${Date.now()}`,
        month: player.currentMonth,
        message: negotiation.message,
        type: 'warning'
      }]);
    }
    
    setIsNegotiationOpen(false);
    setNegotiationProperty(null);
  }, [player, negotiationProperty, missions]);

  const handleBuyWithMortgage = useCallback((property: Property) => {
    if (!player) return;

    const result = buyPropertyWithMortgage(player, property);
    if (result.success) {
      setPlayer(result.player);
      setMarketProperties(prev => prev.filter(p => p.id !== property.id));
      
      // Обновляем миссии после покупки
      const updatedMissions = updateMissions(missions, result.player);
      setMissions(updatedMissions);
      
      setEvents(prev => [...prev, {
        id: `buy-mortgage-${Date.now()}`,
        month: player.currentMonth,
        message: result.message,
        type: 'success'
      }]);
    } else {
      setEvents(prev => [...prev, {
        id: `error-${Date.now()}`,
        month: player.currentMonth,
        message: result.message,
        type: 'error'
      }]);
    }
  }, [player, missions]);

  const handlePropertyClick = useCallback((property: Property) => {
    setSelectedProperty(property);
    setIsPropertyModalOpen(true);
  }, []);

  const handlePropertyModalClose = useCallback(() => {
    setIsPropertyModalOpen(false);
    setSelectedProperty(null);
  }, []);

  const handleStrategyChange = useCallback((strategy: PropertyStrategy) => {
    if (!player || !selectedProperty) return;

    // Если выбираем flip, открываем модалку для установки цены
    if (strategy === 'flip') {
      setIsFlipPriceOpen(true);
    } else {
      const newPlayer = changePropertyStrategy(player, selectedProperty, strategy);
      setPlayer(newPlayer);
      
      // Обновляем выбранное свойство из нового списка
      const updatedProperty = newPlayer.properties.find(p => p.id === selectedProperty.id);
      if (updatedProperty) {
        setSelectedProperty(updatedProperty);
      }
      
      // Добавляем событие
      setEvents(prev => [...prev, {
        id: `strategy-${Date.now()}`,
        month: player.currentMonth,
        message: `Стратегия для ${selectedProperty.name} изменена на "${strategy === 'hold' ? 'Держать' : strategy === 'rent' ? 'Сдавать в аренду' : 'Перепродавать'}"`,
        type: 'success'
      }]);
    }
  }, [player, selectedProperty]);

  const handleFlipPriceConfirm = useCallback((price: number) => {
    if (!player || !selectedProperty) return;

    const newPlayer = changePropertyStrategy(player, selectedProperty, 'flip', price);
    setPlayer(newPlayer);
    setIsFlipPriceOpen(false);
    
    // Обновляем выбранное свойство из нового списка
    const updatedProperty = newPlayer.properties.find(p => p.id === selectedProperty.id);
    if (updatedProperty) {
      setSelectedProperty(updatedProperty);
    }
    
    setEvents(prev => [...prev, {
      id: `flip-${Date.now()}`,
      month: player.currentMonth,
      message: `✅ ${selectedProperty.name} выставлен на продажу за ${formatMoney(price)}`,
      type: 'success'
    }]);
  }, [player, selectedProperty]);

  const handleRenovation = useCallback((type: "косметика" | "капремонт") => {
    if (!player || !selectedProperty) return;

    const result = startRenovation(player, selectedProperty, type);
    if (result.success) {
      setPlayer(result.player);
      
      // Обновляем выбранное свойство из нового списка
      const updatedProperty = result.player.properties.find(p => p.id === selectedProperty.id);
      if (updatedProperty) {
        setSelectedProperty(updatedProperty);
      }
      
      // Обновляем миссии и достижения после ремонта
      const updatedMissions = updateMissions(missions, result.player);
      const updatedAchievements = checkAchievements(
        playerAchievements,
        result.player,
        {
          totalSales: result.player.stats.totalSales,
          totalRentIncome: result.player.stats.totalRentIncome
        }
      );
      setMissions(updatedMissions);
      setPlayerAchievements(updatedAchievements);
      
      const renovationName = type === 'косметика' ? 'Косметический ремонт' : 'Капитальный ремонт';
      const successMessage = `🔨 ${renovationName} начат на ${selectedProperty.name}`;
      
      // Показываем toast уведомление
      setToast({
        message: successMessage,
        type: 'success',
        isVisible: true
      });
      
      setEvents(prev => [...prev, {
        id: `renovation-${Date.now()}`,
        month: player.currentMonth,
        message: `${successMessage}. ${result.message}`,
        type: 'success'
      }]);
    } else {
      // Показываем заметное уведомление об ошибке
      setToast({
        message: `❌ ${result.message}`,
        type: 'error',
        isVisible: true
      });
      
      setEvents(prev => [...prev, {
        id: `error-${Date.now()}`,
        month: player.currentMonth,
        message: `❌ ${result.message}`,
        type: 'error'
      }]);
    }
  }, [player, selectedProperty, missions, playerAchievements]);

  const handleTakeLoan = useCallback(() => {
    if (!player || !selectedProperty) return;

    const result = takeLoanAgainstProperty(player, selectedProperty);
    if (result.success) {
      setPlayer(result.player);
      
      // Обновляем выбранное свойство из нового списка
      const updatedProperty = result.player.properties.find(p => p.id === selectedProperty.id);
      if (updatedProperty) {
        setSelectedProperty(updatedProperty);
      }
      
      setEvents(prev => [...prev, {
        id: `loan-${Date.now()}`,
        month: player.currentMonth,
        message: `💰 ${result.message}`,
        type: 'success'
      }]);
    } else {
      setEvents(prev => [...prev, {
        id: `error-${Date.now()}`,
        month: player.currentMonth,
        message: `❌ ${result.message}`,
        type: 'error'
      }]);
    }
  }, [player, selectedProperty]);

  const handleRestart = useCallback(() => {
    setDifficulty(null);
    setPlayer(null);
    setMarket(null);
    setMarketProperties(initialMarketProperties);
    setEvents([]);
    setCurrentScreen('dashboard');
    setSelectedProperty(null);
    setIsPropertyModalOpen(false);
  }, []);

  // Показываем селектор сложности, если игра не начата
  if (!difficulty || !player || !market) {
    return <DifficultySelector onSelect={handleDifficultySelect} />;
  }

  // Игра бессрочная, экран окончания игры убран

  // Find loan for selected property
  const selectedPropertyLoan = selectedProperty?.mortgageId
    ? player.loans.find(l => l.id === selectedProperty.mortgageId)
    : undefined;

  return (
    <div className="app">
      {/* Theme Toggle */}
      <div className="app__theme-toggle">
        <ThemeToggle />
      </div>

      {/* Main Content */}
      <div className="app__content">
        {currentScreen === 'dashboard' && (
          <Dashboard
            player={player}
            market={market}
            properties={player.properties}
            onPropertyClick={handlePropertyClick}
          />
        )}
        {currentScreen === 'market' && (
          <MarketScreen
            properties={marketProperties}
            playerCash={player.cash}
            onBuyWithCash={handleBuyWithCash}
            onBuyWithMortgage={handleBuyWithMortgage}
            onNegotiate={(property) => {
              setNegotiationProperty(property);
              setIsNegotiationOpen(true);
            }}
          />
        )}
        {currentScreen === 'events' && (
          <EventsScreen
            events={events}
            onRiskClick={(eventId) => {
              // Находим риск по ID события
              const riskEvent = events.find(e => e.id === eventId);
              if (riskEvent && player) {
                // Находим объект с риском
                const propertyWithRisk = player.properties.find(p =>
                  riskEvent.message.includes(p.name)
                );
                if (propertyWithRisk) {
                  // Создаём временный риск для отображения
                  const tempRisk: PropertyRisk = {
                    id: `temp-${Date.now()}`,
                    propertyId: propertyWithRisk.id,
                    type: 'leak',
                    name: 'Требуется действие',
                    description: riskEvent.message,
                    cost: propertyWithRisk.purchasePrice * 0.03,
                    impact: {},
                    resolved: false,
                    month: player.currentMonth
                  };
                  setActiveRisk(tempRisk);
                  setSelectedProperty(propertyWithRisk);
                  setIsRiskModalOpen(true);
                }
              }
            }}
          />
        )}
        {currentScreen === 'missions' && player && (
          <MissionsPanel
            missions={missions}
            achievements={playerAchievements}
            level={player.level}
            experience={player.experience}
            expToNext={calculateLevel(player.experience).expToNext}
            title={calculateLevel(player.experience).title}
          />
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation
        currentScreen={currentScreen}
        onScreenChange={setCurrentScreen}
      />

      {/* Property Detail Modal */}
      <PropertyDetailModal
        property={selectedProperty}
        isOpen={isPropertyModalOpen}
        onClose={handlePropertyModalClose}
        onStrategyChange={handleStrategyChange}
        onRenovation={handleRenovation}
        onTakeLoan={handleTakeLoan}
        loan={selectedPropertyLoan}
      />

      {/* Negotiation Modal */}
      {negotiationProperty && (
        <NegotiationModal
          property={negotiationProperty}
          isOpen={isNegotiationOpen}
          onClose={() => {
            setIsNegotiationOpen(false);
            setNegotiationProperty(null);
          }}
          onConfirm={handleNegotiationConfirm}
        />
      )}

      {/* Flip Price Modal */}
      {selectedProperty && (
        <FlipPriceModal
          property={selectedProperty}
          isOpen={isFlipPriceOpen}
          onClose={() => setIsFlipPriceOpen(false)}
          onConfirm={handleFlipPriceConfirm}
          marketPrice={selectedProperty.currentValue}
        />
      )}

      {/* Risk Resolution Modal */}
      <RiskResolutionModal
        risk={activeRisk}
        property={selectedProperty}
        isOpen={isRiskModalOpen}
        onClose={() => {
          setIsRiskModalOpen(false);
          setActiveRisk(null);
        }}
        onFix={() => {
          if (player && selectedProperty && activeRisk) {
            const result = resolvePropertyRisk(selectedProperty, activeRisk);
            if (player.cash >= activeRisk.cost) {
              setPlayer({
                ...player,
                cash: player.cash - activeRisk.cost,
                properties: player.properties.map(p =>
                  p.id === selectedProperty.id ? result.property : p
                )
              });
              setEvents(prev => [...prev, {
                id: `risk-fixed-${Date.now()}`,
                month: player.currentMonth,
                message: `Риск "${activeRisk.name}" устранён на ${selectedProperty.name}`,
                type: 'success'
              }]);
            }
            setIsRiskModalOpen(false);
            setActiveRisk(null);
          }
        }}
        onIgnore={() => {
          setIsRiskModalOpen(false);
          setActiveRisk(null);
        }}
        onDelay={() => {
          if (player && selectedProperty && activeRisk) {
            // Ухудшаем ситуацию
            setPlayer({
              ...player,
              properties: player.properties.map(p =>
                p.id === selectedProperty.id
                  ? {
                      ...p,
                      currentValue: Math.max(
                        p.currentValue + (activeRisk.impact.valueChange || 0) * 0.5,
                        p.purchasePrice * 0.7
                      )
                    }
                  : p
              )
            });
            setEvents(prev => [...prev, {
              id: `risk-delayed-${Date.now()}`,
              month: player.currentMonth,
              message: `Риск на ${selectedProperty.name} отложен. Ситуация ухудшилась.`,
              type: 'warning'
            }]);
            setIsRiskModalOpen(false);
            setActiveRisk(null);
          }
        }}
        playerCash={player?.cash || 0}
      />

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
        duration={toast.type === 'error' ? 5000 : 3000}
      />
    </div>
  );
}

export default App;
