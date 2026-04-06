import { Article, Feed, FeedMeta, CompiledContent } from '../types';
import { sortArticles } from './sort-articles';
import { UNKNOWN_SOURCE } from './constants';
import { siteConfig } from './site-config';

export function buildFeedEntries(contentData: CompiledContent): Array<{ meta: FeedMeta; feed: Feed }> {
  const map = new Map<string, { meta: FeedMeta; feed: Feed }>();
  const subscriptionMap = new Map<string, CompiledContent['subscriptions'][number]>(
    contentData.subscriptions.map((item) => [item.id, item])
  );

  map.set('all-schools', {
    meta: {
      id: 'all-schools',
      category: '全校',
      feedType: 'global',
      customTitle: '全校汇总',
      sourceChannel: '全校汇总',
      hiddenInSidebar: true,
      routeSlug: 'all-schools',
    },
    feed: {
      url: '/',
      title: '全校汇总',
      description: '全校全部通知流',
      image: siteConfig.favicon,
      category: '全校',
      items: [],
    },
  });

  for (const school of contentData.schools) {
    const overviewId = `school-${school.slug}-all`;
    const summaryTitle = `${school.name}汇总`;
    map.set(overviewId, {
      meta: {
        id: overviewId,
        category: school.name,
        feedType: 'summary',
        customTitle: summaryTitle,
        schoolSlug: school.slug,
        sourceChannel: summaryTitle,
        routeSlug: school.slug,
      },
      feed: {
        url: `/school/${overviewId}`,
        title: summaryTitle,
        description: `${school.name}全部通知流`,
        image: school.icon || '',
        category: school.name,
        items: [],
      },
    });
  }

  for (const subscription of contentData.subscriptions.filter((item) => item.enabled)) {
    const sourceTitle = subscription.title;
    map.set(subscription.id, {
      meta: {
        id: subscription.id,
        category: subscription.schoolName,
        feedType: 'source',
        customTitle: sourceTitle,
        schoolSlug: subscription.schoolSlug,
        sourceChannel: sourceTitle,
        routeSlug: subscription.id,
      },
      feed: {
        url: `/school/${subscription.id}`,
        title: sourceTitle,
        description: `${subscription.schoolName} / ${sourceTitle}`,
        image: subscription.icon || '',
        category: subscription.schoolName,
        items: [],
      },
    });
  }

  for (const article of contentData.notices) {
    const subscription = subscriptionMap.get(article.subscriptionId || '');
    if (!subscription || !subscription.enabled) {
      continue;
    }

    const feedId = article.subscriptionId!;
    const overviewId = `school-${article.schoolSlug}-all`;

    map.get('all-schools')?.feed.items.push(article);
    map.get(overviewId)?.feed.items.push(article);
    map.get(feedId)!.feed.items.push(article);
  }

  const entries = Array.from(map.entries());
  entries.forEach(([feedId, entry]) => {
    const isAllSchools = feedId === 'all-schools';
    entry.feed.items = sortArticles(entry.feed.items, isAllSchools);

    if (entry.meta.sourceChannel === UNKNOWN_SOURCE && entry.feed.items.length === 0) {
      entry.meta.hiddenInSidebar = true;
    }

    if (entry.meta.id === 'school-unknown-all' && entry.feed.items.length === 0) {
      entry.meta.hiddenInSidebar = true;
    }
  });

  return entries.map(([, value]) => value);
}
