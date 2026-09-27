import type { Session } from '@relay/contracts'
import { VerificationComponent } from '../components/VerificationComponent'

export function VerificationForm({
  email,
  password,
  onVerified,
  onBack,
}: {
  email: string,
  password: string,
  onVerified: (profileCreated: boolean) => void
  onBack: () => void
}) {
  return (
    <div className="user-form">
      <div className="user-form-heading">
        <h1>Check your inbox</h1>
        <p>
          We sent a 6-digit code to <strong>{email}</strong>.
        </p>
        {
          // TODO: remove this in prod
          <p>
            To read verification code in Floci, go to <a target='_blank' href='http://localhost:4566/_aws/ses'>http://localhost:4566/_aws/ses</a>
          </p>
        }
      </div>
      <VerificationComponent
        email={email}
        password={password}
        onVerified={onVerified}
        onBack={onBack}
      />
    </div>
  )
}
