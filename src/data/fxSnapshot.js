// Bank of Canada daily average rates (CAD per unit), captured once during development.
// Used only when /api/fx is unreachable, and always labelled as a dated snapshot.
// VND is absent on purpose: Bank of Canada stopped publishing that series in 2019.
export const FX_SNAPSHOT = {
  rates: {
    CAD: 1, USD: 1.396, EUR: 1.5582, GBP: 1.8699, CNY: 0.2098, JPY: 0.00887, KRW: 0.001046, TWD: 0.0428,
    HKD: 0.1779, INR: 0.01471, MXN: 0.07414, THB: 0.04135, MYR: 0.3441, SGD: 1.0922, IDR: 0.000077,
    TRY: 0.0279, AUD: 0.9813, BRL: 0.2569, PLN: 0.3539,
  },
  asOf: '2026-10-30',
  source: 'Bank of Canada (bundled snapshot, not live)',
  sourceUrl: 'https://www.bankofcanada.ca/rates/exchange/daily-exchange-rates/',
  retrievedAt: null,
  live: false,
}

// These can be recorded, but have no sourced rate, so they are flagged and left out of CAD totals.
const UNCONVERTED = ['VND', 'BDT', 'PKR', 'LKR']

export const CURRENCIES = [...Object.keys(FX_SNAPSHOT.rates), ...UNCONVERTED]
