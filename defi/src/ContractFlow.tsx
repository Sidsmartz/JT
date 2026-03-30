import { useAccount } from 'wagmi'
import { useContractFlow, USDC_ADDRESS, AAVE_POOL } from './useContractFlow'
import { sepolia } from 'wagmi/chains'

const EXPLORER = 'https://sepolia.etherscan.io/tx/'

function TxLink({ hash }: { hash?: `0x${string}` }) {
  if (!hash) return null
  return (
    <a
      href={`${EXPLORER}${hash}`}
      target="_blank"
      rel="noreferrer"
      className="tx-link"
    >
      {hash.slice(0, 10)}…{hash.slice(-6)} ↗
    </a>
  )
}

import type { TxState } from './useContractFlow'

type StepProps = {
  num: number
  title: string
  contract: string
  method: string
  details: Record<string, string>
  warning?: string
  actionLabel: string
  state: TxState
  txHash?: `0x${string}`
  onAction: () => void
  disabled?: boolean
}

function Step({ num, title, contract, method, details, warning, actionLabel, state, txHash, onAction, disabled }: StepProps) {
  const statusLabel = {
    idle:    'Pending',
    pending: 'Awaiting wallet…',
    mining:  'Mining…',
    done:    'Confirmed',
    error:   'Failed',
  }[state]

  const statusClass = {
    idle:    'status--pending',
    pending: 'status--awaiting',
    mining:  'status--awaiting',
    done:    'status--approved',
    error:   'status--rejected',
  }[state]

  const stepClass = {
    idle:    'step--pending',
    pending: 'step--awaiting',
    mining:  'step--awaiting',
    done:    'step--approved',
    error:   'step--rejected',
  }[state]

  const dotContent = state === 'done' ? '✓' : state === 'error' ? '✕' : num

  return (
    <div className={`step ${stepClass}`}>
      <div className="step-left">
        <div className="step-dot">{dotContent}</div>
        {num < 2 && <div className="step-line" />}
      </div>
      <div className="step-body">
        <div className="step-header">
          <div>
            <div className="step-title">{title}</div>
            <div className="step-meta">
              <span className="mono">{contract}</span>
              <span className="sep">·</span>
              <span className="mono method">{method}</span>
            </div>
          </div>
          <div className={`status-badge ${statusClass}`}>{statusLabel}</div>
        </div>

        {(state === 'idle' || state === 'error') && !disabled && (
          <div className="tx-prompt">
            {warning && <div className="tx-warning">{warning}</div>}
            <div className="tx-details">
              {Object.entries(details).map(([k, v]) => (
                <div key={k} className="tx-row">
                  <span className="tx-key">{k}</span>
                  <span className="tx-val">{v}</span>
                </div>
              ))}
            </div>
            <div className="tx-actions">
              <button onClick={onAction}>
                {actionLabel}
              </button>
            </div>
          </div>
        )}

        {(state === 'mining' || state === 'done') && txHash && (
          <div className="tx-prompt" style={{ padding: '10px 14px' }}>
            <TxLink hash={txHash} />
          </div>
        )}
      </div>
    </div>
  )
}

export function ContractFlow({ amount }: { amount: string }) {
  const { isConnected, chain } = useAccount()
  const {
    runApprove, runDeposit, reset,
    error, approveTx, depositTx,
    approveState, depositState,
  } = useContractFlow(amount)

  const wrongNetwork = isConnected && chain?.id !== sepolia.id
  const allDone = approveState === 'done' && depositState === 'done'
  const anyError = approveState === 'error' || depositState === 'error'

  if (!isConnected) {
    return <p className="hint">Connect your wallet above to execute real on-chain transactions.</p>
  }

  if (wrongNetwork) {
    return <p className="hint" style={{ color: 'var(--danger)' }}>Switch to Sepolia testnet to continue.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p className="hint">
        Live on Sepolia testnet — real transactions, no real money.
        Get test USDT from the{' '}
        <a href="https://app.aave.com/faucet/?marketName=proto_sepolia_v3" target="_blank" rel="noreferrer" className="tx-link">
          Aave faucet
        </a>.
      </p>

      <div className="steps">
        <Step
          num={1}
          title="Approve USDT spend"
          contract={`${USDC_ADDRESS.slice(0, 6)}…${USDC_ADDRESS.slice(-4)}`}
          method="approve(spender, amount)"
          details={{
            Token:    'USDT (Sepolia)',
            Spender:  `${AAVE_POOL.slice(0, 6)}…${AAVE_POOL.slice(-4)}`,
            Amount:   `${amount} USDT`,
            Contract: USDC_ADDRESS,
          }}
          warning="This grants Aave v3 permission to spend your USDT."
          actionLabel="Approve spend"
          state={approveState}
          txHash={approveTx}
          onAction={runApprove}
        />
        <Step
          num={2}
          title="Confirm on-chain"
          contract={`${AAVE_POOL.slice(0, 6)}…${AAVE_POOL.slice(-4)}`}
          method="sendTransaction(to, value)"
          details={{
            Type:    'Self-transfer (0 ETH)',
            Purpose: 'Proves end-to-end tx flow',
            Network: 'Sepolia testnet',
          }}
          actionLabel="Confirm transaction"
          state={depositState}
          txHash={depositTx}
          onAction={runDeposit}
          disabled={approveState !== 'done'}
        />
      </div>

      {allDone && (
        <div className="success-banner">
          Both transactions confirmed on-chain.
        </div>
      )}

      {anyError && error && (
        <div className="rejected-banner">{error}</div>
      )}

      {(allDone || anyError) && (
        <div className="sim-actions">
          <button className="secondary" onClick={reset}>Reset</button>
        </div>
      )}
    </div>
  )
}
