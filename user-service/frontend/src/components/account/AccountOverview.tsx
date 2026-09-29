import type { User } from '@relay/contracts'

export function AccountOverview({
  profile,
  onLoggedOut,
  onUpdateProfile,
  onChangePassword,
  onDeleteAccount,
}: {
  profile: User
  onLoggedOut: () => void
  onUpdateProfile: () => void
  onChangePassword: () => void
  onDeleteAccount: () => void
}) {
  return (
    <div className="account-section" style={{ marginTop: 0 }}>
      <h2>Personal details</h2>
      <p className="account-email">
        <span>Email</span>
        {profile.email}
      </p>
      <button className="glass-btn-primary" onClick={onLoggedOut}>
        Log out
      </button>
      <h2>Account options</h2>
      <button className="glass-btn-primary" onClick={onUpdateProfile}>
        Update profile
      </button>
      <button className="glass-btn-primary" onClick={onChangePassword}>
        Change password
      </button>
      <button className="glass-btn-red" onClick={onDeleteAccount}>
        Delete account
      </button>
    </div>
  )
}
