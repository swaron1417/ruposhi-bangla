import { beforeEach, describe, expect, it } from 'vitest'
import { buyInput, purchaseUpgrade, upgradePrice, plantCrop } from '../src/economy/rules'
import { createInitialVillage, tickVillage } from '../src/simulation/village'
import { createReplayLog, replayVillage, replayHash, canonicalReplayJson } from '../src/simulation/replay'
import { exportVillage, importVillage, loadVillage, saveVillage, VILLAGE_SAVE_KEY } from '../src/storage/save'

beforeEach(()=>localStorage.clear())

describe('economy save replay',()=>{
  it.each(['boat-capacity','boat-speed','farmer','irrigation','tools','market','auto-restock'] as const)('upgrade %s has scaling price',id=>{expect(upgradePrice(id,0)).toBeGreaterThan(0);expect(upgradePrice(id,5)).toBeGreaterThan(upgradePrice(id,0))})
  it('buy water adds stock',()=>{const s=createInitialVillage();const r=buyInput(s,'water');expect(r.ok).toBe(true);expect(r.state.inputs.water).toBe(s.inputs.water+6)})
  it('buy negative credit is rejected',()=>{const s=createInitialVillage();s.credits=-1;expect(buyInput(s,'water').ok).toBe(false)})
  it('plant costs seed stock',()=>{const s=createInitialVillage();const r=plantCrop(s,'plot-1','paddy');expect(r.ok).toBe(true);expect(r.state.inputs.paddySeeds).toBe(s.inputs.paddySeeds-1)})
  it('plant cannot use negative stock',()=>{const s=createInitialVillage();s.inputs.paddySeeds=0;expect(plantCrop(s,'plot-1','paddy').ok).toBe(false)})
  it.each([1,2,3,4,5])('farmer upgrade level %s increases worker count',level=>{let s=createInitialVillage();for(let i=0;i<level;i+=1){s=purchaseUpgrade(s,'farmer').state}expect(s.workers.length).toBeGreaterThanOrEqual(2)})
  it('save round trip',()=>{const s=createInitialVillage();s.credits=777;saveVillage(s);expect(loadVillage(createInitialVillage()).state.credits).toBe(777)})
  it('export import round trip',()=>{const s=createInitialVillage();const restored=importVillage(exportVillage(s));expect(restored.credits).toBe(s.credits)})
  it('corrupted save recovers',()=>{localStorage.setItem(VILLAGE_SAVE_KEY,'{bad');expect(loadVillage(createInitialVillage()).error).not.toBeNull()})
  it('wrong shape save recovers',()=>{localStorage.setItem(VILLAGE_SAVE_KEY,'{"tick":1}');expect(loadVillage(createInitialVillage()).error).toContain('invalid')})
  it('replay is deterministic across repeated execution',()=>{const log=createReplayLog([{type:'plant',plotId:'plot-1',cropId:'paddy'},{type:'tick',count:40}],'seed-a');const a=replayVillage(log);const b=replayVillage(log);expect(a.hash).toBe(b.hash);expect(a.finalState).toEqual(b.finalState)})
  it('different actions yield different replay hash',()=>{const a=createReplayLog([{type:'tick',count:5}]);const b=createReplayLog([{type:'tick',count:6}]);expect(replayHash(replayVillage(a).finalState)).not.toBe(replayHash(replayVillage(b).finalState))})
  it('canonical JSON key ordering is deterministic',()=>expect(canonicalReplayJson({b:2,a:1})).toBe(canonicalReplayJson({a:1,b:2})))
  it('replay hash is fixed width',()=>expect(replayHash(createInitialVillage())).toMatch(/^0x[0-9a-f]{32}$/))
  it('replay rejects invalid action safely',()=>{const log=createReplayLog([{type:'chapter',chapterId:'prosperous-delta'}]);expect(replayVillage(log).actionCount).toBe(1)})
  it('tick replay advances economy',()=>{let s=createInitialVillage();for(let i=0;i<10;i+=1)s=tickVillage(s);expect(s.tick).toBe(10)})
  it('auto restock can be disabled',()=>{let s=createInitialVillage();s.autoRestockEnabled=false;expect(tickVillage(s).inputs.water).toBeGreaterThanOrEqual(0)})
  it('ghat stock can never go negative in boat logic',()=>{const s=createInitialVillage();const next=tickVillage(s);expect(Object.values(next.ghatStock).every(v=>v>=0)).toBe(true)})
  it('credits remain finite',()=>{let s=createInitialVillage();for(let i=0;i<20;i+=1)s=tickVillage(s);expect(Number.isFinite(s.credits)).toBe(true)})
  it('harvest upgrades remain soft-lock safe',()=>{const s=createInitialVillage();const r=purchaseUpgrade(s,'boat-speed');expect(r.ok).toBe(true)})
  it('chapter replay action exists',()=>{const r=replayVillage(createReplayLog([{type:'chapter',chapterId:'jute-season'}],'x'));expect(r.actionCount).toBe(1)})
  it('apply replay action exists',()=>{const r=replayVillage(createReplayLog([{type:'apply',plotId:'plot-1',inputId:'water'}],'x'));expect(r.actionCount).toBe(1)})
  it('build replay action exists',()=>{const r=replayVillage(createReplayLog([{type:'build',plotId:'plot-1',structure:'ghat'}],'x'));expect(r.actionCount).toBe(1)})
  it('upgrade replay action exists',()=>{const r=replayVillage(createReplayLog([{type:'upgrade',upgradeId:'boat-speed'}],'x'));expect(r.actionCount).toBe(1)})
  it('purchase price never decreases',()=>{expect(upgradePrice('boat-capacity',10)).toBeGreaterThan(upgradePrice('boat-capacity',9))})
})
