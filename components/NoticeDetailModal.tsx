import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  FileArchive,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Share2,
  X,
} from 'lucide-react';
import { Article } from '../types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useNow } from '@/hooks/use-now';
import { getTimeWindowState, formatTimestamp } from '@/lib/time-window';
import { CountdownBar, LiveCountdownBar } from './CountdownBar';
import { siteConfig } from '../lib/site-config';
import { renderSimpleMarkdown } from '../lib/simple-markdown';

interface NoticeDetailModalProps {
  article: Article | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  shareUrl: string;
}

export const NoticeDetailModal: React.FC<NoticeDetailModalProps> = React.memo(({
  article,
  onClose,
  onPrev,
  onNext,
  canPrev,
  canNext,
  shareUrl,
}) => {
  const { toast } = useToast();
  const [badgeSrc, setBadgeSrc] = React.useState(siteConfig.favicon);
  const openedAtRef = React.useRef(0);
  const modalBodyRef = React.useRef<HTMLDivElement | null>(null);
  const [contentReady, setContentReady] = React.useState(false);

  const isTouchDevice = React.useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches,
    []
  );

  React.useEffect(() => {
    if (!article) {
      setContentReady(false);
      return;
    }
    openedAtRef.current = Date.now();
    const timer = requestAnimationFrame(() => {
      setContentReady(true);
    });
    return () => cancelAnimationFrame(timer);
  }, [article]);

  const handleOverlayClick = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (Date.now() - openedAtRef.current < 250) return;
    onClose();
  }, [onClose]);

  // Use a periodically-refreshed now so timing badges update while the modal is open
  const hasTimeWindow = Boolean(article?.startAt || article?.endAt);
  const now = useNow(hasTimeWindow);
  const timing = React.useMemo(() => getTimeWindowState(article?.startAt, article?.endAt, now), [article?.startAt, article?.endAt, now]);

  React.useEffect(() => {
    if (!article) return;
    setBadgeSrc(article.badge || siteConfig.favicon);
  }, [article]);
  const iconForAttachment = (type?: string, name?: string) => {
    const ext = (type || name?.split('.').pop() || 'file').toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return FileImage;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return FileArchive;
    if (['mp4', 'avi', 'mov', 'mkv'].includes(ext)) return FileVideo;
    if (['mp3', 'wav', 'ogg'].includes(ext)) return FileAudio;
    return FileText;
  };

  React.useEffect(() => {
    if (!article) return undefined;

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && canPrev) onPrev();
      if (event.key === 'ArrowRight' && canNext) onNext();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Lock all Radix ScrollArea viewports behind the modal so only the
    // modal's own ScrollArea remains scrollable.
    const modalEl = document.querySelector('[data-modal-overlay]');
    const allViewports = document.querySelectorAll<HTMLElement>('[data-radix-scroll-area-viewport]');
    const lockedViewports: { el: HTMLElement; prev: string }[] = [];
    allViewports.forEach((vp) => {
      if (modalEl?.contains(vp)) return;
      lockedViewports.push({ el: vp, prev: vp.style.overflow });
      vp.style.overflow = 'hidden';
    });

    window.addEventListener('keydown', handleKeydown);

    return () => {
      document.body.style.overflow = previousOverflow;
      lockedViewports.forEach(({ el, prev }) => { el.style.overflow = prev; });
      window.removeEventListener('keydown', handleKeydown);
    };
  }, [article, onClose, onPrev, onNext, canPrev, canNext]);

  const handleShare = async () => {
    if (!article) return;
    const rawUrl = shareUrl || `${window.location.origin}${window.location.pathname}#${article.guid}`;
    const targetUrl = (() => {
      try {
        const parsed = new URL(rawUrl, window.location.origin);
        const encodedPath = parsed.pathname
          .split('/')
          .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
          .join('/');
        const encodedHash = parsed.hash
          ? `#${encodeURIComponent(decodeURIComponent(parsed.hash.slice(1)))}`
          : '';
        return `${parsed.origin}${encodedPath}${parsed.search}${encodedHash}`;
      } catch {
        return encodeURI(rawUrl);
      }
    })();

    const fallbackCopy = (text: string): boolean => {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        return ok;
      } catch {
        return false;
      }
    };

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(targetUrl);
        toast({ description: '复制链接成功' });
        return;
      }
    } catch {
      // Continue to fallback.
    }

    if (fallbackCopy(targetUrl)) {
      toast({ description: '复制链接成功' });
      return;
    }

    window.prompt('复制此链接', targetUrl);
    toast({ description: '无法自动复制，请手动复制链接', variant: 'destructive' });
  };

  const descriptionHtml = React.useMemo(
    () => DOMPurify.sanitize(renderSimpleMarkdown(article?.description || '')),
    [article?.description]
  );

  const sanitizedContent = React.useMemo(
    () => (article?.content ? DOMPurify.sanitize(article.content) : ''),
    [article?.content]
  );
  const schoolShortNameText = String(article?.schoolShortName || '').trim() || `未知${siteConfig.organization_unit_label}`;
  const withSchoolPrefix = React.useCallback((channel: string) => {
    return `[${schoolShortNameText}]${channel}`;
  }, [schoolShortNameText]);
  const sourceChannelTextRaw = String(article?.source?.channel || article?.feedTitle || '未知群号').trim() || '未知群号';
  const sourceChannelText = withSchoolPrefix(sourceChannelTextRaw);
  const sourceSenderText = String(article?.source?.sender || article?.author || '未知发布人').trim() || '未知发布人';

  const navButtons = (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={onPrev}
        disabled={!canPrev}
        className="h-8 w-8 md:h-10 md:w-10"
        aria-label="上一条通知"
        title="上一条通知"
      >
        <ChevronLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onNext}
        disabled={!canNext}
        className="h-8 w-8 md:h-10 md:w-10"
        aria-label="下一条通知"
        title="下一条通知"
      >
        <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
      </Button>
    </>
  );

  const dateDisplay = article ? (
    <div className="inline-flex items-center gap-1 text-xs md:text-sm text-muted-foreground min-w-0">
      <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
      <span className="truncate">{new Date(article.pubDate).toLocaleString('zh-CN')}</span>
    </div>
  ) : null;

  const actionButtons = (
    <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
      <Button variant="ghost" className="gap-1.5 md:gap-2 h-8 md:h-10 px-2.5 md:px-3 text-xs md:text-sm" onClick={handleShare}>
        <Share2 className="h-3.5 w-3.5 md:h-4 md:w-4" /> 分享
      </Button>
      <Button onClick={onClose} className="h-8 md:h-10 px-3 md:px-4 text-xs md:text-sm">关闭</Button>
    </div>
  );

  const cardInitial = isTouchDevice
    ? { opacity: 0, y: 30 }
    : { opacity: 0, scale: 0.92, y: 20 };
  const cardAnimate = isTouchDevice
    ? { opacity: 1, y: 0 }
    : { opacity: 1, scale: 1, y: 0 };
  const cardExit = isTouchDevice
    ? { opacity: 0, y: 20 }
    : { opacity: 0, scale: 0.96, y: 10 };
  const cardTransition = isTouchDevice
    ? { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as const }
    : { duration: 0.22, ease: [0.4, 0, 0.2, 1] as const };

  return (
    <AnimatePresence mode="wait">
      {article && (
        <motion.div
          key={article.guid}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: isTouchDevice ? 0.15 : 0.2 }}
          className="fixed inset-0 z-50 bg-black/60 md:backdrop-blur-sm p-4 md:p-8"
          data-modal-overlay
          onClick={handleOverlayClick}
        >
          <motion.div
            initial={cardInitial}
            animate={cardAnimate}
            exit={cardExit}
            transition={cardTransition}
            className="mx-auto h-full max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border bg-background shadow-2xl flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex h-[52px] md:h-16 items-center justify-between border-b px-3 md:px-6 shrink-0">
              <div className="min-w-0 flex items-center gap-2 md:gap-3">
                <div className="w-7 h-7 md:w-9 md:h-9 rounded-full border bg-background overflow-hidden shrink-0">
                  <img
                    src={badgeSrc}
                    alt={`${siteConfig.organization_unit_label}徽`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={() => setBadgeSrc(siteConfig.favicon)}
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs md:text-sm font-bold text-foreground">
                    {article.author || '未知发布人'}
                  </p>
                  <p className="truncate text-[10px] md:text-xs text-muted-foreground">
                    {withSchoolPrefix(String(article.source?.channel || article.feedTitle || '通知来源'))}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 md:h-10 md:w-10"
                  aria-label="关闭详情"
                  title="关闭详情"
                >
                  <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </Button>
              </div>
            </header>

            <ScrollArea className="flex-1">
                <div
                  ref={modalBodyRef}
                  className="mx-auto w-full max-w-3xl min-w-0 overflow-x-auto p-4 md:p-8"
                >
                <div className="flex flex-wrap gap-1.5 md:gap-2 mb-3 md:mb-4">
                  <LiveCountdownBar startAt={article.startAt} endAt={article.endAt} size="md" />
                  {timing.state === 'expired' && (
                    <span className="text-[10px] md:text-[11px] px-1.5 md:px-2 py-0.5 md:py-1 rounded border border-rose-300/80 bg-rose-50 text-rose-700 font-bold dark:border-rose-300/60 dark:bg-rose-500/20 dark:text-rose-100">已过期</span>
                  )}
                  {timing.state === 'upcoming' && (
                    <span className="text-[10px] md:text-[11px] px-1.5 md:px-2 py-0.5 md:py-1 rounded border border-sky-300/80 bg-sky-50 text-sky-700 font-bold dark:border-sky-300/60 dark:bg-sky-500/20 dark:text-sky-100">
                      将于 {formatTimestamp(article.startAt)} 开始
                    </span>
                  )}
                  {article.aiCategory && (
                    <span className="text-[10px] md:text-[11px] bg-primary text-primary-foreground px-1.5 md:px-2 py-0.5 md:py-1 rounded border border-primary/80 font-semibold">{article.aiCategory}</span>
                  )}
                  {(article.tags || []).filter((tag) => String(tag).trim() !== '学院通知').map((tag) => (
                    <span key={tag} className="text-[10px] md:text-[11px] bg-muted text-foreground px-1.5 md:px-2 py-0.5 md:py-1 rounded border">#{tag}</span>
                  ))}
                </div>

                <h2 className="text-2xl md:text-4xl font-black leading-tight mb-3 md:mb-4 break-words [overflow-wrap:anywhere]">{article.title}</h2>

                {contentReady ? (
                  <>
                    <div
                      className="text-[13px] md:text-base leading-relaxed text-muted-foreground mb-5 md:mb-6 break-words [overflow-wrap:anywhere] [&_a]:text-primary [&_a]:underline [&_strong]:font-semibold"
                      dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                    />

                    {article.attachments && article.attachments.length > 0 && (
                  <section className="mb-5 md:mb-6 rounded-xl border bg-muted/20 p-3 md:p-4 overflow-x-auto">
                    <h3 className="mb-2.5 md:mb-3 text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground">附件下载</h3>
                    <div className="space-y-1.5 md:space-y-2">
                      {article.attachments.map((attachment) => {
                        const Icon = iconForAttachment(attachment.type, attachment.name);
                        const hasLink = Boolean(attachment.url && attachment.url !== '#');
                        if (!hasLink) {
                          return (
                            <div
                              key={`${attachment.url}-${attachment.name}`}
                              className="flex min-w-0 items-center justify-between gap-2 rounded-lg border bg-background px-2.5 md:px-3 py-1.5 md:py-2 text-xs md:text-sm"
                            >
                              <div className="min-w-0 flex flex-1 items-center gap-2">
                                <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-medium break-all leading-snug">{attachment.name}</p>
                                  <p className="text-[10px] md:text-xs text-muted-foreground">{attachment.type || 'file'}</p>
                                </div>
                              </div>
                              <span className="inline-flex shrink-0 items-center gap-1 text-primary text-[10px] md:text-xs font-bold">
                                已记录 <Download className="h-3 w-3 md:h-3.5 md:w-3.5" />
                              </span>
                            </div>
                          );
                        }

                        return (
                          <a
                            key={`${attachment.url}-${attachment.name}`}
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex min-w-0 items-center justify-between gap-2 rounded-lg border bg-background px-2.5 md:px-3 py-1.5 md:py-2 text-xs md:text-sm hover:border-primary/50"
                          >
                            <div className="min-w-0 flex flex-1 items-center gap-2">
                              <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary shrink-0" />
                              <div className="min-w-0">
                                <p className="font-medium break-all leading-snug">{attachment.name}</p>
                                <p className="text-[10px] md:text-xs text-muted-foreground">{attachment.type || 'file'}</p>
                              </div>
                            </div>
                            <span className="inline-flex shrink-0 items-center gap-1 text-primary text-[10px] md:text-xs font-bold">
                              下载 <Download className="h-3 w-3 md:h-3.5 md:w-3.5" />
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  </section>
                )}

                <p className="mb-3 md:mb-4 text-xs md:text-sm italic text-muted-foreground">以下为通知原文：</p>

                <article className="prose prose-slate max-w-none text-[13px] md:text-base leading-relaxed dark:prose-invert overflow-x-hidden prose-pre:max-w-full prose-pre:overflow-x-auto prose-pre:whitespace-pre-wrap prose-code:break-all prose-p:break-words prose-p:[overflow-wrap:anywhere] prose-li:break-words prose-li:[overflow-wrap:anywhere] prose-headings:break-words prose-headings:[overflow-wrap:anywhere] prose-a:break-all prose-img:max-w-full prose-table:block prose-table:max-w-full prose-table:overflow-x-auto">
                  <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
                </article>

                <p className="mt-3 md:mt-4 text-right text-xs md:text-sm italic text-muted-foreground">{`———来源：${sourceChannelText}、发送者：${sourceSenderText}`}</p>
                  </>
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground">加载中…</div>
                )}

              </div>
            </ScrollArea>

            <footer className="px-3 md:px-6 py-2.5 md:py-3 border-t bg-background shrink-0">
              {/* Mobile: nav above, date + actions below */}
              <div className="flex items-center justify-center gap-2 lg:hidden mb-2">
                {navButtons}
              </div>
              <div className="flex items-center justify-between gap-3 lg:hidden">
                {dateDisplay}
                {actionButtons}
              </div>

              {/* Desktop: date | nav | actions in one row */}
              <div className="hidden lg:flex items-center justify-between gap-3">
                {dateDisplay}
                <div className="flex items-center gap-2">{navButtons}</div>
                {actionButtons}
              </div>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

NoticeDetailModal.displayName = 'NoticeDetailModal';
