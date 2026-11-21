import 'dotenv/config'
import toolbox from '@nomicfoundation/hardhat-toolbox-mocha-ethers'
import type { HardhatUserConfig } from 'hardhat/config'

const config: HardhatUserConfig = {
  plugins: [toolbox],
  solidity: {
    version: '0.8.28',
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    hardhat: { type: 'edr-simulated' },
    sepolia: {
      type: 'http',
      url: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
      accounts: (() => {
        const rawKey = process.env.DEPLOYER_PRIVATE_KEY?.trim().replace(/^['"]|['"]$/g, '')
        if (!rawKey) return []
        const normalizedKey = rawKey.replace(/^0x/i, '')
        if (!/^[0-9a-fA-F]{64}$/.test(normalizedKey)) return []
        return [`0x${normalizedKey}`]
      })(),
      chainId: 11155111,
    },
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
}

export default config
