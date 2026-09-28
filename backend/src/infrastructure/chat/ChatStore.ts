// Storage for the internal chat (see docs/REALTIME_CHAT_PLAN.md). No rules
// here — who may read or post, rate limits, the customer-data check and
// retention live in application/chatApplicationService.ts.

export type ChannelKind = 'general' | 'dm' | 'visit'

export interface ChannelRecord {
  id: string
  kind: ChannelKind
  title: string | null
  createdAt: string
}

export interface MessageRecord {
  id: number
  channelId: string
  authorId: string
  body: string
  /** Sent even though it looked like customer data (the author confirmed). */
  flagged: boolean
  createdAt: string
  hiddenAt: string | null
  hiddenBy: string | null
}

export interface ReportRecord {
  id: number
  messageId: number
  reporterId: string
  reason: string | null
  createdAt: string
  resolvedAt: string | null
  resolvedBy: string | null
  resolution: string | null
}

export interface MembershipRecord {
  channelId: string
  agentId: string
  lastReadId: number
}

export interface MuteRecord {
  agentId: string
  until: string
  mutedBy: string
  reason: string | null
}

export interface ChatStore {
  ensureChannel(channel: ChannelRecord): ChannelRecord
  getChannel(id: string): ChannelRecord | null
  listChannels(): ChannelRecord[]

  addMember(channelId: string, agentId: string, at: string): void
  isMember(channelId: string, agentId: string): boolean
  listMembers(channelId: string): string[]
  listMemberships(agentId: string): MembershipRecord[]
  setLastRead(channelId: string, agentId: string, messageId: number): void

  addMessage(message: Omit<MessageRecord, 'id'>): MessageRecord
  getMessage(id: number): MessageRecord | null
  /** Oldest first; `beforeId` pages back in history, `afterId` catches up. */
  listMessages(channelId: string, opts: { beforeId?: number; afterId?: number; limit: number }): MessageRecord[]
  lastMessage(channelId: string): MessageRecord | null
  countUnread(channelId: string, agentId: string, afterId: number): number
  hideMessage(id: number, by: string, at: string): void
  /** Every message (hidden ones too) created in [from, to), oldest first — for the admin copy and backups. */
  listMessagesBetween(from: string, to: string): MessageRecord[]
  /** Deletes messages (and their reports) older than `before`; returns how many were removed. */
  purgeBefore(before: string): number

  addReport(report: Omit<ReportRecord, 'id' | 'resolvedAt' | 'resolvedBy' | 'resolution'>): ReportRecord
  listReports(openOnly: boolean): ReportRecord[]
  resolveReport(id: number, by: string, at: string, resolution: string): ReportRecord | null

  getConsent(agentId: string): { version: string; acceptedAt: string } | null
  setConsent(agentId: string, version: string, at: string): void

  getMute(agentId: string): MuteRecord | null
  setMute(agentId: string, mute: MuteRecord | null): void
}
