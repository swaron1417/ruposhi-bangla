export type CropId = 'paddy' | 'jute' | 'mustard' | 'mango'
export type InputId = 'paddySeeds' | 'juteSeeds' | 'mustardSeeds' | 'mangoSaplings' | 'water' | 'compost' | 'tools' | 'pruningTools'
export type ChapterId = 'village' | 'jute-season' | 'two-banks' | 'monsoon-haat' | 'prosperous-delta'
export type StructureType = 'shed' | 'well' | 'ghat'
export type UpgradeId = 'boat-capacity' | 'boat-speed' | 'farmer' | 'irrigation' | 'tools' | 'market' | 'auto-restock'
export type WorkerTask = 'idle' | 'to-field' | 'working' | 'to-ghat' | 'returning'
export type Lang = 'en' | 'bn' | 'zh'

export interface Point {
  x: number
  y: number
}

export type Stock = Record<CropId, number>
export type InputStock = Record<InputId, number>

export interface FarmPlot extends Point {
  id: string
  crop: CropId | null
  growth: number
  waterClock: number
  waterReserve: number
  stage: 'empty' | 'growing' | 'ready'
  compostBoost: boolean
  toolsApplied: boolean
  harvests: number
  waitingFor: InputId | 'ghat' | null
}

export interface Worker extends Point {
  id: string
  task: WorkerTask
  targetPlotId: string | null
  carrying: CropId | null
  carryingAmount: number
  workedTicks: number
}

export interface Boat {
  id: string
  status: 'docked' | 'outbound' | 'returning'
  progress: number
  loadTicks: number
  cargo: Stock
}

export interface Building extends Point {
  id: string
  type: StructureType
}

export interface CoinEvent extends Point {
  id: number
  amount: number
  tick: number
}

export interface VillageUpgrades {
  boatCapacity: number
  boatSpeed: number
  farmers: number
  irrigation: number
  tools: number
  market: number
  autoRestock: number
}

export interface ChapterProgress {
  sold: Stock
  boatDeliveries: number
  ghatOverflowEvents: number
}

export interface VillageState {
  tick: number
  paused: boolean
  speed: 1 | 2
  chapterId: ChapterId
  chapterTicks: number
  day: number
  dayPhase: 'morning' | 'afternoon' | 'dusk' | 'night'
  chapterSold: number
  chapterProgress: ChapterProgress
  credits: number
  inputs: InputStock
  ghatStock: Stock
  plots: FarmPlot[]
  workers: Worker[]
  boats: Boat[]
  buildings: Building[]
  upgrades: VillageUpgrades
  totalSold: number
  totalRevenue: number
  plantedCrops: CropId[]
  unlockedChapters: ChapterId[]
  completedChapters: ChapterId[]
  autoRestockEnabled: boolean
  coinEvents: CoinEvent[]
  message: string
  nextEventId: number
}

export const MAP_COLS = 16
export const MAP_ROWS = 10

export const farmPlotLocations: Point[] = [
  { x: 1, y: 1 }, { x: 3, y: 1 }, { x: 5, y: 1 }, { x: 8, y: 1 }, { x: 10, y: 1 }, { x: 12, y: 1 }, { x: 14, y: 1 },
  { x: 1, y: 2 }, { x: 3, y: 2 }, { x: 5, y: 2 }, { x: 8, y: 2 }, { x: 10, y: 2 }, { x: 12, y: 2 }, { x: 14, y: 2 },
  { x: 1, y: 6 }, { x: 3, y: 6 }, { x: 5, y: 6 }, { x: 8, y: 6 }, { x: 10, y: 6 }, { x: 12, y: 6 }, { x: 14, y: 6 },
  { x: 1, y: 7 }, { x: 3, y: 7 }, { x: 5, y: 7 }, { x: 8, y: 7 }, { x: 10, y: 7 }, { x: 12, y: 7 }, { x: 14, y: 7 },
]

export const riverRoute: Point[] = [
  { x: 3.2, y: 4.25 },
  { x: 4.25, y: 4.1 },
  { x: 5.2, y: 3.85 },
  { x: 6.2, y: 3.55 },
  { x: 7.2, y: 3.3 },
  { x: 8.15, y: 3.0 },
  { x: 9.0, y: 2.6 },
  { x: 9.75, y: 2.15 },
  { x: 10.4, y: 1.65 },
  { x: 11.1, y: 1.15 },
]

export const homeGhat: Point = { x: 3, y: 4 }
export const haatPosition: Point = { x: 11, y: 1 }
