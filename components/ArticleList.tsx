import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
import {
  PanelLeft,
  PanelRight,
  Filter,
  Search,
  ArrowUp,
  LayoutGrid,
  List,
  ChevronDown,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArticleCard } from './ArticleCard';
import { FilterBar } from './FilterBar';
import { SiteFooter } from './SiteFooter';
import { Feed, Article } from '../types';
import { cn } from "@/lib/utils";

interface ArticleListProps {
  sortOrder: 'latest' | 'expiring_soon' | 'popular';
  onSortOrderChange: (value: 'latest' | 'expiring_soon' | 'popular') => void;
  selectedFeed: Feed;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  selectedDate: Date | null;
  isRightSidebarOpen: boolean;
  setIsRightSidebarOpen: (open: boolean) => void;
  activeFilters: string[];
  activeTagFilters: string[];
  handleFilterToggle: (filter: string) => void;
  onCategorySelect: (category: string) => void;
  onTagSelect: (tag: string) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onResetFilters: () => void;
  paginatedArticlesWithCategory: Article[];
  readArticleIds: Set<string>;
  handleArticleSelect: (article: Article) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  filteredArticlesCount: number;
  articleListRef: React.RefObject<HTMLDivElement>;
  visiblePageTokens: (number | string)[];
  feedId: string;
  loadedCount?: number;
  totalCount?: number;
  isAllSchoolsView?: boolean;
  onSchoolSummaryJump?: (schoolSlug?: string) => void;
  mobileCardLayout: 'list' | 'waterfall';
  onMobileCardLayoutChange: (mode: 'list' | 'waterfall') => void;
  searchHitByArticleId: Map<string, 'content' | 'attachment' | 'content+attachment'>;
  viewCounts?: Record<string, number>;
}

const ArticleListComponent: React.FC<ArticleListProps> = ({
  sortOrder,
  onSortOrderChange,
  selectedFeed,
  isSidebarOpen,
  setIsSidebarOpen,
  selectedDate,
  isRightSidebarOpen,
  setIsRightSidebarOpen,
  activeFilters,
  activeTagFilters,
  handleFilterToggle,
  onCategorySelect,
  onTagSelect,
  searchQuery,
  onSearchQueryChange,
  onResetFilters,
  paginatedArticlesWithCategory,
  readArticleIds,
  handleArticleSelect,
  currentPage,
  setCurrentPage,
  totalPages,
  filteredArticlesCount,
  articleListRef,
  visiblePageTokens,
  feedId,
  loadedCount,
  totalCount,
  isAllSchoolsView = false,
  onSchoolSummaryJump,
  mobileCardLayout,
  onMobileCardLayoutChange,
  searchHitByArticleId,
  viewCounts = {},
}) => {
  const [isPulling, setIsPulling] = React.useState(false);
  const [isPullReady, setIsPullReady] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isPullPrevTransition, setIsPullPrevTransition] = React.useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = React.useState(false);
  const [pageJumpMode, setPageJumpMode] = React.useState<'mobile' | 'desktop' | null>(null);
  const [pageJumpInput, setPageJumpInput] = React.useState('');
  const touchStartRef = React.useRef<number>(0);
  const rafRef = React.useRef<number | null>(null);
  const pullDistanceRef = React.useRef(0);
  const pullIndicatorRef = React.useRef<HTMLDivElement | null>(null);
  const isPullReadyRef = React.useRef(false);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const scrollResetKey = `${currentPage}::${activeFilters.join('|')}::${activeTagFilters.join('|')}::${debouncedSearchQuery}::${selectedDate?.getTime() ?? ''}`;
  const prevScrollResetKeyRef = React.useRef(scrollResetKey);

  const getViewport = React.useCallback(() => {
    return articleListRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLElement | null;
  }, [articleListRef]);

  const isViewportAtTop = React.useCallback(() => {
    const viewport = getViewport();
    if (!viewport) return true;
    return viewport.scrollTop <= 0;
  }, [getViewport]);

  React.useEffect(() => {
    if (prevScrollResetKeyRef.current === scrollResetKey) return;
    prevScrollResetKeyRef.current = scrollResetKey;

    const viewport = getViewport();
    if (viewport) {
      viewport.scrollTop = 0;
    }
  }, [scrollResetKey, getViewport]);

  const canPullToPrevPage = currentPage > 1;

  const updatePullIndicator = React.useCallback((distance: number) => {
    pullDistanceRef.current = distance;
    const indicator = pullIndicatorRef.current;
    if (!indicator) return;
    indicator.style.height = `${distance}px`;
    indicator.style.opacity = distance > 0 ? '1' : '0';
  }, []);

  React.useEffect(() => {
    if (!isPullPrevTransition) return;
    const timer = window.setTimeout(() => {
      setIsPullPrevTransition(false);
    }, 360);
    return () => window.clearTimeout(timer);
  }, [isPullPrevTransition]);

  const hasSearchOrFilter = searchQuery.trim().length > 0 || activeFilters.length > 0 || activeTagFilters.length > 0 || Boolean(selectedDate);

  const openPageJump = React.useCallback((mode: 'mobile' | 'desktop') => {
    setPageJumpMode(mode);
    setPageJumpInput(String(currentPage));
  }, [currentPage]);

  const closePageJump = React.useCallback(() => {
    setPageJumpMode(null);
    setPageJumpInput('');
  }, []);

  const submitPageJump = React.useCallback(() => {
    const parsed = Number(pageJumpInput.trim());
    if (!Number.isFinite(parsed)) {
      closePageJump();
      return;
    }
    const target = Math.min(totalPages, Math.max(1, Math.floor(parsed)));
    setCurrentPage(target);
    closePageJump();
  }, [closePageJump, pageJumpInput, setCurrentPage, totalPages]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isViewportAtTop()) {
      touchStartRef.current = e.touches[0].clientY;
      setIsPulling(true);
    } else {
      touchStartRef.current = 0;
      setIsPulling(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current === 0) return;
    const touchY = e.touches[0].clientY;
    const distance = touchY - touchStartRef.current;

    if (distance > 0 && isViewportAtTop()) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        const pull = Math.min(distance * 0.4, 100);
        updatePullIndicator(pull);
        const ready = canPullToPrevPage && pull >= 60;
        if (ready !== isPullReadyRef.current) {
          isPullReadyRef.current = ready;
          setIsPullReady(ready);
        }
      });

      if (canPullToPrevPage && distance > 5 && e.cancelable) {
        e.preventDefault();
      }
    } else {
      if (pullDistanceRef.current !== 0) updatePullIndicator(0);
      if (isPullReadyRef.current) {
        isPullReadyRef.current = false;
        setIsPullReady(false);
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistanceRef.current >= 60 && canPullToPrevPage) {
      setIsPullPrevTransition(true);
      setCurrentPage(Math.max(1, currentPage - 1));
    }
    updatePullIndicator(0);
    isPullReadyRef.current = false;
    setIsPullReady(false);
    setIsPulling(false);
    touchStartRef.current = 0;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  return (
    <div
      className="h-full flex flex-col animate-in fade-in duration-500"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <header className="h-16 px-4 md:px-8 flex items-center justify-between bg-background/80 backdrop-blur-md border-b sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          {!isSidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
              className="shrink-0"
              aria-label="打开左侧栏"
              title="打开左侧栏"
            >
              <PanelLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="overflow-hidden">
            <h2 className="text-lg font-black truncate uppercase tracking-tight">{selectedFeed.title}</h2>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest hidden sm:block">
              {selectedDate ? (
                `筛选日期: ${selectedDate.toLocaleDateString('zh-CN')}`
              ) : (
                totalCount && totalCount > 0 && activeFilters.length === 0
                  ? `已加载 ${loadedCount ?? 0} / ${totalCount}`
                  : ''
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex relative items-center">
            <Search className="w-3.5 h-3.5 absolute left-3 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="搜索标题或正文..."
              className="w-72 h-9 text-xs pl-9"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden h-9 w-9 p-0 rounded-full border-0 shadow-none hover:bg-muted"
            onClick={() => setIsSearchOpen(true)}
            title="搜索"
            aria-label="打开搜索"
          >
            <Search className="w-4 h-4" />
          </Button>
          <Button
            variant={isRightSidebarOpen ? "default" : "ghost"}
            size="sm"
            onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
            className="md:hidden h-9 w-9 p-0 rounded-full border-0 shadow-none hover:bg-muted"
            title={isRightSidebarOpen ? '关闭筛选' : '打开筛选'}
            aria-label={isRightSidebarOpen ? '关闭筛选' : '打开筛选'}
          >
            {isRightSidebarOpen ? <PanelRight className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
          </Button>
          <div className="md:hidden flex items-center rounded-full border bg-background p-0.5">
            <Button
              variant={mobileCardLayout === 'waterfall' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onMobileCardLayoutChange('waterfall')}
              className="h-8 w-8 p-0 rounded-full"
              title="双列瀑布流"
              aria-label="切换为双列瀑布流"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant={mobileCardLayout === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onMobileCardLayoutChange('list')}
              className="h-8 w-8 p-0 rounded-full"
              title="单列列表"
              aria-label="切换为单列列表"
            >
              <List className="w-3.5 h-3.5" />
            </Button>
          </div>
          <Button
            variant={isRightSidebarOpen ? "default" : "outline"}
            size="sm"
            onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
            className="hidden md:flex text-[10px] font-black uppercase tracking-widest h-8"
          >
            {isRightSidebarOpen ? <PanelRight className="w-3.5 h-3.5 mr-2" /> : <Filter className="w-3.5 h-3.5 mr-2" />}
            {isRightSidebarOpen ? '关闭侧栏' : '筛选'}
          </Button>
        </div>
      </header>

      <FilterBar
        activeFilters={activeFilters}
        onToggleFilter={handleFilterToggle}
        onReset={() => handleFilterToggle('__reset__')} // Note: Logic handled in App.tsx
      />

      <ScrollArea ref={articleListRef as React.RefObject<HTMLDivElement & HTMLElement>} className="flex-1 bg-muted/10">
        <div className="p-4 md:p-8">
          {/* Pull-to-refresh indicator */}
          <div
            ref={pullIndicatorRef}
            className={cn(
              "lg:hidden flex items-center justify-center text-xs text-primary overflow-hidden",
              isPulling ? "transition-none" : "transition-[height,opacity] duration-220 ease-out"
            )}
            style={{ height: 0, opacity: 0 }}
          >
            <div className="flex items-center gap-2 font-bold">
              <ArrowUp className={cn("w-4 h-4 transition-transform duration-150", isPullReady && "rotate-180")} />
              <span>
                {canPullToPrevPage
                  ? (isPullReady ? '释放返回上一页' : '下拉返回上一页')
                  : '当前已是第一页'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4 max-w-7xl mx-auto">
            <div className="text-xs font-bold text-muted-foreground flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse"></span>
              第 <span className="text-foreground">{currentPage}</span> 页
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSortDropdownOpen((prev) => !prev)}
                className={cn(
                  "flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-bold transition-colors select-none",
                  isSortDropdownOpen
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-foreground hover:bg-muted"
                )}
              >
                {sortOrder === 'latest' && "最新"}
                {sortOrder === 'expiring_soon' && "即将失效"}
                {sortOrder === 'popular' && "最热"}
                <ChevronDown className={cn(
                  "w-3.5 h-3.5 transition-transform duration-200",
                  isSortDropdownOpen && "rotate-180"
                )} />
              </button>

              <AnimatePresence>
                {isSortDropdownOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="fixed inset-0 z-40 bg-black/5 md:bg-transparent"
                      onClick={() => setIsSortDropdownOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: -4 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-32 overflow-hidden rounded-xl border bg-card text-card-foreground shadow-lg"
                    >
                      <div className="p-1 flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            onSortOrderChange('latest');
                            setIsSortDropdownOpen(false);
                          }}
                          className={cn(
                            "flex items-center justify-between w-full px-3 py-2 text-xs font-bold rounded-lg transition-colors text-left",
                            sortOrder === 'latest' ? "bg-primary/10 text-primary" : "hover:bg-muted"
                          )}
                        >
                          最新
                          {sortOrder === 'latest' && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSortOrderChange('expiring_soon');
                            setIsSortDropdownOpen(false);
                          }}
                          className={cn(
                            "flex items-center justify-between w-full px-3 py-2 text-xs font-bold rounded-lg transition-colors text-left",
                            sortOrder === 'expiring_soon' ? "bg-primary/10 text-primary" : "hover:bg-muted"
                          )}
                        >
                          即将失效
                          {sortOrder === 'expiring_soon' && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSortOrderChange('popular');
                            setIsSortDropdownOpen(false);
                          }}
                          className={cn(
                            "flex items-center justify-between w-full px-3 py-2 text-xs font-bold rounded-lg transition-colors text-left",
                            sortOrder === 'popular' ? "bg-primary/10 text-primary" : "hover:bg-muted"
                          )}
                        >
                          最热
                          {sortOrder === 'popular' && <Check className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {filteredArticlesCount === 0 ? (
            <div className="max-w-3xl mx-auto rounded-2xl border bg-background/90 p-8 text-center space-y-3">
              <p className="text-sm font-black uppercase tracking-wider">没有匹配的内容</p>
              <p className="text-xs text-muted-foreground">
                {hasSearchOrFilter ? '当前搜索词或筛选条件（含日期）没有命中结果，试试清空后再看。' : '当前源暂无可展示的内容。'}
              </p>
              {hasSearchOrFilter && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onResetFilters}
                    className="h-8 text-xs font-bold"
                  >
                    清空筛选条件
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              <AnimatePresence>
                {isPullPrevTransition && (
                  <motion.div
                    key={`prev-page-hint-${currentPage}`}
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="mx-auto mb-3 inline-flex rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-black text-primary"
                  >
                    已返回上一页
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                key={scrollResetKey}
                initial={isPullPrevTransition
                  ? { opacity: 0.82, y: 10 }
                  : { opacity: 0 }}
                animate={{ opacity: 1, y: 0 }}
                transition={isPullPrevTransition
                  ? { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
                  : { duration: 0.25, ease: 'easeOut' }}
              >
                {mobileCardLayout === 'waterfall' ? (
                  <>
                    {/* 双列瀑布流：分离为左右两列以实现左右交替降序 */}
                    <div className="mx-auto max-w-7xl flex items-start gap-[0.75rem] max-[360px]:hidden md:hidden">
                      <div className="flex-1 flex flex-col min-w-0">
                        {paginatedArticlesWithCategory.filter((_, i) => i % 2 === 0).map((article) => (
                          <div key={article.guid} className="mb-3 break-inside-avoid">
                            <ArticleCard
                              article={article}
                              isSelected={false}
                              isRead={readArticleIds.has(article.guid)}
                              onClick={() => handleArticleSelect(article)}
                              onCategoryClick={onCategorySelect}
                              onTagClick={onTagSelect}
                              activeCategoryFilters={activeFilters}
                              activeTagFilters={activeTagFilters}
                              searchQuery={searchQuery}
                              showSchoolTag={isAllSchoolsView}
                              onSchoolTagClick={onSchoolSummaryJump}
                              isAllSchoolsView={isAllSchoolsView}
                              variant="compactNoCover"
                              searchHitLocation={searchHitByArticleId.get(article.guid) ?? null}
                              viewCount={viewCounts[article.guid]}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex-1 flex flex-col min-w-0">
                        {paginatedArticlesWithCategory.filter((_, i) => i % 2 === 1).map((article) => (
                          <div key={article.guid} className="mb-3 break-inside-avoid">
                            <ArticleCard
                              article={article}
                              isSelected={false}
                              isRead={readArticleIds.has(article.guid)}
                              onClick={() => handleArticleSelect(article)}
                              onCategoryClick={onCategorySelect}
                              onTagClick={onTagSelect}
                              activeCategoryFilters={activeFilters}
                              activeTagFilters={activeTagFilters}
                              searchQuery={searchQuery}
                              showSchoolTag={isAllSchoolsView}
                              onSchoolTagClick={onSchoolSummaryJump}
                              isAllSchoolsView={isAllSchoolsView}
                              variant="compactNoCover"
                              searchHitLocation={searchHitByArticleId.get(article.guid) ?? null}
                              viewCount={viewCounts[article.guid]}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* 极小屏幕单列 */}
                    <div className="mx-auto max-w-7xl hidden max-[360px]:flex max-[360px]:flex-col md:hidden">
                      {paginatedArticlesWithCategory.map((article) => (
                        <div key={article.guid} className="mb-3 break-inside-avoid">
                          <ArticleCard
                            article={article}
                            isSelected={false}
                            isRead={readArticleIds.has(article.guid)}
                            onClick={() => handleArticleSelect(article)}
                            onCategoryClick={onCategorySelect}
                            onTagClick={onTagSelect}
                            activeCategoryFilters={activeFilters}
                            activeTagFilters={activeTagFilters}
                            searchQuery={searchQuery}
                            showSchoolTag={isAllSchoolsView}
                            onSchoolTagClick={onSchoolSummaryJump}
                            isAllSchoolsView={isAllSchoolsView}
                            variant="compactNoCover"
                            searchHitLocation={searchHitByArticleId.get(article.guid) ?? null}
                            viewCount={viewCounts[article.guid]}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="hidden md:grid grid-flow-row md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
                      {paginatedArticlesWithCategory.map((article, index) => (
                        <ArticleCard
                          key={article.guid}
                          article={article}
                          isSelected={false}
                          isRead={readArticleIds.has(article.guid)}
                          onClick={() => handleArticleSelect(article)}
                          onCategoryClick={onCategorySelect}
                          onTagClick={onTagSelect}
                          activeCategoryFilters={activeFilters}
                          activeTagFilters={activeTagFilters}
                          searchQuery={searchQuery}
                          priorityImage={currentPage === 1 && index < 2}
                          showSchoolTag={isAllSchoolsView}
                          onSchoolTagClick={onSchoolSummaryJump}
                          isAllSchoolsView={isAllSchoolsView}
                          searchHitLocation={searchHitByArticleId.get(article.guid) ?? null}
                          viewCount={viewCounts[article.guid]}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="grid grid-flow-row grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
                    {paginatedArticlesWithCategory.map((article, index) => (
                      <ArticleCard
                        key={article.guid}
                        article={article}
                        isSelected={false}
                        isRead={readArticleIds.has(article.guid)}
                        onClick={() => handleArticleSelect(article)}
                        onCategoryClick={onCategorySelect}
                        onTagClick={onTagSelect}
                        activeCategoryFilters={activeFilters}
                        activeTagFilters={activeTagFilters}
                        searchQuery={searchQuery}
                        priorityImage={currentPage === 1 && index < 2}
                        showSchoolTag={isAllSchoolsView}
                        onSchoolTagClick={onSchoolSummaryJump}
                        isAllSchoolsView={isAllSchoolsView}
                        searchHitLocation={searchHitByArticleId.get(article.guid) ?? null}
                        viewCount={viewCounts[article.guid]}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="py-12 flex w-full flex-col items-center gap-4">
              <div className="flex w-full items-center justify-between gap-2 md:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="rounded-full px-3 font-bold"
                >
                  上一页
                </Button>

                <div className="min-w-0 rounded-full border bg-muted/50 px-3 py-1 text-xs font-bold">
                  <button
                    type="button"
                    className="min-w-0"
                    onClick={() => openPageJump('mobile')}
                  >
                    {currentPage} / {totalPages || 1}
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-full px-3 font-bold"
                >
                  下一页
                </Button>
              </div>

              <div className="hidden items-center gap-2 md:flex">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="rounded-full px-6 font-bold"
                >
                  上一页
                </Button>
                <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full border bg-muted/50 p-1">
                  {visiblePageTokens.map(token => {
                    if (typeof token === 'string') {
                      return (
                        <button
                          key={token}
                          type="button"
                          onClick={() => openPageJump('desktop')}
                          className="w-8 text-center text-muted-foreground hover:text-foreground"
                          title="输入页码跳转"
                          aria-label="输入页码跳转"
                        >
                          ···
                        </button>
                      );
                    }
                    return (
                      <Button
                        key={`page-${token}`}
                        variant={currentPage === token ? "default" : "ghost"}
                        size="icon"
                        onClick={() => setCurrentPage(token as number)}
                        className="h-8 w-8 shrink-0 rounded-full text-xs font-bold"
                      >
                        {token}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-full px-6 font-bold"
                >
                  下一页
                </Button>
              </div>
              <div className="flex flex-col items-center gap-1">
                {pageJumpMode && (
                  <form
                    className="mb-2 flex items-center gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitPageJump();
                    }}
                  >
                    <Input
                      autoFocus
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={pageJumpInput}
                      onChange={(event) => setPageJumpInput(event.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="页码"
                      className="h-8 w-20 text-center text-xs"
                    />
                    <Button type="submit" size="sm" className="h-8 text-xs font-bold">跳转</Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={closePageJump}>取消</Button>
                  </form>
                )}
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  共 {filteredArticlesCount} 个活动 • 第 {currentPage} / {totalPages || 1} 页
                </p>
                {!selectedDate && totalCount && loadedCount && totalCount > loadedCount && activeFilters.length === 0 && (
                  <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">
                    仅显示已加载内容，翻页会自动预加载更多
                  </p>
                )}
              </div>
            </div>
          )}

        </div>

        <SiteFooter className="px-4 pt-8 pb-[max(72px,calc(env(safe-area-inset-bottom)+56px))] text-center text-[11px] leading-5 text-muted-foreground" />
      </ScrollArea>

      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="m-4 rounded-xl border bg-background p-4"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  value={searchQuery}
                  onChange={(event) => onSearchQueryChange(event.target.value)}
                  placeholder="搜索标题或正文..."
                  className="h-10 text-sm"
                />
                <Button variant="outline" size="sm" onClick={() => setIsSearchOpen(false)}>关闭</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ArticleList = React.memo(ArticleListComponent);
ArticleList.displayName = 'ArticleList';
