// Seeds a linked bank account with a year of realistic daily transactions.
//
// Built for testing the AI surfaces — insights, the assistant, subscription
// detection, anomalies, safe-to-spend — which all need a real transaction
// history to say anything at all. An empty account cannot be tested against,
// and randomly generated noise produces insights that are themselves noise.
//
// The profile is one person, coherent over twelve months: a final-year student
// at HZ in Vlissingen on an internship stipend and student finance, who
// graduates in March and starts a junior job in Zeeland. Income roughly
// triples, the room becomes an apartment, and spending follows — which is the
// kind of shape the trend and comparison tools exist to describe.
//
// Everything is deterministic: the same seed produces the same year, so a
// change in an insight is a change in the code, not the data.
//
// Usage:
//   DATABASE_URL="<unpooled postgres url>" \
//   ENCRYPTION_KEY="<64 hex chars>" \
//   node scripts/seed-demo-bank.mjs [email]
//
//   --wipe      also remove existing budgets/goals/bills before seeding
//   --dry-run   print the generated year and write nothing
//
// Re-running replaces the demo bank and its transactions; real Plaid-linked
// accounts on the same user are never touched.

import { createCipheriv, randomBytes, createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'

const EMAIL = process.argv.find((a) => a.includes('@')) || 'mura0005@hz.nl'
const WIPE = process.argv.includes('--wipe')
// Prints the year it would create and writes nothing — useful for eyeballing
// the shape of the data without a database in reach.
const DRY_RUN = process.argv.includes('--dry-run')

// Marks every row this script owns, so a re-run can clear its own work without
// risking a real linked account.
const DEMO_ITEM_ID = 'demo_seed_v1'
const TX_PREFIX = 'demo_'

const DAY_MS = 86_400_000

/** Loaded lazily: the generator is importable without a database. */
async function db() {
  const { PrismaClient } = await import('@prisma/client')
  return new PrismaClient()
}

// ── Determinism ────────────────────────────────────────────────────────────

function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20260923)

const between = (lo, hi) => lo + rand() * (hi - lo)
const money = (lo, hi) => Math.round(between(lo, hi) * 100) / 100
const chance = (p) => rand() < p
const pick = (xs) => xs[Math.floor(rand() * xs.length)]

// ── Calendar ───────────────────────────────────────────────────────────────

const today = new Date()
today.setHours(12, 0, 0, 0)
const start = new Date(today.getTime() - 364 * DAY_MS)

const ymd = (d) => d.toISOString().slice(0, 10)

/** The day everything changes: graduation, the job, the apartment. */
const GRADUATION = new Date(today.getFullYear(), 2, 1, 12) // 1 March, this year
const employed = (d) => d >= GRADUATION

// Spending is not flat across a year. December carries Sinterklaas and
// Christmas, January is the month everyone is broke, and the summer holds a
// trip. Exam months push coffee and takeaway up.
function seasonal(d) {
  const m = d.getMonth()
  if (m === 11) return 1.38 // December
  if (m === 0) return 0.78 // January
  if (m === 6 || m === 7) return 1.18 // July, August
  if (m === 5) return 1.08 // June, exams
  return 1
}

// ── Merchants ──────────────────────────────────────────────────────────────
//
// Real names, real places. The location fields matter: the alternatives
// feature looks for cheaper options near the user, and cannot do that against
// invented merchants in an invented city.

const ZEELAND = { state: 'Zeeland', country: 'NL' }
const V = { city: 'Vlissingen', ...ZEELAND }
const M = { city: 'Middelburg', ...ZEELAND }
const G = { city: 'Goes', ...ZEELAND }

const GROCERS = [
  { name: 'Albert Heijn', lo: 6.4, hi: 31, weight: 5, loc: V, channel: 'in store' },
  { name: 'Jumbo', lo: 7.2, hi: 35, weight: 4, loc: M, channel: 'in store' },
  { name: 'Lidl', lo: 5.1, hi: 26, weight: 3, loc: V, channel: 'in store' },
  { name: 'Dirk van den Broek', lo: 5.8, hi: 28, weight: 2, loc: V, channel: 'in store' },
  { name: 'ALDI', lo: 4.9, hi: 24, weight: 2, loc: M, channel: 'in store' },
]

const COFFEE = [
  { name: 'Coffeelab', lo: 2.9, hi: 4.4, weight: 4, loc: M },
  { name: 'Starbucks', lo: 3.75, hi: 5.6, weight: 2, loc: G },
  { name: 'Bagels & Beans', lo: 4.5, hi: 9.2, weight: 2, loc: M },
  { name: 'Coffee Corner HZ', lo: 1.8, hi: 3.2, weight: 5, loc: V },
]

const DINING = [
  { name: 'New York Pizza', lo: 9.5, hi: 21, weight: 4, loc: V, channel: 'online' },
  { name: 'Thuisbezorgd.nl', lo: 12, hi: 27, weight: 4, loc: V, channel: 'online' },
  { name: 'FEBO', lo: 3.5, hi: 9.5, weight: 3, loc: V, channel: 'in store' },
  { name: 'Snackbar t Hoekje', lo: 3.1, hi: 12.5, weight: 3, loc: V, channel: 'in store' },
  { name: 'Cafe De Kelder', lo: 7, hi: 29, weight: 3, loc: V, channel: 'in store' },
  { name: 'Eetcafe De Gespleten Arent', lo: 16, hi: 42, weight: 2, loc: M, channel: 'in store' },
  { name: 'Sushi Point', lo: 14, hi: 36, weight: 2, loc: M, channel: 'online' },
  { name: 'Kebabhuis Vlissingen', lo: 7.5, hi: 18, weight: 3, loc: V, channel: 'in store' },
]

const SHOPPING = [
  { name: 'bol.com', lo: 7.5, hi: 56, weight: 5, loc: null, channel: 'online' },
  { name: 'Action', lo: 2.8, hi: 17, weight: 4, loc: V, channel: 'in store' },
  { name: 'HEMA', lo: 3.9, hi: 25, weight: 3, loc: M, channel: 'in store' },
  { name: 'Zalando', lo: 19, hi: 92, weight: 2, loc: null, channel: 'online' },
  { name: 'Primark', lo: 9.5, hi: 41, weight: 2, loc: G, channel: 'in store' },
  { name: 'Decathlon', lo: 12, hi: 59, weight: 1, loc: G, channel: 'in store' },
]

const TRANSPORT = [
  { name: 'NS Reizigers', lo: 2.9, hi: 18.4, weight: 6, loc: V, channel: 'online' },
  { name: 'Connexxion', lo: 2.2, hi: 6.9, weight: 3, loc: V, channel: 'in store' },
  { name: 'OV-fiets', lo: 4.55, hi: 9.1, weight: 2, loc: M, channel: 'in store' },
]

const HEALTH = [
  { name: 'Etos', lo: 4.5, hi: 21, weight: 3, loc: V, channel: 'in store' },
  { name: 'Kruidvat', lo: 3.2, hi: 18, weight: 4, loc: V, channel: 'in store' },
  { name: 'Apotheek Scheldebuurt', lo: 7.5, hi: 42, weight: 1, loc: V, channel: 'in store' },
]

// The small everyday taps that make up most of a Dutch card statement.
// Filed as food shopping, not as eating out: mixing a EUR 3 bakery roll in
// with restaurant dinners pulls the category median down far enough that every
// real meal registers as an anomaly.
const SMALL = [
  { name: 'AH to go', lo: 1.85, hi: 7.4, weight: 5, loc: V, channel: 'in store' },
  { name: 'Bakkerij Verhage', lo: 2.2, hi: 9.6, weight: 4, loc: V, channel: 'in store' },
  { name: 'Kiosk NS Station', lo: 2.4, hi: 8.8, weight: 3, loc: M, channel: 'in store' },
]

const ENTERTAINMENT = [
  { name: 'Pathe Vlissingen', lo: 11.5, hi: 17, weight: 3, loc: V, channel: 'in store' },
  { name: 'Steam', lo: 6.99, hi: 34.99, weight: 2, loc: null, channel: 'online' },
  { name: 'Ticketmaster', lo: 24, hi: 62, weight: 1, loc: null, channel: 'online' },
  { name: 'Bowling Vlissingen', lo: 12, hi: 26, weight: 1, loc: V, channel: 'in store' },
]

/** Weighted pick — some shops are simply visited more than others. */
function weighted(list) {
  const total = list.reduce((s, m) => s + m.weight, 0)
  let r = rand() * total
  for (const m of list) {
    r -= m.weight
    if (r <= 0) return m
  }
  return list[list.length - 1]
}

// ── Building the year ──────────────────────────────────────────────────────

const rows = []

function add({ date, amount, direction, description, merchant, category, loc, channel, status }) {
  const d = new Date(date)
  if (d > today || d < start) return
  rows.push({
    date: d,
    amount: Math.round(Math.abs(amount) * 100) / 100,
    direction,
    description,
    merchantName: merchant ?? description,
    merchantCategory: category,
    merchantCity: loc?.city,
    merchantState: loc?.state,
    merchantCountry: loc?.country ?? 'NL',
    status: status ?? 'posted',
    channel: channel ?? 'in store',
  })
}

function spend(date, m, category, mult = 1) {
  add({
    date,
    amount: money(m.lo, m.hi) * mult,
    direction: 'debit',
    description: m.name,
    merchant: m.name,
    category,
    loc: m.loc,
    channel: m.channel,
  })
}

/**
 * Places a monthly charge on a given day of the month across a date range.
 * `amountAt` receives the date so a price can rise partway through the year.
 */
function monthly({ day, from, to, amountAt, description, category, loc, channel, direction = 'debit' }) {
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1, 12)
  while (cursor <= today) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth(), day, 12)
    const withinRange = (!from || d >= from) && (!to || d <= to)
    if (withinRange) {
      const amount = amountAt(d)
      if (amount > 0) {
        add({ date: d, amount, direction, description, merchant: description, category, loc, channel })
      }
    }
    cursor.setMonth(cursor.getMonth() + 1)
  }
}

// ── Income ─────────────────────────────────────────────────────────────────

// Student finance. Stops the month after graduating, which is what makes the
// before/after comparison worth running.
monthly({
  day: 24,
  to: GRADUATION,
  amountAt: () => 314.53,
  description: 'DUO Studiefinanciering',
  category: 'Income',
  direction: 'credit',
  channel: 'other',
})

// Internship stipend, then a real salary from the same employer — the natural
// path here, and it keeps one payer across the year so the income detector has
// a continuous stream to reason about rather than two short ones.
monthly({
  day: 25,
  to: GRADUATION,
  amountAt: () => 650,
  description: 'Damen Shipyards Stagevergoeding',
  category: 'Income',
  direction: 'credit',
  channel: 'other',
})

monthly({
  day: 25,
  from: GRADUATION,
  amountAt: () => 2647.88 + money(-18, 24),
  description: 'Damen Shipyards Group Salaris',
  category: 'Income',
  direction: 'credit',
  channel: 'other',
})

// Vakantiegeld: Dutch holiday allowance, paid as a lump in May. A genuine
// once-a-year credit, and a good test of whether a one-off is treated as a
// windfall rather than folded into the monthly average.
add({
  date: new Date(today.getFullYear(), 4, 25, 12),
  amount: 1842.4,
  direction: 'credit',
  description: 'Damen Shipyards Group Vakantiegeld',
  category: 'Income',
  channel: 'other',
})

// Bar shifts through the student months: irregular by nature, which is exactly
// what the income detector should decline to call a salary.
for (let d = new Date(start); d < GRADUATION; d = new Date(d.getTime() + DAY_MS)) {
  const shiftNight = d.getDay() === 5 || d.getDay() === 6
  if (shiftNight && chance(0.62)) {
    add({
      date: d,
      amount: money(74, 168),
      direction: 'credit',
      description: 'Cafe De Kelder Loon',
      category: 'Income',
      loc: V,
      channel: 'other',
    })
  }
}

// ── Housing and fixed costs ────────────────────────────────────────────────

// A room in a shared house, then an apartment after the job starts. Utilities
// are included in the room and separate afterwards, which is how it actually
// works here — and it means the "bills" category appears mid-year rather than
// running flat, giving the trend tools something real to find.
monthly({
  day: 1,
  to: GRADUATION,
  amountAt: () => 475,
  description: 'Huur Kamer Paul Krugerstraat',
  category: 'Rent',
  loc: V,
  channel: 'other',
})

monthly({
  day: 1,
  from: GRADUATION,
  amountAt: () => 895,
  description: 'Huur Appartement Badhuisstraat',
  category: 'Rent',
  loc: V,
  channel: 'other',
})

// The deposit and the moving costs, in the same week as the first rent.
add({
  date: new Date(today.getFullYear(), 1, 26, 12),
  amount: 1790,
  direction: 'debit',
  description: 'Borg Appartement Badhuisstraat',
  category: 'Rent',
  loc: V,
  channel: 'other',
})
add({
  date: new Date(today.getFullYear(), 2, 2, 12),
  amount: 385.2,
  direction: 'debit',
  description: 'IKEA',
  category: 'Home Improvement',
  loc: { city: 'Breda', ...ZEELAND },
  channel: 'in store',
})

// Health insurance is compulsory in the Netherlands, and the premium rises
// every January — a real recurring charge that quietly gets more expensive.
monthly({
  day: 5,
  amountAt: (d) => (d.getFullYear() >= today.getFullYear() ? 142.95 : 137.5),
  description: 'Zilveren Kruis Zorgverzekering',
  category: 'Insurance',
  channel: 'other',
})

monthly({
  day: 3,
  from: GRADUATION,
  // Energy is seasonal: winter costs roughly half again as much as summer.
  amountAt: (d) => {
    const m = d.getMonth()
    const winter = m <= 2 || m >= 10
    return winter ? money(118, 142) : money(72, 94)
  },
  description: 'Eneco Energie',
  category: 'Bills & Utilities',
  channel: 'other',
})

monthly({
  day: 8,
  from: GRADUATION,
  amountAt: () => 45,
  description: 'Ziggo',
  category: 'Bills & Utilities',
  channel: 'other',
})

monthly({
  day: 12,
  amountAt: () => 17.5,
  description: 'Odido',
  category: 'Bills & Utilities',
  channel: 'other',
})

// Water is billed quarterly — a cadence the subscription detector has to get
// right rather than reporting as a monthly cost.
for (const m of [10, 1, 4, 7]) {
  add({
    date: new Date(m >= 9 ? today.getFullYear() - 1 : today.getFullYear(), m, 15, 12),
    amount: 33.75,
    direction: 'debit',
    description: 'Evides Waterbedrijf',
    category: 'Bills & Utilities',
    channel: 'other',
  })
}

// ── Subscriptions ──────────────────────────────────────────────────────────

// Netflix raises its price two months before the end of the window, so the
// latest charge differs from the established median — which is the condition
// the price-change detector actually tests.
monthly({
  day: 14,
  amountAt: (d) => {
    const monthsAgo = (today.getFullYear() - d.getFullYear()) * 12 + (today.getMonth() - d.getMonth())
    return monthsAgo <= 1 ? 15.49 : 13.99
  },
  description: 'Netflix',
  category: 'Subscriptions',
  channel: 'online',
})

// Student pricing ends with the student card.
monthly({
  day: 21,
  amountAt: (d) => (employed(d) ? 11.99 : 5.99),
  description: 'Spotify',
  category: 'Subscriptions',
  channel: 'online',
})

// Cancelled in May and never charged again: four months of silence on a
// monthly rhythm, which is what "dormant" is supposed to catch.
monthly({
  day: 2,
  to: new Date(today.getFullYear(), 4, 28, 12),
  amountAt: () => 24.99,
  description: 'Basic-Fit',
  category: 'Health & Fitness',
  loc: V,
  channel: 'other',
})

monthly({ day: 17, amountAt: () => 19.9, description: 'Swapfiets', category: 'Transportation', loc: V, channel: 'other' })
monthly({ day: 9, amountAt: () => 2.99, description: 'iCloud', category: 'Subscriptions', channel: 'online' })
monthly({
  day: 27,
  from: new Date(today.getFullYear(), 1, 1, 12),
  amountAt: () => 23,
  description: 'OpenAI ChatGPT Plus',
  category: 'Subscriptions',
  channel: 'online',
})

// A yearly charge. Reported as a month's worth of cost, not a month's charge —
// the bug that made a EUR 50 annual renewal look like EUR 50 a month.
add({
  date: new Date(today.getFullYear(), 0, 19, 12),
  amount: 49.9,
  direction: 'debit',
  description: 'Amazon Prime',
  category: 'Subscriptions',
  channel: 'online',
})

// ── Daily life ─────────────────────────────────────────────────────────────

for (let d = new Date(start); d <= today; d = new Date(d.getTime() + DAY_MS)) {
  const weekday = d.getDay()
  const weekend = weekday === 0 || weekday === 6
  const season = seasonal(d)
  // More money after March means more spent, but not proportionally — the
  // rise shows up in dining and shopping rather than groceries.
  const income = employed(d) ? 1.18 : 0.85

  // Groceries: two or three shops a week, bigger ones at the weekend.
  if (chance(weekend ? 0.5 : 0.32)) {
    spend(d, weighted(GROCERS), 'Groceries', season * (weekend ? 1.35 : 1))
  }

  // Coffee on campus days.
  if (!weekend && chance(0.72)) spend(d, weighted(COFFEE), 'Coffee', season)
  if (weekend && chance(0.3)) spend(d, weighted(COFFEE), 'Coffee', season)

  // Eating out, and considerably more of it once there is a salary.
  if (chance((weekend ? 0.42 : 0.18) * income)) {
    spend(d, weighted(DINING), 'Food & Dining', season * income)
  }

  // Travel home, to Middelburg, to the office.
  if (chance(weekend ? 0.18 : 0.3)) spend(d, weighted(TRANSPORT), 'Transportation', season)

  if (chance(0.11 * income)) spend(d, weighted(SHOPPING), 'Shopping', season * income)
  if (weekend && chance(0.18 * income)) spend(d, weighted(ENTERTAINMENT), 'Entertainment', season)
  if (chance(0.06)) spend(d, weighted(HEALTH), 'Health & Fitness', season)
  if (chance(weekend ? 0.26 : 0.34)) spend(d, weighted(SMALL), 'Groceries', season)

  // A haircut roughly every six weeks.
  if (chance(0.024)) {
    add({
      date: d,
      amount: money(19, 27),
      direction: 'debit',
      description: 'Kapsalon Boulevard',
      category: 'Personal Care',
      loc: V,
      channel: 'in store',
    })
  }

  // Study materials, heaviest at the start of a semester.
  const semesterStart = (d.getMonth() === 8 || d.getMonth() === 1) && d.getDate() < 14
  if (!employed(d) && chance(semesterStart ? 0.14 : 0.02)) {
    add({
      date: d,
      amount: money(18, 76),
      direction: 'debit',
      description: 'Studystore',
      category: 'Education',
      loc: M,
      channel: 'online',
    })
  }

  // Saving into the goal, monthly, once there is something to save.
  if (d.getDate() === 28 && employed(d)) {
    add({
      date: d,
      amount: 175,
      direction: 'debit',
      description: 'Spaarrekening Overboeking',
      category: 'Transfer',
      channel: 'other',
    })
  }
}

// ── The unusual ones ───────────────────────────────────────────────────────
//
// Planted deliberately, because anomaly detection cannot be tested on a year
// in which nothing unusual happens. Each is several times the median for its
// category and should be surfaced; none is so large as to be obviously fake.

const outliers = [
  { d: [today.getFullYear() - 1, 9, 8], amount: 849, desc: 'MediaMarkt', cat: 'Shopping', loc: G, ch: 'in store' },
  { d: [today.getFullYear(), 1, 11], amount: 287.5, desc: 'Tandartspraktijk Middelburg', cat: 'Health & Fitness', loc: M, ch: 'in store' },
  { d: [today.getFullYear(), 6, 3], amount: 412.88, desc: 'Ryanair', cat: 'Travel', loc: null, ch: 'online' },
  { d: [today.getFullYear(), 6, 4], amount: 268.4, desc: 'Booking.com', cat: 'Travel', loc: null, ch: 'online' },
  { d: [today.getFullYear(), 7, 14], amount: 289, desc: 'Ticketmaster', cat: 'Entertainment', loc: null, ch: 'online' },
  { d: [today.getFullYear() - 1, 11, 18], amount: 214.6, desc: 'bol.com', cat: 'Gifts & Donations', loc: null, ch: 'online' },
]

for (const o of outliers) {
  add({
    date: new Date(o.d[0], o.d[1], o.d[2], 12),
    amount: o.amount,
    direction: 'debit',
    description: o.desc,
    category: o.cat,
    loc: o.loc,
    channel: o.ch,
  })
}

// The last few days are still settling, as they would be on a real feed.
for (const row of rows) {
  const ageDays = (today.getTime() - row.date.getTime()) / DAY_MS
  if (ageDays <= 2 && row.direction === 'debit' && chance(0.5)) row.status = 'pending'
}

rows.sort((a, b) => a.date - b.date)

// ── Running balance ────────────────────────────────────────────────────────
//
// Chosen so the account never goes overdrawn: a negative balance mid-year
// would make safe-to-spend and the cashflow chart nonsense.

const net = rows.reduce((s, r) => s + (r.direction === 'credit' ? r.amount : -r.amount), 0)

let opening = 1200
let trough = 0
for (let attempt = 0; attempt < 40; attempt++) {
  let bal = opening
  trough = bal
  for (const r of rows) {
    bal += r.direction === 'credit' ? r.amount : -r.amount
    trough = Math.min(trough, bal)
  }
  if (trough >= 150) break
  opening += 150 - trough
}

let balance = opening
for (const r of rows) {
  balance += r.direction === 'credit' ? r.amount : -r.amount
  r.runningBalance = Math.round(balance * 100) / 100
}
const closing = Math.round(balance * 100) / 100

// ── Encryption ─────────────────────────────────────────────────────────────

function encrypt(plaintext) {
  const raw = process.env.ENCRYPTION_KEY || ''
  const key = Buffer.from(raw, 'hex')
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)')
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return `${iv.toString('hex')}:${enc.toString('hex')}:${cipher.getAuthTag().toString('hex')}`
}

/** Stable per-transaction id, so a re-run updates rather than duplicates. */
function txId(row, i) {
  const h = createHash('sha256')
    .update(`${ymd(row.date)}|${row.merchantName}|${row.amount}|${i}`)
    .digest('hex')
    .slice(0, 24)
  return `${TX_PREFIX}${h}`
}

// ── Write ──────────────────────────────────────────────────────────────────

function report(extras = '') {
  const byCategory = {}
  let credits = 0
  let debits = 0
  for (const r of rows) {
    if (r.direction === 'credit') credits += r.amount
    else {
      debits += r.amount
      byCategory[r.merchantCategory] = (byCategory[r.merchantCategory] || 0) + r.amount
    }
  }

  // The span in months, not the count of calendar months it touches — a year
  // starting on the 24th touches thirteen, which understated every average.
  const months = (today.getTime() - start.getTime()) / DAY_MS / 30.44

  console.log(DRY_RUN ? `\nWould seed ${EMAIL}` : `\nSeeded ${EMAIL}`)
  console.log(`  bank          ING Bank · Betaalrekening (EUR)`)
  console.log(`  window        ${ymd(start)} → ${ymd(today)} (${months.toFixed(1)} months)`)
  console.log(`  transactions  ${rows.length}`)
  console.log(`  income        EUR ${credits.toFixed(2)}`)
  console.log(`  spend         EUR ${debits.toFixed(2)}`)
  console.log(`  opening       EUR ${opening.toFixed(2)}`)
  console.log(`  closing       EUR ${closing.toFixed(2)}  (lowest point EUR ${trough.toFixed(2)})`)
  console.log(`\n  spend by category, per month on average:`)
  for (const [cat, total] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${cat.padEnd(20)} EUR ${(total / months).toFixed(2).padStart(9)}`)
  }
  if (extras) console.log(extras)
  console.log('')

}

/**
 * Writes the generated year into an existing account.
 *
 * Shared by the CLI and the developer-only seed endpoint, so what runs on a
 * deployment is the same code that runs locally — a seeder that only works in
 * one of the two places is a seeder nobody trusts.
 *
 * Only rows tagged with DEMO_ITEM_ID are removed on a re-run; a real linked
 * bank on the same user is never touched.
 */
export async function seedInto(prisma, user, { wipe = false } = {}) {
  // The alternatives and location insights need somewhere to be.
  await prisma.user.update({
    where: { id: user.id },
    data: {
      currency: 'EUR',
      city: 'Vlissingen',
      country: 'Netherlands',
      latitude: 51.4426,
      longitude: 3.5736,
    },
  })

  // Clear only what this script owns.
  const existing = await prisma.linkedBank.findFirst({
    where: { userId: user.id, plaidItemId: DEMO_ITEM_ID },
  })
  if (existing) {
    await prisma.transaction.deleteMany({ where: { linkedBankId: existing.id } })
    await prisma.linkedBank.delete({ where: { id: existing.id } })
  }

  const bank = await prisma.linkedBank.create({
    data: {
      userId: user.id,
      plaidAccountId: `demo_acct_${user.id.slice(0, 10)}`,
      plaidItemId: DEMO_ITEM_ID,
      institutionName: 'ING Bank',
      accountType: 'depository',
      accountName: 'Betaalrekening',
      currency: 'EUR',
      accessToken: encrypt('demo-access-token-not-a-real-plaid-token'),
      currentBalance: closing,
      availableBalance: Math.round((closing - 45) * 100) / 100,
      balanceUpdatedAt: new Date(),
      lastSynced: new Date(),
    },
  })

  const data = rows.map((r, i) => ({
    userId: user.id,
    linkedBankId: bank.id,
    plaidTransactionId: txId(r, i),
    date: r.date,
    amount: r.amount,
    direction: r.direction,
    description: r.description,
    merchantName: r.merchantName,
    merchantCategory: r.merchantCategory,
    merchantCity: r.merchantCity,
    merchantState: r.merchantState,
    merchantCountry: r.merchantCountry,
    status: r.status,
    type: r.channel,
    runningBalance: r.runningBalance,
  }))

  for (let i = 0; i < data.length; i += 500) {
    await prisma.transaction.createMany({ data: data.slice(i, i + 500), skipDuplicates: true })
  }

  if (wipe) {
    await prisma.budget.deleteMany({ where: { userId: user.id } })
    await prisma.goal.deleteMany({ where: { userId: user.id } })
    await prisma.bill.deleteMany({ where: { userId: user.id } })
    await prisma.liability.deleteMany({ where: { userId: user.id } })
  }

  // Budgets set a little under what is actually spent, so some months breach
  // and some do not. A budget that is never exceeded tests nothing.
  const budgets = [
    ['Groceries', 280],
    ['Food & Dining', 140],
    ['Coffee', 65],
    ['Shopping', 150],
    ['Transportation', 90],
    ['Entertainment', 55],
  ]
  for (const [category, amount] of budgets) {
    await prisma.budget.upsert({
      where: { userId_category_period: { userId: user.id, category, period: 'monthly' } },
      update: { amount },
      create: { userId: user.id, category, amount, period: 'monthly' },
    })
  }

  const goals = [
    { name: 'Noodfonds', targetAmount: 3000, currentAmount: 1750, color: 'teal', months: 8 },
    { name: 'Rijbewijs', targetAmount: 2400, currentAmount: 620, color: 'amber', months: 11 },
    { name: 'Japan 2027', targetAmount: 4500, currentAmount: 300, color: 'violet', months: 15 },
  ]
  for (const g of goals) {
    const existingGoal = await prisma.goal.findFirst({ where: { userId: user.id, name: g.name } })
    if (existingGoal) continue
    await prisma.goal.create({
      data: {
        userId: user.id,
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        color: g.color,
        deadline: new Date(today.getTime() + g.months * 30 * DAY_MS),
      },
    })
  }

  // Bills mirror the recurring debits above, so reminders fire against charges
  // that genuinely appear in the history.
  const bills = [
    { name: 'Huur Appartement', amount: 895, dueDate: 1, frequency: 'monthly', category: 'Rent' },
    { name: 'Zilveren Kruis Zorgverzekering', amount: 142.95, dueDate: 5, frequency: 'monthly', category: 'Insurance' },
    { name: 'Eneco Energie', amount: 96.5, dueDate: 3, frequency: 'monthly', category: 'Bills & Utilities' },
    { name: 'Ziggo', amount: 45, dueDate: 8, frequency: 'monthly', category: 'Bills & Utilities' },
    { name: 'Odido', amount: 17.5, dueDate: 12, frequency: 'monthly', category: 'Bills & Utilities' },
    { name: 'Evides Waterbedrijf', amount: 33.75, dueDate: 15, frequency: 'quarterly', category: 'Bills & Utilities' },
  ]
  for (const b of bills) {
    const found = await prisma.bill.findFirst({ where: { userId: user.id, name: b.name } })
    if (found) continue
    await prisma.bill.create({
      data: { ...b, userId: user.id, anchorDate: new Date(today.getFullYear(), 0, b.dueDate, 12) },
    })
  }

  const loan = await prisma.liability.findFirst({
    where: { userId: user.id, name: 'DUO Studieschuld' },
  })
  if (!loan) {
    await prisma.liability.create({
      data: {
        userId: user.id,
        name: 'DUO Studieschuld',
        type: 'student_loan',
        balance: 18420.5,
        interestRate: 2.56,
        minPayment: 82.4,
        notes: 'Aflossingsfase begint na de aanloopfase',
      },
    })
  }

  // Monthly net-worth points, so the trend chart has a year behind it.
  const snapshots = []
  for (let i = 12; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1, 12)
    if (d < start) continue
    const atOrBefore = rows.filter((r) => r.date <= d)
    const cash = atOrBefore.length ? atOrBefore[atOrBefore.length - 1].runningBalance : opening
    // The student debt grows while the grant is still being drawn and holds
    // steady once the studying stops.
    const liabilities = employed(d) ? 18420.5 : 18420.5 - i * 210
    const investments = employed(d) ? Math.round((12 - i) * 118.4 * 100) / 100 : 0
    snapshots.push({
      userId: user.id,
      date: ymd(d),
      assets: Math.round((cash + investments) * 100) / 100,
      liabilities: Math.round(liabilities * 100) / 100,
      netWorth: Math.round((cash + investments - liabilities) * 100) / 100,
      cash: Math.round(cash * 100) / 100,
      investments,
    })
  }
  for (const s of snapshots) {
    await prisma.netWorthSnapshot.upsert({
      where: { userId_date: { userId: user.id, date: s.date } },
      update: s,
      create: s,
    })
  }

  return {
    transactions: data.length,
    budgets: budgets.length,
    goals: goals.length,
    bills: bills.length,
    liabilities: 1,
    netWorthPoints: snapshots.length,
    openingBalance: opening,
    closingBalance: closing,
    lowestBalance: trough,
    from: ymd(start),
    to: ymd(today),
  }
}

async function main() {
  const prisma = await db()
  const user = await prisma.user.findUnique({ where: { email: EMAIL } })
  if (!user) {
    throw new Error(`No account for ${EMAIL}. Register it in the app first, then run this again.`)
  }

  const result = await seedInto(prisma, user, { wipe: WIPE })
  report(
    `\n  also: ${result.budgets} budgets, ${result.goals} goals, ${result.bills} bills, ` +
      `${result.liabilities} liability, ${result.netWorthPoints} net-worth points`
  )
  await prisma.$disconnect()
}

/** The generated year, exported so it can be asserted against in tests. */
export { rows, opening, closing, trough }

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (invokedDirectly && DRY_RUN) {
  report()
} else if (invokedDirectly) {
  main().catch((err) => {
    console.error(`\nSeed failed: ${err.message}\n`)
    process.exitCode = 1
  })
}
