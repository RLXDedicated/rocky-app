import type { DatabaseSync } from 'node:sqlite'
import type { ChannelKind, ChannelRecord, ChatStore, MembershipRecord, MessageRecord, MuteRecord, ReportRecord } from './ChatStore'

interface ChannelRow {
  channel_id: string
  kind: string
  title: string | null
  created_at: string
}
interface MessageRow {
  message_id: number
  channel_id: string
  author_id: string
  body: string
  flagged: number
  created_at: string
  hidden_at: string | null
  hidden_by: string | null
}
interface ReportRow {
  report_id: number
  message_id: number
  reporter_id: string
  reason: string | null
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
  resolution: string | null
}

const channel = (r: ChannelRow): ChannelRecord => ({ id: r.channel_id, kind: r.kind as ChannelKind, title: r.title, createdAt: r.created_at })
const message = (r: MessageRow): MessageRecord => ({
  id: r.message_id,
  channelId: r.channel_id,
  authorId: r.author_id,
  body: r.body,
  flagged: r.flagged === 1,
  createdAt: r.created_at,
  hiddenAt: r.hidden_at,
  hiddenBy: r.hidden_by,
})
const report = (r: ReportRow): ReportRecord => ({
  id: r.report_id,
  messageId: r.message_id,
  reporterId: r.reporter_id,
  reason: r.reason,
  createdAt: r.created_at,
  resolvedAt: r.resolved_at,
  resolvedBy: r.resolved_by,
  resolution: r.resolution,
})

export class SqliteChatStore implements ChatStore {
  constructor(private readonly db: DatabaseSync) {}

  ensureChannel(c: ChannelRecord): ChannelRecord {
    this.db
      .prepare('INSERT OR IGNORE INTO chat_channels (channel_id, kind, title, created_at) VALUES (?, ?, ?, ?)')
      .run(c.id, c.kind, c.title, c.createdAt)
    return this.getChannel(c.id)!
  }
  getChannel(id: string) {
    const r = this.db.prepare('SELECT * FROM chat_channels WHERE channel_id = ?').get(id) as ChannelRow | undefined
    return r ? channel(r) : null
  }
  listChannels() {
    return (this.db.prepare('SELECT * FROM chat_channels ORDER BY created_at').all() as unknown as ChannelRow[]).map(channel)
  }

  addMember(channelId: string, agentId: string, at: string) {
    this.db.prepare('INSERT OR IGNORE INTO chat_members (channel_id, agent_id, last_read_id, joined_at) VALUES (?, ?, 0, ?)').run(channelId, agentId, at)
  }
  isMember(channelId: string, agentId: string) {
    return !!this.db.prepare('SELECT 1 FROM chat_members WHERE channel_id = ? AND agent_id = ?').get(channelId, agentId)
  }
  listMembers(channelId: string) {
    return (this.db.prepare('SELECT agent_id FROM chat_members WHERE channel_id = ?').all(channelId) as { agent_id: string }[]).map((r) => r.agent_id)
  }
  listMemberships(agentId: string): MembershipRecord[] {
    return (
      this.db.prepare('SELECT channel_id, agent_id, last_read_id FROM chat_members WHERE agent_id = ?').all(agentId) as {
        channel_id: string
        agent_id: string
        last_read_id: number
      }[]
    ).map((r) => ({ channelId: r.channel_id, agentId: r.agent_id, lastReadId: r.last_read_id }))
  }
  setLastRead(channelId: string, agentId: string, messageId: number) {
    this.db
      .prepare('UPDATE chat_members SET last_read_id = ? WHERE channel_id = ? AND agent_id = ? AND last_read_id < ?')
      .run(messageId, channelId, agentId, messageId)
  }

  addMessage(m: Omit<MessageRecord, 'id'>) {
    const res = this.db
      .prepare('INSERT INTO chat_messages (channel_id, author_id, body, flagged, created_at, hidden_at, hidden_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(m.channelId, m.authorId, m.body, m.flagged ? 1 : 0, m.createdAt, m.hiddenAt, m.hiddenBy)
    return { ...m, id: Number(res.lastInsertRowid) }
  }
  getMessage(id: number) {
    const r = this.db.prepare('SELECT * FROM chat_messages WHERE message_id = ?').get(id) as MessageRow | undefined
    return r ? message(r) : null
  }
  listMessages(channelId: string, opts: { beforeId?: number; afterId?: number; limit: number }) {
    if (opts.afterId !== undefined) {
      return (
        this.db
          .prepare('SELECT * FROM chat_messages WHERE channel_id = ? AND message_id > ? ORDER BY message_id LIMIT ?')
          .all(channelId, opts.afterId, opts.limit) as unknown as MessageRow[]
      ).map(message)
    }
    const rows = (
      this.db
        .prepare('SELECT * FROM chat_messages WHERE channel_id = ? AND message_id < ? ORDER BY message_id DESC LIMIT ?')
        .all(channelId, opts.beforeId ?? Number.MAX_SAFE_INTEGER, opts.limit) as unknown as MessageRow[]
    ).map(message)
    return rows.reverse()
  }
  lastMessage(channelId: string) {
    const r = this.db.prepare('SELECT * FROM chat_messages WHERE channel_id = ? ORDER BY message_id DESC LIMIT 1').get(channelId) as MessageRow | undefined
    return r ? message(r) : null
  }
  countUnread(channelId: string, agentId: string, afterId: number) {
    const r = this.db
      .prepare('SELECT COUNT(*) AS n FROM chat_messages WHERE channel_id = ? AND message_id > ? AND author_id <> ? AND hidden_at IS NULL')
      .get(channelId, afterId, agentId) as { n: number }
    return r.n
  }
  hideMessage(id: number, by: string, at: string) {
    this.db.prepare('UPDATE chat_messages SET hidden_at = ?, hidden_by = ? WHERE message_id = ? AND hidden_at IS NULL').run(at, by, id)
  }
  listMessagesBetween(from: string, to: string) {
    return (
      this.db.prepare('SELECT * FROM chat_messages WHERE created_at >= ? AND created_at < ? ORDER BY message_id').all(from, to) as unknown as MessageRow[]
    ).map(message)
  }
  purgeBefore(before: string) {
    this.db.prepare('DELETE FROM chat_reports WHERE message_id IN (SELECT message_id FROM chat_messages WHERE created_at < ?)').run(before)
    return Number(this.db.prepare('DELETE FROM chat_messages WHERE created_at < ?').run(before).changes)
  }

  addReport(r: Omit<ReportRecord, 'id' | 'resolvedAt' | 'resolvedBy' | 'resolution'>) {
    const res = this.db
      .prepare('INSERT INTO chat_reports (message_id, reporter_id, reason, created_at) VALUES (?, ?, ?, ?)')
      .run(r.messageId, r.reporterId, r.reason, r.createdAt)
    return { ...r, id: Number(res.lastInsertRowid), resolvedAt: null, resolvedBy: null, resolution: null }
  }
  listReports(openOnly: boolean) {
    const sql = openOnly
      ? 'SELECT * FROM chat_reports WHERE resolved_at IS NULL ORDER BY report_id DESC'
      : 'SELECT * FROM chat_reports ORDER BY report_id DESC LIMIT 200'
    return (this.db.prepare(sql).all() as unknown as ReportRow[]).map(report)
  }
  resolveReport(id: number, by: string, at: string, resolution: string) {
    this.db.prepare('UPDATE chat_reports SET resolved_at = ?, resolved_by = ?, resolution = ? WHERE report_id = ?').run(at, by, resolution, id)
    const r = this.db.prepare('SELECT * FROM chat_reports WHERE report_id = ?').get(id) as ReportRow | undefined
    return r ? report(r) : null
  }

  getConsent(agentId: string) {
    const r = this.db.prepare('SELECT version, accepted_at FROM chat_consents WHERE agent_id = ?').get(agentId) as
      | { version: string; accepted_at: string }
      | undefined
    return r ? { version: r.version, acceptedAt: r.accepted_at } : null
  }
  setConsent(agentId: string, version: string, at: string) {
    this.db
      .prepare('INSERT INTO chat_consents (agent_id, version, accepted_at) VALUES (?, ?, ?) ON CONFLICT(agent_id) DO UPDATE SET version = excluded.version, accepted_at = excluded.accepted_at')
      .run(agentId, version, at)
  }

  getMute(agentId: string) {
    const r = this.db.prepare('SELECT * FROM chat_mutes WHERE agent_id = ?').get(agentId) as
      | { agent_id: string; until: string; muted_by: string; reason: string | null }
      | undefined
    return r ? { agentId: r.agent_id, until: r.until, mutedBy: r.muted_by, reason: r.reason } : null
  }
  setMute(agentId: string, mute: MuteRecord | null) {
    if (!mute) {
      this.db.prepare('DELETE FROM chat_mutes WHERE agent_id = ?').run(agentId)
      return
    }
    this.db
      .prepare('INSERT INTO chat_mutes (agent_id, until, muted_by, reason) VALUES (?, ?, ?, ?) ON CONFLICT(agent_id) DO UPDATE SET until = excluded.until, muted_by = excluded.muted_by, reason = excluded.reason')
      .run(agentId, mute.until, mute.mutedBy, mute.reason)
  }
}
