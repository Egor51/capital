import { useState, useCallback, useEffect, useRef } from 'react';
import { Player, Property, MarketState, GameEvent, PropertyStrategy, PropertyRisk, Mission, Achievement } from './types';
import { formatMoney, changePropertyStrategy } from './utils/gameLogic';
import { 
  startRenovationRealtime,
  buyPropertyWithCashRealtime,
  buyPropertyWithMortgageRealtime,
  takeLoanAgainstPropertyRealtime,
  changePropertyStrategyRealtime
} from './utils/realtimeLogic';
import * as syncStateUtils from './utils/syncState';
import { Dashboard } from './components/mobile/Dashboard';
import { MarketScreen } from './components/mobile/MarketScreen';
import { EventsScreen } from './components/mobile/EventsScreen';
import { MissionsPanel } from './components/mobile/MissionsPanel';
import { BottomNavigation } from './components/mobile/BottomNavigation';
import { updateMissions, checkAchievements, calculateLevel } from './utils/missions';
import { resolvePropertyRisk } from './utils/propertyRisks';
import { negotiatePurchase } from './utils/negotiation';
import { NegotiationModal } from './components/mobile/NegotiationModal';
import { RiskResolutionModal } from './components/mobile/RiskResolutionModal';
import { FlipPriceModal } from './components/mobile/FlipPriceModal';
import { MortgageModal } from './components/mobile/MortgageModal';
import { Toast } from './components/ui/Toast';
import { Notification } from './components/ui/Notification';
import { useGameLoop } from './hooks/useGameLoop';
import { fetchReferenceData, authenticate } from './api/serverApi';
import { hydrateReferenceConfig } from './api/serverConfig';
import { getTelegramUser, getTelegramInitData } from './utils/telegram';
import { AuthState } from './types/auth';
import { initialMissions, achievements as initialAchievements } from './data/missions';
import './styles/global.css';
import './styles/mobile.css';

type Screen = 'dashboard' | 'market' | 'events' | 'missions';

function App() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    telegramId: null,
    playerId: null,
    userName: null
  });
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [player, setPlayer] = useState<Player | null>(null);
  const [market, setMarket] = useState<MarketState | null>(null);
  const [marketProperties, setMarketProperties] = useState<Property[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [playerAchievements, setPlayerAchievements] = useState<Achievement[]>([]);
  
  useEffect(() => {
    let cancelled = false;
    
    async function bootstrap() {
      setIsBootstrapping(true);
      try {
        // Шаг 1: Получаем данные пользователя из Telegram
        const telegramUser = getTelegramUser();
        const initData = getTelegramInitData();

        if (!telegramUser) {
          console.warn('Не удалось получить данные пользователя из Telegram. Используем тестовый режим.');
          // Для разработки: используем тестовый ID
          const testTelegramId = 123456789;
          const authResponse = await authenticate({
            telegramId: testTelegramId,
            initData: initData || undefined
          });

          if (!authResponse.success || !authResponse.playerId) {
            throw new Error(authResponse.message || 'Ошибка авторизации');
          }

          setAuthState({
            isAuthenticated: true,
            telegramId: testTelegramId,
            playerId: authResponse.playerId,
            userName: 'Тестовый игрок'
          });

          // Шаг 2: Загружаем справочные данные и снапшот игрока
          const [reference, snapshot] = await Promise.all([
            fetchReferenceData(),
            syncStateUtils.loadGameState(testTelegramId)
          ]);

          if (cancelled) return;

          if (reference) {
            hydrateReferenceConfig({
              loanPresets: reference.loanPresets,
              rentCoefficients: reference.rentCoefficients,
              priceCoefficients: reference.priceCoefficients,
              marketPhases: reference.marketPhases
            });
            
            // Используем properties из reference как доступные объекты на рынке
            if (reference.properties && reference.properties.length > 0) {
              setMarketProperties(reference.properties);
            }
          }

          if (snapshot) {
            // Проверяем, что snapshot содержит все необходимые данные
            if (!snapshot.player || !snapshot.market) {
              console.error('Снапшот неполный:', snapshot);
              throw new Error('Загруженное состояние игры неполное');
            }
            
            const processedState = syncStateUtils.handleGameEntry(
              testTelegramId,
              snapshot.player,
              snapshot.market,
              snapshot.events || []
            );
            setPlayer(processedState.player);
            setMarket(processedState.market);
            setEvents(processedState.events);
            
            // Используем availableProperties из snapshot, если есть, иначе из reference
            if (snapshot.availableProperties && snapshot.availableProperties.length > 0) {
              setMarketProperties(snapshot.availableProperties);
            } else if (reference && reference.properties && reference.properties.length > 0) {
              setMarketProperties(reference.properties);
            }
            
            // Используем миссии и достижения из snapshot, если есть, иначе начальные
            setMissions(snapshot.missions && snapshot.missions.length > 0 ? snapshot.missions : initialMissions);
            setPlayerAchievements(snapshot.achievements && snapshot.achievements.length > 0 ? snapshot.achievements : initialAchievements);
          } else {
            console.warn('Снапшот игрока не загружен, возможно это новый игрок');
            throw new Error('Не удалось загрузить состояние игры. Попробуйте обновить страницу.');
          }
        } else {
          // Реальная авторизация через Telegram
          const authResponse = await authenticate({
            telegramId: telegramUser.id,
            initData: initData || undefined
          });

          if (!authResponse.success || !authResponse.playerId) {
            throw new Error(authResponse.message || 'Ошибка авторизации');
          }

          setAuthState({
            isAuthenticated: true,
            telegramId: telegramUser.id,
            playerId: authResponse.playerId,
            userName: telegramUser.first_name || 'Игрок'
          });

          // Шаг 2: Загружаем справочные данные и снапшот игрока
          const [reference, snapshot] = await Promise.all([
            fetchReferenceData(),
            syncStateUtils.loadGameState(telegramUser.id)
          ]);

          if (cancelled) return;

          if (reference) {
            hydrateReferenceConfig({
              loanPresets: reference.loanPresets,
              rentCoefficients: reference.rentCoefficients,
              priceCoefficients: reference.priceCoefficients,
              marketPhases: reference.marketPhases
            });
            
            // Используем properties из reference как доступные объекты на рынке
            if (reference.properties && reference.properties.length > 0) {
              setMarketProperties(reference.properties);
            }
          }

          if (snapshot) {
            // Проверяем, что snapshot содержит все необходимые данные
            if (!snapshot.player || !snapshot.market) {
              console.error('Снапшот неполный:', snapshot);
              throw new Error('Загруженное состояние игры неполное');
            }
            
            const processedState = syncStateUtils.handleGameEntry(
              telegramUser.id,
              snapshot.player,
              snapshot.market,
              snapshot.events || []
            );
            setPlayer(processedState.player);
            setMarket(processedState.market);
            setEvents(processedState.events);
            
            // Используем availableProperties из snapshot, если есть, иначе из reference
            if (snapshot.availableProperties && snapshot.availableProperties.length > 0) {
              setMarketProperties(snapshot.availableProperties);
            } else if (reference && reference.properties && reference.properties.length > 0) {
              setMarketProperties(reference.properties);
            }
            
            // Используем миссии и достижения из snapshot, если есть, иначе начальные
            setMissions(snapshot.missions && snapshot.missions.length > 0 ? snapshot.missions : initialMissions);
            setPlayerAchievements(snapshot.achievements && snapshot.achievements.length > 0 ? snapshot.achievements : initialAchievements);
          } else {
            console.warn('Снапшот игрока не загружен, возможно это новый игрок');
            // Если снапшот не загружен, это может быть новый игрок
            // В этом случае нужно создать начальное состояние
            // Но это должно происходить через authenticate, который создаёт игрока
            throw new Error('Не удалось загрузить состояние игры. Попробуйте обновить страницу.');
          }
      }
    } catch (error) {
        console.error('Ошибка инициализации игры:', error);
        setToast({
          message: `Ошибка загрузки: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
          type: 'error',
          isVisible: true
        });
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);
  
  // Интерактивные модалки
  const [isNegotiationOpen, setIsNegotiationOpen] = useState(false);
  const [negotiationProperty, setNegotiationProperty] = useState<Property | null>(null);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [activeRisk, setActiveRisk] = useState<PropertyRisk | null>(null);
  const [isFlipPriceOpen, setIsFlipPriceOpen] = useState(false);
  const [isMortgageModalOpen, setIsMortgageModalOpen] = useState(false);
  const [mortgageProperty, setMortgageProperty] = useState<Property | null>(null);
  
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

  // Push notifications
  const [notification, setNotification] = useState<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    timestamp: number;
  } | null>(null);

  // Инициализация событий при первом запуске
  useEffect(() => {
    if (player && market && events.length === 0) {
      setEvents([{
        id: 'start',
        timestamp: Date.now(),
        message: `Игра началась! Стартовый капитал: ${formatMoney(player.cash)}`,
        type: 'info'
      }]);
    }
  }, [player, market, events.length]);

  // Автоматическая синхронизация состояния
  useEffect(() => {
    if (!player || !market || isBootstrapping || !authState.telegramId) {
      return;
    }

    const stopAutoSync = syncStateUtils.autoSync(
      authState.telegramId,
      player,
      market,
      events,
      {
        missions,
        achievements: playerAchievements,
        availableProperties: marketProperties
      },
      30000
    );
      return stopAutoSync;
  }, [player, market, events, missions, playerAchievements, marketProperties, isBootstrapping, authState.telegramId]);

  const marketPropertiesRef = useRef<Property[]>([]);
  useEffect(() => {
    marketPropertiesRef.current = marketProperties;
  }, [marketProperties]);

  useGameLoop({
    isEnabled: Boolean(player && market && !isBootstrapping),
    player,
    market,
    events,
    missions,
    achievements: playerAchievements,
    availableProperties: marketProperties,
    onStateChange: ({ player: nextPlayer, market: nextMarket, events: nextEvents, missions: nextMissions, achievements: nextAchievements }) => {
      setPlayer(nextPlayer);
      setMarket(nextMarket);
      setEvents(nextEvents);
      setMissions(nextMissions);
      setPlayerAchievements(nextAchievements);
      if (authState.telegramId) {
        void syncStateUtils.saveGameState(authState.telegramId, nextPlayer, nextMarket, nextEvents, {
          missions: nextMissions,
          achievements: nextAchievements,
          availableProperties: marketPropertiesRef.current
        });
      }
    },
    onNotification: (event) => {
            setNotification({
              id: `notif-${event.id}`,
              message: event.message,
              type: event.type,
              timestamp: Date.now()
            });
          }
        });

  const handleBuyWithCash = useCallback((property: Property) => {
    if (!player) return;
    
    // Открываем модалку торга
    setNegotiationProperty(property);
    setIsNegotiationOpen(true);
  }, [player]);

  const handleBuyWithMortgageClick = useCallback((property: Property) => {
    if (!player) return;
    
    setIsMortgageModalOpen(true);
    setMortgageProperty(property);
  }, [player]);

  const handleMortgageConfirm = useCallback(() => {
    if (!player || !mortgageProperty) return;

    const result = buyPropertyWithMortgageRealtime(player, mortgageProperty);
    if (result.success) {
      setPlayer(result.player);
      setMarketProperties(prev => prev.filter(p => p.id !== mortgageProperty.id));
      
      // Обновляем миссии после покупки
      const updatedMissions = updateMissions(missions, result.player);
      setMissions(updatedMissions);
      
      // Добавляем событие
      setEvents(prev => [...prev, {
        id: `buy-mortgage-${Date.now()}`,
        month: player.currentMonth,
        message: result.message,
        type: 'success'
      }]);

      // Показываем уведомление
      setNotification({
        id: `notif-buy-mortgage-${Date.now()}`,
        message: `🏠 ${result.message}`,
        type: 'success',
        timestamp: Date.now()
      });
    } else {
      setEvents(prev => [...prev, {
        id: `error-${Date.now()}`,
        timestamp: Date.now(),
        message: result.message,
        type: 'error'
      }]);

      setNotification({
        id: `notif-error-${Date.now()}`,
        message: `❌ ${result.message}`,
        type: 'error',
        timestamp: Date.now()
      });
    }
    
    setIsMortgageModalOpen(false);
    setMortgageProperty(null);
  }, [player, mortgageProperty, missions]);

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
      
      const result = buyPropertyWithCashRealtime(player, propertyWithNewPrice);
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

        // Показываем уведомление
        setNotification({
          id: `notif-buy-${Date.now()}`,
          message: `🏠 ${result.message}`,
          type: 'success',
          timestamp: Date.now()
        });
      }
    } else {
      setEvents(prev => [...prev, {
        id: `negotiation-${Date.now()}`,
        timestamp: Date.now(),
        message: negotiation.message,
        type: 'warning'
      }]);
    }
    
    setIsNegotiationOpen(false);
    setNegotiationProperty(null);
  }, [player, negotiationProperty, missions]);



  const handleStrategyChange = useCallback((property: Property, strategy: PropertyStrategy) => {
    if (!player) return;

    // Если выбираем flip, открываем модалку для установки цены
    if (strategy === 'flip') {
      setSelectedProperty(property);
      setIsFlipPriceOpen(true);
    } else {
      const updatedPlayer = changePropertyStrategyRealtime(player, property, strategy);
      setPlayer(updatedPlayer);
      
      // Добавляем событие
      setEvents(prev => [...prev, {
        id: `strategy-${Date.now()}`,
        timestamp: Date.now(),
        message: `Стратегия для ${property.name} изменена на "${strategy === 'hold' ? 'Держать' : strategy === 'rent' ? 'Сдавать в аренду' : 'Перепродавать'}"`,
        type: 'success'
      }]);
    }
  }, [player]);

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

    // Показываем уведомление
    setNotification({
      id: `notif-flip-${Date.now()}`,
      message: `💰 ${selectedProperty.name} выставлен на продажу`,
      type: 'success',
      timestamp: Date.now()
    });
  }, [player, selectedProperty]);

  const handleRenovation = useCallback((property: Property, type: "косметика" | "капремонт") => {
    if (!player) return;
    
    // Устанавливаем выбранное свойство для обработки
    setSelectedProperty(property);

    const result = startRenovationRealtime(player, property, type);
    if (result.success) {
      setPlayer(result.player);
      
      // Обновляем выбранное свойство из нового списка
      const updatedProperty = result.player.properties.find(p => p.id === property.id);
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
      const successMessage = `🔨 ${renovationName} начат на ${property.name}`;
      
      // Показываем toast уведомление
      setToast({
        message: successMessage,
        type: 'success',
        isVisible: true
      });
      
      setEvents(prev => [...prev, {
        id: `renovation-${Date.now()}`,
        timestamp: Date.now(),
        message: `${successMessage}. ${result.message}`,
        type: 'success'
      }]);

      // Показываем уведомление
      setNotification({
        id: `notif-renovation-${Date.now()}`,
        message: successMessage,
        type: 'success',
        timestamp: Date.now()
      });
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
  }, [player, missions, playerAchievements]);

  const handleTakeLoan = useCallback((property: Property) => {
    if (!player) return;
    
    // Устанавливаем выбранное свойство для обработки
    setSelectedProperty(property);

    const result = takeLoanAgainstPropertyRealtime(player, property);
    if (result.success) {
      setPlayer(result.player);
      
      // Обновляем выбранное свойство из нового списка
      const updatedProperty = result.player.properties.find(p => p.id === property.id);
      if (updatedProperty) {
        setSelectedProperty(updatedProperty);
      }
      
      setEvents(prev => [...prev, {
        id: `loan-${Date.now()}`,
        timestamp: Date.now(),
        message: `💰 ${result.message}`,
        type: 'success'
      }]);
    } else {
      setEvents(prev => [...prev, {
        id: `error-${Date.now()}`,
        timestamp: Date.now(),
        message: `❌ ${result.message}`,
        type: 'error'
      }]);
    }
  }, [player, selectedProperty]);


  if (isBootstrapping || !player || !market) {
    return (
      <div className="app app--loading">
        <div className="app__content">
          <p>Загружаем данные с сервера...</p>
        </div>
      </div>
    );
  }

  // Игра бессрочная, экран окончания игры убран


  return (
    <div className="app">
      {/* Main Content */}
      <div className="app__content">
        {currentScreen === 'dashboard' && (
          <Dashboard
            player={player}
            market={market}
            properties={player.properties}
            onStrategyChange={handleStrategyChange}
            onRenovation={handleRenovation}
            onTakeLoan={handleTakeLoan}
            loans={player.loans}
          />
        )}
        {currentScreen === 'market' && (
          <MarketScreen
            properties={marketProperties}
            playerCash={player.cash}
            onBuyWithCash={handleBuyWithCash}
            onBuyWithMortgage={handleBuyWithMortgageClick}
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

      {/* Mortgage Modal */}
      {isMortgageModalOpen && mortgageProperty && (
        <MortgageModal
          isOpen={isMortgageModalOpen}
          property={mortgageProperty}
          playerCash={player.cash}
          difficulty={player.difficulty}
          onConfirm={handleMortgageConfirm}
          onClose={() => {
            setIsMortgageModalOpen(false);
            setMortgageProperty(null);
          }}
        />
      )}

      {/* Push Notification */}
      <Notification
        notification={notification}
        onClose={() => setNotification(null)}
        onClick={() => {
          setCurrentScreen('events');
          setNotification(null);
        }}
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
