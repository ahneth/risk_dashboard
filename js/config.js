// js/config.js
export const FRED_CONFIG = {
  BASE_URL: 'https://api.stlouisfed.org/fred/series/observations',
  API_KEY: localStorage.getItem('FRED_API_KEY') || '',
  BENCHMARK: 'SP500', // FRED S&P 500 series ID
  SERIES: {
    VIX: 'VIXCLS',
    YIELD_CURVE: 'T10Y2Y',
    CREDIT_SPREAD: 'BAMLH0A0HYM2',
    SAHM_RULE: 'SAHMCURRENT',
    NFCI: 'NFCI',
    BREADTH: 'RUI'
  }
};

export const FALLBACK_DATA = {
  // Existing fallback data objects...
  SP500: [
    { date: '2024-09', value: 5600.2 },
    { date: '2024-10', value: 5705.4 },
    { date: '2024-11', value: 5980.1 },
    { date: '2024-12', value: 5880.5 },
    { date: '2025-01', value: 6010.2 },
    { date: '2025-02', value: 5950.0 },
    { date: '2025-03', value: 6080.4 },
    { date: '2025-04', value: 6120.1 },
    { date: '2025-05', value: 6200.5 },
    { date: '2025-06', value: 6250.3 },
    { date: '2025-07', value: 6310.8 },
    { date: '2025-08', value: 6380.2 },
    { date: '2025-09', value: 6420.0 },
    { date: '2025-10', value: 6390.5 },
    { date: '2025-11', value: 6480.9 },
    { date: '2025-12', value: 6520.3 },
    { date: '2026-01', value: 6590.1 },
    { date: '2026-02', value: 6630.0 },
    { date: '2026-03', value: 6580.4 },
    { date: '2026-04', value: 6670.2 },
    { date: '2026-05', value: 6710.8 },
    { date: '2026-06', value: 6750.5 },
    { date: '2026-07', value: 6810.0 },
    { date: '2026-08', value: 6840.2 }
  ]
};
