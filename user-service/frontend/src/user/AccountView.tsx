// import { useEffect, useState, type SubmitEvent } from 'react'
// import type { ImageDataUrl, User } from '@relay/contracts'
// import { ErrorMessage, TextButton } from '@relay/ui'
// import { ImageUploadComponent } from '../components/ImageUploadComponent'
// import { PasswordField } from '../components/PasswordField'
// import { UsernameField } from '../components/UsernameField'
// import { useUserApi } from './UserApiProvider'
// import { DeleteAccountForm } from './DeleteAccountForm'
// import { passwordErrors, passwordRequirements, usernameError } from '../validation/validation'

// // Prototype only. Will be replaced by another microfrontend.
// export function AccountView({
//   sessionId,
//   onLoggedOut,
//   onDeleted,
// }: {
//   sessionId: SessionId
//   onLoggedOut: () => void
//   onDeleted: () => void
// }) {
//   const api = useUserApi()

//   const [profile, setProfile] = useState<User>()
//   const [username, setUsername] = useState('')
//   const [picture, setPicture] = useState<ImageDataUrl>()
//   const [currentPassword, setCurrentPassword] = useState('')
//   const [newPassword, setNewPassword] = useState('')
//   const [confirmation, setConfirmation] = useState('')
//   const [profileError, setProfileError] = useState('')
//   const [passwordError, setPasswordError] = useState('')
//   const [accountError, setAccountError] = useState('')
//   const [loadingProfile, setLoadingProfile] = useState(true)
//   const [savingProfile, setSavingProfile] = useState(false)
//   const [savingPassword, setSavingPassword] = useState(false)
//   const passwordIssues = passwordErrors(newPassword)

//   async function loadProfile() {
//     setLoadingProfile(true)
//     setProfileError('')
//     try {
//       const nextProfile = await api.getUser(sessionId)
//       setProfile(nextProfile)
//       setUsername(nextProfile.username ?? '')
//       setPicture(nextProfile.profilePictureUrl as ImageDataUrl | undefined)
//     } catch (error) {
//       setProfileError(error instanceof Error ? error.message : 'Unable to load your profile.')
//     } finally {
//       setLoadingProfile(false)
//     }
//   }

//   useEffect(() => {
//     void loadProfile()
//   }, [sessionId])

//   async function saveProfile(event: SubmitEvent) {
//     event.preventDefault()
//     const validationError = usernameError(username)
//     if (validationError) return setProfileError(validationError)
//     setSavingProfile(true)
//     setProfileError('')
//     try {
//       await api.updateUser(sessionId, { username, profilePicture: picture })
//       await loadProfile()
//     } catch (error) {
//       setProfileError(error instanceof Error ? error.message : 'Unable to save your profile.')
//     } finally {
//       setSavingProfile(false)
//     }
//   }

//   async function changePassword(event: SubmitEvent) {
//     event.preventDefault()
//     if (passwordIssues.length) return setPasswordError('Please meet all password requirements.')
//     if (newPassword !== confirmation) return setPasswordError('Passwords must match exactly.')
//     setSavingPassword(true)
//     setPasswordError('')
//     try {
//       await api.changePassword(sessionId, {
//         currentPassword,
//         newPassword,
//         newPasswordConfirmation: confirmation,
//       })
//       setCurrentPassword('')
//       setNewPassword('')
//       setConfirmation('')
//     } catch (error) {
//       setPasswordError(error instanceof Error ? error.message : 'Unable to change your password.')
//     } finally {
//       setSavingPassword(false)
//     }
//   }

//   async function logout() {
//     setAccountError('')
//     try {
//       await api.logout(sessionId)
//       onLoggedOut()
//     } catch (error) {
//       setAccountError(error instanceof Error ? error.message : 'Unable to log out.')
//     }
//   }

//   if (loadingProfile) return <div className="account-view">Loading profile…</div>

//   return (
//     <div className="account-view">
//       <div className="account-header">
//         <TextButton onClick={() => void logout()}>
//           Log out
//         </TextButton>
//       </div>
//       <ErrorMessage message={profileError} />
//       {profile && (
//         <form className="account-section account-profile-section" onSubmit={saveProfile}>
//           <div className="account-section-heading">
//             <h2>Personal details</h2>
//           </div>
//           <p className="account-email">
//             <span>Email</span>
//             {profile.email}
//           </p>
//           <UsernameField value={username} onChange={setUsername} />
//           <ImageUploadComponent value={picture} onChange={setPicture} />
//           <button className="glass-btn-primary" disabled={savingProfile}>
//             {savingProfile ? 'Saving…' : 'Save profile'}
//           </button>
//         </form>
//       )}
//       <form className="account-section" onSubmit={changePassword}>
//         <h2>Change password</h2>
//         <PasswordField
//           label="Current password"
//           value={currentPassword}
//           onChange={setCurrentPassword}
//           autoComplete="current-password"
//         />
//         <PasswordField
//           label="New password"
//           value={newPassword}
//           onChange={setNewPassword}
//           autoComplete="new-password"
//         />
//         <ul className="password-hints">
//           {passwordRequirements.map((requirement) => (
//             <li className={passwordIssues.includes(requirement) ? '' : 'met'} key={requirement}>
//               {requirement}
//             </li>
//           ))}
//         </ul>
//         <PasswordField
//           label="Confirm new password"
//           value={confirmation}
//           onChange={setConfirmation}
//           autoComplete="new-password"
//         />
//         <ErrorMessage message={passwordError} />
//         <button className="glass-btn-primary" disabled={savingPassword}>
//           {savingPassword ? 'Changing…' : 'Change password'}
//         </button>
//       </form>
//       <ErrorMessage message={accountError} />
//       {profile && (
//         <DeleteAccountForm
//           sessionId={sessionId}
//           username={profile.username}
//           onDeleted={onDeleted}
//         />
//       )}
//     </div>
//   )
// }

import { useEffect, useState, type SubmitEvent } from 'react'
import type { ImageDataUrl, User } from '@relay/contracts'
import { ErrorMessage } from '@relay/ui'
import { ImageUploadComponent } from '../components/ImageUploadComponent'
import { UsernameField } from '../components/UsernameField'
import { usernameError } from '../validation/validation'
import { useUserApi } from './UserApiProvider'
import { DeleteAccountForm } from './DeleteAccountForm'
import { ProfileSetupForm } from './ProfileSetupForm'

export function AccountView({ onLoggedOut, onDeleted, onUpdated }: { onLoggedOut: () => void; onDeleted: () => void; onUpdated?: () => void }) {
  const api = useUserApi()
  const [profile, setProfile] = useState<User | null>(null)
  const [username, setUsername] = useState('')
  const [picture, setPicture] = useState<ImageDataUrl>()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)

  async function loadProfile() {
    try {
      const next = await api.getUser()
      setProfile(next)
      setUsername(next.username ?? '')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to load your profile.'
      const profileMissing =
        (cause instanceof Error && 'status' in cause && cause.status === 404) ||
        message.includes('status 404')
      setNeedsSetup(profileMissing)
      setError(profileMissing ? '' : message)
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
      onUpdated?.()
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

  return <div className="account-view">
    <div className="account-header"><button type="button" onClick={() => void logout()}>Log out</button></div>
    <ErrorMessage message={error} />
    {needsSetup && <ProfileSetupForm onComplete={() => { setNeedsSetup(false); void loadProfile() }} />}
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
}
