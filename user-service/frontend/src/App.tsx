import '@relay/ui/styles.css'
import './styles.css'
import { useState } from 'react'
import { CardView, GlassCard, GlassWindow, IconButton, RelayBrand, RelayButton } from '@relay/ui'
import type {
  UserApi,
  RemoteAppProps,
} from '@relay/contracts'
import { LoginForm } from './user/LoginForm'
import { ProfileSetupForm } from './user/ProfileSetupForm'
import { RegisterForm } from './user/RegisterForm'
import { UserApiProvider } from './user/UserApiProvider'
import { VerificationForm } from './user/VerificationForm'
// import { AccountView } from './user/AccountView'
import { NusMapPanel } from './components/NusMapPanel'
import { userApi } from './api/api'

type View = 'login' | 'register' | 'verify' | 'profile' | 'complete' | 'account'

export default function App({
  api = userApi,
  fetchSession,
  navigateTo,
  closeProfile,
  presentation = 'full',
}: { api?: UserApi } & RemoteAppProps) {
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

  function finishVerification(profileCreated: boolean) {
    // TODO: check for profile creation
    completeAuth();
  }

  function startProfileCreation() {
  }

  /* Verification Completion */
  function onLogin(email: string, password: string, emailVerified: boolean, profileCreated: boolean) {
    if (!emailVerified) startVerification(email, password)
    else {
      // TODO: check for profile creation
      completeAuth();
      setView('complete')
    }
  }

  function finishLogout() {
    // Temporary workaround to logout. TODO: add actual logout function to user api
    localStorage.clear();
    setView('login')
    closeProfile?.()
    navigateTo?.('user')
  }

  function completeAuth() {
    setView('complete')
    fetchSession?.().then(session => {
      console.log('User login complete! User details: ', session.userData);
    });
  }

  function goToSupplier() {
    navigateTo?.('supplier')
  }

  const userContent = (
    <div className="user-content-column">
      <RelayBrand />
      <section className={`user-panel${view === 'account' ? ' account-panel' : ''}`}>
        {view === 'register' && (
          <RegisterForm
            onRegistered={startVerification}
            switchToLogin={() => setView('login')}
          />
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
        {/* {view === 'profile' && (
          <ProfileSetupForm sessionId={sessionId} onComplete={() => setView('complete')} />
        )} */}
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
        {/* {view === 'account' && sessionId && (
          <GlassCard className="account-glass-card">
            <AccountView
              sessionId={sessionId}
              onLoggedOut={finishLogout}
              onDeleted={() => {
                setSessionId(undefined)
                setLoginNotice('Your account was deleted successfully.')
                setView('login')
              }}
            />
          </GlassCard>
        )} */}
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
      <UserApiProvider api={api}>
        <div className="user-profile-content">
          <div className="user-profile-card-header">
            <h1>Profile</h1>
            <IconButton label="Close profile" onClick={closeProfile}>
              ×
            </IconButton>
          </div>
          {/* {sessionId && view === 'account' ? (
            <AccountView
              sessionId={sessionId}
              onLoggedOut={finishLogout}
              onDeleted={() => {
                setSessionId(undefined)
                setLoginNotice('Your account was deleted successfully.')
                setView('login')
                closeProfile?.()
              }}
            />
          ) : (
            <p className="user-profile-card-empty">Sign in to view your profile.</p>
          )} */}
        </div>
      </UserApiProvider>
    )
  }

  return (
    <UserApiProvider api={api}>
      {showAuthMap ? (
        <GlassWindow
          background={<NusMapPanel />}
          withGlow={view === 'login' || view === 'register'}
        >
          {userContent}
        </GlassWindow>
      ) : (
        <main className="user-app-shell">{renderedUserContent}</main>
      )}
    </UserApiProvider>
  )
}
