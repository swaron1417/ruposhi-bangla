import { describe, expect, it } from 'vitest'
import { buyUpgrade, calculateMissionReward, canAfford, clampEconomy, completeMission, createDefaultSave, importSave, loadSave, saveGame } from './gameEngine'
import { chapterOrder } from './gameData'

describe('Ruposhi Bangla engine', () => {
  it('unlocks the next chapter after completion', () => {
    const save = createDefaultSave()
    const updated = completeMission(save, 'shapla', 8, 0)
    expect(updated.completedChapters).toContain('shapla')
    expect(updated.unlockedChapters).toContain('chars')
  })

  it('prevents negative balances when buying upgrades', () => {
    const save = createDefaultSave()
    save.credits = 20
    const attempt = buyUpgrade(save, 'echo')
    expect(attempt.ok).toBe(false)
    expect(save.credits).toBe(20)
    expect(canAfford(save, 60)).toBe(false)
  })

  it('calculates mission rewards without letting the reward go below a floor', () => {
    expect(calculateMissionReward('shapla', 12, 1)).toBeGreaterThanOrEqual(25)
    expect(calculateMissionReward('regatta', 3, 0)).toBeGreaterThan(200)
  })

  it('exports and imports save data cleanly', () => {
    const save = createDefaultSave()
    save.credits = 220
    saveGame(save)
    const restored = loadSave()
    expect(restored.credits).toBe(220)
    const imported = importSave(JSON.stringify(save))
    expect(imported.credits).toBe(220)
  })

  it('keeps the economy from soft-locking progression', () => {
    const save = createDefaultSave()
    save.credits = 0
    const adjusted = clampEconomy(save)
    expect(adjusted.credits).toBe(0)
    expect(chapterOrder[0]).toBe('shapla')
  })
})
