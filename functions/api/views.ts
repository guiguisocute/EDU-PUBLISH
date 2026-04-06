/// <reference types="@cloudflare/workers-types" />

import { createViewStore } from '../lib/view-store'

interface Env {
  DB?: D1Database
}

const MAX_IDS = 100

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)
  const idsParam = url.searchParams.get('ids') || ''

  const ids = idsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_IDS)

  if (ids.length === 0) {
    return Response.json(
      {},
      { headers: { 'Cache-Control': 'public, max-age=60' } }
    )
  }

  const store = createViewStore(env as unknown as Record<string, unknown>)
  const counts = await store.getViewCounts(ids)

  return Response.json(counts, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  })
}
