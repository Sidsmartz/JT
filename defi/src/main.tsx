import React, { useMemo, useState } from 'react'
import ReactDOM from 'react-dom/client'
import './style.css'

type Step = { id: number; title: string; description: string; actor: string }

const STEPS: Step[] = [
  {
    id: 0,
    title: 'Broadcast Transaction',
    actor: 'User → Network',
    description:
      'Your signed transaction is broadcast to the peer-to-peer network. Nodes receive and validate the transaction format and signature.',
  },
  {
    id: 1,
    title: 'Mempool Queuing',
    actor: 'Network → Mempool',
    description:
      'Valid transactions enter the mempool (memory pool), where they wait to be picked up by a miner or validator based on gas fee priority.',
  },
  {
    id: 2,
    title: 'Block Inclusion',
    actor: 'Validator → Block',
    description:
      'A validator selects your transaction from the mempool and includes it in a new block candidate. The block is proposed to the network.',
  },
  {
    id: 3,
    title: 'Consensus & Finality',
    actor: 'Network → Chain',
    description:
      'Other validators attest to the block. Once enough attestations are collected, the block reaches finality and is appended to the chain.',
  },
  {
    id: 4,
    title: 'State Update',
    actor: 'Chain → State',
    description:
      'The EVM executes your transaction, updating account balances and contract storage. The new state root is committed to the blockchain.',
  },
]

function fmt(n: number) {
  return isNaN(n)
    ? '—'
    : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

function App() {
  const [balance, setBalance] = useState('5000')
  const [apy, setApy] = useState('5')
  const [years, setYears] = useState('1')

  const [activeStep, setActiveStep] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)

  const { principal, interest, total } = useMemo(() => {
    const p = parseFloat(balance) || 0
    const r = parseFloat(apy) / 100 || 0
    const t = parseFloat(years) || 0
    const i = p * r * t
    return { principal: p, interest: i, total: p + i }
  }, [balance, apy, years])

  const runSimulation = async () => {
    if (running) return
    setRunning(true)
    setDone(false)
    for (let i = 0; i < STEPS.length; i++) {
      setActiveStep(i)
      await new Promise(r => setTimeout(r, 1200))
    }
    setRunning(false)
    setDone(true)
  }

  const reset = () => {
    setActiveStep(null)
    setDone(false)
    setRunning(false)
  }

  return (
    <div className="shell">
      <header>
        <h1>DeFi</h1>
        <p className="sub">Blockchain transaction simulator</p>
      </header>

      <main>
        {/* ── Top: Balance + APY Calculator ── */}
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
              Annual percentage yield (APY)
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

        {/* ── Bottom: Transaction Simulator ── */}
        <section className="card">
          <div className="card-title">Transaction Simulator</div>
          <p className="hint">Walk through how a transaction moves from your wallet to the blockchain.</p>

          <div className="steps">
            {STEPS.map((step, i) => {
              const state =
                activeStep === null
                  ? 'idle'
                  : i < activeStep
                  ? 'done'
                  : i === activeStep
                  ? 'active'
                  : 'idle'

              return (
                <div key={step.id} className={`step step--${state}`}>
                  <div className="step-left">
                    <div className="step-dot">
                      {state === 'done' ? '✓' : i + 1}
                    </div>
                    {i < STEPS.length - 1 && <div className="step-line" />}
                  </div>
                  <div className="step-body">
                    <div className="step-title">{step.title}</div>
                    <div className="step-actor">{step.actor}</div>
                    {state === 'active' && (
                      <div className="step-desc">{step.description}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {done && (
            <div className="success-banner">
              Transaction confirmed on-chain.
            </div>
          )}

          <div className="sim-actions">
            <button onClick={runSimulation} disabled={running}>
              {running ? 'Simulating…' : 'Run simulation'}
            </button>
            <button className="secondary" onClick={reset} disabled={running}>
              Reset
            </button>
          </div>
        </section>
      </main>

      <footer>
        <span>DeFi · educational simulator</span>
        <span>No wallet required.</span>
      </footer>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
