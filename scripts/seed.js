/**
 * FairGig Seed Script
 * Creates test accounts and sample data.
 * Run: node scripts/seed.js
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_KEY in analytics-service/.env
 */
require('dotenv').config({ path: './analytics-service/.env' })

const BASE = 'http://localhost:8001'

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const e = await r.json().catch(() => ({}))
    if (e.detail?.includes('already registered')) return null
    throw new Error(JSON.stringify(e))
  }
  return r.json()
}

async function main() {
  console.log('🌱 Seeding FairGig test accounts...\n')

  // Create accounts
  const accounts = [
    { email: 'worker@fairgig.dev',   password: 'Test1234!', full_name: 'Ali Hassan',      role: 'worker',   city: 'Lahore',   category: 'ride-hailing' },
    { email: 'verifier@fairgig.dev', password: 'Test1234!', full_name: 'Sara Ahmed',      role: 'verifier', city: 'Karachi' },
    { email: 'advocate@fairgig.dev', password: 'Test1234!', full_name: 'Bilal Chaudhry',  role: 'advocate', city: 'Islamabad' },
  ]

  for (const acc of accounts) {
    try {
      const res = await post('/auth/register', acc)
      if (res) console.log(`✅ Created ${acc.role}: ${acc.email}`)
      else     console.log(`⚠️  Already exists: ${acc.email}`)
    } catch (e) {
      console.error(`❌ ${acc.email}: ${e.message}`)
    }
  }

  // Log some sample shifts for the worker
  try {
    const loginRes = await post('/auth/login', { email: 'worker@fairgig.dev', password: 'Test1234!' })
    if (!loginRes) { console.log('Could not log in worker'); return }

    const token = loginRes.access_token
    const earningsBase = 'http://localhost:8002'

    const shifts = [
      // Last 3 months of data
      { platform: 'Uber',      shift_date: '2026-01-15', hours_worked: 5,   gross_earned: 1800, platform_deductions: 360, net_received: 1440, city: 'Lahore', category: 'ride-hailing' },
      { platform: 'Careem',    shift_date: '2026-01-18', hours_worked: 4,   gross_earned: 1500, platform_deductions: 375, net_received: 1125, city: 'Lahore', category: 'ride-hailing' },
      { platform: 'Uber',      shift_date: '2026-01-22', hours_worked: 6,   gross_earned: 2100, platform_deductions: 420, net_received: 1680, city: 'Lahore', category: 'ride-hailing' },
      { platform: 'Foodpanda', shift_date: '2026-02-03', hours_worked: 4.5, gross_earned: 1200, platform_deductions: 300, net_received: 900,  city: 'Lahore', category: 'food-delivery' },
      { platform: 'Uber',      shift_date: '2026-02-10', hours_worked: 5,   gross_earned: 1900, platform_deductions: 380, net_received: 1520, city: 'Lahore', category: 'ride-hailing' },
      { platform: 'Careem',    shift_date: '2026-02-14', hours_worked: 3,   gross_earned: 1100, platform_deductions: 330, net_received: 770,  city: 'Lahore', category: 'ride-hailing' },
      // Anomalous shift — high deduction
      { platform: 'Uber',      shift_date: '2026-03-01', hours_worked: 5,   gross_earned: 2000, platform_deductions: 700, net_received: 1300, city: 'Lahore', category: 'ride-hailing', notes: 'High deductions this shift' },
      { platform: 'Uber',      shift_date: '2026-03-08', hours_worked: 4,   gross_earned: 1700, platform_deductions: 595, net_received: 1105, city: 'Lahore', category: 'ride-hailing' },
      { platform: 'Foodpanda', shift_date: '2026-03-15', hours_worked: 3.5, gross_earned: 950,  platform_deductions: 237, net_received: 713,  city: 'Lahore', category: 'food-delivery' },
    ]

    for (const shift of shifts) {
      await fetch(`${earningsBase}/shifts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(shift),
      })
    }
    console.log(`✅ Created ${shifts.length} sample shifts for worker`)

    // Run anomaly check
    await fetch(`http://localhost:8003/anomaly/check/${loginRes.user.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    console.log('✅ Anomaly check run')

    // Create sample grievances
    const grievances = [
      { platform: 'Uber',      category: 'commission-change', description: 'Uber raised commission from 20% to 35% overnight on March 1st without any notification or email. I only found out when I checked my earnings statement.', is_anonymous: true },
      { platform: 'Careem',    category: 'payment-delay',     description: 'Weekly payment has been delayed for 3 weeks now. Support is not responding to tickets. This is the second time this year.', is_anonymous: false },
      { platform: 'Foodpanda', category: 'deactivation',      description: 'Account deactivated without any reason or warning. I had a 4.8 rating and no complaints. Cannot reach support.', is_anonymous: true },
    ]
    for (const g of grievances) {
      await fetch('http://localhost:8004/grievances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(g),
      })
    }
    console.log(`✅ Created ${grievances.length} sample grievances`)

  } catch (e) {
    console.error('Seed error:', e.message)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ Seed complete! Login credentials:')
  console.log('  Worker:   worker@fairgig.dev / Test1234!')
  console.log('  Verifier: verifier@fairgig.dev / Test1234!')
  console.log('  Advocate: advocate@fairgig.dev / Test1234!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

main().catch(console.error)
