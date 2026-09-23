import type { SessionId, SubmitOtpResponse } from '@relay/contracts'
import { VerificationComponent } from '../components/VerificationComponent'

export function VerificationForm({
  sessionId,
  email,
  demoCode,
  onVerified,
  onBack,
}: {
  sessionId: SessionId
  email: string
  demoCode?: string
  onVerified: (response: SubmitOtpResponse) => void
  onBack: () => void
}) {
  return (
    <div className="user-form">
      <div className="user-form-heading">
        <h1>Check your inbox</h1>
        <p>
          We sent a 6-digit code to <strong>{email}</strong>.
        </p>
      </div>
      <VerificationComponent
        sessionId={sessionId}
        demoCode={demoCode}
        onVerified={onVerified}
        onBack={onBack}
      />
    </div>
  )
}
