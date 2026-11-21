import type { VillageState } from '../simulation/types'

export const VILLAGE_SAVE_KEY = 'ruposhi-village-save-v1'
const LEGACY_SAVE_KEY = 'ruposhi-bangla-save-v1'

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasNumbers(value: unknown, keys: string[]): boolean {
  return isRecord(value) && keys.every((key) => typeof value[key] === 'number' && Number.isFinite(value[key]) && value[key] >= 0)
}

function defaultChapterProgress(): VillageState['chapterProgress'] {
  return { sold: { paddy: 0, jute: 0, mustard: 0, mango: 0 }, boatDeliveries: 0, ghatOverflowEvents: 0 }
}

function isVillageState(value: unknown): value is VillageState {
  if (!isRecord(value)) return false
  const state = value as Partial<VillageState>
  const validCrops = ['paddy', 'jute', 'mustard', 'mango']
  const validInputs = ['paddySeeds', 'juteSeeds', 'mustardSeeds', 'mangoSaplings', 'water', 'compost', 'tools', 'pruningTools']
  const validChapters = ['village', 'jute-season', 'two-banks', 'monsoon-haat', 'prosperous-delta']
  const validCropsOrNull = (crop: unknown): boolean => crop === null || (typeof crop === 'string' && validCrops.includes(crop))
  const validPlots = Array.isArray(state.plots) && state.plots.every((plot) => isRecord(plot)
    && typeof plot.id === 'string'
    && typeof plot.x === 'number' && Number.isFinite(plot.x)
    && typeof plot.y === 'number' && Number.isFinite(plot.y)
    && validCropsOrNull(plot.crop)
    && hasNumbers(plot, ['growth', 'waterClock', 'harvests'])
    && (plot.waterReserve === undefined || hasNumbers(plot, ['waterReserve']))
    && (plot.toolsApplied === undefined || typeof plot.toolsApplied === 'boolean')
    && (plot.compostBoost === undefined || typeof plot.compostBoost === 'boolean')
    && ['empty', 'growing', 'ready'].includes(String(plot.stage)))
  const validWorkers = Array.isArray(state.workers) && state.workers.every((worker) => isRecord(worker)
    && typeof worker.id === 'string'
    && typeof worker.x === 'number' && Number.isFinite(worker.x)
    && typeof worker.y === 'number' && Number.isFinite(worker.y)
    && ['idle', 'to-field', 'working', 'to-ghat', 'returning'].includes(String(worker.task))
    && (worker.targetPlotId === null || typeof worker.targetPlotId === 'string')
    && validCropsOrNull(worker.carrying)
    && hasNumbers(worker, ['workedTicks', 'carryingAmount']))
  const validBoats = Array.isArray(state.boats) && state.boats.every((boat) => isRecord(boat)
    && typeof boat.id === 'string'
    && ['docked', 'outbound', 'returning'].includes(String(boat.status))
    && hasNumbers(boat, ['progress', 'loadTicks'])
    && hasNumbers(boat.cargo, validCrops))
  const validBuildings = Array.isArray(state.buildings) && state.buildings.every((building) => isRecord(building)
    && typeof building.id === 'string'
    && ['shed', 'well', 'ghat'].includes(String(building.type))
    && typeof building.x === 'number' && Number.isFinite(building.x)
    && typeof building.y === 'number' && Number.isFinite(building.y))
  const validCoinEvents = Array.isArray(state.coinEvents) && state.coinEvents.every((event) => isRecord(event)
    && hasNumbers(event, ['id', 'amount', 'tick'])
    && typeof event.x === 'number' && Number.isFinite(event.x)
    && typeof event.y === 'number' && Number.isFinite(event.y))
  const validChapterProgress = state.chapterProgress === undefined
    || (isRecord(state.chapterProgress)
      && hasNumbers(state.chapterProgress.sold, validCrops)
      && hasNumbers(state.chapterProgress, ['boatDeliveries', 'ghatOverflowEvents']))

  return hasNumbers(state, ['tick', 'chapterTicks', 'chapterSold', 'credits', 'totalSold', 'totalRevenue', 'nextEventId'])
    && (state.day === undefined || (typeof state.day === 'number' && Number.isFinite(state.day) && state.day >= 1))
    && (state.dayPhase === undefined || ['morning', 'afternoon', 'dusk', 'night'].includes(String(state.dayPhase)))
    && (state.speed === 1 || state.speed === 2)
    && typeof state.paused === 'boolean'
    && typeof state.chapterId === 'string' && validChapters.includes(state.chapterId)
    && hasNumbers(state.inputs, validInputs)
    && hasNumbers(state.ghatStock, validCrops)
    && hasNumbers(state.upgrades, ['boatCapacity', 'boatSpeed', 'farmers', 'irrigation', 'tools', 'market', 'autoRestock'])
    && validPlots && validWorkers && validBoats && validBuildings
    && validChapterProgress
    && Array.isArray(state.unlockedChapters) && state.unlockedChapters.every((chapter) => validChapters.includes(String(chapter)))
    && Array.isArray(state.completedChapters) && state.completedChapters.every((chapter) => validChapters.includes(String(chapter)))
    && Array.isArray(state.plantedCrops) && state.plantedCrops.every((crop) => validCrops.includes(String(crop)))
    && state.unlockedChapters.includes(state.chapterId)
    && validCoinEvents
    && typeof state.autoRestockEnabled === 'boolean'
    && typeof state.message === 'string'
}

function normalizeVillage(state: VillageState): VillageState {
  return {
    ...state,
    day: state.day ?? 1,
    dayPhase: state.dayPhase ?? 'morning',
    chapterProgress: state.chapterProgress ?? defaultChapterProgress(),
    plots: state.plots.map((plot) => ({
      ...plot,
      waterReserve: plot.waterReserve ?? 0,
      compostBoost: plot.compostBoost ?? false,
      toolsApplied: plot.toolsApplied ?? false,
    })),
  }
}

export function loadVillage(fallback: VillageState): { state: VillageState; error: string | null } {
  try {
    const raw = localStorage.getItem(VILLAGE_SAVE_KEY)
    if (raw) {
      const saved: unknown = JSON.parse(raw)
      if (isVillageState(saved)) {
        return {
          state: normalizeVillage(saved),
          error: null,
        }
      }
      return { state: fallback, error: 'The saved village has an invalid format. A fresh village was started.' }
    }

    const legacyRaw = localStorage.getItem(LEGACY_SAVE_KEY)
    if (legacyRaw) {
      const legacy: unknown = JSON.parse(legacyRaw)
      if (legacy && typeof legacy === 'object' && 'credits' in legacy) {
        const credits = legacy.credits
        if (typeof credits === 'number' && Number.isFinite(credits)) {
          return { state: { ...fallback, credits: Math.max(fallback.credits, credits) }, error: null }
        }
      }
    }
    return { state: fallback, error: null }
  } catch (error) {
    return {
      state: fallback,
      error: `Could not read the village save: ${error instanceof Error ? error.message : 'unknown storage error'}`,
    }
  }
}

export function saveVillage(state: VillageState): void {
  localStorage.setItem(VILLAGE_SAVE_KEY, JSON.stringify(state))
}

export function exportVillage(state: VillageState): string {
  return JSON.stringify(state, null, 2)
}

export function importVillage(raw: string): VillageState {
  const parsed: unknown = JSON.parse(raw)
  if (!isVillageState(parsed)) throw new Error('Invalid Ruposhi Bangla village backup.')
  const normalized = normalizeVillage(parsed)
  saveVillage(normalized)
  return normalized
}
