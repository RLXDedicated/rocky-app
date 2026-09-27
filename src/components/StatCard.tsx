import type { ReactNode } from 'react'
import styles from './StatCard.module.css'

interface StatCardProps {
  label: string
  value: ReactNode
  accent?: string
}

export function StatCard({ label, value, accent }: StatCardProps) {
  return (
    <div className={styles.card} style={accent ? { borderLeft: `4px solid ${accent}` } : undefined}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  )
}
