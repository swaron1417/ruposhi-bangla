import { beforeEach, describe, expect, it } from 'vitest'
import { applyInputToPlot, buildStructure, buyInput, harvestPlot, plantCrop, purchaseUpgrade } from './economy/rules'
import { cropCatalog } from './economy/crops'
import { chapterGoal, chapterChecklist, createInitialVillage, refreshChapterGates, setChapter, tickVillage } from './simulation/village'
import type { ChapterId, VillageState } from './simulation/types'
import { farmPlotLocations, MAP_COLS, MAP_ROWS } from './simulation/types'
import { plotAtCoordinates } from './render/drawVillage'
import { hasCompleteTranslations, labels } from './i18n'
import { exportVillage, importVillage, loadVillage, saveVillage, VILLAGE_SAVE_KEY } from './storage/save'

function runUntil(state: ReturnType<typeof createInitialVillage>, predicate: (current: typeof state) => boolean, maxTicks = 120): typeof state {
  let current = state
  for (let tick = 0; tick < maxTicks && !predicate(current); tick += 1) current = tickVillage(current)
  return current
}

describe('village farming simulation', () => {
  beforeEach(() => localStorage.clear())

  it('consumes crop-specific seeds, compost, and tools when a field is planted', () => {
    const village = createInitialVillage()
    const planted = plantCrop(village, 'plot-1', 'paddy')

    expect(planted.ok).toBe(true)
    expect(planted.state.inputs.paddySeeds).toBe(village.inputs.paddySeeds - 1)
    expect(planted.state.inputs.tools).toBe(village.inputs.tools - 1)
    expect(planted.state.plots.find((plot) => plot.id === 'plot-1')?.crop).toBe('paddy')

    const jute = plantCrop(planted.state, 'plot-2', 'jute')
    expect(jute.ok).toBe(false)
    expect(jute.message).toContain('later village chapter')
  })

  it('consumes compost and tools for Jute, accelerating field growth', () => {
    const village = createInitialVillage()
    const unlocked = {
      ...village,
      chapterId: 'jute-season' as const,
      unlockedChapters: [...village.unlockedChapters, 'jute-season' as const],
      completedChapters: [...village.completedChapters, 'village' as const],
    }
    const planted = plantCrop(unlocked, 'plot-2', 'jute')
    expect(planted.ok).toBe(true)
    expect(planted.state.inputs.compost).toBe(village.inputs.compost - 1)
    expect(planted.state.inputs.tools).toBe(village.inputs.tools - 1)

    const working = {
      ...planted.state,
      workers: planted.state.workers.map((worker, index) => index === 0
        ? { ...worker, x: 3.5, y: 1.5, task: 'working' as const, targetPlotId: 'plot-2' }
        : worker),
    }
    const advanced = tickVillage(working)
    expect(advanced.plots.find((plot) => plot.id === 'plot-2')?.growth).toBe(3)
  })

  it.each(['compost', 'tools'] as const)('does not allow Jute to be planted without required %s', (inputId) => {
    const village = createInitialVillage()
    const unlocked = {
      ...village,
      chapterId: 'jute-season' as const,
      unlockedChapters: [...village.unlockedChapters, 'jute-season' as const],
      completedChapters: [...village.completedChapters, 'village' as const],
      inputs: { ...village.inputs, [inputId]: 0 },
    }

    expect(plantCrop(unlocked, 'plot-2', 'jute').ok).toBe(false)
  })

  it('applies water, compost, and tools directly to a planted field using stock or a one-use purchase', () => {
    let village = plantCrop(createInitialVillage(), 'plot-1', 'paddy').state
    const water = applyInputToPlot(village, 'plot-1', 'water')
    expect(water.ok).toBe(true)
    expect(water.state.plots[0].waterReserve).toBe(4)
    expect(water.state.inputs.water).toBe(village.inputs.water - 1)

    const compost = applyInputToPlot(water.state, 'plot-1', 'compost')
    expect(compost.ok).toBe(true)
    expect(compost.state.plots[0].compostBoost).toBe(true)
    const mustard = plantCrop(chapterFixture('prosperous-delta'), 'plot-1', 'mustard')
    const tools = applyInputToPlot(mustard.state, 'plot-1', 'tools')
    expect(tools.ok).toBe(true)
    expect(tools.state.plots[0].toolsApplied).toBe(true)

    const noStock = { ...village, credits: 10, inputs: { ...village.inputs, water: 0 } }
    const purchasedWater = applyInputToPlot(noStock, 'plot-1', 'water')
    expect(purchasedWater.ok).toBe(true)
    expect(purchasedWater.state.credits).toBe(6)
    expect(applyInputToPlot({ ...noStock, credits: 0 }, 'plot-1', 'water').ok).toBe(false)
  })

  it('uses field water before drawing from the shared village reserve', () => {
    let village = plantCrop(createInitialVillage(), 'plot-1', 'paddy').state
    village = applyInputToPlot(village, 'plot-1', 'water').state
    village = {
      ...village,
      workers: village.workers.map((worker, index) => index === 0
        ? { ...worker, x: 1.5, y: 1.5, task: 'working' as const, targetPlotId: 'plot-1' }
        : worker),
    }
    const beforeSharedWater = village.inputs.water
    const advanced = tickVillage(village)
    expect(advanced.plots[0].waterReserve).toBe(3)
    expect(advanced.inputs.water).toBe(beforeSharedWater)
  })

  it.each(['paddy', 'jute', 'mustard', 'mango'] as const)('plants unlocked %s seed on the selected field', (cropId) => {
    const village = chapterFixture('prosperous-delta')
    const planted = plantCrop(village, 'plot-1', cropId)
    expect(planted.ok).toBe(true)
    expect(planted.state.plots[0].crop).toBe(cropId)
    expect(planted.state.inputs[cropCatalog[cropId].seed]).toBe(village.inputs[cropCatalog[cropId].seed] - 1)
  })

  it('applies pruning tools to mango and rejects supplies on an empty field', () => {
    const orchard = plantCrop(chapterFixture('prosperous-delta'), 'plot-1', 'mango')
    expect(orchard.state.plots[0].toolsApplied).toBe(true)
    expect(applyInputToPlot(orchard.state, 'plot-1', 'pruningTools').ok).toBe(false)
    expect(applyInputToPlot(createInitialVillage(), 'plot-1', 'water').message).toContain('Plant a seed first')
  })

  it('sends an inspector harvest to the ghat and then auto-sells it by boat', () => {
    let village = plantCrop(createInitialVillage(), 'plot-1', 'paddy').state
    village = {
      ...village,
      plots: village.plots.map((plot) => plot.id === 'plot-1' ? { ...plot, stage: 'ready' as const, growth: 7 } : plot),
    }
    const harvested = harvestPlot(village, 'plot-1')
    expect(harvested.ok).toBe(true)
    expect(harvested.state.workers.some((worker) => worker.task === 'to-ghat' && worker.carrying === 'paddy')).toBe(true)
    const sold = runUntil(harvested.state, (current) => current.totalSold > 0, 100)
    expect(sold.totalSold).toBeGreaterThan(0)
    expect(sold.totalRevenue).toBeGreaterThan(0)
  })

  it('maps scaled canvas pointer coordinates to the exact farm plot tile', () => {
    for (const bounds of [
      { left: 31, top: 19, width: 960, height: 640 },
      { left: 7, top: 13, width: 480, height: 320 },
    ]) {
      farmPlotLocations.forEach((point, index) => {
        const selected = plotAtCoordinates(
          bounds.left + (point.x + 0.5) * bounds.width / MAP_COLS,
          bounds.top + (point.y + 0.5) * bounds.height / MAP_ROWS,
          bounds,
        )
        expect(selected).toEqual({ id: `plot-${index + 1}`, x: point.x, y: point.y })
      })
      expect(plotAtCoordinates(bounds.left - 1, bounds.top, bounds)).toBeNull()
      expect(plotAtCoordinates(bounds.left + bounds.width + 1, bounds.top, bounds)).toBeNull()
    }
  })

  it('lets farmers grow and harvest crops, then automatically sells them at the haat', () => {
    const planted = plantCrop(createInitialVillage(), 'plot-1', 'paddy')
    expect(planted.ok).toBe(true)
    const sold = runUntil(planted.state, (current) => current.totalSold >= 3)

    expect(sold.totalSold).toBe(3)
    expect(sold.totalRevenue).toBeGreaterThan(0)
    expect(sold.credits).toBeGreaterThan(planted.state.credits)
    expect(sold.coinEvents.length).toBeGreaterThan(0)
    expect(sold.unlockedChapters).not.toContain('jute-season')
    expect(chapterGoal(sold).complete).toBe(false)
  })

  it('completes Chapter 1 through real field growth and automatic boat sales', () => {
    let village = createInitialVillage()
    for (let tick = 0; tick < 1500 && !chapterGoal(village).complete; tick += 1) {
      if (village.inputs.paddySeeds === 0 && village.credits >= 12) village = buyInput(village, 'paddySeeds').state
      if (village.inputs.tools === 0 && village.credits >= 20) village = buyInput(village, 'tools').state
      if (village.inputs.water < 3 && village.credits >= 4) village = buyInput(village, 'water').state
      const plantedCount = village.plots.filter((plot) => plot.crop === 'paddy').length
      if (plantedCount < 4) {
        const emptyPlot = village.plots.find((plot) => !plot.crop)
        if (emptyPlot) {
          const planted = plantCrop(village, emptyPlot.id, 'paddy')
          if (planted.ok) village = planted.state
        }
      }
      village = tickVillage(village)
    }
    expect(village.chapterProgress.sold.paddy).toBeGreaterThanOrEqual(5)
    expect(chapterChecklist(village).find((item) => item.id === 'active-paddy')?.current).toBeGreaterThanOrEqual(2)
    expect(chapterChecklist(village).every((item) => item.complete)).toBe(true)
    expect(setChapter(village, 'jute-season').chapterId).toBe('jute-season')
  })

  it('completes Chapter 2 sales from composted, tooled Jute fields through boat deliveries', () => {
    let village = chapterFixture('jute-season')
    village.chapterProgress.sold.jute = 0
    village.credits = 900
    for (const plotId of ['plot-1', 'plot-2']) {
      const planted = plantCrop(village, plotId, 'jute')
      expect(planted.ok).toBe(true)
      village = planted.state
      expect(village.plots.find((plot) => plot.id === plotId)?.compostBoost).toBe(true)
    }
    for (let tick = 0; tick < 600 && village.chapterProgress.sold.jute < 6; tick += 1) village = tickVillage(village)
    expect(village.chapterProgress.sold.jute).toBeGreaterThanOrEqual(6)
    expect(village.credits).toBeGreaterThanOrEqual(400)
    expect(chapterChecklist(village).every((item) => item.complete)).toBe(true)
  })

  it('applies upgrades and makes structures from an empty field', () => {
    const village = createInitialVillage()
    const hired = purchaseUpgrade(village, 'farmer')
    expect(hired.ok).toBe(true)
    expect(hired.state.workers).toHaveLength(village.workers.length + 1)
    expect(hired.state.upgrades.farmers).toBe(1)

    const speed = purchaseUpgrade(hired.state, 'boat-speed')
    expect(speed.ok).toBe(true)
    expect(speed.state.upgrades.boatSpeed).toBe(1)

    const built = buildStructure(speed.state, 'plot-1', 'ghat')
    expect(built.ok).toBe(true)
    expect(built.state.buildings.filter((building) => building.type === 'ghat')).toHaveLength(2)
    expect(built.state.plots.some((plot) => plot.id === 'plot-1')).toBe(false)
  })

  it('buys supplies only when the village can afford them', () => {
    const village = createInitialVillage()
    const purchase = buyInput(village, 'water')
    expect(purchase.ok).toBe(true)
    expect(purchase.state.inputs.water).toBe(village.inputs.water + 6)

    const broke = { ...village, credits: 0 }
    const rejected = buyInput(broke, 'water')
    expect(rejected.ok).toBe(false)
    expect(rejected.state.credits).toBe(0)
  })

  it('round-trips village saves and rejects malformed backups', () => {
    const village = createInitialVillage()
    village.credits = 777
    saveVillage(village)
    expect(loadVillage(createInitialVillage()).state.credits).toBe(777)

    const restored = importVillage(exportVillage(village))
    expect(restored.credits).toBe(777)
    expect(localStorage.getItem(VILLAGE_SAVE_KEY)).not.toBeNull()
    expect(() => importVillage('{"tick":1}')).toThrow('Invalid Ruposhi Bangla village backup.')
  })

  it('migrates saved plots to per-field water and tool state without discarding progress', () => {
    const village = createInitialVillage()
    const oldSave = {
      ...village,
      credits: 777,
      plots: village.plots.map((plot) => {
        const oldPlot: Record<string, unknown> = { ...plot }
        delete oldPlot.waterReserve
        delete oldPlot.toolsApplied
        return oldPlot
      }),
    }
    localStorage.setItem(VILLAGE_SAVE_KEY, JSON.stringify(oldSave))
    const loaded = loadVillage(createInitialVillage())
    expect(loaded.error).toBeNull()
    expect(loaded.state.credits).toBe(777)
    expect(loaded.state.plots[0].waterReserve).toBe(0)
    expect(loaded.state.plots[0].toolsApplied).toBe(false)
  })

  it('reports an invalid saved format instead of silently treating it as valid', () => {
    localStorage.setItem(VILLAGE_SAVE_KEY, '{"tick":1}')
    const loaded = loadVillage(createInitialVillage())
    expect(loaded.error).toContain('invalid format')
    expect(loaded.state.chapterId).toBe('village')
  })

  it('blocks Chapter 2 until every Chapter 1 condition is met, then advances and resets chapter counters', () => {
    let village = chapterFixture('village')
    village = { ...village, chapterProgress: { ...village.chapterProgress, sold: { ...village.chapterProgress.sold, paddy: 4 } } }
    expect(chapterGoal(village).complete).toBe(false)
    expect(setChapter(village, 'jute-season')).toBe(village)

    village = chapterFixture('village')
    village.credits = 249
    expect(chapterGoal(village).complete).toBe(false)
    expect(setChapter(village, 'jute-season')).toBe(village)

    village = chapterFixture('village')
    village.plots[0].crop = null
    expect(chapterGoal(village).complete).toBe(false)
    expect(setChapter(village, 'jute-season')).toBe(village)

    const complete = chapterFixture('village')
    expect(chapterChecklist(complete).every((item) => item.complete)).toBe(true)
    expect(setChapter(complete, 'prosperous-delta')).toBe(complete)
    const advanced = setChapter(complete, 'jute-season')
    expect(advanced.chapterId).toBe('jute-season')
    expect(advanced.chapterProgress.sold.paddy).toBe(0)
    expect(advanced.completedChapters).toContain('village')
    expect(advanced.unlockedChapters).toContain('jute-season')

    const replayed = setChapter(advanced, 'village')
    expect(replayed.chapterProgress.sold.paddy).toBe(0)
    expect(setChapter(replayed, 'jute-season')).toBe(replayed)
  })

  it.each([
    ['jute-season', (state: VillageState) => { state.chapterProgress.sold.jute = 5 }],
    ['jute-season', (state: VillageState) => { state.upgrades.boatCapacity = 1 }],
    ['jute-season', (state: VillageState) => { state.credits = 399 }],
    ['two-banks', (state: VillageState) => { state.buildings = state.buildings.filter((building) => building.type !== 'ghat' || building.id === 'main-ghat') }],
    ['two-banks', (state: VillageState) => { state.plots = state.plots.filter((plot) => plot.x < 8) }],
    ['two-banks', (state: VillageState) => { state.chapterProgress.sold.jute = 0; state.chapterProgress.sold.paddy = 9 }],
    ['two-banks', (state: VillageState) => { state.upgrades.farmers = 1 }],
    ['two-banks', (state: VillageState) => { state.workers = [] }],
    ['monsoon-haat', (state: VillageState) => { state.chapterProgress.boatDeliveries = 14 }],
    ['monsoon-haat', (state: VillageState) => { state.chapterTicks = 451 }],
    ['monsoon-haat', (state: VillageState) => { state.upgrades.boatSpeed = 1 }],
    ['monsoon-haat', (state: VillageState) => { state.chapterProgress.ghatOverflowEvents = 1 }],
    ['prosperous-delta', (state: VillageState) => { state.chapterProgress.sold.mango = 0 }],
    ['prosperous-delta', (state: VillageState) => { state.upgrades.market = 2 }],
    ['prosperous-delta', (state: VillageState) => { state.credits = 2499 }],
  ] as Array<[ChapterId, (state: VillageState) => void]>)('keeps %s locked if an individual mandatory rule is incomplete', (chapterId, breakCondition) => {
    const village = chapterFixture(chapterId)
    expect(chapterGoal(village).complete).toBe(true)
    breakCondition(village)
    expect(chapterGoal(village).complete).toBe(false)
    const chapters: ChapterId[] = ['village', 'jute-season', 'two-banks', 'monsoon-haat', 'prosperous-delta']
    const nextChapter = chapters[chapters.indexOf(chapterId) + 1]
    if (nextChapter) {
      const staleUnlocked = { ...village, unlockedChapters: [...village.unlockedChapters, nextChapter] }
      expect(setChapter(staleUnlocked, nextChapter)).toBe(staleUnlocked)
      expect(setChapter(village, nextChapter)).toBe(village)
    }
  })

  it.each(['jute-season', 'two-banks', 'monsoon-haat', 'prosperous-delta'] as ChapterId[])(
    'unlocks %s only after all of its checklist requirements are satisfied',
    (chapterId) => {
      const state = chapterFixture(chapterId)
      expect(chapterChecklist(state).every((item) => item.complete)).toBe(true)
      const unlocked = refreshChapterGates(state)
      const nextChapter = (['village', 'jute-season', 'two-banks', 'monsoon-haat', 'prosperous-delta'] as ChapterId[])[
        ['village', 'jute-season', 'two-banks', 'monsoon-haat', 'prosperous-delta'].indexOf(chapterId) + 1
      ]
      if (nextChapter) expect(unlocked.unlockedChapters).toContain(nextChapter)
      expect(unlocked.completedChapters).toContain(chapterId)
    },
  )

  it('completes the Monsoon delivery target within its 450-day cycle at Boat Speed Level 2', () => {
    let village = chapterFixture('monsoon-haat')
    village.chapterTicks = 0
    village.chapterProgress.boatDeliveries = 0
    village.chapterProgress.ghatOverflowEvents = 0
    village.ghatStock.paddy = 60
    while (village.chapterTicks < 450 && village.chapterProgress.boatDeliveries < 15) {
      village = tickVillage(village)
    }
    expect(village.chapterProgress.boatDeliveries).toBeGreaterThanOrEqual(15)
    expect(village.chapterTicks).toBeLessThanOrEqual(450)
    expect(chapterGoal(village).complete).toBe(true)
  })

  it('keeps interface translations available in both supported languages', () => {
    expect(hasCompleteTranslations({ en: Object.values(labels.en), bn: Object.values(labels.bn), zh: Object.values(labels.zh) })).toBe(true)
  })
})

function chapterFixture(chapterId: ChapterId): VillageState {
  const state = createInitialVillage()
  state.chapterId = chapterId
  const chapters: ChapterId[] = ['village', 'jute-season', 'two-banks', 'monsoon-haat', 'prosperous-delta']
  state.unlockedChapters = chapters.slice(0, chapters.indexOf(chapterId) + 1)
  state.chapterProgress = {
    sold: { paddy: 0, jute: 0, mustard: 0, mango: 0 },
    boatDeliveries: 0,
    ghatOverflowEvents: 0,
  }
  switch (chapterId) {
    case 'village':
      state.chapterProgress.sold.paddy = 5
      state.credits = 300
      state.plots[0] = { ...state.plots[0], crop: 'paddy', stage: 'growing', growth: 1 }
      state.plots[1] = { ...state.plots[1], crop: 'paddy', stage: 'growing', growth: 1 }
      state.workers[0] = { ...state.workers[0], task: 'working', targetPlotId: state.plots[0].id }
      state.workers[1] = { ...state.workers[1], task: 'working', targetPlotId: state.plots[1].id }
      break
    case 'jute-season':
      state.chapterProgress.sold.jute = 6
      state.upgrades.boatCapacity = 2
      state.credits = 400
      break
    case 'two-banks':
      state.buildings.push({ id: 'far-ghat', type: 'ghat', x: 8, y: 4 })
      const farPaddy = state.plots.find((plot) => plot.x === 8 && plot.y === 1)
      const farJute = state.plots.find((plot) => plot.x === 10 && plot.y === 2)
      if (farPaddy) state.plots = state.plots.map((plot) => plot.id === farPaddy.id ? { ...plot, crop: 'paddy', stage: 'growing', waitingFor: null } : plot)
      if (farJute) state.plots = state.plots.map((plot) => plot.id === farJute.id ? { ...plot, crop: 'jute', stage: 'growing', waitingFor: null } : plot)
      state.workers = [
        { ...state.workers[0], task: 'working', targetPlotId: farPaddy?.id ?? null },
        { ...state.workers[1], task: 'working', targetPlotId: farJute?.id ?? null },
        { ...state.workers[0], id: 'farmer-3', task: 'working', targetPlotId: farPaddy?.id ?? null },
        { ...state.workers[1], id: 'farmer-4', task: 'working', targetPlotId: farJute?.id ?? null },
      ]
      state.chapterProgress.sold.paddy = 6
      state.chapterProgress.sold.jute = 4
      state.upgrades.farmers = 2
      break
    case 'monsoon-haat':
      state.chapterProgress.boatDeliveries = 15
      state.chapterTicks = 220
      state.upgrades.boatSpeed = 2
      break
    case 'prosperous-delta':
      state.chapterProgress.sold = { paddy: 1, jute: 1, mustard: 1, mango: 1 }
      state.upgrades.market = 3
      state.credits = 2600
      break
  }
  return state
}
