import { useState, type SubmitEvent } from 'react'
import type { ApiResult, LoginResponse } from '@relay/contracts'
import { EmailField } from '../components/base-elements/EmailField'
import { PasswordField } from '../components/base-elements/PasswordField'
import { ErrorMessage, TextButton } from '@relay/ui'

export function LoginForm({
  onLoggedIn,
  switchToRegister,
  notice,
}: {
  onLoggedIn: (
    email: string,
    password: string,
    emailVerified: boolean,
    profileCreated: boolean,
  ) => void | Promise<void>
  switchToRegister: () => void
  notice?: string
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: SubmitEvent) {
    event.preventDefault()

    setLoading(true)
    setErrorMessage('')

    const response = (await fetch('/api/user/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then((result) => result.json())) as ApiResult<LoginResponse>
    if (response.ok) {
      if (!response.data?.user) {
        setErrorMessage('The User Service returned an invalid session response.')
        setLoading(false)
        return
      }
      await onLoggedIn(
        email,
        password,
        response.data.user.emailVerified,
        response.data.user.profileCreated,
      )
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
        <TextButton onClick={switchToRegister}>Register</TextButton>
      </p>
    </form>
  )
}
