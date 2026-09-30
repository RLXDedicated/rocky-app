import type { AttachmentRecord, ChannelRecord, ChatStore, MembershipRecord, MessageRecord, MuteRecord, ReactionRecord, ReportRecord } from './ChatStore'

export class InMemoryChatStore implements ChatStore {
  private channels = new Map<string, ChannelRecord>()
  private members = new Map<string, MembershipRecord>()
  private messages: MessageRecord[] = []
  private reports: ReportRecord[] = []
  private consents = new Map<string, { version: string; acceptedAt: string }>()
  private mutes = new Map<string, MuteRecord>()
  private reactions: (ReactionRecord & { at: string })[] = []
  private attachments = new Map<string, AttachmentRecord>()
  private nextMessage = 1
  private nextReport = 1

  private key = (c: string, a: string) => `${c}\u0000${a}`

  ensureChannel(channel: ChannelRecord): ChannelRecord {
    const found = this.channels.get(channel.id)
    if (found) return found
    this.channels.set(channel.id, { ...channel })
    return channel
  }
  getChannel(id: string) {
    return this.channels.get(id) ?? null
  }
  listChannels() {
    return [...this.channels.values()]
  }

  updateChannel(id: string, patch: { title?: string | null; avatar?: string | null; ownerId?: string | null; open?: boolean }) {
    const c = this.channels.get(id)
    if (c) Object.assign(c, patch)
  }
  removeMember(channelId: string, agentId: string) {
    this.members.delete(this.key(channelId, agentId))
  }
  setArchived(channelId: string, agentId: string, at: string | null) {
    const m = this.members.get(this.key(channelId, agentId))
    if (m) m.archivedAt = at
  }
  private edits: { messageId: number; body: string; editedAt: string; editedBy: string }[] = []
  editMessage(id: number, body: string, by: string, at: string) {
    const m = this.messages.find((x) => x.id === id)
    if (!m) return
    this.edits.push({ messageId: id, body: m.body, editedAt: at, editedBy: by })
    m.body = body
    m.editedAt = at
  }
  listEdits(messageId: number) {
    return this.edits.filter((e) => e.messageId === messageId).map(({ body, editedAt, editedBy }) => ({ body, editedAt, editedBy }))
  }
  addMember(channelId: string, agentId: string) {
    const k = this.key(channelId, agentId)
    if (!this.members.has(k)) this.members.set(k, { channelId, agentId, lastReadId: 0 })
  }
  isMember(channelId: string, agentId: string) {
    return this.members.has(this.key(channelId, agentId))
  }
  listMembers(channelId: string) {
    return [...this.members.values()].filter((m) => m.channelId === channelId).map((m) => m.agentId)
  }
  listMemberships(agentId: string) {
    return [...this.members.values()].filter((m) => m.agentId === agentId).map((m) => ({ ...m }))
  }
  setLastRead(channelId: string, agentId: string, messageId: number) {
    const m = this.members.get(this.key(channelId, agentId))
    if (m && messageId > m.lastReadId) m.lastReadId = messageId
  }

  addMessage(message: Omit<MessageRecord, 'id'>) {
    const row = { ...message, id: this.nextMessage++ }
    this.messages.push(row)
    return { ...row }
  }
  getMessage(id: number) {
    const m = this.messages.find((x) => x.id === id)
    return m ? { ...m } : null
  }
  listMessages(channelId: string, opts: { beforeId?: number; afterId?: number; limit: number }) {
    let rows = this.messages.filter((m) => m.channelId === channelId)
    if (opts.afterId !== undefined) return rows.filter((m) => m.id > opts.afterId!).slice(0, opts.limit).map((m) => ({ ...m }))
    if (opts.beforeId !== undefined) rows = rows.filter((m) => m.id < opts.beforeId!)
    return rows.slice(-opts.limit).map((m) => ({ ...m }))
  }
  lastMessage(channelId: string) {
    const rows = this.messages.filter((m) => m.channelId === channelId)
    return rows.length ? { ...rows[rows.length - 1]! } : null
  }
  countUnread(channelId: string, agentId: string, afterId: number) {
    return this.messages.filter((m) => m.channelId === channelId && m.id > afterId && m.authorId !== agentId && !m.hiddenAt).length
  }
  hideMessage(id: number, by: string, at: string) {
    const m = this.messages.find((x) => x.id === id)
    if (m && !m.hiddenAt) {
      m.hiddenAt = at
      m.hiddenBy = by
    }
  }
  listMessagesBetween(from: string, to: string) {
    return this.messages.filter((m) => m.createdAt >= from && m.createdAt < to).map((m) => ({ ...m }))
  }
  toggleReaction(messageId: number, agentId: string, emoji: string, at: string) {
    const i = this.reactions.findIndex((r) => r.messageId === messageId && r.agentId === agentId && r.emoji === emoji)
    if (i >= 0) {
      this.reactions.splice(i, 1)
      return false
    }
    this.reactions.push({ messageId, agentId, emoji, at })
    return true
  }
  listReactions(messageIds: number[]) {
    const ids = new Set(messageIds)
    return this.reactions.filter((r) => ids.has(r.messageId)).map(({ messageId, agentId, emoji }) => ({ messageId, agentId, emoji }))
  }
  private pins = new Map<string, { messageId: number; pinnedBy: string; pinnedAt: string }>()
  getPin(channelId: string) {
    return this.pins.get(channelId) ?? null
  }
  setPin(channelId: string, pin: { messageId: number; pinnedBy: string; pinnedAt: string } | null) {
    if (pin) this.pins.set(channelId, pin)
    else this.pins.delete(channelId)
  }

  addAttachment(a: AttachmentRecord) {
    this.attachments.set(a.id, { ...a })
  }
  getAttachment(id: string) {
    return this.attachments.get(id) ?? null
  }
  listAttachmentsBetween(from: string, to: string) {
    return [...this.attachments.values()].filter((a) => a.createdAt >= from && a.createdAt < to)
  }

  purgeBefore(before: string) {
    const gone = new Set(this.messages.filter((m) => m.createdAt < before).map((m) => m.id))
    this.reactions = this.reactions.filter((r) => !gone.has(r.messageId))
    for (const [id, a] of this.attachments) if (a.createdAt < before) this.attachments.delete(id)
    this.messages = this.messages.filter((m) => !gone.has(m.id))
    this.reports = this.reports.filter((r) => !gone.has(r.messageId))
    return gone.size
  }

  addReport(report: Omit<ReportRecord, 'id' | 'resolvedAt' | 'resolvedBy' | 'resolution'>) {
    const row: ReportRecord = { ...report, id: this.nextReport++, resolvedAt: null, resolvedBy: null, resolution: null }
    this.reports.push(row)
    return { ...row }
  }
  listReports(openOnly: boolean) {
    return this.reports
      .filter((r) => !openOnly || !r.resolvedAt)
      .map((r) => ({ ...r }))
      .reverse()
  }
  resolveReport(id: number, by: string, at: string, resolution: string) {
    const r = this.reports.find((x) => x.id === id)
    if (!r) return null
    r.resolvedAt = at
    r.resolvedBy = by
    r.resolution = resolution
    return { ...r }
  }

  getConsent(agentId: string) {
    return this.consents.get(agentId) ?? null
  }
  setConsent(agentId: string, version: string, at: string) {
    this.consents.set(agentId, { version, acceptedAt: at })
  }

  getMute(agentId: string) {
    return this.mutes.get(agentId) ?? null
  }
  setMute(agentId: string, mute: MuteRecord | null) {
    if (mute) this.mutes.set(agentId, mute)
    else this.mutes.delete(agentId)
  }
}
