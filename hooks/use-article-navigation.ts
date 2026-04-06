import React from 'react';
import { Article, Feed } from '../types';
import { bumpViewCache } from './use-view-counts';

export function useArticleNavigation(
  filteredArticles: Article[],
  selectedFeed: Feed | null,
  markArticleRead: (guid: string) => void
) {
  const [activeArticle, setActiveArticle] = React.useState<Article | null>(null);

  // Track whether the modal is open from our perspective,
  // so popstate handler knows if it should act.
  const modalOpenRef = React.useRef(false);

  const activeIndex = React.useMemo(() => {
    if (!activeArticle) return -1;
    return filteredArticles.findIndex((article) => article.guid === activeArticle.guid);
  }, [activeArticle, filteredArticles]);

  const handleArticleSelect = React.useCallback((article: Article) => {
    markArticleRead(article.guid);
    setActiveArticle(article);
    modalOpenRef.current = true;

    // Push a new history entry so the back gesture closes the modal
    const next = `${window.location.pathname}${window.location.search}#${article.guid}`;
    window.history.pushState({ modal: true }, '', next);

    // Fire-and-forget view count
    bumpViewCache(article.guid);
    fetch('/api/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guid: article.guid }),
    }).catch(() => {});
  }, [markArticleRead]);

  const handlePrev = React.useCallback(() => {
    if (activeIndex <= 0) return;
    const nextArticle = filteredArticles[activeIndex - 1];
    setActiveArticle(nextArticle);
    // Replace current entry — don't stack history for each swipe
    const next = `${window.location.pathname}${window.location.search}#${nextArticle.guid}`;
    window.history.replaceState({ modal: true }, '', next);
  }, [activeIndex, filteredArticles]);

  const handleNext = React.useCallback(() => {
    if (activeIndex < 0 || activeIndex >= filteredArticles.length - 1) return;
    const nextArticle = filteredArticles[activeIndex + 1];
    setActiveArticle(nextArticle);
    const next = `${window.location.pathname}${window.location.search}#${nextArticle.guid}`;
    window.history.replaceState({ modal: true }, '', next);
  }, [activeIndex, filteredArticles]);

  // Close triggered by user action (X button, overlay click)
  const handleModalClose = React.useCallback(() => {
    if (!modalOpenRef.current) return;
    modalOpenRef.current = false;
    setActiveArticle(null);
    // Pop the history entry we pushed on open
    window.history.back();
  }, []);

  // Close triggered by browser back (swipe gesture, back button)
  React.useEffect(() => {
    const onPopState = () => {
      if (modalOpenRef.current) {
        modalOpenRef.current = false;
        setActiveArticle(null);
        // Hash is already gone because the browser popped the state —
        // no need to touch history again.
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Restore article from URL hash on feed load (deep-link / refresh)
  React.useEffect(() => {
    if (!selectedFeed) return;
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    if (!hash) return;
    const target = selectedFeed.items.find((item) => item.guid === hash);
    if (!target) return;

    markArticleRead(target.guid);
    setActiveArticle(target);
    modalOpenRef.current = true;
    // Replace current entry (the page load already has this URL)
    window.history.replaceState({ modal: true }, '', window.location.href);
  }, [markArticleRead, selectedFeed]);

  return {
    activeArticle,
    activeIndex,
    handleArticleSelect,
    handlePrev,
    handleNext,
    handleModalClose,
  };
}
