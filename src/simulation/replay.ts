import { applyInputToPlot, buildStructure, plantCrop, purchaseUpgrade } from '../economy/rules'
import type { ChapterId, CropId, InputId, Lang, StructureType, UpgradeId, VillageState } from './types'
import { createInitialVillage, setChapter, tickVillage } from './village'

export type ReplayAction =
  | { type: 'tick'; count: number }
  | { type: 'plant'; plotId: string; cropId: CropId }
  | { type: 'apply'; plotId: string; inputId: Extract<InputId, 'water' | 'compost' | 'tools' | 'pruningTools'> }
  | { type: 'build'; plotId: string; structure: StructureType }
  | { type: 'upgrade'; upgradeId: UpgradeId }
  | { type: 'chapter'; chapterId: ChapterId }

export interface ReplayLog {
  version: 1
  seed: string
  initial: VillageState
  actions: ReplayAction[]
}

export interface ReplayResult {
  finalState: VillageState
  actionCount: number
  hash: string
}

export function canonicalReplayJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((item) => canonicalReplayJson(item)).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalReplayJson(record[key])}`).join(',')}}`
}

export function replayHash(value: unknown): string {
  const text = canonicalReplayJson(value)
  let hashA = 0xcbf29ce484222325n
  let hashB = 0x84222325cbf29ce4n
  const primeA = 0x100000001b3n
  const primeB = 0x9e3779b97f4a7c15n
  for (let index = 0; index < text.length; index += 1) {
    const byte = text.charCodeAt(index) & 0xff
    hashA ^= BigInt(byte)
    hashA = (hashA * primeA) & 0xffffffffffffffffn
    hashB ^= BigInt((byte * 33) & 0xff)
    hashB = (hashB * primeB) & 0xffffffffffffffffn
  }
  return `0x${hashA.toString(16).padStart(16, '0')}${hashB.toString(16).padStart(16, '0')}`
}

export function replayVillage(log: ReplayLog, lang: Lang = 'en'): ReplayResult {
  let state = log.initial
  for (const action of log.actions) {
    if (action.type === 'tick') {
      for (let index = 0; index < action.count && index >= 0; index += 1) state = tickVillage(state)
      continue
    }
    if (action.type === 'plant') {
      const result = plantCrop(state, action.plotId, action.cropId, lang)
      if (result.ok) state = result.state
      continue
    }
    if (action.type === 'apply') {
      const result = applyInputToPlot(state, action.plotId, action.inputId, lang)
      if (result.ok) state = result.state
      continue
    }
    if (action.type === 'build') {
      const result = buildStructure(state, action.plotId, action.structure, lang)
      if (result.ok) state = result.state
      continue
    }
    if (action.type === 'upgrade') {
      const result = purchaseUpgrade(state, action.upgradeId, lang)
      if (result.ok) state = result.state
      continue
    }
    state = setChapter(state, action.chapterId)
  }
  return { finalState: state, actionCount: log.actions.length, hash: replayHash(state) }
}

export function createReplayLog(actions: ReplayAction[], seed = 'ruposhi-village-default'): ReplayLog {
  return { version: 1, seed, initial: createInitialVillage(), actions }
}
