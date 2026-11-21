import { expect } from 'chai'
import { network } from 'hardhat'

const { ethers } = await network.connect()

describe('PadmaToken', function () {
  it('should be deployable as an ERC-20 token', async function () {
    const [deployer] = await ethers.getSigners()
    const factory = await ethers.getContractFactory('PadmaToken')
    const token = await factory.deploy(deployer.address, deployer.address)
    await token.waitForDeployment()
    expect(await token.name()).to.equal('Padma Token')
    expect(await token.symbol()).to.equal('PADMA')
  })
})
