import { authFetch } from '@relay/user-auth-frontend-fetch'
import { useState, type SubmitEvent } from 'react'
import { ErrorMessage, RelayButton, RelayFormSurface } from '@relay/ui'
import type { ApiResult } from '@relay/contracts/user-auth'
import { PasswordField } from '../base-elements/PasswordField'
import { passwordErrors, passwordRequirements } from '../../validation/validation'

export function ChangePasswordForm({
  onBack,
  onLoggedOut,
}: {
  onBack: () => void
  onLoggedOut: () => void
}) {
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
    if (newPassword !== newPasswordConfirmation)
      return setErrorMessage('Passwords must match exactly.')
    setSavingPassword(true)
    setSuccessMessage('')
    setErrorMessage('')
    const response = (await authFetch('/api/auth/password', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword, newPasswordConfirmation }),
    }).then((result) =>
      result.status === 204 ? { ok: true, data: undefined } : result.json(),
    )) as ApiResult<undefined>
    if (response.ok) {
      setCurrentPassword('')
      setNewPassword('')
      setNewPasswordConfirmation('')
      setSuccessMessage('Password changed successfully. Sign in with your new password.')
      onLoggedOut()
    } else {
      setErrorMessage(response.error.message)
    }
    setSavingPassword(false)
  }

  return (
    <RelayFormSurface
      className="account-section account-password-section"
      title="Change password"
      description="Update your password to something new and secure."
      onClose={onBack}
    >
      <form onSubmit={submit}>
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
        <ErrorMessage message={successMessage} variant="success" />
        <RelayButton variant="primary" type="submit" disabled={savingPassword}>
          {savingPassword ? 'Changing…' : 'Change password'}
        </RelayButton>
      </form>
    </RelayFormSurface>
  )
}
