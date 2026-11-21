import 'dotenv/config'
import { network } from 'hardhat'
import fs from 'node:fs'
import path from 'node:path'

async function main(): Promise<void> {
  const connection = await network.connect()
  const { ethers } = connection
  const [deployer] = await ethers.getSigners()
  const padmaFactory = await ethers.getContractFactory('PadmaToken')
  const padma = await padmaFactory.deploy(deployer.address, deployer.address)
  await padma.waitForDeployment()
  const padmaAddress = await padma.getAddress()

  const keepsakesFactory = await ethers.getContractFactory('RuposhiKeepsakes')
  const keepsakes = await keepsakesFactory.deploy(deployer.address, deployer.address)
  await keepsakes.waitForDeployment()
  const keepsakesAddress = await keepsakes.getAddress()

  const networkName = process.argv.includes('sepolia') ? 'sepolia' : 'hardhat'
  const targetChainId = networkName === 'sepolia' ? 11155111 : 31337
  const deployment = {
    chainId: targetChainId,
    network: networkName,
    padmaToken: padmaAddress,
    ruposhiKeepsakes: keepsakesAddress,
    deployer: deployer.address,
  }
  const root = process.cwd()
  fs.mkdirSync(path.join(root, 'src', 'deployment'), { recursive: true })
  fs.writeFileSync(path.join(root, 'src', 'deployment', 'sepolia.json'), `${JSON.stringify(deployment, null, 2)}\n`)

  if (networkName === 'sepolia') {
    const envPath = path.join(root, '.env.example')
    let envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : ''
    envText = envText.replace(/^VITE_PADMA_TOKEN_ADDRESS=.*$/m, `VITE_PADMA_TOKEN_ADDRESS=${padmaAddress}`)
    envText = envText.replace(/^VITE_RB_KEEPSAKES_ADDRESS=.*$/m, `VITE_RB_KEEPSAKES_ADDRESS=${keepsakesAddress}`)
    fs.writeFileSync(envPath, envText)
  }
  console.log(JSON.stringify(deployment, null, 2))
  if (networkName === 'sepolia') {
    console.log('\nEtherscan verification:')
    console.log(`npx hardhat verify --network sepolia ${padmaAddress} ${deployer.address} ${deployer.address}`)
    console.log(`npx hardhat verify --network sepolia ${keepsakesAddress} ${deployer.address} ${deployer.address}`)
  } else {
    console.log('\nLocal deployment verified. Addresses are intentionally written for the local simulation.')
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
