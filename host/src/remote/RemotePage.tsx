import {
  Component,
  lazy,
  Suspense,
  type ComponentType,
  type CSSProperties,
  type LazyExoticComponent,
  type ReactNode,
} from 'react'
import type { RemoteAppProps, ServiceId } from '@relay/contracts'
import { BubblePopover, GlassCard, LoadingState, type BubbleAnchor } from '@relay/ui'
import { loadServiceRemote } from './RemoteLoader'
import { REMOTE_REGISTRY } from './RemoteRegistry'

type RemotePageProps = {
  service: ServiceId
  serviceLabel: string
  visible: boolean
  appProps?: RemoteAppProps
  overlay?: boolean
  card?: boolean
  cardStyle?: CSSProperties
  bubbleAnchor?: BubbleAnchor
}

type RemoteComponent = LazyExoticComponent<ComponentType<RemoteAppProps>>

const remoteApps = Object.fromEntries(
  Object.keys(REMOTE_REGISTRY).map((service) => [
    service,
    lazy(() => loadServiceRemote(service as ServiceId)),
  ]),
) as Record<ServiceId, RemoteComponent>

// Catch rendering errors and show error state
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
          <p>If this is unexpected, please report it to the developers.</p>
        </section>
      )
    }

    return this.props.children
  }
}

export function RemotePage({
  service,
  serviceLabel,
  visible,
  appProps,
  overlay,
  card,
  cardStyle,
  bubbleAnchor,
}: RemotePageProps) {
  const RemoteApp = remoteApps[service]

  return (
    <section
      className={`remote-page${overlay ? ' remote-page-overlay' : ''}`}
      aria-label={serviceLabel}
      style={{ display: visible ? undefined : 'none' }}
    >
      <RemoteFailureBoundary key={service} serviceLabel={serviceLabel}>
        <BubblePopover anchor={bubbleAnchor} open={card && Boolean(bubbleAnchor)}>
          <GlassCard
            variant={card ? 'glass' : 'plain'}
            className={card ? 'remote-profile-card' : ''}
            style={card ? cardStyle : undefined}
          >
            <Suspense fallback={<LoadingState label={`Loading ${serviceLabel}`} />}>
              <RemoteApp {...appProps} />
            </Suspense>
          </GlassCard>
        </BubblePopover>
      </RemoteFailureBoundary>
    </section>
  )
}
