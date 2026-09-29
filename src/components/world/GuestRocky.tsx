import type { Outfit } from '../../game/closet'
import type { EvolutionStage, Mood } from '../../types/domain'
import { getRockyAsset } from '../rockyVisuals'
import { ROCKY_HEAD_ANCHORS } from '../rockyAnchors'
import { ROCKY_RIG } from '../rockyRig'
import { HAT_ART, hatPlacement } from './art'
import { backPlacement, BACK_ART, GLASSES_ART, glassesPlacement, NECK_ART, neckPlacement, WEAR_VIEWBOX } from './wearables'
import styles from './World.module.css'
import { NameBadges } from '../TitleBadge'
import { VipAura } from './VipAura'
import { RetryImg } from '../assetRecovery'

export interface Guest {
  id: string
  name: string
  rockyName: string
  stage: EvolutionStage
  mood: Mood
  outfit: Outfit
  x: number
  host?: boolean
  /** A Rocky admin: golden aura and VIP badge. */
  staff?: boolean
  title?: 'qa' | 'leader' | null
  tester?: boolean
  /** A reaction or line shown over this Rocky for a moment. */
  bubble?: string | null
  /** Bumps to replay the little hop when they act. */
  hop?: number
}

/**
 * Another agent's Rocky, live in this world (a friend visiting, or the host
 * when you visit them). Same art and outfit overlays as the main Rocky, a
 * little smaller, without the rig animation — it walks where its owner
 * moves it and hops when they act.
 */
export function GuestRocky({ guest, size, floor }: { guest: Guest; size: number; floor: number }) {
  const { stage, mood, outfit } = guest
  const anchor = ROCKY_HEAD_ANCHORS[stage][mood]
  const rig = ROCKY_RIG[stage][mood]
  const hat = outfit.hat ? HAT_ART[outfit.hat] : undefined
  const glasses = outfit.glasses ? GLASSES_ART[outfit.glasses] : undefined
  const neck = outfit.neck ? NECK_ART[outfit.neck] : undefined
  const back = outfit.back ? BACK_ART[outfit.back] : undefined
  const feetGap = (1 - anchor.figureBottom) * size
  return (
    <div className={styles.guest} style={{ left: `${guest.x}%`, bottom: floor - feetGap, width: size, height: size }} data-guest={guest.id}>
      {guest.bubble && (
        <p key={guest.bubble + (guest.hop ?? 0)} className={styles.guestBubble}>
          {guest.bubble}
        </p>
      )}
      {guest.outfit.aura && <VipAura feet={feetGap} />}
      <span className={styles.shadow} style={{ bottom: feetGap - 6 }} aria-hidden="true" />
      <div key={guest.hop ?? 0} className={`${styles.guestBody} ${guest.hop ? styles.guestHop : ''}`}>
        {back && (
          <svg
            className={`${styles.wearBack} rocky-live`}
            viewBox={WEAR_VIEWBOX.back}
            preserveAspectRatio="none"
            style={backPlacement(rig, anchor, size, outfit.back!)}
            aria-hidden="true"
          >
            {back}
          </svg>
        )}
        <RetryImg src={getRockyAsset(stage, mood)} alt={`${guest.rockyName}, ${guest.name}’s Rocky`} className={styles.art} />
        {neck && (
          <svg className={`${styles.wear} rocky-live`} viewBox={WEAR_VIEWBOX.neck} style={neckPlacement(rig, anchor, size)} aria-hidden="true">
            {neck}
          </svg>
        )}
        {glasses && (
          <svg className={`${styles.wear} rocky-live`} viewBox={WEAR_VIEWBOX.glasses} style={glassesPlacement(rig, anchor, size)} aria-hidden="true">
            {glasses}
          </svg>
        )}
        {hat && (
          <svg className={`${styles.hat} rocky-live`} viewBox="0 0 100 60" style={hatPlacement(anchor, hat, size)} aria-hidden="true">
            {hat.svg}
          </svg>
        )}
      </div>
      <span className={styles.guestTag}>
        {guest.host ? '🏠 ' : ''}
        {guest.name}
        <NameBadges staff={guest.staff} title={guest.title} tester={guest.tester} />
        <i aria-label="live" />
      </span>
    </div>
  )
}
