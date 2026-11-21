import { cropCatalog, inputCatalog } from '../economy/crops'
import { saleValue } from '../economy/rules'
import type { Building, Boat, ChapterId, ChapterProgress, CoinEvent, CropId, FarmPlot, Point, Stock, VillageState, Worker } from './types'
import { farmPlotLocations, haatPosition, homeGhat, MAP_COLS, MAP_ROWS, riverRoute } from './types'

const emptyStock = (): Stock => ({ paddy: 0, jute: 0, mustard: 0, mango: 0 })

const startingBuildings: Building[] = [
  { id: 'supply-shed', type: 'shed', x: 0, y: 1 },
  { id: 'river-well', type: 'well', x: 0, y: 6 },
  { id: 'main-ghat', type: 'ghat', x: homeGhat.x, y: homeGhat.y },
]

export function createInitialVillage(): VillageState {
  const plots: FarmPlot[] = farmPlotLocations.map((point, index) => ({
    id: `plot-${index + 1}`,
    ...point,
    crop: null,
    growth: 0,
    waterClock: 0,
    waterReserve: 0,
    stage: 'empty',
    compostBoost: false,
    toolsApplied: false,
    harvests: 0,
    waitingFor: null,
  }))
  const workers: Worker[] = [
    { id: 'farmer-1', x: 0.75, y: 1.25, task: 'idle', targetPlotId: null, carrying: null, carryingAmount: 0, workedTicks: 0 },
    { id: 'farmer-2', x: 0.9, y: 1.45, task: 'idle', targetPlotId: null, carrying: null, carryingAmount: 0, workedTicks: 0 },
  ]
  const boat: Boat = { id: 'boat-1', status: 'docked', progress: 0, loadTicks: 0, cargo: emptyStock() }
  return {
    tick: 0,
    paused: false,
    speed: 1,
    chapterId: 'village',
    chapterTicks: 0,
    day: 1,
    dayPhase: 'morning',
    chapterSold: 0,
    chapterProgress: { sold: emptyStock(), boatDeliveries: 0, ghatOverflowEvents: 0 },
    credits: 320,
    inputs: {
      paddySeeds: 5,
      juteSeeds: 2,
      mustardSeeds: 2,
      mangoSaplings: 1,
      water: 30,
      compost: 8,
      tools: 8,
      pruningTools: 2,
    },
    ghatStock: emptyStock(),
    plots,
    workers,
    boats: [boat],
    buildings: startingBuildings,
    upgrades: { boatCapacity: 0, boatSpeed: 0, farmers: 0, irrigation: 0, tools: 0, market: 1, autoRestock: 0 },
    totalSold: 0,
    totalRevenue: 0,
    plantedCrops: [],
    unlockedChapters: ['village'],
    completedChapters: [],
    autoRestockEnabled: false,
    coinEvents: [],
    message: 'Plant a paddy plot, then watch the farmers and boat carry the harvest to the corner haat.',
    nextEventId: 1,
  }
}

export const isFarmerLandPoint = (x: number, y: number): boolean => {
  const northBank = y < 4.1
  const southBank = y > 5.0
  const bridge = y >= 4.1 && y <= 5.0 && (Math.abs(x - 3.5) < 0.9 || Math.abs(x - 8.5) < 0.9 || Math.abs(x - 13.5) < 0.9)
  return northBank || southBank || bridge
}

function moveToward(worker: Worker, target: Point, amount: number): Worker {
  const dx = target.x - worker.x
  const dy = target.y - worker.y
  const distance = Math.hypot(dx, dy)
  if (distance <= amount) {
    return isFarmerLandPoint(target.x, target.y) ? { ...worker, x: target.x, y: target.y } : worker
  }
  const nextX = worker.x + (dx / distance) * amount
  const nextY = worker.y + (dy / distance) * amount
  if (!isFarmerLandPoint(nextX, nextY)) {
    const landTargets = [
      { x: nextX, y: worker.y },
      { x: worker.x, y: nextY },
    ]
    const safe = landTargets.find((point) => isFarmerLandPoint(point.x, point.y))
    return safe ? { ...worker, x: safe.x, y: safe.y } : worker
  }
  return { ...worker, x: nextX, y: nextY }
}

function stockTotal(stock: Stock): number {
  return stock.paddy + stock.jute + stock.mustard + stock.mango
}

function nearestGhat(buildings: Building[], point: Point): Point {
  const ghats = buildings.filter((building) => building.type === 'ghat')
  if (!ghats.length) return homeGhat
  return ghats.reduce((nearest, item) =>
    Math.hypot(item.x - point.x, item.y - point.y) < Math.hypot(nearest.x - point.x, nearest.y - point.y) ? item : nearest,
  )
}

function addCoinEvent(events: CoinEvent[], amount: number, tick: number, eventId: number): CoinEvent[] {
  return [...events, { id: eventId, x: haatPosition.x, y: haatPosition.y, amount, tick }]
}

function autoRestock(state: VillageState): VillageState {
  if (!state.autoRestockEnabled || state.upgrades.autoRestock < 1) return state
  let credits = state.credits
  const inputs = { ...state.inputs }
  const restockList = ([
    ['water', 3],
    ['paddySeeds', 1],
  ] as const).filter(([input, threshold]) => inputs[input] < threshold)
  for (const [inputId] of restockList) {
    const item = inputCatalog[inputId]
    if (credits < item.price) continue
    credits -= item.price
    inputs[inputId] += item.pack
  }
  return { ...state, credits, inputs }
}

export interface ChapterChecklistItem {
  id: string
  label: Record<'en' | 'bn' | 'zh', string>
  current: number
  target: number
  complete: boolean
}

const checklistItem = (
  id: string,
  label: ChapterChecklistItem['label'],
  current: number,
  target: number,
): ChapterChecklistItem => ({ id, label, current, target, complete: current >= target })

export function chapterChecklist(state: VillageState): ChapterChecklistItem[] {
  const ghatCount = state.buildings.filter((building) => building.type === 'ghat').length
  const isActiveField = (plot: FarmPlot): boolean => plot.crop !== null
    && plot.stage !== 'empty'
    && plot.waitingFor !== 'water'
    && (state.inputs.water > 0 || plot.waterReserve > 0)
    && state.workers.some((worker) => worker.targetPlotId === plot.id && worker.task !== 'idle')
  const plantedPaddyFields = state.plots.filter((plot) => plot.crop === 'paddy' && plot.stage !== 'empty').length
  const oppositeBankFields = state.plots.filter((plot) => plot.x >= 8 && isActiveField(plot)).length
  const mixedCropSales = state.chapterProgress.sold.paddy + state.chapterProgress.sold.jute
  switch (state.chapterId) {
    case 'village':
      return [
        checklistItem('paddy-sales', { en: 'Sell 5 Paddy bundles at the haat', bn: 'হাটে ৫ আঁটি ধান বিক্রি করুন', zh: '在集市出售 5 捆水稻' }, state.chapterProgress.sold.paddy, 5),
        checklistItem('credits', { en: 'Reach 250 Boatman Credits', bn: '২৫০ কড়ি জমা রাখুন', zh: '积累 250 点船夫积分' }, state.credits, 250),
        checklistItem('active-paddy', { en: 'Plant 2 Paddy fields', bn: '২টি ধানের জমিতে ফসল লাগান', zh: '种植 2 片水稻田' }, plantedPaddyFields, 2),
      ]
    case 'jute-season':
      return [
        checklistItem('jute-sales', { en: 'Sell 6 Jute bundles (planted with compost and tools)', bn: 'সার ও যন্ত্রে ফলানো ৬ আঁটি পাট বিক্রি করুন', zh: '出售 6 捆施肥并使用农具种植的黄麻' }, state.chapterProgress.sold.jute, 6),
        checklistItem('boat-capacity', { en: 'Upgrade Boat Capacity to Level 2', bn: 'নৌকার ধারণক্ষমতা ২ স্তরে তুলুন', zh: '将货船容量升级到 2级' }, state.upgrades.boatCapacity, 2),
        checklistItem('credits', { en: 'Reach 400 Credits', bn: '৪০০ কড়ি জমা করুন', zh: '积累 400 点积分' }, state.credits, 400),
      ]
    case 'two-banks':
      return [
        checklistItem('extra-ghat', { en: 'Build another River Ghat', bn: 'আরেকটি নদীর ঘাট তৈরি করুন', zh: '再建一个河码头' }, ghatCount, 2),
        checklistItem('opposite-fields', { en: 'Keep 2 active fields cultivated on the far bank', bn: 'ওপারের তীরে ২টি সক্রিয় ক্ষেত চাষ করুন', zh: '在对岸耕作 2 片活跃田地' }, oppositeBankFields, 2),
        checklistItem('mixed-sales', { en: 'Deliver 10 Paddy + Jute bundles', bn: 'ধান ও পাট মিলিয়ে ১০ আঁটি হাটে দিন', zh: '运送 10 捆水稻和黄麻' }, mixedCropSales, 10),
        checklistItem('farmers', { en: 'Hire at least 2 more Farmers', bn: 'অন্তত আরও ২ জন কৃষক নিয়োগ করুন', zh: '至少再雇用 2 名农民' }, state.upgrades.farmers, 2),
      ]
    case 'monsoon-haat':
      return [
        checklistItem('deliveries', { en: 'Complete 15 boat deliveries before Day 450', bn: '৪৫০ দিনে ১৫টি নৌকা-যাত্রা সম্পন্ন করুন', zh: '在第 450 天前完成 15 次货船交付' }, state.chapterTicks <= 450 ? state.chapterProgress.boatDeliveries : 0, 15),
        checklistItem('boat-speed', { en: 'Upgrade Boat Speed to Level 2', bn: 'নৌকার গতি ২ স্তরে তুলুন', zh: '将货船速度升级到 2级' }, state.upgrades.boatSpeed, 2),
        checklistItem('no-overflow', { en: 'Keep Ghat overflow at zero', bn: 'ঘাটে উপচে পড়া পণ্য শূন্য রাখুন', zh: '保持码头库存不溢出' }, state.chapterProgress.ghatOverflowEvents === 0 ? 1 : 0, 1),
      ]
    case 'prosperous-delta':
      return [
        ...(['paddy', 'jute', 'mustard', 'mango'] as CropId[]).map((cropId) => checklistItem(
          `sell-${cropId}`,
          { en: `Sell ${cropCatalog[cropId].name.en} at the haat`, bn: `হাটে ${cropCatalog[cropId].name.bn} বিক্রি করুন`, zh: `在集市出售${cropCatalog[cropId].name.zh}` },
          state.chapterProgress.sold[cropId] > 0 ? 1 : 0,
          1,
        )),
        checklistItem('market', { en: 'Upgrade the Corner Haat to Level 3', bn: 'কোণার হাট ৩ স্তরে উন্নীত করুন', zh: '将角落集市升级到 3级' }, state.upgrades.market, 3),
        checklistItem('credits', { en: 'Reach 2,500 Credits', bn: '২,৫০০ কড়ি জমা করুন', zh: '积累 2,500 点积分' }, state.credits, 2500),
      ]
  }
}

export function chapterGoal(state: VillageState): { current: number; target: number; complete: boolean; deadlineMissed: boolean } {
  const checklist = chapterChecklist(state)
  return {
    current: checklist.filter((item) => item.complete).length,
    target: checklist.length,
    complete: checklist.every((item) => item.complete),
    deadlineMissed: state.chapterId === 'monsoon-haat' && state.chapterTicks > 450 && state.chapterProgress.boatDeliveries < 15,
  }
}

const chapterSequence: ChapterId[] = ['village', 'jute-season', 'two-banks', 'monsoon-haat', 'prosperous-delta']

export function refreshChapterGates(state: VillageState): VillageState {
  const complete = chapterGoal(state).complete
  if (!complete) return state
  const nextId = chapterSequence[Math.min(chapterSequence.indexOf(state.chapterId) + 1, chapterSequence.length - 1)]
  return {
    ...state,
    completedChapters: state.completedChapters.includes(state.chapterId)
      ? state.completedChapters
      : [...state.completedChapters, state.chapterId],
    unlockedChapters: state.unlockedChapters.includes(nextId) || nextId === state.chapterId
      ? state.unlockedChapters
      : [...state.unlockedChapters, nextId],
  }
}

function assignWorkers(state: VillageState): Worker[] {
  const assigned = new Set(state.workers.flatMap((worker) => worker.targetPlotId ? [worker.targetPlotId] : []))
  const availablePlots = state.plots.filter((plot) => plot.crop && plot.stage !== 'empty' && !assigned.has(plot.id))
  return state.workers.map((worker) => {
    if (worker.task !== 'idle' || !availablePlots.length) return worker
    const plot = availablePlots.shift()
    if (!plot) return worker
    assigned.add(plot.id)
    return { ...worker, targetPlotId: plot.id, task: 'to-field' }
  })
}

function advanceWorkers(state: VillageState): VillageState {
  const ghatCapacity = 12 + state.upgrades.market * 6
  let stock = { ...state.ghatStock }
  let ghatOverflowEvents = state.chapterProgress.ghatOverflowEvents
  let inputs = { ...state.inputs }
  let plots = state.plots.map((plot) => ({ ...plot }))
  let workers = assignWorkers(state)
  let message = state.message

  workers = workers.map((worker) => {
    const plot = plots.find((item) => item.id === worker.targetPlotId)
    if (worker.task === 'idle' || !plot || !worker.targetPlotId) return worker

    if (worker.task === 'to-field' || worker.task === 'returning') {
      const approaching = moveToward(worker, { x: plot.x + 0.5, y: plot.y + 0.5 }, 0.34 + state.upgrades.tools * 0.04)
      if (Math.hypot(approaching.x - plot.x - 0.5, approaching.y - plot.y - 0.5) < 0.02) {
        return { ...approaching, task: 'working', workedTicks: 0 }
      }
      return approaching
    }

    if (worker.task === 'to-ghat') {
      const ghat = nearestGhat(state.buildings, worker)
      const approaching = moveToward(worker, { x: ghat.x + 0.5, y: ghat.y + 0.5 }, 0.42 + state.upgrades.tools * 0.04)
      if (Math.hypot(approaching.x - ghat.x - 0.5, approaching.y - ghat.y - 0.5) < 0.02) {
        if (worker.carrying) stock[worker.carrying] += worker.carryingAmount
        message = 'A farmer delivered bundles to the river ghat.'
        return {
          ...approaching,
          carrying: null,
          carryingAmount: 0,
          task: plot.crop === 'mango' ? 'returning' : 'idle',
          targetPlotId: plot.crop === 'mango' ? plot.id : null,
        }
      }
      return approaching
    }

    if (plot.stage === 'ready') {
      const crop = plot.crop!
      const definition = cropCatalog[crop]
      const amount = Math.round(definition.yield * (plot.compostBoost ? 1.25 : 1))
      if (stockTotal(stock) + amount > ghatCapacity) {
        plot.waitingFor = 'ghat'
        ghatOverflowEvents += 1
        return { ...worker, workedTicks: worker.workedTicks + 1 }
      }
      plot.harvests += 1
      if (definition.regrowTicks > 0) {
        plot.stage = 'growing'
        plot.growth = definition.growthTicks - definition.regrowTicks
        plot.waterClock = 0
        plot.waterReserve = 0
      } else {
        plot.crop = null
        plot.stage = 'empty'
        plot.growth = 0
        plot.compostBoost = false
        plot.toolsApplied = false
        plot.waterReserve = 0
      }
      plot.waitingFor = null
      message = `${definition.name.en} harvest carried toward the ghat.`
      return { ...worker, task: 'to-ghat', carrying: crop, carryingAmount: amount, workedTicks: worker.workedTicks + 1 }
    }

    if (!plot.crop) return { ...worker, task: 'idle', targetPlotId: null, carrying: null, carryingAmount: 0 }
    const definition = cropCatalog[plot.crop]
    const monsoonWaterBonus = state.chapterId === 'monsoon-haat' && (plot.crop === 'paddy' || plot.crop === 'jute') ? 2 : 0
    const waterInterval = definition.waterInterval + state.upgrades.irrigation + monsoonWaterBonus
    if (plot.waterClock === 0) {
      if (plot.waterReserve <= 0 && inputs.water <= 0) {
        plot.waitingFor = 'water'
        return { ...worker, workedTicks: worker.workedTicks + 1 }
      }
      if (plot.waterReserve > 0) plot.waterReserve -= 1
      else inputs.water -= 1
    }
    plot.waitingFor = null
    plot.growth += 1 + (plot.compostBoost ? 1 : 0) + (plot.toolsApplied ? 1 : 0)
    plot.waterClock = (plot.waterClock + 1) % waterInterval
    plot.stage = plot.growth >= definition.growthTicks ? 'ready' : 'growing'
    return { ...worker, workedTicks: worker.workedTicks + 1 }
  })

  const unassignedReady = plots.some((plot) => plot.stage === 'ready' && !workers.some((worker) => worker.targetPlotId === plot.id))
  if (unassignedReady) workers = assignWorkers({ ...state, workers, plots })
  return {
    ...state,
    inputs,
    ghatStock: stock,
    plots,
    workers,
    message,
    chapterProgress: { ...state.chapterProgress, ghatOverflowEvents },
  }
}

function advanceBoats(state: VillageState): VillageState {
  let credits = state.credits
  let totalSold = state.totalSold
  let chapterSold = state.chapterSold
  const chapterProgress: ChapterProgress = { ...state.chapterProgress, sold: { ...state.chapterProgress.sold } }
  let totalRevenue = state.totalRevenue
  let stock = { ...state.ghatStock }
  let coinEvents = state.coinEvents
  let nextEventId = state.nextEventId
  const capacity = 3 + state.upgrades.boatCapacity * 2
  const boat = state.boats[0]
  if (!boat) return state
  const nextBoat: Boat = { ...boat, cargo: { ...boat.cargo } }
  const boatPace = 0.56 + state.upgrades.boatSpeed * 0.45
  const cargoTotal = stockTotal(nextBoat.cargo)
  const loadAvailable = stockTotal(stock) > 0

  if (nextBoat.status === 'docked') {
    if (loadAvailable && cargoTotal < capacity) {
      const selectedCrop = (['paddy', 'jute', 'mustard', 'mango'] as CropId[]).find((crop) => stock[crop] > 0)
      if (selectedCrop) {
        stock[selectedCrop] -= 1
        nextBoat.cargo[selectedCrop] += 1
        nextBoat.loadTicks += 1
      }
      if (stockTotal(stock) === 0 || stockTotal(nextBoat.cargo) >= capacity || nextBoat.loadTicks >= 2) {
        nextBoat.status = 'outbound'
        nextBoat.progress = 0
        nextBoat.loadTicks = 0
      }
    }
  } else if (nextBoat.status === 'outbound') {
    nextBoat.progress = Math.min(riverRoute.length - 1, nextBoat.progress + boatPace)
    if (nextBoat.progress >= riverRoute.length - 1) {
      let totalIncome = 0
      if (stockTotal(nextBoat.cargo) > 0) chapterProgress.boatDeliveries += 1
      for (const cropId of Object.keys(nextBoat.cargo) as CropId[]) {
        const quantity = nextBoat.cargo[cropId]
        if (!quantity) continue
        totalIncome += saleValue(cropId, quantity, state.upgrades.market, capacity)
        nextBoat.cargo[cropId] = 0
        totalSold += quantity
        chapterSold += quantity
        chapterProgress.sold[cropId] += quantity
      }
      credits += totalIncome
      totalRevenue += totalIncome
      coinEvents = addCoinEvent(coinEvents, totalIncome, state.tick, nextEventId++)
      nextBoat.status = 'returning'
    }
  } else {
    nextBoat.progress = Math.max(0, nextBoat.progress - boatPace)
    if (nextBoat.progress <= 0) nextBoat.status = 'docked'
  }

  return {
    ...state,
    credits,
    totalSold,
    chapterSold,
    chapterProgress,
    totalRevenue,
    ghatStock: stock,
    boats: [nextBoat, ...state.boats.slice(1)],
    coinEvents,
    nextEventId,
  }
}

export function tickVillage(current: VillageState): VillageState {
  if (current.paused) return current
  const tick = current.tick + 1
  const chapterTicks = current.chapterTicks + 1
  const dayCycle = ['morning', 'afternoon', 'dusk', 'night'] as const
  const dayPhaseIndex = tick % dayCycle.length
  const day = 1 + Math.floor(tick / dayCycle.length)
  const expiredEvents = current.coinEvents.filter((event) => tick - event.tick <= 7)
  let next = autoRestock({ ...current, tick, chapterTicks, day, dayPhase: dayCycle[dayPhaseIndex], coinEvents: expiredEvents })
  next = advanceWorkers(next)
  next = advanceBoats(next)
  return refreshChapterGates(next)
}

export function setChapter(state: VillageState, chapterId: ChapterId): VillageState {
  const currentIndex = chapterSequence.indexOf(state.chapterId)
  const nextIndex = chapterSequence.indexOf(chapterId)
  if (nextIndex < 0 || nextIndex > currentIndex + 1) return state
  if (nextIndex === currentIndex + 1 && !chapterGoal(state).complete) return state
  if (nextIndex < currentIndex && !state.completedChapters.includes(chapterId)) return state
  if (chapterId === state.chapterId) {
    return {
      ...state,
      chapterTicks: 0,
      day: 1,
      dayPhase: 'morning',
      chapterSold: 0,
      chapterProgress: { sold: emptyStock(), boatDeliveries: 0, ghatOverflowEvents: 0 },
      paused: false,
    }
  }
  const completedChapters = state.completedChapters.includes(state.chapterId)
    ? state.completedChapters
    : chapterGoal(state).complete ? [...state.completedChapters, state.chapterId] : state.completedChapters
  return {
    ...state,
    chapterId,
    chapterTicks: 0,
    day: 1,
    dayPhase: 'morning',
    chapterSold: 0,
    chapterProgress: { sold: emptyStock(), boatDeliveries: 0, ghatOverflowEvents: 0 },
    completedChapters,
    unlockedChapters: state.unlockedChapters.includes(chapterId) ? state.unlockedChapters : [...state.unlockedChapters, chapterId],
    paused: false,
  }
}

export function addStructure(state: VillageState, building: Building): VillageState {
  return { ...state, buildings: [...state.buildings, building] }
}

export function getBoatPosition(boat: Boat): Point {
  const index = Math.floor(boat.progress)
  const progress = boat.progress - index
  const current = riverRoute[Math.min(index, riverRoute.length - 1)]
  const next = riverRoute[Math.min(index + 1, riverRoute.length - 1)]
  if (boat.status === 'docked') return { x: homeGhat.x + 0.45, y: homeGhat.y + 0.45 }
  if (!current || !next) return { ...haatPosition }
  return { x: current.x + (next.x - current.x) * progress, y: current.y + (next.y - current.y) * progress }
}

export function mapBounds(): { cols: number; rows: number } {
  return { cols: MAP_COLS, rows: MAP_ROWS }
}
