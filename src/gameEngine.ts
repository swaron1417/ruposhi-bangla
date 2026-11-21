import { getChapterById, getTidePhase, type ChapterId, type Lang, type Position, type UpgradeId, upgradeCatalog } from './gameData'

export const STORAGE_KEY = 'ruposhi-bangla-save-v1'
export type WalletStatus = 'disconnected' | 'connected' | 'wrong-network'

export interface SaveData {
  lang: Lang
  credits: number
  unlockedChapters: ChapterId[]
  completedChapters: ChapterId[]
  upgrades: Record<UpgradeId, number>
  chapterHistory: Partial<Record<ChapterId, number>>
  lastMissionResult: string
  walletStatus: WalletStatus
  padmaBalance: number
}

export interface MissionState {
  chapterId: ChapterId
  turn: number
  player: Position
  message: string
  status: 'playing' | 'won' | 'lost'
  history: Position[]
  usedEchoes: number
  tideEchoes: number
  forecastDepth: number
}

export function createDefaultSave(): SaveData {
  return {
    lang: 'en',
    credits: 140,
    unlockedChapters: ['shapla'],
    completedChapters: [],
    upgrades: { echo: 1, spyglass: 0, hull: 0, dak: 0 },
    chapterHistory: {},
    lastMissionResult: 'Shapla ready for the dawn run.',
    walletStatus: 'disconnected',
    padmaBalance: 0,
  }
}

export function loadSave(): SaveData {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return createDefaultSave()
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SaveData>
    const base = createDefaultSave()
    return {
      ...base,
      ...parsed,
      upgrades: { ...base.upgrades, ...(parsed.upgrades ?? {}) },
      unlockedChapters: Array.isArray(parsed.unlockedChapters) ? parsed.unlockedChapters : base.unlockedChapters,
      completedChapters: Array.isArray(parsed.completedChapters) ? parsed.completedChapters : base.completedChapters,
      chapterHistory: parsed.chapterHistory ?? {},
    }
  } catch {
    return createDefaultSave()
  }
}

export function saveGame(data: SaveData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function exportSave(data: SaveData): string {
  return JSON.stringify(data, null, 2)
}

export function importSave(raw: string): SaveData {
  const parsed = JSON.parse(raw) as Partial<SaveData>
  const base = createDefaultSave()
  const imported: SaveData = {
    ...base,
    ...parsed,
    upgrades: { ...base.upgrades, ...(parsed.upgrades ?? {}) },
    unlockedChapters: Array.isArray(parsed.unlockedChapters) ? parsed.unlockedChapters : base.unlockedChapters,
    completedChapters: Array.isArray(parsed.completedChapters) ? parsed.completedChapters : base.completedChapters,
    chapterHistory: parsed.chapterHistory ?? {},
  }
  saveGame(imported)
  return imported
}

export function getUpgradeById(id: UpgradeId) {
  return upgradeCatalog.find((upgrade) => upgrade.id === id)
}

export function getNextUnlockedChapter(save: SaveData): string {
  const last = save.completedChapters.length
  if (last === 0) {
    return 'shapla'
  }
  const ordered = ['shapla', 'chars', 'ferry', 'squall', 'regatta'] as const
  return ordered[Math.min(last, ordered.length - 1)]
}

export function canAfford(save: SaveData, price: number): boolean {
  return save.credits >= price
}

export function buyUpgrade(save: SaveData, upgradeId: UpgradeId): { ok: boolean; message: string; save?: SaveData } {
  const upgrade = getUpgradeById(upgradeId)
  if (!upgrade) {
    return { ok: false, message: 'Unknown upgrade.' }
  }

  if (save.credits < upgrade.cost) {
    return { ok: false, message: 'Not enough Boatman Credits.' }
  }

  const updated = {
    ...save,
    credits: save.credits - upgrade.cost,
    upgrades: {
      ...save.upgrades,
      [upgradeId]: (save.upgrades[upgradeId] ?? 0) + 1,
    },
  }

  return { ok: true, message: `${upgrade.label.en} purchased.`, save: updated }
}

export function calculateMissionReward(chapterId: ChapterId, turnsTaken: number, rewindsUsed: number): number {
  const chapter = getChapterById(chapterId)
  const paceBonus = Math.max(0, 30 - turnsTaken * 2)
  const rewindPenalty = rewindsUsed * 15
  return Math.max(25, chapter.reward + paceBonus - rewindPenalty)
}

export function completeMission(save: SaveData, chapterId: ChapterId, turnsTaken: number, rewindsUsed: number): SaveData {
  const payout = calculateMissionReward(chapterId, turnsTaken, rewindsUsed)
  const nextUnlocked = save.unlockedChapters.includes(chapterId)
    ? save.unlockedChapters
    : [...save.unlockedChapters, chapterId]

  const updated: SaveData = {
    ...save,
    credits: save.credits + payout,
    unlockedChapters: nextUnlocked,
    completedChapters: save.completedChapters.includes(chapterId)
      ? save.completedChapters
      : [...save.completedChapters, chapterId],
    chapterHistory: {
      ...save.chapterHistory,
      [chapterId]: Math.max(save.chapterHistory[chapterId] ?? 0, turnsTaken),
    },
    lastMissionResult: `Delivered successfully. +${payout} taka.`,
  }

  if (!updated.unlockedChapters.includes('chars') && chapterId === 'shapla') {
    updated.unlockedChapters = [...updated.unlockedChapters, 'chars']
  }

  if (!updated.unlockedChapters.includes('ferry') && chapterId === 'chars') {
    updated.unlockedChapters = [...updated.unlockedChapters, 'ferry']
  }

  if (!updated.unlockedChapters.includes('squall') && chapterId === 'ferry') {
    updated.unlockedChapters = [...updated.unlockedChapters, 'squall']
  }

  if (!updated.unlockedChapters.includes('regatta') && chapterId === 'squall') {
    updated.unlockedChapters = [...updated.unlockedChapters, 'regatta']
  }

  return updated
}

export function createMissionState(chapterId: ChapterId): MissionState {
  const chapter = getChapterById(chapterId)
  const tideEchoes = 2 + (loadSave().upgrades.echo ?? 0)
  return {
    chapterId,
    turn: 1,
    player: { ...chapter.start },
    message: `Departed from ${chapter.name.en}. Read the tide clock before you move.`,
    status: 'playing',
    history: [{ ...chapter.start }],
    usedEchoes: 0,
    tideEchoes,
    forecastDepth: 4 + (loadSave().upgrades.spyglass ?? 0) * 2,
  }
}

export function inBounds(chapterId: ChapterId, position: Position): boolean {
  const chapter = getChapterById(chapterId)
  return position.y >= 0 && position.y < chapter.map.length && position.x >= 0 && position.x < chapter.map[0].length
}

export function getCellAt(chapterId: ChapterId, position: Position): string {
  const chapter = getChapterById(chapterId)
  if (!inBounds(chapterId, position)) {
    return '#'
  }
  return chapter.map[position.y][position.x]
}

export function isHolidayGoal(chapterId: ChapterId, position: Position): boolean {
  const chapter = getChapterById(chapterId)
  return position.x === chapter.destination.x && position.y === chapter.destination.y
}

export function getTideSummary(turn: number): string[] {
  return ['Low', 'Rising', 'High', 'Falling'].map((label, index) => `${label} ${index === getTidePhase(turn) ? '⚑' : '·'}`)
}

function isLowTide(turn: number): boolean {
  return getTidePhase(turn) === 0 || getTidePhase(turn) === 1
}

function isBridgeOpen(turn: number): boolean {
  return getTidePhase(turn) === 2 || getTidePhase(turn) === 3
}

function resolveCell(chapterId: ChapterId, position: Position, turn: number): string {
  const cell = getCellAt(chapterId, position)
  if (cell === 'C') {
    return isLowTide(turn) ? 'sandbar' : 'water'
  }
  if (cell === 'B') {
    return isBridgeOpen(turn) ? 'water' : 'bridge'
  }
  if (cell === 'W') {
    return 'whirlpool'
  }
  if (cell === 'F') {
    return 'ferry'
  }
  if (cell === 'G') {
    return 'ghat'
  }
  if (cell === 'M') {
    return 'market'
  }
  if (cell === '#') {
    return 'land'
  }
  return 'water'
}

export function getForecast(turn: number, chapterId: ChapterId, depth = 4): Array<{ turn: number; phase: string; rule: string }> {
  const chapter = getChapterById(chapterId)
  return Array.from({ length: depth }, (_, index) => {
    const futureTurn = turn + index + 1
    const phase = getTideSummary(futureTurn)[getTidePhase(futureTurn)]
    const sandbarRisk = isLowTide(futureTurn) ? 'Sandbars rise at shallow channels.' : 'Canal is clear for passage.'
    const bridgeRule = isBridgeOpen(futureTurn) ? 'Bridge is open for the crossing.' : 'Bridge remains closed.'
    return {
      turn: futureTurn,
      phase,
      rule: chapter.id === 'ferry' ? bridgeRule : sandbarRisk,
    }
  })
}

export function performMove(state: MissionState, dx: number, dy: number): MissionState {
  const chapter = getChapterById(state.chapterId)
  const nextPosition = { x: state.player.x + dx, y: state.player.y + dy }

  if (!inBounds(state.chapterId, nextPosition)) {
    return { ...state, message: 'The riverbank blocks your course.' }
  }

  const nextTurn = state.turn + 1
  const nextCell = resolveCell(state.chapterId, nextPosition, nextTurn)
  const currentCell = resolveCell(state.chapterId, state.player, nextTurn)
  if (nextCell === 'land') {
    return { ...state, message: 'Land ahead. The boat cannot cut through the bank.' }
  }

  if (nextCell === 'sandbar' || nextCell === 'bridge') {
    return { ...state, message: 'The route is shut by a shallow char or closed bridge.' }
  }

  if (nextCell === 'whirlpool') {
    const drift = state.history.length > 0 ? state.history[state.history.length - 1] : state.player
    const rebound = { x: drift.x, y: drift.y }
    return { ...state, player: rebound, message: 'A whirlpool tore the hull. You were pulled back to safety.', status: 'lost' }
  }

  let finalPosition = nextPosition
  if (currentCell === 'water' && chapter.currents.some((point) => point.x === nextPosition.x && point.y === nextPosition.y)) {
    const pushX = nextPosition.x + dx
    const pushY = nextPosition.y + dy
    const pushedPosition = { x: pushX, y: pushY }
    if (inBounds(state.chapterId, pushedPosition) && resolveCell(state.chapterId, pushedPosition, nextTurn) !== 'land') {
      finalPosition = pushedPosition
    }
  }

  const summary = {
    ...state,
    turn: nextTurn,
    player: finalPosition,
    history: [...state.history, finalPosition],
    message: `Turn ${nextTurn}: course set to ${finalPosition.x}, ${finalPosition.y}.`,
  }

  if (isHolidayGoal(state.chapterId, finalPosition)) {
    return { ...summary, status: 'won', message: 'You reached the destination and delivered the cargo.' }
  }

  if (nextTurn >= 12 && state.chapterId === 'shapla') {
    return { ...summary, status: 'lost', message: 'The market closed before the cargo made it ashore.' }
  }

  if (nextTurn >= chapter.turnLimit) {
    return { ...summary, status: 'lost', message: 'The river clock rolled past the deadline.' }
  }

  return summary
}

export function applyTideEcho(state: MissionState): MissionState {
  if (state.tideEchoes <= 0 || state.history.length < 2) {
    return { ...state, message: 'No Tide Echo remains for this mission.' }
  }

  const previous = state.history[state.history.length - 2]
  return {
    ...state,
    player: previous,
    turn: Math.max(1, state.turn - 1),
    history: state.history.slice(0, -1),
    tideEchoes: state.tideEchoes - 1,
    usedEchoes: state.usedEchoes + 1,
    message: 'Tide Echo replayed the last move. The river remembers your route.',
  }
}

export function getWalletNetworkMessage(status: WalletStatus): string {
  if (status === 'connected') return 'Wallet connected to Sepolia.'
  if (status === 'wrong-network') return 'Wrong network: switch to Sepolia.'
  return 'Wallet disconnected; offline play remains available.'
}

export function clampEconomy(save: SaveData): SaveData {
  const normalized = { ...save, credits: Math.max(0, save.credits) }
  return normalized
}
