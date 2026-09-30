// A small renderer for the Adaptive Card subset Rocky sends to Teams, so an
// admin sees each card before it goes out (not just its JSON).
import type { CSSProperties, ReactNode } from 'react'

type El = Record<string, unknown> & { type?: string }

const SIZE: Record<string, string> = { Small: '0.82rem', Medium: '1.02rem', Large: '1.3rem', ExtraLarge: '1.8rem' }
const STYLE_BG: Record<string, string> = { emphasis: '#f2f4f7', attention: '#fdecec', good: '#e7f6ec', accent: '#e8f0fe', warning: '#fff4e0' }
const COLOR: Record<string, string> = { Accent: '#2563eb', Good: '#0f7a3d', Attention: '#b42318' }

/** **bold** and "- " bullet lines, as Teams renders them. */
function md(text: string): ReactNode {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    const bullet = line.startsWith('- ')
    const parts = (bullet ? line.slice(2) : line).split(/\*\*(.+?)\*\*/g).map((p, j) => (j % 2 ? <b key={j}>{p}</b> : p))
    return (
      <span key={i} style={{ display: 'block', paddingLeft: bullet ? 14 : 0, textIndent: bullet ? -10 : 0 }}>
        {bullet ? '• ' : ''}
        {parts}
      </span>
    )
  })
}

function render(el: El, key: number): ReactNode {
  const spacing: CSSProperties = { marginTop: el.spacing === 'Small' ? 4 : el.spacing === 'Medium' ? 10 : el.spacing === 'Large' ? 16 : 6 }
  switch (el.type) {
    case 'TextBlock':
      return (
        <div
          key={key}
          style={{
            ...spacing,
            fontSize: SIZE[el.size as string] ?? '0.9rem',
            fontWeight: el.weight === 'Bolder' ? 700 : 400,
            color: COLOR[el.color as string] ?? (el.isSubtle ? '#667085' : '#1d2939'),
            textAlign: (el.horizontalAlignment as string)?.toLowerCase() as CSSProperties['textAlign'],
            borderTop: el.separator ? '1px solid #e4e7ec' : undefined,
            paddingTop: el.separator ? 8 : undefined,
            fontFamily: el.fontType === 'Monospace' ? 'ui-monospace, monospace' : undefined,
          }}
        >
          {md(String(el.text ?? ''))}
        </div>
      )
    case 'Image':
      return (
        <div key={key} style={{ ...spacing, textAlign: el.horizontalAlignment === 'Center' ? 'center' : 'left' }}>
          <img src={String(el.url)} alt={String(el.altText ?? '')} style={{ width: String(el.width ?? '80px'), maxWidth: '100%' }} />
        </div>
      )
    case 'ColumnSet':
      return (
        <div key={key} style={{ ...spacing, display: 'flex', gap: 10, alignItems: 'center' }}>
          {((el.columns as El[]) ?? []).map((c, i) => (
            <div key={i} style={{ flex: c.width === 'stretch' ? 1 : 'none', width: /px$/.test(String(c.width)) ? String(c.width) : undefined, minWidth: 0 }}>
              {((c.items as El[]) ?? []).map(render)}
            </div>
          ))}
        </div>
      )
    case 'Container':
      return (
        <div key={key} style={{ ...spacing, padding: el.style ? '10px 12px' : 0, borderRadius: 8, background: el.style ? (STYLE_BG[el.style as string] ?? '#f2f4f7') : undefined, borderTop: el.separator ? '1px solid #e4e7ec' : undefined }}>
          {((el.items as El[]) ?? []).map(render)}
        </div>
      )
    case 'FactSet':
      return (
        <table key={key} style={{ ...spacing, fontSize: '0.85rem', borderCollapse: 'collapse' }}>
          <tbody>
            {((el.facts as { title: string; value: string }[]) ?? []).map((f, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 700, paddingRight: 12, verticalAlign: 'top' }}>{f.title}</td>
                <td>{f.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    default:
      return null
  }
}

export function CardPreview({ card }: { card: unknown }) {
  const c = (card ?? {}) as { body?: El[]; actions?: { title: string }[] }
  return (
    <div style={{ maxWidth: 560, padding: 16, border: '1px solid #d0d5dd', borderRadius: 10, background: '#ffffff', color: '#1d2939', fontFamily: 'Segoe UI, system-ui, sans-serif' }}>
      {(c.body ?? []).map(render)}
      {c.actions?.length ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          {c.actions.map((a, i) => (
            <span key={i} style={{ padding: '6px 12px', border: '1px solid #d0d5dd', borderRadius: 6, fontSize: '0.85rem', fontWeight: 600 }}>
              {a.title}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
