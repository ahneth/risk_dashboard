// js/config.js
export const FRED_CONFIG = {
  get API_KEY() {
    return localStorage.getItem('FRED_API_KEY') || '';
  },
  BASE_URL: 'https://api.stlouisfed.org/fred/series/observations',
  SERIES: {
    VIX: 'VIXCLS',
    YIELD_CURVE: 'T10Y2Y',
    CREDIT_SPREAD: 'BAMLH0A0HYM2',
    SAHM_RULE: 'SAHMREALTIME',
    NFCI: 'NFCI',
    BREADTH: 'S5COND'
  }
};

export const RISK_THRESHOLDS = {
  VIX: { yellow: 20, red: 30 },
  YIELD_CURVE: { yellow: 0, red: -0.5 },
  CREDIT_SPREAD: { yellow: 4.0, red: 6.0 },
  SAHM_RULE: { yellow: 0.3, red: 0.5 },
  NFCI: { yellow: 0.0, red: 0.5 },
  BREADTH: { yellow: 50, red: 40 }
};

// Local emergency fallback generator
function generateMockHistory(baseVal) {
  const data = [];
  const now = new Date();
  for (let i = 24; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    data.push({
      date: d.toISOString().split('T')[0],
      value: +(baseVal + (Math.random() * 2 - 1)).toFixed(2)
    });
  }
  return data;
}

export const FALLBACK_DATA = {
  VIX: generateMockHistory(18.5),
  YIELD_CURVE: generateMockHistory(0.15),
  CREDIT_SPREAD: generateMockHistory(3.8),
  SAHM_RULE: generateMockHistory(0.2),
  NFCI: generateMockHistory(-0.4),
  BREADTH: generateMockHistory(62.0)
};
