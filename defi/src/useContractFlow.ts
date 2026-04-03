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

export function useContractFlow(amountEth: string, recipient?: `0x${string}`) {
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

  // Parse ETH amount for the send tx (18 decimals)
  const ethValue = (() => {
    try {
      const n = parseFloat(amountEth)
      if (!n || isNaN(n) || n <= 0) return parseUnits('0.001', 18)
      return parseUnits(n.toFixed(18), 18)
    } catch {
      return parseUnits('0.001', 18)
    }
  })()

  // USDT approve amount — use ETH value * 2000 as a USD equivalent for display
  const usdtAmount = parseUnits(
    Math.max(1, parseFloat(amountEth) * 2000 || 1).toFixed(6),
    6
  )

  const runApprove = async () => {
    if (!address) return
    setError(null)
    setApproveState('pending')
    try {
      const hash = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [AAVE_POOL, usdtAmount],
      })
      setApproveTx(hash)
      setApproveState('mining')
    } catch (e: unknown) {
      setApproveState('error')
      setError(e instanceof Error ? e.message : 'Approve failed')
    }
  }

  // Step 2: send ETH to recipient — value shows in wallet popup
  const runDeposit = async () => {
    if (!address || !approveConfirmed) return
    setError(null)
    setDepositState('pending')
    try {
      const hash = await sendTransactionAsync({
        to: recipient ?? address,
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
    ethValue,
    usdtAmount,
    approveState: derivedApproveState,
    depositState: derivedDepositState,
  }
}
