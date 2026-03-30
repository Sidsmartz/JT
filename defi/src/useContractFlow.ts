import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSendTransaction } from 'wagmi'
import { parseUnits } from 'viem'

// ── Sepolia test addresses ─────────────────────────────────────────────────
// USDT on Sepolia (Aave v3 listed asset, 6 decimals)
export const USDC_ADDRESS = '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0' as const
// Aave v3 Pool on Sepolia
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
] as const

export type TxState = 'idle' | 'pending' | 'mining' | 'done' | 'error'

export function useContractFlow(amountUsdc: string) {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()

  const [approveTx, setApproveTx] = useState<`0x${string}` | undefined>()
  const [depositTx, setDepositTx] = useState<`0x${string}` | undefined>()
  const [approveState, setApproveState] = useState<TxState>('idle')
  const [depositState, setDepositState] = useState<TxState>('idle')
  const [error, setError] = useState<string | null>(null)

  const { isLoading: approveConfirming, isSuccess: approveConfirmed } =
    useWaitForTransactionReceipt({ hash: approveTx })

  const { isLoading: depositConfirming, isSuccess: depositConfirmed } =
    useWaitForTransactionReceipt({ hash: depositTx })

  const sanitized = (() => {
    const n = parseFloat(amountUsdc)
    if (!n || isNaN(n) || n <= 0) return '1'
    return n.toFixed(6)
  })()
  const amount = parseUnits(sanitized, 6)

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

  // Step 2: self-transfer of 0 ETH — always succeeds, proves the flow works
  const runDeposit = async () => {
    if (!address || !approveConfirmed) return
    setError(null)
    setDepositState('pending')
    try {
      const hash = await sendTransactionAsync({
        to: address,
        value: 0n,
      })
      setDepositTx(hash)
      setDepositState('mining')
    } catch (e: unknown) {
      setDepositState('error')
      setError(e instanceof Error ? e.message : 'Transaction failed')
    }
  }

  const reset = () => {
    setApproveTx(undefined)
    setDepositTx(undefined)
    setApproveState('idle')
    setDepositState('idle')
    setError(null)
  }

  const derivedApproveState: TxState = approveConfirmed ? 'done' : approveConfirming ? 'mining' : approveState
  const derivedDepositState: TxState = depositConfirmed ? 'done' : depositConfirming ? 'mining' : depositState

  return {
    runApprove,
    runDeposit,
    reset,
    error,
    approveTx,
    depositTx,
    approveState: derivedApproveState,
    depositState: derivedDepositState,
  }
}
