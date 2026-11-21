import { describe, expect, it } from 'vitest'
import { resolveWalletStatus, SEPOLIA_CHAIN_ID } from './wallet'

describe('wallet state handling', () => {
  it('flags a connected wallet on Sepolia as ready', () => {
    expect(resolveWalletStatus(SEPOLIA_CHAIN_ID, true)).toBe('connected')
  })

  it('requires the wallet to be on Sepolia before it is treated as active', () => {
    expect(resolveWalletStatus('0x1', true)).toBe('wrong-network')
    expect(resolveWalletStatus(null, false)).toBe('disconnected')
  })
})
