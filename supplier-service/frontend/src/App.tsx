import '@relay/ui/styles.css'
import type { RemoteAppProps } from '@relay/contracts'

export default function App({ onNavigate }: RemoteAppProps) {
  return (
    <div className="relay-design-system">
      <h1>Hello, World</h1>
      <button type="button" onClick={() => onNavigate?.('user')}>
        Return to account
      </button>
    </div>
  )
}
