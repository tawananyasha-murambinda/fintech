'use client'

import { useEffect, useState } from 'react'
import { SettingsCard, SettingsRow } from './SettingsCard'
import { detectUserLocation, saveUserLocation, getUserLocation } from '@/lib/location'

export function LocationSection() {
  const [mounted, setMounted] = useState(false)
  const [tracking, setTracking] = useState(false)
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    setMounted(true)
    const enabled = localStorage.getItem('location_tracking') === 'true'
    setTracking(enabled)
    getUserLocation().then((loc) => {
      if (loc) {
        setCity(loc.city || '')
        setCountry(loc.country || '')
      }
    })
  }, [])

  async function handleDetect() {
    setLocating(true)
    const loc = await detectUserLocation()
    if (loc) {
      await saveUserLocation(loc)
      setCity(loc.city || '')
      setCountry(loc.country || '')
    }
    setLocating(false)
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
    <SettingsCard title="Location" description="Your location helps find local merchant alternatives and personalised savings tips.">
      <SettingsRow
        label="Location tracking"
        description="Detect your location to enable area-specific spending insights and nearby alternatives."
      >
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={tracking}
            onChange={e => toggleTracking(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">Enabled</span>
        </label>
      </SettingsRow>

      {city && (
        <SettingsRow label="Current location" description="Your detected city and country.">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {city}{country ? `, ${country}` : ''}
          </p>
        </SettingsRow>
      )}

      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={handleDetect}
          disabled={locating}
          className="text-sm font-medium text-teal-700 hover:text-teal-800 disabled:opacity-50 transition-colors dark:text-teal-400"
        >
          {locating ? 'Detecting…' : city ? 'Update location' : 'Detect my location'}
        </button>
      </div>
    </SettingsCard>
  )
}
