import type { ServiceMetadata } from '@relay/contracts'

export { ErrorMessage } from './ErrorMessage'
export type { MessageVariant } from './ErrorMessage'

export function ServiceCard({
  label,
  description,
  onOpen,
}: ServiceMetadata & { onOpen: () => void }) {
  return (
    <article className="service-card">
      <p className="eyebrow">Microfrontend</p>
      <h2>{label}</h2>
      <p>{description}</p>
      <button type="button" onClick={onOpen}>
        Open service
      </button>
    </article>
  )
}

export function ServiceRemotePage({
  service,
  onNavigateHome,
}: {
  service: ServiceMetadata
  onNavigateHome?: () => void
}) {
  return (
    <section className="service-remote">
      <p className="eyebrow">{service.label} microfrontend</p>
      <h1>{service.label}</h1>
      <p>{service.description}</p>
      <p>This standalone frontend has been mounted by the Relay host.</p>
      {onNavigateHome && (
        <button type="button" onClick={onNavigateHome}>
          Return to Relay home
        </button>
      )}
    </section>
  )
}
