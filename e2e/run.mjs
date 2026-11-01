/*
  End-to-end journey test in a real browser. Serves the production build through
  the Node API, then drives headless Edge or Chrome with Playwright.
  Usage: npm run build && npm run test:e2e
  Set E2E_BROWSER to a browser path, and E2E_SHOTS to a folder for screenshots.
*/
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { createApp } from '../server/app.js'
import { loadConfig } from '../server/config.js'

const PORT = 8799
const BASE = `http://127.0.0.1:${PORT}`
const SHOTS = process.env.E2E_SHOTS
const BROWSERS = [
  process.env.E2E_BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean)

const results = []
let page
let browserErrors = []

async function step(name, fn) {
  const before = browserErrors.length
  try {
    await fn()
    const fresh = browserErrors.slice(before)
    if (fresh.length) throw new Error(`Console errors: ${fresh.join(' | ').slice(0, 400)}`)
    results.push({ name, ok: true })
    console.log(`  ok   ${name}`)
  } catch (err) {
    results.push({ name, ok: false, error: err.message })
    console.log(`  FAIL ${name}\n       ${err.message.split('\n')[0]}`)
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `fail-${results.length}.png`) }).catch(() => {})
  }
}

const shot = async (name) => {
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: false })
}
const see = (text, options) => page.getByText(text, options).first().waitFor({ timeout: 8000 })
const HEADINGS = { Overview: 'Waymark Command Center', 'Canadian Alternatives': 'Find Canadian Alternatives', 'Global Alternatives': 'Explore Global Alternatives' }
const nav = async (label) => {
  await page.getByRole('navigation', { name: 'Application' }).getByRole('link', { name: label }).click()
  await page.getByRole('heading', { level: 1, name: HEADINGS[label] ?? label }).waitFor()
}
const button = (name, options) => page.getByRole('button', { name, ...options })

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function main() {
  assert(existsSync('dist/index.html'), 'dist/ is missing. Run npm run build first.')
  if (SHOTS) mkdirSync(SHOTS, { recursive: true })
  const server = createApp({ ...loadConfig({}), rateLimitPerMinute: 5000 }).listen(PORT, '127.0.0.1')

  const executablePath = BROWSERS.find((b) => existsSync(b))
  assert(executablePath, 'No Chromium-based browser found. Set E2E_BROWSER.')
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
  page = await context.newPage()
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) browserErrors.push(m.text())
  })
  page.on('pageerror', (e) => browserErrors.push(e.message))

  await step('Welcome page opens, with Try Demo', async () => {
    await page.goto(BASE)
    await see('Plan.')
    await shot('01-landing')
    await button('Try Demo').first().click()
    await page.waitForURL('**/demo')
  })

  await step('Choose Maple Trail and the Pro demo tier', async () => {
    await button('Pro').click()
    await button('Open Maple Trail Home Goods').click()
    await page.waitForURL('**/app')
    await see('Waymark Command Center')
    await see('Demo Data: fictional company')
  })

  await step('Dashboard shows company metrics and the world map', async () => {
    await page.locator('[data-map-ready="true"]').first().waitFor({ timeout: 20000 })
    await see('Total suppliers')
    await page.locator('[data-node-id="sup-mt-s-1"]').first().waitFor({ timeout: 8000 })
    await page.waitForTimeout(800)
    // "Ready" is not enough: the canvas must have real size and markers must sit inside it.
    const canvas = await page.locator('canvas.maplibregl-canvas').first().boundingBox()
    assert(canvas && canvas.height > 200 && canvas.width > 300, `Map canvas is ${canvas?.width}x${canvas?.height}`)
    const marker = await page.locator('[data-node-id="sup-mt-s-1"]').first().boundingBox()
    assert(marker && marker.x > canvas.x && marker.x < canvas.x + canvas.width && marker.y > canvas.y && marker.y < canvas.y + canvas.height, 'Supplier marker is outside the map')
    assert((await page.getByText('so this spend is excluded from CAD totals').count()) === 0, 'A supported currency was reported as unconverted')
    assert((await page.getByText('Live exchange rates are unavailable').count()) === 0, 'Live FX should have loaded')
    await page.locator('canvas.maplibregl-canvas').first().scrollIntoViewIfNeeded()
    await shot('02-dashboard')
  })

  await step('Inspect an import route and its shipment details on the map page', async () => {
    await nav('Supply Chain Map')
    await page.locator('[data-map-ready="true"]').waitFor({ timeout: 20000 })
    // A shipment marker must lie between its route's ends, not be flung elsewhere by CSS.
    const canvas = await page.locator('canvas.maplibregl-canvas').boundingBox()
    for (const box of await Promise.all((await page.locator('.wm-vehicle').all()).map((v) => v.boundingBox()))) {
      assert(box.x >= canvas.x - 20 && box.x <= canvas.x + canvas.width + 20, 'A shipment marker is outside the map')
    }
    await page.locator('[data-node-id="sup-mt-s-1"]').click()
    await page.getByRole('heading', { name: 'Saigon Riverline Metalworks' }).waitFor()
    await button('Clear').click()
    await page.locator('.wm-vehicle').first().click()
    await see('Estimated emissions')
    await see('Potential disruptions')
    await shot('03-map')
  })

  await step('Shipment table shows transport emissions', async () => {
    await nav('Shipments')
    await see('MT-2041')
    await page.getByRole('row', { name: /MT-2041/ }).click()
    await see('Waymark estimate, not Climatiq')
    await page.keyboard.press('Escape')
  })

  await step('Run a disruption scenario with live inputs', async () => {
    await nav('Risk Simulator')
    await see('Total added cost')
    const total = () => page.locator('text=Total added cost').locator('..').locator('..').innerText()
    const before = await total()
    await page.getByRole('tab', { name: 'Tariff increase' }).click()
    await page.getByRole('tab', { name: 'Port congestion or closure' }).click()
    await page.getByRole('tab', { name: 'Trade restrictions' }).click()
    await page.getByRole('tab', { name: 'Supplier delay' }).click()
    const slider = page.getByRole('slider', { name: 'Delay' })
    await slider.fill('90')
    await page.waitForTimeout(200)
    assert((await total()) !== before, 'Total did not change when the delay changed')
    await page.locator('[data-map-ready="true"]').waitFor({ timeout: 20000 })
  })

  await step('Compare financial and environmental consequences of actions', async () => {
    await see('Compare responses')
    await see('Build safety stock')
    await see('Alternative supplier')
    await page.getByLabel('Scenario name').fill('E2E delay test')
    await button('Save scenario').click()
    await see('E2E delay test')
    await page.waitForTimeout(500)
    await shot('04-simulator')
  })

  await step('Explore Canadian alternatives, with Request Quote for unknown prices', async () => {
    await nav('Canadian Alternatives')
    await see('Northfield Cookware Works')
    await see('Request Quote')
    await page.locator('[data-testid="compare-table"]').waitFor()
    await shot('05-canadian')
  })

  await step('Compare cost, quality, delivery, emissions and documentation', async () => {
    const table = await page.locator('[data-testid="compare-table"]').innerText()
    for (const label of ['Landed cost', 'Quality fit', 'Delivery time', 'Transport CO₂e', 'Labour documentation', 'Change from current']) {
      assert(table.includes(label), `Comparison is missing ${label}`)
    }
  })

  await step('Review a data-grounded recommendation that responds to priorities', async () => {
    const box = page.locator('[data-testid="recommendation"]')
    await box.waitFor()
    const first = await box.innerText()
    await page.getByLabel('What matters most?').selectOption('cost')
    await page.waitForTimeout(150)
    assert((await box.innerText()) !== first, 'Recommendation did not change with priority')
    await page.getByLabel('What matters most?').selectOption('balanced')
  })

  await step('Explore global alternatives with labelled hypothetical comparisons', async () => {
    await nav('Global Alternatives')
    await see('Your assumptions')
    await see('Hypothetical market comparison')
    await page.getByLabel('Price vs current (%)').first().fill('4')
    await page.getByLabel('Duty rate (%)').first().fill('0')
    await page.waitForTimeout(200)
    await button(/Test .* in Risk Simulator/).first().click()
    await page.waitForURL('**/simulator')
    await see('Compare responses')
  })

  await step('Sustainability figures match the dashboard total', async () => {
    await nav('Sustainability')
    const label = page.getByText('Total estimated shipment transport CO₂e')
    const value = await label.locator('..').locator('..').locator('p').nth(1).innerText()
    await see('Emissions by freight mode')
    await see('Responsible-sourcing documentation')
    await page.waitForTimeout(400)
    await shot('06-sustainability')
    await nav('Overview')
    const dash = await page.getByText('Estimated transport emissions').locator('..').locator('..').locator('p').nth(1).innerText()
    assert(value === dash, `Mismatch: sustainability ${value}, dashboard ${dash}`)
  })

  await step('Generate a report and export a real PDF and CSV', async () => {
    await nav('Reports')
    await button('Generate').nth(3).click()
    await page.locator('[data-testid="report-view"]').waitFor()
    await see('Summary for decision-makers')
    await shot('07-report')
    const [pdf] = await Promise.all([page.waitForEvent('download'), button('Export PDF').click()])
    const pdfPath = await pdf.path()
    assert(readFileSync(pdfPath).subarray(0, 4).toString() === '%PDF', 'Download is not a PDF')
    assert(readFileSync(pdfPath).length > 5000, 'PDF is suspiciously small')
    if (SHOTS) await pdf.saveAs(path.join(SHOTS, 'report.pdf'))
    const [csv] = await Promise.all([page.waitForEvent('download'), button('Export CSV').click()])
    assert(readFileSync(await csv.path(), 'utf8').includes('Maple Trail'), 'CSV is missing the company')
    await button('Save report').click()
    await see('No saved reports yet', { exact: false }).then(() => { throw new Error('Report did not save') }, () => {})
  })

  await step('Switch to Free: restrictions apply and data is preserved', async () => {
    await button('Free', { exact: true }).click()
    await nav('Overview')
    await see('adding more is paused')
    await nav('Shipments')
    assert(await button('Add shipment').isDisabled(), 'Add shipment should be disabled on Free')
    await see('Live aircraft near your airports')
    await page.locator('[data-locked="tracking.live"]').waitFor()
    assert((await page.getByRole('row').count()) > 6, 'Shipments should survive the downgrade')
    await nav('Risk Simulator')
    await page.getByRole('tab', { name: 'Severe weather' }).click()
    await page.locator('[data-locked="scenario.advanced"]').waitFor()
    await page.getByRole('tab', { name: 'Tariff increase' }).click()
    await page.locator('[data-locked="scenario.compare"]').waitFor()
    await nav('Canadian Alternatives')
    await page.locator('[data-locked="alternatives.canadian.full"]').waitFor()
    await nav('Sustainability')
    await page.locator('[data-locked="sustainability.advanced"]').first().waitFor()
    await nav('Reports')
    assert(await button('Generate').count() === 1, 'Free should offer one report type')
    await nav('Supply Chain Map')
    await page.locator('[data-locked="map.advanced"]').waitFor()
    await shot('08-free')
  })

  await step('The server refuses Pro features to the Free preview', async () => {
    const status = await page.evaluate(async () => (await fetch('/api/aircraft?lat=43&lon=-79', { headers: { 'X-Waymark-Preview-Plan': 'free' } })).status)
    assert(status === 403, `Expected 403, got ${status}`)
  })

  await step('Switch to Enterprise: the advanced experience unlocks', async () => {
    await button('Enterprise', { exact: true }).click()
    await nav('Reports')
    await see('Custom report builder')
    await button('Build custom report').click()
    await page.locator('[data-testid="report-view"]').waitFor()
    await nav('Company Settings')
    await page.getByRole('tab', { name: 'Admin' }).click()
    await see('Administrative dashboard')
    await see('Multi-location analysis')
    await see('Configurable integration point', { exact: false })
    await page.getByRole('tab', { name: 'Team' }).click()
    await see('Demo Auditor')
    await page.getByRole('tab', { name: 'Admin' }).click()
    await shot('09-enterprise')
  })

  await step('Northern Leaf Apparel opens with country-level supplier handling', async () => {
    await button('Exit demo').click()
    await page.waitForURL(BASE + '/')
    await page.goto(`${BASE}/demo`)
    await button('Open Northern Leaf Apparel').click()
    await see('Waymark Command Center')
    await nav('Supply Chain Map')
    await page.locator('[data-map-ready="true"]').waitFor({ timeout: 20000 })
    await page.locator('[data-node-id="sup-nl-s-5"]').click()
    await see('Country-level location')
    await button('Exit demo').click()
  })

  await step('Sign up creates a clearly labelled local workspace, with no password field', async () => {
    await page.goto(`${BASE}/signup`)
    await see('local workspace', { exact: false })
    assert((await page.locator('input[type=password]').count()) === 0, 'Local mode must not collect a password')
    await page.getByLabel('Company name').fill('Test Trading Inc')
    await button('Create local workspace').click()
    await page.waitForURL('**/onboarding')
  })

  await step('Onboarding: company, products with HS suggestions', async () => {
    await page.getByLabel('Industry').selectOption('apparel')
    await page.getByLabel('Headquarters city').fill('Toronto')
    await page.getByLabel('Province', { exact: true }).selectOption('ON')
    await button('Next').click()
    await page.getByLabel('Product name').fill('Cotton T-shirts')
    await see('6109.10')
    await see('not a legal classification', { exact: false })
    await page.getByRole('button', { name: /6109\.10/ }).click()
    await see('6-digit international HS')
    await page.getByLabel('Annual quantity').fill('1000')
    await page.getByLabel('Unit weight (kg)').fill('0.2')
    await button('Add another product').click()
    assert((await page.locator('[data-testid="product-form"]').count()) === 2, 'Second product form missing')
    await button('Remove').last().click()
    await page.reload()
    await see('Step 2 of 6')
    assert((await page.getByLabel('Product name').first().inputValue()) === 'Cotton T-shirts', 'Progress was not kept across reload')
    await button('Next').click()
  })

  await step('Onboarding: dynamic supplier forms with exact financial inputs', async () => {
    await page.getByLabel('How many suppliers').fill('3')
    assert((await page.locator('[data-testid="supplier-form"]').count()) === 3, 'Expected three supplier forms')
    await page.getByLabel('How many suppliers').fill('9')
    await see('saves up to 3 suppliers', { exact: false })
    await page.getByLabel('How many suppliers').fill('2')
    assert((await page.locator('[data-testid="supplier-form"]').count()) === 2, 'Expected two supplier forms')
    await button('Next').click()
    await see('Each supplier needs a name and a country')
    const names = page.getByLabel('Supplier name')
    const countries = page.getByLabel('Country', { exact: true })
    await names.nth(0).fill('Test Mill One')
    await countries.nth(0).selectOption('BD')
    await page.getByLabel('Annual spending').nth(0).fill('120000.50')
    await page.getByLabel('Currency').nth(0).selectOption('USD')
    await names.nth(1).fill('Test Mill Two')
    await countries.nth(1).selectOption('VN')
    await page.getByLabel('City or region').nth(1).fill('Da Nang')
    await page.getByLabel('Annual spending').nth(1).fill('80000')
    await button('Next').click()
    await button('Next').click()
    await see('Enter annual import spending')
    await page.getByLabel('Annual import spending').fill('250000.75')
    await page.getByLabel('Annual freight spending').fill('18000.25')
    await see('$250,001')
    await button('Next').click()
    await page.getByLabel('Inventory coverage (days of stock)').fill('20')
    await button('Next').click()
    await see('Test Mill One, Test Mill Two')
    await button('Open my dashboard').click()
    await page.waitForURL('**/app', { timeout: 20000 })
  })

  await step('New company dashboard uses exact inputs and honest locations', async () => {
    await see('Local workspace: this browser only')
    await see('Actual input')
    await see('$250')
    await nav('Supply Chain Map')
    await page.locator('[data-map-ready="true"]').waitFor({ timeout: 20000 })
    assert((await page.locator('[data-node-id^="sup-"]').count()) === 2, 'Both suppliers should be on the map')
    await page.locator('.wm-node--approx').first().waitFor()
  })

  await step('Add, edit and delete a shipment, with metrics following', async () => {
    await nav('Shipments')
    await button('Add your first shipment').click()
    await button('Save shipment').click()
    await see('Enter a reference')
    await page.getByLabel('Reference').fill('TEST-1')
    await page.getByLabel('Supplier', { exact: true }).selectOption({ label: 'Test Mill One' })
    await page.getByLabel('Shipment weight (kg)').fill('5000')
    await page.getByLabel('Shipping cost').fill('2500')
    await button('Save shipment').click()
    await page.getByRole('row', { name: /TEST-1/ }).waitFor()
    await see('Manual entry')
    await button('Edit TEST-1').click()
    await page.getByRole('dialog').getByLabel('Status').selectOption('delayed')
    await button('Save shipment').click()
    await page.getByRole('row', { name: /Delayed/ }).waitFor()
    await nav('Overview')
    const delayed = await page.getByText('Delayed shipments').locator('..').locator('..').locator('p').nth(1).innerText()
    assert(delayed === '1', `Delayed metric should be 1, got ${delayed}`)
    await nav('Shipments')
    await button('Delete TEST-1').click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
    await see('No shipments yet')
  })

  await step('The workspace persists across a reload', async () => {
    await page.reload()
    await see('Test Trading Inc')
    await nav('Company Settings')
    await page.getByRole('tab', { name: 'Suppliers' }).click()
    await see('Test Mill One')
  })

  await step('Spawn creates a filled sample account for each tier, and each can be reopened', async () => {
    for (const [tier, company, suppliers] of [['Free', 'Harbour Lane Provisions', '3'], ['Pro', 'Cedar Ridge Outfitters', '5'], ['Enterprise', 'Trans-Canada Homeworks', '6']]) {
      await page.goto(`${BASE}/signup`)
      await button(`Spawn ${tier}`).click()
      assert((await page.getByLabel('Company name').inputValue()) === company, `${tier} did not fill the company name`)
      await button('Create local workspace').click()
      await page.waitForURL('**/onboarding')
      await see('Step 1 of 6')
      assert((await page.getByLabel('Headquarters city').inputValue()) !== '', 'Onboarding was not prefilled')
      for (let i = 0; i < 5; i++) await button('Next').click()
      await see('Review and finish')
      await button('Open my dashboard').click()
      await page.waitForURL('**/app', { timeout: 20000 })
      await see('Sample data: fictional company')
      await see(`${tier} plan`)
      const count = await page.getByText('Total suppliers').locator('..').locator('..').locator('p').nth(1).innerText()
      assert(count === suppliers, `${tier} should have ${suppliers} suppliers, got ${count}`)
      await page.locator('[data-map-ready="true"]').first().waitFor({ timeout: 20000 })
      assert((await page.locator('[data-node-id^="sup-"]').count()) === Number(suppliers), `${tier} map should show every supplier`)
      await page.waitForTimeout(700)
      await shot(`12-spawn-${tier.toLowerCase()}`)
    }
    await button('Sign out').click()
    await page.goto(`${BASE}/signin`)
    await button(/Open Cedar Ridge Outfitters/).click()
    await see('Cedar Ridge Outfitters')
    await see('Pro plan')
  })

  await step('Pricing page shows plans, comparison and no checkout', async () => {
    await page.goto(`${BASE}/pricing`)
    await see('Proposed pricing')
    await see('Try Interactive Demo')
    await see('Commercial signup is not available yet')
    assert(!(await page.content()).toLowerCase().includes('checkout now'), 'Unexpected checkout')
  })

  await step('The original quick estimate still works', async () => {
    await page.goto(`${BASE}/quick-estimate`)
    await button('See company profile').waitFor({ timeout: 2000 }).catch(() => {})
    await see('Step 1 of 3', { exact: false })
  })

  await step('Phone layout has no horizontal page scroll', async () => {
    await page.goto(`${BASE}/demo`)
    await button('Open Maple Trail Home Goods').click()
    await see('Waymark Command Center')
    await page.setViewportSize({ width: 400, height: 800 })
    for (const pathName of ['/app', '/app/shipments', '/app/simulator', '/app/sustainability', '/app/reports', '/app/settings']) {
      await page.goto(BASE + pathName)
      await page.getByRole('heading', { level: 1 }).first().waitFor()
      await page.waitForTimeout(250)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      assert(overflow <= 1, `${pathName} scrolls sideways by ${overflow}px`)
    }
    await shot('10-phone')
  })

  // Failure and fallback paths, each in a clean browser context.
  const fresh = async (init) => {
    await context.close().catch(() => {})
    const next = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    if (init) await next.addInitScript(init)
    page = await next.newPage()
    page.on('pageerror', (e) => browserErrors.push(e.message))
    return next
  }
  const openPro = async (base) => {
    await page.goto(`${base}/demo`)
    await button('Open Maple Trail Home Goods').click()
    await see('Waymark Command Center')
  }

  await step('With the API down, the app still works and says so', async () => {
    await fresh()
    await page.route('**/api/**', (route) => route.abort())
    await openPro(BASE)
    await see('API offline', { exact: false })
    await see('Live exchange rates are unavailable', { exact: false })
    await see('Weather data is unavailable', { exact: false })
    await nav('Sustainability')
    await see('Waymark estimate, not Climatiq')
    await nav('Canadian Alternatives')
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await see('The directory is unavailable', { exact: false })
    await nav('Risk Simulator')
    await see('Total added cost')
  })

  await step('Without WebGL, the SVG map still shows the network', async () => {
    await fresh(() => {
      HTMLCanvasElement.prototype.getContext = () => null
    })
    await openPro(BASE)
    await see('Simplified map: WebGL unavailable', { exact: false })
    await page.locator('svg path').first().waitFor()
    await shot('11-svg-fallback')
  })

  // A local stub following Climatiq's documented v3.1 response, to exercise the real UI path.
  let upstreamMode = 'ok'
  let upstreamCalls = 0
  const upstream = http.createServer((req, res) => {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      upstreamCalls += 1
      res.setHeader('Content-Type', 'application/json')
      if (upstreamMode === 'fail') {
        res.statusCode = 400
        return res.end(JSON.stringify({ error: 'bad_request', error_code: 'no_route_found', message: 'No route found' }))
      }
      const legs = JSON.parse(body).route.filter((r) => r.transport_mode)
      res.end(JSON.stringify({
        co2e: 1000 * legs.length,
        co2e_unit: 'kg',
        co2e_calculation_method: 'ipcc_ar6_gwp100',
        route: legs.flatMap((l) => [
          { type: 'location', name: 'stop', notices: [] },
          { type: 'leg', transport_mode: l.transport_mode, distance_km: 1000, co2e: 1000, notices: [] },
        ]).concat([{ type: 'location', name: 'end', notices: [] }]),
      }))
    })
  })
  await new Promise((r) => upstream.listen(0, '127.0.0.1', r))
  const CLIMATIQ_PORT = PORT + 1
  const climatiq = createApp({
    ...loadConfig({}),
    rateLimitPerMinute: 5000,
    climatiqKey: 'stub-key',
    climatiqBaseUrl: `http://127.0.0.1:${upstream.address().port}`,
  }).listen(CLIMATIQ_PORT, '127.0.0.1')
  const CLIMATIQ_BASE = `http://127.0.0.1:${CLIMATIQ_PORT}`

  await step('Failed Climatiq calls keep labelled estimates, never fake results', async () => {
    upstreamMode = 'fail'
    await fresh()
    await openPro(CLIMATIQ_BASE)
    await nav('Sustainability')
    await see('Climatiq failed', { exact: false })
    await see('Waymark estimate, not Climatiq')
    await see('0 from Climatiq')
  })

  await step('Working Climatiq results flow through every screen, labelled and consistent', async () => {
    upstreamMode = 'ok'
    upstreamCalls = 0
    await fresh()
    await openPro(CLIMATIQ_BASE)
    await nav('Sustainability')
    await see('8 from Climatiq', { exact: false })
    // Eight shipments, and the five sea-then-rail routes each need two calls.
    assert(upstreamCalls === 13, `Expected 13 upstream calls, got ${upstreamCalls}`)
    const value = await page.getByText('Total estimated shipment transport CO₂e').locator('..').locator('..').locator('p').nth(1).innerText()
    await see('Climatiq', { exact: true })
    await nav('Overview')
    const dash = await page.getByText('Estimated transport emissions').locator('..').locator('..').locator('p').nth(1).innerText()
    assert(value === dash, `Mismatch: sustainability ${value}, dashboard ${dash}`)
    await nav('Shipments')
    await page.getByRole('row', { name: /MT-2041/ }).click()
    await see('ipcc_ar6_gwp100', { exact: false })
    await page.keyboard.press('Escape')
    await page.reload()
    await see('MT-2041')
    assert(upstreamCalls === 13, 'Stored results should not be recalculated after a reload')
  })

  await step('Free tier uses the estimate even when Climatiq is configured', async () => {
    upstreamCalls = 0
    await fresh()
    await page.goto(`${CLIMATIQ_BASE}/demo`)
    await button('Free', { exact: true }).click()
    await button('Open Maple Trail Home Goods').click()
    await see('Waymark Command Center')
    await nav('Sustainability')
    await see('Waymark estimate, not Climatiq')
    assert(upstreamCalls === 0, 'Free must not reach Climatiq')
  })

  climatiq.close()
  upstream.close()
  await browser.close()
  server.close()

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length} of ${results.length} journeys passed.`)
  process.exit(failed.length ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
