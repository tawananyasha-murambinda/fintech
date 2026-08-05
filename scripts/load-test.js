#!/usr/bin/env node
// Minimal load test for FinTrack.
//
// Usage:
//   node scripts/load-test.js <baseUrl> <concurrency> <durationSec> [path]
//
// Example:
//   node scripts/load-test.js http://localhost:3000 20 10 /api/health
//
// Hits the given path concurrently for the duration and reports the
// request rate, latency percentiles, and error count. No external
// dependencies.

const [, , baseUrl, concurrencyArg, durationArg, pathArg] = process.argv

const base = (baseUrl || 'http://localhost:3000').replace(/\/$/, '')
const concurrency = Math.max(1, parseInt(concurrencyArg || '10', 10))
const durationSec = Math.max(1, parseInt(durationArg || '10', 10))
const path = pathArg || '/api/health'
const url = `${base}${path}`

const start = Date.now()
let done = 0
let errors = 0
let inFlight = 0
const latencies = []
const samples = []

async function worker() {
  while (Date.now() - start < durationSec * 1000) {
    const t0 = Date.now()
    inFlight++
    try {
      const res = await fetch(url)
      if (!res.ok) errors++
    } catch {
      errors++
    } finally {
      const elapsed = Date.now() - t0
      latencies.push(elapsed)
      inFlight--
      done++
    }
  }
}

async function sampler() {
  while (Date.now() - start < durationSec * 1000) {
    samples.push({ t: Date.now() - start, inFlight })
    await new Promise((r) => setTimeout(r, 250))
  }
}

function pct(arr, p) {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]
}

console.log(`Load test: ${url} (concurrency=${concurrency}, ${durationSec}s)`)
console.log('')

await Promise.all([...Array(concurrency).fill(0).map(worker), sampler()])

const elapsedSec = (Date.now() - start) / 1000
const peakInFlight = samples.reduce((m, s) => Math.max(m, s.inFlight), 0)

console.log(`Requests: ${done} in ${elapsedSec.toFixed(1)}s (${(done / elapsedSec).toFixed(1)}/s)`)
console.log(`Errors:   ${errors}`)
console.log(`Peak in flight: ${peakInFlight}/${concurrency}`)
console.log(`Latency p50: ${pct(latencies, 50)}ms  p95: ${pct(latencies, 95)}ms  p99: ${pct(latencies, 99)}ms  max: ${pct(latencies, 100)}ms`)
process.exit(errors > 0 ? 1 : 0)
