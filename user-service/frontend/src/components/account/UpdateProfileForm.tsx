import { useState, type SubmitEvent } from 'react'
import type { ApiResult, ImageDataUrl, UpdateUserResponse, User } from '@relay/contracts'
import { ErrorMessage, IconButton } from '@relay/ui'
import { ImageUploadField } from '../../components/base-elements/ImageUploadField'
import { UsernameField } from '../../components/base-elements/UsernameField'
import { usernameError } from '../../validation/validation'

export function UpdateProfileForm({
  profile,
  onBack,
  onUpdated,
}: {
  profile: User
  onBack: () => void
  onUpdated: (profile: User) => void
}) {
  const [username, setUsername] = useState(profile.username ?? '')
  const [picture, setPicture] = useState<ImageDataUrl>()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    const validationError = usernameError(username)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')
    try {
      const response = (await fetch('/api/user/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, profilePicture: picture }),
      }).then((result) => result.json())) as ApiResult<UpdateUserResponse>

      if (response.ok) onUpdated(response.data)
      else setError(response.error.message)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save your profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="account-section account-profile-section" onSubmit={submit}>
      <IconButton label="Go back" onClick={onBack}>
        ←
      </IconButton>
      <h2>Update profile details</h2>
      <UsernameField value={username} onChange={setUsername} />
      <ImageUploadField value={picture} onChange={setPicture} />
      <ErrorMessage message={error} />
      <button className="glass-btn-primary" disabled={saving}>
        {saving ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  )
}
