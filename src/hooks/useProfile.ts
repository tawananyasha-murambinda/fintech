import { useEffect, useState } from 'react'

export interface ProfileData {
  id: string
  name: string | null
  email: string
  image: string | null
  createdAt: string
  hasPassword: boolean
}

export function useProfile() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/profile')
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          setProfile(d.user)
        } else {
          setError(d.error || 'Failed to load profile')
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load profile')
        setLoading(false)
      })
  }, [])

  return { profile, loading, error, setProfile }
}
