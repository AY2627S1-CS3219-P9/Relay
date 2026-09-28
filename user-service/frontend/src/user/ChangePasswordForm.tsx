import { useState, type SubmitEvent } from 'react'
import { ErrorMessage, IconButton } from '@relay/ui'
import { useUserApi } from './UserApiProvider'
import { PasswordField } from '../components/PasswordField'
import { passwordErrors, passwordRequirements } from '../validation/validation'

export function ChangePasswordForm({
  onBack,
}: {
  onBack: () => void
}) {
  const api = useUserApi()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const passwordIssues = passwordErrors(newPassword)

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    if (passwordIssues.length) return setErrorMessage('Please meet all password requirements.')
    if (newPassword !== newPasswordConfirmation) return setErrorMessage('Passwords must match exactly.')
    setSavingPassword(true)
    setSuccessMessage('')
    setErrorMessage('')
    const response = await api.changePassword({
      currentPassword,
      newPassword,
      newPasswordConfirmation
    });
    if (response.success) {
      setCurrentPassword('')
      setNewPassword('')
      setNewPasswordConfirmation('')
      setSuccessMessage('Password changed successfully.')
    } else {
      setErrorMessage(response.error.message)
    }
    setSavingPassword(false)
  }

  return (
    <form className="account-section" onSubmit={submit}>
      <IconButton label="Go back" onClick={onBack}>
        ←
      </IconButton>
      <h2>Change password</h2>
      <p>This permanently removes your credentials, username, and profile picture.</p>
      <PasswordField
        label="Current password"
        value={currentPassword}
        onChange={setCurrentPassword}
        autoComplete="current-password"
      />
      <PasswordField
        label="New password"
        value={newPassword}
        onChange={setNewPassword}
        autoComplete="new-password"
      />
      <ul className="password-hints">
        {passwordRequirements.map((requirement) => (
          <li className={passwordIssues.includes(requirement) ? '' : 'met'} key={requirement}>
            {requirement}
          </li>
        ))}
      </ul>
      <PasswordField
        label="Confirm new password"
        value={newPasswordConfirmation}
        onChange={setNewPasswordConfirmation}
        autoComplete="new-password"
      />
      <ErrorMessage message={errorMessage} />
      <ErrorMessage message={successMessage} variant='success' />
      <button className="glass-btn-primary" disabled={savingPassword}>
        {savingPassword ? 'Changing…' : 'Change password'}
      </button>
    </form>
  )
}
