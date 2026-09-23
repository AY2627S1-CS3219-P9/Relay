import { useEffect, useState, type SubmitEvent } from 'react'
import type { SessionId, SubmitOtpResponse } from '@relay/contracts'
import { ErrorMessage, TextButton } from '@relay/ui'
import { VerificationCodeField } from './VerificationCodeField'
import { useUserApi } from '../user/UserApiProvider'

export function VerificationComponent({
  sessionId,
  demoCode,
  onVerified,
  onBack,
}: {
  sessionId: SessionId
  demoCode?: string
  onVerified: (response: SubmitOtpResponse) => void
  onBack?: () => void
}) {
  const api = useUserApi()
  const [otp, setOtp] = useState('')
  const [seconds, setSeconds] = useState(300)
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((value) => Math.max(0, value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    setLoading(true)
    setErrorMessage('')

    try {
      onVerified(await api.submitOtp({ sessionId, otp }))
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : ((error as { message?: string }).message ?? 'Verification failed.'),
      )
    } finally {
      setLoading(false)
    }
  }

  async function resend() {
    setResending(true)
    setErrorMessage('')

    try {
      await api.requestOtp(sessionId)
      setSeconds(300)
      setOtp('')
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : ((error as { message?: string }).message ?? 'Unable to send a new code.'),
      )
    } finally {
      setResending(false)
    }
  }

  return (
    <form className="verification-component" onSubmit={submit}>
      <VerificationCodeField value={otp} onChange={setOtp} />
      <p className="otp-timer">
        Code expires in {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
      </p>
      {demoCode && (
        <p className="demo-hint">
          Local demo code: <strong>{demoCode}</strong>
        </p>
      )}
      <ErrorMessage message={errorMessage} />
      <button className="glass-btn-primary user-submit" disabled={loading || seconds === 0}>
        {loading ? 'Verifying…' : 'Verify email'}
      </button>
      <TextButton
        onClick={() => void resend()}
        disabled={resending}
      >
        {resending ? 'Sending…' : 'Send a new code'}
      </TextButton>
      {onBack && (
        <button type="button" className="user-secondary" onClick={onBack}>
          Back to registration
        </button>
      )}
    </form>
  )
}
