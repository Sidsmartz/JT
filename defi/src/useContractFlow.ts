import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'

// ── Sepolia test addresses ─────────────────────────────────────────────────
// USDC on Sepolia (Circle's official test token)
export const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as const
// Aave v3 Pool on Sepolia (used for real deposit demo)
export const AAVE_POOL   = '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951' as const

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount',  type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const

const AAVE_POOL_ABI = [
  {
    name: 'supply',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset',         type: 'address' },
      { name: 'amount',        type: 'uint256' },
      { name: 'onBehalfOf',    type: 'address' },
      { name: 'referralCode',  type: 'uint16'  },
    ],
    outputs: [],
  },
] as const

export type TxState = 'idle' | 'pending' | 'mining' | 'done' | 'error'

export function useContractFlow(amountUsdc: string) {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()

  const [approveTx, setApproveTx] = useState<`0x${string}` | undefined>()
  const [depositTx, setDepositTx] = useState<`0x${string}` | undefined>()
  const [approveState, setApproveState] = useState<TxState>('idle')
  const [depositState, setDepositState] = useState<TxState>('idle')
  const [error, setError] = useState<string | null>(null)

  const { isLoading: approveConfirming, isSuccess: approveConfirmed } =
    useWaitForTransactionReceipt({ hash: approveTx })

  const { isLoading: depositConfirming, isSuccess: depositConfirmed } =
    useWaitForTransactionReceipt({ hash: depositTx })

  // Sanitize: strip excess decimals beyond 6 places to avoid parseUnits throwing
  const sanitized = (() => {
    const n = parseFloat(amountUsdc)
    if (!n || isNaN(n) || n <= 0) return '1' // default to 1 USDC if invalid
    return n.toFixed(6)
  })()
  const amount = parseUnits(sanitized, 6) // USDC has 6 decimals

  const runApprove = async () => {
    if (!address) return
    setError(null)
    setApproveState('pending')
    try {
      const hash = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [AAVE_POOL, amount],
      })
      setApproveTx(hash)
      setApproveState('mining')
    } catch (e: unknown) {
      setApproveState('error')
      setError(e instanceof Error ? e.message : 'Approve failed')
    }
  }

  const runDeposit = async () => {
    if (!address) return
    setError(null)
    setDepositState('pending')
    try {
      const hash = await writeContractAsync({
        address: AAVE_POOL,
        abi: AAVE_POOL_ABI,
        functionName: 'supply',
        args: [USDC_ADDRESS, amount, address, 0],
      })
      setDepositTx(hash)
      setDepositState('mining')
    } catch (e: unknown) {
      setDepositState('error')
      setError(e instanceof Error ? e.message : 'Deposit failed')
    }
  }

  const reset = () => {
    setApproveTx(undefined)
    setDepositTx(undefined)
    setApproveState('idle')
    setDepositState('idle')
    setError(null)
  }

  return {
    runApprove,
    runDeposit,
    reset,
    error,
    approveTx,
    depositTx,
    approveState: approveConfirmed ? 'done' : approveConfirming ? 'mining' : approveState,
    depositState: depositConfirmed ? 'done' : depositConfirming ? 'mining' : depositState,
  }
}
