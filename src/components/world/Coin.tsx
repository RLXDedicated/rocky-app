/** Rocky Coin — a small gold "R" coin used wherever coins are shown. */
export function Coin({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" style={{ flex: 'none', verticalAlign: '-0.2em' }}>
      <circle cx="10" cy="10" r="9.5" fill="#d99a12" />
      <circle cx="10" cy="9.4" r="8.4" fill="#f5b82e" />
      <circle cx="10" cy="9.4" r="6.3" fill="none" stroke="#ffe28a" strokeWidth="1.2" />
      <text x="10" y="13" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="9" fill="#8a5a00">
        R
      </text>
    </svg>
  )
}
