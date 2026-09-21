import { useState, type SubmitEvent } from 'react'
import { ErrorMessage } from '@relay/ui'
import type { SessionId } from '@relay/contracts'
import { useUserApi } from './UserApiProvider'

export function DeleteAccountForm({
  sessionId,
  username,
  onDeleted,
}: {
  sessionId: SessionId
  username: string | null
  onDeleted: () => void
}) {
  const api = useUserApi()
  const [confirmation, setConfirmation] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    if (!username) {
      setErrorMessage('Set a username before deleting your account.')
      return
    }
    if (confirmation !== username) {
      setErrorMessage('Enter your username exactly as shown to continue.')
      return
    }
    setLoading(true)
    setErrorMessage('')
    try {
      await api.deleteUser(sessionId, confirmation)
      onDeleted()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete your account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="account-section account-danger-zone" onSubmit={submit}>
      <div>
        <h2>Delete account</h2>
        <p>This permanently removes your credentials, username, and profile picture.</p>
      </div>
      {username ? (
        <label>
          Enter your username to confirm
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={username}
            autoComplete="off"
            required
          />
        </label>
      ) : (
        <ErrorMessage message="Set a username before deleting your account." variant="warning" />
      )}
      <ErrorMessage message={errorMessage} />
      <button className="glass-btn-red user-submit" disabled={loading || !username}>
        {loading ? 'Deleting account…' : 'Delete account'}
      </button>
    </form>
  )
}
