import React, { useMemo, useState } from 'react'
import ReactDOM from 'react-dom/client'
import './style.css'

// ── Types ──────────────────────────────────────────────────────────────────

type StepStatus = 'pending' | 'awaiting' | 'approved' | 'rejected'

type TxStep = {
  id: number
  title: string
  contract: string
  method: string
  details: Record<string, string>
  warning?: string
  approveLabel: string
}

// ── Static step definitions ────────────────────────────────────────────────

const TX_STEPS: TxStep[] = [
  {
    id: 0,
    title: 'Connect to contract',
    contract: '0xA0b8...eB48',
    method: 'connect(address)',
    details: {
      'From': '0xYour...Wallet',
      'Contract': '0xA0b8...eB48',
      'Network': 'Ethereum Mainnet',
      'Gas estimate': '21,000 gas',
    },
    approveLabel: 'Connect',
  },
  {
    id: 1,
    title: 'Approve token spend',
    contract: '0xdAC1...1ec7',
    method: 'approve(spender, amount)',
    details: {
      'Token': 'USDC',
      'Spender': '0xA0b8...eB48',
      'Amount': '5,000 USDC',
      'Gas estimate': '46,000 gas · ~$1.20',
    },
    warning: 'You are granting this contract permission to spend your tokens.',
    approveLabel: 'Approve spend',
  },
  {
    id: 2,
    title: 'Deposit to pool',
    contract: '0xA0b8...eB48',
    method: 'deposit(uint256 amount)',
    details: {
      'Amount': '5,000 USDC',
      'Pool': 'USDC / ETH 0.3%',
      'Slippage tolerance': '0.5%',
      'Gas estimate': '112,000 gas · ~$2.80',
    },
    approveLabel: 'Confirm deposit',
  },
  {
    id: 3,
    title: 'Claim LP tokens',
    contract: '0xA0b8...eB48',
    method: 'mint(address recipient)',
    details: {
      'LP tokens': '4,987.23 UNI-V2',
      'Recipient': '0xYour...Wallet',
      'Pool share': '0.0041%',
      'Gas estimate': '68,000 gas · ~$1.70',
    },
    approveLabel: 'Claim tokens',
  },
  {
    id: 4,
    title: 'Stake for yield',
    contract: '0x1f98...0505',
    method: 'stake(uint256 lpAmount)',
    details: {
      'LP staked': '4,987.23 UNI-V2',
      'Reward token': 'UNI',
      'Current APY': '5.00%',
      'Gas estimate': '89,000 gas · ~$2.20',
    },
    approveLabel: 'Stake & earn',
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return isNaN(n)
    ? '—'
    : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

// ── Auth screen ────────────────────────────────────────────────────────────

type AuthStage = 'signup' | 'login'

type StoredUser = { email: string; password: string } | null

function AuthScreen({
  stage,
  stored,
  onSignup,
  onLogin,
  onSwitch,
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

  const switchTo = (s: AuthStage) => {
    setError('')
    setEmail('')
    setPassword('')
    onSwitch(s)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">DeFi</div>
        <div className="auth-title">{stage === 'signup' ? 'Create account' : 'Sign in'}</div>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            placeholder="you@example.com"
            onKeyDown={e => e.key === 'Enter' && submit()}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && submit()}
          />
        </label>

        {error && <div className="auth-error">{error}</div>}

        <button onClick={submit}>
          {stage === 'signup' ? 'Sign up' : 'Log in'}
        </button>

        <div className="auth-toggle">
          {stage === 'signup' ? (
            <>Already have an account? <button className="link" onClick={() => switchTo('login')}>Log in</button></>
          ) : (
            <>No account yet? <button className="link" onClick={() => switchTo('signup')}>Sign up</button></>
          )}
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

  const [balance, setBalance] = useState('5000')
  const [apy, setApy] = useState('5')
  const [years, setYears] = useState('1')

  // step index that is currently "awaiting" user action; null = not started
  const [currentStep, setCurrentStep] = useState<number | null>(null)
  const [statuses, setStatuses] = useState<StepStatus[]>(TX_STEPS.map(() => 'pending'))

  const { principal, interest, total } = useMemo(() => {
    const p = parseFloat(balance) || 0
    const r = parseFloat(apy) / 100 || 0
    const t = parseFloat(years) || 0
    const i = p * r * t
    return { principal: p, interest: i, total: p + i }
  }, [balance, apy, years])

  const allDone = statuses.every(s => s === 'approved')
  const anyRejected = statuses.some(s => s === 'rejected')

  const setStatus = (idx: number, status: StepStatus) => {
    setStatuses(prev => prev.map((s, i) => (i === idx ? status : s)))
  }

  const startFlow = () => {
    setStatuses(TX_STEPS.map(() => 'pending'))
    setCurrentStep(0)
    setStatus(0, 'awaiting')
  }

  const approve = (idx: number) => {
    setStatus(idx, 'approved')
    const next = idx + 1
    if (next < TX_STEPS.length) {
      setCurrentStep(next)
      setStatus(next, 'awaiting')
    } else {
      setCurrentStep(null)
    }
  }

  const reject = (idx: number) => {
    setStatus(idx, 'rejected')
    setCurrentStep(null)
  }

  const reset = () => {
    setStatuses(TX_STEPS.map(() => 'pending'))
    setCurrentStep(null)
  }

  if (!loggedIn) {
    return (
      <AuthScreen
        stage={authStage}
        stored={storedUser}
        onSignup={(email, password) => {
          setStoredUser({ email, password })
          setAuthStage('login')
        }}
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

      <main>
        {/* ── Balance + APY ── */}
        <section className="card">
          <div className="card-title">Balance &amp; APY Calculator</div>
          <div className="field-group">
            <label>
              Starting balance
              <input
                type="number"
                min={0}
                step={100}
                value={balance}
                onChange={e => setBalance(e.target.value)}
                placeholder="0.00"
              />
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
              <div className="fig-value">{fmt(principal)}</div>
            </div>
            <div className="figure">
              <div className="fig-label">Interest earned</div>
              <div className="fig-value accent">{fmt(interest)}</div>
            </div>
            <div className="figure">
              <div className="fig-label">Total after lock</div>
              <div className="fig-value">{fmt(total)}</div>
            </div>
          </div>
        </section>

        {/* ── Transaction flow ── */}
        <section className="card">
          <div className="card-title">Contract transaction flow</div>
          <p className="hint">Each step requires your manual approval before the next contract call executes.</p>

          <div className="steps">
            {TX_STEPS.map((step, i) => {
              const status = statuses[i]
              const isAwaiting = status === 'awaiting'

              return (
                <div key={step.id} className={`step step--${status}`}>
                  <div className="step-left">
                    <div className="step-dot">
                      {status === 'approved' ? '✓' : status === 'rejected' ? '✕' : i + 1}
                    </div>
                    {i < TX_STEPS.length - 1 && <div className="step-line" />}
                  </div>

                  <div className="step-body">
                    <div className="step-header">
                      <div>
                        <div className="step-title">{step.title}</div>
                        <div className="step-meta">
                          <span className="mono">{step.contract}</span>
                          <span className="sep">·</span>
                          <span className="mono method">{step.method}</span>
                        </div>
                      </div>
                      <div className={`status-badge status--${status}`}>
                        {status === 'pending' && 'Pending'}
                        {status === 'awaiting' && 'Awaiting approval'}
                        {status === 'approved' && 'Approved'}
                        {status === 'rejected' && 'Rejected'}
                      </div>
                    </div>

                    {isAwaiting && (
                      <div className="tx-prompt">
                        {step.warning && (
                          <div className="tx-warning">{step.warning}</div>
                        )}
                        <div className="tx-details">
                          {Object.entries(step.details).map(([k, v]) => (
                            <div key={k} className="tx-row">
                              <span className="tx-key">{k}</span>
                              <span className="tx-val">{v}</span>
                            </div>
                          ))}
                        </div>
                        <div className="tx-actions">
                          <button onClick={() => approve(i)}>{step.approveLabel}</button>
                          <button className="reject" onClick={() => reject(i)}>Reject</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {allDone && (
            <div className="success-banner">
              All contract calls confirmed. Position is live on-chain.
            </div>
          )}

          {anyRejected && !allDone && (
            <div className="rejected-banner">
              Transaction rejected. Flow stopped.
            </div>
          )}

          <div className="sim-actions">
            {currentStep === null && !allDone && (
              <button onClick={startFlow}>
                {anyRejected ? 'Restart flow' : 'Start transaction'}
              </button>
            )}
            {(allDone || anyRejected) && (
              <button className="secondary" onClick={reset}>Reset</button>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
