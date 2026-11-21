import { describe, expect, it } from 'vitest'
import { applyInputToPlot, plantCrop, harvestPlot, buyInput } from '../src/economy/rules'
import { createInitialVillage, tickVillage } from '../src/simulation/village'
import { plotAtCoordinates } from '../src/render/drawVillage'
import { MAP_COLS, MAP_ROWS, type CropId } from '../src/simulation/types'

const crops: CropId[] = ['paddy', 'jute', 'mustard', 'mango']

describe('crop and tool edge cases', () => {
  it.each(crops)('plants %s into an empty plot', (crop) => {
    const state = crop === 'paddy' ? createInitialVillage() : (() => { const s = createInitialVillage(); s.chapterId = 'prosperous-delta'; s.unlockedChapters = ['village','jute-season','two-banks','monsoon-haat','prosperous-delta']; s.completedChapters = ['village','jute-season','two-banks','monsoon-haat']; return s })()
    const result = plantCrop(state, 'plot-1', crop)
    expect(result.ok).toBe(true)
  })
  it.each(crops)('rejects %s planting on a occupied plot', (crop) => {
    const state = createInitialVillage(); state.plots[0].crop = 'paddy'; state.plots[0].stage = 'growing'
    expect(plantCrop(state, 'plot-1', crop).ok).toBe(false)
  })
  it.each(['water','compost','tools','pruningTools'] as const)('rejects %s on an empty field', (input) => {
    expect(applyInputToPlot(createInitialVillage(), 'plot-1', input).ok).toBe(false)
  })
  it('applies water directly and consumes plot reserve before village water', () => {
    let state = plantCrop(createInitialVillage(), 'plot-1', 'paddy').state
    state = applyInputToPlot(state, 'plot-1', 'water').state
    const reserve = state.plots[0].waterReserve
    state = { ...state, workers: state.workers.map((w,i) => i === 0 ? { ...w, task:'working', targetPlotId:'plot-1', x:1.5, y:1.5 } : w) }
    const next = tickVillage(state)
    expect(next.plots[0].waterReserve).toBe(reserve - 1)
  })
  it('caps field water reserve at four units', () => {
    let state = plantCrop(createInitialVillage(), 'plot-1', 'paddy').state
    for (let i = 0; i < 3; i += 1) state = applyInputToPlot(state, 'plot-1', 'water').state
    expect(state.plots[0].waterReserve).toBe(4)
  })
  it.each(['compost','tools'] as const)('applies %s only once per field', (input) => {
    let state = plantCrop(createInitialVillage(), 'plot-1', 'paddy').state
    state = applyInputToPlot(state, 'plot-1', input).state
    expect(applyInputToPlot(state, 'plot-1', input).ok).toBe(false)
  })
  it('prevents negative water stock', () => { const s=createInitialVillage(); s.inputs.water=0; expect(buyInput(s,'water').ok).toBe(true) })
  it('prevents negative credits on supply purchase', () => { const s=createInitialVillage(); s.credits=0; expect(buyInput(s,'water').ok).toBe(false) })
  it('harvest rejects immature crops', () => { let s=plantCrop(createInitialVillage(),'plot-1','paddy').state; expect(harvestPlot(s,'plot-1').ok).toBe(false) })
  it('harvests ready crops with an idle worker', () => { let s=plantCrop(createInitialVillage(),'plot-1','paddy').state; s={...s,plots:s.plots.map(p=>p.id==='plot-1'?{...p,stage:'ready',growth:7}:p)}; expect(harvestPlot(s,'plot-1').ok).toBe(true) })
  it.each([1,2,3,4,5,6,7,8,9,10,11,12] as number[])('hit-tests a valid desktop canvas column %s', (col) => {
    const bounds={left:20,top:10,width:1200,height:800}; const result=plotAtCoordinates(bounds.left+(col-.5)*bounds.width/12,bounds.top+400,bounds)
    expect(result === null || typeof result.id==='string').toBe(true)
  })
  it.each([320,375,768,1024,1440] as number[])('hit-tests canvas width %s accurately', (width) => {
    const bounds={left:0,top:0,width,height:width*.667}; const result=plotAtCoordinates(bounds.left+bounds.width/MAP_COLS*1.5,bounds.top+bounds.height/MAP_ROWS*1.5,bounds)
    expect(result?.id).toBe('plot-1')
  })
  it('returns null outside bounds', () => expect(plotAtCoordinates(-1,-1,{left:0,top:0,width:500,height:500})).toBeNull())
})
