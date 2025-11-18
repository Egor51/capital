function clone(obj) {
	if (obj === null || obj === undefined) return obj;
	return JSON.parse(JSON.stringify(obj));
}

// Тут должны быть реальные данные

const cities = [
	{
		id: 'murmansk',
		name: 'Мурманск',
		basePriceIndex: 1.0,
		baseRentIndex: 1.0,
		districtModifiers: {
			'Центр': {
				priceMultiplier: 1.2,
				rentMultiplier: 1.15
			},
			'Спальный район': {
				priceMultiplier: 0.9,
				rentMultiplier: 0.95
			},
			'Возле порта': {
				priceMultiplier: 1.1,
				rentMultiplier: 1.2
			},
			'Отдалённый район': {
				priceMultiplier: 0.7,
				rentMultiplier: 0.8
			}
		}
	}
];

const initialMarketProperties = [
	{
		id: "p1",
		name: "Однушка в центре",
		cityId: "murmansk",
		district: "Центр",
		type: "Квартира",
		purchasePrice: 4200000,
		currentValue: 4200000,
		baseRent: 32000,
		condition: "нормальная",
		strategy: "none",
		monthlyExpenses: 5000,
		rentIntervalMs: 60000,
		nextRentAt: null,
		isUnderRenovation: false,
		renovationEndsAt: null
	},
	{
		id: "p2",
		name: "Студия в спальном районе",
		cityId: "murmansk",
		district: "Спальный район",
		type: "Студия",
		purchasePrice: 2800000,
		currentValue: 2800000,
		baseRent: 23000,
		condition: "требует ремонта",
		strategy: "none",
		monthlyExpenses: 4000,
		rentIntervalMs: 60000,
		nextRentAt: null,
		isUnderRenovation: false,
		renovationEndsAt: null
	},
	{
		id: "p3",
		name: "Коммерция возле порта",
		cityId: "murmansk",
		district: "Возле порта",
		type: "Коммерция",
		purchasePrice: 5500000,
		currentValue: 5500000,
		baseRent: 60000,
		condition: "нормальная",
		strategy: "none",
		monthlyExpenses: 12000,
		rentIntervalMs: 60000,
		nextRentAt: null,
		isUnderRenovation: false,
		renovationEndsAt: null
	},
	{
		id: "p4",
		name: "Комната в хрущёвке",
		cityId: "murmansk",
		district: "Спальный район",
		type: "Комната",
		purchasePrice: 1200000,
		currentValue: 1200000,
		baseRent: 14000,
		condition: "убитая",
		strategy: "none",
		monthlyExpenses: 2500,
		rentIntervalMs: 60000,
		nextRentAt: null,
		isUnderRenovation: false,
		renovationEndsAt: null
	},
	{
		id: "p5",
		name: "Студия у набережной",
		cityId: "murmansk",
		district: "Центр",
		type: "Студия",
		purchasePrice: 3500000,
		currentValue: 3500000,
		baseRent: 29000,
		condition: "после ремонта",
		strategy: "none",
		monthlyExpenses: 4500,
		rentIntervalMs: 60000,
		nextRentAt: null,
		isUnderRenovation: false,
		renovationEndsAt: null
	}
];

const loanPresetsByDifficulty = {
	easy: {
		baseInterestRate: 9.5,
		maxLtv: 0.8,
		description: "Мягкий рынок кредитования, низкие ставки."
	},
	normal: {
		baseInterestRate: 12.5,
		maxLtv: 0.75,
		description: "Обычные условия кредитования."
	},
	hard: {
		baseInterestRate: 15.5,
		maxLtv: 0.7,
		description: "Жёсткие условия: высокие ставки, меньше доступный кредит."
	}
};

// Создаем события с timestamps (для примера используем текущее время + смещение)
const now = Date.now();
const ONE_MINUTE = 60000; // 1 минута = 1 игровой месяц

const mockMarketEvents = [
	{
		id: "e1",
		cityId: "murmansk",
		name: "Зимний туристический сезон",
		description: "Всплеск поездок за северным сиянием: растут ставки аренды и загрузка.",
		startsAt: now + (2 * ONE_MINUTE), // Через 2 минуты
		endsAt: now + (6 * ONE_MINUTE),   // Длится 4 минуты
		priceIndexModifier: 0,
		rentIndexModifier: 15,
		vacancyModifier: -10,
		// Устаревшие поля для обратной совместимости
		monthImpactStart: 2,
		durationMonths: 4,
		priceImpactPercent: 0,
		rentImpactPercent: 15,
		vacancyImpactPercent: -10
	},
	{
		id: "e2",
		cityId: "murmansk",
		name: "Лёгкий кризис",
		description: "Небольшой экономический спад, цены немного падают, аренда проседает.",
		startsAt: now + (8 * ONE_MINUTE),
		endsAt: now + (14 * ONE_MINUTE),
		priceIndexModifier: -10,
		rentIndexModifier: -5,
		vacancyModifier: 10,
		monthImpactStart: 8,
		durationMonths: 6,
		priceImpactPercent: -10,
		rentImpactPercent: -5,
		vacancyImpactPercent: 10
	},
	{
		id: "e3",
		cityId: "murmansk",
		name: "Запуск нового ТЦ",
		description: "В одном из спальных районов открывается новый ТЦ, что подтягивает спрос.",
		startsAt: now + (12 * ONE_MINUTE),
		endsAt: now + (20 * ONE_MINUTE),
		priceIndexModifier: 5,
		rentIndexModifier: 5,
		vacancyModifier: -5,
		monthImpactStart: 12,
		durationMonths: 8,
		priceImpactPercent: 5,
		rentImpactPercent: 5,
		vacancyImpactPercent: -5
	}
];

const startingCashByDifficulty = {
	easy: 2000000,
	normal: 1500000,
	hard: 1000000
};

function buildReferenceData() {
	// Собираем districtModifiers из cities
	const districtModifiers = cities.flatMap(city =>
		Object.entries(city.districtModifiers).map(([district, modifiers]) => ({
			cityId: city.id,
			district: district,
			priceMultiplier: modifiers.priceMultiplier,
			rentMultiplier: modifiers.rentMultiplier
		}))
	);

	// Создаём rentCoefficients из districtModifiers
	const rentCoefficients = districtModifiers.reduce((acc, modifier) => {
		acc[`${modifier.cityId}:${modifier.district}:rent`] = modifier.rentMultiplier;
		return acc;
	}, {});

	// Создаём priceCoefficients из districtModifiers
	const priceCoefficients = districtModifiers.reduce((acc, modifier) => {
		acc[`${modifier.cityId}:${modifier.district}:price`] = modifier.priceMultiplier;
		return acc;
	}, {});

	const marketTemplate = {
		priceIndex: 1.0,
		rentIndex: 1.0,
		vacancyRate: 0.05,
	};

	return {
		cities: clone(cities),
		properties: clone(initialMarketProperties),
		districtModifiers: districtModifiers,
		loanPresets: clone(loanPresetsByDifficulty),
		marketEvents: clone(mockMarketEvents),
		marketPhases: ['рост', 'стабильность', 'кризис'],
		marketParameters: {
			priceIndex: marketTemplate.priceIndex,
			rentIndex: marketTemplate.rentIndex,
			vacancyRate: marketTemplate.vacancyRate,
		},
		rentCoefficients: rentCoefficients,
		priceCoefficients: priceCoefficients,
		startingCash: clone(startingCashByDifficulty),
	};
}

const referenceData = buildReferenceData();

return [
	{
		json: referenceData,
	},
];

