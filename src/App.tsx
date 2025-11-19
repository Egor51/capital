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
            console.log('[App] Snapshot получен, обработка данных...', snapshot);
            // Проверяем, что snapshot содержит все необходимые данные
            if (!snapshot.player || !snapshot.market) {
              console.error('[App] Снапшот неполный:', {
                hasPlayer: !!snapshot.player,
                hasMarket: !!snapshot.market,
                snapshotKeys: Object.keys(snapshot)
              });
              throw new Error('Загруженное состояние игры неполное');
            }
            
            console.log('[App] Обработка игрового состояния...');
            const processedState = syncStateUtils.handleGameEntry(
              testTelegramId,
              snapshot.player,
              snapshot.market,
              snapshot.events || []
            );
            
            console.log('[App] Установка состояния игры...');
            console.log('[App] processedState:', {
              hasPlayer: !!processedState.player,
              hasMarket: !!processedState.market,
              playerCash: processedState.player?.cash,
              marketPhase: processedState.market?.phase,
              marketCityId: processedState.market?.cityId
            });
            setPlayer(processedState.player);
            setMarket(processedState.market);
            setEvents(processedState.events);
            console.log('[App] Состояние установлено через setState');
            
            // Используем availableProperties из snapshot, если есть, иначе из reference
            if (snapshot.availableProperties && snapshot.availableProperties.length > 0) {
              console.log('[App] Установка availableProperties из snapshot:', snapshot.availableProperties.length);
              setMarketProperties(snapshot.availableProperties);
            } else if (reference && reference.properties && reference.properties.length > 0) {
              console.log('[App] Установка properties из reference:', reference.properties.length);
              setMarketProperties(reference.properties);
            }
            
            // Используем миссии и достижения из snapshot, если есть, иначе начальные
            setMissions(snapshot.missions && snapshot.missions.length > 0 ? snapshot.missions : initialMissions);
            setPlayerAchievements(snapshot.achievements && snapshot.achievements.length > 0 ? snapshot.achievements : initialAchievements);
            
            console.log('[App] Состояние игры успешно установлено');
          } else {
            console.warn('[App] Снапшот игрока не загружен, возможно это новый игрок');
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
            console.log('[App] Snapshot получен (Telegram), обработка данных...', snapshot);
            // Проверяем, что snapshot содержит все необходимые данные
            if (!snapshot.player || !snapshot.market) {
              console.error('[App] Снапшот неполный:', {
                hasPlayer: !!snapshot.player,
                hasMarket: !!snapshot.market,
                snapshotKeys: Object.keys(snapshot)
              });
              throw new Error('Загруженное состояние игры неполное');
            }
            
            console.log('[App] Обработка игрового состояния (Telegram)...');
            const processedState = syncStateUtils.handleGameEntry(
              telegramUser.id,
              snapshot.player,
              snapshot.market,
              snapshot.events || []
            );
            
            console.log('[App] Установка состояния игры (Telegram)...');
            console.log('[App] processedState (Telegram):', {
              hasPlayer: !!processedState.player,
              hasMarket: !!processedState.market,
              playerCash: processedState.player?.cash,
              marketPhase: processedState.market?.phase,
              marketCityId: processedState.market?.cityId
            });
            setPlayer(processedState.player);
            setMarket(processedState.market);
            setEvents(processedState.events);
            console.log('[App] Состояние установлено через setState (Telegram)');
            
            // Используем availableProperties из snapshot, если есть, иначе из reference
            if (snapshot.availableProperties && snapshot.availableProperties.length > 0) {
              console.log('[App] Установка availableProperties из snapshot (Telegram):', snapshot.availableProperties.length);
              setMarketProperties(snapshot.availableProperties);
            } else if (reference && reference.properties && reference.properties.length > 0) {
              console.log('[App] Установка properties из reference (Telegram):', reference.properties.length);
              setMarketProperties(reference.properties);
            }
            
            // Используем миссии и достижения из snapshot, если есть, иначе начальные
            setMissions(snapshot.missions && snapshot.missions.length > 0 ? snapshot.missions : initialMissions);
            setPlayerAchievements(snapshot.achievements && snapshot.achievements.length > 0 ? snapshot.achievements : initialAchievements);
            
            console.log('[App] Состояние игры успешно установлено (Telegram)');
          } else {
            console.warn('[App] Снапшот игрока не загружен, возможно это новый игрок');
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
          console.log('[App] Завершение bootstrap, установка isBootstrapping = false');
          setIsBootstrapping(false);
          // Проверяем состояние после установки
          setTimeout(() => {
            console.log('[App] Состояние после bootstrap:', {
              hasPlayer: !!player,
              hasMarket: !!market,
              isBootstrapping: false
            });
          }, 100);
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
    if (!player || !mortgageProperty || !authState.telegramId) return;

    const result = buyPropertyWithMortgageRealtime(player, mortgageProperty);
    if (result.success) {
      setPlayer(result.player);
      setMarketProperties(prev => prev.filter(p => p.id !== mortgageProperty.id));
      
      // Обновляем миссии после покупки
      const updatedMissions = updateMissions(missions, result.player);
      setMissions(updatedMissions);
      
      // Добавляем событие
      const newEvents = [...events, {
        id: `buy-mortgage-${Date.now()}`,
        timestamp: Date.now(),
        message: result.message,
        type: 'success' as const
      }];
      setEvents(newEvents);

      // Сохраняем состояние на сервер сразу после покупки
      if (market) {
        syncStateUtils.saveGameState(authState.telegramId, result.player, market, newEvents, {
          missions: updatedMissions,
          achievements: playerAchievements,
          availableProperties: marketProperties.filter(p => p.id !== mortgageProperty.id)
        }).catch(error => {
          console.error('[App] Ошибка сохранения после покупки в ипотеку:', error);
        });
      }

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
  }, [player, mortgageProperty, missions, authState.telegramId, market, events, playerAchievements, marketProperties]);

  const handleNegotiationConfirm = useCallback((price: number) => {
    if (!player || !negotiationProperty || !authState.telegramId) return;

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
        
        const newEvents = [...events, {
          id: `buy-${Date.now()}`,
          timestamp: Date.now(),
          message: `${negotiation.message}. ${result.message}`,
          type: 'success' as const
        }];
        setEvents(newEvents);

        // Сохраняем состояние на сервер сразу после покупки
        if (market) {
          syncStateUtils.saveGameState(authState.telegramId, result.player, market, newEvents, {
            missions: updatedMissions,
            achievements: playerAchievements,
            availableProperties: marketProperties.filter(p => p.id !== negotiationProperty.id)
          }).catch(error => {
            console.error('[App] Ошибка сохранения после покупки за наличные:', error);
          });
        }

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
  }, [player, negotiationProperty, missions, authState.telegramId, market, events, playerAchievements, marketProperties]);



  const handleStrategyChange = useCallback((property: Property, strategy: PropertyStrategy) => {
    if (!player || !authState.telegramId) return;

    // Если выбираем flip, открываем модалку для установки цены
    if (strategy === 'flip') {
      setSelectedProperty(property);
      setIsFlipPriceOpen(true);
    } else {
      const updatedPlayer = changePropertyStrategyRealtime(player, property, strategy);
      setPlayer(updatedPlayer);
      
      const newEvents = [...events, {
        id: `strategy-${Date.now()}`,
        timestamp: Date.now(),
        message: `Стратегия для ${property.name} изменена на "${strategy === 'hold' ? 'Держать' : strategy === 'rent' ? 'Сдавать в аренду' : 'Перепродавать'}"`,
        type: 'success' as const
      }];
      setEvents(newEvents);

      // Сохраняем состояние на сервер
      if (market) {
        syncStateUtils.saveGameState(authState.telegramId, updatedPlayer, market, newEvents, {
          missions,
          achievements: playerAchievements,
          availableProperties: marketProperties
        }).catch(error => {
          console.error('[App] Ошибка сохранения после изменения стратегии:', error);
        });
      }
    }
  }, [player, authState.telegramId, market, events, missions, playerAchievements, marketProperties]);

  const handleFlipPriceConfirm = useCallback((price: number) => {
    if (!player || !selectedProperty || !authState.telegramId) return;

    const newPlayer = changePropertyStrategy(player, selectedProperty, 'flip', price);
    setPlayer(newPlayer);
    setIsFlipPriceOpen(false);
    
    // Обновляем выбранное свойство из нового списка
    const updatedProperty = newPlayer.properties.find(p => p.id === selectedProperty.id);
    if (updatedProperty) {
      setSelectedProperty(updatedProperty);
    }
    
    const newEvents = [...events, {
      id: `flip-${Date.now()}`,
      timestamp: Date.now(),
      message: `✅ ${selectedProperty.name} выставлен на продажу за ${formatMoney(price)}`,
      type: 'success' as const
    }];
    setEvents(newEvents);

    // Сохраняем состояние на сервер
    if (market) {
      syncStateUtils.saveGameState(authState.telegramId, newPlayer, market, newEvents, {
        missions,
        achievements: playerAchievements,
        availableProperties: marketProperties
      }).catch(error => {
        console.error('[App] Ошибка сохранения после выставления на продажу:', error);
      });
    }

    // Показываем уведомление
    setNotification({
      id: `notif-flip-${Date.now()}`,
      message: `💰 ${selectedProperty.name} выставлен на продажу`,
      type: 'success',
      timestamp: Date.now()
    });
  }, [player, selectedProperty, authState.telegramId, market, events, missions, playerAchievements, marketProperties]);

  const handleRenovation = useCallback((property: Property, type: "косметика" | "капремонт") => {
    if (!player || !authState.telegramId) return;
    
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
      
      const newEvents = [...events, {
        id: `renovation-${Date.now()}`,
        timestamp: Date.now(),
        message: `${successMessage}. ${result.message}`,
        type: 'success' as const
      }];
      setEvents(newEvents);

      // Сохраняем состояние на сервер
      if (market) {
        syncStateUtils.saveGameState(authState.telegramId, result.player, market, newEvents, {
          missions: updatedMissions,
          achievements: updatedAchievements,
          availableProperties: marketProperties
        }).catch(error => {
          console.error('[App] Ошибка сохранения после начала ремонта:', error);
        });
      }
      
      // Показываем toast уведомление
      setToast({
        message: successMessage,
        type: 'success',
        isVisible: true
      });

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
        timestamp: Date.now(),
        message: `❌ ${result.message}`,
        type: 'error'
      }]);
    }
  }, [player, missions, playerAchievements, authState.telegramId, market, events, marketProperties]);

  const handleTakeLoan = useCallback((property: Property) => {
    if (!player || !authState.telegramId) return;
    
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
      
      const newEvents = [...events, {
        id: `loan-${Date.now()}`,
        timestamp: Date.now(),
        message: `💰 ${result.message}`,
        type: 'success' as const
      }];
      setEvents(newEvents);

      // Сохраняем состояние на сервер
      if (market) {
        syncStateUtils.saveGameState(authState.telegramId, result.player, market, newEvents, {
          missions,
          achievements: playerAchievements,
          availableProperties: marketProperties
        }).catch(error => {
          console.error('[App] Ошибка сохранения после взятия кредита:', error);
        });
      }
    } else {
      setEvents(prev => [...prev, {
        id: `error-${Date.now()}`,
        timestamp: Date.now(),
        message: `❌ ${result.message}`,
        type: 'error'
      }]);
    }
  }, [player, selectedProperty, authState.telegramId, market, events, missions, playerAchievements, marketProperties]);


  // Логируем состояние перед проверкой
  if (isBootstrapping || !player || !market) {
    console.log('[App] Рендер заблокирован:', {
      isBootstrapping,
      hasPlayer: !!player,
      hasMarket: !!market,
      playerId: player?.id,
      marketPhase: market?.phase
    });
    return (
      <div className="app app--loading">
        <div className="app__content">
          <p>Загружаем данные с сервера...</p>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
            Debug: isBootstrapping={String(isBootstrapping)}, hasPlayer={String(!!player)}, hasMarket={String(!!market)}
          </p>
        </div>
      </div>
    );
  }
  
  console.log('[App] Рендер разрешён, отображаем игру:', {
    hasPlayer: !!player,
    hasMarket: !!market,
    playerCash: player?.cash,
    marketPhase: market?.phase
  });

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
