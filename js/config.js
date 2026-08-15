export const SERIES_IDS = {
  sp500: 'SP500',
  vix: 'VIXCLS',
  yield_curve: 'T10Y2Y',
  credit_spread: 'BAMLH0A0HYM2',
  sahm_rule: 'SAHMREALTIME',
  nfci: 'NFCI',
  stlfsi: 'STLFSI4'
};

export const RISK_THRESHOLDS = {
  vix: (val) => val >= 25.0,
  yield_curve: (val) => val < -0.20,
  credit_spread: (val) => val >= 5.0,
  sahm_rule: (val) => val >= 0.50,
  nfci: (val) => val >= 0.20,
  stlfsi: (val) => val >= 0.50
};
