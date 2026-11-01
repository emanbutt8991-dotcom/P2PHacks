/*
  Illustrative trade lanes for the decorative globe. These are visual examples
  of the kinds of routes Canadian importers use — not real shipment data,
  schedules or volumes. Coordinates are [longitude, latitude].
*/
export const HUBS = [
  { name: 'Vancouver', coords: [-123.1, 49.3], home: true },
  { name: 'Prince Rupert', coords: [-130.3, 54.3], home: true },
  { name: 'Toronto', coords: [-79.4, 43.7], home: true },
  { name: 'Montréal', coords: [-73.6, 45.5], home: true },
  { name: 'Halifax', coords: [-63.6, 44.6], home: true },
  { name: 'Shanghai', coords: [121.5, 31.2] },
  { name: 'Busan', coords: [129.0, 35.1] },
  { name: 'Ho Chi Minh City', coords: [106.7, 10.8] },
  { name: 'Shenzhen', coords: [114.1, 22.5] },
  { name: 'Rotterdam', coords: [4.5, 51.9] },
  { name: 'Antwerp', coords: [4.4, 51.2] },
  { name: 'Frankfurt', coords: [8.7, 50.1] },
  { name: 'Manzanillo', coords: [-104.3, 19.1] },
]

// mode: 'sea' | 'air' | 'rail'; speed multiplies the base marker speed
export const TRADE_ROUTES = [
  { from: [121.5, 31.2], to: [-123.1, 49.3], mode: 'sea', speed: 0.8 },
  { from: [106.7, 10.8], to: [-123.1, 49.3], mode: 'sea', speed: 0.7 },
  { from: [129.0, 35.1], to: [-130.3, 54.3], mode: 'sea', speed: 0.9 },
  { from: [4.5, 51.9], to: [-73.6, 45.5], mode: 'sea', speed: 1 },
  { from: [4.4, 51.2], to: [-63.6, 44.6], mode: 'sea', speed: 0.9 },
  { from: [114.1, 22.5], to: [-79.4, 43.7], mode: 'air', speed: 2.2 },
  { from: [8.7, 50.1], to: [-79.4, 43.7], mode: 'air', speed: 2.4 },
  { from: [-104.3, 19.1], to: [-79.4, 43.7], mode: 'rail', speed: 1.4 },
  { from: [-123.1, 49.3], to: [-79.4, 43.7], mode: 'rail', speed: 1.2 },
]
