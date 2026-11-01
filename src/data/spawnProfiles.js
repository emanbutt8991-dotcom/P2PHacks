/*
  "Spawn demo details": fictional company data that fills every signup and
  onboarding section in one click, sized to each subscription tier. Everything
  here is invented, and the workspace it creates is labelled as sample data.
*/

const day = (offset) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)
const id = () => crypto.randomUUID()

const product = (name, category, hsCode, annualQuantity, unitWeightKg, dutyRatePct, specifications) => ({
  id: id(), name, category, hsCode, hsStatus: 'unverified', annualQuantity, unitWeightKg, dutyRatePct, specifications,
})

const supplier = (name, country, city, lat, lon, productIds, quantity, purchaseCost, currency, annualSpend, leadTimeDays, mode, originHub, destHub, annualWeightKg, onTimePct, inlandMode) => ({
  id: id(), name, country, city, lat, lon, locationPrecision: 'city', geocodedFor: `${city}|${country}`,
  productIds, quantity, purchaseCost, currency, annualSpend, leadTimeDays, mode, originHub, destHub, annualWeightKg, onTimePct, inlandMode,
  address: '', certifications: [], qualitySpecs: '',
  compliance: {
    labourCertification: { status: onTimePct > 88 ? 'verified' : 'claimed' },
    audit: { status: 'claimed' },
    safety: { status: 'unknown' },
    policy: { status: 'unknown' },
    dueDiligence: { status: 'unknown' },
  },
})

const STATUSES = [
  ['in_transit', -12, 16],
  ['delayed', -24, 5],
  ['at_port', -30, 2],
  ['dispatched', -3, 24],
  ['booked', 5, 40],
  ['arrived', -62, -28],
  ['in_transit', -9, 19],
  ['in_transit', -2, 3],
]

function shipmentsFor(prefix, suppliers, count) {
  return Array.from({ length: count }, (_, i) => {
    const s = suppliers[i % suppliers.length]
    const [status, etd, eta] = STATUSES[i % STATUSES.length]
    return {
      id: id(), reference: `${prefix}-${1001 + i}`, direction: 'import', supplierId: s.id, productId: s.productIds[0], mode: s.mode,
      originHub: s.originHub, destHub: s.destHub, inlandMode: s.inlandMode, carrier: 'Sample Freight Co.', weightKg: Math.round(s.annualWeightKg / 8),
      quantity: Math.round(s.quantity / 8), containerNo: s.mode === 'sea' ? `SMPL${100000 + i}` : '', awb: s.mode === 'air' ? `999-${10000000 + i}` : '',
      etd: day(etd), eta: day(eta), status, cost: Math.round(s.annualWeightKg / 3), currency: 'CAD', dataSource: 'demo',
    }
  })
}

function free() {
  const p = [
    product('Roasted coffee beans', 'Coffee', '0901.21', 18_000, 1, 0, '1 kg bags, medium roast'),
    product('Black tea', 'Tea', '0902.30', 9_000, 0.25, 0, 'Retail packs of 250 g'),
  ]
  const suppliers = [
    supplier('Sierra Alta Coffee Exporters', 'MX', 'Veracruz', 19.17, -96.13, [p[0].id], 18_000, 11.4, 'USD', 205_000, 24, 'road', '', '', 18_000, 91),
    supplier('Colombo Lanka Leaf Traders', 'LK', 'Colombo', 6.93, 79.85, [p[1].id], 9_000, 6.2, 'USD', 62_000, 58, 'sea', 'LKCMB', 'CAHAL', 2_250, 86),
    supplier('Mekong Valley Roasters', 'VN', 'Da Nang', 16.07, 108.22, [p[0].id], 6_000, 9.8, 'USD', 66_000, 52, 'sea', 'VNSGN', 'CAVAN', 6_000, 88, 'rail'),
  ]
  return {
    name: 'Harbour Lane Provisions', industry: 'food', city: 'Halifax', province: 'NS', warehouseCity: 'Dartmouth', warehouseProvince: 'NS', activity: 'import',
    categories: 'Coffee, Tea', products: p, suppliers, preferredModes: ['sea', 'road'], inventoryDays: '28', leadTimeDays: '45', dailyShortfallCost: '900',
    finance: { mode: 'exact', currency: 'CAD', quick: {}, exact: { importSpend: 465_000, freightSpend: 41_500, tariffsAndFees: 6_200, warehousing: 22_000 } },
    shipments: shipmentsFor('HL', suppliers, 4), alternatives: [],
  }
}

function pro() {
  const p = [
    product('Cotton hoodies', 'Knitwear', '6110.20', 60_000, 0.55, 18, 'Brushed cotton fleece'),
    product('Canvas tote bags', 'Accessories', '4202.92', 45_000, 0.3, 8, '12 oz cotton canvas'),
    product('Wool blend sweaters', 'Knitwear', '6110.11', 18_000, 0.5, 16, '14 gauge wool blend'),
  ]
  const suppliers = [
    supplier('Chattogram Delta Knits', 'BD', 'Gazipur', 24.0, 90.42, [p[0].id], 60_000, 12.5, 'USD', 1_047_000, 88, 'sea', 'BDCGP', 'CAMTR', 33_000, 82),
    supplier('Izmir Aegean Textiles', 'TR', 'Izmir', 38.42, 27.14, [p[1].id], 45_000, 5.9, 'EUR', 414_000, 49, 'sea', 'TRAMR', 'CAMTR', 13_500, 90),
    supplier('Porto Norte Knitwear', 'PT', 'Porto', 41.15, -8.61, [p[2].id], 18_000, 26, 'EUR', 729_000, 30, 'air', 'OPO', 'YUL', 9_000, 95),
    supplier('Saigon Lotus Garments', 'VN', 'Bien Hoa', 10.95, 106.82, [p[0].id], 20_000, 11.8, 'USD', 329_000, 70, 'sea', 'VNSGN', 'CAVAN', 11_000, 87, 'rail'),
    supplier('Bursa Silk Road Apparel', 'TR', 'Bursa', 40.19, 29.06, [p[1].id], 12_000, 6.4, 'EUR', 120_000, 52, 'sea', 'TRAMR', 'CAMTR', 3_600, 89),
  ]
  return {
    name: 'Cedar Ridge Outfitters', industry: 'apparel', city: 'Calgary', province: 'AB', warehouseCity: 'Calgary', warehouseProvince: 'AB', activity: 'import',
    categories: 'Knitwear, Accessories', products: p, suppliers, preferredModes: ['sea', 'air'], inventoryDays: '32', leadTimeDays: '66', dailyShortfallCost: '5500',
    finance: { mode: 'exact', currency: 'CAD', quick: {}, exact: { importSpend: 2_640_000, freightSpend: 238_000, tariffsAndFees: 311_000, warehousing: 96_000, insurance: 14_000 } },
    shipments: shipmentsFor('CR', suppliers, 8),
    alternatives: [{
      id: id(), kind: 'canadian', name: 'Foothills Knit Collective', source: 'demo', city: 'Edmonton', province: 'AB', country: 'CA', lat: 53.55, lon: -113.49,
      productId: p[0].id, productType: 'Cut-and-sew knitwear', specifications: 'Cotton fleece, small runs', certifications: [], unitPrice: 24.5, currency: 'CAD',
      leadTimeDays: 24, moq: 2_500, specMatch: 0.8, mode: 'road',
      compliance: { labourCertification: 'verified', audit: 'verified', safety: 'verified', policy: 'claimed', dueDiligence: 'claimed' },
    }],
  }
}

function enterprise() {
  const p = [
    product('Stainless cookware sets', 'Cookware', '7323.93', 120_000, 4.2, 6.5, '18/10 stainless'),
    product('LED ceiling luminaires', 'Lighting', '9405.11', 80_000, 1.6, 7, 'cUL listed, 3000K'),
    product('Upholstered dining chairs', 'Furniture', '9401.61', 26_000, 8.5, 9.5, 'Wood frame, performance fabric'),
    product('Porcelain dinnerware', 'Tableware', '6911.10', 40_000, 8, 7, '16-piece set'),
  ]
  const suppliers = [
    supplier('Ningbo Grand Canal Metalworks', 'CN', 'Ningbo', 29.87, 121.55, [p[0].id], 120_000, 29, 'CAD', 3_480_000, 62, 'sea', 'CNNGB', 'CAVAN', 504_000, 90, 'rail'),
    supplier('Shenzhen Harbourlight Electronics', 'CN', 'Shenzhen', 22.54, 114.06, [p[1].id], 80_000, 21, 'USD', 2_345_000, 55, 'sea', 'CNSHK', 'CAPRR', 128_000, 88, 'rail'),
    supplier('Binh Duong Timberline Furniture', 'VN', 'Binh Duong', 10.98, 106.65, [p[2].id], 26_000, 74, 'USD', 2_686_000, 78, 'sea', 'VNSGN', 'CAVAN', 221_000, 83, 'rail'),
    supplier('Monterrey Norte Manufacturing', 'MX', 'Monterrey', 25.69, -100.32, [p[1].id], 20_000, 24, 'USD', 670_000, 18, 'road', '', '', 32_000, 94),
    supplier('Thuringia Porzellan Werke', 'DE', 'Erfurt', 50.98, 11.03, [p[3].id], 40_000, 31, 'EUR', 1_932_000, 41, 'sea', 'DEHAM', 'CAMTR', 320_000, 96),
    supplier('Laem Chabang Pacific Homeware', 'TH', 'Chonburi', 13.36, 100.98, [p[3].id], 10_000, 26, 'USD', 363_000, 64, 'sea', 'THLCH', 'CAVAN', 80_000, 86, 'rail'),
  ]
  return {
    name: 'Trans-Canada Homeworks', industry: 'home', city: 'Toronto', province: 'ON', warehouseCity: 'Vaughan', warehouseProvince: 'ON', activity: 'both',
    categories: 'Cookware, Lighting, Furniture, Tableware', products: p, suppliers, preferredModes: ['sea', 'road', 'rail'], inventoryDays: '38', leadTimeDays: '58', dailyShortfallCost: '18000',
    finance: { mode: 'exact', currency: 'CAD', quick: {}, exact: { importSpend: 11_480_000, exportRevenue: 1_250_000, freightSpend: 1_120_000, tariffsAndFees: 690_000, warehousing: 610_000, insurance: 84_000, logistics: 142_000 } },
    shipments: shipmentsFor('TC', suppliers, 12),
    alternatives: [{
      id: id(), kind: 'canadian', name: 'Niagara Steelcraft Works', source: 'demo', city: 'St. Catharines', province: 'ON', country: 'CA', lat: 43.16, lon: -79.24,
      productId: p[0].id, productType: 'Stainless cookware', specifications: '18/8 stainless, induction base', certifications: ['ISO 9001 (demo record)'], unitPrice: null, currency: 'CAD',
      leadTimeDays: 28, moq: 5_000, specMatch: 0.75, mode: 'road',
      compliance: { labourCertification: 'verified', audit: 'claimed', safety: 'verified', policy: 'unknown', dueDiligence: 'unknown' },
    }],
  }
}

const PROFILES = { free, pro, enterprise }

export const spawnCompanyName = { free: 'Harbour Lane Provisions', pro: 'Cedar Ridge Outfitters', enterprise: 'Trans-Canada Homeworks' }

/** A complete onboarding draft for a tier. */
export function spawnDetails(plan) {
  const { shipments, alternatives, ...details } = (PROFILES[plan] ?? free)()
  return { ...details, supplierCount: String(details.suppliers.length), spawned: { plan, shipments, alternatives } }
}
