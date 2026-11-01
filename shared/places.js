/*
  Reference geography: real seaports (UN/LOCODE) and airports (IATA), with
  approximate coordinates. Shared by routing, the map and the Climatiq client.
*/

const port = (code, name, country, lat, lon) => ({ code, name, country, lat, lon, kind: 'port' })
const airport = (code, name, country, lat, lon) => ({ code, name, country, lat, lon, kind: 'airport' })

export const PORTS = [
  port('CAVAN', 'Port of Vancouver', 'CA', 49.29, -123.11),
  port('CAPRR', 'Port of Prince Rupert', 'CA', 54.32, -130.33),
  port('CAMTR', 'Port of Montreal', 'CA', 45.56, -73.53),
  port('CAHAL', 'Port of Halifax', 'CA', 44.65, -63.57),
  port('CNSHA', 'Port of Shanghai', 'CN', 31.23, 121.49),
  port('CNNGB', 'Port of Ningbo-Zhoushan', 'CN', 29.94, 121.85),
  port('CNSHK', 'Port of Shekou (Shenzhen)', 'CN', 22.48, 113.91),
  port('CNTAO', 'Port of Qingdao', 'CN', 36.07, 120.32),
  port('VNSGN', 'Port of Ho Chi Minh City', 'VN', 10.76, 106.75),
  port('VNHPH', 'Port of Hai Phong', 'VN', 20.86, 106.68),
  port('KRPUS', 'Port of Busan', 'KR', 35.1, 129.04),
  port('JPYOK', 'Port of Yokohama', 'JP', 35.44, 139.64),
  port('TWKHH', 'Port of Kaohsiung', 'TW', 22.61, 120.28),
  port('SGSIN', 'Port of Singapore', 'SG', 1.26, 103.82),
  port('MYPKG', 'Port Klang', 'MY', 3.0, 101.39),
  port('THLCH', 'Laem Chabang', 'TH', 13.08, 100.88),
  port('IDTPP', 'Tanjung Priok (Jakarta)', 'ID', -6.1, 106.88),
  port('INNSA', 'Nhava Sheva (Mumbai)', 'IN', 18.95, 72.95),
  port('INMUN', 'Port of Mundra', 'IN', 22.74, 69.7),
  port('BDCGP', 'Port of Chattogram', 'BD', 22.31, 91.8),
  port('LKCMB', 'Port of Colombo', 'LK', 6.95, 79.85),
  port('PKKHI', 'Port of Karachi', 'PK', 24.84, 66.98),
  port('KHKOS', 'Sihanoukville', 'KH', 10.63, 103.5),
  port('TRAMR', 'Ambarli (Istanbul)', 'TR', 40.97, 28.68),
  port('NLRTM', 'Port of Rotterdam', 'NL', 51.95, 4.14),
  port('DEHAM', 'Port of Hamburg', 'DE', 53.54, 9.97),
  port('BEANR', 'Port of Antwerp', 'BE', 51.28, 4.33),
  port('ITGOA', 'Port of Genoa', 'IT', 44.41, 8.91),
  port('PTLEI', 'Port of Leixoes', 'PT', 41.19, -8.7),
  port('GBFXT', 'Port of Felixstowe', 'GB', 51.95, 1.33),
  port('PLGDY', 'Port of Gdynia', 'PL', 54.53, 18.55),
  port('MXZLO', 'Port of Manzanillo', 'MX', 19.05, -104.31),
  port('MXLZC', 'Port of Lazaro Cardenas', 'MX', 17.94, -102.17),
  port('USLAX', 'Port of Los Angeles', 'US', 33.74, -118.27),
  port('USNYC', 'Port of New York and New Jersey', 'US', 40.67, -74.04),
  port('BRSSZ', 'Port of Santos', 'BR', -23.96, -46.31),
  port('AUSYD', 'Port Botany (Sydney)', 'AU', -33.97, 151.22),
]

export const AIRPORTS = [
  airport('YVR', 'Vancouver International', 'CA', 49.19, -123.18),
  airport('YYC', 'Calgary International', 'CA', 51.13, -114.01),
  airport('YYZ', 'Toronto Pearson', 'CA', 43.68, -79.63),
  airport('YHM', 'Hamilton International', 'CA', 43.17, -79.93),
  airport('YUL', 'Montreal-Trudeau', 'CA', 45.47, -73.74),
  airport('YHZ', 'Halifax Stanfield', 'CA', 44.88, -63.51),
  airport('PVG', 'Shanghai Pudong', 'CN', 31.14, 121.81),
  airport('SZX', 'Shenzhen Bao’an', 'CN', 22.64, 113.81),
  airport('HKG', 'Hong Kong International', 'HK', 22.31, 113.91),
  airport('SGN', 'Tan Son Nhat (Ho Chi Minh City)', 'VN', 10.82, 106.65),
  airport('HAN', 'Noi Bai (Hanoi)', 'VN', 21.22, 105.81),
  airport('ICN', 'Seoul Incheon', 'KR', 37.46, 126.44),
  airport('NRT', 'Tokyo Narita', 'JP', 35.77, 140.39),
  airport('TPE', 'Taipei Taoyuan', 'TW', 25.08, 121.23),
  airport('SIN', 'Singapore Changi', 'SG', 1.36, 103.99),
  airport('KUL', 'Kuala Lumpur International', 'MY', 2.75, 101.71),
  airport('BKK', 'Bangkok Suvarnabhumi', 'TH', 13.69, 100.75),
  airport('CGK', 'Jakarta Soekarno-Hatta', 'ID', -6.13, 106.66),
  airport('BOM', 'Mumbai Chhatrapati Shivaji', 'IN', 19.09, 72.87),
  airport('DEL', 'Delhi Indira Gandhi', 'IN', 28.57, 77.1),
  airport('DAC', 'Dhaka Hazrat Shahjalal', 'BD', 23.84, 90.4),
  airport('CMB', 'Colombo Bandaranaike', 'LK', 7.18, 79.88),
  airport('KHI', 'Karachi Jinnah', 'PK', 24.91, 67.16),
  airport('PNH', 'Phnom Penh Techo', 'KH', 11.55, 104.84),
  airport('IST', 'Istanbul Airport', 'TR', 41.26, 28.74),
  airport('FRA', 'Frankfurt am Main', 'DE', 50.03, 8.57),
  airport('AMS', 'Amsterdam Schiphol', 'NL', 52.31, 4.76),
  airport('BRU', 'Brussels Airport', 'BE', 50.9, 4.48),
  airport('MXP', 'Milan Malpensa', 'IT', 45.63, 8.72),
  airport('OPO', 'Porto Airport', 'PT', 41.25, -8.68),
  airport('LHR', 'London Heathrow', 'GB', 51.47, -0.45),
  airport('WAW', 'Warsaw Chopin', 'PL', 52.17, 20.97),
  airport('MEX', 'Mexico City International', 'MX', 19.44, -99.07),
  airport('LAX', 'Los Angeles International', 'US', 33.94, -118.41),
  airport('JFK', 'New York JFK', 'US', 40.64, -73.78),
  airport('GRU', 'Sao Paulo Guarulhos', 'BR', -23.43, -46.47),
  airport('SYD', 'Sydney Kingsford Smith', 'AU', -33.95, 151.18),
]

const BY_CODE = new Map([...PORTS, ...AIRPORTS].map((p) => [p.code, p]))

export const findPlace = (code) => BY_CODE.get(code) ?? null

export function hubsForCountry(country, kind) {
  return (kind === 'airport' ? AIRPORTS : PORTS).filter((p) => p.country === country)
}

/** The closest hub of a kind to a point, optionally limited to one country. */
export function nearestHub(point, kind, country) {
  const list = (kind === 'airport' ? AIRPORTS : PORTS).filter((p) => !country || p.country === country)
  let best = null
  let bestD = Infinity
  for (const hub of list) {
    const d = (hub.lat - point.lat) ** 2 + (((hub.lon - point.lon + 540) % 360) - 180) ** 2
    if (d < bestD) {
      bestD = d
      best = hub
    }
  }
  return best
}
