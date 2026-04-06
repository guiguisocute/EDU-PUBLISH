import { useCallback, useEffect, useRef, useState } from 'react';

const BATCH_SIZE = 100;
const cache = new Map<string, number>();

async function fetchBatch(ids: string[]): Promise<Record<string, number>> {
  const res = await fetch(`/api/views?ids=${encodeURIComponent(ids.join(','))}`);
  if (!res.ok) return {};
  return (await res.json()) as Record<string, number>;
}

export function useViewCounts(guids: string[]): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const inflightRef = useRef<Set<string>>(new Set());

  const fetchMissing = useCallback(async (ids: string[]) => {
    const uncached = ids.filter((id) => !cache.has(id) && !inflightRef.current.has(id));
    if (uncached.length === 0) return;

    uncached.forEach((id) => inflightRef.current.add(id));

    try {
      // Chunk into batches of BATCH_SIZE
      const chunks: string[][] = [];
      for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
        chunks.push(uncached.slice(i, i + BATCH_SIZE));
      }

      const results = await Promise.all(chunks.map(fetchBatch));
      const merged: Record<string, number> = {};
      for (const data of results) {
        Object.assign(merged, data);
      }

      for (const id of uncached) {
        cache.set(id, merged[id] ?? 0);
      }
      setCounts((prev) => {
        const next = { ...prev };
        for (const id of uncached) {
          next[id] = cache.get(id) ?? 0;
        }
        return next;
      });
    } catch {
      // Silent degradation
    } finally {
      uncached.forEach((id) => inflightRef.current.delete(id));
    }
  }, []);

  useEffect(() => {
    if (guids.length === 0) return;

    // Return cached values immediately
    const immediate: Record<string, number> = {};
    let hasCached = false;
    for (const id of guids) {
      if (cache.has(id)) {
        immediate[id] = cache.get(id)!;
        hasCached = true;
      }
    }
    if (hasCached) {
      setCounts((prev) => ({ ...prev, ...immediate }));
    }

    fetchMissing(guids);
  }, [guids, fetchMissing]);

  return counts;
}

/** Bump the in-memory cache after a local view event */
export function bumpViewCache(guid: string): void {
  cache.set(guid, (cache.get(guid) ?? 0) + 1);
}
