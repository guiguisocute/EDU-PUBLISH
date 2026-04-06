/// <reference types="@cloudflare/workers-types" />

import { createViewStore, D1ViewStore } from '../lib/view-store'

interface Env {
  DB?: D1Database
}

const GUID_RE = /^\d{8}-[a-z0-9-]+-\d{2,3}$/

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const store = createViewStore(env as unknown as Record<string, unknown>)

  let guid: string
  try {
    const body = (await request.json()) as { guid?: string }
    guid = String(body?.guid ?? '')
  } catch {
    return Response.json({ ok: false, error: 'invalid body' }, { status: 400 })
  }

  if (!GUID_RE.test(guid)) {
    return Response.json({ ok: false, error: 'invalid guid' }, { status: 400 })
  }

  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0'
  const ipHash = await sha256(ip)

  const result = await store.recordView(guid, ipHash)

  // Opportunistic cleanup for D1 backend
  if (store instanceof D1ViewStore) {
    context.waitUntil(store.cleanupOldLogs())
  }

  return Response.json(result)
}
