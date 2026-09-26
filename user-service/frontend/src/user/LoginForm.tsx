import { useState, type SubmitEvent } from 'react'
import { useUserApi } from './UserApiProvider'
import type { LoginResponseData } from '@relay/contracts'
import { EmailField } from '../components/EmailField'
import { PasswordField } from '../components/PasswordField'
import { ErrorMessage, TextButton } from '@relay/ui'

export function LoginForm({
  onLoggedIn,
  switchToRegister,
  notice,
}: {
  onLoggedIn: (email: string, password: string, emailVerified: boolean, profileCreated: boolean) => void
  switchToRegister: () => void
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

    const response = await api.login({ email, password });
    if (response.success) {
      onLoggedIn(email, password, response.data.emailVerified, response.data.profileCreated)
    } else {
      setErrorMessage(response.error.message)
    }
    setLoading(false)
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
        {loading ? 'Logging in…' : 'Login'}
      </button>
      <p className="user-switch">
        Need an account?&nbsp;
        <TextButton onClick={switchToRegister}>
          Register
        </TextButton>
      </p>
    </form>
  )
}
