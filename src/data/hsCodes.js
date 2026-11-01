/*
  Curated six-digit Harmonized System subheadings, used for autocomplete hints.
  Six digits are the internationally shared part of the code. Canada's Customs
  Tariff extends them to an eight-digit tariff item, and importers declare ten
  digits including the statistical suffix. Waymark never invents the extra
  digits: the user enters them after checking the Customs Tariff or a broker.
*/

const h = (code, description, industries, keywords) => ({ code, description, industries, keywords })

export const HS_ENTRIES = [
  // Home and kitchen
  h('7323.93', 'Table, kitchen or other household articles of stainless steel', ['home'], ['cookware', 'pot', 'pan', 'stainless', 'steel', 'kitchen', 'utensil', 'bowl']),
  h('7323.99', 'Table, kitchen or household articles of iron or steel, other', ['home'], ['cast iron', 'iron', 'skillet', 'bakeware', 'steel']),
  h('7615.10', 'Table, kitchen or household articles of aluminium', ['home'], ['aluminium', 'aluminum', 'cookware', 'pan', 'pot', 'non-stick', 'nonstick']),
  h('8215.99', 'Spoons, forks, ladles, skimmers and similar kitchen ware, other', ['home'], ['cutlery', 'flatware', 'spoon', 'fork', 'ladle', 'utensil']),
  h('8211.91', 'Table knives having fixed blades', ['home'], ['knife', 'knives', 'cutlery']),
  h('6911.10', 'Tableware and kitchenware of porcelain or china', ['home'], ['porcelain', 'china', 'tableware', 'dinnerware', 'plate', 'mug']),
  h('6912.00', 'Ceramic tableware and kitchenware, other than porcelain', ['home'], ['ceramic', 'stoneware', 'mug', 'plate', 'bowl']),
  h('7013.37', 'Drinking glasses, other than of glass-ceramics or lead crystal', ['home'], ['glass', 'tumbler', 'drinkware']),
  h('3924.10', 'Tableware and kitchenware of plastics', ['home'], ['plastic', 'container', 'storage', 'kitchen']),
  h('6302.60', 'Toilet and kitchen linen of cotton terry towelling', ['home', 'apparel'], ['towel', 'tea towel', 'terry', 'linen']),
  h('6302.31', 'Bed linen of cotton, other than printed', ['home', 'apparel'], ['bed linen', 'sheet', 'duvet', 'pillowcase']),

  // Apparel and textiles
  h('6109.10', 'T-shirts, singlets and other vests of cotton, knitted or crocheted', ['apparel'], ['t-shirt', 'tshirt', 'tee', 'shirt', 'cotton', 'knit', 'singlet']),
  h('6109.90', 'T-shirts, singlets and other vests of other textile materials, knitted or crocheted', ['apparel'], ['t-shirt', 'tshirt', 'tee', 'polyester', 'synthetic', 'knit']),
  h('6110.20', 'Jerseys, pullovers, cardigans and similar articles of cotton, knitted or crocheted', ['apparel'], ['sweater', 'hoodie', 'sweatshirt', 'pullover', 'cardigan', 'cotton']),
  h('6110.30', 'Jerseys, pullovers, cardigans and similar articles of man-made fibres, knitted or crocheted', ['apparel'], ['sweater', 'fleece', 'pullover', 'polyester', 'hoodie']),
  h('6110.11', 'Jerseys, pullovers, cardigans and similar articles of wool, knitted or crocheted', ['apparel'], ['wool', 'sweater', 'merino']),
  h('6203.42', 'Men’s or boys’ trousers and shorts of cotton, not knitted', ['apparel'], ['jeans', 'denim', 'pants', 'trousers', 'shorts', 'chino']),
  h('6204.62', 'Women’s or girls’ trousers and shorts of cotton, not knitted', ['apparel'], ['jeans', 'denim', 'pants', 'trousers', 'shorts']),
  h('6204.42', 'Women’s or girls’ dresses of cotton, not knitted', ['apparel'], ['dress', 'cotton']),
  h('6205.20', 'Men’s or boys’ shirts of cotton, not knitted', ['apparel'], ['dress shirt', 'button', 'shirt', 'cotton', 'woven']),
  h('6206.30', 'Women’s or girls’ blouses and shirts of cotton, not knitted', ['apparel'], ['blouse', 'shirt', 'cotton', 'woven']),
  h('6115.95', 'Hosiery of cotton, knitted or crocheted, other', ['apparel'], ['socks', 'hosiery']),
  h('6403.99', 'Footwear with outer soles of rubber or plastics and leather uppers, other', ['apparel'], ['shoes', 'footwear', 'boots', 'leather']),
  h('4202.92', 'Bags and containers with outer surface of plastic sheeting or textile materials', ['apparel', 'other'], ['bag', 'backpack', 'tote', 'luggage']),

  // Electronics
  h('8544.42', 'Electric conductors for a voltage not exceeding 1,000 V, fitted with connectors', ['electronics'], ['cable', 'usb', 'cord', 'wire', 'connector']),
  h('8504.40', 'Static converters', ['electronics'], ['charger', 'adapter', 'power supply', 'inverter']),
  h('8507.60', 'Lithium-ion accumulators', ['electronics'], ['battery', 'lithium', 'power bank']),
  h('8518.22', 'Multiple loudspeakers, mounted in the same enclosure', ['electronics'], ['speaker', 'audio']),
  h('8534.00', 'Printed circuits', ['electronics'], ['pcb', 'circuit', 'board']),
  h('8539.52', 'Light-emitting diode (LED) lamps', ['electronics'], ['led', 'lamp', 'bulb', 'light']),
  h('8517.62', 'Machines for the reception, conversion and transmission of data', ['electronics'], ['router', 'network', 'modem', 'switch']),

  // Industrial
  h('8413.70', 'Centrifugal pumps, other', ['industrial'], ['pump', 'centrifugal']),
  h('8481.80', 'Taps, cocks, valves and similar appliances, other', ['industrial'], ['valve', 'tap', 'faucet']),
  h('8482.10', 'Ball bearings', ['industrial'], ['bearing']),
  h('8483.40', 'Gears and gearing; ball or roller screws; gear boxes', ['industrial'], ['gear', 'gearbox']),
  h('8414.80', 'Air or gas pumps and compressors, other', ['industrial'], ['compressor']),
  h('7318.15', 'Threaded screws and bolts of iron or steel, other', ['industrial'], ['bolt', 'screw', 'fastener']),

  // Food
  h('0901.21', 'Roasted coffee, not decaffeinated', ['food'], ['coffee', 'roasted']),
  h('0901.11', 'Coffee, not roasted, not decaffeinated', ['food'], ['coffee', 'green coffee', 'beans']),
  h('0902.30', 'Black tea (fermented) in immediate packings of 3 kg or less', ['food'], ['tea', 'black tea']),
  h('0904.21', 'Dried fruits of the genus Capsicum or Pimenta, neither crushed nor ground', ['food'], ['pepper', 'chili', 'spice']),
  h('1509.20', 'Extra virgin olive oil', ['food'], ['olive oil']),

  // Health and beauty
  h('3304.99', 'Beauty or make-up preparations and skin-care preparations, other', ['beauty'], ['skincare', 'lotion', 'cream', 'cosmetic', 'makeup', 'serum']),
  h('3305.10', 'Shampoos', ['beauty'], ['shampoo']),
  h('3303.00', 'Perfumes and toilet waters', ['beauty'], ['perfume', 'fragrance']),
  h('3401.30', 'Organic surface-active products for washing the skin, retail packed', ['beauty'], ['soap', 'body wash', 'cleanser']),

  // Furniture
  h('9401.61', 'Upholstered seats with wooden frames', ['furniture'], ['sofa', 'chair', 'couch', 'upholstered']),
  h('9403.60', 'Wooden furniture, other', ['furniture'], ['table', 'desk', 'shelf', 'cabinet', 'wood']),
  h('9403.20', 'Metal furniture, other', ['furniture'], ['metal', 'desk', 'shelf', 'rack']),
  h('9404.21', 'Mattresses of cellular rubber or plastics', ['furniture'], ['mattress', 'foam']),
  h('9405.11', 'Chandeliers and ceiling or wall luminaires for LED sources', ['furniture', 'electronics'], ['light fixture', 'luminaire', 'lamp']),

  // Other
  h('9503.00', 'Tricycles, scooters, dolls, toys, puzzles and similar', ['other'], ['toy', 'doll', 'puzzle', 'game']),
  h('3923.30', 'Carboys, bottles, flasks and similar articles of plastics', ['other', 'home'], ['bottle', 'plastic', 'packaging']),
]

export const HS_CONFIDENCE_NOTE =
  'Suggestions are keyword matches, not a legal classification. Confirm the full ten-digit code with a licensed customs broker or the CBSA Customs Tariff before use.'

const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').trim()

/**
 * Rank HS suggestions for a product name. An industry alone is too broad to
 * classify a product, so industry only boosts keyword matches and supplies
 * browsing hints flagged `broad: true`.
 */
export function suggestHsCodes(productName, industry, limit = 6) {
  const text = normalize(productName ?? '')
  if (!text) {
    return HS_ENTRIES.filter((e) => e.industries.includes(industry))
      .slice(0, limit)
      .map((e) => ({ ...e, confidence: 'browse', broad: true }))
  }
  const words = text.split(/\s+/)
  const scored = HS_ENTRIES.map((entry) => {
    let score = 0
    for (const k of entry.keywords) {
      if (text.includes(k)) score += k.length > 5 ? 3 : 2
      else if (words.some((w) => w.length > 3 && k.startsWith(w))) score += 1
    }
    if (score && entry.industries.includes(industry)) score += 1
    return { ...entry, score }
  }).filter((e) => e.score > 0)

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, ...e }) => ({ ...e, confidence: score >= 5 ? 'possible' : 'weak', broad: false }))
}

/** 'hs6', 'tariff8', 'ca10', 'other' or 'invalid', from the digits entered. */
export function hsLevel(code) {
  const digits = (code ?? '').replace(/[.\s]/g, '')
  if (!digits) return null
  if (!/^\d+$/.test(digits)) return 'invalid'
  if (digits.length === 6) return 'hs6'
  if (digits.length === 8) return 'tariff8'
  if (digits.length === 10) return 'ca10'
  return 'invalid'
}

export const HS_LEVEL_LABEL = {
  hs6: '6-digit international HS',
  tariff8: '8-digit Canadian tariff item',
  ca10: '10-digit Canadian classification',
  invalid: 'Not a valid length',
}
