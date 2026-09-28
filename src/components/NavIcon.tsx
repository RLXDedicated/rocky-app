// Small stroke icons for the app navigation. Inline SVG so they inherit
// `currentColor` and need no icon library.
export type NavIconName = 'home' | 'chart' | 'medal' | 'podium' | 'team' | 'teams' | 'admin' | 'flask' | 'wrench'

const PATHS: Record<NavIconName, string> = {
  chart: 'M4 20h16M7 16v-4M12 16V7M17 16v-7M5 9l4-3 4 3 6-5',
  home: 'M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1z',
  medal: 'M8 3h8l-2 6h-4zM12 21a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM12 13.2l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 15.3l2-.3z',
  podium: 'M9 9h6v12H9zM3 13h6v8H3zM15 15h6v6h-6zM12 3l.9 1.8 2 .3-1.45 1.4.35 2L12 7.55 10.2 8.5l.35-2L9.1 5.1l2-.3z',
  team: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.5a6.5 6.5 0 0 1 3.5 5.5',
  teams: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  admin: 'M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6zM9 12l2 2 4-4',
  flask: 'M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3M7 15h10',
  wrench: 'M14.5 6.5a4 4 0 0 0 5 5L21 13l-8 8-3-3 8-8zM3 21l6-6',
}

export function NavIcon({ name }: { name: NavIconName }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  )
}
