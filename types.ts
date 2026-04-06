
export interface Enclosure {
  link: string;
  type: string;
}

export interface NoticeAttachment {
  name: string;
  url: string;
  type?: string;
}

export interface NoticeSource {
  channel?: string;
  sender?: string;
}

export enum ArticleCategory {
  NOTICE = '通知公告',
  COMPETITION = '竞赛相关',
  VOLUNTEER = '志愿实习',
  SECOND_CLASS = '二课活动',
  FORM = '问卷填表',
  OTHER = '其它分类',
}

export interface Article {
  title: string;
  pubDate: string;
  link: string;
  guid: string;
  author: string;
  schoolSlug?: string;
  schoolShortName?: string;
  thumbnail: string;
  description: string;
  content: string;
  enclosure: Enclosure;
  feedTitle?: string;
  aiCategory?: string;       // Stored classification
  tags?: string[];
  attachments?: NoticeAttachment[];
  source?: NoticeSource;
  badge?: string;
  startAt?: string;
  endAt?: string;
  pinned?: boolean;
  isPlaceholderCover?: boolean;
  subscriptionId?: string;
}

export interface Feed {
  url: string;
  title: string;
  description: string;
  image: string;
  items: Article[];
  category?: string;
}

// 订阅源配置元信息（不含文章内容，用于首屏快速渲染左侧列表）
export interface FeedMeta {
  id: string;
  category: string;
  feedType: 'global' | 'summary' | 'source';
  customTitle?: string;
  schoolSlug?: string;
  sourceChannel?: string;
  hiddenInSidebar?: boolean;
  routeSlug: string;
}

// --- 编译后数据类型 ---

export type ConclusionItem = {
  defaultMarkdown: string;
  defaultHtml: string;
  byDate: Record<string, { markdown: string; html: string }>;
};

export type CompiledContent = {
  generatedAt: string;
  updatedCount?: number;
  previousNoticeCount?: number;
  totalNotices?: number;
  schools: Array<{ slug: string; name: string; shortName?: string; icon?: string }>;
  subscriptions: Array<{
    id: string;
    schoolSlug: string;
    schoolName: string;
    title: string;
    number?: string;
    url: string;
    icon: string;
    enabled: boolean;
    order: number;
  }>;
  notices: Article[];
  conclusionBySchool: Record<string, ConclusionItem>;
};

export type SearchItem = {
  id: string;
  schoolSlug: string;
  subscriptionId?: string;
  title: string;
  description: string;
  contentPlainText: string;
  attachmentText?: string;
};

/* ─── Site-level brand configuration (from config/site.yaml) ─── */

export interface SiteConfig {
  site_name: string
  site_short_name: string
  site_description: string
  site_url: string
  default_locale: string
  organization_name: string
  organization_type: 'university' | 'college' | 'institute'
  organization_unit_label: string
  logo_light: string
  logo_dark: string
  favicon: string
  default_cover: string
  footer: {
    copyright: string
    links: Array<{ label: string; url: string }>
  }
  seo: {
    title_template: string
    default_keywords: string[]
  }
  palette: {
    preset: 'red' | 'blue' | 'green' | 'amber' | 'custom'
    primary: string | null
    secondary: string | null
    accent: string | null
  }
  _computed: {
    theme_color_hex: string
    primary_hsl: string
    primary_dark_hsl: string
  }
}

/* ─── Widget display & parameter configuration (from config/widgets.yaml) ─── */

export interface WidgetsConfig {
  modules: {
    dashboard: boolean
    right_sidebar: boolean
    search: boolean
    view_counts: boolean
    rss_entry: boolean
    pwa_install: boolean
    stats_chart: boolean
    footer_branding: boolean
    update_health: boolean
  }
  widgets: {
    calendar: { enabled: boolean; title: string; default_expanded: boolean }
    search: { placeholder: string; show_hit_count: boolean }
    dashboard: { title: string; visible_cards: string[] }
    ai_summary: { enabled: boolean; title: string; empty_text: string; default_expanded: boolean }
    time_filter: { default_timed_only: boolean; default_hide_expired: boolean }
    tag_stats: { max_display: number; default_expanded_count: number }
    view_counts: { enabled: boolean; label: string }
    rss_entry: { enabled: boolean; label: string }
    pwa_install: { enabled: boolean; label: string; prompt_text: string }
    palette_switcher: { enabled: boolean }
  }
}
