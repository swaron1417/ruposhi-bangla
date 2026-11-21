import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, MouseEvent } from 'react'
import './App.css'
import { applyInputToPlot, buyInput, buildStructure, harvestPlot, purchaseUpgrade, structureCost, unlockedCropList, upgradeCatalog, upgradePrice, plantCrop } from './economy/rules'
import { cropCatalog, inputCatalog } from './economy/crops'
import { drawVillage, plotAtPointer } from './render/drawVillage'
import { chapters, labels, LANGUAGE_STORAGE_KEY, preferredLanguage, structureNames } from './i18n'
import { chapterChecklist, chapterGoal, createInitialVillage, refreshChapterGates, setChapter, tickVillage } from './simulation/village'
import type { ChapterId, CropId, InputId, Lang, StructureType, UpgradeId, VillageState } from './simulation/types'
import { exportVillage, importVillage, loadVillage, saveVillage } from './storage/save'
import type { WalletDetails } from './wallet'

type DrawerKind = 'upgrades' | 'save' | 'settings' | 'wallet' | 'help' | null
type ApplyInputId = Extract<InputId, 'water' | 'compost' | 'tools' | 'pruningTools'>
type MapAction = { kind: 'plant'; cropId: CropId } | { kind: 'build'; structure: StructureType } | { kind: 'apply'; inputId: ApplyInputId } | null

const cropIcons: Record<CropId, string> = { paddy: '🌾', jute: '🪴', mustard: '🌼', mango: '🥭' }
const inputIcons: Record<InputId, string> = {
  paddySeeds: '🌾', juteSeeds: '🪴', mustardSeeds: '🌼', mangoSaplings: '🌱',
  water: '💧', compost: '💩', tools: '⚒️', pruningTools: '✂️',
}
const structureIcons: Record<StructureType, string> = { shed: '🏠', well: '🪣', ghat: '🛶' }
const upgradeIds: Record<keyof VillageState['upgrades'], UpgradeId> = {
  boatCapacity: 'boat-capacity',
  boatSpeed: 'boat-speed',
  farmers: 'farmer',
  irrigation: 'irrigation',
  tools: 'tools',
  market: 'market',
  autoRestock: 'auto-restock',
}
const upgradeRows: Array<[keyof VillageState['upgrades'], UpgradeId]> = [
  ['boatCapacity', 'boat-capacity'],
  ['boatSpeed', 'boat-speed'],
  ['farmers', 'farmer'],
  ['irrigation', 'irrigation'],
  ['tools', 'tools'],
  ['market', 'market'],
  ['autoRestock', 'auto-restock'],
]

function stockTotal(state: VillageState): number {
  return Object.values(state.ghatStock).reduce((total, count) => total + count, 0)
}

function walletModuleError(error: unknown): WalletDetails {
  return {
    status: 'disconnected',
    address: null,
    chainId: null,
    balance: '0 ETH',
    error: error instanceof Error ? error.message : 'Wallet integration failed to load.',
  }
}

function downloadBackup(state: VillageState): void {
  const file = new Blob([exportVillage(state)], { type: 'application/json' })
  const url = URL.createObjectURL(file)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'ruposhi-village-backup.json'
  anchor.click()
  URL.revokeObjectURL(url)
}

function App() {
  const [initialLoad] = useState(() => loadVillage(createInitialVillage()))
  const [village, setVillage] = useState(initialLoad.state)
  const [saveBlocked, setSaveBlocked] = useState(Boolean(initialLoad.error))
  const [lang, setLang] = useState<Lang>(() => preferredLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY)))
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('ruposhi-village-sound') !== 'off')
  const [drawer, setDrawer] = useState<DrawerKind>(null)
  const [mapAction, setMapAction] = useState<MapAction>(null)
  const [hoveredPlotId, setHoveredPlotId] = useState<string | null>(null)
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [storageNotice, setStorageNotice] = useState(initialLoad.error ?? '')
  const [importError, setImportError] = useState('')
  const [guideOpen, setGuideOpen] = useState(() => localStorage.getItem('ruposhi-village-guide-seen') !== 'yes')
  const [wallet, setWallet] = useState<WalletDetails>({
    status: 'disconnected', address: null, chainId: null, balance: '0 ETH', error: null,
  })
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const feedbackTimer = useRef<number | null>(null)
  const villageRef = useRef(village)
  const langRef = useRef(lang)
  const renderOptionsRef = useRef<{ placementMode?: 'plant' | 'build' | 'apply' | null; selectedInputId?: ApplyInputId; hoveredPlotId?: string | null; selectedPlotId?: string | null }>({})
  const previousRevenueRef = useRef(village.totalRevenue)
  const copy = labels[lang]
  const formatNumber = useCallback((value: number): string => new Intl.NumberFormat(lang === 'bn' ? 'bn-BD' : 'en-US').format(value), [lang])
  const chapter = chapters.find((item) => item.id === village.chapterId) ?? chapters[0]
  const goal = chapterGoal(village)
  const checklist = chapterChecklist(village)
  const currentChapterIndex = chapters.findIndex((item) => item.id === village.chapterId)
  const nextChapter = chapters[currentChapterIndex + 1]
  const unlockedCrops = unlockedCropList(village)
  const boat = village.boats[0]
  const boatStatus = boat?.status === 'outbound'
    ? copy.boatOutbound
    : boat?.status === 'returning'
      ? copy.boatReturning
      : copy.boatDocked

  const showFeedback = useCallback((message: string) => {
    setFeedback(message)
    if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current)
    feedbackTimer.current = window.setTimeout(() => setFeedback(''), 2400)
  }, [])

  useEffect(() => {
    villageRef.current = village
    langRef.current = lang
    renderOptionsRef.current = {
      placementMode: mapAction?.kind ?? null,
      selectedInputId: mapAction?.kind === 'apply' ? mapAction.inputId : undefined,
      hoveredPlotId,
      selectedPlotId,
    }
  }, [hoveredPlotId, lang, mapAction, selectedPlotId, village])

  const commitVillage = (next: VillageState): void => setVillage(refreshChapterGates(next))

  const playSaleSound = useCallback(() => {
    if (!soundEnabled || !('AudioContext' in window)) return
    const audio = new window.AudioContext()
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 660
    gain.gain.setValueAtTime(0.055, audio.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.18)
    oscillator.connect(gain)
    gain.connect(audio.destination)
    oscillator.start()
    oscillator.stop(audio.currentTime + 0.18)
    oscillator.onended = () => void audio.close()
  }, [soundEnabled])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setVillage((current) => {
        if (current.paused) return current
        let next = current
        const steps = current.speed
        for (let index = 0; index < steps; index += 1) next = tickVillage(next)
        return next
      })
    }, 500)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (saveBlocked) return
    const timer = window.setTimeout(() => {
      try {
        saveVillage(village)
      } catch (error) {
        setSaveBlocked(true)
        setStorageNotice(`Could not save village: ${error instanceof Error ? error.message : 'storage error'}`)
      }
    }, 450)
    return () => window.clearTimeout(timer)
  }, [saveBlocked, village])

  useEffect(() => {
    let frame = 0
    const draw = (now: number): void => {
      if (canvasRef.current) drawVillage(canvasRef.current, villageRef.current, langRef.current, now, renderOptionsRef.current)
      frame = window.requestAnimationFrame(draw)
    }
    frame = window.requestAnimationFrame(draw)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (drawer !== 'wallet') return
    let active = true
    const refresh = async (): Promise<void> => {
      try {
        const { loadWalletContractDetails } = await import('./wallet')
        const details = await loadWalletContractDetails()
        if (active) setWallet(details)
      } catch (error) {
        if (active) setWallet(walletModuleError(error))
      }
    }
    void refresh()
    if (!window.ethereum) return () => { active = false }
    const onChanged = (): void => { void refresh() }
    window.ethereum.on('accountsChanged', onChanged)
    window.ethereum.on('chainChanged', onChanged)
    return () => {
      active = false
      window.ethereum?.removeListener('accountsChanged', onChanged)
      window.ethereum?.removeListener('chainChanged', onChanged)
    }
  }, [drawer])

  useEffect(() => {
    document.documentElement.lang = lang
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
  }, [lang])

  useEffect(() => {
    localStorage.setItem('ruposhi-village-sound', soundEnabled ? 'on' : 'off')
  }, [soundEnabled])

  useEffect(() => {
    if (village.totalRevenue <= previousRevenueRef.current) return
    const earned = village.totalRevenue - previousRevenueRef.current
    previousRevenueRef.current = village.totalRevenue
    playSaleSound()
    showFeedback(`${copy.saleToast} +৳${formatNumber(earned)}`)
  }, [copy.saleToast, formatNumber, lang, playSaleSound, showFeedback, village.totalRevenue])

  useEffect(() => {
    if (!drawer) return
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setDrawer(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [drawer])

  useEffect(() => () => {
    if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current)
  }, [])

  const restartVillage = (): void => {
    localStorage.removeItem('ruposhi-village-save-v1')
    const fresh = createInitialVillage()
    setVillage(fresh)
    villageRef.current = fresh
    previousRevenueRef.current = fresh.totalRevenue
    setMapAction(null)
    setSelectedPlotId(null)
    setHoveredPlotId(null)
    setResetConfirmOpen(false)
    setStorageNotice('')
    setSaveBlocked(false)
    setGuideOpen(true)
    showFeedback(copy.restartDone)
  }

  const dismissGuide = (): void => {
    setGuideOpen(false)
    localStorage.setItem('ruposhi-village-guide-seen', 'yes')
  }

  const handleCanvasClick = (event: MouseEvent<HTMLCanvasElement>): void => {
    const location = plotAtPointer(event.currentTarget, event.clientX, event.clientY)
    if (!location) return
    const plot = village.plots.find((item) => item.id === location.id)
    if (!plot) {
      showFeedback(copy.occupiedPlot)
      return
    }
    if (!mapAction) {
      setSelectedPlotId(plot.id)
      return
    }
    const result = mapAction.kind === 'plant'
      ? plantCrop(village, plot.id, mapAction.cropId, lang)
      : mapAction.kind === 'build'
        ? buildStructure(village, plot.id, mapAction.structure, lang)
        : applyInputToPlot(village, plot.id, mapAction.inputId, lang)
    showFeedback(result.message)
    if (!result.ok) return
    if (mapAction.kind === 'apply') playSaleSound()
    commitVillage(result.state)
    setSelectedPlotId(plot.id)
    setMapAction(null)
  }

  const buySupply = (inputId: InputId): void => {
    const result = buyInput(village, inputId, lang)
    showFeedback(result.message)
    if (result.ok) commitVillage(result.state)
  }

  const applySupply = (inputId: ApplyInputId, plotId: string): void => {
    const result = applyInputToPlot(village, plotId, inputId, lang)
    showFeedback(result.message)
    if (result.ok) {
      playSaleSound()
      commitVillage(result.state)
      setSelectedPlotId(plotId)
      setMapAction(null)
    }
  }

  const harvestField = (plotId: string): void => {
    const result = harvestPlot(village, plotId, lang)
    showFeedback(result.message)
    if (result.ok) commitVillage(result.state)
  }

  const buyUpgrade = (id: keyof VillageState['upgrades']): void => {
    const upgradeId = upgradeIds[id]
    const result = purchaseUpgrade(village, upgradeId, lang)
    showFeedback(result.message)
    if (result.ok) commitVillage(result.state)
  }

  const toggleAutoRestock = (): void => {
    if (village.upgrades.autoRestock < 1) {
      showFeedback(copy.restockUpgradeRequired)
      return
    }
    commitVillage({ ...village, autoRestockEnabled: !village.autoRestockEnabled })
  }

  const selectChapter = (chapterId: ChapterId): void => {
    const next = setChapter(village, chapterId)
    if (next === village) return
    commitVillage(next)
    setMapAction(null)
    showFeedback(copy.chapterChanged)
  }

  const onImportFile = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const imported = importVillage(await file.text())
      setVillage(imported)
      setSaveBlocked(false)
      setStorageNotice('')
      previousRevenueRef.current = imported.totalRevenue
      setImportError('')
      showFeedback(copy.backupRestored)
    } catch (error) {
      setImportError(`${copy.restoreError} ${error instanceof Error ? error.message : ''}`)
    } finally {
      event.target.value = ''
    }
  }

  const connect = async (): Promise<void> => {
    try {
      const { connectWallet } = await import('./wallet')
      setWallet(await connectWallet())
    } catch (error) {
      setWallet(walletModuleError(error))
    }
  }
  const switchNetwork = async (): Promise<void> => {
    try {
      const { switchToSepolia } = await import('./wallet')
      setWallet(await switchToSepolia())
    } catch (error) {
      setWallet(walletModuleError(error))
    }
  }
  const claimFaucet = async (): Promise<void> => {
    try {
      const { claimPadmaFaucet } = await import('./wallet')
      setWallet(await claimPadmaFaucet())
    } catch (error) {
      setWallet(walletModuleError(error))
    }
  }
  const mintBadge = async (chapter: number): Promise<void> => {
    try {
      const { mintChapterBadge } = await import('./wallet')
      setWallet(await mintChapterBadge(chapter))
    } catch (error) {
      setWallet(walletModuleError(error))
    }
  }

  const openDrawer = (target: DrawerKind): void => setDrawer(target)

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-icon" aria-hidden="true">🌾</span>
          <div>
            <h1>রূপসী বাংলা <span>Ruposhi Bangla</span></h1>
            <p>{copy.tagline}</p>
          </div>
        </div>
        <div className="hud-pills">
          <div className="hud-pill"><span>🪙</span><div><small>{copy.credits}</small><strong>৳{formatNumber(village.credits)}</strong></div></div>
          <div className="hud-pill"><span>🌾</span><div><small>{copy.stock}</small><strong>{formatNumber(stockTotal(village))} {copy.bundles}</strong></div></div>
          <div className="hud-pill"><span>⛵</span><div><small>{copy.boats}</small><strong>{boatStatus}</strong></div></div>
          <div className="hud-pill goal-pill"><span>🎯</span><div><small>{copy.goal} · {copy.chapter} {chapters.indexOf(chapter) + 1}</small><strong>{goal.current}/{goal.target} · {chapter.name[lang]}</strong></div></div>
        </div>
        <nav className="header-tools" aria-label={copy.panelNavigation}>
          <select className="language-selector" aria-label={copy.language} value={lang} onChange={(event) => setLang(event.target.value as Lang)}>
            <option value="bn">বাংলা</option>
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
          <button type="button" className="icon-button restart-button" title={copy.restart} aria-label={copy.restart} onClick={() => setResetConfirmOpen(true)}>↻</button>
          <button type="button" className="icon-button" title={copy.upgrades} aria-label={copy.upgrades} onClick={() => openDrawer('upgrades')}>⬆</button>
          <button type="button" className="icon-button" title={copy.backup} aria-label={copy.backup} onClick={() => openDrawer('save')}>💾</button>
          <button type="button" className="icon-button" title={copy.settings} aria-label={copy.settings} onClick={() => openDrawer('settings')}>⚙</button>
          <button type="button" className="icon-button" title={copy.wallet} aria-label={copy.wallet} onClick={() => openDrawer('wallet')}>👛</button>
          <button type="button" className="icon-button help-button" title={copy.closeGuide} aria-label={copy.closeGuide} onClick={() => openDrawer('help')}>?</button>
        </nav>
      </header>

      <section className="game-layout">
        <div className="map-column">
          <div className="map-heading">
            <div className="chapter-picker">
              <span className="chapter-mark">{formatNumber(chapters.indexOf(chapter) + 1)}</span>
              <div><p>{copy.chapter} {formatNumber(chapters.indexOf(chapter) + 1)}</p><h2>{chapter.name[lang]}</h2></div>
              <select aria-label={copy.chapter} value={village.chapterId} onChange={(event) => selectChapter(event.target.value as ChapterId)}>
                {chapters.map((item, index) => {
                  const allowed = index === currentChapterIndex
                    || (index < currentChapterIndex && village.completedChapters.includes(item.id))
                    || (index === currentChapterIndex + 1 && goal.complete)
                  return <option key={item.id} value={item.id} disabled={!allowed}>
                    {formatNumber(index + 1)}. {item.name[lang]}{allowed ? '' : ` · 🔒`}
                  </option>
                })}
              </select>
            </div>
            <div className="simulation-controls">
              <span className="turn-count">{copy.day} {formatNumber(village.day)} · {copy[village.dayPhase]}</span>
              <button type="button" className="play-button" onClick={() => setVillage({ ...village, paused: !village.paused })}>
                {village.paused ? `▶ ${copy.play}` : `Ⅱ ${copy.pause}`}
              </button>
              <button type="button" className={`speed-button ${village.speed === 2 ? 'selected' : ''}`} onClick={() => setVillage({ ...village, speed: village.speed === 1 ? 2 : 1 })}>
                {village.speed === 2 ? '✓ ' : ''}{copy.speed}
              </button>
            </div>
          </div>
          <div className="goal-track" role="progressbar" aria-valuenow={Math.min(goal.current, goal.target)} aria-valuemin={0} aria-valuemax={goal.target} aria-label={chapter.goal[lang]}>
            <span style={{ width: `${Math.min(100, (goal.current / goal.target) * 100)}%` }} />
          </div>
          <p className="goal-caption">{chapter.goal[lang]} · {formatNumber(goal.current)}/{formatNumber(goal.target)} {copy.conditionsMet}</p>

          <div className="map-card">
            <canvas
              ref={canvasRef}
              className="village-canvas"
              onClick={handleCanvasClick}
              onMouseMove={(event) => {
                const plot = plotAtPointer(event.currentTarget, event.clientX, event.clientY)
                setHoveredPlotId(plot?.id ?? null)
              }}
              onMouseLeave={(event) => {
                const inspector = event.currentTarget.parentElement?.querySelector('.field-inspector')
                if (event.relatedTarget instanceof Node && inspector?.contains(event.relatedTarget)) return
                setHoveredPlotId(null)
              }}
              role="img"
              aria-label={copy.mapDescription}
            />
            {guideOpen && <aside className="welcome-guide">
              <button type="button" className="guide-close" aria-label={copy.close} onClick={dismissGuide}>×</button>
              <span className="guide-kicker">🌱 {copy.tutorialTitle}</span>
              <h3>{copy.tutorialStepsTitle}</h3>
              <ol><li>{copy.tutorial1}</li><li>{copy.tutorial2}</li><li>{copy.tutorial3}</li></ol>
              <button type="button" className="primary-button" onClick={dismissGuide}>{copy.gotIt}</button>
            </aside>}
            {feedback && <div className="feedback-toast" role="status">{feedback}</div>}
            {(hoveredPlotId || selectedPlotId) && (() => {
              const inspectId = hoveredPlotId ?? selectedPlotId
              const plot = village.plots.find((item) => item.id === inspectId)
              if (!plot) return null
              const definition = plot.crop ? cropCatalog[plot.crop] : null
              const growthPercent = definition ? Math.min(100, Math.round(plot.growth / definition.growthTicks * 100)) : 0
              const waterPercent = Math.min(100, Math.round(plot.waterReserve / 4 * 100))
              const inspected = hoveredPlotId === inspectId || selectedPlotId === inspectId
              if (!inspected) return null
              return <aside className="field-inspector" onMouseLeave={() => {
                if (!selectedPlotId) setHoveredPlotId(null)
              }}>
                <button type="button" className="inspector-close" aria-label={copy.close} onClick={() => { setSelectedPlotId(null); setHoveredPlotId(null) }}>×</button>
                <h3>{copy.fieldInspector} · {plot.crop ? cropCatalog[plot.crop].name[lang] : `#${plot.id.replace('plot-', '')}`}</h3>
                {!plot.crop ? <p>{copy.notPlanted}</p> : <>
                  {[
                    [copy.water, waterPercent, `${plot.waterReserve}/4 · ${copy.available}: ${village.inputs.water}`],
                    [copy.fertilizer, plot.compostBoost ? 100 : 0, plot.compostBoost ? copy.applied : copy.notRequired],
                    [copy.toolsLabel, plot.toolsApplied ? 100 : 0, plot.toolsApplied ? copy.applied : copy.notApplied],
                    [copy.growth, growthPercent, `${growthPercent}%`],
                  ].map(([label, percent, value]) => <div className="inspector-meter" key={String(label)}>
                    <div><span>{label}</span><strong>{value}</strong></div><i><span style={{ width: `${Number(percent)}%` }} /></i>
                  </div>)}
                </>}
                <div className="inspector-refills">
                  {(['water', 'compost', plot.crop === 'mango' ? 'pruningTools' : 'tools'] as ApplyInputId[]).map((inputId) => <button type="button" key={inputId} disabled={!plot.crop} onClick={() => applySupply(inputId, plot.id)} title={`${inputCatalog[inputId].name[lang]} · ${copy.costShort} ৳${inputCatalog[inputId].price}`}>
                    {inputIcons[inputId]} {copy.apply}
                  </button>)}
                  <button type="button" disabled={!plot.crop || plot.stage !== 'ready'} onClick={() => harvestField(plot.id)}>{cropIcons[plot.crop ?? 'paddy']} {copy.harvest}</button>
                </div>
              </aside>
            })()}
            {goal.complete && <div className="milestone-banner" role="status">✨ {copy.chapterDone}</div>}
            {goal.deadlineMissed && <div className="milestone-banner warning-banner" role="status">⏳ {copy.deadline}
              <button type="button" onClick={() => setVillage(setChapter(village, village.chapterId))}>{copy.next}</button>
            </div>}
            {storageNotice && <div className="milestone-banner warning-banner storage-banner" role="alert">
              <span>{copy.saveWarning} {storageNotice}</span>
              <button type="button" onClick={() => openDrawer('save')}>{copy.backup}</button>
            </div>}
          </div>
          <div className="map-footer">
            <p>{copy.flow}</p>
            <div className="legend-row"><span>🟦 {copy.river}</span><span>🌱 {copy.field}</span><span>🧑‍🌾 {copy.farmer}</span><span>🛶 {copy.ghat}</span><span>🚩 {copy.haat}</span></div>
          </div>
        </div>

        <aside className="left-dock quick-dock">
          <div className="dock-heading"><span>🌱</span><div><h2>{copy.leftDock}</h2><p>{copy.selectField}</p></div></div>
          {(['paddy', 'jute', 'mustard', 'mango'] as CropId[]).map((cropId) => {
            const crop = cropCatalog[cropId]
            const seedCount = village.inputs[crop.seed]
            const seedPrice = inputCatalog[crop.seed].price
            const selected = mapAction?.kind === 'plant' && mapAction.cropId === cropId
            const unlocked = unlockedCrops.includes(cropId)
            return <article className={`dock-option crop-option ${selected ? 'selected' : ''}`} key={cropId}>
              <button type="button" disabled={!unlocked || seedCount < 1} className="option-main" onClick={() => { setMapAction({ kind: 'plant', cropId }); setSelectedPlotId(null) }}>
                <span className="option-icon">{cropIcons[cropId]}</span><span><strong>{crop.name[lang]}</strong><small>{unlocked ? `${seedCount} ${copy.seeds}` : copy.notUnlocked}</small></span>
              </button>
              <div className="option-actions">
                <small>{unlocked ? `${copy.seedCost} ৳${seedPrice}` : '🔒'}</small>
                <button type="button" disabled={!unlocked || village.credits < seedPrice} aria-label={`${copy.refill} ${crop.name[lang]}`} onClick={() => buySupply(crop.seed)}>＋</button>
              </div>
            </article>
          })}
          <div className="dock-instruction">{mapAction?.kind === 'plant' ? `✨ ${cropCatalog[mapAction.cropId].name[lang]} · ${copy.selectField}` : copy.selectField}</div>
        </aside>

        <aside className="right-dock quick-dock">
          <div className="dock-heading"><span>🧺</span><div><h2>{copy.rightDock}</h2><p>{copy.selectTool}</p></div></div>
          {(Object.keys(inputCatalog) as InputId[]).map((inputId) => {
            const item = inputCatalog[inputId]
            const canApply = inputId === 'water' || inputId === 'compost' || inputId === 'tools' || inputId === 'pruningTools'
            const selected = mapAction?.kind === 'apply' && mapAction.inputId === inputId
            return <article className={`dock-option supply-option ${selected ? 'selected' : ''}`} key={inputId}>
              <div className="option-main"><span className="option-icon">{inputIcons[inputId]}</span><span><strong>{item.name[lang]}</strong><small>{copy.available}: {village.inputs[inputId]}</small></span></div>
              <div className="supply-actions">
                {canApply && <button type="button" className="apply-option" aria-pressed={selected} onClick={() => {
                  setMapAction({ kind: 'apply', inputId })
                  setSelectedPlotId(null)
                }}>{selected ? `✓ ${copy.apply}` : copy.apply}</button>}
                <button type="button" className="buy-option" disabled={village.credits < item.price} onClick={() => buySupply(inputId)}>৳{item.price}</button>
              </div>
            </article>
          })}
          <div className="dock-subheading">🏗️ {copy.buildStructures}</div>
          {(['shed', 'well', 'ghat'] as StructureType[]).map((structure) => {
            const cost = structureCost[structure]
            const selected = mapAction?.kind === 'build' && mapAction.structure === structure
            return <button type="button" key={structure} disabled={village.credits < cost} className={`build-option ${selected ? 'selected' : ''}`} onClick={() => { setMapAction({ kind: 'build', structure }); setSelectedPlotId(null) }}>
              <span>{structureIcons[structure]} {structureNames[lang][structure]}</span><b>৳{cost}</b>
            </button>
          })}
          <button type="button" className={`auto-restock-row ${village.autoRestockEnabled ? 'selected' : ''}`} onClick={toggleAutoRestock}>
            🔁 {copy.autoRestock} <span>{village.upgrades.autoRestock ? (village.autoRestockEnabled ? '✓' : '○') : '🔒'}</span>
          </button>
        </aside>

        <aside className="village-sidebar">
          <section className="side-card objective-card">
            <div className="card-title-row"><span className="card-icon">🎯</span><div><small>{copy.goal}</small><h3>{chapter.name[lang]}</h3></div></div>
            <p>{chapter.goal[lang]}</p>
            <div className="side-progress"><span style={{ width: `${Math.min(100, (goal.current / goal.target) * 100)}%` }} /></div>
            <strong>{formatNumber(goal.current)} / {formatNumber(goal.target)} <small>{copy.conditionsMet}</small></strong>
            <div className="chapter-checklist" aria-label={copy.requirements}>
              {checklist.map((item) => <div className={`checklist-row ${item.complete ? 'complete' : ''}`} key={item.id}>
                <span>{item.complete ? '✅' : '🔒'}</span><span>{item.label[lang]}</span><strong>{formatNumber(item.current)}/{formatNumber(item.target)}</strong>
              </div>)}
            </div>
            <button type="button" className="next-chapter-button" disabled={!goal.complete || !nextChapter} onClick={() => nextChapter && selectChapter(nextChapter.id)}>
              {goal.complete ? `➡ ${copy.nextChapter}` : `🔒 ${copy.nextChapter}`}
            </button>
            {!goal.complete && <small className="locked-hint">{copy.lockedUntil}</small>}
          </section>
          <section className="side-card village-stats">
            <div><span>🧑‍🌾</span><strong>{village.workers.length}</strong><small>{copy.farmers}</small></div>
            <div><span>🌾</span><strong>{village.totalSold}</strong><small>{copy.totalSold}</small></div>
            <div><span>💰</span><strong>৳{village.totalRevenue}</strong><small>{copy.totalIncome}</small></div>
          </section>
          <section className="side-card stock-card">
            <div className="card-title-row"><span className="card-icon">📦</span><div><small>{copy.stock}</small><h3>{copy.waitBoat}</h3></div></div>
            {Object.entries(cropCatalog).map(([id, crop]) => <div className="stock-row" key={id}><span>{cropIcons[id as CropId]} {crop.name[lang]}</span><strong>{village.ghatStock[id as CropId]}</strong></div>)}
          </section>
          <section className="side-card chapter-card">
            <div className="card-title-row"><span className="card-icon">📖</span><div><small>{copy.villageStory}</small><h3>{copy.fiveMilestones}</h3></div></div>
            {chapters.map((item, index) => <div className={`chapter-row ${item.id === village.chapterId ? 'current' : ''}`} key={item.id}>
              <span>{village.completedChapters.includes(item.id) ? '✓' : village.unlockedChapters.includes(item.id) ? index + 1 : '🔒'}</span><span>{item.name[lang]}</span>
            </div>)}
          </section>
        </aside>

      </section>

      {resetConfirmOpen && <div className="drawer-backdrop reset-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setResetConfirmOpen(false) }}>
        <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="reset-title">
          <h2 id="reset-title">{copy.restartTitle}</h2>
          <p>{copy.restartConfirm}</p>
          <div className="confirm-actions"><button type="button" className="secondary-button" onClick={() => setResetConfirmOpen(false)}>{copy.cancel}</button><button type="button" className="primary-button" onClick={restartVillage}>{copy.restartConfirmButton}</button></div>
        </section>
      </div>}

      {drawer && <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDrawer(null) }}>
        <section className="drawer-panel" role="dialog" aria-modal="true" aria-labelledby="drawer-heading">
          <div className="drawer-heading"><h2 id="drawer-heading">{drawer === 'upgrades' ? copy.upgrades : drawer === 'save' ? copy.backupTitle : drawer === 'settings' ? copy.settings : drawer === 'wallet' ? copy.walletTitle : copy.helpTitle}</h2><button type="button" className="close-button" aria-label={copy.close} onClick={() => setDrawer(null)}>×</button></div>
          {drawer === 'upgrades' && <div className="drawer-body upgrade-list">
            {upgradeRows.map(([key, id]) => {
              const item = upgradeCatalog[id]
              const level = village.upgrades[key]
              const cost = upgradePrice(id, level)
              const alreadyOwned = key === 'autoRestock' && level > 0
              return <article className="upgrade-item" key={key}>
                <div className="upgrade-icon">{key === 'farmers' ? '🧑‍🌾' : key.startsWith('boat') ? '⛵' : key === 'market' ? '🏮' : key === 'irrigation' ? '💧' : key === 'tools' ? '⚒️' : '🔁'}</div>
                <div className="upgrade-copy"><h3>{item.label[lang]}</h3><p>{item.effect[lang]}</p><small>{copy.level} {level}</small></div>
                <button type="button" disabled={alreadyOwned || village.credits < cost} onClick={() => buyUpgrade(key)}>{alreadyOwned ? '✓' : `৳${cost}`}</button>
              </article>
            })}
          </div>}
          {drawer === 'save' && <div className="drawer-body save-panel">
            <p>{copy.saveHint}</p>
            <button type="button" className="primary-button" onClick={() => {
              try {
                saveVillage(village)
                setSaveBlocked(false)
                setStorageNotice('')
                showFeedback(copy.saved)
              } catch (error) {
                setStorageNotice(`Save failed: ${error instanceof Error ? error.message : 'storage error'}`)
              }
            }}>💾 {copy.saveNow}</button>
            <button type="button" className="secondary-button" onClick={() => downloadBackup(village)}>⬇ {copy.export}</button>
            <button type="button" className="secondary-button" onClick={() => fileInputRef.current?.click()}>↥ {copy.import}</button>
            <input ref={fileInputRef} className="sr-only" type="file" accept="application/json,.json" onChange={(event) => { void onImportFile(event) }} />
            {importError && <p className="error-message" role="alert">{importError}</p>}
          </div>}
          {drawer === 'settings' && <div className="drawer-body settings-panel">
            <label>{copy.language}<select value={lang} onChange={(event) => setLang(event.target.value as Lang)}><option value="bn">বাংলা</option><option value="en">English</option><option value="zh">中文</option></select></label>
            <div className="setting-row"><span>{copy.sound}</span><button type="button" className="toggle-button" aria-pressed={soundEnabled} onClick={() => setSoundEnabled(!soundEnabled)}>{soundEnabled ? copy.soundOn : copy.soundOff}</button></div>
          </div>}
          {drawer === 'wallet' && <div className="drawer-body wallet-panel">
            <p>{copy.walletOptional}</p>
            <div className={`wallet-status ${wallet.status}`}><span>{wallet.status === 'connected' ? '🟢' : wallet.status === 'wrong-network' ? '🟠' : '⚪'}</span>{wallet.status === 'connected' ? copy.online : wallet.status === 'wrong-network' ? copy.wrongNetwork : copy.disconnected}</div>
            {wallet.address && <div className="wallet-detail"><small>{copy.address}</small><strong>{wallet.address}</strong></div>}
            <div className="wallet-detail"><small>{copy.balance}</small><strong>{wallet.balance}</strong></div>
            {wallet.status === 'connected' && <>
              <div className="wallet-detail"><small>{copy.padmaBalance}</small><strong>{wallet.padmaBalance ?? '0 PADMA'}</strong></div>
              <button type="button" className="primary-button" onClick={() => { void claimFaucet() }}>💧 {copy.claimFaucet}</button>
              <div className="wallet-detail"><small>{copy.ownedBadges}</small><strong>{wallet.ownedBadges?.length ? wallet.ownedBadges.join(', ') : '—'}</strong></div>
              {chapters.map((item, index) => {
                const chapterNumber = index + 1
                const unlocked = village.completedChapters.includes(item.id) || village.chapterId === item.id && chapterGoal(village).complete
                const owned = wallet.ownedBadges?.includes(chapterNumber)
                return <button type="button" key={item.id} className="secondary-button" disabled={!unlocked || owned} onClick={() => { void mintBadge(chapterNumber) }}>
                  🏅 {copy.mintBadge}: {item.name[lang]}{owned ? ' ✓' : ''}
                </button>
              })}
            </>}
            {wallet.transactionHash && <div className="wallet-detail"><small>{wallet.transactionStatus === 'confirmed' ? copy.transactionConfirmed : copy.transactionPending}</small><a href={wallet.etherscanUrl ?? undefined} target="_blank" rel="noreferrer">{copy.viewEtherscan} · {wallet.transactionHash.slice(0, 12)}…</a></div>}
            {wallet.error && <p className="error-message" role="alert">{wallet.error === 'MetaMask is not installed.' ? copy.noWallet : wallet.error}</p>}
            {wallet.status === 'wrong-network'
              ? <button type="button" className="primary-button" onClick={() => { void switchNetwork() }}>{copy.switch}</button>
              : <button type="button" className="primary-button" onClick={() => { void connect() }}>🦊 {copy.connect}</button>}
            <small className="wallet-footnote">Sepolia · Chain ID 11155111</small>
          </div>}
          {drawer === 'help' && <div className="drawer-body help-panel">
            <p>{copy.flow}</p>
            <div className="help-step"><span>1</span><p>{copy.tutorial1}</p></div>
            <div className="help-step"><span>2</span><p>{copy.tutorial2}</p></div>
            <div className="help-step"><span>3</span><p>{copy.tutorial3}</p></div>
            <div className="help-legend"><span>🟦 {copy.river}</span><span>🌱 {copy.field}</span><span>💧 {copy.waterDrop}</span><span>🚩 {copy.haatSale}</span></div>
          </div>}
        </section>
      </div>}
    </main>
  )
}

export default App
