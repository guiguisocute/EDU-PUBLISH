import { Article } from '../types';
import { UNKNOWN_SCHOOL } from './constants';

/**
 * Unified article sort: pinned first, then newest pubDate, guid as tiebreaker.
 *
 * In all-schools view, only `schoolSlug === UNKNOWN_SCHOOL` pins are promoted
 * to the top — other schools' pins sort normally so they don't pile up.
 */
export const sortArticles = (
  articles: Article[],
  isAllSchoolsView: boolean,
  sortOrder: 'latest' | 'expiring_soon' | 'popular' = 'latest',
  nowTs: number = Date.now(),
  viewCounts?: Record<string, number>
): Article[] =>
  articles.slice().sort((a, b) => {
    // 1. Pinned items always go first
    const aPinned = isAllSchoolsView
      ? Boolean(a.pinned && a.schoolSlug === UNKNOWN_SCHOOL)
      : Boolean(a.pinned);
    const bPinned = isAllSchoolsView
      ? Boolean(b.pinned && b.schoolSlug === UNKNOWN_SCHOOL)
      : Boolean(b.pinned);
    if (aPinned !== bPinned) return aPinned ? -1 : 1;

    // 2. Specific Sort Order
    if (sortOrder === 'expiring_soon') {
      const aEnd = a.endAt ? new Date(a.endAt).getTime() : 0;
      const bEnd = b.endAt ? new Date(b.endAt).getTime() : 0;

      const aNotExpired = aEnd > nowTs;
      const bNotExpired = bEnd > nowTs;

      // Group: Not expired (has endAt and > now) > Expired / No EndAt
      if (aNotExpired !== bNotExpired) {
        return aNotExpired ? -1 : 1;
      }

      // Both not expired -> Sort by end time ascending (closer to expire first)
      if (aNotExpired && bNotExpired) {
        if (aEnd !== bEnd) return aEnd - bEnd;
      }

      // Fallback or both expired / no endAt -> Sort by pubDate descending
    }

    // 3. Popular sort: by view count descending
    if (sortOrder === 'popular' && viewCounts) {
      const aViews = viewCounts[a.guid] ?? 0;
      const bViews = viewCounts[b.guid] ?? 0;
      if (aViews !== bViews) return bViews - aViews;
    }

    // Default / Fallback: Newest pubDate
    const diff = new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    if (diff !== 0) return diff;

    // Tiebreaker
    return (b.guid || '').localeCompare(a.guid || '', 'zh-CN');
  });
