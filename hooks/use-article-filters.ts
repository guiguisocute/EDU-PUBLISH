import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Article, Feed, SearchItem } from '../types';
import { getTimeWindowState } from '../lib/time-window';
import { sortArticles } from '../lib/sort-articles';
import { useNow } from './use-now';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const ARTICLES_PER_PAGE = 12;
type SearchHitLocation = 'content' | 'attachment' | 'content+attachment';

const getVisiblePageTokens = (currentPage: number, totalPages: number): (number | string)[] => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 4) return [1, 2, 3, 4, 5, 'e1', totalPages];
  if (currentPage >= totalPages - 3) return [1, 'e1', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, 'e1', currentPage - 1, currentPage, currentPage + 1, 'e2', totalPages];
};

export interface ArticleFilterState {
  selectedDate: Date | null;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date | null>>;
  activeFilters: string[];
  setActiveFilters: React.Dispatch<React.SetStateAction<string[]>>;
  activeTagFilters: string[];
  setActiveTagFilters: React.Dispatch<React.SetStateAction<string[]>>;
  timedOnly: boolean;
  setTimedOnly: React.Dispatch<React.SetStateAction<boolean>>;
  hideExpired: boolean;
  setHideExpired: React.Dispatch<React.SetStateAction<boolean>>;
  sortOrder: 'latest' | 'expiring_soon' | 'popular';
  setSortOrder: React.Dispatch<React.SetStateAction<'latest' | 'expiring_soon' | 'popular'>>;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  resetFilters: () => void;
  updateFilter: <T>(setter: React.Dispatch<React.SetStateAction<T>>, value: React.SetStateAction<T>) => void;
}

export function useArticleFilterState(): ArticleFilterState {
  const [searchParams] = useSearchParams();

  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [activeFilters, setActiveFilters] = React.useState<string[]>([]);
  const [activeTagFilters, setActiveTagFilters] = React.useState<string[]>([]);
  const [timedOnly, setTimedOnly] = React.useState(false);
  const [hideExpired, setHideExpired] = React.useState(false);
  const [sortOrder, setSortOrder] = React.useState<'latest' | 'expiring_soon' | 'popular'>('latest');
  const [currentPage, setCurrentPage] = React.useState(() => {
    const raw = searchParams.get('p');
    const parsed = Number(raw);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
    return 1;
  });
  const [searchQuery, setSearchQuery] = React.useState('');

  const hasActiveFilters = Boolean(
    selectedDate
    || activeFilters.length > 0
    || activeTagFilters.length > 0
    || timedOnly
    || hideExpired
    || sortOrder !== 'latest'
    || searchQuery.trim().length > 0
  );

  const lastUnfilteredPageRef = React.useRef(currentPage);
  const prevHasActiveFiltersRef = React.useRef(hasActiveFilters);

  React.useEffect(() => {
    if (!hasActiveFilters) {
      if (prevHasActiveFiltersRef.current) {
        const restorePage = Math.max(1, lastUnfilteredPageRef.current || 1);
        setCurrentPage((prev) => (prev === restorePage ? prev : restorePage));
      } else {
        lastUnfilteredPageRef.current = currentPage;
      }
    }
    prevHasActiveFiltersRef.current = hasActiveFilters;
  }, [currentPage, hasActiveFilters]);

  const resetFilters = React.useCallback(() => {
    setSelectedDate(null);
    setSearchQuery('');
    setActiveFilters([]);
    setActiveTagFilters([]);
    setTimedOnly(false);
    setHideExpired(false);
    setSortOrder('latest');
  }, []);

  const updateFilter = React.useCallback(<T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T | ((prev: T) => T)) => {
    setCurrentPage(1);
    setter(value);
  }, []);

  return {
    selectedDate, setSelectedDate,
    activeFilters, setActiveFilters,
    activeTagFilters, setActiveTagFilters,
    timedOnly, setTimedOnly,
    hideExpired, setHideExpired,
    sortOrder, setSortOrder,
    currentPage, setCurrentPage,
    searchQuery, setSearchQuery,
    resetFilters, updateFilter,
  };
}

export function useFilteredArticles(
  state: ArticleFilterState,
  selectedFeed: Feed | null,
  searchData: SearchItem[],
  isAllSchoolsView: boolean,
  viewCounts?: Record<string, number>
) {
  const {
    selectedDate, activeFilters, activeTagFilters,
    timedOnly, hideExpired, sortOrder, currentPage, setCurrentPage,
    searchQuery,
  } = state;

  const [searchParams, setSearchParams] = useSearchParams();

  const nowTs = useNow(hideExpired || timedOnly || sortOrder === 'expiring_soon', 30_000);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const { searchMatches, searchHitByArticleId } = React.useMemo(() => {
    const query = debouncedSearchQuery.trim().toLowerCase();
    if (!query) {
      return {
        searchMatches: null as Set<string> | null,
        searchHitByArticleId: new Map<string, SearchHitLocation>(),
      };
    }

    const set = new Set<string>();
    const hitMap = new Map<string, SearchHitLocation>();
    for (const row of searchData) {
      const titleText = String(row.title || '').toLowerCase();
      const descriptionText = String(row.description || '').toLowerCase();
      const contentText = String(row.contentPlainText || '').toLowerCase();
      const attachmentText = String(row.attachmentText || '').toLowerCase();

      const inTitleOrDescription = titleText.includes(query) || descriptionText.includes(query);
      const inContent = contentText.includes(query);
      const inAttachment = attachmentText.includes(query);

      if (!inTitleOrDescription && !inContent && !inAttachment) continue;

      set.add(row.id);
      if (inContent && inAttachment) {
        hitMap.set(row.id, 'content+attachment');
      } else if (inContent) {
        hitMap.set(row.id, 'content');
      } else if (inAttachment) {
        hitMap.set(row.id, 'attachment');
      }
    }

    return {
      searchMatches: set,
      searchHitByArticleId: hitMap,
    };
  }, [searchData, debouncedSearchQuery]);

  const baseArticles = React.useMemo(() => {
    if (!selectedFeed) return [];
    if (!selectedDate) return selectedFeed.items;
    return selectedFeed.items.filter((item) => new Date(item.pubDate).toDateString() === selectedDate.toDateString());
  }, [selectedDate, selectedFeed]);

  const tagStats = React.useMemo(() => {
    const countMap = new Map<string, number>();
    for (const article of baseArticles) {
      for (const tag of article.tags || []) {
        countMap.set(tag, (countMap.get(tag) || 0) + 1);
      }
    }
    return Array.from(countMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN'));
  }, [baseArticles]);

  const matchesActiveCriteria = React.useCallback((article: Article) => {
    const timing = getTimeWindowState(article.startAt, article.endAt, nowTs);
    if (timedOnly && timing.state === 'none') return false;
    if (hideExpired && timing.state === 'expired') return false;
    if (searchMatches && !searchMatches.has(article.guid)) return false;
    if (activeFilters.length > 0 && !activeFilters.includes(article.aiCategory || '')) return false;
    if (activeTagFilters.length > 0) {
      const tags = article.tags || [];
      if (!activeTagFilters.every((tag) => tags.includes(tag))) return false;
    }
    return true;
  }, [activeFilters, activeTagFilters, hideExpired, nowTs, searchMatches, timedOnly]);

  const filteredArticles = React.useMemo(() => {
    return sortArticles(baseArticles.filter(matchesActiveCriteria), isAllSchoolsView, sortOrder, nowTs, viewCounts);
  }, [baseArticles, isAllSchoolsView, matchesActiveCriteria, sortOrder, nowTs, viewCounts]);

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE));
  const visiblePageTokens = getVisiblePageTokens(currentPage, totalPages);
  const pageParam = searchParams.get('p');

  // Track whether the latest page change was triggered by browser back/forward
  const fromPopstateRef = React.useRef(false);
  // Tracks the page we last pushed/synced for. After a push, any stale
  // re-render where currentPage === pushedForPageRef is skipped entirely
  // to prevent react-router's replace from rolling back our history entry.
  const pushedForPageRef = React.useRef(currentPage);

  React.useEffect(() => {
    const normalized = Math.min(Math.max(currentPage, 1), totalPages);
    if (normalized !== currentPage) {
      setCurrentPage(normalized);
    }
  }, [currentPage, setCurrentPage, totalPages]);

  React.useEffect(() => {
    const normalized = Math.min(Math.max(currentPage, 1), totalPages);
    const targetParam = normalized > 1 ? String(normalized) : null;

    // Already synced — update ref and bail
    if ((pageParam ?? null) === targetParam) {
      pushedForPageRef.current = currentPage;
      return;
    }

    // Already pushed for this page but pageParam hasn't caught up yet.
    // Skip entirely — calling setSearchParams (even replace) would let
    // react-router roll back our push via its internal idx tracking.
    if (currentPage === pushedForPageRef.current) return;

    const shouldPush = !fromPopstateRef.current && normalized === currentPage;
    fromPopstateRef.current = false;
    pushedForPageRef.current = currentPage;

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (targetParam) next.set('p', targetParam);
      else next.delete('p');
      return next;
    }, { replace: !shouldPush });
  }, [currentPage, pageParam, setSearchParams, totalPages]);

  // Sync URL → page state on browser back/forward navigation
  React.useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const raw = Number(params.get('p'));
      const p = (Number.isInteger(raw) && raw > 0) ? raw : 1;
      setCurrentPage((prev) => {
        if (prev === p) return prev;       // no-op (e.g. modal popstate)
        fromPopstateRef.current = true;
        return p;
      });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [setCurrentPage]);

  const paginatedArticles = React.useMemo(() => {
    const start = (currentPage - 1) * ARTICLES_PER_PAGE;
    return filteredArticles.slice(start, start + ARTICLES_PER_PAGE);
  }, [currentPage, filteredArticles]);

  const articleCountByDate = React.useMemo(() => {
    if (!selectedFeed) return null;
    const map: Record<string, number> = {};
    selectedFeed.items.filter(matchesActiveCriteria).forEach((article) => {
      const key = new Date(article.pubDate).toDateString();
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [matchesActiveCriteria, selectedFeed]);

  return {
    filteredArticles,
    paginatedArticles,
    tagStats,
    totalPages,
    visiblePageTokens,
    articleCountByDate,
    searchHitByArticleId,
  };
}

/** Backward-compatible combined hook */
export function useArticleFilters(
  selectedFeed: Feed | null,
  searchData: SearchItem[],
  isAllSchoolsView: boolean,
  viewCounts?: Record<string, number>
) {
  const filterState = useArticleFilterState();
  const filterResult = useFilteredArticles(filterState, selectedFeed, searchData, isAllSchoolsView, viewCounts);
  return { ...filterState, ...filterResult };
}
