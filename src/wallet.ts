import { BrowserProvider, Contract, formatEther, formatUnits } from 'ethers'
import deployment from './deployment/sepolia.json'

export const SEPOLIA_CHAIN_ID = '0xAA36A7'

export type WalletStatus = 'disconnected' | 'connected' | 'wrong-network'

export interface WalletDetails {
  status: WalletStatus
  address: string | null
  chainId: string | null
  balance: string
  padmaBalance?: string
  ownedBadges?: number[]
  transactionHash?: string | null
  transactionStatus?: 'idle' | 'pending' | 'confirmed' | 'failed'
  etherscanUrl?: string | null
  error: string | null
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] | Record<string, unknown>[] }) => Promise<unknown>
      on: (event: string, callback: (...args: unknown[]) => void) => void
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void
      selectedAddress?: string | null
    }
  }
}

export function resolveWalletStatus(chainId: string | null | undefined, isConnected: boolean): WalletStatus {
  if (!isConnected || !chainId) {
    return 'disconnected'
  }
  return chainId.toLowerCase() === SEPOLIA_CHAIN_ID.toLowerCase() ? 'connected' : 'wrong-network'
}

export async function loadWalletDetails(): Promise<WalletDetails> {
  if (!window.ethereum) {
    return {
      status: 'disconnected',
      address: null,
      chainId: null,
      balance: '0 ETH',
      error: 'MetaMask is not installed.',
    }
  }

  try {
    const provider = new BrowserProvider(window.ethereum as never)
    const accounts = await provider.listAccounts()
    const network = await provider.getNetwork()
    const chainId = `0x${network.chainId.toString(16)}`
    const address = accounts[0]?.address ?? window.ethereum.selectedAddress ?? null

    const balance = address ? formatEther(await provider.getBalance(address)) : '0'

    return {
      status: resolveWalletStatus(chainId, accounts.length > 0),
      address,
      chainId,
      balance: `${balance} ETH`,
      error: null,
    }
  } catch (error) {
    return {
      status: 'disconnected',
      address: null,
      chainId: null,
      balance: '0 ETH',
      error: error instanceof Error ? error.message : 'Wallet lookup failed.',
    }
  }
}

export async function connectWallet(): Promise<WalletDetails> {
  if (!window.ethereum) {
    return {
      status: 'disconnected',
      address: null,
      chainId: null,
      balance: '0 ETH',
      error: 'MetaMask is not installed.',
    }
  }

  try {
    const provider = new BrowserProvider(window.ethereum as never)
    await provider.send('eth_requestAccounts', [])
    const network = await provider.getNetwork()
    const chainId = `0x${network.chainId.toString(16)}`
    const signer = await provider.getSigner()
    const address = await signer.getAddress()
    const balance = formatEther(await provider.getBalance(address))

    return {
      status: resolveWalletStatus(chainId, true),
      address,
      chainId,
      balance: `${balance} ETH`,
      error: null,
    }
  } catch (error) {
    return {
      status: 'disconnected',
      address: null,
      chainId: null,
      balance: '0 ETH',
      error: error instanceof Error ? error.message : 'Wallet connection failed.',
    }
  }
}

const PADMA_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function claimFaucet() returns (bool)',
]
const BADGES_ABI = [
  'function badgeOwned(address owner, uint8 chapter) view returns (bool)',
  'function mintFreeBadge(uint8 chapter) returns (uint256)',
]

function contractAddress(value: string): string | null {
  return /^0x[0-9a-fA-F]{40}$/.test(value) ? value : null
}

async function readContractState(details: WalletDetails, provider: BrowserProvider): Promise<WalletDetails> {
  if (details.status !== 'connected' || !details.address) return details
  const padmaAddress = contractAddress(import.meta.env.VITE_PADMA_TOKEN_ADDRESS || deployment.padmaToken)
  const badgeAddress = contractAddress(import.meta.env.VITE_RB_KEEPSAKES_ADDRESS || deployment.ruposhiKeepsakes)
  let padmaBalance = '0 PADMA'
  let ownedBadges: number[] = []
  try {
    if (padmaAddress) {
      const token = new Contract(padmaAddress, PADMA_ABI, provider)
      padmaBalance = `${formatUnits(await token.balanceOf(details.address), 18)} PADMA`
    }
  } catch { /* Contract configuration or network data may be unavailable. */ }
  try {
    if (badgeAddress) {
      const badges = new Contract(badgeAddress, BADGES_ABI, provider)
      for (let chapter = 1; chapter <= 5; chapter += 1) {
        if (await badges.badgeOwned(details.address, chapter)) ownedBadges.push(chapter)
      }
    }
  } catch { /* Badge contract is optional until deployment. */ }
  return { ...details, padmaBalance, ownedBadges, etherscanUrl: import.meta.env.VITE_ETHERSCAN_URL || deployment.network ? 'https://sepolia.etherscan.io' : null }
}

export async function loadWalletContractDetails(): Promise<WalletDetails> {
  const details = await loadWalletDetails()
  if (details.status !== 'connected' || !window.ethereum) return details
  try {
    return await readContractState(details, new BrowserProvider(window.ethereum as never))
  } catch (error) {
    return { ...details, error: error instanceof Error ? error.message : 'Contract lookup failed.' }
  }
}

export async function claimPadmaFaucet(): Promise<WalletDetails> {
  if (!window.ethereum) return { status: 'disconnected', address: null, chainId: null, balance: '0 ETH', padmaBalance: '0 PADMA', transactionStatus: 'failed', error: 'MetaMask is not installed.' }
  const details = await loadWalletContractDetails()
  if (details.status !== 'connected') return details
  const address = contractAddress(import.meta.env.VITE_PADMA_TOKEN_ADDRESS || deployment.padmaToken)
  if (!address) return { ...details, transactionStatus: 'failed', error: 'PADMA contract is not configured.' }
  try {
    const provider = new BrowserProvider(window.ethereum as never)
    const signer = await provider.getSigner()
    const contract = new Contract(address, PADMA_ABI, signer)
    const pending = await contract.claimFaucet()
    const hash = pending.hash as string
    const pendingDetails = { ...details, transactionHash: hash, transactionStatus: 'pending' as const, etherscanUrl: `https://sepolia.etherscan.io/tx/${hash}` }
    await pending.wait()
    return await readContractState({ ...pendingDetails, transactionStatus: 'confirmed' }, provider)
  } catch (error) {
    return { ...details, transactionStatus: 'failed', error: error instanceof Error ? error.message : 'Faucet claim failed.' }
  }
}

export async function mintChapterBadge(chapter: number): Promise<WalletDetails> {
  if (!window.ethereum) return { status: 'disconnected', address: null, chainId: null, balance: '0 ETH', ownedBadges: [], transactionStatus: 'failed', error: 'MetaMask is not installed.' }
  const details = await loadWalletContractDetails()
  if (details.status !== 'connected') return details
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > 5) return { ...details, transactionStatus: 'failed', error: 'Invalid chapter badge.' }
  const address = contractAddress(import.meta.env.VITE_RB_KEEPSAKES_ADDRESS || deployment.ruposhiKeepsakes)
  if (!address) return { ...details, transactionStatus: 'failed', error: 'Keepsakes contract is not configured.' }
  try {
    const provider = new BrowserProvider(window.ethereum as never)
    const signer = await provider.getSigner()
    const contract = new Contract(address, BADGES_ABI, signer)
    const pending = await contract.mintFreeBadge(chapter)
    const hash = pending.hash as string
    const pendingDetails = { ...details, transactionHash: hash, transactionStatus: 'pending' as const, etherscanUrl: `https://sepolia.etherscan.io/tx/${hash}` }
    await pending.wait()
    return await readContractState({ ...pendingDetails, transactionStatus: 'confirmed' }, provider)
  } catch (error) {
    return { ...details, transactionStatus: 'failed', error: error instanceof Error ? error.message : 'Badge mint failed.' }
  }
}

export async function switchToSepolia(): Promise<WalletDetails> {
  if (!window.ethereum) {
    return {
      status: 'disconnected',
      address: null,
      chainId: null,
      balance: '0 ETH',
      error: 'MetaMask is not installed.',
    }
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_CHAIN_ID }],
    })
    return loadWalletDetails()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to switch network.'
    return {
      status: 'wrong-network',
      address: null,
      chainId: null,
      balance: '0 ETH',
      error: message,
    }
  }
}
