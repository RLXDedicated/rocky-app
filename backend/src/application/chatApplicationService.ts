// Internal chat between agents (docs/REALTIME_CHAT_PLAN.md).
//
// - Channels: the pilot-wide General channel, 1-to-1 conversations and the
//   chat inside each Rocky's home during a live visit.
// - Agents must accept the house rules (RULES_VERSION) before posting.
// - Chats are personal between agents: there is no supervisor access. Only
//   Rocky admins (ROCKY_ADMIN_EMAILS) can read every conversation, for
//   quality control, and every admin read/export is written to audit_log.
// - Messages are kept 90 days (purge() runs nightly; see chatJobs.ts).
// - A message that looks like customer data (email, phone, order number,
//   street address) is held back until the author confirms; confirmed ones
//   are flagged for the admins.
import { createHash, randomBytes } from 'node:crypto'
import { ApiError } from '../api/errors'
import type { PersistenceContext } from '../infrastructure/persistenceContext'
import type { ChannelRecord, MessageRecord, ReactionRecord } from '../infrastructure/chat/ChatStore'
import { systemClock, type Clock } from '../domain/rockyEngine'
import { publicName } from './leaderboardApplicationService'
import { friendKey } from './petApplicationService'
import type { LiveBus } from './liveBus'

/** Bump when the house rules text changes: everyone accepts the new version once. */
export const RULES_VERSION = '2026-09-28'
export const RETENTION_DAYS = 90
export const MAX_MESSAGE_LENGTH = 1000
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000
const PAGE = 50

export const GENERAL_CHANNEL = 'general'

/** Pictures people attach: PNG, JPEG, WebP (the browser shrinks them first) and GIFs. */
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const
export type ImageType = (typeof IMAGE_TYPES)[number]
export const MAX_IMAGE_BYTES = 2_500_000
export const MAX_GIF_BYTES = 5_000_000
const MAX_REACTIONS_PER_MESSAGE = 12

/** The file really is what it says (magic bytes), so nothing else is served back as an image. */
export function sniffImage(bytes: Uint8Array): ImageType | null {
  const b = (i: number) => bytes[i] ?? -1
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return 'image/png'
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return 'image/jpeg'
  if (b(0) === 0x47 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x38) return 'image/gif'
  if (b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 && b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50) return 'image/webp'
  return null
}

/** One emoji (with skin tones / joiners), nothing else. */
export function isEmoji(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 16 && /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|\u200d|\ufe0f|\u20e3)+$/u.test(value) && /\p{Extended_Pictographic}/u.test(value)
}

export const GIF_ID = /^[A-Za-z0-9]{5,40}$/
export const imageText = (id: string) => `[[img:${id}]]`
export const gifText = (id: string) => `[[gif:${id}]]`

export interface ChatActor {
  id: string
  via?: string
}

/** What looks like customer data. Kept deliberately simple and explainable. */
export function sensitiveKinds(text: string): string[] {
  const kinds: string[] = []
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) kinds.push('email')
  const digitRuns = text.match(/\+?\(?\d[\d\s().-]{6,}\d/g) ?? []
  if (digitRuns.some((run) => run.replace(/\D/g, '').length >= 7)) kinds.push('phone')
  if (/\b(order|pedido|orden|po|invoice|factura|tracking|gu[ií]a)\s*(#|no\.?|n[uú]mero|number)?\s*:?\s*[A-Z0-9-]*\d{4,}/i.test(text)) kinds.push('order number')
  if (
    /\b\d{1,5}\s+(?:[A-Z][a-z]+\s+){0,3}(street|st\.?|avenue|ave\.?|road|rd\.?|blvd|boulevard|lane|ln\.?|drive|dr\.?|court|ct\.?|way|highway|hwy)\b/i.test(text) ||
    /\b(calle|carrera|cra\.?|cl\.?|avenida|av\.?|diagonal|transversal)\s*\d+[A-Z]?\s*(#|no\.?)\s*\d+/i.test(text)
  )
    kinds.push('address')
  return kinds
}

const dmId = (a: string, b: string) =>
  `dm-${createHash('sha256')
    .update([a, b].sort().join('\u0000'))
    .digest('hex')
    .slice(0, 20)}`
const visitId = (hostId: string) => `visit-${friendKey(hostId)}`

export interface ChatDeps {
  persistence: PersistenceContext
  bus: LiveBus
  clock?: Clock
  /** Rocky admins get the VIP badge next to their name. */
  isStaff?: (agentId: string) => boolean
  titleOf?: (agentId: string) => string | null
  testerOf?: (agentId: string) => boolean
  /** The author's chat bubble style (a shop item). */
  bubbleOf?: (agentId: string) => string | null
  /** GIPHY key for the GIF search (ROCKY_GIPHY_API_KEY); without it only Rocky's own stickers and uploads are offered. */
  giphyKey?: string | null
  fetchFn?: typeof fetch
}

export function createChatApplicationService({ persistence, bus, clock = systemClock, isStaff = () => false, titleOf = () => null, testerOf = () => false, bubbleOf = () => null, giphyKey = null, fetchFn = fetch }: ChatDeps) {
  const store = persistence.chat
  const repo = persistence.repoStore
  const sent = new Map<string, number[]>()
  // GIPHY's free key allows ~100 searches an hour for the whole pilot, so
  // results are shared and kept for an hour (trending and common words hit it constantly).
  const gifCache = new Map<string, { at: number; gifs: { id: string; title: string; preview: string }[] }>()
  const GIF_CACHE_MS = 60 * 60_000
  const GIF_CACHE_MAX = 300

  function directory() {
    const byKey = new Map<string, string>()
    for (const id of repo.listAgentIds()) byKey.set(friendKey(id), id)
    return byKey
  }
  function nameOf(agentId: string): string {
    try {
      return publicName(agentId, repo.forAgent(agentId).getAgent().name)
    } catch {
      return publicName(agentId, '')
    }
  }
  function profileOf(agentId: string) {
    const agent = repo.forAgent(agentId).getAgent()
    const game = repo.forAgent(agentId).getGameState()
    return {
      id: friendKey(agentId),
      name: publicName(agentId, agent.name),
      rockyName: agent.rockyName,
      staff: isStaff(agentId),
      title: titleOf(agentId),
      tester: testerOf(agentId),
      stage: game.evolutionStage,
      mood: game.mood,
    }
  }
  function audit(actor: ChatActor, agentId: string | null, action: string, detail: Record<string, unknown> | null) {
    persistence.accounts.addAudit({
      agentId,
      actor: actor.id,
      action,
      detail,
      source: actor.via ?? null,
      createdAt: clock.now().toISOString(),
    })
  }

  function ensureGeneral(agentId: string) {
    const now = clock.now().toISOString()
    store.ensureChannel({ id: GENERAL_CHANNEL, kind: 'general', title: 'General', createdAt: now })
    store.addMember(GENERAL_CHANNEL, agentId, now)
  }

  /** Who can read a channel (not counting admins' quality-control access). */
  function canRead(channel: ChannelRecord, agentId: string): boolean {
    if (channel.kind === 'general') return true
    if (channel.kind === 'visit' && channel.id === visitId(agentId)) return true
    return store.isMember(channel.id, agentId)
  }
  function hostOfVisit(channel: ChannelRecord): string | null {
    if (channel.kind !== 'visit') return null
    const key = channel.id.slice('visit-'.length)
    return directory().get(key) ?? null
  }
  function canPost(channel: ChannelRecord, agentId: string): boolean {
    if (channel.kind === 'visit') {
      const host = hostOfVisit(channel)
      return !!host && (host === agentId || bus.inRoom(agentId, host))
    }
    return canRead(channel, agentId)
  }

  /** Reactions on a message as one viewer sees them: each emoji, how many, whether one is theirs, and who. */
  function reactionsFor(rows: ReactionRecord[], viewerId: string) {
    const byEmoji = new Map<string, { emoji: string; count: number; mine: boolean; names: string[] }>()
    for (const r of rows) {
      const e = byEmoji.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false, names: [] }
      e.count += 1
      if (r.agentId === viewerId) e.mine = true
      if (e.names.length < 8) e.names.push(r.agentId === viewerId ? 'You' : nameOf(r.agentId))
      byEmoji.set(r.emoji, e)
    }
    return [...byEmoji.values()]
  }

  function toClient(m: MessageRecord, viewerId: string, reactions: ReactionRecord[] = []) {
    return {
      id: m.id,
      channel: m.channelId,
      from: friendKey(m.authorId),
      name: nameOf(m.authorId),
      staff: isStaff(m.authorId),
      title: titleOf(m.authorId),
      tester: testerOf(m.authorId),
      style: bubbleOf(m.authorId),
      mine: m.authorId === viewerId,
      body: m.hiddenAt ? '' : m.body,
      hidden: !!m.hiddenAt,
      at: m.createdAt,
      reactions: m.hiddenAt ? [] : reactionsFor(reactions, viewerId),
    }
  }
  /** Everyone who should get a live copy of a message in this channel. */
  function audience(channel: ChannelRecord): string[] {
    if (channel.kind === 'general') return repo.listAgentIds()
    const members = new Set(store.listMembers(channel.id))
    const host = hostOfVisit(channel)
    if (host) members.add(host)
    return [...members]
  }

  function requireChannel(channelId: string, agentId: string): ChannelRecord {
    if (channelId === GENERAL_CHANNEL) ensureGeneral(agentId)
    const channel = store.getChannel(channelId)
    if (!channel || !canRead(channel, agentId)) throw ApiError.notFound('That conversation could not be found.')
    return channel
  }

  function channelSummary(channel: ChannelRecord, agentId: string, lastReadId: number) {
    const last = store.lastMessage(channel.id)
    let title = channel.title ?? 'Chat'
    let withWho: ReturnType<typeof profileOf> | null = null
    if (channel.kind === 'dm') {
      const other = store.listMembers(channel.id).find((m) => m !== agentId)
      if (other) {
        withWho = profileOf(other)
        title = withWho.name
      }
    }
    if (channel.kind === 'visit') {
      const host = hostOfVisit(channel)
      title = host === agentId ? 'Visitors at my home' : host ? `At ${nameOf(host)}’s home` : 'Visit'
    }
    return {
      id: channel.id,
      kind: channel.kind,
      title,
      with: withWho,
      unread: store.countUnread(channel.id, agentId, lastReadId),
      last: last ? { name: nameOf(last.authorId), body: last.hiddenAt ? '' : last.body, at: last.createdAt, mine: last.authorId === agentId } : null,
    }
  }

  /** Everything a post must pass: rules accepted, not paused, allowed in this conversation, not flooding. */
  function gate(agentId: string, channelId: string) {
    if (store.getConsent(agentId)?.version !== RULES_VERSION) throw new ApiError(403, 'RULES_NOT_ACCEPTED', 'Please read and accept the chat rules first.')
    const now = clock.now()
    const mute = store.getMute(agentId)
    if (mute && mute.until > now.toISOString())
      throw new ApiError(403, 'MUTED', `Your chat is paused until ${new Date(mute.until).toLocaleString('en-US')}. Contact the QA team if you think this is a mistake.`)
    const channel = requireChannel(channelId, agentId)
    if (!canPost(channel, agentId)) throw ApiError.forbidden('You can chat here while you are visiting.')
    const recent = (sent.get(agentId) ?? []).filter((t) => now.getTime() - t < RATE_WINDOW_MS)
    if (recent.length >= RATE_LIMIT) throw new ApiError(429, 'SLOW_DOWN', 'You are sending messages very fast — wait a few seconds.')
    return { channel, now, recent }
  }

  /** Stores a message and sends everyone in the conversation a live copy. */
  function post(channel: ChannelRecord, agentId: string, body: string, flagged: boolean, now: Date) {
    store.addMember(channel.id, agentId, now.toISOString())
    const saved = store.addMessage({ channelId: channel.id, authorId: agentId, body, flagged, createdAt: now.toISOString(), hiddenAt: null, hiddenBy: null })
    store.setLastRead(channel.id, agentId, saved.id)
    for (const id of audience(channel)) bus.publish([id], { t: 'chat.message', channel: channel.id, kind: channel.kind, message: toClient(saved, id) })
    return saved
  }

  return {
    rules(agentId: string) {
      const consent = store.getConsent(agentId)
      return {
        version: RULES_VERSION,
        accepted: consent?.version === RULES_VERSION,
        acceptedAt: consent?.version === RULES_VERSION ? consent.acceptedAt : null,
        retentionDays: RETENTION_DAYS,
      }
    },

    acceptRules(agentId: string, version: string, actor: ChatActor) {
      if (version !== RULES_VERSION) throw ApiError.validation('Please read the latest chat rules and accept them again.')
      store.setConsent(agentId, RULES_VERSION, clock.now().toISOString())
      audit(actor, agentId, 'chat.rules.accepted', { version: RULES_VERSION })
      return this.rules(agentId)
    },

    listChannels(agentId: string) {
      ensureGeneral(agentId)
      const channels = store
        .listMemberships(agentId)
        .map((m) => ({ m, c: store.getChannel(m.channelId) }))
        .filter((x): x is { m: typeof x.m; c: ChannelRecord } => !!x.c)
        .map(({ m, c }) => channelSummary(c, agentId, m.lastReadId))
        // A 1-to-1 shows up for the other person once there is something to read.
        .filter((c) => c.kind !== 'dm' || c.last)
      // The agent's own home chat shows up once someone has written there.
      const home = store.getChannel(visitId(agentId))
      if (home && !channels.some((c) => c.id === home.id)) {
        store.addMember(home.id, agentId, clock.now().toISOString())
        channels.push(channelSummary(home, agentId, 0))
      }
      const mute = store.getMute(agentId)
      return {
        channels: channels.sort((a, b) => (a.kind === 'general' ? -1 : b.kind === 'general' ? 1 : (b.last?.at ?? '').localeCompare(a.last?.at ?? ''))),
        mutedUntil: mute && mute.until > clock.now().toISOString() ? mute.until : null,
      }
    },

    /** Opens (or reuses) the 1-to-1 conversation with a friend. */
    openDirect(agentId: string, friend: string) {
      const other = directory().get(friend)
      if (!other || other === agentId) throw ApiError.notFound('That teammate could not be found.')
      const now = clock.now().toISOString()
      const channel = store.ensureChannel({ id: dmId(agentId, other), kind: 'dm', title: null, createdAt: now })
      store.addMember(channel.id, agentId, now)
      store.addMember(channel.id, other, now)
      return channelSummary(channel, agentId, 0)
    },

    /** The chat inside a friend's home (or your own) during a live visit. */
    openVisit(agentId: string, hostKey: string | null) {
      const host = hostKey ? directory().get(hostKey) : agentId
      if (!host) throw ApiError.notFound('That home could not be found.')
      const now = clock.now().toISOString()
      const channel = store.ensureChannel({ id: visitId(host), kind: 'visit', title: null, createdAt: now })
      if (host === agentId || bus.inRoom(agentId, host)) store.addMember(channel.id, agentId, now)
      else throw ApiError.forbidden('You can chat here while you are visiting.')
      return channelSummary(channel, agentId, 0)
    },

    messages(agentId: string, channelId: string, opts: { before?: number; after?: number }) {
      const channel = requireChannel(channelId, agentId)
      const rows = store.listMessages(channel.id, { beforeId: opts.before, afterId: opts.after, limit: PAGE })
      const reactions = store.listReactions(rows.map((m) => m.id))
      return {
        channel: channel.id,
        messages: rows.map((m) => toClient(m, agentId, reactions.filter((r) => r.messageId === m.id))),
        more: opts.after === undefined && rows.length === PAGE,
      }
    },

    send(agentId: string, channelId: string, text: unknown, confirm: boolean, actor: ChatActor) {
      if (typeof text !== 'string' || !text.trim()) throw ApiError.validation('Write a message first.')
      const body = text.trim().replace(/\r\n/g, '\n')
      if (body.length > MAX_MESSAGE_LENGTH) throw ApiError.validation(`Messages can be up to ${MAX_MESSAGE_LENGTH} characters.`)
      // Pictures only arrive through postImage (so they are always checked and stored first).
      if (/\[\[img:/.test(body)) throw ApiError.validation('Attach pictures with the 📎 button.')
      const gif = /^\[\[gif:([^\]]*)\]\]$/.exec(body)
      if (gif && !GIF_ID.test(gif[1]!)) throw ApiError.validation('That GIF could not be sent.')
      const { channel, now, recent } = gate(agentId, channelId)
      const kinds = sensitiveKinds(body)
      if (kinds.length && !confirm)
        throw new ApiError(
          422,
          'SENSITIVE_DATA',
          `This looks like customer information (${kinds.join(', ')}). Never share customer data in Rocky chat — use the approved work systems.`,
        )
      recent.push(now.getTime())
      sent.set(agentId, recent)
      const saved = post(channel, agentId, body, kinds.length > 0, now)
      if (saved.flagged) audit(actor, agentId, 'chat.message.flagged', { channel: channel.id, message: saved.id, kinds })
      return toClient(saved, agentId)
    },

    /** A picture or GIF from the agent's device: checked, stored, then posted as a message. */
    postImage(agentId: string, channelId: string, bytes: Uint8Array, actor: ChatActor) {
      const mime = sniffImage(bytes)
      if (!mime) throw ApiError.validation('Only PNG, JPEG, WebP and GIF pictures can be shared.')
      if (bytes.length > (mime === 'image/gif' ? MAX_GIF_BYTES : MAX_IMAGE_BYTES))
        throw ApiError.validation(mime === 'image/gif' ? 'That GIF is too big (5 MB max).' : 'That picture is too big (2.5 MB max).')
      const { channel, now, recent } = gate(agentId, channelId)
      recent.push(now.getTime())
      sent.set(agentId, recent)
      const id = randomBytes(12).toString('hex')
      store.addAttachment({ id, channelId: channel.id, uploaderId: agentId, mime, size: bytes.length, data: bytes, createdAt: now.toISOString() })
      const saved = post(channel, agentId, imageText(id), false, now)
      audit(actor, agentId, 'chat.image', { channel: channel.id, message: saved.id, attachment: id, mime, size: bytes.length })
      return toClient(saved, agentId)
    },

    /** The bytes of an attached picture, for someone who can read that conversation (or an admin). */
    attachment(agentId: string, id: string, admin: boolean) {
      const a = /^[a-f0-9]{24}$/.test(id) ? store.getAttachment(id) : null
      const channel = a ? store.getChannel(a.channelId) : null
      if (!a || !channel || (!admin && !canRead(channel, agentId))) throw ApiError.notFound('That picture could not be found.')
      return { mime: a.mime, data: a.data }
    },

    /** Adds or removes the agent's emoji on a message; everyone in the conversation sees it live. */
    react(agentId: string, messageId: number, emoji: unknown) {
      if (!isEmoji(emoji)) throw ApiError.validation('React with an emoji.')
      const m = store.getMessage(messageId)
      if (!m || m.hiddenAt) throw ApiError.notFound('That message could not be found.')
      const channel = requireChannel(m.channelId, agentId)
      if (store.getConsent(agentId)?.version !== RULES_VERSION) throw new ApiError(403, 'RULES_NOT_ACCEPTED', 'Please read and accept the chat rules first.')
      const current = store.listReactions([m.id])
      const already = current.some((r) => r.agentId === agentId && r.emoji === emoji)
      if (!already && new Set(current.map((r) => r.emoji)).size >= MAX_REACTIONS_PER_MESSAGE && !current.some((r) => r.emoji === emoji))
        throw ApiError.validation('This message already has lots of different reactions — pick one of those.')
      store.toggleReaction(m.id, agentId, emoji, clock.now().toISOString())
      const rows = store.listReactions([m.id])
      for (const id of audience(channel))
        if (id !== agentId) bus.publish([id], { t: 'chat.reaction', channel: channel.id, id: m.id, reactions: reactionsFor(rows, id) })
      return { id: m.id, reactions: reactionsFor(rows, agentId) }
    },

    /** GIF search (GIPHY, family-friendly rating). Empty query = trending. Off when no key is configured. */
    async gifs(query: string) {
      if (!giphyKey) return { enabled: false, gifs: [] }
      const q = query.trim().replace(/\s+/g, ' ').slice(0, 50)
      const key = q.toLowerCase()
      const now = clock.now().getTime()
      const hit = gifCache.get(key)
      if (hit && now - hit.at < GIF_CACHE_MS) return { enabled: true, gifs: hit.gifs }
      const url = q
        ? `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(giphyKey)}&q=${encodeURIComponent(q)}&limit=24&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${encodeURIComponent(giphyKey)}&limit=24&rating=g`
      try {
        const res = await fetchFn(url)
        if (!res.ok) return { enabled: true, gifs: [] }
        const json = (await res.json()) as { data?: { id: string; title?: string; images?: Record<string, { url?: string; width?: string; height?: string }> }[] }
        const gifs = (json.data ?? [])
          .filter((g) => GIF_ID.test(g.id))
          .map((g) => ({ id: g.id, title: g.title ?? '', preview: g.images?.fixed_width_small?.url ?? g.images?.fixed_width?.url ?? '' }))
          .filter((g) => g.preview.startsWith('https://'))
        if (gifs.length) {
          if (gifCache.size >= GIF_CACHE_MAX) gifCache.delete(gifCache.keys().next().value!)
          gifCache.set(key, { at: now, gifs })
        }
        return { enabled: true, gifs }
      } catch {
        return { enabled: true, gifs: [] }
      }
    },

    markRead(agentId: string, channelId: string, messageId: number) {
      const channel = requireChannel(channelId, agentId)
      store.addMember(channel.id, agentId, clock.now().toISOString())
      store.setLastRead(channel.id, agentId, messageId)
      return { ok: true }
    },

    typing(agentId: string, channelId: string) {
      const channel = store.getChannel(channelId)
      if (!channel || !canPost(channel, agentId)) return
      const targets = audience(channel).filter((id) => id !== agentId)
      bus.publish(channel.kind === 'general' ? [] : targets, { t: 'chat.typing', channel: channel.id, from: friendKey(agentId), name: nameOf(agentId) })
    },

    report(agentId: string, messageId: number, reason: unknown, actor: ChatActor) {
      const message = store.getMessage(messageId)
      if (!message) throw ApiError.notFound('That message could not be found.')
      requireChannel(message.channelId, agentId)
      const r = store.addReport({
        messageId,
        reporterId: agentId,
        reason: typeof reason === 'string' ? reason.slice(0, 300) : null,
        createdAt: clock.now().toISOString(),
      })
      audit(actor, agentId, 'chat.report', { message: messageId, report: r.id })
      return { ok: true }
    },

    // ------------------------------------------------------------- admins
    // Quality-control copy of every conversation. Reads are audited.
    adminChannels() {
      return store.listChannels().map((c) => {
        const members = new Set(store.listMembers(c.id))
        const host = hostOfVisit(c)
        if (host) members.add(host)
        const last = store.lastMessage(c.id)
        return {
          id: c.id,
          kind: c.kind,
          title: c.kind === 'general' ? 'General' : c.kind === 'visit' && host ? `Home of ${nameOf(host)}` : [...members].map(nameOf).join(' & '),
          members: c.kind === 'general' ? [] : [...members].map((id) => ({ email: id, name: nameOf(id) })),
          lastAt: last?.createdAt ?? null,
        }
      })
    },

    adminRead(channelId: string, before: number | undefined, actor: ChatActor) {
      const channel = store.getChannel(channelId)
      if (!channel) throw ApiError.notFound('That conversation could not be found.')
      const rows = store.listMessages(channel.id, { beforeId: before, limit: 100 })
      audit(actor, null, 'chat.admin.read', { channel: channel.id, count: rows.length })
      return {
        channel: channel.id,
        messages: rows.map((m) => ({
          id: m.id,
          email: m.authorId,
          name: nameOf(m.authorId),
          body: m.body,
          flagged: m.flagged,
          hidden: !!m.hiddenAt,
          hiddenBy: m.hiddenBy,
          at: m.createdAt,
        })),
        more: rows.length === 100,
      }
    },

    adminReports(openOnly: boolean) {
      return store.listReports(openOnly).map((r) => {
        const m = store.getMessage(r.messageId)
        return {
          id: r.id,
          reason: r.reason,
          reporter: { email: r.reporterId, name: nameOf(r.reporterId) },
          at: r.createdAt,
          resolution: r.resolution,
          resolvedBy: r.resolvedBy,
          message: m ? { id: m.id, channel: m.channelId, email: m.authorId, name: nameOf(m.authorId), body: m.body, hidden: !!m.hiddenAt, at: m.createdAt } : null,
        }
      })
    },

    adminHide(messageId: number, actor: ChatActor) {
      const m = store.getMessage(messageId)
      if (!m) throw ApiError.notFound('That message could not be found.')
      store.hideMessage(messageId, actor.id, clock.now().toISOString())
      audit(actor, m.authorId, 'chat.admin.hide', { message: messageId, channel: m.channelId })
      const channel = store.getChannel(m.channelId)
      if (channel) bus.publish(audience(channel), { t: 'chat.hidden', channel: channel.id, id: messageId })
      return { ok: true }
    },

    adminResolve(reportId: number, action: 'hide' | 'dismiss', actor: ChatActor) {
      const r = store.listReports(false).find((x) => x.id === reportId)
      if (!r) throw ApiError.notFound('That report could not be found.')
      if (action === 'hide') this.adminHide(r.messageId, actor)
      store.resolveReport(reportId, actor.id, clock.now().toISOString(), action === 'hide' ? 'hidden' : 'dismissed')
      audit(actor, null, 'chat.admin.report', { report: reportId, action })
      return { ok: true }
    },

    adminMute(email: string, hours: number, reason: string | null, actor: ChatActor) {
      if (!repo.hasAgent(email)) throw ApiError.notFound('That agent could not be found.')
      if (hours <= 0) {
        store.setMute(email, null)
        audit(actor, email, 'chat.admin.unmute', null)
        return { mutedUntil: null }
      }
      const until = new Date(clock.now().getTime() + Math.min(hours, 24 * 30) * 3_600_000).toISOString()
      store.setMute(email, { agentId: email, until, mutedBy: actor.id, reason })
      audit(actor, email, 'chat.admin.mute', { until, reason })
      return { mutedUntil: until }
    },

    /** The full copy between two instants (hidden and flagged messages included). */
    exportRange(from: string, to: string) {
      const channels = new Map(store.listChannels().map((c) => [c.id, c]))
      return store.listMessagesBetween(from, to).map((m) => ({
        id: m.id,
        channel: m.channelId,
        channelKind: channels.get(m.channelId)?.kind ?? null,
        email: m.authorId,
        name: nameOf(m.authorId),
        body: m.body,
        flagged: m.flagged,
        hiddenAt: m.hiddenAt,
        hiddenBy: m.hiddenBy,
        at: m.createdAt,
      }))
    },

    /** Pictures shared in [from, to), with their bytes (base64), for the admins' daily backup. */
    exportAttachments(from: string, to: string) {
      return store.listAttachmentsBetween(from, to).map((x) => ({
        id: x.id,
        channel: x.channelId,
        email: x.uploaderId,
        mime: x.mime,
        size: x.size,
        at: x.createdAt,
        base64: Buffer.from(x.data).toString('base64'),
      }))
    },

    adminExport(from: string, to: string, actor: ChatActor) {
      const messages = this.exportRange(from, to)
      audit(actor, null, 'chat.admin.export', { from, to, count: messages.length })
      return { from, to, exportedAt: clock.now().toISOString(), messages }
    },

    /** Deletes messages older than the retention window. */
    purge(): number {
      const cutoff = new Date(clock.now().getTime() - RETENTION_DAYS * 86_400_000).toISOString()
      const removed = store.purgeBefore(cutoff)
      if (removed > 0) audit({ id: 'system', via: 'retention' }, null, 'chat.retention.purge', { before: cutoff, removed })
      return removed
    },

    /** For the live hub: can this agent post in the host's home chat right now? */
    visitChannelId: visitId,
  }
}

export type ChatApplicationService = ReturnType<typeof createChatApplicationService>
