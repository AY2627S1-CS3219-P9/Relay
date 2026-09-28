import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { SERVICE_METADATA, type FetchSessionHandler, type ProfileAnchor, type ServiceId, type SessionError, type User } from '@relay/contracts'
import { RemotePage } from '../remote/RemotePage'
import './App.css'
import { Hub } from 'aws-amplify/utils'

function App() {
  /*
   * MFE lifecycle note:
   *
   * RemotePage currently renders every remote and uses `visible` to hide the
   * inactive ones. This keeps each MFE mounted, so navigating User -> Supplier
   * -> User preserves User's local React state, including AccountView.
   *
   * If this host is changed to mount only the active MFE, render only the
   * RemotePage for `activeService`. That will reduce initial loading, but the
   * inactive MFE will be unmounted and its local state will be destroyed. When
   * making that change, also:
   *
   * 1. Move the authenticated session out of the User MFE and into the host,
   * 2. Extend RemoteAppProps as needed so each MFE receives the session/auth
   *    state it needs after being mounted.
   * 3. Keep navigation callbacks in the host so MFEs request navigation rather
   *    than importing or mounting one another directly.
   * 4. Ensure the User MFE can restore AccountView from the host session when
   *    it is mounted again after returning from another MFE.
   *
   * The first visit to a service will then have a cold-start delay, while
   * subsequent visits can reuse the browser/module-federation cache.
   */
  const [activeService, setActiveService] = useState<ServiceId>('user')
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileAnchor, setProfileAnchor] = useState<ProfileAnchor>()
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [authVersion, setAuthVersion] = useState(0)

  const fetchSession: FetchSessionHandler = async (options) => {
    const response = await fetch('/api/user/session', {
      credentials: 'include',
      cache: options?.forceRefresh ? 'no-store' : 'default',
    })
    const body = (await response.json()) as {
      ok?: boolean
      data?: { user: { subject: string; email: string; emailVerified: boolean; profileCreated: boolean; role: 'admin' | 'user' } }
    }
    if (!response.ok || !body.ok || !body.data) {
      const error: SessionError = { code: 'SESSION INVALIDATED', message: 'No active session.' }
      throw error
    }
    const user = body.data.user
    return {
      token: '',
      userData: {
        id: user.subject,
        email: user.email,
        emailVerified: user.emailVerified,
        profileCreated: user.profileCreated,
        isAdmin: user.role === 'admin',
      }
    }
  }

  useEffect(() => {
    let cancelled = false
    const loadProfile = async () => {
      try {
        const session = await fetchSession()
        if (!session.userData.profileCreated) {
          if (!cancelled) setUserProfile(null)
          return
        }
        const response = await fetch('/api/user/me', { credentials: 'include' })
        if (cancelled) return
        if (response.ok) {
          const body = (await response.json()) as { ok?: boolean; data?: User }
          if (body.ok && body.data) setUserProfile(body.data)
        }
        else if (response.status === 404) setUserProfile(null)
      } catch {
        if (!cancelled) setUserProfile(null)
      }
    }
    void loadProfile()
    const removeAuthListener = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn' || payload.event === 'signedOut' || payload.event === 'tokenRefresh') {
        setAuthVersion(version => version + 1)
        void loadProfile()
      }
    })
    return () => {
      cancelled = true
      removeAuthListener()
    }
  }, [])

  async function refreshUserProfile() {
    try {
      const session = await fetchSession({ forceRefresh: true })
      if (!session.userData.profileCreated) {
        setUserProfile(null)
        return
      }
      const response = await fetch('/api/user/me', { credentials: 'include' })
      if (response.ok) {
        const body = (await response.json()) as { ok?: boolean; data?: User }
        if (body.ok && body.data) setUserProfile(body.data)
      }
      else if (response.status === 404) setUserProfile(null)
    } catch {
      setUserProfile(null)
    }
  }

  function navigateTo(service: ServiceId) {
    setProfileOpen(false)
    setProfileAnchor(undefined)
    setActiveService(service)
  }

  function openProfile(anchor: ProfileAnchor) {
    setProfileAnchor(anchor)
    setProfileOpen(true)
  }

  function closeProfile() {
    setProfileOpen(false)
    setProfileAnchor(undefined)
  }

  function profileCardStyle(): CSSProperties | undefined {
    if (!profileAnchor) return undefined
    const cardWidth = Math.min(520, window.innerWidth - 32)
    const cardMaxHeight = window.innerHeight * 0.6
    const top = Math.min(
      profileAnchor.bottom + 12,
      window.innerHeight - cardMaxHeight - 16,
    )
    const left = Math.min(
      Math.max(16, profileAnchor.right - cardWidth),
      window.innerWidth - cardWidth - 16,
    )
    return {
      top: Math.max(16, top),
      left,
      width: cardWidth,
    }
  }

  return (
    <main className="relay-host-shell">
      <div className="remote-grid">
        {Object.values(SERVICE_METADATA).map(({ id, label }) => (
          <RemotePage
            key={id}
            service={id}
            serviceLabel={label}
            visible={activeService === id || (id === 'user' && profileOpen)}
            overlay={id === 'user' && profileOpen}
            card={id === 'user' && profileOpen}
            cardStyle={id === 'user' && profileOpen ? profileCardStyle() : undefined}
            appProps={{
              fetchSession,
              authVersion,
              userProfile,
              refreshUserProfile,
              navigateTo,
              openProfile: id === 'supplier' ? openProfile : undefined,
              closeProfile: id === 'user' ? closeProfile : undefined,
              presentation: id === 'user' && profileOpen ? 'card' : 'full',
            }}
          />
        ))}
      </div>
    </main>
  )
}

export default App
