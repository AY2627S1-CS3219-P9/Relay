import { useState } from 'react'
import type { CSSProperties } from 'react'
import { SERVICE_METADATA, type ProfileAnchor, type ServiceId } from '@relay/contracts'
import { RemotePage } from '../remote/RemotePage'
import './App.css'

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
              onNavigate: navigateTo,
              onOpenProfile: id === 'supplier' ? openProfile : undefined,
              onCloseProfile: id === 'user' ? closeProfile : undefined,
              presentation: id === 'user' && profileOpen ? 'card' : 'full',
            }}
          />
        ))}
      </div>
    </main>
  )
}

export default App
