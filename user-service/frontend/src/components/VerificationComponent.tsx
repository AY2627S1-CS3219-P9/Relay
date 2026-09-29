import { useEffect, useState, type SubmitEvent } from 'react'
import { ErrorMessage, TextButton } from '@relay/ui'
import { VerificationCodeField } from './VerificationCodeField'
import type {
  ApiResult,
  ResendVerificationRequest,
  SubmitOtpAndLoginResponse,
} from '@relay/contracts'

export function VerificationComponent({
  email,
  password,
  onVerified,
  onBack,
}: {
  email: string
  password: string
  onVerified: (profileCreated: boolean) => void | Promise<void>
  onBack?: () => void
}) {
  const [code, setCode] = useState('')
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

    const response = (await fetch('/api/user/auth/verification/confirm-and-login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, code }),
    }).then((result) => result.json())) as ApiResult<SubmitOtpAndLoginResponse>
    if (response.ok) {
      if (!response.data?.user) {
        setErrorMessage('The User Service returned an invalid session response.')
        setLoading(false)
        return
      }
      await onVerified(response.data.user.profileCreated)
    } else {
      setErrorMessage(response.error.message)
    }
    setLoading(false)
  }

  async function resend() {
    setResending(true)
    setErrorMessage('')

    try {
      const response = (await fetch('/api/user/auth/verification/resend', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email } satisfies ResendVerificationRequest),
      }).then((result) =>
        result.status === 204 ? { ok: true, data: undefined } : result.json(),
      )) as ApiResult<undefined>
      if (response.ok) {
        setSeconds(300)
        setCode('')
      } else {
        setErrorMessage(response.error.message)
      }
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
      <VerificationCodeField value={code} onChange={setCode} />
      <p className="otp-timer">
        Code expires in {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
      </p>
      <ErrorMessage message={errorMessage} />
      <button className="glass-btn-primary user-submit" disabled={loading || seconds === 0}>
        {loading ? 'Verifying…' : 'Verify email'}
      </button>
      <TextButton onClick={() => void resend()} disabled={resending}>
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
