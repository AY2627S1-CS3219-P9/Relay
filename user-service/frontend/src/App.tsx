import '@relay/ui/styles.css'
import './styles.css'
import { useState } from 'react'
import { CardView, GlassCard, GlassWindow, IconButton, RelayBrand, RelayButton } from '@relay/ui'
import type {
  LoginResponse,
  RegisterResponse,
  SessionId,
  SubmitOtpResponse,
  UserApi,
  RemoteAppProps,
} from '@relay/contracts'
import { LoginForm } from './user/LoginForm'
import { ProfileSetupForm } from './user/ProfileSetupForm'
import { RegisterForm } from './user/RegisterForm'
import { UserApiProvider } from './user/UserApiProvider'
import { mockUserApi, mockVerificationCode } from './mockUserApi/mockUserApi'
import { VerificationForm } from './user/VerificationForm'
import { AccountView } from './user/AccountView'
import { NusMapPanel } from './components/NusMapPanel'

type View = 'login' | 'register' | 'verify' | 'profile' | 'complete' | 'account'

export default function App({
  api = mockUserApi,
  onNavigate,
  onCloseProfile,
  presentation = 'full',
}: { api?: UserApi } & RemoteAppProps) {
  const [view, setView] = useState<View>('register')
  const [sessionId, setSessionId] = useState<SessionId>()
  const [email, setEmail] = useState('')
  const [loginNotice, setLoginNotice] = useState('')
  const showAuthMap =
    view === 'login' || view === 'register' || view === 'verify' || view === 'profile'

  /* Verification */
  function startVerification(response: RegisterResponse, registeredEmail: string) {
    setSessionId(response.sessionId)
    setEmail(registeredEmail)
    setView('verify')
  }

  function finishVerification(response: SubmitOtpResponse) {
    setSessionId(response.sessionId)
    setView(response.requiresProfileSetup ? 'profile' : 'complete')
  }

  /* Verification Completion */
  function finishLogin(response: LoginResponse) {
    setSessionId(response.sessionId)
    setView('account')
    onNavigate?.('supplier')
  }

  function completeRegistration() {
    setView('account')
    onNavigate?.('supplier')
  }

  function finishLogout() {
    setSessionId(undefined)
    setView('login')
    onCloseProfile?.()
    onNavigate?.('user')
  }

  const userContent = (
    <div className="user-content-column">
      <RelayBrand />
      <section className={`user-panel${view === 'account' ? ' account-panel' : ''}`}>
        {view === 'register' && (
          <RegisterForm
            onRegistered={(response, registeredEmail) =>
              startVerification(response, registeredEmail)
            }
            onLogin={() => setView('login')}
          />
        )}
        {view === 'login' && (
          <LoginForm
            onLoggedIn={finishLogin}
            onRegister={() => setView('register')}
            notice={loginNotice}
          />
        )}
        {view === 'verify' && sessionId && (
          <VerificationForm
            sessionId={sessionId}
            email={email}
            demoCode={api === mockUserApi ? mockVerificationCode : undefined}
            onVerified={finishVerification}
            onBack={() => setView('register')}
          />
        )}
        {view === 'profile' && sessionId && (
          <ProfileSetupForm sessionId={sessionId} onComplete={() => setView('complete')} />
        )}
        {view === 'complete' && (
          <div className="user-form user-complete">
            <span className="user-success-icon">✓</span>
            <span className="user-eyebrow">You’re all set</span>
            <h1>Welcome to Relay</h1>
            <p>Your account is ready to use.</p>
            <RelayButton
              variant="primary"
              className="glass-btn-primary user-submit"
              onClick={completeRegistration}
            >
              Let's begin!
            </RelayButton>
          </div>
        )}
        {view === 'account' && sessionId && (
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
      <UserApiProvider api={api}>
        <div className="user-profile-content">
          <div className="user-profile-card-header">
            <span className="user-eyebrow">Profile</span>
            <IconButton label="Close profile" onClick={onCloseProfile}>
              ×
            </IconButton>
          </div>
          {sessionId && view === 'account' ? (
            <AccountView
              sessionId={sessionId}
              onLoggedOut={finishLogout}
              onDeleted={() => {
                setSessionId(undefined)
                setLoginNotice('Your account was deleted successfully.')
                setView('login')
                onCloseProfile?.()
              }}
            />
          ) : (
            <p className="user-profile-card-empty">Sign in to view your profile.</p>
          )}
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
