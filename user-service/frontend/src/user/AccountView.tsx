import { useEffect, useState, type SubmitEvent } from 'react'
import type { ImageDataUrl, User } from '@relay/contracts'
import { ErrorMessage } from '@relay/ui'
import { ImageUploadComponent } from '../components/ImageUploadComponent'
import { UsernameField } from '../components/UsernameField'
import { usernameError } from '../validation/validation'
import { useUserApi } from './UserApiProvider'
import { DeleteAccountForm } from './DeleteAccountForm'

export function AccountView({ onLoggedOut, onDeleted }: { onLoggedOut: () => void; onDeleted: () => void }) {
  const api = useUserApi()
  const [profile, setProfile] = useState<User | null>(null)
  const [username, setUsername] = useState('')
  const [picture, setPicture] = useState<ImageDataUrl>()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadProfile() {
    try {
      const next = await api.getUser()
      setProfile(next)
      setUsername(next.username ?? '')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load your profile.')
    }
  }

  useEffect(() => { void loadProfile() }, [])

  async function saveProfile(event: SubmitEvent) {
    event.preventDefault()
    const validationError = usernameError(username)
    if (validationError) return setError(validationError)
    setSaving(true)
    setError('')
    try {
      const next = await api.updateUser({ username, profilePicture: picture })
      setProfile(next)
      setUsername(next.username ?? '')
      setPicture(undefined)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save your profile.')
    } finally {
      setSaving(false)
    }
  }

  async function logout() {
    try { await api.logout(); onLoggedOut() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to log out.') }
  }

  return (
    <div className="account-view">
      <div className="account-header"><button type="button" onClick={() => void logout()}>Log out</button></div>
      <ErrorMessage message={error} />
      {profile && <>
        <form className="account-section account-profile-section" onSubmit={saveProfile}>
          <h2>Personal details</h2>
          <p className="account-email"><span>Email</span>{profile.email}</p>
          <UsernameField value={username} onChange={setUsername} />
          <ImageUploadComponent value={picture} onChange={setPicture} />
          <button className="glass-btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
        </form>
        <DeleteAccountForm username={profile.username} onDeleted={onDeleted} />
      </>}
    </div>
  )
}
