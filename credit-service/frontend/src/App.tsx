import '@relay/ui/styles.css'
import './styles.css'
import type { RemoteAppProps } from '@relay/contracts'
import { IconButton, RelayButton } from '@relay/ui'

export default function App({ creditBalance, closeCredit }: RemoteAppProps) {
  return (
    <section className="credit-profile-content relay-design-system" aria-label="Credits">
      <header className="credit-profile-header">
        <h1>Credits</h1>
        <IconButton label="Close credits" onClick={closeCredit}>&times;</IconButton>
      </header>

      <div className="credit-balance-grid">
        <div>
          <span>Available balance</span>
          <strong>{creditBalance?.availableCredit ?? '...'} cr</strong>
        </div>
        <div>
          <span>Reserve balance</span>
          <strong>{creditBalance?.reserveCredit ?? '...'} cr</strong>
        </div>
      </div>

      <hr className="credit-profile-divider" />

      <RelayButton variant="secondary" className="credit-history-button" disabled>
        View credit history
      </RelayButton>
    </section>
  )
}