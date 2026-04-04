import React, { useMemo, useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './wagmi.config'
import { WalletBar } from './WalletBar'
import { ContractFlow } from './ContractFlow'
import './style.css'

const queryClient = new QueryClient()

const LS_KEY = 'defi_user'

type StoredUser = {
  email: string
  password: string
  name: string
  phone: string
  gender: string
}

// ── Auth screen ────────────────────────────────────────────────────────────

type AuthStage = 'signup' | 'login'

function AuthScreen({
  stage, stored, onSignup, onLogin, onSwitch,
}: {
  stage: AuthStage
  stored: StoredUser | null
  onSignup: (u: StoredUser) => void
  onLogin: (u: StoredUser) => void
  onSwitch: (s: AuthStage) => void
}) {
  const [name, setName]       = useState('')
  const [phone, setPhone]     = useState('')
  const [gender, setGender]   = useState('')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')

  const clear = () => { setError(''); setEmail(''); setPassword(''); setName(''); setPhone(''); setGender('') }

  const submit = () => {
    if (stage === 'signup') {
      if (!name || !phone || !gender || !email || !password) { setError('Fill in all fields.'); return }
      onSignup({ name, phone, gender, email, password })
    } else {
      if (!email || !password) { setError('Fill in both fields.'); return }
      if (!stored || email !== stored.email || password !== stored.password) {
        setError('Credentials do not match.'); return
      }
      onLogin(stored)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">DeFi</div>
        <div className="auth-title">{stage === 'signup' ? 'Create account' : 'Sign in'}</div>

        {stage === 'signup' && (
          <>
            <label>
              Full name
              <input value={name} onChange={e => { setName(e.target.value); setError('') }}
                placeholder="[name]" />
            </label>
            <label>
              Phone number
              <input type="tel" value={phone} onChange={e => { setPhone(e.target.value); setError('') }}
                placeholder="[phone_number]" />
            </label>
            <label>
              Gender
              <select value={gender} onChange={e => { setGender(e.target.value); setError('') }}>
                <option value="">Select…</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </label>
          </>
        )}

        <label>
          Email
          <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }}
            placeholder="[email]" onKeyDown={e => e.key === 'Enter' && submit()} />
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
            ? (<>Already have an account? <button className="link" onClick={() => { clear(); onSwitch('login') }}>Log in</button></>)
            : (<>No account yet? <button className="link" onClick={() => { clear(); onSwitch('signup') }}>Sign up</button></>)}
        </div>
      </div>
    </div>
  )
}

// ── App ────────────────────────────────────────────────────────────────────

function App() {
  const [authStage, setAuthStage] = useState<AuthStage>('signup')
  const [storedUser, setStoredUser] = useState<StoredUser | null>(null)
  const [loggedIn, setLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null)

  // Load from localStorage on mount
  useEffect(() => {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) { setStoredUser(JSON.parse(raw)); setAuthStage('login') }
  }, [])

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

  const handleSignup = (u: StoredUser) => {
    localStorage.setItem(LS_KEY, JSON.stringify(u))
    setStoredUser(u)
    setAuthStage('login')
  }

  const handleLogin = (u: StoredUser) => {
    setCurrentUser(u)
    setLoggedIn(true)
  }

  const handleSignOut = () => {
    setLoggedIn(false)
    setCurrentUser(null)
  }

  if (!loggedIn) {
    return (
      <AuthScreen
        stage={authStage}
        stored={storedUser}
        onSignup={handleSignup}
        onLogin={handleLogin}
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
        <button className="secondary sign-out" onClick={handleSignOut}>Sign out</button>
      </header>

      <WalletBar />

      <main>
        {/* ── User profile ── */}
        {currentUser && (
          <section className="card">
            <div className="card-title">Profile</div>
            <div className="tx-details">
              <div className="tx-row"><span className="tx-key">Name</span><span className="tx-val">{currentUser.name}</span></div>
              <div className="tx-row"><span className="tx-key">Email</span><span className="tx-val">{currentUser.email}</span></div>
              <div className="tx-row"><span className="tx-key">Phone</span><span className="tx-val">{currentUser.phone}</span></div>
              <div className="tx-row"><span className="tx-key">Gender</span><span className="tx-val">{currentUser.gender}</span></div>
            </div>
          </section>
        )}

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
