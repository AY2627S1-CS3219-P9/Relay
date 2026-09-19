import { SERVICE_METADATA, type RemoteAppProps } from '@relay/contracts'
import { ServiceRemotePage } from '@relay/ui'
import './styles.css'

export default function App({ onNavigateHome }: RemoteAppProps) {
  return <ServiceRemotePage service={SERVICE_METADATA.credit} onNavigateHome={onNavigateHome} />
}
