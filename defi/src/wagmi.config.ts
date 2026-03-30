import { http, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

// Replace with your WalletConnect project ID from https://cloud.walletconnect.com
const WC_PROJECT_ID = 'ef229bf25ca088f3397bae383cdccea6'

export const config = createConfig({
  chains: [sepolia],
  connectors: [
    injected(),                                    // MetaMask / browser wallet
    walletConnect({ projectId: WC_PROJECT_ID }),   // WalletConnect QR
  ],
  transports: {
    [sepolia.id]: http(),  // public RPC — swap for Alchemy/Infura URL in prod
  },
})
