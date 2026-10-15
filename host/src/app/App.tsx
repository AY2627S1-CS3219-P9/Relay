import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties, Dispatch, SetStateAction } from 'react'
import {
  SERVICE_METADATA,
  type FetchSessionHandler,
  type ErrandViewContext,
  type ProfileAnchor,
  type ServiceId,
  type SessionError,
  type User,
  type UserLocation,
} from '@relay/contracts'
import { RemotePage } from '../remote/RemotePage'
import './App.css'
import { Hub } from 'aws-amplify/utils'
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
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [authenticatedSubject, setAuthenticatedSubject] = useState<string>()
  const [authVersion, setAuthVersion] = useState(0)
  const [errandViewContext, setErrandViewContext] = useState<ErrandViewContext>()
  const [createErrandOnSupplierMap, setCreateErrandOnSupplierMap] = useState(false)
  const [userLocation, setUserLocation] = useState<UserLocation>()
  const [supplierMode, setSupplierMode] = useState<'explore' | 'requests' | 'my-errands'>('explore')
  const [marketplaceMapViewport, setMarketplaceMapViewport] = useState({ center: { lat: 1.2966, lng: 103.7764 }, zoom: 16 })

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

  const fetchSession: FetchSessionHandler = async (options) => {
    const response = await fetch('/api/user/session', {
      credentials: 'include',
      cache: options?.forceRefresh ? 'no-store' : 'default',
    })
    const body = (await response.json()) as {
      ok?: boolean
      data?: {
        user: {
          subject: string
          email: string
          emailVerified: boolean
          profileCreated: boolean
          role: 'admin' | 'user'
        }
      }
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
        const response = await fetch('/api/user/me', { credentials: 'include' })
        if (cancelled) return
        if (response.ok) {
          const body = (await response.json()) as { ok?: boolean; data?: User }
          if (body.ok && body.data) setUserProfile(body.data)
        } else if (response.status === 404) setUserProfile(null)
      } catch {
        if (!cancelled) {
          setAuthenticatedSubject(undefined)
          setUserProfile(null)
        }
      }
    }
    void loadProfile()
    const removeAuthListener = Hub.listen('auth', ({ payload }) => {
      if (
        payload.event === 'signedIn' ||
        payload.event === 'signedOut' ||
        payload.event === 'tokenRefresh'
      ) {
        setAuthVersion((version) => version + 1)
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
      setAuthenticatedSubject(session.userData.id)
      if (!session.userData.profileCreated) {
        setUserProfile(null)
        setAuthVersion((version) => version + 1)
        return
      }
      const response = await fetch('/api/user/me', { credentials: 'include' })
      if (response.ok) {
        const body = (await response.json()) as { ok?: boolean; data?: User }
        if (body.ok && body.data) setUserProfile(body.data)
      } else if (response.status === 404) setUserProfile(null)
      setAuthVersion((version) => version + 1)
    } catch {
      setAuthenticatedSubject(undefined)
      setUserProfile(null)
      setAuthVersion((version) => version + 1)
    }
  }

  function navigateTo(service: ServiceId) {
    setProfileOpen(false)
    setProfileAnchor(undefined)
    if (service !== 'errand') {
      setErrandViewContext(undefined)
      setCreateErrandOnSupplierMap(false)
    }
    if (service === 'supplier') setSupplierMode('explore')
    setActiveService(service)
  }

  function openErrandView(context: ErrandViewContext) {
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
    setProfileAnchor(anchor)
    setProfileOpen(true)
  }

  const updateViewport = useCallback((
    setViewport: Dispatch<SetStateAction<{ center: UserLocation; zoom: number }>>,
    nextViewport: { center: UserLocation; zoom: number },
  ) => {
    setViewport((currentViewport) => (
      currentViewport.zoom === nextViewport.zoom &&
      currentViewport.center.lat === nextViewport.center.lat &&
      currentViewport.center.lng === nextViewport.center.lng
        ? currentViewport
        : nextViewport
    ))
  }, [])

  const handleMarketplaceMapViewportChange = useCallback((nextViewport: { center: UserLocation; zoom: number }) => {
    updateViewport(setMarketplaceMapViewport, nextViewport)
  }, [updateViewport])

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

  return (
    <main className="relay-host-shell">
      <div className="remote-grid">
        {Object.values(SERVICE_METADATA).map(({ id, label }) => (
          <RemotePage
            key={id}
            service={id}
            serviceLabel={label}
            visible={activeService === id || (id === 'user' && profileOpen) || (id === 'errand' && createErrandOnSupplierMap)}
            bubbleAnchor={id === 'user' && profileOpen ? profileAnchor : undefined}
            appProps={{
              fetchSession,
              authVersion,
              authenticatedSubject,
              userProfile,
              refreshUserProfile,
              navigateTo,
              openProfile,
              openErrandView,
              errandApi: hostErrandApi,
              supplierApi: hostSupplierApi,
              onErrandAccepted: () => openErrandView({ view: 'my-errands' }),
              errandViewContext: id === 'errand' ? errandViewContext : undefined,
              userLocation,
              requestUserLocation,
              supplierMode: id === 'supplier' ? supplierMode : undefined,
              mapViewport: marketplaceMapViewport,
              onMapViewportChange: activeService === id
                ? handleMarketplaceMapViewportChange
                : undefined,
              mapActive: activeService === id,
              closeProfile: id === 'user' ? closeProfile : undefined,
              presentation: id === 'user' && profileOpen
                ? 'card'
                : id === 'errand' && createErrandOnSupplierMap
                  ? 'card'
                  : 'full',
            }}
            overlay={
              (id === 'user' && profileOpen) || (id === 'errand' && createErrandOnSupplierMap)
            }
            overlayClassName={id === 'errand' && createErrandOnSupplierMap ? 'errand-create-overlay-page' : undefined}
            card={
              id === 'user' && profileOpen
            }
            cardStyle={
              id === 'user' && profileOpen ? profileCardStyle() : undefined
            }
          />
        ))}
      </div>
    </main>
  )
}

export default App
