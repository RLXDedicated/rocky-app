// Storage for the internal chat (see docs/REALTIME_CHAT_PLAN.md). No rules
// here — who may read or post, rate limits, the customer-data check and
// retention live in application/chatApplicationService.ts.

export type ChannelKind = 'general' | 'dm' | 'visit' | 'group'

export interface ChannelRecord {
  id: string
  kind: ChannelKind
  title: string | null
  createdAt: string
  /** Groups: an emoji, or "img:<attachment id>" for an uploaded picture. */
  avatar?: string | null
  /** Groups: who created it (can rename, change the picture, add/remove people). */
  ownerId?: string | null
  /** An open room anyone can find and join (created by admins). */
  open?: boolean
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
  editedAt?: string | null
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
  archivedAt?: string | null
}

export interface MuteRecord {
  agentId: string
  until: string
  mutedBy: string
  reason: string | null
}

export interface ReactionRecord {
  messageId: number
  agentId: string
  emoji: string
}

export interface AttachmentRecord {
  id: string
  channelId: string
  uploaderId: string
  mime: string
  size: number
  data: Uint8Array
  createdAt: string
}

export interface ChatStore {
  ensureChannel(channel: ChannelRecord): ChannelRecord
  getChannel(id: string): ChannelRecord | null
  listChannels(): ChannelRecord[]

  updateChannel(id: string, patch: { title?: string | null; avatar?: string | null; ownerId?: string | null; open?: boolean }): void
  addMember(channelId: string, agentId: string, at: string): void
  removeMember(channelId: string, agentId: string): void
  /** Hides a conversation from one person's list (null brings it back). */
  setArchived(channelId: string, agentId: string, at: string | null): void
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
  /** Changes a message's text, keeping the previous version for the admins' copy. */
  editMessage(id: number, body: string, by: string, at: string): void
  listEdits(messageId: number): { body: string; editedAt: string; editedBy: string }[]
  /** Every message (hidden ones too) created in [from, to), oldest first — for the admin copy and backups. */
  listMessagesBetween(from: string, to: string): MessageRecord[]
  /** Deletes messages (and their reports) older than `before`; returns how many were removed. */
  purgeBefore(before: string): number

  /** Adds the reaction, or removes it if it was already there; true when it is now on. */
  toggleReaction(messageId: number, agentId: string, emoji: string, at: string): boolean
  listReactions(messageIds: number[]): ReactionRecord[]

  /** The channel's pinned announcement (one per channel), or null. */
  getPin(channelId: string): { messageId: number; pinnedBy: string; pinnedAt: string } | null
  setPin(channelId: string, pin: { messageId: number; pinnedBy: string; pinnedAt: string } | null): void

  addAttachment(a: AttachmentRecord): void
  getAttachment(id: string): AttachmentRecord | null
  /** Attachments (with their bytes) created in [from, to) — for the daily admin backup. */
  listAttachmentsBetween(from: string, to: string): AttachmentRecord[]

  addReport(report: Omit<ReportRecord, 'id' | 'resolvedAt' | 'resolvedBy' | 'resolution'>): ReportRecord
  listReports(openOnly: boolean): ReportRecord[]
  resolveReport(id: number, by: string, at: string, resolution: string): ReportRecord | null

  getConsent(agentId: string): { version: string; acceptedAt: string } | null
  setConsent(agentId: string, version: string, at: string): void

  getMute(agentId: string): MuteRecord | null
  setMute(agentId: string, mute: MuteRecord | null): void
}
