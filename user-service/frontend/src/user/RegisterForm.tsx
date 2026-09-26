import { useState, type SubmitEvent } from 'react'
import { useUserApi } from './UserApiProvider'
import { isNusEmail, passwordErrors, passwordRequirements } from '../validation/validation'
import { EmailField } from '../components/EmailField'
import { PasswordField } from '../components/PasswordField'
import { ErrorMessage, TextButton } from '@relay/ui'

export function RegisterForm({
  onRegistered,
  switchToLogin,
}: {
  onRegistered: (email: string, password: string) => void
  switchToLogin: () => void
}) {
  const api = useUserApi()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const errors = passwordErrors(password)

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    if (!isNusEmail(email)) return setErrorMessage('Use your NUS email address ending in @nus.edu.')
    if (errors.length) return setErrorMessage('Please meet all password requirements.')
    if (password !== confirmation) return setErrorMessage('Passwords must match exactly.')
    setLoading(true)
    setErrorMessage('')
    const response = await api.register({
      email,
      password,
      passwordConfirmation: confirmation,
    });
    if (response.success) {
      onRegistered(email, password)
    } else {
      setErrorMessage(response.error.message)
    }
    setLoading(false)
  }

  return (
    <form className="user-form" onSubmit={submit}>
      <div className="user-form-heading">
        <h1>Create your account</h1>
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
      <ErrorMessage message={errorMessage} />
      <button className="glass-btn-primary user-submit" disabled={loading}>
        {loading ? 'Creating account…' : 'Create account'}
      </button>
      <p className="user-switch">
        Already registered?{' '}
        <TextButton onClick={switchToLogin}>
          Login
        </TextButton>
      </p>
    </form>
  )
}
