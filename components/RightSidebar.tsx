import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock3, Sparkles, Tags, X } from 'lucide-react';
import { ConclusionItem } from '../types';
import { CalendarWidget } from './CalendarWidget';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { widgetsConfig } from '../lib/widgets-config';
import { InstallPWAButton } from './InstallPWAButton';

const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const markdownToPlainText = (markdown: string): string => {
  return markdown
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, (value) => value.trimStart())
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const DailySummaryPanel: React.FC<{
  selectedDate: Date | null;
  selectedSchoolSlug: string | null;
  conclusionBySchool: Record<string, ConclusionItem>;
  schoolNameBySlug?: Record<string, string>;
}> = React.memo(({ selectedDate, selectedSchoolSlug, conclusionBySchool, schoolNameBySlug = {} }) => {
  const [isTypingSummary, setIsTypingSummary] = React.useState(false);
  const [dailySummaryText, setDailySummaryText] = React.useState('');
  const [summaryNotFound, setSummaryNotFound] = React.useState(false);
  const typingTimerRef = React.useRef<number | null>(null);
  const indexRef = React.useRef(0);

  React.useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        window.clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    if (typingTimerRef.current) {
      window.clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    setDailySummaryText('');
    setSummaryNotFound(false);
    setIsTypingSummary(false);

    if (!selectedDate || !selectedSchoolSlug) return;

    const dateKey = toDateKey(selectedDate);
    let fullText = '';

    if (selectedSchoolSlug === 'all-schools') {
      const mergedBlocks = (Object.entries(conclusionBySchool) as Array<[string, ConclusionItem]>)
        .map(([slug, item]) => {
          const markdown = item?.byDate?.[dateKey]?.markdown || '';
          const text = markdownToPlainText(markdown);
          if (!text) return null;
          const schoolName = schoolNameBySlug[slug] || slug;
          return `【${schoolName}】\n${text}`;
        })
        .filter((value): value is string => Boolean(value));

      if (mergedBlocks.length === 0) {
        setSummaryNotFound(true);
        return;
      }

      fullText = mergedBlocks.join('\n\n----------------\n\n');
    } else {
      const bySchool = conclusionBySchool[selectedSchoolSlug];
      const target = bySchool?.byDate?.[dateKey];

      if (!target?.markdown) {
        setSummaryNotFound(true);
        return;
      }

      fullText = markdownToPlainText(target.markdown);
      if (!fullText) {
        setSummaryNotFound(true);
        return;
      }
    }

    setIsTypingSummary(true);
    indexRef.current = 0;
    const chunk = Math.max(2, Math.ceil(fullText.length / 60));

    typingTimerRef.current = window.setInterval(() => {
      indexRef.current = Math.min(fullText.length, indexRef.current + chunk);
      setDailySummaryText(fullText.slice(0, indexRef.current));
      if (indexRef.current >= fullText.length) {
        if (typingTimerRef.current) {
          window.clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
        }
        setIsTypingSummary(false);
      }
    }, 45);
  }, [conclusionBySchool, schoolNameBySlug, selectedDate, selectedSchoolSlug]);

  const bodyContent = (() => {
    if (dailySummaryText) {
      return (
        <ScrollArea className="h-[320px]">
          <div className="p-3 pr-4 text-xs leading-relaxed whitespace-pre-wrap text-foreground/90">
            {dailySummaryText}
            {isTypingSummary && <span className="ml-1 inline-block w-2 animate-pulse">|</span>}
          </div>
        </ScrollArea>
      );
    }
    if (isTypingSummary) {
      return (
        <div className="p-3 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-primary font-semibold">正在生成每日总结...</span>
        </div>
      );
    }
    if (summaryNotFound) {
      return <div className="p-4 text-center text-xs text-muted-foreground">该日期暂无AI总结</div>;
    }
    return <div className="p-4 text-center text-xs text-muted-foreground">选择日期后自动生成每日总结</div>;
  })();

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b border-border/50 bg-muted/30 text-muted-foreground text-xs font-bold uppercase tracking-wider">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span>AI 每日总结</span>
      </div>
      {bodyContent}
    </div>
  );
});
DailySummaryPanel.displayName = 'DailySummaryPanel';

interface RightSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  onDateSelect: (date: Date | null) => void;
  articleCountByDate: Record<string, number> | null;
  timedOnly: boolean;
  onTimedOnlyChange: (value: boolean) => void;
  hideExpired: boolean;
  onHideExpiredChange: (value: boolean) => void;
  tagStats: Array<{ tag: string; count: number }>;
  activeTagFilters: string[];
  onTagToggle: (tag: string) => void;
  selectedSchoolSlug: string | null;
  conclusionBySchool: Record<string, ConclusionItem>;
  schoolNameBySlug: Record<string, string>;
  selectedFeedId: string | null;
}

const TAG_COLLAPSE_THRESHOLD = 6;

export const RightSidebar: React.FC<RightSidebarProps> = React.memo(({
  isOpen,
  onClose,
  selectedDate,
  onDateSelect,
  articleCountByDate,
  timedOnly,
  onTimedOnlyChange,
  hideExpired,
  onHideExpiredChange,
  tagStats,
  activeTagFilters,
  onTagToggle,
  selectedSchoolSlug,
  conclusionBySchool,
  schoolNameBySlug,
  selectedFeedId,
}) => {
  const [tagStatsExpanded, setTagStatsExpanded] = React.useState(false);
  const shouldCollapseTagStats = tagStats.length > TAG_COLLAPSE_THRESHOLD;

  React.useEffect(() => {
    setTagStatsExpanded(false);
  }, [selectedFeedId, selectedDate]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        'fixed inset-y-0 right-0 z-40 w-80 flex flex-col bg-card border-l transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 shrink-0',
        isOpen ? 'translate-x-0' : 'translate-x-full',
        !isOpen && 'lg:w-0 lg:border-none lg:overflow-hidden'
      )}>
        <div className="p-4 border-b flex items-center justify-between lg:hidden shrink-0">
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="关闭右侧栏" title="关闭右侧栏" className="-ml-2 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </Button>
          {widgetsConfig.modules.pwa_install && <InstallPWAButton />}
        </div>
        <div className="p-4 flex flex-col gap-6 h-full overflow-y-auto">
          {widgetsConfig.widgets.calendar.enabled && (
            <div className="flex flex-col gap-1">
              <CalendarWidget
                selectedDate={selectedDate}
                onDateSelect={onDateSelect}
                articleCountByDate={articleCountByDate}
              />
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 p-3 border-b border-border/50 bg-muted/30 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                <Clock3 className="w-3.5 h-3.5 text-primary" />
                <span>时效过滤</span>
              </div>
              <div className="p-3 flex flex-col gap-2 bg-[rgb(255,255,255)] dark:bg-[hsl(var(--card))]">
                <label
                  className={cn(
                    'w-full flex items-center justify-between text-xs px-3 py-2 rounded transition-colors cursor-pointer bg-[rgb(255,255,255)] dark:bg-[hsl(var(--card))]',
                    timedOnly ? 'text-primary' : 'text-foreground'
                  )}
                >
                  <span className={cn('font-medium', timedOnly && 'text-primary')}>仅查看限时活动</span>
                  <Switch checked={timedOnly} onCheckedChange={onTimedOnlyChange} aria-label="仅查看限时活动" />
                </label>
                <label
                  className={cn(
                    'w-full flex items-center justify-between text-xs px-3 py-2 rounded transition-colors cursor-pointer bg-[rgb(255,255,255)] dark:bg-[hsl(var(--card))]',
                    hideExpired ? 'text-primary' : 'text-foreground'
                  )}
                >
                  <span className={cn('font-medium', hideExpired && 'text-primary')}>隐藏已过期活动</span>
                  <Switch checked={hideExpired} onCheckedChange={onHideExpiredChange} aria-label="隐藏已过期活动" />
                </label>
              </div>
            </div>

            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 p-3 border-b border-border/50 bg-muted/30 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                <Tags className="w-3.5 h-3.5 text-primary" />
                <span>标签统计</span>
              </div>
              <div className="p-3 bg-[rgb(255,255,255)] dark:bg-[hsl(var(--card))]">
                <div className="relative">
                  <div
                    className={cn(
                      'flex flex-wrap gap-2 transition-[max-height] duration-300',
                      !shouldCollapseTagStats
                        ? 'max-h-none overflow-visible'
                        : tagStatsExpanded
                          ? 'max-h-none overflow-visible'
                          : 'max-h-[104px] overflow-hidden'
                    )}
                  >
                    {tagStats.map((item) => {
                      const active = activeTagFilters.includes(item.tag);
                      return (
                        <button
                          key={item.tag}
                          type="button"
                          onClick={() => onTagToggle(item.tag)}
                          className={cn(
                            'text-xs px-2.5 py-1 rounded border transition-colors',
                            active
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-[rgb(255,255,255)] dark:bg-[hsl(var(--card))] hover:border-primary/50'
                          )}
                        >
                          #{item.tag} ({item.count})
                        </button>
                      );
                    })}
                    {tagStats.length === 0 && <p className="text-xs text-muted-foreground">暂无标签数据</p>}
                  </div>
                  {!tagStatsExpanded && shouldCollapseTagStats && (
                    <div className="pointer-events-none absolute inset-x-0 -bottom-1.5 h-5 bg-gradient-to-t from-[rgb(255,255,255)] via-[rgba(255,255,255,0.9)] to-transparent dark:from-[hsl(var(--card))] dark:via-[hsl(var(--card)/0.92)]" />
                  )}
                </div>
                {shouldCollapseTagStats && (
                  <button
                    type="button"
                    onClick={() => setTagStatsExpanded((prev) => !prev)}
                    className="mt-2 flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {tagStatsExpanded ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" />
                        <span>收起</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" />
                        <span>展开剩余{tagStats.length - TAG_COLLAPSE_THRESHOLD}项</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {widgetsConfig.widgets.ai_summary.enabled && (
              <DailySummaryPanel
                selectedDate={selectedDate}
                selectedSchoolSlug={selectedSchoolSlug}
                conclusionBySchool={conclusionBySchool}
                schoolNameBySlug={schoolNameBySlug}
              />
            )}
          </div>
        </div>
      </aside>
    </>
  );
});
RightSidebar.displayName = 'RightSidebar';
