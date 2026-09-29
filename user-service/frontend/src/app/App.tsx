import '@relay/ui/styles.css'
import './App.css'
import { useState } from 'react'
import { CardView, GlassCard, GlassWindow, IconButton, RelayBrand, RelayButton } from '@relay/ui'
import type { RemoteAppProps } from '@relay/contracts'
import { LoginForm } from '../user/LoginForm'
import { ProfileSetupForm } from '../components/account/ProfileSetupForm'
import { RegisterForm } from '../user/RegisterForm'
import { VerificationForm } from '../user/VerificationForm'
import { AccountPage } from '../user/AccountPage'
import { MapView } from '../components/MapView'

type View = 'login' | 'register' | 'verify' | 'profile' | 'complete' | 'account'

export default function App({
  fetchSession,
  navigateTo,
  closeProfile,
  refreshUserProfile,
  presentation = 'full',
}: RemoteAppProps) {
  const [view, setView] = useState<View>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginNotice, setLoginNotice] = useState('')
  const showAuthMap =
    view === 'login' || view === 'register' || view === 'verify' || view === 'profile'

  /* Verification */
  function startVerification(email: string, password: string) {
    setEmail(email)
    setPassword(password)
    setView('verify')
  }

  async function finishVerification(profileCreated: boolean) {
    if (!profileCreated) {
      setView('profile')
      return
    }
    await refreshUserProfile?.()
    completeAuth()
  }

  /* Verification Completion */
  async function onLogin(
    email: string,
    password: string,
    emailVerified: boolean,
    profileCreated: boolean,
  ) {
    if (!emailVerified) startVerification(email, password)
    else {
      if (!profileCreated) {
        setView('profile')
        return
      }
      await refreshUserProfile?.()
      completeAuth()
    }
  }

  async function finishLogout() {
    await fetch('/api/user/auth/logout', { method: 'POST', credentials: 'include' })
    await refreshUserProfile?.()
    setView('login')
    closeProfile?.()
    navigateTo?.('user')
  }

  function completeAuth() {
    setView('complete')
  }

  function goToSupplier() {
    navigateTo?.('supplier')
  }

  const userContent = (
    <div className="user-content-column">
      <RelayBrand />
      <section className={`user-panel${view === 'account' ? ' account-panel' : ''}`}>
        {view === 'register' && (
          <RegisterForm onRegistered={startVerification} switchToLogin={() => setView('login')} />
        )}
        {view === 'verify' && (
          <VerificationForm
            email={email}
            password={password}
            onVerified={finishVerification}
            onBack={() => setView('register')}
          />
        )}
        {view === 'login' && (
          <LoginForm
            onLoggedIn={onLogin}
            switchToRegister={() => setView('register')}
            notice={loginNotice}
          />
        )}
        {view === 'profile' && (
          <ProfileSetupForm
            onComplete={async () => {
              await refreshUserProfile?.()
              setView('complete')
            }}
          />
        )}
        {view === 'complete' && (
          <div className="user-form user-complete">
            <span className="user-success-icon">✓</span>
            <h1>Welcome!</h1>
            <RelayButton
              variant="primary"
              className="glass-btn-primary user-submit"
              onClick={finishLogout}
            >
              Logout
            </RelayButton>
            <RelayButton
              variant="primary"
              className="glass-btn-primary user-submit"
              onClick={goToSupplier}
            >
              Continue
            </RelayButton>
          </div>
        )}
        {view === 'account' && (
          <GlassCard className="account-glass-card">
            <AccountPage
              onLoggedOut={finishLogout}
              onUpdated={() => void refreshUserProfile?.()}
              onDeleted={() => {
                setLoginNotice('Your account was deleted successfully.')
                setView('login')
                void refreshUserProfile?.()
                closeProfile?.()
                navigateTo?.('user')
              }}
            />
          </GlassCard>
        )}
      </section>
      <p className="user-footer">Restricted to NUS Students and Staff (for now).</p>
    </div>
  )
  const renderedUserContent =
    view === 'complete' ? (
      <CardView className="user-complete-card" withGlow>
        {userContent}
      </CardView>
    ) : (
      userContent
    )

  if (presentation === 'card') {
    return (
      <div className="user-profile-content">
        <div className="user-profile-card-header">
          <h1>Profile</h1>
          <IconButton label="Close profile" onClick={closeProfile}>
            ×
          </IconButton>
        </div>
        <AccountPage
          onLoggedOut={finishLogout}
          onUpdated={() => void refreshUserProfile?.()}
          onDeleted={() => {
            setLoginNotice('Your account was deleted successfully.')
            setView('login')
            void refreshUserProfile?.()
            closeProfile?.()
            navigateTo?.('user')
          }}
        />
      </div>
    )
  }

  return showAuthMap ? (
    <GlassWindow background={<MapView />} withGlow={view === 'login' || view === 'register'}>
      {userContent}
    </GlassWindow>
  ) : (
    <main className="user-app-shell">{renderedUserContent}</main>
  )
}
