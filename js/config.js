// js/config.js
export const FRED_CONFIG = {
  BASE_URL: 'https://api.stlouisfed.org/fred/series/observations',
  API_KEY: localStorage.getItem('FRED_API_KEY') || '',
  BENCHMARK: 'SP500',
  SERIES: {
    VIX: 'VIXCLS',
    YIELD_CURVE: 'T10Y2Y',
    CREDIT_SPREAD: 'BAMLH0A0HYM2',
    SAHM_RULE: 'SAHMCURRENT',
    NFCI: 'NFCI',
    BREADTH: 'NASDAQCOM' // Unrestricted FRED equity series
  }
};
