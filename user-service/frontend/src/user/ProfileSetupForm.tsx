import { useState, type SubmitEvent } from 'react'
import type { ImageDataUrl, Session } from '@relay/contracts'
import { ErrorMessage } from '@relay/ui'
import { ImageUploadComponent } from '../components/ImageUploadComponent'
import { UsernameField } from '../components/UsernameField'
import { useUserApi } from './UserApiProvider'
import { usernameError } from '../validation/validation'

export function ProfileSetupForm({
  onComplete,
}: {
  validateSession: () => Promise<Session>
  onComplete: () => void
}) {
  const api = useUserApi()

  const [username, setUsername] = useState('')
  const [picture, setPicture] = useState<ImageDataUrl>()
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    // const validationError = usernameError(username)
    // if (validationError) return setErrorMessage(validationError)
    // setLoading(true)
    // setErrorMessage('')
    // try {
    //   await api.updateUser(sessionId, { username, profilePicture: picture })
    //   /* TODO: notify Credit Service that the account is ready. */
    //   onComplete()
    // } catch (error) {
    //   setErrorMessage(
    //     error instanceof Error
    //       ? error.message
    //       : ((error as { message?: string }).message ?? 'Profile setup failed.'),
    //   )
    // } finally {
    //   setLoading(false)
    // }
  }

  return (
    <form className="user-form" onSubmit={submit}>
      <div className="user-form-heading">
        <h1>Set up your profile</h1>
        <p>Choose how other Relay users will see you.</p>
      </div>
      <UsernameField value={username} onChange={setUsername} />
      <ImageUploadComponent value={picture} onChange={setPicture} />
      <ErrorMessage message={errorMessage} />
      <button className="glass-btn-primary user-submit" disabled={loading}>
        {loading ? 'Saving profile…' : 'Finish setup'}
      </button>
    </form>
  )
}
