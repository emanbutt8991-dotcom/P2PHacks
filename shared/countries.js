/*
  Country reference data for sourcing comparisons.

  What is here, and how far to trust it:
  - lat/lon: approximate country centroids. Used only when a supplier's city is unknown.
  - agreement: Canadian trade agreement or scheme that may be relevant. It does not
    mean a preferential rate applies: that depends on the product, origin rules
    and proof of origin.
  - hazard: ocean basin or hazard exposure as a general geographic fact.
  - ituc: ITUC Global Rights Index rating (1 best, 5+ worst), only where it was
    verified from a published source during development. null means "not on file",
    not "low risk". A country rating says nothing about any individual supplier.
*/

const c = (code, name, lat, lon, region, currency, hub, air, agreement, hazard, ituc = null) => ({
  code, name, lat, lon, region, currency, hub, air, agreement, hazard, ituc,
})

const TYPHOON = 'Western Pacific typhoon basin'
const CYCLONE = 'North Indian Ocean cyclone basin'
const ATLANTIC = 'Atlantic hurricane basin'
const PACIFIC_E = 'Eastern Pacific hurricane basin'
const NONE = 'No tropical-cyclone basin at main port'

export const COUNTRIES = [
  c('CA', 'Canada', 56.1, -106.3, 'North America', 'CAD', 'CAMTR', 'YYZ', 'Domestic', 'Winter weather and wildfire disruptions to inland corridors'),
  c('US', 'United States', 39.8, -98.6, 'North America', 'USD', 'USLAX', 'JFK', 'CUSMA', ATLANTIC),
  c('MX', 'Mexico', 23.6, -102.5, 'North America', 'MXN', 'MXZLO', 'MEX', 'CUSMA, CPTPP', PACIFIC_E, '3'),
  c('CN', 'China', 35.9, 104.2, 'East Asia', 'CNY', 'CNSHA', 'PVG', 'None; check MFN and any surtax measures', TYPHOON, '5'),
  c('HK', 'Hong Kong', 22.3, 114.2, 'East Asia', 'HKD', 'CNSHK', 'HKG', 'None; check origin rules', TYPHOON),
  c('TW', 'Taiwan', 23.7, 121.0, 'East Asia', 'TWD', 'TWKHH', 'TPE', 'None', TYPHOON),
  c('KR', 'South Korea', 36.5, 127.9, 'East Asia', 'KRW', 'KRPUS', 'ICN', 'Canada-Korea FTA', TYPHOON),
  c('JP', 'Japan', 36.2, 138.3, 'East Asia', 'JPY', 'JPYOK', 'NRT', 'CPTPP', TYPHOON),
  c('VN', 'Vietnam', 14.1, 108.3, 'Southeast Asia', 'VND', 'VNHPH', 'HAN', 'CPTPP', TYPHOON, '4'),
  c('TH', 'Thailand', 15.9, 101.0, 'Southeast Asia', 'THB', 'THLCH', 'BKK', 'None', NONE),
  c('MY', 'Malaysia', 4.2, 102.0, 'Southeast Asia', 'MYR', 'MYPKG', 'KUL', 'CPTPP', NONE),
  c('SG', 'Singapore', 1.35, 103.8, 'Southeast Asia', 'SGD', 'SGSIN', 'SIN', 'CPTPP', NONE),
  c('ID', 'Indonesia', -2.5, 118.0, 'Southeast Asia', 'IDR', 'IDTPP', 'CGK', 'None', NONE),
  c('KH', 'Cambodia', 12.6, 105.0, 'Southeast Asia', 'USD', 'KHKOS', 'PNH', 'Check LDCT eligibility', NONE),
  c('IN', 'India', 20.6, 79.0, 'South Asia', 'INR', 'INNSA', 'BOM', 'None in force; check current status', CYCLONE, '5'),
  c('BD', 'Bangladesh', 23.7, 90.4, 'South Asia', 'BDT', 'BDCGP', 'DAC', 'Check LDCT eligibility and graduation status', CYCLONE, '5'),
  c('LK', 'Sri Lanka', 7.9, 80.8, 'South Asia', 'LKR', 'LKCMB', 'CMB', 'None', CYCLONE),
  c('PK', 'Pakistan', 30.4, 69.3, 'South Asia', 'PKR', 'PKKHI', 'KHI', 'None', CYCLONE),
  c('TR', 'Türkiye', 39.0, 35.2, 'Europe and Mediterranean', 'TRY', 'TRAMR', 'IST', 'None', NONE, '5'),
  c('DE', 'Germany', 51.2, 10.4, 'Europe and Mediterranean', 'EUR', 'DEHAM', 'FRA', 'CETA', NONE),
  c('NL', 'Netherlands', 52.1, 5.3, 'Europe and Mediterranean', 'EUR', 'NLRTM', 'AMS', 'CETA', NONE),
  c('BE', 'Belgium', 50.5, 4.5, 'Europe and Mediterranean', 'EUR', 'BEANR', 'BRU', 'CETA', NONE),
  c('IT', 'Italy', 41.9, 12.6, 'Europe and Mediterranean', 'EUR', 'ITGOA', 'MXP', 'CETA', NONE),
  c('PT', 'Portugal', 39.4, -8.2, 'Europe and Mediterranean', 'EUR', 'PTLEI', 'OPO', 'CETA', NONE),
  c('PL', 'Poland', 51.9, 19.1, 'Europe and Mediterranean', 'PLN', 'PLGDY', 'WAW', 'CETA', NONE),
  c('GB', 'United Kingdom', 55.4, -3.4, 'Europe and Mediterranean', 'GBP', 'GBFXT', 'LHR', 'Canada-UK TCA, CPTPP', NONE),
  c('BR', 'Brazil', -14.2, -51.9, 'South America', 'BRL', 'BRSSZ', 'GRU', 'None', NONE),
  c('AU', 'Australia', -25.3, 133.8, 'Oceania', 'AUD', 'AUSYD', 'SYD', 'CPTPP', NONE),
]

const BY_CODE = new Map(COUNTRIES.map((x) => [x.code, x]))

export const countryOf = (code) => BY_CODE.get(code) ?? null
export const countryName = (code) => BY_CODE.get(code)?.name ?? code ?? 'Unknown'

export const SOURCES = {
  ituc: {
    label: 'ITUC Global Rights Index 2025',
    url: 'https://www.ituc-csi.org/global-rights-index-2025',
    scale: '1 (sporadic violations) to 5+ (no guarantee of rights due to breakdown of rule of law)',
  },
  dol: {
    label: 'US Department of Labor, List of Goods Produced by Child Labor or Forced Labor',
    url: 'https://www.dol.gov/agencies/ilab/reports/child-labor/list-of-goods',
  },
  s211: {
    label: 'Canada: Fighting Against Forced Labour and Child Labour in Supply Chains Act',
    url: 'https://www.publicsafety.gc.ca/cnt/cntrng-crm/frcd-lbr-cndn-spply-chns/index-en.aspx',
  },
  tariff: {
    label: 'CBSA Customs Tariff schedules',
    url: 'https://www.cbsa-asfc.gc.ca/trade-commerce/tariff-tarif/menu-eng.html',
  },
}

/*
  Verified goods flags for labour-risk screening. Deliberately short: only
  entries confirmed from the US DOL 2024 list during development. Absence here
  means Waymark has no entry, not that a product is free of risk.
*/
export const GOODS_FLAGS = [
  { country: 'CN', chapters: ['50', '51', '52', '53', '54', '55', '56', '60', '61', '62', '63'], note: 'US DOL 2024 list includes garments and textiles (cotton) from China.' },
  { country: 'VN', chapters: ['52', '60', '61', '62', '63'], note: 'US DOL 2024 list includes cotton textile products from Vietnam made with Chinese cotton (downstream goods).' },
]

export function goodsFlag(countryCode, hsCode) {
  const chapter = (hsCode ?? '').replace(/\D/g, '').slice(0, 2)
  if (!chapter) return null
  return GOODS_FLAGS.find((f) => f.country === countryCode && f.chapters.includes(chapter)) ?? null
}
