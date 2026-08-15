export const FRED_CONFIG = {
  API_KEY: 'YOUR_FRED_API_KEY',
  BASE_URL: 'https://api.stlouisfed.org/fred/series/observations',
  SERIES: {
    VIX: 'VIXCLS',
    YIELD_CURVE: 'T10Y2Y',
    CREDIT_SPREAD: 'BAMLH0A0HYM2',
    SAHM_RULE: 'SAHMREALTIME',
    NFCI: 'NFCI'
  }
};

export const RISK_THRESHOLDS = {
  VIX: { yellow: 20, red: 30 },
  YIELD_CURVE: { yellow: 0, red: -0.5 }, // Inversion triggers
  CREDIT_SPREAD: { yellow: 4.0, red: 6.0 },
  SAHM_RULE: { yellow: 0.3, red: 0.5 }
};

export const FALLBACK_DATA = { /* Local 24-month backup dataset */ };
