import { useState, type SubmitEvent } from 'react'
import { useUserApi } from './UserApiProvider'
import type { LoginResponse } from '@relay/contracts'
import { EmailField } from '../components/EmailField'
import { PasswordField } from '../components/PasswordField'
import { ErrorMessage } from '@relay/ui'

export function LoginForm({
  onLoggedIn,
  onRegister,
  notice,
}: {
  onLoggedIn: (response: LoginResponse) => void
  onRegister: () => void
  notice?: string
}) {
  const api = useUserApi()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: SubmitEvent) {
    event.preventDefault()

    setLoading(true)
    setErrorMessage('')

    try {
      onLoggedIn(await api.login({ email, password }))
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        let errorMsg = (error as { message?: string }).message ?? 'Login failed.'
        setErrorMessage(errorMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="user-form" onSubmit={submit}>
      <div className="user-form-heading">
        <h1>Login</h1>
        <p>Welcome back!</p>
      </div>
      <EmailField value={email} onChange={setEmail} />
      <PasswordField value={password} onChange={setPassword} autoComplete="current-password" />
      <ErrorMessage message={notice ?? ''} variant="success" />
      <ErrorMessage message={errorMessage} />
      <button className="glass-btn-primary user-submit" disabled={loading}>
        {loading ? 'Logging in…' : 'Log in'}
      </button>
      <p className="user-switch">
        Need an account?&nbsp;
        <button type="button" className="user-link" onClick={onRegister}>
          Register
        </button>
      </p>
    </form>
  )
}
