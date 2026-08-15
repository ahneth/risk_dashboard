// js/config.js
export const FRED_CONFIG = {
  API_KEY: localStorage.getItem('FRED_API_KEY') || '',
  SERIES: {
    VIX: 'VIXCLS',
    YIELD_CURVE: 'T10Y2Y',
    CREDIT_SPREAD: 'BAMLH0A0HYM2',
    SAHM_RULE: 'SAHMREALTIME',
    NFCI: 'ANFCI',
    STLFSI: 'STLFSI4' // Replaces BREADTH
  },
  BENCHMARK: 'SP500'
};
