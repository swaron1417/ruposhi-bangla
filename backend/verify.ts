import { chapterGoal } from '../src/simulation/village'
import { replayHash, replayVillage, type ReplayLog } from '../src/simulation/replay'
import type { ChapterId } from '../src/simulation/types'
import { Wallet } from 'ethers'

export interface ChapterVoucher {
  player: string
  chapter: number
  nonce: string
  deadline: number
  replayHash: string
}

export interface VerificationResult {
  verified: boolean
  replayHash: string
  chapter: ChapterId
  voucher: ChapterVoucher | null
  reason: string | null
}

export async function signAchievementVoucher(
  voucher: ChapterVoucher,
  privateKey: string,
  contractAddress: string,
  chainId = 11155111,
): Promise<string> {
  const signer = new Wallet(privateKey)
  const domain = {
    name: 'RuposhiBangla Keepsakes',
    version: '1',
    chainId,
    verifyingContract: contractAddress,
  }
  const types = {
    Achievement: [
      { name: 'player', type: 'address' },
      { name: 'chapter', type: 'uint8' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  }
  return signer.signTypedData(domain, types, {
    player: voucher.player,
    chapter: voucher.chapter,
    nonce: BigInt(voucher.nonce),
    deadline: voucher.deadline,
  })
}

export function verifyChapterReplay(log: ReplayLog, player: string, expectedChapter: ChapterId, nonce: bigint): VerificationResult {
  const replay = replayVillage(log)
  const complete = replay.finalState.chapterId === expectedChapter && chapterGoal(replay.finalState).complete
  if (!complete) {
    return { verified: false, replayHash: replay.hash, chapter: expectedChapter, voucher: null, reason: 'Chapter completion rules are not satisfied.' }
  }
  const chapterIndex: Record<ChapterId, number> = {
    village: 1,
    'jute-season': 2,
    'two-banks': 3,
    'monsoon-haat': 4,
    'prosperous-delta': 5,
  }
  return {
    verified: true,
    replayHash: replayHash(replay.finalState),
    chapter: expectedChapter,
    voucher: {
      player,
      chapter: chapterIndex[expectedChapter],
      nonce: nonce.toString(),
      deadline: Math.floor(Date.now() / 1000) + 3600,
      replayHash: replay.hash,
    },
    reason: null,
  }
}
