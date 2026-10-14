import type { User } from '@relay/contracts'
import { RelayList, RelayListItem } from '@relay/ui'

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
      <RelayList>
        <RelayListItem title="Email" subtitle={profile.email} />
      </RelayList>
      <h2>Account options</h2>
      <RelayList className="account-options-list">
        <RelayListItem title="Log out" onClick={onLoggedOut} />
        <RelayListItem title="Update profile" onClick={onUpdateProfile} />
        <RelayListItem title="Change password" onClick={onChangePassword} />
        <RelayListItem title="Delete account" className="relay-list-item-danger" onClick={onDeleteAccount} />
      </RelayList>
    </div>
  )
}
