import styles from './VipBadge.module.css'

/**
 * The Rocky admin distinction: a pixel-style golden crown with "VIP", a
 * shine sweeping across it and twinkling sparkles. Shown next to an admin's
 * name everywhere (home, Friends, chat, live visits).
 */
export function VipBadge({ size = 'md', title = 'Rocky admin' }: { size?: 'sm' | 'md' | 'lg'; title?: string }) {
  return (
    <span className={`${styles.badge} ${styles[size]}`} title={title} role="img" aria-label={title}>
      <svg viewBox="0 0 64 44" aria-hidden="true">
        <defs>
          <linearGradient id="vipb-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff6b0" />
            <stop offset="0.5" stopColor="#f7c531" />
            <stop offset="1" stopColor="#c47f06" />
          </linearGradient>
          <linearGradient id="vipb-shine" x1="0" y1="0" x2="1" y2="0.3">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.95">
              <animate attributeName="offset" values="-0.4;1.4" dur="2.4s" repeatCount="indefinite" />
            </stop>
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id="vipb-clip">
            <path d="M6 22 L6 8 L12 8 L12 4 L18 4 L18 12 L24 12 L24 2 L40 2 L40 12 L46 12 L46 4 L52 4 L52 8 L58 8 L58 22 L62 22 L62 40 L2 40 L2 22 Z" />
          </clipPath>
        </defs>
        {/* Crown + band, one pixel-stepped silhouette */}
        <path
          d="M6 22 L6 8 L12 8 L12 4 L18 4 L18 12 L24 12 L24 2 L40 2 L40 12 L46 12 L46 4 L52 4 L52 8 L58 8 L58 22 L62 22 L62 40 L2 40 L2 22 Z"
          fill="url(#vipb-gold)"
          stroke="#2b1600"
          strokeWidth="2.5"
          strokeLinejoin="miter"
        />
        <rect x="29" y="6" width="6" height="6" fill="#e2445c" stroke="#2b1600" strokeWidth="1.2" />
        <rect x="9" y="11" width="3" height="3" fill="#4aa3ff" />
        <rect x="52" y="11" width="3" height="3" fill="#1fbf68" />
        <path d="M2 22 L62 22" stroke="#2b1600" strokeWidth="2" />
        <text
          x="32"
          y="36.5"
          textAnchor="middle"
          fontFamily="'Courier New', monospace"
          fontWeight="900"
          fontSize="15"
          letterSpacing="1.5"
          fill="#fff9dc"
          stroke="#2b1600"
          strokeWidth="3"
          paintOrder="stroke"
        >
          VIP
        </text>
        <rect x="0" y="0" width="64" height="44" fill="url(#vipb-shine)" clipPath="url(#vipb-clip)" />
      </svg>
      <i className={styles.spark} />
      <i className={styles.spark} />
    </span>
  )
}
