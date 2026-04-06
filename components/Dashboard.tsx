import React from 'react';
import { Newspaper, Rss, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { StatsChart } from './StatsChart';
import { SiteFooter } from './SiteFooter';
import { widgetsConfig } from '../lib/widgets-config';
import { siteConfig } from '../lib/site-config';
import { Feed, FeedMeta } from '../types';

interface DashboardProps {
  feedEntries: Array<{ meta: FeedMeta; feed: Feed }>;
  schoolShortNameMap: Record<string, string>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  onBackToDashboard: () => void;
}

const isSummaryFeedId = (id: string) => id.startsWith('school-') && id.endsWith('-all');

export const Dashboard: React.FC<DashboardProps> = ({
  feedEntries,
  schoolShortNameMap,
  isSidebarOpen,
  setIsSidebarOpen,
  onBackToDashboard
}) => {
  const summaryFeeds = React.useMemo(
    () => feedEntries.filter(({ meta }) => isSummaryFeedId(meta.id)),
    [feedEntries]
  );

  const sourceFeeds = React.useMemo(
    () => feedEntries.filter(({ meta }) => Boolean(meta.sourceChannel) && !isSummaryFeedId(meta.id)),
    [feedEntries]
  );

  const sourceFeedsForStats = React.useMemo(
    () => sourceFeeds.filter(({ meta, feed }) => {
      const sourceName = meta.sourceChannel || meta.customTitle || feed.title;
      const isGlobalSummary = meta.id === 'all-schools' || sourceName === '全校汇总';
      return !isGlobalSummary;
    }),
    [sourceFeeds]
  );

  const totalArticles = React.useMemo(
    () => summaryFeeds.reduce((acc, item) => acc + item.feed.items.length, 0),
    [summaryFeeds]
  );

  const schoolSummaryRows = React.useMemo(
    () => summaryFeeds
      .map(({ meta, feed }) => ({
        name: meta.category || meta.customTitle || feed.title.replace(/汇总$/, ''),
        count: feed.items.length,
        fullTitle: meta.category || feed.title.replace(/汇总$/, ''),
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN')),
    [summaryFeeds]
  );

  const sourceRows = React.useMemo(
    () => sourceFeedsForStats
      .map(({ meta, feed }) => {
        const shortSchool = schoolShortNameMap[meta.schoolSlug || ''] || (meta.schoolSlug || `未知${siteConfig.organization_unit_label}`);
        const sourceName = meta.sourceChannel || meta.customTitle || feed.title;
        return {
          name: `${shortSchool} · ${sourceName}`,
          count: feed.items.length,
          fullTitle: `${shortSchool} · ${feed.title}`,
        };
      })
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN')),
    [schoolShortNameMap, sourceFeedsForStats]
  );

  const activeSourceCount = React.useMemo(
    () => sourceFeedsForStats.filter(({ meta, feed }) => {
      const sourceName = meta.sourceChannel || meta.customTitle || feed.title;
      return !/待接入/.test(sourceName);
    }).length,
    [sourceFeedsForStats]
  );

  return (
    <ScrollArea className="h-full bg-muted/10">
      <div className="max-w-5xl mx-auto p-6 md:p-12 space-y-10">
        <header className="flex items-center gap-4">
          {!isSidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
              className="shrink-0"
              aria-label="打开左侧栏"
              title="打开左侧栏"
            >
              <PanelLeft className="w-6 h-6" />
            </Button>
          )}
          <div onClick={onBackToDashboard} className="cursor-pointer">
            <h2 className="text-4xl font-black tracking-tight">仪表盘</h2>
            <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-[0.2em]">资讯生态概览</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-primary/5 border-primary/10">
            <CardContent className="p-6 flex items-center gap-6">
              <div className="bg-primary text-primary-foreground p-4 rounded-2xl shadow-lg shadow-primary/20">
                <Newspaper className="w-8 h-8" />
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">活动总数</p>
                <h3 className="text-3xl font-black">{totalArticles}</h3>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/10">
            <CardContent className="p-6 flex items-center gap-6">
              <div className="bg-primary text-primary-foreground p-4 rounded-2xl shadow-lg shadow-primary/20">
                <Rss className="w-8 h-8" />
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">活跃订阅源</p>
                <h3 className="text-3xl font-black">{activeSourceCount}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {widgetsConfig.modules.stats_chart && (
          <>
            <Card className="p-6">
              <StatsChart title={`各${siteConfig.organization_unit_label}活跃度`} rows={schoolSummaryRows} />
            </Card>

            <Card className="p-6">
              <StatsChart title="订阅源活跃度" rows={sourceRows} />
            </Card>
          </>
        )}

        {widgetsConfig.modules.footer_branding && (
          <SiteFooter className="pt-2 pb-[max(12px,env(safe-area-inset-bottom))] text-center text-[11px] leading-5 text-muted-foreground" />
        )}
      </div>
    </ScrollArea>
  );
};
