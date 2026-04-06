import React from 'react';

const READ_KEY = 'edu_publish_read_ids';
const READ_IDS_MAX = 2000;

export function useReadArticles() {
  const readArticleIdsRef = React.useRef<Set<string>>(null!);
  if (readArticleIdsRef.current === null) {
    readArticleIdsRef.current = (() => {
      try {
        const raw = localStorage.getItem(READ_KEY);
        return raw ? new Set<string>((JSON.parse(raw) as string[]).slice(-READ_IDS_MAX)) : new Set<string>();
      } catch {
        return new Set<string>();
      }
    })();
  }

  const [, setReadVersion] = React.useState(0);

  const markArticleRead = React.useCallback((guid: string) => {
    const set = readArticleIdsRef.current;
    if (set.has(guid)) return;
    set.add(guid);
    if (set.size > READ_IDS_MAX) {
      const excess = set.size - READ_IDS_MAX;
      let removed = 0;
      for (const id of set) {
        if (removed >= excess) break;
        set.delete(id);
        removed++;
      }
    }
    try {
      localStorage.setItem(READ_KEY, JSON.stringify([...set]));
    } catch {
      // Quota exceeded - trim oldest entries and retry
      const arr = [...set];
      const trimmed = arr.slice(Math.max(0, arr.length - 500));
      try {
        localStorage.setItem(READ_KEY, JSON.stringify(trimmed));
      } catch {
        // Storage completely unavailable, continue in-memory only
      }
    }
    setReadVersion((v) => v + 1);
  }, []);

  return { readArticleIdsRef, markArticleRead };
}
