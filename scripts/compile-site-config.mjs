#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SITE_YAML = path.join(ROOT, 'config', 'site.yaml');
const OUT_DIR = path.join(ROOT, 'public', 'generated');

const PALETTE_PRESETS = {
  red: {
    primary: '0 74% 43%', primary_foreground: '0 0% 100%',
    secondary: '0 30% 96%', secondary_foreground: '0 62% 22%',
    accent: '0 30% 96%', accent_foreground: '0 62% 22%',
    dark_primary: '0 72% 48%', dark_primary_foreground: '0 0% 100%',
    dark_secondary: '0 10% 18%', dark_secondary_foreground: '0 0% 92%',
    dark_accent: '0 10% 18%', dark_accent_foreground: '0 0% 92%',
    theme_color_hex: '#b72020',
  },
  blue: {
    primary: '221 83% 53%', primary_foreground: '210 40% 98%',
    secondary: '210 40% 96%', secondary_foreground: '222 47% 11%',
    accent: '210 40% 96%', accent_foreground: '222 47% 11%',
    dark_primary: '217 91% 60%', dark_primary_foreground: '222 47% 11%',
    dark_secondary: '217 10% 18%', dark_secondary_foreground: '210 40% 92%',
    dark_accent: '217 10% 18%', dark_accent_foreground: '210 40% 92%',
    theme_color_hex: '#2563eb',
  },
  green: {
    primary: '142 71% 35%', primary_foreground: '0 0% 100%',
    secondary: '140 30% 96%', secondary_foreground: '142 50% 15%',
    accent: '140 30% 96%', accent_foreground: '142 50% 15%',
    dark_primary: '142 71% 45%', dark_primary_foreground: '0 0% 100%',
    dark_secondary: '142 10% 18%', dark_secondary_foreground: '140 30% 92%',
    dark_accent: '142 10% 18%', dark_accent_foreground: '140 30% 92%',
    theme_color_hex: '#16a34a',
  },
  amber: {
    primary: '38 92% 40%', primary_foreground: '0 0% 100%',
    secondary: '38 40% 96%', secondary_foreground: '38 60% 15%',
    accent: '38 40% 96%', accent_foreground: '38 60% 15%',
    dark_primary: '38 92% 50%', dark_primary_foreground: '38 80% 10%',
    dark_secondary: '38 10% 18%', dark_secondary_foreground: '38 30% 92%',
    dark_accent: '38 10% 18%', dark_accent_foreground: '38 30% 92%',
    theme_color_hex: '#d97706',
  },
};

function main() {
  if (!fs.existsSync(SITE_YAML)) {
    console.error(`[compile-site-config] ERROR: ${SITE_YAML} not found.`);
    process.exit(1);
  }

  const raw = fs.readFileSync(SITE_YAML, 'utf-8');
  const config = YAML.parse(raw);

  const preset = config.palette?.preset || 'blue';
  let palette;
  if (preset === 'custom') {
    if (!config.palette?.primary) {
      console.error('[compile-site-config] ERROR: palette.preset is "custom" but palette.primary is not set.');
      process.exit(1);
    }
    palette = {
      primary: config.palette.primary,
      primary_foreground: config.palette.primary_foreground || '0 0% 100%',
      secondary: config.palette.secondary || config.palette.primary,
      secondary_foreground: config.palette.secondary_foreground || '0 0% 100%',
      accent: config.palette.accent || config.palette.primary,
      accent_foreground: config.palette.accent_foreground || '0 0% 100%',
      dark_primary: config.palette.dark_primary || config.palette.primary,
      dark_primary_foreground: config.palette.dark_primary_foreground || '0 0% 100%',
      dark_secondary: config.palette.dark_secondary || config.palette.secondary || config.palette.primary,
      dark_secondary_foreground: config.palette.dark_secondary_foreground || '0 0% 100%',
      dark_accent: config.palette.dark_accent || config.palette.accent || config.palette.primary,
      dark_accent_foreground: config.palette.dark_accent_foreground || '0 0% 100%',
      theme_color_hex: config.palette.theme_color_hex || '#2563eb',
    };
  } else {
    palette = PALETTE_PRESETS[preset];
    if (!palette) {
      console.error(`[compile-site-config] ERROR: Unknown palette preset "${preset}". Use: red, blue, green, amber, custom.`);
      process.exit(1);
    }
  }

  config._computed = {
    theme_color_hex: palette.theme_color_hex,
    primary_hsl: palette.primary,
    primary_dark_hsl: palette.dark_primary,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const jsonPath = path.join(OUT_DIR, 'site-config.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));
  console.log(`[compile-site-config] Wrote ${jsonPath}`);

  const css = `:root {
  --primary: ${palette.primary};
  --primary-foreground: ${palette.primary_foreground};
  --secondary: ${palette.secondary};
  --secondary-foreground: ${palette.secondary_foreground};
  --accent: ${palette.accent};
  --accent-foreground: ${palette.accent_foreground};
}

.dark {
  --primary: ${palette.dark_primary};
  --primary-foreground: ${palette.dark_primary_foreground};
  --secondary: ${palette.dark_secondary};
  --secondary-foreground: ${palette.dark_secondary_foreground};
  --accent: ${palette.dark_accent};
  --accent-foreground: ${palette.dark_accent_foreground};
}
`;
  const cssPath = path.join(OUT_DIR, 'palette.css');
  fs.writeFileSync(cssPath, css);
  console.log(`[compile-site-config] Wrote ${cssPath}`);
}

main();
