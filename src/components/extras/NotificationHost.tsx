import { useLiveEvent } from '../../services/liveClient'
import { notify } from '../../services/notify'
import { mediaPreview } from '../chat/Media'
import { stickerOf } from '../chat/Stickers'

const preview = (body: string) => (stickerOf(body) ? `🐂 ${stickerOf(body)!.label}` : (mediaPreview(body) ?? body))

/**
 * Turns live events into browser notifications while Rocky is in the
 * background: a message in one of my conversations, an @mention, a reaction
 * to something I wrote, or someone arriving at my Rocky's home.
 */
export function NotificationHost({ onOpenChat, onOpenHome }: { onOpenChat: () => void; onOpenHome: () => void }) {
  useLiveEvent(
    (e) => {
      if (e.t === 'chat.mention') {
        const m = e.message as { name: string; body: string; id: number }
        notify(`${m.name} mentioned you`, preview(m.body), { tag: `mention-${m.id}`, onClick: onOpenChat })
      } else if (e.t === 'chat.message') {
        const m = e.message as { name: string; body: string; id: number; mine: boolean; mentionsMe?: boolean }
        // General is busy: only 1-to-1 and home chats notify (mentions in General come as chat.mention).
        if (m.mine || m.mentionsMe || e.kind === 'general') return
        notify(`New message from ${m.name}`, preview(m.body), { tag: `msg-${e.channel as string}`, onClick: onOpenChat })
      } else if (e.t === 'chat.reacted') {
        notify(`${e.name as string} reacted ${e.emoji as string}`, 'to your message in Rocky chat', { tag: `react-${e.id as number}`, onClick: onOpenChat })
      } else if (e.t === 'room.join') {
        const m = e.member as { name: string; host?: boolean }
        if (!m.host) notify(`${m.name} is visiting Rocky!`, 'Say hi — they’re at your Rocky’s home right now.', { tag: `visit-${m.name}`, onClick: onOpenHome })
      }
    },
    [onOpenChat, onOpenHome],
  )
  return null
}
