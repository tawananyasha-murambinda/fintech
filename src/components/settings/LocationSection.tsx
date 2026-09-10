'use client'

import { useEffect, useState } from 'react'
import { SettingsCard, SettingsRow } from './SettingsCard'
import {
  detectAndSaveLocation,
  saveUserLocation,
  getUserLocation,
  LOCATION_MESSAGES,
} from '@/lib/location'

export function LocationSection() {
  const [mounted, setMounted] = useState(false)
  const [tracking, setTracking] = useState(false)
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Manual entry, which is the fallback whenever the browser will not say
  // where it is — previously there was no way to set a city at all.
  const [manualCity, setManualCity] = useState('')
  const [manualCountry, setManualCountry] = useState('')
  const [savingManual, setSavingManual] = useState(false)

  useEffect(() => {
    setMounted(true)
    setTracking(localStorage.getItem('location_tracking') === 'true')
    getUserLocation().then((loc) => {
      if (loc) {
        setCity(loc.city || '')
        setCountry(loc.country || '')
      }
    })
  }, [])

  async function handleDetect() {
    setLocating(true)
    setError('')
    setNotice('')

    const result = await detectAndSaveLocation()

    if (!result.ok) {
      // Every one of these used to be swallowed, which is why the button
      // looked like it did nothing.
      setError(LOCATION_MESSAGES[result.reason])
      setLocating(false)
      return
    }

    if (result.city) {
      setCity(result.city)
      setCountry(result.country || '')
      setNotice(`Location set to ${result.city}${result.country ? `, ${result.country}` : ''}.`)
    } else {
      setError(LOCATION_MESSAGES['lookup-failed'])
    }

    setLocating(false)
  }

  async function handleManualSave(e: React.FormEvent) {
    e.preventDefault()
    if (!manualCity.trim()) return

    setSavingManual(true)
    setError('')
    setNotice('')

    const ok = await saveUserLocation({
      city: manualCity.trim(),
      country: manualCountry.trim() || undefined,
    })

    if (ok) {
      setCity(manualCity.trim())
      setCountry(manualCountry.trim())
      setManualCity('')
      setManualCountry('')
      setNotice('Location saved.')
    } else {
      setError(LOCATION_MESSAGES['save-failed'])
    }

    setSavingManual(false)
  }

  function toggleTracking(val: boolean) {
    setTracking(val)
    localStorage.setItem('location_tracking', String(val))
    if (val) handleDetect()
  }

  if (!mounted) {
    return (
      <SettingsCard title="Location" description="Manage your location preferences for personalised insights.">
        <div className="py-8 text-center">
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </SettingsCard>
    )
  }

  return (
    <SettingsCard
      title="Location"
      description="Your city is what lets us find real nearby alternatives instead of generic advice. It is never shared."
    >
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300"
        >
          {error}
        </div>
      )}
      {notice && !error && (
        <div
          role="status"
          className="rounded-xl border border-teal-100 bg-teal-50 px-3 py-2.5 text-xs text-teal-800 dark:border-teal-900/40 dark:bg-teal-950/40 dark:text-teal-200"
        >
          {notice}
        </div>
      )}

      <SettingsRow
        label="Location tracking"
        description="Lets the app look up shops and fares near you."
      >
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={tracking}
            onChange={(e) => toggleTracking(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">Enabled</span>
        </label>
      </SettingsRow>

      <SettingsRow
        label="Current location"
        description={city ? 'Used for local alternatives.' : 'Not set — suggestions will stay generic.'}
      >
        {city ? (
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {city}
            {country ? `, ${country}` : ''}
          </p>
        ) : (
          <p className="text-sm text-slate-400">None</p>
        )}
      </SettingsRow>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
        <button
          onClick={handleDetect}
          disabled={locating}
          className="btn-secondary text-sm disabled:opacity-50"
        >
          {locating ? 'Detecting…' : city ? 'Detect again' : 'Detect my location'}
        </button>

        <form onSubmit={handleManualSave} className="space-y-2">
          <label className="label" htmlFor="manual-city">
            Or set it yourself
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="manual-city"
              type="text"
              value={manualCity}
              onChange={(e) => setManualCity(e.target.value)}
              placeholder="City"
              className="input flex-1"
              autoComplete="address-level2"
            />
            <input
              type="text"
              value={manualCountry}
              onChange={(e) => setManualCountry(e.target.value)}
              placeholder="Country (optional)"
              className="input flex-1"
              autoComplete="country-name"
            />
            <button
              type="submit"
              disabled={savingManual || !manualCity.trim()}
              className="btn-primary text-sm shrink-0 disabled:opacity-50"
            >
              {savingManual ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </SettingsCard>
  )
}
