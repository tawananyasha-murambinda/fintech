import https from 'https'
import fs from 'fs'
import path from 'path'

const TELLER_BASE = 'https://api.teller.io'

function getTellerAgent() {
  const certPath = process.env.TELLER_CERTIFICATE
  const keyPath = process.env.TELLER_PRIVATE_KEY

  if (certPath && keyPath && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    return new https.Agent({
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    })
  }

  // Dev fallback: no mTLS (sandbox only)
  return undefined
}

async function tellerFetch<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const agent = getTellerAgent()

  const res = await fetch(`${TELLER_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Basic ${Buffer.from(`${accessToken}:`).toString('base64')}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    // @ts-ignore — node-fetch agent
    agent,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(`Teller API error ${res.status}: ${JSON.stringify(error)}`)
  }

  return res.json()
}

export interface TellerAccount {
  id: string
  institution: { id: string; name: string }
  name: string
  type: string
  subtype: string
  currency: string
  enrollment_id: string
  links: { self: string; transactions: string; balances: string }
  status: string
}

export interface TellerBalance {
  account_id: string
  available: string
  ledger: string
  links: { self: string; account: string }
}

export interface TellerTransaction {
  id: string
  account_id: string
  date: string
  description: string
  amount: string
  direction: 'credit' | 'debit'
  status: 'posted' | 'pending'
  type: string
  details: {
    processing_status: string
    category?: string
    counterparty?: {
      name?: string
      type?: string
    }
  }
  running_balance?: string
  links: { self: string; account: string }
}

export async function getTellerAccounts(accessToken: string): Promise<TellerAccount[]> {
  return tellerFetch<TellerAccount[]>('/accounts', accessToken)
}

export async function getTellerBalance(
  accessToken: string,
  accountId: string
): Promise<TellerBalance> {
  return tellerFetch<TellerBalance>(`/accounts/${accountId}/balances`, accessToken)
}

export async function getTellerTransactions(
  accessToken: string,
  accountId: string,
  options: { from?: string; to?: string; count?: number } = {}
): Promise<TellerTransaction[]> {
  const params = new URLSearchParams()
  if (options.from) params.set('from_id', options.from)
  if (options.count) params.set('count', String(options.count))

  const query = params.toString() ? `?${params}` : ''
  return tellerFetch<TellerTransaction[]>(`/accounts/${accountId}/transactions${query}`, accessToken)
}
