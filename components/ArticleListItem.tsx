import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import { Article, ArticleCategory } from '../types';
import { Eye, Clock, CalendarDays, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTimeWindowState, formatTimestamp } from '@/lib/time-window';
import { LiveCountdownBar } from './CountdownBar';
import { siteConfig } from '../lib/site-config';
import { renderHighlightedText, renderSimpleMarkdown } from '../lib/simple-markdown';
import { getResponsiveCoverAttrs } from '../services/responsiveImage';

const MAX_VISIBLE_TAGS = 4;
const RESERVED_TAGS = [`${siteConfig.organization_unit_label}通知`];

interface ArticleListItemProps {
  article: Article;
  onClick: () => void;
  isRead: boolean;
  onCategoryClick?: (category: ArticleCategory) => void;
  onTagClick?: (tag: string) => void;
  activeCategoryFilters?: ArticleCategory[];
  activeTagFilters?: string[];
  searchQuery?: string;
  showSchoolTag?: boolean;
  onSchoolTagClick?: (schoolSlug?: string) => void;
  isAllSchoolsView?: boolean;
  searchHitLocation?: 'content' | 'attachment' | 'content+attachment' | null;
  viewCount?: number;
}

export const ArticleListItem: React.FC<ArticleListItemProps> = React.memo(({
  article,
  onClick,
  isRead,
  onCategoryClick,
  onTagClick,
  activeCategoryFilters = [],
  activeTagFilters = [],
  searchQuery = '',
  showSchoolTag = false,
  onSchoolTagClick,
  isAllSchoolsView = false,
  searchHitLocation = null,
  viewCount,
}) => {
  const [imgError, setImgError] = useState(false);

  const thumbnailUrl = article.thumbnail || '';
  const isPlaceholderCover = Boolean(article.isPlaceholderCover);
  const showCover = article.showCover !== false;
  const hasRealCover = showCover && !imgError && Boolean(article.thumbnail) && !isPlaceholderCover
    && !/\/img\/schoolicon\//.test(thumbnailUrl) && thumbnailUrl !== siteConfig.favicon;
  const responsiveCover = useMemo(() => getResponsiveCoverAttrs(thumbnailUrl), [thumbnailUrl]);

  const preview = useMemo(() => {
    const raw = (article.description || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/br>/gi, '\n')
      .replace(/<(?!\/?br\b)[^>]+>/gi, '');
    return raw.length > 200
      ? raw.substring(0, 200).replace(/\s+\S*$/, '') + '...'
      : raw || '无可用预览。';
  }, [article.description]);

  const previewHtml = useMemo(() => DOMPurify.sanitize(renderSimpleMarkdown(preview, searchQuery)), [preview, searchQuery]);
  const titleHtml = useMemo(() => DOMPurify.sanitize(renderHighlightedText(article.title, searchQuery)), [article.title, searchQuery]);

  const formattedDateTime = useMemo(() => {
    return new Date(article.pubDate).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).replace(',', '');
  }, [article.pubDate]);

  const noticeTags = useMemo(() => {
    if (!Array.isArray(article.tags)) return [];
    return article.tags
      .filter((tag) => {
        const clean = String(tag).trim();
        return clean.length > 0 && !RESERVED_TAGS.includes(clean);
      })
      .slice(0, MAX_VISIBLE_TAGS);
  }, [article.tags]);

  const primaryCategory = useMemo(() => {
    return article.aiCategory || ArticleCategory.OTHER;
  }, [article.aiCategory]);

  const isCategoryActive = activeCategoryFilters.includes(primaryCategory);
  const timing = useMemo(() => getTimeWindowState(article.startAt, article.endAt, Date.now()), [article.startAt, article.endAt]);

  const pinnedLabel = useMemo(() => {
    if (!article.pinned) return '';
    if (isAllSchoolsView && article.schoolSlug && article.schoolSlug !== 'unknown') {
      const shortName = String(article.schoolShortName || article.feedTitle || '').trim();
      return `${shortName || '该院'}置顶`;
    }
    return '置顶';
  }, [article.feedTitle, article.pinned, article.schoolShortName, article.schoolSlug, isAllSchoolsView]);

  const searchHitLabel = useMemo(() => {
    if (searchQuery.trim().length === 0 || !searchHitLocation) return '';
    if (searchHitLocation === 'content+attachment') return '命中正文和附件';
    if (searchHitLocation === 'content') return '命中正文';
    return '命中附件';
  }, [searchHitLocation, searchQuery]);

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  }, [onClick]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        aria-label={`阅读文章: ${article.title}`}
        className={cn(
          "relative flex flex-wrap items-stretch gap-x-5 gap-y-0 px-6 py-5 rounded-xl bg-white dark:bg-card border border-border/40 cursor-pointer transition-all duration-200",
          "hover:border-primary/30 hover:shadow-sm group overflow-hidden",
          "border-l-[3px] border-l-primary/60 hover:border-l-primary"
        )}
      >
        {/* Unread dot */}
        {!isRead && (
          <div className="absolute top-3 left-2 w-1.5 h-1.5 bg-primary rounded-full" />
        )}

        {/* Left: Content area */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* Row 1: Badges + Title */}
          <div className="flex items-start gap-2">
            {article.pinned && (
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                <span className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">
                  📌 {pinnedLabel}
                </span>
              </div>
            )}
            <h3
              className={cn(
                "text-base font-bold leading-snug line-clamp-1 break-words [overflow-wrap:anywhere] group-hover:text-primary transition-colors",
                "[&_mark]:rounded-sm [&_mark]:bg-amber-200/80 [&_mark]:text-foreground [&_mark]:px-0.5",
                timing.state === 'active' ? "text-primary group-hover:opacity-80" : "text-foreground group-hover:text-primary"
              )}
              dangerouslySetInnerHTML={{ __html: titleHtml }}
            />
          </div>

          {/* Row 2: Preview snippet */}
          <p
            className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3 [&_mark]:rounded-sm [&_mark]:bg-amber-200/80 [&_mark]:text-foreground [&_mark]:px-0.5"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
          {searchHitLabel && (
            <p className="text-[10px] font-semibold text-primary/85">{searchHitLabel}</p>
          )}

          {/* Row 3: Tags */}
          <div className="flex items-center gap-1.5 flex-wrap mt-auto">
            {showSchoolTag && article.feedTitle && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onSchoolTagClick?.(article.schoolSlug);
                }}
                className="inline-flex h-5 items-center rounded text-[10px] font-semibold px-2 bg-primary text-primary-foreground border border-transparent hover:brightness-110 transition-all"
              >
                {article.feedTitle}
              </button>
            )}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onCategoryClick?.(primaryCategory);
              }}
              className="inline-flex h-5 items-center rounded text-[10px] font-semibold px-2 transition-colors bg-background text-primary border border-primary shadow-sm"
            >
              {primaryCategory}
            </button>
            {noticeTags
              .filter((tag) => tag !== primaryCategory)
              .map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={(event) => {
                    event.stopPropagation();
                    onTagClick?.(tag);
                  }}
                  className="inline-flex h-5 items-center rounded text-[10px] font-medium px-2 border transition-colors bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"
                >
                  {tag}
                </button>
              ))}
          </div>
        </div>

        {/* Middle: Thumbnail (only if real cover exists) */}
        {hasRealCover && (
          <div className="hidden lg:block shrink-0 w-40 h-28 rounded-lg overflow-hidden bg-muted/30 self-start">
            <img
              src={thumbnailUrl}
              alt=""
              loading="lazy"
              decoding="async"
              srcSet={responsiveCover.srcSet}
              sizes={responsiveCover.sizes}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          </div>
        )}

        {/* Right: Metadata */}
        <div className="hidden sm:flex flex-col items-end self-stretch shrink-0 min-w-[140px] text-right py-0.5">
          <div className="flex flex-col items-end gap-2 my-auto">
            {timing.state === 'active' ? (
              <div className="flex items-center justify-end gap-1.5 text-[13px] text-muted-foreground/90 font-medium whitespace-nowrap">
                <time>截止 {formatTimestamp(article.endAt)}</time>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-1.5 text-[13px] text-muted-foreground/90 font-medium whitespace-nowrap">
                <CalendarDays className="w-4 h-4 opacity-70" />
                <time>{formattedDateTime}</time>
              </div>
            )}
            {viewCount != null && viewCount > 0 && (
              <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground/70">
                <BookOpen className="w-3.5 h-3.5" />
                <span>{viewCount} 阅读</span>
              </div>
            )}
            {timing.state === 'upcoming' && (
              <span className="text-[10px] px-2 py-0.5 rounded border border-primary/30 bg-primary/8 text-primary font-bold dark:border-primary/40 dark:bg-primary/15 dark:text-primary">
                将于 {formatTimestamp(article.startAt)} 开始
              </span>
            )}
            {timing.state === 'expired' && (
              <span className="text-[10px] px-2 py-0.5 rounded border border-rose-200 bg-rose-50 text-rose-600 font-bold dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300">已过期</span>
            )}
          </div>
          
          {timing.state === 'active' && (
            <div className="mt-auto flex justify-end">
              <span className="inline-flex h-5 items-center px-2 rounded bg-primary text-primary-foreground font-bold text-[10px]">
                限时
              </span>
            </div>
          )}
        </div>

        {/* Mobile metadata row */}
        <div className="sm:hidden absolute bottom-2 right-4 flex items-center gap-3 text-[10px] text-muted-foreground">
          {timing.state === 'active' ? (
            <span className="flex items-center gap-1">
              <time>截止 {formatTimestamp(article.endAt)}</time>
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <CalendarDays className="w-2.5 h-2.5" />
              <time>{formattedDateTime}</time>
            </span>
          )}
          {viewCount != null && viewCount > 0 && (
            <span className="flex items-center gap-0.5">
              <Eye className="w-2.5 h-2.5" />
              {viewCount}
            </span>
          )}
        </div>

        {/* Countdown bar — reuses the existing LiveCountdownBar component */}
        {timing.state === 'active' && (
          <div className="w-full mt-2 col-span-full">
            <LiveCountdownBar startAt={article.startAt} endAt={article.endAt} size="sm" hideHeader />
          </div>
        )}
      </div>
    </motion.div>
  );
});

ArticleListItem.displayName = 'ArticleListItem';
