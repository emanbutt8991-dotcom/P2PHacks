/*
  Two entirely fictional demo companies. Every business name, supplier, quantity,
  price, reference and event here is invented and is labelled Demo Data in the UI.
  Real places (ports, cities) are used only so routes draw sensibly.
  Dates are relative to "today" so the demo always has live-looking schedules,
  and they are generated, not tracked.
*/

const DAY = 86_400_000
const day = (offset) => new Date(Date.now() + offset * DAY).toISOString().slice(0, 10)
const at = (offset, hour = 14) => new Date(Date.now() + offset * DAY + hour * 3_600_000).toISOString()

const docs = (labourCertification, audit, safety, policy, dueDiligence) => ({
  labourCertification: { status: labourCertification },
  audit: { status: audit },
  safety: { status: safety },
  policy: { status: policy },
  dueDiligence: { status: dueDiligence },
})

const event = (id, shipmentId, offset, type, message) => ({
  id, shipmentId, at: at(offset), type, message, source: 'Simulated demo event', simulated: true,
})

function mapleTrail() {
  const company = {
    id: 'demo-maple',
    name: 'Maple Trail Home Goods',
    tagline: 'Fictional Ontario importer of cookware and household goods',
    isDemo: true,
    onboardingComplete: true,
    industry: 'home',
    activity: 'both',
    hq: { city: 'Mississauga', province: 'ON', lat: 43.59, lon: -79.64 },
    categories: ['Cookware', 'Household goods'],
    preferredModes: ['sea', 'road'],
    finance: {
      mode: 'exact',
      currency: 'CAD',
      quick: { importSpend: '1m-5m', freightSpend: '100k-500k', inventoryBuffer: '30-60' },
      exact: {
        importSpend: 2_840_000, freightSpend: 312_000, exportRevenue: 190_000, tariffsAndFees: 96_000,
        warehousing: 118_000, insurance: 21_500, logistics: 34_000, inventoryCarrying: 88_000,
      },
    },
    operations: { leadTimeDays: 68, inventoryDays: 24, dailyShortfallCost: 4000 },
  }
  const warehouses = [
    { id: 'mt-wh-1', name: 'Brampton Distribution Centre', city: 'Brampton', province: 'ON', lat: 43.73, lon: -79.76 },
    { id: 'mt-wh-2', name: 'Delta Overflow Warehouse', city: 'Delta', province: 'BC', lat: 49.09, lon: -123.03 },
  ]
  const products = [
    { id: 'mt-p-1', name: 'Stainless-steel cookware sets', category: 'Cookware', hsCode: '7323.93', hsStatus: 'unverified', specifications: '18/10 stainless, induction base, 5-piece set', unit: 'sets', annualQuantity: 42_000, unitWeightKg: 4.2, dutyRatePct: 6.5 },
    { id: 'mt-p-2', name: 'Non-stick aluminium frying pans', category: 'Cookware', hsCode: '7615.10', hsStatus: 'unverified', specifications: 'PFOA-free coating, 28 cm', unit: 'units', annualQuantity: 58_000, unitWeightKg: 1.1, dutyRatePct: 6.5 },
    { id: 'mt-p-3', name: 'Ceramic dinnerware', category: 'Household goods', hsCode: '6912.00', hsStatus: 'confirmed', specifications: 'Stoneware, dishwasher-safe, 16-piece', unit: 'sets', annualQuantity: 16_000, unitWeightKg: 9.5, dutyRatePct: 7 },
    { id: 'mt-p-4', name: 'Kitchen utensil sets', category: 'Household goods', hsCode: '', hsStatus: 'unverified', specifications: 'Stainless and silicone, 8-piece', unit: 'sets', annualQuantity: 30_000, unitWeightKg: 0.9, dutyRatePct: null },
  ]
  const suppliers = [
    {
      id: 'mt-s-1', name: 'Saigon Riverline Metalworks', country: 'VN', city: 'Binh Duong', lat: 10.98, lon: 106.65, locationPrecision: 'city',
      productIds: ['mt-p-1'], quantity: 42_000, purchaseCost: 31.5, currency: 'CAD', annualSpend: 1_323_000, sharePct: 47, leadTimeDays: 72,
      mode: 'sea', originHub: 'VNSGN', destHub: 'CAVAN', inlandMode: 'rail', warehouseId: 'mt-wh-1', annualWeightKg: 176_400, onTimePct: 86,
      qualitySpecs: 'AQL 2.5, 18/10 stainless mill certificates', certifications: ['ISO 9001 (demo record)'],
      compliance: docs('claimed', 'verified', 'claimed', 'unknown', 'unknown'),
    },
    {
      id: 'mt-s-2', name: 'Haiphong Blue Harbour Kitchenware', country: 'VN', city: 'Hai Phong', lat: 20.86, lon: 106.68, locationPrecision: 'city',
      productIds: ['mt-p-2'], quantity: 58_000, purchaseCost: 12.4, currency: 'USD', annualSpend: 512_000, sharePct: 25, leadTimeDays: 64,
      mode: 'sea', originHub: 'VNHPH', destHub: 'CAVAN', inlandMode: 'rail', warehouseId: 'mt-wh-1', annualWeightKg: 63_800, onTimePct: 91,
      qualitySpecs: 'Coating adhesion test each lot', certifications: [],
      compliance: docs('unknown', 'claimed', 'unknown', 'unknown', 'unknown'),
    },
    {
      id: 'mt-s-3', name: 'Ningbo East Gate Homeware', country: 'CN', city: 'Ningbo', lat: 29.87, lon: 121.55, locationPrecision: 'city',
      productIds: ['mt-p-4'], quantity: 30_000, purchaseCost: 7.1, currency: 'CAD', annualSpend: 213_000, sharePct: 8, leadTimeDays: 58,
      mode: 'sea', originHub: 'CNNGB', destHub: 'CAVAN', inlandMode: 'rail', warehouseId: 'mt-wh-1', annualWeightKg: 27_000, onTimePct: 93,
      qualitySpecs: 'Food-contact silicone declaration', certifications: ['BSCI audit (demo record)'],
      compliance: docs('verified', 'verified', 'claimed', 'claimed', 'unknown'),
    },
    {
      id: 'mt-s-4', name: 'Foshan Lantern Ceramics', country: 'CN', city: 'Foshan', lat: 23.02, lon: 113.12, locationPrecision: 'city',
      productIds: ['mt-p-3'], quantity: 16_000, purchaseCost: 27, currency: 'CAD', annualSpend: 432_000, sharePct: 15, leadTimeDays: 76,
      mode: 'sea', originHub: 'CNSHK', destHub: 'CAPRR', inlandMode: 'rail', warehouseId: 'mt-wh-1', annualWeightKg: 152_000, onTimePct: 82,
      qualitySpecs: 'Lead and cadmium leach test', certifications: [],
      compliance: docs('unknown', 'unknown', 'unknown', 'unknown', 'unknown'),
    },
  ]
  const shipments = [
    { id: 'mt-sh-1', reference: 'MT-2041', direction: 'import', supplierId: 'mt-s-1', productId: 'mt-p-1', mode: 'sea', originHub: 'VNSGN', destHub: 'CAVAN', inlandMode: 'rail', warehouseId: 'mt-wh-1', carrier: 'Demo Ocean Line', weightKg: 18_400, quantity: 4_380, containerNo: 'DEMU2041007', etd: day(-19), eta: day(12), status: 'in_transit', cost: 11_800, currency: 'CAD', dataSource: 'demo' },
    { id: 'mt-sh-2', reference: 'MT-2042', direction: 'import', supplierId: 'mt-s-2', productId: 'mt-p-2', mode: 'sea', originHub: 'VNHPH', destHub: 'CAVAN', inlandMode: 'rail', warehouseId: 'mt-wh-1', carrier: 'Demo Ocean Line', weightKg: 14_200, quantity: 12_900, containerNo: 'DEMU2042113', etd: day(-27), eta: day(6), status: 'delayed', cost: 9_400, currency: 'CAD', dataSource: 'demo' },
    { id: 'mt-sh-3', reference: 'MT-2043', direction: 'import', supplierId: 'mt-s-3', productId: 'mt-p-4', mode: 'sea', originHub: 'CNNGB', destHub: 'CAVAN', inlandMode: 'rail', warehouseId: 'mt-wh-2', carrier: 'Demo Pacific Lines', weightKg: 6_100, quantity: 6_700, containerNo: 'DEMU2043288', etd: day(-5), eta: day(22), status: 'dispatched', cost: 4_300, currency: 'CAD', dataSource: 'demo' },
    { id: 'mt-sh-4', reference: 'MT-2044', direction: 'import', supplierId: 'mt-s-4', productId: 'mt-p-3', mode: 'sea', originHub: 'CNSHK', destHub: 'CAPRR', inlandMode: 'rail', warehouseId: 'mt-wh-1', carrier: 'Demo Pacific Lines', weightKg: 19_000, quantity: 2_000, containerNo: 'DEMU2044350', etd: day(-34), eta: day(1), status: 'at_port', cost: 13_100, currency: 'CAD', dataSource: 'demo' },
    { id: 'mt-sh-5', reference: 'MT-2045', direction: 'import', supplierId: 'mt-s-1', productId: 'mt-p-1', mode: 'sea', originHub: 'VNSGN', destHub: 'CAVAN', inlandMode: 'rail', warehouseId: 'mt-wh-1', carrier: 'Demo Ocean Line', weightKg: 18_900, quantity: 4_500, containerNo: 'DEMU2045411', etd: day(-71), eta: day(-38), status: 'arrived', cost: 11_950, currency: 'CAD', dataSource: 'demo' },
    { id: 'mt-sh-6', reference: 'MT-2046', direction: 'import', supplierId: 'mt-s-2', productId: 'mt-p-2', mode: 'air', originHub: 'HAN', destHub: 'YYZ', warehouseId: 'mt-wh-1', carrier: 'Demo Air Cargo', weightKg: 900, quantity: 820, awb: '999-20461100', etd: day(-3), eta: day(2), status: 'in_transit', cost: 6_900, currency: 'CAD', dataSource: 'demo' },
    { id: 'mt-sh-7', reference: 'MT-E310', direction: 'export', productId: 'mt-p-3', mode: 'road', warehouseId: 'mt-wh-1', destinationCountry: 'US', destHub: 'USNYC', carrier: 'Demo Cross-Border Freight', weightKg: 7_200, quantity: 760, etd: day(-1), eta: day(3), status: 'in_transit', cost: 3_100, currency: 'CAD', dataSource: 'demo' },
    { id: 'mt-sh-8', reference: 'MT-2047', direction: 'import', supplierId: 'mt-s-4', productId: 'mt-p-3', mode: 'sea', originHub: 'CNSHK', destHub: 'CAPRR', inlandMode: 'rail', warehouseId: 'mt-wh-1', carrier: 'Demo Pacific Lines', weightKg: 18_600, quantity: 1_950, containerNo: 'DEMU2047502', etd: day(4), eta: day(38), status: 'booked', cost: 12_900, currency: 'CAD', dataSource: 'demo' },
  ]
  const events = [
    event('mt-e-1', 'mt-sh-2', -1, 'delayed', 'MT-2042 delayed by 9 days after schedule change'),
    event('mt-e-2', 'mt-sh-4', -1, 'at_port', 'MT-2044 reached Port of Prince Rupert'),
    event('mt-e-3', 'mt-sh-6', -2, 'in_transit', 'MT-2046 departed Hanoi by air'),
    event('mt-e-4', 'mt-sh-1', -3, 'eta_update', 'MT-2041 estimated arrival updated'),
    event('mt-e-5', 'mt-sh-3', -5, 'dispatched', 'MT-2043 dispatched from Ningbo East Gate Homeware'),
    event('mt-e-6', 'mt-sh-5', -38, 'arrived', 'MT-2045 arrived at Brampton Distribution Centre'),
  ]
  const alternatives = [
    {
      id: 'mt-a-1', kind: 'canadian', name: 'Northfield Cookware Works', source: 'demo', city: 'Hamilton', province: 'ON', country: 'CA', lat: 43.26, lon: -79.87,
      productId: 'mt-p-1', productType: 'Stainless-steel cookware', specifications: '18/8 stainless, induction base', certifications: ['ISO 9001 (demo record)'],
      unitPrice: 39.75, currency: 'CAD', leadTimeDays: 21, moq: 2_000, specMatch: 0.8, mode: 'road',
      compliance: { labourCertification: 'verified', audit: 'verified', safety: 'verified', policy: 'claimed', dueDiligence: 'claimed' },
    },
    {
      id: 'mt-a-2', kind: 'canadian', name: 'Prairie Forge Kitchen Supply', source: 'demo', city: 'Winnipeg', province: 'MB', country: 'CA', lat: 49.9, lon: -97.14,
      productId: 'mt-p-1', productType: 'Stainless-steel cookware distributor', specifications: 'Stocks imported and domestic lines', certifications: [],
      unitPrice: null, currency: 'CAD', leadTimeDays: null, moq: null, specMatch: 0.6, mode: 'road',
      compliance: { labourCertification: 'claimed', audit: 'unknown', safety: 'unknown', policy: 'unknown', dueDiligence: 'unknown' },
    },
    {
      id: 'mt-a-3', kind: 'canadian', name: 'Laurentide Stoneware Co.', source: 'demo', city: 'Quebec City', province: 'QC', country: 'CA', lat: 46.81, lon: -71.21,
      productId: 'mt-p-3', productType: 'Stoneware dinnerware', specifications: 'Dishwasher-safe stoneware', certifications: [],
      unitPrice: 34.5, currency: 'CAD', leadTimeDays: 28, moq: 500, specMatch: 0.85, mode: 'road',
      compliance: { labourCertification: 'verified', audit: 'claimed', safety: 'verified', policy: 'unknown', dueDiligence: 'unknown' },
    },
  ]
  return { company, warehouses, products, suppliers, shipments, events, alternatives, scenarios: [], reports: [], comparisons: [], emissions: {} }
}

function northernLeaf() {
  const company = {
    id: 'demo-leaf',
    name: 'Northern Leaf Apparel',
    tagline: 'Fictional Canadian clothing retailer and importer',
    isDemo: true,
    onboardingComplete: true,
    industry: 'apparel',
    activity: 'import',
    hq: { city: 'Montreal', province: 'QC', lat: 45.5, lon: -73.57 },
    categories: ['Knitwear', 'Denim', 'Outerwear'],
    preferredModes: ['sea', 'air'],
    finance: {
      mode: 'quick',
      currency: 'CAD',
      quick: { importSpend: '5m-20m', freightSpend: '500k-2m', inventoryBuffer: '15-30' },
      exact: {},
    },
    operations: { leadTimeDays: 84, dailyShortfallCost: 9500 },
  }
  const warehouses = [{ id: 'nl-wh-1', name: 'Laval Fulfilment Centre', city: 'Laval', province: 'QC', lat: 45.61, lon: -73.71 }]
  const products = [
    { id: 'nl-p-1', name: 'Organic cotton T-shirts', category: 'Knitwear', hsCode: '6109.10', hsStatus: 'unverified', specifications: '180 gsm organic cotton jersey', unit: 'units', annualQuantity: 260_000, unitWeightKg: 0.2, dutyRatePct: 18 },
    { id: 'nl-p-2', name: 'Men’s cotton denim jeans', category: 'Denim', hsCode: '6203.42', hsStatus: 'unverified', specifications: '12 oz stretch denim', unit: 'units', annualQuantity: 90_000, unitWeightKg: 0.75, dutyRatePct: 17 },
    { id: 'nl-p-3', name: 'Merino wool sweaters', category: 'Knitwear', hsCode: '6110.11', hsStatus: 'confirmed', specifications: '100% merino, 14 gauge', unit: 'units', annualQuantity: 34_000, unitWeightKg: 0.45, dutyRatePct: 16 },
    { id: 'nl-p-4', name: 'Recycled-fleece pullovers', category: 'Outerwear', hsCode: '6110.30', hsStatus: 'unverified', specifications: 'Recycled polyester fleece', unit: 'units', annualQuantity: 52_000, unitWeightKg: 0.6, dutyRatePct: 18 },
  ]
  const suppliers = [
    {
      id: 'nl-s-1', name: 'Dhaka Meridian Knit Mills', country: 'BD', city: 'Gazipur', lat: 24.0, lon: 90.42, locationPrecision: 'city',
      productIds: ['nl-p-1'], quantity: 260_000, purchaseCost: 5.4, currency: 'USD', annualSpend: 1_404_000, sharePct: 30, leadTimeDays: 94,
      mode: 'sea', originHub: 'BDCGP', destHub: 'CAMTR', warehouseId: 'nl-wh-1', annualWeightKg: 52_000, onTimePct: 78,
      qualitySpecs: 'GOTS scope certificate required', certifications: ['GOTS (demo record)'],
      compliance: docs('claimed', 'claimed', 'claimed', 'unknown', 'unknown'),
    },
    {
      id: 'nl-s-2', name: 'Tiruppur Sunrise Garments', country: 'IN', city: 'Tiruppur', lat: 11.11, lon: 77.34, locationPrecision: 'city',
      productIds: ['nl-p-1', 'nl-p-4'], quantity: 52_000, purchaseCost: 11.2, currency: 'USD', annualSpend: 582_400, sharePct: 13, leadTimeDays: 86,
      mode: 'sea', originHub: 'INNSA', destHub: 'CAMTR', warehouseId: 'nl-wh-1', annualWeightKg: 31_200, onTimePct: 84,
      qualitySpecs: 'Global Recycled Standard for fleece', certifications: ['GRS (demo record)'],
      compliance: docs('verified', 'claimed', 'claimed', 'claimed', 'unknown'),
    },
    {
      id: 'nl-s-3', name: 'Bursa Crescent Denim', country: 'TR', city: 'Bursa', lat: 40.19, lon: 29.06, locationPrecision: 'city',
      productIds: ['nl-p-2'], quantity: 90_000, purchaseCost: 16.8, currency: 'EUR', annualSpend: 1_512_000, sharePct: 34, leadTimeDays: 52,
      mode: 'sea', originHub: 'TRAMR', destHub: 'CAMTR', warehouseId: 'nl-wh-1', annualWeightKg: 67_500, onTimePct: 90,
      qualitySpecs: 'Shrinkage under 3%', certifications: ['OEKO-TEX (demo record)'],
      compliance: docs('verified', 'verified', 'verified', 'claimed', 'claimed'),
    },
    {
      id: 'nl-s-4', name: 'Porto Atlantico Malhas', country: 'PT', city: 'Barcelos', lat: 41.53, lon: -8.62, locationPrecision: 'city',
      productIds: ['nl-p-3'], quantity: 34_000, purchaseCost: 28, currency: 'EUR', annualSpend: 952_000, sharePct: 15, leadTimeDays: 34,
      mode: 'air', originHub: 'OPO', destHub: 'YUL', warehouseId: 'nl-wh-1', annualWeightKg: 15_300, onTimePct: 95,
      qualitySpecs: 'Woolmark wool content test', certifications: ['Woolmark (demo record)'],
      compliance: docs('verified', 'verified', 'verified', 'verified', 'claimed'),
    },
    {
      // Country-level record: no city, so the map shows the country centre and says so.
      id: 'nl-s-5', name: 'Mekong Thread Co-operative', country: 'VN', city: '', locationPrecision: 'country',
      productIds: ['nl-p-4'], quantity: 52_000, purchaseCost: 12.1, currency: 'USD', annualSpend: 0, sharePct: 8, leadTimeDays: 78,
      mode: 'sea', originHub: 'VNSGN', destHub: 'CAVAN', warehouseId: 'nl-wh-1', annualWeightKg: 18_000, onTimePct: null,
      qualitySpecs: '', certifications: [],
      compliance: docs('unknown', 'unknown', 'unknown', 'unknown', 'unknown'),
    },
  ]
  const shipments = [
    { id: 'nl-sh-1', reference: 'NL-7711', direction: 'import', supplierId: 'nl-s-1', productId: 'nl-p-1', mode: 'sea', originHub: 'BDCGP', destHub: 'CAMTR', warehouseId: 'nl-wh-1', carrier: 'Demo Ocean Line', weightKg: 12_800, quantity: 64_000, containerNo: 'DEMU7711206', etd: day(-29), eta: day(17), status: 'in_transit', cost: 14_600, currency: 'CAD', dataSource: 'demo' },
    { id: 'nl-sh-2', reference: 'NL-7712', direction: 'import', supplierId: 'nl-s-2', productId: 'nl-p-4', mode: 'sea', originHub: 'INNSA', destHub: 'CAMTR', warehouseId: 'nl-wh-1', carrier: 'Demo Ocean Line', weightKg: 8_700, quantity: 14_500, containerNo: 'DEMU7712334', etd: day(-33), eta: day(4), status: 'delayed', cost: 10_900, currency: 'CAD', dataSource: 'demo' },
    { id: 'nl-sh-3', reference: 'NL-7713', direction: 'import', supplierId: 'nl-s-3', productId: 'nl-p-2', mode: 'sea', originHub: 'TRAMR', destHub: 'CAMTR', warehouseId: 'nl-wh-1', carrier: 'Demo Atlantic Lines', weightKg: 16_500, quantity: 22_000, containerNo: 'DEMU7713481', etd: day(-14), eta: day(9), status: 'in_transit', cost: 9_800, currency: 'CAD', dataSource: 'demo' },
    { id: 'nl-sh-4', reference: 'NL-7714', direction: 'import', supplierId: 'nl-s-4', productId: 'nl-p-3', mode: 'air', originHub: 'OPO', destHub: 'YUL', warehouseId: 'nl-wh-1', carrier: 'Demo Air Cargo', weightKg: 2_300, quantity: 5_100, awb: '999-77140021', etd: day(-1), eta: day(2), status: 'in_transit', cost: 11_200, currency: 'CAD', dataSource: 'demo' },
    { id: 'nl-sh-5', reference: 'NL-7715', direction: 'import', supplierId: 'nl-s-1', productId: 'nl-p-1', mode: 'air', originHub: 'DAC', destHub: 'YUL', warehouseId: 'nl-wh-1', carrier: 'Demo Air Cargo', weightKg: 3_100, quantity: 15_500, awb: '999-77150032', etd: day(-52), eta: day(-48), status: 'arrived', cost: 19_400, currency: 'CAD', dataSource: 'demo' },
    { id: 'nl-sh-6', reference: 'NL-7716', direction: 'import', supplierId: 'nl-s-5', productId: 'nl-p-4', mode: 'sea', originHub: 'VNSGN', destHub: 'CAVAN', inlandMode: 'rail', warehouseId: 'nl-wh-1', carrier: 'Demo Pacific Lines', weightKg: 6_000, quantity: 10_000, containerNo: 'DEMU7716557', etd: day(6), eta: day(48), status: 'booked', cost: 7_300, currency: 'CAD', dataSource: 'demo' },
  ]
  const events = [
    event('nl-e-1', 'nl-sh-2', -1, 'delayed', 'NL-7712 delayed by 6 days after transshipment'),
    event('nl-e-2', 'nl-sh-4', -1, 'in_transit', 'NL-7714 departed Porto by air'),
    event('nl-e-3', 'nl-sh-3', -2, 'eta_update', 'NL-7713 estimated arrival updated'),
    event('nl-e-4', 'nl-sh-1', -6, 'in_transit', 'NL-7711 passed the Suez Canal'),
    event('nl-e-5', 'nl-sh-5', -48, 'arrived', 'NL-7715 arrived at Laval Fulfilment Centre'),
  ]
  const alternatives = [
    {
      id: 'nl-a-1', kind: 'canadian', name: 'Laurentian Knit Mills', source: 'demo', city: 'Sherbrooke', province: 'QC', country: 'CA', lat: 45.4, lon: -71.89,
      productId: 'nl-p-1', productType: 'Cut-and-sew knitwear', specifications: 'Cotton jersey, small runs', certifications: [],
      unitPrice: 13.4, currency: 'CAD', leadTimeDays: 30, moq: 5_000, specMatch: 0.75, mode: 'road',
      compliance: { labourCertification: 'verified', audit: 'verified', safety: 'verified', policy: 'verified', dueDiligence: 'claimed' },
    },
    {
      id: 'nl-a-2', kind: 'canadian', name: 'Fraser Valley Fleece Works', source: 'demo', city: 'Abbotsford', province: 'BC', country: 'CA', lat: 49.05, lon: -122.31,
      productId: 'nl-p-4', productType: 'Fleece outerwear', specifications: 'Recycled polyester fleece', certifications: ['GRS (demo record)'],
      unitPrice: null, currency: 'CAD', leadTimeDays: null, moq: 3_000, specMatch: 0.7, mode: 'road',
      compliance: { labourCertification: 'claimed', audit: 'unknown', safety: 'claimed', policy: 'unknown', dueDiligence: 'unknown' },
    },
  ]
  return { company, warehouses, products, suppliers, shipments, events, alternatives, scenarios: [], reports: [], comparisons: [], emissions: {} }
}

export const DEMO_COMPANIES = [
  { id: 'demo-maple', name: 'Maple Trail Home Goods', summary: 'Ontario home-goods importer. Cookware and household goods from Vietnam and China, by ocean freight and road.', build: mapleTrail },
  { id: 'demo-leaf', name: 'Northern Leaf Apparel', summary: 'Canadian clothing retailer sourcing from several countries by air and ocean, focused on sustainability and labour due diligence.', build: northernLeaf },
]

export const DEMO_TEAM = [
  { name: 'Demo Owner', role: 'Owner', email: 'owner@example.com' },
  { name: 'Demo Procurement Lead', role: 'Admin', email: 'procurement@example.com' },
  { name: 'Demo Analyst', role: 'Member', email: 'analyst@example.com' },
  { name: 'Demo Auditor', role: 'Viewer', email: 'auditor@example.com' },
]
