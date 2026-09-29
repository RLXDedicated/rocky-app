// Browser notifications for Rocky: new messages, @mentions, reactions and
// visitors — only while Rocky isn't the tab in front (otherwise the app shows
// them itself). Each person turns them on once (the browser asks), and can
// switch them off again in Chat.

const PREF = 'rocky.notifications'

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationsOn(): boolean {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false
  try {
    return localStorage.getItem(PREF) !== 'off'
  } catch {
    return true
  }
}

/** Asks the browser (first time) and remembers the choice; returns whether they're on. */
export async function setNotifications(on: boolean): Promise<boolean> {
  try {
    localStorage.setItem(PREF, on ? 'on' : 'off')
  } catch {
    // private mode: the permission alone decides
  }
  if (!on || !notificationsSupported()) return false
  if (Notification.permission === 'default') await Notification.requestPermission()
  return notificationsOn()
}

/** Shows a notification when the tab is in the background. Clicking it brings Rocky forward. */
export function notify(title: string, body: string, opts: { tag?: string; onClick?: () => void } = {}): void {
  if (!notificationsOn() || (document.visibilityState === 'visible' && document.hasFocus())) return
  try {
    const n = new Notification(title, { body: body.slice(0, 140), tag: opts.tag, icon: '/favicon.svg' })
    n.onclick = () => {
      window.focus()
      opts.onClick?.()
      n.close()
    }
  } catch {
    // some browsers only allow notifications from a service worker — nothing to do
  }
}
