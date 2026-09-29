import { useEffect, useState } from 'react'
import type { ApiResult, GetUserResponse, User } from '@relay/contracts'
import { ErrorMessage } from '@relay/ui'
import { DeleteAccountForm } from '../components/account/DeleteAccountForm'
import { ProfileSetupForm } from '../components/account/ProfileSetupForm'
import { ChangePasswordForm } from '../components/account/ChangePasswordForm'
import { AccountOverview } from '../components/account/AccountOverview'
import { UpdateProfileForm } from '../components/account/UpdateProfileForm'

type Page = 'account' | 'change-password' | 'update-profile' | 'delete'

export function AccountPage({
  onLoggedOut,
  onDeleted,
  onUpdated,
}: {
  onLoggedOut: () => void
  onDeleted: () => void
  onUpdated?: () => void
}) {
  const [page, setPage] = useState<Page>('account')
  const [profile, setProfile] = useState<User | null>(null)
  const [error, setError] = useState('')
  const [needsSetup, setNeedsSetup] = useState(false)

  async function loadProfile() {
    try {
      const response = (await fetch('/api/user/me', { credentials: 'include' }).then((result) =>
        result.json(),
      )) as ApiResult<GetUserResponse>
      if (response.ok) {
        setProfile(response.data)
        setNeedsSetup(false)
        setError('')
        return
      }
      const profileMissing = response.error.code === 'PROFILE_NOT_FOUND'
      setNeedsSetup(profileMissing)
      setError(profileMissing ? '' : response.error.message)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load your profile.')
    }
  }

  useEffect(() => {
    void loadProfile()
  }, [])

  async function logout() {
    try {
      const response = await fetch('/api/user/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Unable to log out.')
      onLoggedOut()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to log out.')
    }
  }

  return (
    <div className="account-view">
      <ErrorMessage message={error} />
      {needsSetup && (
        <ProfileSetupForm
          onComplete={() => {
            setNeedsSetup(false)
            void loadProfile()
          }}
        />
      )}
      {profile && (
        <>
          {page == 'account' && (
            <AccountOverview
              profile={profile}
              onLoggedOut={() => void logout()}
              onUpdateProfile={() => setPage('update-profile')}
              onChangePassword={() => setPage('change-password')}
              onDeleteAccount={() => setPage('delete')}
            />
          )}
          {page == 'update-profile' && (
            <UpdateProfileForm
              profile={profile}
              onBack={() => setPage('account')}
              onUpdated={(updatedProfile) => {
                setProfile(updatedProfile)
                onUpdated?.()
                setPage('account')
              }}
            />
          )}
          {page == 'change-password' && <ChangePasswordForm onBack={() => setPage('account')} />}
          {page == 'delete' && (
            <DeleteAccountForm
              onBack={() => setPage('account')}
              username={profile.username}
              onDeleted={onDeleted}
            />
          )}
        </>
      )}
    </div>
  )
}
