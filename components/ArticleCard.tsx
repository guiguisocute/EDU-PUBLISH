import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import { Article, ArticleCategory } from '../types';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Calendar, ExternalLink, ImageOff, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTimeWindowState, formatTimestamp } from "@/lib/time-window";
import { CountdownBar, LiveCountdownBar } from './CountdownBar';
import { siteConfig } from '../lib/site-config';
import { renderHighlightedText, renderSimpleMarkdown } from '../lib/simple-markdown';
import { getResponsiveCoverAttrs } from '../services/responsiveImage';

const MAX_VISIBLE_TAGS = 4;
const RESERVED_TAGS = [`${siteConfig.organization_unit_label}通知`];

interface ArticleCardProps {
  article: Article;
  onClick: () => void;
  isSelected: boolean;
  isRead: boolean;
  onCategoryClick?: (category: string) => void;
  onTagClick?: (tag: string) => void;
  activeCategoryFilters?: string[];
  activeTagFilters?: string[];
  searchQuery?: string;
  priorityImage?: boolean;
  showSchoolTag?: boolean;
  onSchoolTagClick?: (schoolSlug?: string) => void;
  isAllSchoolsView?: boolean;
  variant?: 'default' | 'compactNoCover';
  searchHitLocation?: 'content' | 'attachment' | 'content+attachment' | null;
  viewCount?: number;
}

export const ArticleCard: React.FC<ArticleCardProps> = React.memo(({
  article,
  onClick,
  isSelected,
  isRead,
  onCategoryClick,
  onTagClick,
  activeCategoryFilters = [],
  activeTagFilters = [],
  searchQuery = '',
  priorityImage = false,
  showSchoolTag = false,
  onSchoolTagClick,
  isAllSchoolsView = false,
  variant = 'default',
  searchHitLocation = null,
  viewCount,
}) => {
  const [imgError, setImgError] = useState(false);
  const isCompactNoCover = variant === 'compactNoCover';

  const thumbnailUrl = article.thumbnail || '';
  const isPlaceholderCover = Boolean(article.isPlaceholderCover);
  const hasValidThumbnail = !imgError && Boolean(article.thumbnail);
  const compactLogoMode = isPlaceholderCover || /\/img\/schoolicon\//.test(thumbnailUrl) || (!thumbnailUrl || thumbnailUrl === siteConfig.favicon);
  const showFullCover = !isCompactNoCover && hasValidThumbnail && !compactLogoMode;
  const placeholderCover = thumbnailUrl || siteConfig.default_cover;
  const responsiveCover = useMemo(() => getResponsiveCoverAttrs(thumbnailUrl), [thumbnailUrl]);

  const preview = useMemo(() => {
    const previewLength = isCompactNoCover ? 480 : (hasValidThumbnail ? 150 : 700);
    const rawPreview = (article.description || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/br>/gi, '\n')
      .replace(/<(?!\/?br\b)[^>]+>/gi, '');
    return rawPreview.length > previewLength
      ? rawPreview.substring(0, previewLength).replace(/\s+\S*$/, '') + '...'
      : rawPreview || '无可用预览。';
  }, [article.description, hasValidThumbnail, isCompactNoCover]);

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

  const formattedDateOnly = useMemo(() => {
    return new Date(article.pubDate).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  }, [article.pubDate]);

  const isRetweet = useMemo(() => {
    return /^RT\s/i.test(article.title) || /^Re\s/i.test(article.title);
  }, [article.title]);

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  }, [onClick]);

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
    if (article.aiCategory) return article.aiCategory;
    return ArticleCategory.OTHER;
  }, [article.aiCategory]);

  const isCategoryActive = activeCategoryFilters.includes(primaryCategory);
  const searchHitLabel = React.useMemo(() => {
    if (searchQuery.trim().length === 0 || !searchHitLocation) return '';
    if (searchHitLocation === 'content+attachment') return '命中正文和附件';
    if (searchHitLocation === 'content') return '命中正文';
    return '命中附件';
  }, [searchHitLocation, searchQuery]);

  const hasTimeWindow = Boolean(article.startAt && article.endAt);

  const timing = useMemo(() => getTimeWindowState(article.startAt, article.endAt, Date.now()), [article.startAt, article.endAt]);



  const pinnedLabel = useMemo(() => {


    if (!article.pinned) return '';
    if (isAllSchoolsView && article.schoolSlug && article.schoolSlug !== 'unknown') {
      const shortName = String(article.schoolShortName || article.feedTitle || '').trim();
      return `${shortName || '该院'}置顶`;
    }
    return '置顶';
  }, [article.feedTitle, article.pinned, article.schoolShortName, article.schoolSlug, isAllSchoolsView]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className={cn("h-full", isCompactNoCover && "break-inside-avoid")}
    >
      <Card
        asChild
        className={cn(
          "mobile-card-surface flex flex-col h-full overflow-hidden group transition-all duration-300 md:hover:shadow-md text-left w-full p-0",
          isCompactNoCover ? "min-h-0" : "min-h-[430px]",
          isSelected ? "ring-2 ring-primary border-primary" : "md:hover:border-primary/50"
        )}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={onClick}
          onKeyDown={handleKeyDown}
          aria-label={`阅读文章: ${article.title}`}
          className="relative flex flex-col h-full w-full cursor-pointer touch-manipulation"
        >
          {isCompactNoCover ? (
            <div className="px-3 pt-3">
              <div className="relative rounded-xl border border-border/70 bg-muted/40 px-3 pt-2.5 pb-7">
                <p
                  className="text-[12px] leading-5 text-foreground/85 line-clamp-8 break-words [overflow-wrap:anywhere] [&_a]:text-primary [&_a]:underline [&_strong]:font-semibold [&_mark]:rounded-sm [&_mark]:bg-amber-200/80 [&_mark]:text-foreground [&_mark]:px-0.5"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
                {/* 浏览量角标 */}
                {viewCount != null && viewCount > 0 && (
                  <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded font-medium bg-background/60 px-1.5 py-0.5 text-[10px] text-foreground/80 backdrop-blur-sm pointer-events-none z-20 shadow-sm border border-border/40">
                    <Eye className="w-3 h-3 shrink-0" />
                    <span>{viewCount}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="relative aspect-video overflow-hidden w-full bg-muted/40 group/cover">
              {showFullCover ? (
                <img
                  src={thumbnailUrl}
                  alt=""
                  loading={priorityImage ? 'eager' : 'lazy'}
                  fetchPriority={priorityImage ? 'high' : 'auto'}
                  decoding="async"
                  srcSet={responsiveCover.srcSet}
                  sizes={responsiveCover.sizes}
                  className="w-full h-full object-cover transition-transform duration-500 md:group-hover:scale-105"
                  onError={() => setImgError(true)}
                />
              ) : (imgError && Boolean(article.thumbnail)) ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-muted/20 text-muted-foreground">
                  <ImageOff className="w-8 h-8" aria-hidden="true" />
                  <span className="text-xs font-medium">封面加载失败</span>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-muted/20 to-muted/40">
                  <img
                    src={placeholderCover}
                    alt="默认院徽占位"
                    loading={priorityImage ? 'eager' : 'lazy'}
                    fetchPriority={priorityImage ? 'high' : 'auto'}
                    className="w-24 h-24 object-contain opacity-85 transition-transform duration-500 md:group-hover:scale-110"
                  />
                </div>
              )}
              {/* 浏览量角标 */}
              {viewCount != null && viewCount > 0 && (
                <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded font-medium bg-background/60 px-1.5 py-0.5 text-[10px] text-foreground/80 backdrop-blur-sm pointer-events-none z-20 shadow-sm border border-border/40">
                  <Eye className="w-3 h-3 shrink-0" />
                  <span>{viewCount}</span>
                </div>
              )}
            </div>
          )}

          <div className={cn(
            "z-20 flex gap-1 items-start min-w-0",
            isCompactNoCover
              ? "compact-tag-rail px-3 pt-2 pb-0.5 max-w-full flex-wrap content-start max-h-[3.35rem] overflow-y-hidden overflow-x-auto"
              : "absolute top-2 left-2 max-w-[92%] flex-wrap"
          )}>
            {showSchoolTag && article.feedTitle && (
              isCompactNoCover ? (
                <span
                  className="inline-flex h-5 items-center justify-center text-center leading-none rounded font-semibold border border-sky-600/70 bg-sky-600 text-white text-[10px] px-2 shrink min-w-0 max-w-[45%] truncate"
                >
                  {article.feedTitle}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSchoolTagClick?.(article.schoolSlug);
                  }}
                  className="inline-flex h-6 items-center justify-center text-center leading-none rounded font-semibold border border-sky-600/70 bg-sky-600 text-white hover:bg-sky-700 transition-colors text-[11px] px-2.5"
                  aria-label={`查看${article.feedTitle}的通知`}
                >
                  {article.feedTitle}
                </button>
              )
            )}
            {article.pinned && (
              <span className={cn(
                "inline-flex items-center justify-center text-center leading-none rounded bg-amber-100 text-amber-800 border border-amber-300 font-semibold shrink-0 whitespace-nowrap",
                isCompactNoCover ? "h-5 text-[10px] px-1.5" : "h-6 text-[11px] px-2"
              )}>
                {pinnedLabel}
              </span>
            )}
            {isCompactNoCover ? (
              <span
                className={cn(
                  'inline-flex h-5 items-center justify-center text-center leading-none rounded font-semibold border shrink-0 whitespace-nowrap text-[10px] px-2',
                  isCategoryActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-primary text-primary-foreground border-primary/80'
                )}
              >
                {primaryCategory}
              </span>
            ) : (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onCategoryClick?.(primaryCategory);
                }}
                className={cn(
                  'inline-flex h-6 items-center justify-center text-center leading-none rounded font-semibold border transition-colors shrink-0 whitespace-nowrap text-[11px] px-2.5',
                  isCategoryActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-primary text-primary-foreground border-primary/80 hover:bg-primary/90'
                )}
              >
                {primaryCategory}
              </button>
            )}
            {!isCompactNoCover && isRetweet && (
              <span className="inline-flex items-center rounded bg-secondary text-secondary-foreground text-[11px] px-1.9 py-0.5 font-semibold">
                RT
              </span>
            )}
            {!isCompactNoCover && noticeTags
              .filter((tag) => tag !== primaryCategory)
              .map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={(event) => {
                    event.stopPropagation();
                    onTagClick?.(tag);
                  }}
                  className={cn(
                    'inline-flex h-6 items-center justify-center text-center leading-none rounded border backdrop-blur-sm text-[11px] px-2.5 font-medium transition-colors',
                    activeTagFilters.includes(tag)
                      ? 'bg-foreground/15 text-foreground border-foreground/25'
                      : 'bg-background/85 hover:bg-muted hover:border-foreground/25'
                  )}
                >
                  #{tag}
                </button>
              ))}
          </div>

          {!isRead && (
            <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
          )}

          <CardHeader className={cn("space-y-1", isCompactNoCover ? "px-3 pt-2 pb-1" : "p-4 pb-2")}>
            <h3
              className={cn(
                "font-bold leading-tight md:group-hover:text-primary transition-colors [&_mark]:rounded-sm [&_mark]:bg-amber-200/80 [&_mark]:text-foreground [&_mark]:px-0.5",
                isCompactNoCover ? "text-[15px] line-clamp-4 break-words [overflow-wrap:anywhere]" : "text-xl line-clamp-2 break-words [overflow-wrap:anywhere]"
              )}
              dangerouslySetInnerHTML={{ __html: titleHtml }}
            />
            {searchHitLabel && (
              <p className="text-[10px] font-semibold text-primary/85">{searchHitLabel}</p>
            )}
          </CardHeader>

          {!isCompactNoCover && (
            <CardContent className="p-4 pt-0 flex-1">
              <div
                className={cn(
                  "text-sm text-muted-foreground leading-relaxed [&_a]:text-primary [&_a]:underline [&_strong]:font-semibold [&_mark]:rounded-sm [&_mark]:bg-amber-200/80 [&_mark]:text-foreground [&_mark]:px-0.5",
                  hasValidThumbnail ? "line-clamp-3" : "line-clamp-7"
                )}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </CardContent>
          )}

          <CardFooter className={cn(
            'px-4 border-t border-border/50 mt-auto',
            isCompactNoCover
              ? (timing.state === 'active' ? 'py-2.5' : 'min-h-11 py-1.5')
              : (timing.state === 'active' ? 'py-2' : 'min-h-12 py-1.5'),
            timing.state !== 'active' && 'flex items-center justify-between gap-2'
          )}>
            {timing.state === 'active' ? (
              <LiveCountdownBar startAt={article.startAt} endAt={article.endAt} size="sm" />
            ) : (
              <>
                <div className={cn(
                  'flex items-center gap-2 leading-none text-muted-foreground font-medium min-w-0 overflow-hidden',
                  isCompactNoCover ? 'text-[12px]' : 'text-[13px]'
                )}>
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <time className="leading-none truncate">{isCompactNoCover ? formattedDateOnly : formattedDateTime}</time>
                </div>
                {timing.state === 'upcoming' ? (
                  <span className="text-[10px] px-2 py-0.5 rounded border border-sky-300/80 bg-sky-50 text-sky-700 font-bold dark:border-sky-300/60 dark:bg-sky-500/20 dark:text-sky-100 shrink-0 whitespace-nowrap">
                    {isCompactNoCover ? '未开始' : `将于 ${formatTimestamp(article.startAt)} 开始`}
                  </span>
                ) : timing.state === 'expired' ? (
                  <span className="text-[10px] px-2 py-0.5 rounded border border-rose-300/80 bg-rose-50 text-rose-700 font-bold dark:border-rose-300/60 dark:bg-rose-500/20 dark:text-rose-100 shrink-0 whitespace-nowrap">已过期</span>
                ) : (
                  <div className="flex flex-col items-end justify-center gap-0.5 shrink-0 min-w-0">
                    <div className="flex items-center gap-1 text-primary font-bold text-[10px] uppercase tracking-tight whitespace-nowrap opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all transform translate-x-0 md:translate-x-2 md:group-hover:translate-x-0">
                      <span>阅读全文</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                )}
              </>
            )}
          </CardFooter>
        </div>
      </Card>
    </motion.div>
  );
});
