import { existsSync } from 'node:fs'
import { createApp } from './app.js'
import { loadConfig } from './config.js'

if (existsSync('.env')) process.loadEnvFile('.env')

const config = loadConfig()
createApp(config).listen(config.port, () => {
  console.log(`Waymark API on http://localhost:${config.port}`)
  console.log(`  Climatiq: ${config.climatiqKey ? 'configured' : 'not configured (estimate-only fallback)'}`)
  console.log(`  Supabase: ${config.supabaseUrl ? 'configured' : 'not configured (local mode)'}`)
  console.log(`  AI explanations: ${config.anthropicKey ? 'configured' : 'not configured (rule-based)'}`)
})
