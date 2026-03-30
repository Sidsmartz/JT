import { useState } from 'react'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useBalance,
} from 'wagmi'
import { sepolia } from 'wagmi/chains'

// Direct MetaMask RPC call — more reliable than wagmi's switchChain
// when Sepolia isn't already in the wallet's network list
async function switchToSepolia() {
  const provider = (window as Window & { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum
  if (!provider) throw new Error('No wallet found')

  const chainHex = '0x' + sepolia.id.toString(16) // 0xaa36a7

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainHex }],
    })
  } catch (err: unknown) {
    // 4902 = chain not added yet — add it first then switch
    if ((err as { code?: number }).code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: chainHex,
          chainName: 'Sepolia',
          nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: ['https://rpc.sepolia.org', 'https://ethereum-sepolia-rpc.publicnode.com'],
          blockExplorerUrls: ['https://sepolia.etherscan.io'],
        }],
      })
    } else {
      throw err
    }
  }
}

export function WalletBar() {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { data: balance } = useBalance({ address })
  const [switching, setSwitching] = useState(false)
  const [switchError, setSwitchError] = useState<string | null>(null)

  const wrongNetwork = isConnected && chain?.id !== sepolia.id

  const handleSwitch = async () => {
    setSwitching(true)
    setSwitchError(null)
    try {
      await switchToSepolia()
    } catch (e: unknown) {
      const code = typeof e === 'object' && e !== null && 'code' in e ? (e as { code: number }).code : null
      // 4001 = request already pending (MetaMask popup is open but hidden)
      if (code === 4001) {
        setSwitchError('MetaMask has a pending request — open MetaMask and approve it.')
      } else {
        const msg =
          e instanceof Error
            ? e.message
            : typeof e === 'object' && e !== null && 'message' in e
            ? String((e as { message: unknown }).message)
            : JSON.stringify(e)
        setSwitchError(msg)
      }
    } finally {
      setSwitching(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="wallet-bar">
        {connectors.map(c => (
          <button
            key={c.id}
            onClick={() => connect({ connector: c })}
            disabled={isPending}
            className="secondary"
          >
            {isPending ? 'Connecting…' : `Connect ${c.name}`}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="wallet-bar">
      {wrongNetwork && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button className="reject" onClick={handleSwitch} disabled={switching}>
            {switching ? 'Switching…' : 'Switch to Sepolia'}
          </button>
          {switchError && <span className="auth-error">{switchError}</span>}
        </div>
      )}
      <div className="wallet-info">
        <span className="mono">{address?.slice(0, 6)}…{address?.slice(-4)}</span>
        {balance && (
          <span className="muted-text">
            {(Number(balance.value) / 1e18).toFixed(4)} {balance.symbol}
          </span>
        )}
        <span className="network-badge">{chain?.name}</span>
      </div>
      <button className="secondary sign-out" onClick={() => disconnect()}>Disconnect</button>
    </div>
  )
}
