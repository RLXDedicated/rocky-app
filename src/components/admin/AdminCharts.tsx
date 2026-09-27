import { useEffect, useRef, useState, type ReactNode } from 'react'
import styles from './AdminConsole.module.css'

// Small, dependency-free SVG charts for the admin console. Conventions:
// thin columns (<= 24px) with a 4px rounded data-end and a square baseline,
// hairline gridlines, text in text tokens (never the series color), a
// legend whenever there are 2+ series, and a hover tooltip on every mark.

export const SERIES_GREEN = '#1f8a4c'
export const SERIES_ALERT = '#c9542e'

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

/** Column path: square at the baseline, 4px rounded data-end. */
function columnPath(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return ''
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
}

function niceMax(v: number): number {
  if (v <= 4) return 4
  const pow = 10 ** Math.floor(Math.log10(v))
  for (const m of [1, 2, 2.5, 5, 10]) if (m * pow >= v) return m * pow
  return 10 * pow
}

export interface StackSeries {
  key: string
  label: string
  color: string
}

export interface ColumnDatum {
  label: string
  /** Full label for the tooltip (e.g. the full date). */
  title?: string
  values: Record<string, number>
}

interface ColumnChartProps {
  data: ColumnDatum[]
  series: StackSeries[]
  height?: number
  /** Show every Nth x label. */
  labelEvery?: number
  ariaLabel: string
}

/** Single-series or stacked column chart. One y-axis, always. */
export function ColumnChart({ data, series, height = 180, labelEvery = 1, ariaLabel }: ColumnChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const padL = 32
  const padB = 22
  const padT = 8
  const plotW = Math.max(0, width - padL - 4)
  const plotH = height - padB - padT
  const totals = data.map((d) => series.reduce((s, ser) => s + (d.values[ser.key] ?? 0), 0))
  const max = niceMax(Math.max(0, ...totals))
  const slot = data.length > 0 ? plotW / data.length : 0
  const barW = Math.max(2, Math.min(24, slot * 0.62))
  const ticks = [0, max / 2, max]
  const y = (v: number) => padT + plotH - (v / max) * plotH

  return (
    <div className={styles.chartWrap}>
      {series.length > 1 && (
        <div className={styles.legend}>
          {series.map((s) => (
            <span key={s.key} className={styles.legendItem}>
              <span className={styles.legendSwatch} style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <div ref={ref} className={styles.chartArea} onMouseLeave={() => setHover(null)}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={ariaLabel}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={padL} x2={width - 4} y1={y(t)} y2={y(t)} className={styles.grid} />
                <text x={padL - 6} y={y(t) + 4} textAnchor="end" className={styles.axisText}>
                  {Number.isInteger(t) ? t : t.toFixed(1)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const x = padL + i * slot + (slot - barW) / 2
              let acc = 0
              const segs = series.map((s, si) => {
                const v = d.values[s.key] ?? 0
                if (v <= 0) return null
                const top = y(acc + v)
                const bottom = y(acc)
                acc += v
                const isTop = series.slice(si + 1).every((later) => (d.values[later.key] ?? 0) <= 0)
                // 2px surface gap between stacked segments.
                const h = bottom - top - (si > 0 ? 2 : 0)
                return isTop ? (
                  <path key={s.key} d={columnPath(x, top, barW, h)} fill={s.color} opacity={hover === null || hover === i ? 1 : 0.45} />
                ) : (
                  <rect key={s.key} x={x} y={top} width={barW} height={Math.max(0, h)} fill={s.color} opacity={hover === null || hover === i ? 1 : 0.45} />
                )
              })
              return (
                <g key={d.label + i}>
                  {segs}
                  {/* Hit target: the whole column slot, bigger than the mark. */}
                  <rect x={padL + i * slot} y={padT} width={slot} height={plotH} fill="transparent" onMouseEnter={() => setHover(i)} />
                  {i % labelEvery === 0 && (
                    <text x={x + barW / 2} y={height - 6} textAnchor="middle" className={styles.axisText}>
                      {d.label}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        )}
        {hover !== null && data[hover] && (
          <div
            className={styles.tooltip}
            style={{ left: Math.min(Math.max(padL + hover * slot + slot / 2, 70), width - 70), top: 0 }}
          >
            <strong>{data[hover]!.title ?? data[hover]!.label}</strong>
            {series.map((s) => (
              <span key={s.key} className={styles.tooltipRow}>
                {series.length > 1 && <span className={styles.legendSwatch} style={{ background: s.color }} />}
                {s.label}: <b>{data[hover]!.values[s.key] ?? 0}</b>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** Horizontal magnitude bars for a distribution — value labelled at the tip. */
export function BarList({ items, color = SERIES_GREEN, render }: { items: { key: string; count: number }[]; color?: string; render?: (key: string) => ReactNode }) {
  const max = Math.max(1, ...items.map((i) => i.count))
  const total = items.reduce((s, i) => s + i.count, 0)
  return (
    <div className={styles.barList}>
      {items.map((i) => (
        <div key={i.key} className={styles.barRow} title={`${i.key}: ${i.count} (${total ? Math.round((i.count / total) * 100) : 0}%)`}>
          <span className={styles.barLabel}>{render ? render(i.key) : i.key}</span>
          <span className={styles.barTrack}>
            <span className={styles.barFill} style={{ width: `${(i.count / max) * 100}%`, background: color }} />
          </span>
          <span className={styles.barValue}>
            {i.count}
            <small> · {total ? Math.round((i.count / total) * 100) : 0}%</small>
          </span>
        </div>
      ))}
    </div>
  )
}
