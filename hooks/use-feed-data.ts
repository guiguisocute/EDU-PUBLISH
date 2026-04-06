import React from 'react';
import { Feed, FeedMeta, CompiledContent } from '../types';
import { buildFeedEntries } from '../lib/build-feed-entries';

export interface CategoryNode {
  name: string;
  path: string;
  feeds: FeedMeta[];
  children: Map<string, CategoryNode>;
  depth: number;
}

export function useFeedData(contentData: CompiledContent) {
  const schoolFeedEntries = React.useMemo(() => buildFeedEntries(contentData), [contentData]);

  const schoolShortNameMap = React.useMemo<Record<string, string>>(
    () => Object.fromEntries(contentData.schools.map((school) => [school.slug, school.shortName || school.name])),
    [contentData.schools]
  );

  const schoolNameBySlug = React.useMemo<Record<string, string>>(
    () => Object.fromEntries(contentData.schools.map((school) => [school.slug, school.name])),
    [contentData.schools]
  );

  const feedConfigs = React.useMemo(() => schoolFeedEntries.map((item) => item.meta), [schoolFeedEntries]);

  const getFeed = React.useCallback(
    (id: string): Feed | undefined => schoolFeedEntries.find((e) => e.meta.id === id)?.feed,
    [schoolFeedEntries]
  );

  const groupedFeeds = React.useMemo(() => {
    const root: Map<string, CategoryNode> = new Map();
    feedConfigs.forEach((meta) => {
      if (meta.hiddenInSidebar) return;
      const parts = (meta.category || '').split('/').filter(Boolean);
      if (parts.length === 0) {
        const key = '__uncategorized__';
        if (!root.has(key)) root.set(key, { name: '', path: key, feeds: [], children: new Map(), depth: 0 });
        root.get(key)!.feeds.push(meta);
        return;
      }

      let current = root;
      let currentPath = '';
      let node: CategoryNode | null = null;

      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        if (!current.has(part)) {
          current.set(part, {
            name: part,
            path: currentPath,
            feeds: [],
            children: new Map(),
            depth: index,
          });
        }
        node = current.get(part)!;
        current = node.children;
      });

      if (node) node.feeds.push(meta);
    });
    return root;
  }, [feedConfigs]);

  const feedAvatarCache = React.useMemo<Record<string, string>>(
    () => Object.fromEntries(
      schoolFeedEntries
        .filter((e) => e.feed.image)
        .map((e) => [e.meta.id, e.feed.image])
    ),
    [schoolFeedEntries]
  );

  const feedSummaryMap = React.useMemo<Record<string, number>>(
    () => Object.fromEntries(schoolFeedEntries.map((e) => [e.meta.id, e.feed.items.length])),
    [schoolFeedEntries]
  );

  return {
    schoolFeedEntries,
    schoolShortNameMap,
    schoolNameBySlug,
    feedConfigs,
    getFeed,
    groupedFeeds,
    feedAvatarCache,
    feedSummaryMap,
  };
}
