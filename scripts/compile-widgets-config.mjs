#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const WIDGETS_YAML = path.join(ROOT, 'config', 'widgets.yaml');
const OUT_DIR = path.join(ROOT, 'public', 'generated');

const DEFAULTS = {
  modules: {
    dashboard: true, right_sidebar: true, search: true, view_counts: false,
    rss_entry: true, pwa_install: true, stats_chart: true, footer_branding: true, update_health: false,
  },
  widgets: {
    calendar: { enabled: true, title: '日期筛选', default_expanded: true },
    search: { placeholder: '搜索通知标题、内容…', show_hit_count: true },
    dashboard: { title: '数据看板', visible_cards: ['total_notices', 'today_notices', 'active_events', 'subscription_count'] },
    ai_summary: { enabled: true, title: '今日摘要', empty_text: '暂无今日摘要', default_expanded: true },
    time_filter: { default_timed_only: false, default_hide_expired: false },
    tag_stats: { max_display: 20, default_expanded_count: 10 },
    view_counts: { enabled: false, label: '阅读量' },
    rss_entry: { enabled: true, label: 'RSS 订阅' },
    pwa_install: { enabled: true, label: '安装应用', prompt_text: '将本站添加到主屏幕' },
  },
};

function deepMerge(defaults, overrides) {
  const result = { ...defaults };
  for (const key of Object.keys(overrides)) {
    if (
      typeof defaults[key] === 'object' && defaults[key] !== null &&
      !Array.isArray(defaults[key]) &&
      typeof overrides[key] === 'object' && overrides[key] !== null &&
      !Array.isArray(overrides[key])
    ) {
      result[key] = deepMerge(defaults[key], overrides[key]);
    } else {
      result[key] = overrides[key];
    }
  }
  return result;
}

function main() {
  let config;
  if (fs.existsSync(WIDGETS_YAML)) {
    const raw = fs.readFileSync(WIDGETS_YAML, 'utf-8');
    const parsed = YAML.parse(raw) || {};
    config = deepMerge(DEFAULTS, parsed);
  } else {
    console.warn(`[compile-widgets-config] WARN: ${WIDGETS_YAML} not found, using defaults.`);
    config = DEFAULTS;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, 'widgets-config.json');
  fs.writeFileSync(outPath, JSON.stringify(config, null, 2));
  console.log(`[compile-widgets-config] Wrote ${outPath}`);
}

main();
