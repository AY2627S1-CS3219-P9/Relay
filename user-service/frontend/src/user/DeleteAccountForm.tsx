import { useState, type SubmitEvent } from 'react'
import { ErrorMessage } from '@relay/ui'
import { useUserApi } from './UserApiProvider'

export function DeleteAccountForm({
  username,
  onDeleted,
}: {
  username: string | null
  onDeleted: () => void
}) {
  const api = useUserApi()
  const [confirmation, setConfirmation] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    if (confirmation !== 'DELETE') {
      setErrorMessage('Enter DELETE exactly to continue.')
      return
    }
    setLoading(true)
    setErrorMessage('')
    try {
      await api.deleteUser(confirmation)
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
          Type DELETE to confirm
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="DELETE"
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
