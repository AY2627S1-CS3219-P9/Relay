import { authFetch, refreshAccessToken } from '@relay/user-auth-frontend-fetch'
import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties, Dispatch, SetStateAction } from 'react'
import {
  SERVICE_METADATA,
  type FetchSessionHandler,
  type CreditBalance,
  type ErrandViewContext,
  type ProfileAnchor,
  type ServiceId,
  type SessionError,
  type User,
  type UserLocation,
} from '@relay/contracts'
import { RemotePage } from '../remote/RemotePage'
import './App.css'
import { hostErrandApi } from './errandApi'
import { hostSupplierApi } from './supplierApi'

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
  const [creditOpen, setCreditOpen] = useState(false)
  const [creditHistoryOpen, setCreditHistoryOpen] = useState(false)
  const [creditAnchor, setCreditAnchor] = useState<ProfileAnchor>()
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [storedCreditBalance, setStoredCreditBalance] = useState<CreditBalance | null>(null)
  const [creditInvalidation, setCreditInvalidation] = useState<{
    version: number
    subject?: string
    baseline: CreditBalance | null
  }>({ version: 0, baseline: null })
  const [authenticatedSubject, setAuthenticatedSubject] = useState<string>()
  const [authVersion, setAuthVersion] = useState(0)
  const creditBalance =
    storedCreditBalance?.userId === authenticatedSubject ? storedCreditBalance : null
  const [errandViewContext, setErrandViewContext] = useState<ErrandViewContext>()
  const [createErrandOnSupplierMap, setCreateErrandOnSupplierMap] = useState(false)
  const [userLocation, setUserLocation] = useState<UserLocation>()
  const [supplierMode, setSupplierMode] = useState<'explore' | 'requests' | 'my-errands'>('explore')
  const [marketplaceMapViewport, setMarketplaceMapViewport] = useState({
    center: { lat: 1.2966, lng: 103.7764 },
    zoom: 16,
  })

  useEffect(() => {
    if (!authenticatedSubject) return
    const refreshOnReturn = () => {
      if (document.visibilityState === 'visible') void refreshAccessToken()
    }
    const timer = window.setInterval(
      () => {
        void refreshAccessToken()
      },
      12 * 60 * 1000,
    )
    window.addEventListener('focus', refreshOnReturn)
    document.addEventListener('visibilitychange', refreshOnReturn)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refreshOnReturn)
      document.removeEventListener('visibilitychange', refreshOnReturn)
    }
  }, [authenticatedSubject])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setUserLocation({ lat: coords.latitude, lng: coords.longitude }),
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
    )
  }, [])

  async function requestUserLocation(): Promise<UserLocation | undefined> {
    if (!navigator.geolocation) return undefined
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const next = { lat: coords.latitude, lng: coords.longitude }
          setUserLocation(next)
          resolve(next)
        },
        () => resolve(undefined),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
      )
    })
  }

  const fetchSession: FetchSessionHandler = async () => {
    const response = await authFetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
    if (!response.ok)
      throw { code: 'SESSION INVALIDATED', message: 'No active session.' } satisfies SessionError
    const body = (await response.json()) as {
      ok: boolean
      data?: {
        user: {
          subject: string
          email: string
          emailVerified: boolean
          role: 'super-admin' | 'admin' | 'user'
        }
      }
    }
    if (!body.ok || !body.data?.user)
      throw { code: 'SESSION INVALIDATED', message: 'No active session.' } satisfies SessionError
    const user = body.data.user
    const profile = await authFetch('/api/user/me', { credentials: 'include', cache: 'no-store' })
    if (!profile.ok && profile.status !== 404) throw new Error('Unable to determine profile state.')
    return {
      token: '',
      userData: {
        id: user.subject,
        email: user.email,
        emailVerified: user.emailVerified,
        profileCreated: profile.ok,
        isAdmin: user.role === 'admin' || user.role === 'super-admin',
      },
    }
  }

  useEffect(() => {
    let cancelled = false
    const loadProfile = async () => {
      try {
        const session = await fetchSession()
        if (!cancelled) setAuthenticatedSubject(session.userData.id)
        if (!session.userData.profileCreated) {
          if (!cancelled) setUserProfile(null)
          return
        }
        const response = await authFetch('/api/user/me', { credentials: 'include' })
        if (cancelled) return
        if (response.ok) {
          const body = (await response.json()) as { ok?: boolean; data?: User }
          if (body.ok && body.data) setUserProfile(body.data)
        } else if (response.status === 404) setUserProfile(null)
      } catch {
        if (!cancelled) {
          setAuthenticatedSubject(undefined)
          setStoredCreditBalance(null)
          setUserProfile(null)
        }
      }
    }
    void loadProfile()
    return () => {
      cancelled = true
    }
  }, [])

  // Call this when a credit-changing action begins. Keep the displayed balance
  // until the service reports a newer snapshot.
  const invalidateCreditBalance = useCallback(() => {
    setCreditInvalidation((current) => ({
      version: current.version + 1,
      subject: authenticatedSubject,
      baseline: creditBalance?.userId === authenticatedSubject ? creditBalance : null,
    }))
  }, [authenticatedSubject, creditBalance])

  useEffect(() => {
    if (!authenticatedSubject) return

    const subject = authenticatedSubject
    const baseline = creditInvalidation.subject === subject ? creditInvalidation.baseline : null
    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let attempts = 0
    let lastError: unknown
    const controller = new AbortController()

    async function pollBalance() {
      attempts += 1
      try {
        const response = await authFetch('/api/credit', {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`Credit balance request failed (${response.status}).`)
        const balance = (await response.json()) as CreditBalance
        if (cancelled) return
        const unchanged =
          baseline &&
          balance.availableCredit === baseline.availableCredit &&
          balance.reserveCredit === baseline.reserveCredit &&
          String(balance.lastUpdated) === String(baseline.lastUpdated)
        if (!unchanged) {
          setStoredCreditBalance(balance)
          return
        }
        lastError = new Error('Credit balance has not changed yet.')
      } catch (error) {
        if (cancelled) return
        lastError = error
      }
      if (attempts >= 20) {
        console.error('Credit balance did not update after 20 attempts.', lastError)
        return
      }
      retryTimer = setTimeout(() => {
        void pollBalance()
      }, 1000)
    }

    void pollBalance()
    return () => {
      cancelled = true
      controller.abort()
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [authenticatedSubject, creditInvalidation, authVersion])
  async function refreshUserProfile() {
    try {
      const session = await fetchSession({ forceRefresh: true })
      setAuthenticatedSubject(session.userData.id)
      if (!session.userData.profileCreated) {
        setUserProfile(null)
        setAuthVersion((version) => version + 1)
        return
      }
      const response = await authFetch('/api/user/me', { credentials: 'include' })
      if (response.ok) {
        const body = (await response.json()) as { ok?: boolean; data?: User }
        if (body.ok && body.data) setUserProfile(body.data)
      } else if (response.status === 404) setUserProfile(null)
      setAuthVersion((version) => version + 1)
    } catch {
      setAuthenticatedSubject(undefined)
      setStoredCreditBalance(null)
      setUserProfile(null)
      setAuthVersion((version) => version + 1)
    }
  }

  function navigateTo(service: ServiceId) {
    setProfileOpen(false)
    setProfileAnchor(undefined)
    closeCredit()
    if (service !== 'errand') {
      setErrandViewContext(undefined)
      setCreateErrandOnSupplierMap(false)
    }
    if (service === 'supplier') setSupplierMode('explore')
    setActiveService(service)
  }

  function openErrandView(context: ErrandViewContext) {
    closeCredit()
    if (context.view === 'explore') {
      setSupplierMode('explore')
      navigateTo('supplier')
      return
    }
    if (context.view === 'create') {
      setCreateErrandOnSupplierMap(activeService === 'supplier')
    } else {
      setCreateErrandOnSupplierMap(false)
    }
    if (context.view === 'requests') setSupplierMode('requests')
    if (context.view === 'my-errands') setSupplierMode('my-errands')
    setErrandViewContext(context)
    if (context.view !== 'create' || activeService !== 'supplier') setActiveService('errand')
  }

  function openProfile(anchor: ProfileAnchor) {
    closeCredit()
    setProfileAnchor(anchor)
    setProfileOpen(true)
  }

  function openCredit(anchor: ProfileAnchor) {
    setProfileOpen(false)
    setProfileAnchor(undefined)
    setCreditAnchor(anchor)
    setCreditHistoryOpen(false)
    setCreditOpen(true)
  }

  function closeCredit() {
    setCreditOpen(false)
    setCreditHistoryOpen(false)
    setCreditAnchor(undefined)
  }

  const updateViewport = useCallback(
    (
      setViewport: Dispatch<SetStateAction<{ center: UserLocation; zoom: number }>>,
      nextViewport: { center: UserLocation; zoom: number },
    ) => {
      setViewport((currentViewport) =>
        currentViewport.zoom === nextViewport.zoom &&
        currentViewport.center.lat === nextViewport.center.lat &&
        currentViewport.center.lng === nextViewport.center.lng
          ? currentViewport
          : nextViewport,
      )
    },
    [],
  )

  const handleMarketplaceMapViewportChange = useCallback(
    (nextViewport: { center: UserLocation; zoom: number }) => {
      updateViewport(setMarketplaceMapViewport, nextViewport)
    },
    [updateViewport],
  )

  function closeProfile() {
    setProfileOpen(false)
    setProfileAnchor(undefined)
  }

  function profileCardStyle(): CSSProperties | undefined {
    if (!profileAnchor) return undefined
    const cardWidth = Math.min(520, window.innerWidth - 32)
    const cardMaxHeight = window.innerHeight * 0.6
    const top = Math.min(profileAnchor.bottom + 12, window.innerHeight - cardMaxHeight - 16)
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

  function creditCardStyle(): CSSProperties | undefined {
    if (!creditAnchor) return undefined
    if (window.innerWidth <= 700) {
      const toolbarHeight = 72
      const contentHeight = creditHistoryOpen ? 640 : 260
      return {
        height: Math.min(contentHeight + toolbarHeight, window.innerHeight - 24),
      }
    }
    const cardWidth = Math.min(creditHistoryOpen ? 760 : 405, window.innerWidth - 32)
    const top = Math.max(16, creditAnchor.bottom + 12)
    const availableHeight = Math.max(180, window.innerHeight - top - 16)
    const height = Math.min(creditHistoryOpen ? 640 : 280, availableHeight)
    const left = Math.min(Math.max(16, creditAnchor.left), window.innerWidth - cardWidth - 16)
    return { top, left, width: cardWidth, height }
  }

  return (
    <main className="relay-host-shell">
      <div className="remote-grid">
        {Object.values(SERVICE_METADATA).map(({ id, label }) => (
          <RemotePage
            key={id}
            service={id}
            serviceLabel={label}
            visible={
              activeService === id ||
              (id === 'user' && profileOpen) ||
              (id === 'credit' && creditOpen) ||
              (id === 'errand' && createErrandOnSupplierMap)
            }
            bubbleAnchor={
              id === 'user' && profileOpen
                ? profileAnchor
                : id === 'credit' && creditOpen
                  ? creditAnchor
                  : undefined
            }
            appProps={{
              fetchSession,
              authVersion,
              authenticatedSubject,
              userProfile,
              creditBalance,
              invalidateCreditBalance,
              refreshUserProfile,
              navigateTo,
              openProfile,
              openCredit,
              closeCredit: id === 'credit' ? closeCredit : undefined,
              creditHistoryOpen: id === 'credit' ? creditHistoryOpen : undefined,
              showCreditHistory: id === 'credit' ? () => setCreditHistoryOpen(true) : undefined,
              showCreditBalance: id === 'credit' ? () => setCreditHistoryOpen(false) : undefined,
              openErrandView,
              errandApi: hostErrandApi,
              supplierApi: hostSupplierApi,
              onErrandAccepted: () => openErrandView({ view: 'my-errands' }),
              errandViewContext: id === 'errand' ? errandViewContext : undefined,
              userLocation,
              requestUserLocation,
              supplierMode: id === 'supplier' ? supplierMode : undefined,
              mapViewport: marketplaceMapViewport,
              onMapViewportChange:
                activeService === id ? handleMarketplaceMapViewportChange : undefined,
              mapActive: activeService === id,
              closeProfile: id === 'user' ? closeProfile : undefined,
              presentation:
                id === 'credit'
                  ? undefined
                  : id === 'user' && profileOpen
                    ? 'card'
                    : id === 'errand' && createErrandOnSupplierMap
                      ? 'card'
                      : 'full',
            }}
            overlay={
              (id === 'user' && profileOpen) ||
              (id === 'credit' && creditOpen) ||
              (id === 'errand' && createErrandOnSupplierMap)
            }
            overlayClassName={
              id === 'errand' && createErrandOnSupplierMap
                ? 'errand-create-overlay-page'
                : undefined
            }
            card={(id === 'user' && profileOpen) || (id === 'credit' && creditOpen)}
            cardStyle={
              id === 'user' && profileOpen
                ? profileCardStyle()
                : id === 'credit' && creditOpen
                  ? creditCardStyle()
                  : undefined
            }
          />
        ))}
      </div>
    </main>
  )
}

export default App
