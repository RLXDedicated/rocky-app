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
import { createHash } from 'node:crypto'
import { ApiError } from '../api/errors'
import type { PersistenceContext } from '../infrastructure/persistenceContext'
import type { ChannelRecord, MessageRecord } from '../infrastructure/chat/ChatStore'
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
}

export function createChatApplicationService({ persistence, bus, clock = systemClock, isStaff = () => false }: ChatDeps) {
  const store = persistence.chat
  const repo = persistence.repoStore
  const sent = new Map<string, number[]>()

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

  function toClient(m: MessageRecord, viewerId: string) {
    return {
      id: m.id,
      channel: m.channelId,
      from: friendKey(m.authorId),
      name: nameOf(m.authorId),
      staff: isStaff(m.authorId),
      mine: m.authorId === viewerId,
      body: m.hiddenAt ? '' : m.body,
      hidden: !!m.hiddenAt,
      at: m.createdAt,
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
      return { channel: channel.id, messages: rows.map((m) => toClient(m, agentId)), more: opts.after === undefined && rows.length === PAGE }
    },

    send(agentId: string, channelId: string, text: unknown, confirm: boolean, actor: ChatActor) {
      if (typeof text !== 'string' || !text.trim()) throw ApiError.validation('Write a message first.')
      const body = text.trim().replace(/\r\n/g, '\n')
      if (body.length > MAX_MESSAGE_LENGTH) throw ApiError.validation(`Messages can be up to ${MAX_MESSAGE_LENGTH} characters.`)
      if (store.getConsent(agentId)?.version !== RULES_VERSION) throw new ApiError(403, 'RULES_NOT_ACCEPTED', 'Please read and accept the chat rules first.')
      const now = clock.now()
      const mute = store.getMute(agentId)
      if (mute && mute.until > now.toISOString())
        throw new ApiError(403, 'MUTED', `Your chat is paused until ${new Date(mute.until).toLocaleString('en-US')}. Contact the QA team if you think this is a mistake.`)
      const channel = requireChannel(channelId, agentId)
      if (!canPost(channel, agentId)) throw ApiError.forbidden('You can chat here while you are visiting.')
      const recent = (sent.get(agentId) ?? []).filter((t) => now.getTime() - t < RATE_WINDOW_MS)
      if (recent.length >= RATE_LIMIT) throw new ApiError(429, 'SLOW_DOWN', 'You are sending messages very fast — wait a few seconds.')
      const kinds = sensitiveKinds(body)
      if (kinds.length && !confirm)
        throw new ApiError(
          422,
          'SENSITIVE_DATA',
          `This looks like customer information (${kinds.join(', ')}). Never share customer data in Rocky chat — use the approved work systems.`,
        )
      recent.push(now.getTime())
      sent.set(agentId, recent)
      store.addMember(channel.id, agentId, now.toISOString())
      const saved = store.addMessage({
        channelId: channel.id,
        authorId: agentId,
        body,
        flagged: kinds.length > 0,
        createdAt: now.toISOString(),
        hiddenAt: null,
        hiddenBy: null,
      })
      store.setLastRead(channel.id, agentId, saved.id)
      if (saved.flagged) audit(actor, agentId, 'chat.message.flagged', { channel: channel.id, message: saved.id, kinds })
      const targets = audience(channel)
      for (const id of targets) bus.publish([id], { t: 'chat.message', channel: channel.id, kind: channel.kind, message: toClient(saved, id) })
      return toClient(saved, agentId)
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
