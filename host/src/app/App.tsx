import { useState } from 'react'
import { SERVICE_METADATA, type ServiceId } from '@relay/contracts'
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

  return (
    <main>
      <div className="remote-grid">
        {Object.values(SERVICE_METADATA).map(({ id, label }) => (
          <RemotePage
            key={id}
            service={id}
            serviceLabel={label}
            visible={activeService === id}
            appProps={{ onNavigate: setActiveService }}
          />
        ))}
      </div>
    </main>
  )
}

export default App
