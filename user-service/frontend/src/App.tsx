import '@relay/ui/styles.css'
import './styles.css'
import { useState } from 'react'
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

type View = 'login' | 'register' | 'verify' | 'profile' | 'complete' | 'account'

export default function App({ api = mockUserApi, onNavigate }: { api?: UserApi } & RemoteAppProps) {
  const [view, setView] = useState<View>('register')
  const [sessionId, setSessionId] = useState<SessionId>()
  const [email, setEmail] = useState('')
  const [loginNotice, setLoginNotice] = useState('')

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

  return (
    <UserApiProvider api={api}>
      <main className="user-app-shell">
        <div className="user-brand">
          <span className="user-brand-mark">R</span>
          <span>Relay</span>
        </div>
        <section className="user-panel">
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
              <button className="glass-btn-primary user-submit" onClick={() => setView('login')}>
                Continue to login
              </button>
            </div>
          )}
          {view === 'account' && sessionId && (
            <AccountView
              sessionId={sessionId}
              onLoggedOut={() => {
                setSessionId(undefined)
                setView('login')
              }}
              onDeleted={() => {
                setSessionId(undefined)
                setLoginNotice('Your account was deleted successfully.')
                setView('login')
              }}
            />
          )}
        </section>
        <p className="user-footer">Secure account access for the Relay community.</p>
      </main>
    </UserApiProvider>
  )
}
