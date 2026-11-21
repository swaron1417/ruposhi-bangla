import { cropCatalog, inputCatalog } from './crops'
import type { CropId, InputId, Lang, StructureType, UpgradeId, VillageState } from '../simulation/types'

export const structureCost: Record<StructureType, number> = {
  shed: 48,
  well: 62,
  ghat: 88,
}

export const upgradeCatalog: Record<UpgradeId, { label: Record<'en' | 'bn' | 'zh', string>; effect: Record<'en' | 'bn' | 'zh', string>; baseCost: number }> = {
  'boat-capacity': {
    label: { en: 'Larger cargo boat', bn: 'বড় মালবাহী নৌকা', zh: '更大货船' },
    effect: { en: 'Carry 2 more bundles per trip.', bn: 'প্রতি যাত্রায় আরও ২ আঁটি পণ্য।', zh: '每趟可多运载 2 捆。' },
    baseCost: 110,
  },
  'boat-speed': {
    label: { en: 'Faster boat', bn: 'দ্রুতগামী নৌকা', zh: '快速货船' },
    effect: { en: 'Sail and return faster.', bn: 'নৌকা দ্রুত হাটে যাবে ও ফিরবে।', zh: '更快前往集市并返航。' },
    baseCost: 130,
  },
  farmer: {
    label: { en: 'Hire a farmer', bn: 'কৃষক নিয়োগ', zh: '雇用农民' },
    effect: { en: 'Add one autonomous field worker.', bn: 'আরও একজন স্বয়ংক্রিয় কৃষক।', zh: '增加一名自动工作的田间农民。' },
    baseCost: 95,
  },
  irrigation: {
    label: { en: 'Tube-well irrigation', bn: 'নলকূপ সেচ', zh: '管井灌溉' },
    effect: { en: 'Increase stored water and slow crop water use.', bn: 'পানির মজুত বাড়ায় ও ফসলের পানি খরচ কমায়।', zh: '增加储水并减缓作物用水。' },
    baseCost: 85,
  },
  tools: {
    label: { en: 'Modern farm tools', bn: 'আধুনিক কৃষি যন্ত্র', zh: '现代农具' },
    effect: { en: 'Restock tools and speed up field work.', bn: 'যন্ত্র মজুত করে ও মাঠের কাজ দ্রুত করে।', zh: '补充工具并加快田间作业。' },
    baseCost: 72,
  },
  market: {
    label: { en: 'Expand the corner haat', bn: 'কোণার হাট সম্প্রসারণ', zh: '扩建角落集市' },
    effect: { en: 'Raise sale prices and ghat storage capacity.', bn: 'বিক্রির দাম ও ঘাটের গুদাম বাড়ায়।', zh: '提高售价并扩大量码头库存容量。' },
    baseCost: 145,
  },
  'auto-restock': {
    label: { en: 'Auto-restock ledger', bn: 'স্বয়ংক্রিয় মজুত খাতা', zh: '自动补货账本' },
    effect: { en: 'Let the village replenish water and seeds while you play.', bn: 'খেলার সময় গ্রাম পানি ও বীজ আবার কিনবে।', zh: '游戏进行时自动补充水和种子。' },
    baseCost: 175,
  },
}

export function unlockedCropList(state: VillageState): CropId[] {
  const chapterOrder = ['village', 'jute-season', 'two-banks', 'monsoon-haat', 'prosperous-delta']
  const reachedChapters = [state.chapterId, ...state.completedChapters]
  const chapterProgress = Math.max(...reachedChapters.map((chapterId) => chapterOrder.indexOf(chapterId) + 1))
  return (Object.keys(cropCatalog) as CropId[]).filter((cropId) => cropCatalog[cropId].unlockAt <= chapterProgress)
}

export function getInputPurchasePrice(inputId: InputId): number {
  return inputCatalog[inputId].price
}

export function buyInput(state: VillageState, inputId: InputId, lang: Lang = 'en'): { state: VillageState; ok: boolean; message: string } {
  const item = inputCatalog[inputId]
  if (state.credits < item.price) {
    return { state, ok: false, message: lang === 'bn' ? 'পর্যাপ্ত কড়ি নেই।' : 'Not enough credits.' }
  }
  return {
    ok: true,
    message: lang === 'bn' ? `${item.name.bn} মজুত করা হয়েছে।` : `${item.name.en} restocked.`,
    state: {
      ...state,
      credits: state.credits - item.price,
      inputs: { ...state.inputs, [inputId]: state.inputs[inputId] + item.pack },
    },
  }
}

export function applyInputToPlot(
  state: VillageState,
  plotId: string,
  inputId: Extract<InputId, 'water' | 'compost' | 'tools' | 'pruningTools'>,
  lang: Lang = 'en',
): { state: VillageState; ok: boolean; message: string } {
  const plot = state.plots.find((item) => item.id === plotId)
  if (!plot || !plot.crop) {
    return { state, ok: false, message: lang === 'bn' ? 'আগে বীজ বপন করুন।' : 'Plant a seed first.' }
  }
  if (inputId === 'compost' && plot.compostBoost) {
    return { state, ok: false, message: lang === 'bn' ? 'এই ক্ষেতে ইতিমধ্যে সার দেওয়া হয়েছে।' : 'This field already has compost.' }
  }
  if (inputId === 'pruningTools' && plot.crop !== 'mango') {
    return { state, ok: false, message: lang === 'bn' ? 'ছাঁটাই যন্ত্র শুধু আম বাগানে ব্যবহার করা যায়।' : 'Pruning tools can only be used on a mango orchard.' }
  }
  if ((inputId === 'tools' || inputId === 'pruningTools') && plot.toolsApplied) {
    return { state, ok: false, message: lang === 'bn' ? 'এই ক্ষেতে যন্ত্র ইতিমধ্যে ব্যবহার হয়েছে।' : 'Tools have already been used on this field.' }
  }
  if (inputId === 'water' && plot.waterReserve >= 4) {
    return { state, ok: false, message: lang === 'bn' ? 'এই ক্ষেতে পর্যাপ্ত পানি আছে।' : 'This field already has enough water.' }
  }

  const item = inputCatalog[inputId]
  const hasStock = state.inputs[inputId] > 0
  if (!hasStock && state.credits < item.price) {
    return { state, ok: false, message: lang === 'bn' ? 'পর্যাপ্ত কড়ি নেই।' : 'Not enough credits.' }
  }
  const plots = state.plots.map((field) => field.id !== plotId ? field : {
    ...field,
    waterReserve: inputId === 'water' ? Math.min(4, field.waterReserve + 4) : field.waterReserve,
    compostBoost: inputId === 'compost' ? true : field.compostBoost,
    toolsApplied: inputId === 'tools' || inputId === 'pruningTools' ? true : field.toolsApplied,
    waitingFor: inputId === 'water' && field.waitingFor === 'water' ? null : field.waitingFor,
  })
  const inputNames: Record<typeof inputId, Record<Lang, string>> = {
    water: { en: 'Water applied', bn: 'ক্ষেতে পানি দেওয়া হয়েছে', zh: '已灌溉田地' },
    compost: { en: 'Compost applied', bn: 'ক্ষেতে সার দেওয়া হয়েছে', zh: '已施有机肥' },
    tools: { en: 'Tools used', bn: 'ক্ষেতে যন্ত্র ব্যবহার হয়েছে', zh: '已使用农具' },
    pruningTools: { en: 'Pruning tools used', bn: 'আম বাগানে ছাঁটাই যন্ত্র ব্যবহার হয়েছে', zh: '已使用修剪工具' },
  }
  return {
    ok: true,
    message: inputNames[inputId][lang],
    state: {
      ...state,
      credits: state.credits - (hasStock ? 0 : item.price),
      inputs: hasStock ? { ...state.inputs, [inputId]: state.inputs[inputId] - 1 } : state.inputs,
      plots,
    },
  }
}

export function harvestPlot(state: VillageState, plotId: string, lang: Lang = 'en'): { state: VillageState; ok: boolean; message: string } {
  const plot = state.plots.find((item) => item.id === plotId)
  if (!plot?.crop || plot.stage !== 'ready') {
    return { state, ok: false, message: lang === 'bn' ? 'ফসল কাটার জন্য এখনো পাকে নি।' : 'This crop is not ready to harvest yet.' }
  }
  const workerIndex = state.workers.findIndex((worker) => worker.task === 'idle' && worker.targetPlotId === null)
  if (workerIndex < 0) {
    return { state, ok: false, message: lang === 'bn' ? 'ফসল নিতে কৃষক ব্যস্ত।' : 'All farmers are busy right now.' }
  }
  const definition = cropCatalog[plot.crop]
  const amount = Math.round(definition.yield * (plot.compostBoost ? 1.25 : 1))
  const capacity = 12 + state.upgrades.market * 6
  const ghatTotal = Object.values(state.ghatStock).reduce((total, count) => total + count, 0)
  if (ghatTotal + amount > capacity) {
    return { state, ok: false, message: lang === 'bn' ? 'ঘাটে জায়গা নেই। আগে নৌকার জন্য অপেক্ষা করুন।' : 'The ghat is full. Wait for the boat to clear stock.' }
  }
  const regrows = definition.regrowTicks > 0
  const workers = state.workers.map((worker, index) => index === workerIndex
    ? { ...worker, task: 'to-ghat' as const, targetPlotId: plot.id, carrying: plot.crop, carryingAmount: amount }
    : worker)
  const plots = state.plots.map((field) => field.id !== plot.id ? field : {
    ...field,
    crop: regrows ? field.crop : null,
    growth: regrows ? definition.growthTicks - definition.regrowTicks : 0,
    waterClock: 0,
    waterReserve: 0,
    stage: regrows ? 'growing' as const : 'empty' as const,
    compostBoost: regrows ? field.compostBoost : false,
    toolsApplied: regrows ? field.toolsApplied : false,
    harvests: field.harvests + 1,
    waitingFor: null,
  })
  return {
    state: { ...state, plots, workers },
    ok: true,
    message: lang === 'bn' ? 'ফসল কেটে ঘাটে পাঠানো হয়েছে।' : 'Harvest cut and sent to the ghat.',
  }
}

export function plantCrop(
  state: VillageState,
  plotId: string,
  cropId: CropId,
  lang: Lang = 'en',
): { state: VillageState; ok: boolean; message: string } {
  const plot = state.plots.find((item) => item.id === plotId)
  const definition = cropCatalog[cropId]
  if (!plot || plot.stage !== 'empty' || plot.crop !== null) {
    return { state, ok: false, message: lang === 'bn' ? 'খালি নদীপাড়ের জমি বেছে নিন।' : 'Choose an empty riverbank plot.' }
  }
  if (!unlockedCropList(state).includes(cropId)) {
    return { state, ok: false, message: lang === 'bn' ? 'পরের অধ্যায়ে এই ফসল খুলবে।' : 'This crop unlocks in a later village chapter.' }
  }
  const requirements: Array<[InputId, number]> = [
    [definition.seed, 1],
    ['compost', definition.compost],
    ['tools', definition.tools],
    ['pruningTools', definition.pruningTools],
  ]
  const missing = requirements.find(([inputId, amount]) => state.inputs[inputId] < amount)
  if (missing) {
    const name = inputCatalog[missing[0]].name[lang]
    return { state, ok: false, message: lang === 'bn' ? `${name} দরকার।` : `Need ${name}.` }
  }

  const nextInputs = { ...state.inputs }
  for (const [inputId, amount] of requirements) nextInputs[inputId] -= amount
  const plots = state.plots.map((item) => item.id === plotId
    ? {
      ...item,
      crop: cropId,
      growth: 0,
      waterClock: 0,
      waterReserve: 0,
      stage: 'growing' as const,
      compostBoost: definition.compost > 0,
      toolsApplied: definition.tools > 0 || definition.pruningTools > 0,
      waitingFor: null,
    }
    : item)
  return {
    ok: true,
    message: lang === 'bn' ? `${definition.name.bn} লাগানো হয়েছে।` : `${definition.name.en} planted.`,
    state: {
      ...state,
      inputs: nextInputs,
      plots,
      plantedCrops: state.plantedCrops.includes(cropId) ? state.plantedCrops : [...state.plantedCrops, cropId],
    },
  }
}

export function buildStructure(
  state: VillageState,
  plotId: string,
  type: StructureType,
  lang: Lang = 'en',
): { state: VillageState; ok: boolean; message: string } {
  const plot = state.plots.find((item) => item.id === plotId)
  const cost = structureCost[type]
  if (!plot || plot.crop || plot.stage !== 'empty' || state.buildings.some((building) => building.id === plotId)) {
    return { state, ok: false, message: lang === 'bn' ? 'ভবন বানাতে খালি জমি বেছে নিন।' : 'Choose an empty plot for a building.' }
  }
  if (state.credits < cost) {
    return { state, ok: false, message: lang === 'bn' ? 'পর্যাপ্ত কড়ি নেই।' : 'Not enough credits.' }
  }
  return {
    ok: true,
    message: lang === 'bn'
      ? `${type === 'shed' ? 'সরবরাহ ঘর' : type === 'well' ? 'নলকূপ' : 'ঘাট'} নির্মাণ করা হয়েছে।`
      : `${type === 'shed' ? 'Supply shed' : type === 'well' ? 'Tube-well' : 'River ghat'} built.`,
    state: {
      ...state,
      credits: state.credits - cost,
      buildings: [...state.buildings, { id: plotId, type, x: plot.x, y: plot.y }],
      plots: state.plots.filter((item) => item.id !== plotId),
    },
  }
}

export function upgradePrice(id: UpgradeId, level: number): number {
  return Math.round(upgradeCatalog[id].baseCost * (1 + level * 0.62))
}

export function purchaseUpgrade(state: VillageState, id: UpgradeId, lang: Lang = 'en'): { state: VillageState; ok: boolean; message: string } {
  if (id === 'auto-restock' && state.upgrades.autoRestock > 0) {
    return { state, ok: false, message: lang === 'bn' ? 'স্বয়ংক্রিয় মজুত চালু আছে।' : 'Auto-restock is already unlocked.' }
  }
  const stateKey: Record<UpgradeId, keyof VillageState['upgrades']> = {
    'boat-capacity': 'boatCapacity',
    'boat-speed': 'boatSpeed',
    farmer: 'farmers',
    irrigation: 'irrigation',
    tools: 'tools',
    market: 'market',
    'auto-restock': 'autoRestock',
  }
  const level = state.upgrades[stateKey[id]]
  const price = upgradePrice(id, level)
  if (state.credits < price) return { state, ok: false, message: lang === 'bn' ? 'পর্যাপ্ত কড়ি নেই।' : 'Not enough credits.' }
  const upgrades = { ...state.upgrades, [stateKey[id]]: level + 1 }
  const inputs = { ...state.inputs }
  const workers = [...state.workers]
  if (id === 'farmer') workers.push({ id: `farmer-${workers.length + 1}`, x: 0.9, y: 1.15, task: 'idle', targetPlotId: null, carrying: null, carryingAmount: 0, workedTicks: 0 })
  if (id === 'irrigation') inputs.water += 18
  if (id === 'tools') inputs.tools += 3
  return {
    ok: true,
    message: lang === 'bn' ? `${upgradeCatalog[id].label.bn} উন্নত হয়েছে।` : `${upgradeCatalog[id].label.en} upgraded.`,
    state: {
      ...state,
      credits: state.credits - price,
      upgrades,
      inputs,
      workers,
    },
  }
}

export function saleValue(cropId: CropId, quantity: number, marketLevel: number, bulkThreshold: number): number {
  const base = cropCatalog[cropId].price * quantity
  const marketBonus = 1 + (marketLevel - 1) * 0.12
  const bulkBonus = quantity >= bulkThreshold ? 1.1 : 1
  return Math.round(base * marketBonus * bulkBonus)
}
