import { describe, expect, it } from 'vitest'
import { labels, chapters, preferredLanguage, LANGUAGE_STORAGE_KEY } from '../src/i18n'

beforeEach(()=>localStorage.clear())

describe('bilingual UI and accessibility',()=>{
  it('Bangla and English key counts match',()=>expect(Object.keys(labels.bn).length).toBe(Object.keys(labels.en).length))
  it('all English keys exist in Bangla',()=>{for(const key of Object.keys(labels.en)){expect(labels.bn).toHaveProperty(key)}})
  it('all Bangla keys exist in English',()=>{for(const key of Object.keys(labels.bn)){expect(labels.en).toHaveProperty(key)}})
  it.each(Object.keys(labels.en))('English label %s is non-empty',(key)=>expect(String(labels.en[key as keyof typeof labels.en]).trim().length).toBeGreaterThan(0))
  it.each(Object.keys(labels.bn))('Bangla label %s is non-empty',(key)=>expect(String(labels.bn[key as keyof typeof labels.bn]).trim().length).toBeGreaterThan(0))
  it('chapter names exist in both languages',()=>expect(chapters.every(c=>c.name.bn&&c.name.en)).toBe(true))
  it('chapter goals exist in both languages',()=>expect(chapters.every(c=>c.goal.bn&&c.goal.en)).toBe(true))
  it('defaults unsupported language to Bangla',()=>expect(preferredLanguage('fr')).toBe('bn'))
  it('accepts English language',()=>expect(preferredLanguage('en')).toBe('en'))
  it('persists language key',()=>{localStorage.setItem(LANGUAGE_STORAGE_KEY,'en');expect(preferredLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY))).toBe('en')})
  it('wallet labels exist',()=>expect(labels.en.walletTitle&&labels.bn.walletTitle).toBeTruthy())
  it('tool labels exist',()=>expect(labels.en.rightDock&&labels.bn.rightDock).toBeTruthy())
  it('field inspector labels exist',()=>expect(labels.en.fieldInspector&&labels.bn.fieldInspector).toBeTruthy())
  it('harvest label exists',()=>expect(labels.en.harvest&&labels.bn.harvest).toBeTruthy())
  it('apply label exists',()=>expect(labels.en.apply&&labels.bn.apply).toBeTruthy())
  it('success feedback labels exist',()=>expect(labels.en.saleToast&&labels.bn.saleToast).toBeTruthy())
  it('failure feedback labels exist',()=>expect(labels.en.noFunds&&labels.bn.noFunds).toBeTruthy())
  it('language switch label exists',()=>expect(labels.en.switchLanguage&&labels.bn.switchLanguage).toBeTruthy())
  it('map description is localized',()=>expect(labels.en.mapDescription&&labels.bn.mapDescription).toBeTruthy())
  it('chapter checklist label is localized',()=>expect(labels.en.requirements&&labels.bn.requirements).toBeTruthy())
})
