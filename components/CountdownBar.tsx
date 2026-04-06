import React from 'react';
import { formatTimestamp, getCountdownText, getTimeWindowState } from '@/lib/time-window';

interface CountdownBarProps {
  progress: number;
  endAt?: string;
  nowTs: number;
  size: 'sm' | 'md';
}

/* ---- Global CSS for Stripe Animation ---- */
const STRIPE_CSS = `
@keyframes cdb-scroll {
  from { background-position: 0 0; }
  to { background-position: 32px 0; }
}
.cdb-stripe-animate {
  animation: cdb-scroll 2s linear infinite !important;
  background-size: 32px 32px !important;
  will-change: width, background-position;
}
`;

let cssInjected = false;
function ensureCSS() {
  if (typeof document === 'undefined' || cssInjected) return;
  const tag = document.createElement('style');
  tag.textContent = STRIPE_CSS;
  document.head.appendChild(tag);
  cssInjected = true;
}

export const CountdownBar: React.FC<CountdownBarProps> = React.memo(({ progress, endAt, nowTs, size }) => {
  const barRef = React.useRef<HTMLDivElement>(null);
  const countdownLabel = `剩余 ${getCountdownText(endAt, nowTs)}`;
  const whiteMix = Math.max(0, Math.min(1, (progress - 45) / 15));

  const barHeight = size === 'sm' ? 'h-5' : 'h-6';
  const textSize = size === 'sm' ? 'text-[11px]' : 'text-xs';
  const headerTextSize = size === 'sm' ? 'text-[11px]' : 'text-[12px]';
  const stripeOpacity = size === 'sm' ? 0.78 : 0.75;

  const gradient = React.useMemo(
    () => `linear-gradient(45deg, 
      hsl(var(--primary)) 25%, 
      hsl(var(--primary) / ${stripeOpacity}) 25%, 
      hsl(var(--primary) / ${stripeOpacity}) 50%, 
      hsl(var(--primary)) 50%, 
      hsl(var(--primary)) 75%, 
      hsl(var(--primary) / ${stripeOpacity}) 75%, 
      hsl(var(--primary) / ${stripeOpacity}) 100%)`,
    [stripeOpacity]
  );

  React.useEffect(ensureCSS, []);

  React.useEffect(() => {
    const el = barRef.current;
    if (!el || !endAt) return;

    const endMs = new Date(endAt).getTime();
    const remainMs = endMs - Date.now();

    if (remainMs <= 0) {
      el.style.width = '100%';
      return;
    }

    el.style.width = `${progress}%`;

    const anim = el.animate(
      [
        { width: `${progress}%` },
        { width: '100%' }
      ],
      {
        duration: remainMs,
        easing: 'linear',
        fill: 'forwards'
      }
    );

    return () => anim.cancel();
  }, [endAt, progress]); // Re-sync if initial progress or endAt changes

  return (
    <div className="w-full space-y-1.5">
      <div className={`flex items-center justify-between ${headerTextSize}`}>
        <span className="inline-flex items-center px-2 py-0.5 rounded bg-primary text-primary-foreground font-bold">限时</span>
        <span className="text-muted-foreground">截止 {formatTimestamp(endAt)}</span>
      </div>
      <div className={`relative w-full ${barHeight} rounded-full bg-muted overflow-hidden border border-border/40`}>
        <div
          ref={barRef}
          className="absolute inset-y-0 left-0 cdb-stripe-animate"
          style={{
            backgroundImage: gradient,
          }}
        />
        
        <div className={`absolute inset-0 flex items-center justify-center ${textSize} font-semibold pointer-events-none`}>
          <span className="relative leading-none">
            <span className="text-foreground">{countdownLabel}</span>
            <span
              className="absolute inset-0 text-primary-foreground transition-opacity duration-300"
              style={{ opacity: whiteMix }}
              aria-hidden="true"
            >
              {countdownLabel}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
});

CountdownBar.displayName = 'CountdownBar';

/**
 * Smart wrapper that handles its own timer.
 * Prevents the parent component from re-rendering every second.
 */
export const LiveCountdownBar: React.FC<{ startAt?: string; endAt?: string; size: 'sm' | 'md' }> = React.memo(({ startAt, endAt, size }) => {
  const [nowTs, setNowTs] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (!endAt) return;
    const endMs = new Date(endAt).getTime();
    if (Date.now() >= endMs) return;

    const timer = setInterval(() => {
      setNowTs(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [endAt]);

  const timing = React.useMemo(() => getTimeWindowState(startAt, endAt, nowTs), [startAt, endAt, nowTs]);

  if (timing.state !== 'active') return null;

  return <CountdownBar progress={timing.progress} endAt={endAt} nowTs={nowTs} size={size} />;
});

LiveCountdownBar.displayName = 'LiveCountdownBar';
