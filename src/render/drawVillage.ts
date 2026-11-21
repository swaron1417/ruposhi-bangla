import { cropCatalog } from '../economy/crops'
import { getBoatPosition } from '../simulation/village'
import { farmPlotLocations, haatPosition, MAP_COLS, MAP_ROWS, riverRoute, type FarmPlot, type Point, type VillageState, type Worker as VillageWorker } from '../simulation/types'
import type { Lang } from '../simulation/types'
import { labels } from '../i18n'

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void => {
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)
}

function stockTotal(stock: VillageState['ghatStock']): number {
  return Object.values(stock).reduce((total, amount) => total + amount, 0)
}

function drawScenery(ctx: CanvasRenderingContext2D, tileW: number, tileH: number, now: number): void {
  const trees = [
    { x: .6, y: 3.1, kind: 'palm' },
    { x: 2.25, y: .45, kind: 'banana' },
    { x: 5.65, y: 6.95, kind: 'palm' },
    { x: 7.35, y: .55, kind: 'banana' },
    { x: 10.45, y: 6.9, kind: 'palm' },
    { x: 1.1, y: 7.1, kind: 'banana' },
  ]
  for (const [index, tree] of trees.entries()) {
    const x = tree.x * tileW
    const y = tree.y * tileH
    const sway = Math.sin(now / 580 + index * 1.7) * tileW * .025
    const size = Math.min(tileW, tileH)
    ctx.save()
    ctx.fillStyle = 'rgba(43, 82, 50, .17)'
    ctx.beginPath()
    ctx.ellipse(x, y + size * .2, size * .26, size * .08, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#795b3c'
    ctx.lineWidth = size * .075
    ctx.beginPath()
    ctx.moveTo(x, y + size * .2)
    ctx.quadraticCurveTo(x + sway * .3, y - size * .05, x + sway, y - size * .28)
    ctx.stroke()
    for (let leaf = 0; leaf < (tree.kind === 'palm' ? 6 : 5); leaf += 1) {
      const angle = -Math.PI * .83 + leaf * (tree.kind === 'palm' ? .34 : .44) + sway / size
      const length = size * (tree.kind === 'palm' ? .39 : .29)
      const centerX = x + sway
      const centerY = y - size * .27
      ctx.strokeStyle = tree.kind === 'palm' ? '#3d7750' : '#4d8c4c'
      ctx.lineWidth = size * .055
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.quadraticCurveTo(centerX + Math.cos(angle) * length * .55, centerY + Math.sin(angle) * length * .45 + size * .04, centerX + Math.cos(angle) * length, centerY + Math.sin(angle) * length)
      ctx.stroke()
      if (tree.kind === 'banana') {
        ctx.fillStyle = '#5b9654'
        ctx.beginPath()
        ctx.ellipse(centerX + Math.cos(angle) * length * .65, centerY + Math.sin(angle) * length * .65, size * .14, size * .055, angle, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    if (tree.kind === 'palm') {
      ctx.fillStyle = '#aa8c42'
      ctx.beginPath()
      ctx.ellipse(x + sway, y - size * .21, size * .055, size * .09, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  for (let bird = 0; bird < 3; bird += 1) {
    const x = ((now * .000035 + bird * .39) % 1.15 - .08) * MAP_COLS * tileW
    const y = tileH * (.55 + bird * .43 + Math.sin(now / 620 + bird) * .12)
    const flap = Math.sin(now / 120 + bird) * tileH * .025
    ctx.save()
    ctx.strokeStyle = 'rgba(255, 255, 244, .92)'
    ctx.lineWidth = Math.max(1.2, tileW * .018)
    ctx.beginPath()
    ctx.moveTo(x - tileW * .06, y + flap)
    ctx.quadraticCurveTo(x - tileW * .03, y - tileH * .06 - flap, x, y)
    ctx.quadraticCurveTo(x + tileW * .03, y - tileH * .06 + flap, x + tileW * .06, y + flap * .35)
    ctx.stroke()
    ctx.restore()
  }
}

function drawRiver(ctx: CanvasRenderingContext2D, tileW: number, tileH: number, now: number): void {
  const points = riverRoute.map((point) => ({ x: (point.x + 0.5) * tileW, y: (point.y + 0.5) * tileH }))
  const trace = (): void => {
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let index = 1; index < points.length - 1; index += 1) {
      const current = points[index]
      const next = points[index + 1]
      const midX = (current.x + next.x) / 2
      const midY = (current.y + next.y) / 2
      ctx.quadraticCurveTo(current.x, current.y, midX, midY)
    }
    const last = points[points.length - 1]
    ctx.lineTo(last.x, last.y)
  }
  trace()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = 'rgba(20, 92, 102, .3)'
  ctx.lineWidth = Math.min(tileW, tileH) * 1.12
  ctx.stroke()
  trace()
  ctx.strokeStyle = '#3a9a9b'
  ctx.lineWidth = Math.min(tileW, tileH) * .83
  ctx.stroke()
  trace()
  ctx.strokeStyle = 'rgba(178, 232, 214, .42)'
  ctx.lineWidth = Math.min(tileW, tileH) * .035
  ctx.setLineDash([tileW * .08, tileW * .12])
  ctx.lineDashOffset = -now * .012
  ctx.stroke()
  ctx.setLineDash([])
  ctx.save()
  ctx.globalAlpha = .47
  for (let index = 0; index < 17; index += 1) {
    const phase = now * .0014 + index * 1.73
    const routeIndex = (index * 0.53 + now * .00016) % (points.length - 1)
    const segment = Math.floor(routeIndex)
    const mix = routeIndex - segment
    const start = points[segment]
    const end = points[segment + 1]
    const centerX = start.x + (end.x - start.x) * mix + Math.sin(phase) * tileW * .08
    const centerY = start.y + (end.y - start.y) * mix + Math.cos(phase) * tileH * .055
    const length = tileW * (.07 + (index % 3) * .025)
    ctx.beginPath()
    ctx.ellipse(centerX, centerY, length, Math.max(1.2, tileH * .014), Math.atan2(end.y - start.y, end.x - start.x), 0, Math.PI * 1.15)
    ctx.strokeStyle = index % 4 === 0 ? '#f8edbd' : '#c7eee0'
    ctx.lineWidth = Math.max(1.2, tileW * .014)
    ctx.stroke()
  }
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = 'rgba(230, 243, 206, .72)'
  ctx.lineWidth = Math.max(1.1, tileW * .022)
  ctx.setLineDash([tileW * .035, tileW * .055])
  ctx.lineDashOffset = now * .009
  trace()
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()

  for (const [index, point] of [[0, { x: 5.2, y: 3.85 }], [1, { x: 7.4, y: 3.24 }], [2, { x: 9.6, y: 2.25 }]] as const) {
    const cx = (point.x + .5) * tileW
    const cy = (point.y + .5) * tileH
    const pulse = .9 + Math.sin(now / 310 + index) * .12
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(-.25)
    ctx.fillStyle = '#438b72'
    for (let petal = 0; petal < 5; petal += 1) {
      ctx.save()
      ctx.rotate(petal * Math.PI * 2 / 5)
      ctx.beginPath()
      ctx.ellipse(0, -tileH * .065 * pulse, tileW * .022, tileH * .065 * pulse, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    ctx.fillStyle = '#fff4db'
    ctx.beginPath()
    ctx.arc(0, 0, tileW * .025, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#e6bb51'
    ctx.beginPath()
    ctx.arc(0, 0, tileW * .011, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

function drawMarket(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, lang: Lang, now: number): void {
  const cx = x + size * .5
  ctx.save()
  ctx.shadowColor = 'rgba(75, 43, 21, .22)'
  ctx.shadowBlur = size * .14
  roundRect(ctx, x + size * .13, y + size * .36, size * .74, size * .49, size * .08)
  ctx.fillStyle = '#c28a4d'
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.fillStyle = '#9b5b39'
  ctx.beginPath()
  ctx.moveTo(x + size * .08, y + size * .4)
  ctx.lineTo(cx, y + size * .1)
  ctx.lineTo(x + size * .92, y + size * .4)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#60462e'
  ctx.lineWidth = Math.max(1, size * .025)
  ctx.beginPath()
  ctx.moveTo(x + size * .79, y + size * .13)
  ctx.lineTo(x + size * .79, y + size * .4)
  ctx.stroke()
  const flagSway = Math.sin(now / 170) * size * .025
  ctx.fillStyle = '#c95340'
  ctx.beginPath()
  ctx.moveTo(x + size * .8, y + size * .15)
  ctx.quadraticCurveTo(x + size * .91 + flagSway, y + size * .15, x + size * .96 + flagSway, y + size * .2)
  ctx.quadraticCurveTo(x + size * .91 + flagSway, y + size * .24, x + size * .8, y + size * .24)
  ctx.closePath()
  ctx.fill()
  ctx.save()
  ctx.shadowColor = 'rgba(255, 210, 100, .85)'
  ctx.shadowBlur = size * .16
  ctx.fillStyle = '#ffdb71'
  ctx.beginPath()
  ctx.arc(x + size * .8, y + size * .31, size * .028, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  ctx.fillStyle = '#f1d78d'
  ctx.fillRect(x + size * .2, y + size * .45, size * .6, size * .08)
  ctx.fillStyle = '#fff4bd'
  ctx.font = `600 ${Math.max(7, size * .11)}px "Noto Sans Bengali", sans-serif`
  ctx.textAlign = 'center'
  ctx.fillText(labels[lang].haat.toLocaleUpperCase(), cx, y + size * .7)
  ctx.restore()
}

function drawFarmPlot(
  ctx: CanvasRenderingContext2D,
  plot: FarmPlot,
  tileW: number,
  tileH: number,
  now: number,
  lang: Lang,
  highlighted: boolean,
  hovered: boolean,
): void {
  const x = plot.x * tileW
  const y = plot.y * tileH
  const padX = tileW * .12
  const padY = tileH * .15
  const width = tileW - padX * 2
  const height = tileH - padY * 2
  ctx.save()
  roundRect(ctx, x + padX, y + padY, width, height, Math.min(tileW, tileH) * .1)
  ctx.fillStyle = plot.crop ? '#7a6843' : '#987b4f'
  ctx.fill()
  ctx.strokeStyle = highlighted ? '#f5ef9e' : hovered ? '#f8fff0' : 'rgba(248, 226, 166, .54)'
  ctx.lineWidth = highlighted || hovered ? Math.max(2.4, tileW * .035) : 1
  if (highlighted) {
    ctx.shadowColor = '#f8ed87'
    ctx.shadowBlur = tileW * .12
  }
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.beginPath()
  ctx.moveTo(x + padX * 1.7, y + height * .48 + padY)
  ctx.lineTo(x + width + padX * .3, y + height * .48 + padY)
  ctx.strokeStyle = 'rgba(237, 211, 148, .28)'
  ctx.stroke()

  if (!plot.crop) {
    ctx.fillStyle = 'rgba(255, 242, 197, .72)'
    ctx.font = `${Math.max(12, tileW * .25)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('+', x + tileW / 2, y + tileH * .62)
    ctx.restore()
    return
  }

  const progress = Math.min(1, plot.growth / cropCatalog[plot.crop].growthTicks)
  const stems = plot.crop === 'mango' ? 3 : plot.crop === 'mustard' ? 6 : 5
  const sproutHeight = height * (.12 + progress * .51)
  const breeze = Math.sin(now / 310 + plot.x * 2 + plot.y) * tileW * .025 * progress
  ctx.strokeStyle = plot.crop === 'mango' ? '#4d6336' : '#487444'
  ctx.lineWidth = Math.max(2, tileW * .027)
  for (let index = 0; index < stems; index += 1) {
    const stemX = x + tileW * (.22 + index * .115)
    const baseY = y + tileH * .75
    const topY = baseY - sproutHeight * (.8 + ((index % 3) * .1))
    ctx.beginPath()
    ctx.moveTo(stemX, baseY)
    ctx.quadraticCurveTo(stemX + breeze, topY + tileH * .06, stemX + breeze, topY)
    ctx.stroke()
    const ripe = progress > .67
    ctx.fillStyle = plot.crop === 'mustard' && ripe ? '#ffdb55'
      : (plot.crop === 'paddy' || plot.crop === 'jute') && ripe ? (plot.crop === 'paddy' ? '#d9bb5a' : '#cda84b')
        : cropCatalog[plot.crop].color
    ctx.beginPath()
    ctx.ellipse(stemX - tileW * .035 + breeze, topY + tileH * .08, tileW * .055, tileH * .035, -.45, 0, Math.PI * 2)
    ctx.ellipse(stemX + tileW * .035 + breeze, topY + tileH * .12, tileW * .055, tileH * .035, .45, 0, Math.PI * 2)
    ctx.fill()
    if (plot.crop === 'mustard' && progress > .35) {
      ctx.fillStyle = '#ffdc5a'
      ctx.beginPath()
      ctx.arc(stemX + breeze, topY + tileH * .015, tileW * .018, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  if (plot.crop === 'mango' && progress > .36) {
    const crownX = x + tileW * .5
    const crownY = y + tileH * .35
    for (const [offsetX, offsetY] of [[-.12, 0], [0, -.1], [.12, 0], [0, .04]]) {
      ctx.beginPath()
      ctx.arc(crownX + tileW * offsetX + breeze, crownY + tileH * offsetY, tileW * (.14 + progress * .05), 0, Math.PI * 2)
      ctx.fillStyle = '#4f9457'
      ctx.fill()
    }
    if (plot.stage === 'ready') {
      ctx.fillStyle = '#f3bd46'
      ctx.beginPath()
      ctx.ellipse(crownX - tileW * .08, crownY, tileW * .035, tileH * .055, 0, 0, Math.PI * 2)
      ctx.ellipse(crownX + tileW * .1, crownY + tileH * .04, tileW * .035, tileH * .055, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  if (plot.stage === 'ready' && plot.crop !== 'mango') {
    ctx.fillStyle = '#ffe387'
    ctx.font = `${Math.max(12, tileW * .2)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('✦', x + tileW * .83, y + tileH * .3)
  }
  if (progress < .25) {
    const sparkle = (Math.sin(now / 130 + plot.x * 4 + plot.y) + 1) / 2
    ctx.globalAlpha = sparkle * .8
    ctx.fillStyle = '#fff6b8'
    ctx.font = `${Math.max(9, tileW * .13)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('✦', x + tileW * (.2 + sparkle * .6), y + tileH * (.27 + sparkle * .08))
    ctx.globalAlpha = 1
  }
  const badgeY = y + tileH * .84
  const meterWidth = tileW * .55
  const meterX = x + tileW * .22
  ctx.font = `${Math.max(8, tileW * .09)}px sans-serif`
  ctx.textAlign = 'left'
  ctx.fillStyle = '#d8fff7'
  ctx.fillText('💧', x + tileW * .08, badgeY + tileH * .015)
  ctx.fillStyle = 'rgba(255, 251, 224, .9)'
  roundRect(ctx, meterX - tileW * .04, badgeY - tileH * .06, meterWidth + tileW * .08, tileH * .11, tileH * .035)
  ctx.fill()
  ctx.fillStyle = '#438b78'
  roundRect(ctx, meterX, badgeY - tileH * .025, meterWidth * Math.min(1, plot.waterReserve / 4), tileH * .025, tileH * .012)
  ctx.fill()
  ctx.font = `700 ${Math.max(8, tileW * .09)}px sans-serif`
  ctx.textAlign = 'right'
  ctx.fillStyle = '#fff8dd'
  ctx.fillText(`${plot.compostBoost ? '🌿' : ''}${plot.toolsApplied ? '⚒️' : ''} ${Math.round(progress * 100)}%`, x + tileW * .92, badgeY + tileH * .015)
  if (plot.waitingFor) {
    const badge = plot.waitingFor === 'water' ? '💧' : plot.waitingFor === 'compost' ? '💩' : plot.waitingFor === 'tools' ? '⚒️' : plot.waitingFor === 'ghat' ? '📦' : '🌱'
    const warningLabels: Record<NonNullable<FarmPlot['waitingFor']>, string> = {
      paddySeeds: labels[lang].fieldSeeds,
      juteSeeds: labels[lang].fieldSeeds,
      mustardSeeds: labels[lang].fieldSeeds,
      mangoSaplings: labels[lang].fieldSeeds,
      water: labels[lang].fieldWater,
      compost: labels[lang].fieldCompost,
      tools: labels[lang].fieldTools,
      pruningTools: labels[lang].fieldTools,
      ghat: labels[lang].fieldGhat,
    }
    const warning = warningLabels[plot.waitingFor]
    ctx.font = `${Math.max(13, tileW * .22)}px sans-serif`
    ctx.textAlign = 'center'
    const badgeX = x + tileW * .8
    const badgeY = y + tileH * .28 + Math.sin(now / 220) * 1.5
    ctx.fillText(badge, badgeX, badgeY)
    ctx.font = `600 ${Math.max(7, tileW * .075)}px "Noto Sans Bengali", sans-serif`
    ctx.fillStyle = '#fff9e8'
    ctx.fillText(warning, badgeX, badgeY + tileH * .09)
  }
  ctx.restore()
}

function drawBuilding(ctx: CanvasRenderingContext2D, building: VillageState['buildings'][number], tileW: number, tileH: number, lang: Lang, now: number): void {
  const x = building.x * tileW
  const y = building.y * tileH
  const size = Math.min(tileW, tileH)
  ctx.save()
  if (building.type === 'ghat') {
    ctx.fillStyle = '#855b36'
    ctx.fillRect(x + tileW * .13, y + tileH * .68, tileW * .72, tileH * .09)
    ctx.fillRect(x + tileW * .2, y + tileH * .8, tileW * .06, tileH * .12)
    ctx.fillRect(x + tileW * .72, y + tileH * .8, tileW * .06, tileH * .12)
    ctx.fillStyle = '#fff2c2'
    ctx.font = `600 ${Math.max(7, size * .09)}px "Noto Sans Bengali", sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(labels[lang].ghat.toLocaleUpperCase(), x + tileW * .5, y + tileH * .62)
  } else if (building.type === 'shed') {
    ctx.fillStyle = '#ca9361'
    roundRect(ctx, x + tileW * .2, y + tileH * .4, tileW * .6, tileH * .46, size * .06)
    ctx.fill()
    ctx.fillStyle = '#925c3c'
    ctx.beginPath()
    ctx.moveTo(x + tileW * .13, y + tileH * .43)
    ctx.lineTo(x + tileW * .5, y + tileH * .17)
    ctx.lineTo(x + tileW * .87, y + tileH * .43)
    ctx.fill()
    ctx.fillStyle = '#f5e1af'
    ctx.font = `${size * .25}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('▧', x + tileW * .5, y + tileH * .72)
    for (let puff = 0; puff < 3; puff += 1) {
      const rise = (now / 700 + puff * .34) % 1
      ctx.globalAlpha = (1 - rise) * .32
      ctx.fillStyle = '#fff8df'
      ctx.beginPath()
      ctx.arc(x + tileW * (.68 + rise * .04), y + tileH * (.2 - rise * .2), size * (.035 + rise * .025), 0, Math.PI * 2)
      ctx.fill()
    }
  } else {
    ctx.fillStyle = '#7ba8a1'
    ctx.beginPath()
    ctx.arc(x + tileW * .5, y + tileH * .52, size * .22, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#e5e6bf'
    ctx.lineWidth = Math.max(2, size * .035)
    ctx.beginPath()
    ctx.moveTo(x + tileW * .5, y + tileH * .15)
    ctx.lineTo(x + tileW * .5, y + tileH * .68)
    ctx.stroke()
    ctx.fillStyle = '#fff'
    ctx.font = `${size * .16}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('💧', x + tileW * .5, y + tileH * .58)
  }
  ctx.restore()
}

function drawWorker(ctx: CanvasRenderingContext2D, worker: VillageWorker, tileW: number, tileH: number, now: number): void {
  const { x, y } = worker
  const walking = worker.task === 'to-field' || worker.task === 'to-ghat' || worker.task === 'returning'
  const stride = walking ? Math.sin(now / 95 + x * 12) : 0
  const bend = worker.task === 'working' ? Math.sin(now / 210 + x * 8) * .08 + .12 : 0
  const bob = walking ? Math.abs(stride) * tileH * .025 : Math.sin(now / 250 + x * 2) * tileH * .012
  const cx = (x + .5) * tileW
  const cy = (y + .52 + bend) * tileH + bob
  const size = Math.min(tileW, tileH)
  ctx.save()
  ctx.fillStyle = 'rgba(28, 54, 35, .22)'
  ctx.beginPath()
  ctx.ellipse(cx, cy + size * .22, size * .16, size * .055, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#765338'
  ctx.fillRect(cx - size * .08 + stride * size * .035, cy + size * .02, size * .065, size * (.16 + Math.max(0, stride) * .035))
  ctx.fillRect(cx + size * .02 - stride * size * .035, cy + size * .02, size * .065, size * (.16 + Math.max(0, -stride) * .035))
  ctx.fillStyle = '#cf7042'
  roundRect(ctx, cx - size * .14, cy - size * .09, size * .28, size * .23, size * .07)
  ctx.fill()
  ctx.strokeStyle = '#f2d18a'
  ctx.lineWidth = Math.max(1.2, size * .018)
  ctx.beginPath()
  ctx.moveTo(cx - size * .12, cy + size * .045)
  ctx.lineTo(cx + size * .12, cy + size * .045)
  ctx.stroke()
  ctx.fillStyle = '#e6bf78'
  ctx.fillRect(cx - size * .14, cy - size * .09, size * .28, size * .045)
  ctx.fillStyle = '#d9a276'
  ctx.beginPath()
  ctx.arc(cx, cy - size * .16, size * .105, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#6e4b2d'
  ctx.beginPath()
  ctx.ellipse(cx, cy - size * .24, size * .19, size * .06, Math.sin(now / 700 + x) * .07, Math.PI, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#b88b4d'
  ctx.beginPath()
  ctx.ellipse(cx, cy - size * .26, size * .19, size * .035, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f2d2a0'
  ctx.fillRect(cx - size * .13, cy - size * .22, size * .26, size * .025)
  if (worker.task === 'working') {
    ctx.strokeStyle = '#d6a56f'
    ctx.lineWidth = size * .055
    ctx.beginPath()
    ctx.moveTo(cx + size * .11, cy - size * .02)
    ctx.quadraticCurveTo(cx + size * .23, cy + size * .12, cx + size * .25, cy + size * .2)
    ctx.stroke()
    ctx.strokeStyle = '#7e6a43'
    ctx.lineWidth = size * .018
    ctx.beginPath()
    ctx.arc(cx + size * .26, cy + size * .19, size * .07, Math.PI * 1.05, Math.PI * 1.8)
    ctx.stroke()
  }
  if (worker.carrying) {
    ctx.fillStyle = worker.carrying === 'paddy' ? '#e5c363' : worker.carrying === 'jute' ? '#c29c49' : '#dc9050'
    ctx.beginPath()
    ctx.ellipse(cx, cy - size * .36, size * .17, size * .09, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(116, 78, 42, .62)'
    ctx.lineWidth = size * .012
    ctx.beginPath()
    ctx.moveTo(cx - size * .12, cy - size * .36)
    ctx.lineTo(cx + size * .12, cy - size * .36)
    ctx.stroke()
  }
  ctx.restore()
}

function drawBoat(ctx: CanvasRenderingContext2D, state: VillageState, tileW: number, tileH: number, now: number, interpolatedPoint?: Point): void {
  const boat = state.boats[0]
  if (!boat) return
  const point = interpolatedPoint ?? getBoatPosition(boat)
  const x = (point.x + .5) * tileW
  const y = (point.y + .5) * tileH + Math.sin(now / 240) * 2
  const size = Math.min(tileW, tileH)
  const angle = boat.status === 'docked' ? -.08 : -.42
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = 'rgba(18, 54, 54, .24)'
  ctx.beginPath()
  ctx.ellipse(0, size * .12, size * .39, size * .12, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(220, 247, 235, .72)'
  ctx.lineWidth = Math.max(1, size * .018)
  for (let ripple = 0; ripple < 3; ripple += 1) {
    const spread = ((now / 260 + ripple * .3) % 1) * size * .22
    ctx.beginPath()
    ctx.moveTo(-size * .24 - spread, size * (.12 + ripple * .015))
    ctx.quadraticCurveTo(-size * .42 - spread, size * .02, -size * .53 - spread, size * .06)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(size * .24 + spread, size * (.12 + ripple * .015))
    ctx.quadraticCurveTo(size * .42 + spread, size * .02, size * .53 + spread, size * .06)
    ctx.stroke()
  }
  ctx.fillStyle = '#77452c'
  ctx.beginPath()
  ctx.moveTo(-size * .36, -size * .02)
  ctx.quadraticCurveTo(-size * .28, size * .23, 0, size * .2)
  ctx.quadraticCurveTo(size * .28, size * .23, size * .36, -size * .02)
  ctx.lineTo(size * .23, size * .15)
  ctx.lineTo(-size * .23, size * .15)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#c28e52'
  ctx.lineWidth = size * .018
  ctx.beginPath()
  ctx.moveTo(-size * .23, size * .08)
  ctx.quadraticCurveTo(0, size * .17, size * .23, size * .08)
  ctx.moveTo(-size * .19, size * .12)
  ctx.quadraticCurveTo(0, size * .2, size * .19, size * .12)
  ctx.stroke()
  ctx.fillStyle = '#e9c27b'
  ctx.beginPath()
  ctx.moveTo(-size * .02, -size * .31)
  ctx.lineTo(-size * .02, -size * .04)
  ctx.lineTo(size * .17, -size * .04)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#64462e'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(-size * .02, -size * .34)
  ctx.lineTo(-size * .02, size * .08)
  ctx.stroke()
  const cargoCount = stockTotal(boat.cargo)
  for (let sack = 0; sack < Math.min(cargoCount, 5); sack += 1) {
    const sx = -size * .15 + (sack % 3) * size * .12
    const sy = size * (.02 - Math.floor(sack / 3) * .08)
    ctx.fillStyle = sack % 2 ? '#cba04f' : '#d9b866'
    ctx.beginPath()
    ctx.ellipse(sx, sy, size * .07, size * .055, -.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#8b673a'
    ctx.lineWidth = size * .009
    ctx.beginPath()
    ctx.moveTo(sx, sy - size * .045)
    ctx.lineTo(sx, sy + size * .045)
    ctx.stroke()
  }
  ctx.fillStyle = '#d79d6d'
  ctx.beginPath()
  ctx.arc(size * .2, -size * .12, size * .065, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#4a5035'
  ctx.beginPath()
  ctx.ellipse(size * .2, -size * .17, size * .095, size * .035, 0, Math.PI, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#2c705f'
  roundRect(ctx, size * .15, -size * .07, size * .1, size * .16, size * .025)
  ctx.fill()
  const oarSwing = Math.sin(now / 180) * size * .09
  ctx.strokeStyle = '#765337'
  ctx.lineWidth = size * .025
  ctx.beginPath()
  ctx.moveTo(size * .22, size * .015)
  ctx.lineTo(size * .37 + oarSwing, size * .2)
  ctx.stroke()
  ctx.strokeStyle = '#dbbd81'
  ctx.lineWidth = size * .07
  ctx.beginPath()
  ctx.moveTo(size * .31 + oarSwing, size * .2)
  ctx.lineTo(size * .42 + oarSwing, size * .19)
  ctx.stroke()
  ctx.restore()
}

function drawCoins(ctx: CanvasRenderingContext2D, state: VillageState, tileW: number, tileH: number, width: number, lang: Lang): void {
  for (const event of state.coinEvents) {
    const age = state.tick - event.tick
    const alpha = Math.max(.08, 1 - age / 8)
    const y = (event.y + .3 - age * .035) * tileH
    const amount = new Intl.NumberFormat(lang === 'bn' ? 'bn-BD' : 'en-US').format(event.amount)
    const label = lang === 'bn' ? `+৳${amount} ${labels[lang].salePopup}` : `+${amount} ${labels[lang].salePopup}`
    const pillWidth = Math.max(78, label.length * Math.max(6, tileW * .07))
    const pillX = Math.min(width - pillWidth - 5, Math.max(5, event.x * tileW - pillWidth / 2))
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = 'rgba(255, 245, 204, .94)'
    roundRect(ctx, pillX, y - 14, pillWidth, 25, 12)
    ctx.fill()
    ctx.fillStyle = '#875e1d'
    ctx.font = `700 ${Math.max(10, tileW * .12)}px "Noto Sans Bengali", sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(label, pillX + pillWidth / 2, y + 3)
    ctx.restore()
  }
}

interface VisualParticle {
  x: number
  y: number
  startAt: number
  color: string
  shape: 'leaf' | 'drop' | 'sparkle'
  vx: number
  vy: number
}

interface PlotSnapshot {
  crop: FarmPlot['crop']
  harvests: number
  waterClock: number
  waterReserve: number
  growth: number
  compostBoost: boolean
  toolsApplied: boolean
}

interface RendererMemory {
  plots: Map<string, PlotSnapshot>
  particles: VisualParticle[]
}

const rendererMemory = new WeakMap<HTMLCanvasElement, RendererMemory>()

function emitParticles(memory: RendererMemory, plot: FarmPlot, now: number, shape: VisualParticle['shape'], color: string): void {
  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8
    memory.particles.push({
      x: plot.x + .5,
      y: plot.y + .42,
      startAt: now,
      color,
      shape,
      vx: Math.cos(angle) * .00012,
      vy: Math.sin(angle) * .0001 - .00008,
    })
  }
}

function updateAndDrawParticles(canvas: HTMLCanvasElement, state: VillageState, ctx: CanvasRenderingContext2D, tileW: number, tileH: number, now: number): void {
  let memory = rendererMemory.get(canvas)
  if (!memory) {
    memory = {
      plots: new Map(state.plots.map((plot) => [plot.id, {
        crop: plot.crop,
        harvests: plot.harvests,
        waterClock: plot.waterClock,
        waterReserve: plot.waterReserve,
        growth: plot.growth,
        compostBoost: plot.compostBoost,
        toolsApplied: plot.toolsApplied,
      }])),
      particles: [],
    }
    rendererMemory.set(canvas, memory)
  } else {
    for (const plot of state.plots) {
      const previous = memory.plots.get(plot.id)
      if (previous?.crop !== plot.crop && plot.crop) emitParticles(memory, plot, now, 'sparkle', '#fff1a8')
      if (previous && plot.harvests > previous.harvests) emitParticles(memory, plot, now, 'leaf', '#e7ca66')
      if (previous && plot.growth > previous.growth && plot.waterClock !== previous.waterClock) emitParticles(memory, plot, now, 'drop', '#b8f1f0')
      if (previous && plot.waterReserve > previous.waterReserve) emitParticles(memory, plot, now, 'drop', '#8ee8f5')
      if (previous && !previous.compostBoost && plot.compostBoost) emitParticles(memory, plot, now, 'leaf', '#9dcf68')
      if (previous && !previous.toolsApplied && plot.toolsApplied) emitParticles(memory, plot, now, 'sparkle', '#ffe188')
      memory.plots.set(plot.id, {
        crop: plot.crop,
        harvests: plot.harvests,
        waterClock: plot.waterClock,
        waterReserve: plot.waterReserve,
        growth: plot.growth,
        compostBoost: plot.compostBoost,
        toolsApplied: plot.toolsApplied,
      })
    }
  }

  memory.particles = memory.particles.filter((particle) => now - particle.startAt < 720)
  for (const particle of memory.particles) {
    const age = now - particle.startAt
    const progress = age / 720
    const x = (particle.x + particle.vx * age) * tileW
    const y = (particle.y + particle.vy * age + progress * progress * .08) * tileH
    ctx.save()
    ctx.globalAlpha = 1 - progress
    ctx.fillStyle = particle.color
    if (particle.shape === 'drop') {
      ctx.beginPath()
      ctx.ellipse(x, y, tileW * .018, tileH * .028, -.25, 0, Math.PI * 2)
      ctx.fill()
    } else if (particle.shape === 'leaf') {
      ctx.translate(x, y)
      ctx.rotate(progress * Math.PI)
      ctx.beginPath()
      ctx.ellipse(0, 0, tileW * .035, tileH * .016, 0, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.font = `${tileW * .09}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText('✦', x, y)
    }
    ctx.restore()
  }
}

export interface VillageRenderOptions {
  placementMode?: 'plant' | 'build' | 'apply' | null
  selectedInputId?: 'water' | 'compost' | 'tools' | 'pruningTools'
  hoveredPlotId?: string | null
  selectedPlotId?: string | null
}

interface ActorMovement {
  tick: number
  startedAt: number
  duration: number
  previousWorkers: Map<string, Point>
  targetWorkers: Map<string, Point>
  boatPoint: Point
  boatFrom: Point
  boatTo: Point
}

const actorMovement = new WeakMap<HTMLCanvasElement, ActorMovement>()

function interpolateActors(canvas: HTMLCanvasElement, state: VillageState, now: number): { workers: VillageWorker[]; boatPoint: Point | undefined } {
  const boat = state.boats[0]
  const targetBoat = boat ? getBoatPosition(boat) : { x: 0, y: 0 }
  let movement = actorMovement.get(canvas)
  if (!movement) {
    const workers = new Map(state.workers.map((worker) => [worker.id, { x: worker.x, y: worker.y }]))
    movement = {
      tick: state.tick,
      startedAt: now,
      duration: 500 / state.speed,
      previousWorkers: workers,
      targetWorkers: workers,
      boatPoint: targetBoat,
      boatFrom: targetBoat,
      boatTo: targetBoat,
    }
    actorMovement.set(canvas, movement)
  } else if (movement.tick !== state.tick) {
    const tickDelta = Math.max(1, state.tick - movement.tick)
    movement.previousWorkers = movement.targetWorkers
    movement.targetWorkers = new Map(state.workers.map((worker) => [worker.id, { x: worker.x, y: worker.y }]))
    movement.boatFrom = movement.boatPoint
    movement.boatTo = targetBoat
    movement.tick = state.tick
    movement.startedAt = now
    movement.duration = Math.max(80, 500 * tickDelta / state.speed)
  }
  const progress = Math.min(1, Math.max(0, (now - movement.startedAt) / movement.duration))
  const workers = state.workers.map((worker) => {
    const start = movement.previousWorkers.get(worker.id) ?? { x: worker.x, y: worker.y }
    const end = movement.targetWorkers.get(worker.id) ?? { x: worker.x, y: worker.y }
    return {
      ...worker,
      x: start.x + (end.x - start.x) * progress,
      y: start.y + (end.y - start.y) * progress,
    }
  })
  movement.boatPoint = {
    x: movement.boatFrom.x + (movement.boatTo.x - movement.boatFrom.x) * progress,
    y: movement.boatFrom.y + (movement.boatTo.y - movement.boatFrom.y) * progress,
  }
  return { workers, boatPoint: boat ? movement.boatPoint : undefined }
}

export function drawVillage(
  canvas: HTMLCanvasElement,
  state: VillageState,
  lang: Lang,
  now: number,
  options: VillageRenderOptions = {},
): void {
  const rect = canvas.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
    canvas.width = Math.round(rect.width * dpr)
    canvas.height = Math.round(rect.height * dpr)
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const width = rect.width
  const height = rect.height
  const tileW = width / MAP_COLS
  const tileH = height / MAP_ROWS
  const actors = interpolateActors(canvas, state, now)
  ctx.clearRect(0, 0, width, height)
  const ground = ctx.createLinearGradient(0, 0, width, height)
  ground.addColorStop(0, '#d7e3ab')
  ground.addColorStop(.52, '#b8d28e')
  ground.addColorStop(1, '#9fc47f')
  ctx.fillStyle = ground
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  for (let row = 0; row < MAP_ROWS; row += 1) {
    for (let col = 0; col < MAP_COLS; col += 1) {
      const x = col * tileW
      const y = row * tileH
      ctx.fillStyle = (row + col) % 2 ? 'rgba(238, 239, 191, .15)' : 'rgba(67, 123, 75, .07)'
      roundRect(ctx, x + 2, y + 2, tileW - 4, tileH - 4, Math.min(tileW, tileH) * .12)
      ctx.fill()
      ctx.strokeStyle = 'rgba(70, 111, 71, .12)'
      ctx.lineWidth = 1
      ctx.stroke()
      if ((col * 7 + row * 11) % 17 === 0) {
        ctx.fillStyle = 'rgba(242, 229, 171, .65)'
        ctx.beginPath()
        ctx.arc(x + tileW * .22, y + tileH * .26, Math.max(1.3, tileW * .012), 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  ctx.restore()

  drawScenery(ctx, tileW, tileH, now)
  drawRiver(ctx, tileW, tileH, now)

  ctx.save()
  ctx.strokeStyle = 'rgba(248, 230, 160, .64)'
  ctx.lineWidth = Math.max(2, tileW * .025)
  ctx.setLineDash([tileW * .08, tileW * .05])
  ctx.beginPath()
  ctx.moveTo(tileW * .25, tileH * 4.65)
  ctx.bezierCurveTo(tileW * 1.2, tileH * 3.8, tileW * 2.2, tileH * 4.9, tileW * 3.4, tileH * 4.25)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()

  const plotByLocation = new Map(state.plots.map((plot) => [`${plot.x},${plot.y}`, plot]))
  for (const point of farmPlotLocations) {
    const plot = plotByLocation.get(`${point.x},${point.y}`)
    if (plot) drawFarmPlot(
      ctx,
      plot,
      tileW,
      tileH,
      now,
      lang,
      Boolean(options.placementMode && (
        options.placementMode === 'apply'
          ? plot.crop !== null
          : plot.stage === 'empty' && !state.buildings.some((building) => building.id === plot.id)
      )),
      options.hoveredPlotId === plot.id || options.selectedPlotId === plot.id,
    )
  }

  for (const building of state.buildings) {
    if (building.type === 'ghat') {
      ctx.save()
      ctx.fillStyle = '#236d74'
      ctx.beginPath()
      ctx.arc((building.x + .5) * tileW, (building.y + .5) * tileH, Math.min(tileW, tileH) * .38, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    drawBuilding(ctx, building, tileW, tileH, lang, now)
  }

  drawMarket(ctx, haatPosition.x * tileW, haatPosition.y * tileH, Math.min(tileW, tileH), lang, now)
  for (const worker of actors.workers) drawWorker(ctx, worker, tileW, tileH, now)
  drawBoat(ctx, state, tileW, tileH, now, actors.boatPoint)
  updateAndDrawParticles(canvas, state, ctx, tileW, tileH, now)
  drawCoins(ctx, state, tileW, tileH, width, lang)

  if (state.inputs.water < 3) {
    const well = state.buildings.find((building) => building.type === 'well')
    if (well) {
      ctx.font = `${Math.max(14, tileW * .22)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText('💧', (well.x + .5) * tileW, (well.y + .12) * tileH)
    }
  }
}

export function plotAtPointer(canvas: HTMLCanvasElement, clientX: number, clientY: number): Pick<FarmPlot, 'id' | 'x' | 'y'> | null {
  const bounds = canvas.getBoundingClientRect()
  return plotAtCoordinates(clientX, clientY, bounds)
}

export function plotAtCoordinates(
  clientX: number,
  clientY: number,
  bounds: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
): Pick<FarmPlot, 'id' | 'x' | 'y'> | null {
  if (!bounds.width || !bounds.height || clientX < bounds.left || clientY < bounds.top
    || clientX > bounds.left + bounds.width || clientY > bounds.top + bounds.height) return null
  const col = Math.min(MAP_COLS - 1, Math.floor(((clientX - bounds.left) / bounds.width) * MAP_COLS))
  const row = Math.min(MAP_ROWS - 1, Math.floor(((clientY - bounds.top) / bounds.height) * MAP_ROWS))
  return farmPlotLocations.some((point) => point.x === col && point.y === row)
    ? { id: `plot-${farmPlotLocations.findIndex((point) => point.x === col && point.y === row) + 1}`, x: col, y: row }
    : null
}
