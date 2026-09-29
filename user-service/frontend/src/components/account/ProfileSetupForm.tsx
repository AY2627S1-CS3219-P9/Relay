import { useState, type SubmitEvent } from 'react'
import type { ApiResult, ImageDataUrl, Session, UpdateUserResponse } from '@relay/contracts'
import { ErrorMessage } from '@relay/ui'
import { ImageUploadField } from '../base-elements/ImageUploadField'
import { UsernameField } from '../base-elements/UsernameField'
import { usernameError } from '../../validation/validation'

export function ProfileSetupForm({
  onComplete,
}: {
  validateSession?: () => Promise<Session>
  onComplete: () => void | Promise<void>
}) {
  const [username, setUsername] = useState('')
  const [picture, setPicture] = useState<ImageDataUrl>()
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    const validationError = usernameError(username)
    if (validationError) {
      setErrorMessage(validationError)
      return
    }
    setLoading(true)
    setErrorMessage('')
    try {
      const response = (await fetch('/api/user/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, profilePicture: picture }),
      }).then((result) => result.json())) as ApiResult<UpdateUserResponse>
      if (!response.ok) {
        setErrorMessage(response.error.message)
        return
      }
      await onComplete()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Profile setup failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="user-form" onSubmit={submit}>
      <div className="user-form-heading">
        <h1>Set up your profile</h1>
        <p>Choose how other Relay users will see you.</p>
      </div>
      <UsernameField value={username} onChange={setUsername} />
      <ImageUploadField value={picture} onChange={setPicture} />
      <ErrorMessage message={errorMessage} />
      <button className="glass-btn-primary user-submit" disabled={loading}>
        {loading ? 'Saving profile…' : 'Finish setup'}
      </button>
    </form>
  )
}
