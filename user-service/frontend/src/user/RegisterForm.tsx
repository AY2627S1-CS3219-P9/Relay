import { useState, type FormEvent } from 'react'
import { useUserApi } from './UserApiProvider'
import { isNusEmail, passwordErrors, passwordRequirements } from './validation'
import type { RegisterResponse } from '@relay/contracts'
import { EmailField } from '../components/EmailField'
import { PasswordField } from '../components/PasswordField'
import { ErrorMessage } from '@relay/ui'

export function RegisterForm({
  onRegistered,
  onLogin,
}: {
  onRegistered: (response: RegisterResponse, email: string) => void
  onLogin: () => void
}) {
  const api = useUserApi()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [administrator, setAdministrator] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const errors = passwordErrors(password)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!isNusEmail(email)) return setErrorMessage('Use your NUS email address ending in @nus.edu.')
    if (errors.length) return setErrorMessage('Please meet all password requirements.')
    if (password !== confirmation) return setErrorMessage('Passwords must match exactly.')
    setLoading(true)
    setErrorMessage('')
    try {
      onRegistered(
        await api.register({
          email,
          password,
          passwordConfirmation: confirmation,
          role: administrator ? 'admin' : undefined,
        }),
        email,
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : ((error as { message?: string }).message ?? 'Registration failed.'),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="user-form" onSubmit={submit}>
      <div className="user-form-heading">
        <span className="user-eyebrow">New account</span>
        <h1>Create your Relay account</h1>
        <p>Use your NUS email to get started.</p>
      </div>
      <EmailField value={email} onChange={setEmail} />
      <PasswordField value={password} onChange={setPassword} autoComplete="new-password" />
      <ul className="password-hints">
        {passwordRequirements.map((requirement) => (
          <li className={errors.includes(requirement) ? '' : 'met'} key={requirement}>
            {requirement}
          </li>
        ))}
      </ul>
      <PasswordField
        label="Confirm password"
        value={confirmation}
        onChange={setConfirmation}
        autoComplete="new-password"
      />
      <label className="role-switch">
        <input
          type="checkbox"
          checked={administrator}
          onChange={(event) => setAdministrator(event.target.checked)}
        />
        Register as administrator
      </label>
      <ErrorMessage message={errorMessage} />
      <button className="glass-btn-primary user-submit" disabled={loading}>
        {loading ? 'Creating account…' : 'Create account'}
      </button>
      <p className="user-switch">
        Already registered?{' '}
        <button type="button" className="user-link" onClick={onLogin}>
          Log in
        </button>
      </p>
    </form>
  )
}
