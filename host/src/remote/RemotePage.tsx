import { Component, lazy, Suspense, useMemo, type ReactNode } from 'react'
import type { ServiceId } from '@relay/contracts'
import { loadServiceRemote } from '../app/federation'

type RemotePageProps = {
  service: ServiceId
  serviceLabel: string
}

class RemoteFailureBoundary extends Component<
  { children: ReactNode; serviceLabel: string },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <section className="remote-state" role="alert">
          <h2>{this.props.serviceLabel} is unavailable</h2>
          <p>The host is running, but this independently deployed frontend could not be loaded.</p>
        </section>
      )
    }

    return this.props.children
  }
}

export function RemotePage({ service, serviceLabel }: RemotePageProps) {
  const RemoteApp = useMemo(() => lazy(() => loadServiceRemote(service)), [service])

  return (
    <section className="remote-page" aria-label={serviceLabel}>
      <RemoteFailureBoundary key={service} serviceLabel={serviceLabel}>
        <Suspense fallback={<section className="remote-state"><p>Loading {serviceLabel}…</p></section>}>
          <RemoteApp />
        </Suspense>
      </RemoteFailureBoundary>
    </section>
  )
}
