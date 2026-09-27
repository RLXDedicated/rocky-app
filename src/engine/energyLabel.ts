// Energy display tiers (Phase 8 §8) — purely presentational, never fed back
// into game logic. Deliberately not alarming at the low end: Energy is
// temporary and recoverable, so "Critical" reads as a nudge, not a warning.
export function energyLabel(energy: number): string {
  if (energy >= 80) return 'Excellent'
  if (energy >= 60) return 'Good'
  if (energy >= 40) return 'Normal'
  if (energy >= 20) return 'Low'
  return 'Critical'
}
