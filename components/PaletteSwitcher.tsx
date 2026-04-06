import React from 'react';
import { Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'edu-publish-hue';
const DEFAULT_HUE = 221; // blue

/** Given a hue (0-360), compute all CSS variables for light and dark modes */
function computeVarsFromHue(hue: number) {
  return {
    light: {
      '--primary': `${hue} 83% 53%`,
      '--primary-foreground': `${hue} 40% 98%`,
      '--secondary': `${hue} 40% 96%`,
      '--secondary-foreground': `${hue} 47% 11%`,
      '--accent': `${hue} 40% 96%`,
      '--accent-foreground': `${hue} 47% 11%`,
      '--foreground': `${hue} 47% 11%`,
      '--card-foreground': `${hue} 47% 11%`,
      '--popover-foreground': `${hue} 47% 11%`,
      '--muted': `${hue} 40% 96%`,
      '--muted-foreground': `${hue} 16% 47%`,
      '--border': `${hue} 32% 91%`,
      '--input': `${hue} 32% 91%`,
      '--ring': `${hue} 83% 53%`,
    },
    dark: {
      '--primary': `${hue} 91% 60%`,
      '--primary-foreground': `${hue} 47% 11%`,
      '--secondary': `${hue} 10% 18%`,
      '--secondary-foreground': `${hue} 40% 92%`,
      '--accent': `${hue} 10% 18%`,
      '--accent-foreground': `${hue} 40% 92%`,
      '--ring': `${hue} 91% 60%`,
    },
  };
}

function hueToHex(hue: number): string {
  // Convert HSL(hue, 83%, 53%) to hex for theme-color meta
  const s = 0.83, l = 0.53;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (hue < 60) { r = c; g = x; }
  else if (hue < 120) { r = x; g = c; }
  else if (hue < 180) { g = c; b = x; }
  else if (hue < 240) { g = x; b = c; }
  else if (hue < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function applyHue(hue: number) {
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');
  const vars = computeVarsFromHue(hue);

  // Always apply light structural vars (they're in :root regardless of dark mode)
  for (const [key, value] of Object.entries(vars.light)) {
    if (!isDark) root.style.setProperty(key, value);
  }

  // Apply dark overrides when in dark mode
  if (isDark) {
    for (const [key, value] of Object.entries(vars.dark)) {
      root.style.setProperty(key, value);
    }
  }

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute('content', isDark ? '#191b1f' : hueToHex(hue));
  }
}

const QUICK_HUES = [
  { hue: 0, label: '红' },
  { hue: 38, label: '琥珀' },
  { hue: 142, label: '绿' },
  { hue: 221, label: '蓝' },
  { hue: 271, label: '紫' },
  { hue: 330, label: '粉' },
];

export const PaletteSwitcher: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const [hue, setHue] = React.useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? Number(saved) : DEFAULT_HUE;
  });
  const popoverRef = React.useRef<HTMLDivElement>(null);

  // Apply hue on mount and when dark mode toggles
  React.useEffect(() => {
    applyHue(hue);
    const observer = new MutationObserver(() => applyHue(hue));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, [hue]);

  // Persist
  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(hue));
  }, [hue]);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={popoverRef}>
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 md:h-9 md:w-9"
        onClick={() => setOpen(!open)}
        title="切换主题色"
        aria-label="切换主题色"
      >
        <Palette className="w-5 h-5 md:w-4 md:h-4" />
      </Button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 bg-card border rounded-xl shadow-lg p-3 w-[220px] z-50">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2.5">主题色相</p>

          {/* Hue slider */}
          <div className="relative mb-3">
            <input
              type="range"
              min={0}
              max={359}
              value={hue}
              onChange={(e) => setHue(Number(e.target.value))}
              className="palette-hue-slider w-full h-3 rounded-full appearance-none cursor-pointer"
              style={{
                background: 'linear-gradient(to right, hsl(0,83%,53%), hsl(60,83%,53%), hsl(120,83%,53%), hsl(180,83%,53%), hsl(240,83%,53%), hsl(300,83%,53%), hsl(359,83%,53%))',
              }}
              aria-label="色相滑块"
            />
            <style>{`
              .palette-hue-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 18px; height: 18px;
                border-radius: 50%;
                background: hsl(${hue}, 83%, 53%);
                border: 3px solid white;
                box-shadow: 0 1px 4px rgba(0,0,0,0.3);
                cursor: pointer;
              }
              .palette-hue-slider::-moz-range-thumb {
                width: 18px; height: 18px;
                border-radius: 50%;
                background: hsl(${hue}, 83%, 53%);
                border: 3px solid white;
                box-shadow: 0 1px 4px rgba(0,0,0,0.3);
                cursor: pointer;
                border: none;
              }
            `}</style>
          </div>

          {/* Current hue indicator */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className="w-5 h-5 rounded-full border-2 border-white shadow-sm shrink-0"
              style={{ background: `hsl(${hue}, 83%, 53%)` }}
            />
            <span className="text-xs font-bold text-foreground/80">{hue}°</span>
          </div>

          {/* Quick presets */}
          <div className="flex gap-1.5 flex-wrap">
            {QUICK_HUES.map(({ hue: h, label }) => (
              <button
                key={h}
                type="button"
                onClick={() => setHue(h)}
                title={label}
                className="group flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-colors hover:bg-muted"
                style={hue === h ? { background: `hsl(${h}, 83%, 53%, 0.12)` } : undefined}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{
                    background: `hsl(${h}, 83%, 53%)`,
                    boxShadow: hue === h ? `0 0 0 2px hsl(${h}, 83%, 53%, 0.4)` : 'none',
                  }}
                />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
