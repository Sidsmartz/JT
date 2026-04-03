import React, { useMemo, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './wagmi.config'
import { WalletBar } from './WalletBar'
import { ContractFlow } from './ContractFlow'
import './style.css'

const queryClient = new QueryClient()

// ── Helpers ────────────────────────────────────────────────────────────────


// ── Auth screen ────────────────────────────────────────────────────────────

type AuthStage = 'signup' | 'login'
type StoredUser = { email: string; password: string } | null

function AuthScreen({
  stage, stored, onSignup, onLogin, onSwitch,
}: {
  stage: AuthStage
  stored: StoredUser
  onSignup: (email: string, password: string) => void
  onLogin: (email: string, password: string) => void
  onSwitch: (s: AuthStage) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = () => {
    if (!email || !password) { setError('Fill in both fields.'); return }
    if (stage === 'signup') {
      onSignup(email, password)
    } else {
      if (!stored || email !== stored.email || password !== stored.password) {
        setError('Credentials do not match.')
        return
      }
      onLogin(email, password)
    }
  }

  const switchTo = (s: AuthStage) => { setError(''); setEmail(''); setPassword(''); onSwitch(s) }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">DeFi</div>
        <div className="auth-title">{stage === 'signup' ? 'Create account' : 'Sign in'}</div>
        <label>
          Email
          <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }}
            placeholder="you@example.com" onKeyDown={e => e.key === 'Enter' && submit()} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }}
            placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && submit()} />
        </label>
        {error && <div className="auth-error">{error}</div>}
        <button onClick={submit}>{stage === 'signup' ? 'Sign up' : 'Log in'}</button>
        <div className="auth-toggle">
          {stage === 'signup'
            ? (<>Already have an account? <button className="link" onClick={() => switchTo('login')}>Log in</button></>)
            : (<>No account yet? <button className="link" onClick={() => switchTo('signup')}>Sign up</button></>)}
        </div>
      </div>
    </div>
  )
}

// ── App ────────────────────────────────────────────────────────────────────

function App() {
  const [authStage, setAuthStage] = useState<AuthStage>('signup')
  const [storedUser, setStoredUser] = useState<StoredUser>(null)
  const [loggedIn, setLoggedIn] = useState(false)

  const [balance, setBalance] = useState('10')
  const [apy, setApy] = useState('5')
  const [years, setYears] = useState('1')

  const { principal, interest, total } = useMemo(() => {
    const p = parseFloat(balance) || 0
    const r = parseFloat(apy) / 100 || 0
    const t = parseFloat(years) || 0
    const i = p * r * t
    return { principal: p, interest: i, total: p + i }
  }, [balance, apy, years])

  if (!loggedIn) {
    return (
      <AuthScreen
        stage={authStage}
        stored={storedUser}
        onSignup={(email, password) => { setStoredUser({ email, password }); setAuthStage('login') }}
        onLogin={() => setLoggedIn(true)}
        onSwitch={setAuthStage}
      />
    )
  }

  return (
    <div className="shell">
      <header>
        <div>
          <h1>DeFi</h1>
          <p className="sub">Smart contract transaction flow</p>
        </div>
        <button className="secondary sign-out" onClick={() => setLoggedIn(false)}>Sign out</button>
      </header>

      {/* Wallet connection bar */}
      <WalletBar />

      <main>
        {/* ── Balance + APY ── */}
        <section className="card">
          <div className="card-title">Balance &amp; APY Calculator</div>
          <div className="field-group">
            <label>
              Starting balance (ETH)
              <input type="number" min={0} step={1} value={balance}
                onChange={e => setBalance(e.target.value)} placeholder="0.00" />
            </label>
            <label>
              Annual percentage yield
              <select value={apy} onChange={e => setApy(e.target.value)}>
                <option value="3">3% — conservative</option>
                <option value="5">5% — stablecoins</option>
                <option value="9">9% — volatile pair</option>
                <option value="15">15% — high risk</option>
              </select>
            </label>
            <label>
              Duration
              <select value={years} onChange={e => setYears(e.target.value)}>
                <option value="0.5">6 months</option>
                <option value="1">1 year</option>
                <option value="2">2 years</option>
                <option value="4">4 years</option>
              </select>
            </label>
          </div>
          <div className="figures">
            <div className="figure">
              <div className="fig-label">Deposited</div>
              <div className="fig-value">{principal.toFixed(4)} ETH</div>
            </div>
            <div className="figure">
              <div className="fig-label">Interest earned</div>
              <div className="fig-value accent">{interest.toFixed(4)} ETH</div>
            </div>
            <div className="figure">
              <div className="fig-label">Total after lock</div>
              <div className="fig-value">{total.toFixed(4)} ETH</div>
            </div>
          </div>
        </section>

        {/* ── Live contract flow ── */}
        <section className="card">
          <div className="card-title">Live contract transaction flow</div>
          <ContractFlow amount={balance} />
        </section>
      </main>
    </div>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
