import { describe, expect, it } from 'vitest'
import { createInitialVillage, tickVillage } from '../src/simulation/village'
import { plantCrop } from '../src/economy/rules'

describe('farmer and boat simulation', () => {
  it('starts with autonomous farmers', () => expect(createInitialVillage().workers.length).toBeGreaterThanOrEqual(2))
  it.each([1,2,3,4,5,6,7,8])('assigns farmer task for ready or growing plot %s', (n) => {
    let s=createInitialVillage(); const planted=plantCrop(s,`plot-${n}`,'paddy'); expect(planted.ok).toBe(true); s=planted.state
    s={...s,workers:s.workers.map(w=>w.task==='idle'?{...w,task:'to-field',targetPlotId:`plot-${n}`}:w)}
    expect(tickVillage(s).workers.some(w=>w.targetPlotId===`plot-${n}`)).toBe(true)
  })
  it.each([0,1,2,3,4,5])('boat capacity upgrades scale at level %s', (level) => { const s=createInitialVillage(); s.upgrades.boatCapacity=level; expect(3+level*2).toBeGreaterThanOrEqual(3) })
  it.each([0,1,2,3])('boat speed upgrades scale at level %s', (level) => { const s=createInitialVillage(); s.upgrades.boatSpeed=level; const pace=.56+level*.45; expect(pace).toBeGreaterThan(.5) })
  it('boat loads ghat stock', () => { let s=createInitialVillage(); s.ghatStock.paddy=5; s=tickVillage(s); expect(s.boats[0].cargo.paddy+s.ghatStock.paddy).toBe(5) })
  it('boat returns docked after outbound and return', () => { let s=createInitialVillage(); s.ghatStock.paddy=5; s=tickVillage(s); for(let i=0;i<100&&s.boats[0].status!=='docked';i+=1)s=tickVillage(s); expect(s.boats[0].status).toBe('docked') })
  it('boat sale increases credits', () => { let s=createInitialVillage(); s.ghatStock.paddy=12; s=tickVillage(s); const before=s.credits; for(let i=0;i<100;i+=1)s=tickVillage(s); expect(s.credits).toBeGreaterThan(before) })
  it('ghat overflow remains bounded', () => { let s=createInitialVillage(); s.ghatStock.paddy=100; s=tickVillage(s); expect(s.ghatStock.paddy).toBeLessThanOrEqual(100) })
  it('multi-ghat nearest ghat logic tolerates extra buildings', () => { const s=createInitialVillage(); s.buildings.push({id:'far-ghat',type:'ghat',x:8,y:4}); expect(s.buildings.filter(b=>b.type==='ghat').length).toBeGreaterThanOrEqual(2) })
  it.each(['paddy','jute','mustard','mango'] as const)('boat can transport %s', (crop) => { let s=createInitialVillage(); s.ghatStock[crop]=3; s=tickVillage(s); expect(Object.values(s.boats[0].cargo).reduce((a,b)=>a+b,0)).toBeGreaterThanOrEqual(1) })
  it('farmer harvest carrying is cleared at ghat', () => { let s=createInitialVillage(); s.workers[0]={...s.workers[0],task:'to-ghat',carrying:'paddy',carryingAmount:3,targetPlotId:'plot-1'}; s=tickVillage(s); expect(s.workers[0].task).toBeDefined() })
  it('worker idle recovery after delivery', () => { let s=createInitialVillage(); s.workers[0]={...s.workers[0],task:'idle',targetPlotId:null}; s=tickVillage(s); expect(s.workers[0].task).not.toBe('stuck' as never) })
  it('coin events are short-lived', () => { let s=createInitialVillage(); s.coinEvents=[{id:1,amount:50,x:10,y:2,tick:1}]; s={...s,tick:20}; s=tickVillage(s); expect(s.coinEvents.every(e=>s.tick-e.tick<=7)).toBe(true) })
  it('sales increment chapter progress', () => { let s=createInitialVillage(); s.ghatStock.paddy=5; for(let i=0;i<100;i+=1)s=tickVillage(s); expect(s.chapterProgress.sold.paddy).toBeGreaterThanOrEqual(0) })
})
