import type { CropId, InputId } from '../simulation/types'

export interface CropDefinition {
  id: CropId
  name: Record<'en' | 'bn' | 'zh', string>
  seed: InputId
  growthTicks: number
  waterInterval: number
  yield: number
  price: number
  compost: number
  tools: number
  pruningTools: number
  regrowTicks: number
  unlockAt: number
  color: string
}

export const cropCatalog: Record<CropId, CropDefinition> = {
  paddy: {
    id: 'paddy',
    name: { en: 'Paddy', bn: 'ধান', zh: '水稻' },
    seed: 'paddySeeds',
    growthTicks: 7,
    waterInterval: 2,
    yield: 3,
    price: 12,
    compost: 0,
    tools: 1,
    pruningTools: 0,
    regrowTicks: 0,
    unlockAt: 1,
    color: '#b4c968',
  },
  jute: {
    id: 'jute',
    name: { en: 'Golden jute', bn: 'সোনালী পাট', zh: '黄麻' },
    seed: 'juteSeeds',
    growthTicks: 10,
    waterInterval: 3,
    yield: 4,
    price: 22,
    compost: 1,
    tools: 1,
    pruningTools: 0,
    regrowTicks: 0,
    unlockAt: 2,
    color: '#d3a94d',
  },
  mustard: {
    id: 'mustard',
    name: { en: 'Mustard', bn: 'সরিষা', zh: '油菜' },
    seed: 'mustardSeeds',
    growthTicks: 6,
    waterInterval: 4,
    yield: 3,
    price: 18,
    compost: 1,
    tools: 0,
    pruningTools: 0,
    regrowTicks: 0,
    unlockAt: 3,
    color: '#f0ce54',
  },
  mango: {
    id: 'mango',
    name: { en: 'Mango orchard', bn: 'আম বাগান', zh: '芒果园' },
    seed: 'mangoSaplings',
    growthTicks: 18,
    waterInterval: 5,
    yield: 5,
    price: 34,
    compost: 1,
    tools: 0,
    pruningTools: 1,
    regrowTicks: 9,
    unlockAt: 5,
    color: '#4e9a58',
  },
}

export const inputCatalog: Record<InputId, { name: Record<'en' | 'bn' | 'zh', string>; price: number; pack: number }> = {
  paddySeeds: { name: { en: 'Paddy seeds', bn: 'ধানের বীজ', zh: '水稻种子' }, price: 12, pack: 3 },
  juteSeeds: { name: { en: 'Jute seeds', bn: 'পাটের বীজ', zh: '黄麻种子' }, price: 18, pack: 2 },
  mustardSeeds: { name: { en: 'Mustard seeds', bn: 'সরিষার বীজ', zh: '油菜种子' }, price: 15, pack: 2 },
  mangoSaplings: { name: { en: 'Mango saplings', bn: 'আমের চারা', zh: '芒果苗' }, price: 32, pack: 1 },
  water: { name: { en: 'Irrigation water', bn: 'সেচের পানি', zh: '灌溉用水' }, price: 4, pack: 6 },
  compost: { name: { en: 'Organic compost', bn: 'জৈব সার', zh: '有机肥' }, price: 14, pack: 2 },
  tools: { name: { en: 'Farming tools', bn: 'কৃষি যন্ত্র', zh: '农具' }, price: 20, pack: 2 },
  pruningTools: { name: { en: 'Pruning tools', bn: 'ছাঁটাই যন্ত্র', zh: '修剪工具' }, price: 26, pack: 1 },
}
