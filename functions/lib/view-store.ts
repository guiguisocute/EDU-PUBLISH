/// <reference types="@cloudflare/workers-types" />

export interface ViewStore {
  recordView(guid: string, ipHash: string): Promise<{ ok: boolean; dup?: boolean }>
  getViewCounts(guids: string[]): Promise<Record<string, number>>
}

export class NullViewStore implements ViewStore {
  async recordView(): Promise<{ ok: boolean; dup?: boolean }> {
    return { ok: true }
  }
  async getViewCounts(guids: string[]): Promise<Record<string, number>> {
    return Object.fromEntries(guids.map(g => [g, 0]))
  }
}

const HOUR_S = 3600
const DAY_S = 86400

export class D1ViewStore implements ViewStore {
  constructor(private db: D1Database) {}

  async recordView(guid: string, ipHash: string): Promise<{ ok: boolean; dup?: boolean }> {
    const now = Math.floor(Date.now() / 1000)

    const existing = await this.db
      .prepare('SELECT 1 FROM view_logs WHERE ip_hash = ? AND guid = ? AND ts > ?')
      .bind(ipHash, guid, now - HOUR_S)
      .first()

    if (existing) {
      return { ok: true, dup: true }
    }

    await this.db.batch([
      this.db
        .prepare(
          'INSERT INTO view_logs (ip_hash, guid, ts) VALUES (?, ?, ?) ON CONFLICT (ip_hash, guid) DO UPDATE SET ts = excluded.ts'
        )
        .bind(ipHash, guid, now),
      this.db
        .prepare(
          'INSERT INTO view_counts (guid, views) VALUES (?, 1) ON CONFLICT (guid) DO UPDATE SET views = views + 1'
        )
        .bind(guid),
    ])

    return { ok: true }
  }

  async cleanupOldLogs(): Promise<void> {
    const now = Math.floor(Date.now() / 1000)
    await this.db.prepare('DELETE FROM view_logs WHERE ts < ?').bind(now - DAY_S).run()
  }

  async getViewCounts(guids: string[]): Promise<Record<string, number>> {
    if (guids.length === 0) return {}

    const placeholders = guids.map(() => '?').join(',')
    const { results } = await this.db
      .prepare(`SELECT guid, views FROM view_counts WHERE guid IN (${placeholders})`)
      .bind(...guids)
      .all<{ guid: string; views: number }>()

    const counts: Record<string, number> = {}
    for (const row of results) {
      counts[row.guid] = row.views
    }
    return counts
  }
}

export function createViewStore(env: Record<string, unknown>): ViewStore {
  const db = env.DB as D1Database | undefined
  if (db) return new D1ViewStore(db)
  return new NullViewStore()
}
