export type ChapterId = 'shapla' | 'chars' | 'ferry' | 'squall' | 'regatta'
export type Lang = 'en' | 'bn'
export type UpgradeId = 'echo' | 'spyglass' | 'hull' | 'dak'

export interface Position {
  x: number
  y: number
}

export interface ChapterConfig {
  id: ChapterId
  name: Record<Lang, string>
  subtitle: Record<Lang, string>
  objective: Record<Lang, string>
  description: Record<Lang, string>
  map: string[]
  start: Position
  destination: Position
  reward: number
  turnLimit: number
  weather: Record<Lang, string>
  challenge: Record<Lang, string>
  currents: Position[]
}

export interface UpgradeDefinition {
  id: UpgradeId
  label: Record<Lang, string>
  cost: number
  effect: Record<Lang, string>
}

export const chapterOrder: ChapterId[] = ['shapla', 'chars', 'ferry', 'squall', 'regatta']

export const chapters: Record<ChapterId, ChapterConfig> = {
  shapla: {
    id: 'shapla',
    name: { en: 'Shapla Ghat', bn: 'শাপলা ঘাট' },
    subtitle: { en: 'The Morning Haat', bn: 'ভোরের হাট' },
    objective: { en: 'Deliver the jute and paddy baskets to the market before noon.', bn: 'ভোরের হাটে পুরানো পাট ও ধানবস্তা বাজারে পৌঁছে দিন।' },
    description: {
      en: 'A calm morning run teaches the basics of reading current lines, tide phases, and safe wharf timing.',
      bn: 'ভোরের নরম স্রোত নিয়ে পাঠ শুরু হয়: স্রোতের লাইন, জোয়ার চক্র, ও ঘাটের সুরক্ষিত সময় পড়া শেখানো হয়।',
    },
    map: [
      '#########',
      '###..M..#',
      '#..C....#',
      '#..G....#',
      '#.......#',
      '##..C...#',
      '#########',
    ],
    start: { x: 1, y: 4 },
    destination: { x: 5, y: 1 },
    reward: 90,
    turnLimit: 12,
    weather: { en: 'Cool dawn mist', bn: 'শীতল ভোরের কুয়াশা' },
    challenge: { en: 'Learn the tide clock and avoid the two shallow chars.', bn: 'জোয়ার ঘড়ি পড়ে দুইটি অগভীর চর এড়িয়ে চলুন।' },
    currents: [{ x: 3, y: 2 }, { x: 4, y: 4 }],
  },
  chars: {
    id: 'chars',
    name: { en: 'The Shifting Chars', bn: 'ভাসমান চর' },
    subtitle: { en: 'Padma sandbars', bn: 'পদ্মার চর' },
    objective: { en: 'Carry the river seed stock across the shifting sandbars before the flats reappear.', bn: 'ভাসমান চর জাগ্রত হওয়ার আগেই বীজের চালান সিকি চরে পৌঁছে দিন।' },
    description: {
      en: 'The char flats rise at low tide and hide the narrow canal lanes. Timing matters more than speed.',
      bn: 'নিম্ন জোয়ারে চরগুলো উপরে ওঠে আসে, সরু খালগুলো ঢেকে ফেলে। বেগ নয়, সময়ই গুরুত্বপূর্ণ।',
    },
    map: [
      '#########',
      '#..C....#',
      '#....M..#',
      '#..C....#',
      '#..G....#',
      '#....C..#',
      '#########',
    ],
    start: { x: 1, y: 4 },
    destination: { x: 6, y: 2 },
    reward: 120,
    turnLimit: 11,
    weather: { en: 'Low tide glimmer', bn: 'নিম্ন জোয়ারের সোনালি হালকা' },
    challenge: { en: 'Pass between char shoals during rising water or wait for the canal to reopen.', bn: 'স্রোত বাড়ার সময় আড়াআড়ি ছিদ্র দিয়ে যাওয়া হবে; নইলে চর আবার আটকে দেবে।' },
    currents: [{ x: 2, y: 1 }, { x: 5, y: 5 }],
  },
  ferry: {
    id: 'ferry',
    name: { en: 'Kheya & Shanko', bn: 'খেয়া ও সাঁকো' },
    subtitle: { en: 'Crossing schedule', bn: 'পারাপারের সময়' },
    objective: { en: 'Sync with the ferry and lower the bamboo bridge before the cargo boat can reach the ferry ghat.', bn: 'খেয়া পারের সময় মেনে চলুন ও বাঁশের সাঁকো নামিয়ে ট্রানজিট শেষ করুন।' },
    description: {
      en: 'The river ferry runs a set route and the bamboo bridge only opens on the hour. Timing is everything.',
      bn: 'খেয়া একটি নির্দিষ্ট রুটে চলতে থাকে; বাঁশের সাঁকো শুধুমাত্র নির্দিষ্ট সময়ে নেমে আসে।',
    },
    map: [
      '#########',
      '#...F...#',
      '#.B.G...#',
      '#....M..#',
      '#....C..#',
      '#.......#',
      '#########',
    ],
    start: { x: 1, y: 5 },
    destination: { x: 6, y: 3 },
    reward: 170,
    turnLimit: 13,
    weather: { en: 'Warm estuary breeze', bn: 'ভেজা খেয়াঘাটের নরম হাওয়া' },
    challenge: { en: 'Wait for the ferry to clear the crossing and keep the bridge low for the final leg.', bn: 'খেয়া চলে গেলে সাঁকো নামিয়ে শেষ অংশে যান, নইলে পথ বন্ধ হয়ে যাবে।' },
    currents: [{ x: 4, y: 1 }, { x: 2, y: 3 }],
  },
  squall: {
    id: 'squall',
    name: { en: 'Monsoon Squall', bn: 'কালবৈশাখী' },
    subtitle: { en: 'Meghna mist', bn: 'মেঘনার কুয়াশা' },
    objective: { en: 'Deliver the sealed dak bag through the rain and bell beacons before the squall breaks fully.', bn: 'বৃষ্টির কুয়াশা ও ঘণ্টার বাতিঘর দেখে সিলযুক্ত ডাকের থলি পৌঁছে দিন।' },
    description: {
      en: 'The rain reduces visibility to nearby lanterns and toll bells. Listen for signals and follow the safe channel.',
      bn: 'বৃষ্টি কুয়াশার কারণে কাছের বাতি ও ঘণ্টার শব্দ ছাড়া কিছু দেখা যায় না, তাই শব্দের দিকে নজর দিন।',
    },
    map: [
      '#########',
      '#..W....#',
      '#..G....#',
      '#.M.....#',
      '#..C....#',
      '#....W..#',
      '#########',
    ],
    start: { x: 1, y: 2 },
    destination: { x: 5, y: 3 },
    reward: 220,
    turnLimit: 12,
    weather: { en: 'Heavy rain and fog', bn: 'ঝড়ো বৃষ্টি ও ঘন কুয়াশা' },
    challenge: { en: 'Use the surrounding lantern beacons to keep in the navigable lane.', bn: 'চারপাশের বাতিঘর দেখে নৌকার খাল বেছে নিন।' },
    currents: [{ x: 3, y: 1 }, { x: 4, y: 4 }],
  },
  regatta: {
    id: 'regatta',
    name: { en: 'Grand Nabanna Regatta', bn: 'নবান্ন রেগাটা' },
    subtitle: { en: 'Delta hub', bn: 'দ্বীপ সঙ্গম' },
    objective: { en: 'Reach the festival ghat through the hub, following the market cycle and beating the dusk deadline.', bn: 'দুপুরের উল্লাস ও নবান্ন উৎসব ঘাটে পৌঁছে দেরি না করে সঙ্গম ঘাটে যান।' },
    description: {
      en: 'A final exam combines tide shifts, ferries, squalls, and multiple cargo stops across the river hub.',
      bn: 'শেষ পরীক্ষায় জোয়ার বদল, খেয়া, কুয়াশা ও একাধিক চালানের সিঁড়ি মিলিয়ে গেছে।',
    },
    map: [
      '#########',
      '#..C.M..#',
      '#.G..F..#',
      '#..C....#',
      '#...W...#',
      '#..M....#',
      '#########',
    ],
    start: { x: 1, y: 2 },
    destination: { x: 6, y: 5 },
    reward: 280,
    turnLimit: 13,
    weather: { en: 'Festival squall and fast currents', bn: 'উৎসবের ঝড় ও দ্রুত স্রোত' },
    challenge: { en: 'Make the final leg of the river hub during a brief high-tide window.', bn: 'স্বল্প জোয়ার窗口ে সঙ্গম ঘাটে পৌঁছে শেষ রাইড সেরে ফেলুন।' },
    currents: [{ x: 3, y: 1 }, { x: 5, y: 3 }, { x: 2, y: 5 }],
  },
}

export const upgradeCatalog: UpgradeDefinition[] = [
  {
    id: 'echo',
    label: { en: 'Extra Tide Echo', bn: 'অতিরিক্ত জোয়ার স্মৃতি' },
    cost: 45,
    effect: { en: '+1 rewind charge for each mission.', bn: 'প্রতিটি মিশনে +১ রিওইন্ড চার্জ।' },
  },
  {
    id: 'spyglass',
    label: { en: 'Almanac Spyglass', bn: 'পঞ্জিকা দূরবীন' },
    cost: 55,
    effect: { en: 'Forecast previews 2 extra turns ahead.', bn: 'দেখানো ফোরকাস্ট ২টি অতিরিক্ত টার্ন সামনে দেখাবে।' },
  },
  {
    id: 'hull',
    label: { en: 'Reinforced Teak Hull', bn: 'শাল কাঠের খোল' },
    cost: 60,
    effect: { en: 'One-time protection from running aground or whirlpool damage.', bn: 'একবারের জন্য চালচলনে ভুল হলে বা গোলকধাঁধায় আঘাতের সুরক্ষা।' },
  },
  {
    id: 'dak',
    label: { en: 'Waterproof Dak Satchel', bn: 'ডাক থলি' },
    cost: 50,
    effect: { en: 'Unlocks the optional sealed post-bag objective.', bn: 'ঐচ্ছিক সিলযুক্ত ডাকের থলি অংক জগতে খুলে দেবে।' },
  },
]

export const chapterLabels: Record<Lang, Record<ChapterId, string>> = {
  en: {
    shapla: 'Shapla Ghat',
    chars: 'The Shifting Chars',
    ferry: 'Kheya & Shanko',
    squall: 'Monsoon Squall',
    regatta: 'Grand Nabanna Regatta',
  },
  bn: {
    shapla: 'শাপলা ঘাট',
    chars: 'ভাসমান চর',
    ferry: 'খেয়া ও সাঁকো',
    squall: 'কালবৈশাখী',
    regatta: 'নবান্ন রেগাটা',
  },
}

export function getChapterById(id: ChapterId): ChapterConfig {
  return chapters[id]
}

export function getTidePhase(turn: number): number {
  return turn % 4
}

export function getPhaseLabel(turn: number, lang: Lang): string {
  const phase = getTidePhase(turn)
  const labels: Record<Lang, string[]> = {
    en: ['Low tide', 'Rising tide', 'High tide', 'Falling tide'],
    bn: ['নিম্ন জোয়ার', 'উত্থান', 'উচ্চ জোয়ার', 'হ্রাসমান জোয়ার'],
  }
  return labels[lang][phase]
}
