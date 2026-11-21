import { describe, expect, it } from 'vitest'
import { cropCatalog, inputCatalog } from './economy/crops'
import { upgradeCatalog } from './economy/rules'
import { chapters, hasCompleteTranslations, labels, preferredLanguage, structureNames } from './i18n'
import { chapterChecklist, createInitialVillage } from './simulation/village'
import type { ChapterId, Lang, VillageState } from './simulation/types'

describe('bilingual game content', () => {
  it('provides non-empty Bangla and English labels for every interface string', () => {
    expect(hasCompleteTranslations({
      en: Object.values(labels.en),
      bn: Object.values(labels.bn),
      zh: Object.values(labels.zh),
    })).toBe(true)
  })

  it('restores the saved language and safely defaults invalid values to Bangla', () => {
    expect(preferredLanguage('en')).toBe('en')
    expect(preferredLanguage('bn')).toBe('bn')
    expect(preferredLanguage(null)).toBe('bn')
    expect(preferredLanguage('unknown')).toBe('bn')
  })

  it('translates every chapter, rule, crop, input, upgrade, and structure', () => {
    expect(chapters).toHaveLength(5)
    for (const chapter of chapters) {
      expect(chapter.name.en.trim()).not.toBe('')
      expect(chapter.name.bn.trim()).not.toBe('')
      expect(chapter.name.zh.trim()).not.toBe('')
      expect(chapter.goal.en.trim()).not.toBe('')
      expect(chapter.goal.bn.trim()).not.toBe('')
      const state = chapterRuleFixture(chapter.id)
      for (const rule of chapterChecklist(state)) {
        expect(rule.label.en.trim()).not.toBe('')
        expect(rule.label.bn.trim()).not.toBe('')
        expect(rule.label.zh.trim()).not.toBe('')
      }
    }

    for (const crop of Object.values(cropCatalog)) {
      expect(crop.name.en.trim()).not.toBe('')
      expect(crop.name.bn.trim()).not.toBe('')
      expect(crop.name.zh.trim()).not.toBe('')
    }
    for (const input of Object.values(inputCatalog)) {
      expect(input.name.en.trim()).not.toBe('')
      expect(input.name.bn.trim()).not.toBe('')
      expect(input.name.zh.trim()).not.toBe('')
    }
    for (const upgrade of Object.values(upgradeCatalog)) {
      expect(upgrade.label.en.trim()).not.toBe('')
      expect(upgrade.label.bn.trim()).not.toBe('')
      expect(upgrade.effect.en.trim()).not.toBe('')
      expect(upgrade.effect.bn.trim()).not.toBe('')
      expect(upgrade.label.zh.trim()).not.toBe('')
      expect(upgrade.effect.zh.trim()).not.toBe('')
    }
    for (const lang of ['en', 'bn', 'zh'] as Lang[]) {
      for (const structureName of Object.values(structureNames[lang])) {
        expect(structureName.trim()).not.toBe('')
      }
    }
  })
})

function chapterRuleFixture(chapterId: ChapterId): VillageState {
  const state = createInitialVillage()
  state.chapterId = chapterId
  state.chapterProgress.sold = { paddy: 5, jute: 6, mustard: 1, mango: 1 }
  state.chapterProgress.boatDeliveries = 15
  state.upgrades.boatCapacity = 2
  state.upgrades.boatSpeed = 2
  state.upgrades.farmers = 2
  state.upgrades.market = 3
  return state
}
