import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const padmaSource=fs.readFileSync(path.resolve(process.cwd(),'contracts/PadmaToken.sol'),'utf8')
const badgeSource=fs.readFileSync(path.resolve(process.cwd(),'contracts/RuposhiKeepsakes.sol'),'utf8')

describe('Web3 contract source verification',()=>{
  it.each(['FAUCET_AMOUNT','FAUCET_COOLDOWN','claimFaucet','mintVerifiedReward','REWARD_TYPEHASH','rewardNonces','setRewardSigner','FaucetClaimed','RewardMinted','EIP712'])('Padma contains %s',(token)=>expect(padmaSource).toContain(token))
  it.each(['ERC721','ERC721URIStorage','Ownable','EIP712','mintFreeBadge','mintVerifiedBadge','ACHIEVEMENT_TYPEHASH','badgeOwned','achievementNonces','ChapterBadgeMinted','setAchievementSigner','supportsInterface'])('Keepsakes contains %s',(token)=>expect(badgeSource).toContain(token))
})
