import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import YAML from 'yaml';
import { normalizePublicBaseUrl, siteUrlToR2PublicUrl } from './lib/r2-paths.mjs';

// Disable indented code blocks — the card markdown files use leading spaces
// for Chinese-style paragraph indentation, not code.  Fenced code blocks
// (``` … ```) are unaffected because they go through the 'fences' tokenizer.
marked.use({
  tokenizer: {
    code() { return undefined; },
  },
});

const ROOT = process.cwd();

const SITE_CONFIG_PATH = path.join(ROOT, 'public', 'generated', 'site-config.json');
let siteConfig = { favicon: '/img/logo-light.svg', default_cover: '/img/default-cover.svg' };
if (fsSync.existsSync(SITE_CONFIG_PATH)) {
  siteConfig = JSON.parse(fsSync.readFileSync(SITE_CONFIG_PATH, 'utf-8'));
}

const UNKNOWN_SOURCE = '未知来源';
const UNKNOWN_SCHOOL = 'unknown';
const CONTENT_DIR = path.join(ROOT, 'content');
const CARD_DIR = path.join(CONTENT_DIR, 'card');
const CARD_COVERS_DIR = path.join(CARD_DIR, 'covers');
const CONCLUSION_DIR = path.join(CONTENT_DIR, 'conclusion');
const CONTENT_IMG_DIR = path.join(CONTENT_DIR, 'img');
const CONTENT_ATTACHMENTS_DIR = path.join(CONTENT_DIR, 'attachments');
const PUBLIC_GENERATED_DIR = path.join(ROOT, 'public', 'generated');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PUBLIC_IMG_DIR = path.join(PUBLIC_DIR, 'img');
const PUBLIC_COVERS_DIR = path.join(PUBLIC_DIR, 'covers');
const PUBLIC_ATTACHMENTS_DIR = path.join(PUBLIC_DIR, 'attachments');
const CONFIG_PATH = path.join(ROOT, 'config', 'subscriptions.yaml');

const R2_PUBLIC_BASE_URL = normalizePublicBaseUrl(process.env.R2_PUBLIC_BASE_URL);
const ATTACHMENT_R2_THRESHOLD_MB = Number.parseFloat(process.env.ATTACHMENT_R2_THRESHOLD_MB || '20');
const ATTACHMENT_R2_THRESHOLD_BYTES = Number.isFinite(ATTACHMENT_R2_THRESHOLD_MB) && ATTACHMENT_R2_THRESHOLD_MB > 0
  ? Math.floor(ATTACHMENT_R2_THRESHOLD_MB * 1024 * 1024)
  : 20 * 1024 * 1024;
const attachmentUrlResolveCache = new Map();
const missingAttachmentWarned = new Set();

const fail = (message, filePath) => {
  const suffix = filePath ? `\nFile: ${path.relative(ROOT, filePath)}` : '';
  throw new Error(`${message}${suffix}`);
};

const walkMarkdownFiles = async (dir) => {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const nested = await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walkMarkdownFiles(fullPath);
      if (entry.isFile() && fullPath.endsWith('.md')) return [fullPath];
      return [];
    }));
    return nested.flat();
  } catch (err) {
    console.error(`[walkMarkdownFiles] Failed to read directory ${dir}: ${err.message}`);
    throw err;
  }
};

const toIso = (value, filePath) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) fail(`Invalid date: ${String(value)}`, filePath);
  return date.toISOString();
};

const toBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === '') return false;
  }
  return fallback;
};

const safeDecodeUriComponent = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const normalizeAttachmentUrl = (value, filePath) => {
  const clean = String(value || '').trim().replace(/\\/g, '/');
  if (!clean) return '';
  if (clean === '#') return clean;
  const decoded = safeDecodeUriComponent(clean);
  if (clean.includes('..') || decoded.includes('..')) fail(`Suspicious path: ${clean}`, filePath);
  if (/^https?:\/\//i.test(clean)) return clean;

  const normalizedUrl = clean.startsWith('/attachments/') ? clean
    : clean.startsWith('./attachments/') ? `/attachments/${clean.slice('./attachments/'.length)}`
    : clean.startsWith('attachments/') ? `/attachments/${clean.slice('attachments/'.length)}`
    : clean.startsWith('/') ? clean
    : `/attachments/${clean.replace(/^\.?\/+/, '')}`;

  // Path traversal validation: resolve the final path and ensure it stays within CONTENT_DIR
  const resolved = path.resolve(CONTENT_DIR, normalizedUrl.replace(/^\//, ''));
  if (!resolved.startsWith(CONTENT_DIR)) {
    fail(`Path traversal detected: ${clean} resolves outside content directory`, filePath);
  }

  return normalizedUrl;
};

const toAttachmentRelativePath = (url) => {
  const clean = String(url || '').split('#')[0].split('?')[0].trim();
  if (!clean.startsWith('/attachments/')) return '';
  const rawRelative = clean.slice('/attachments/'.length);
  const segments = rawRelative
    .split('/')
    .filter(Boolean)
    .map((segment) => safeDecodeUriComponent(segment));
  return segments.join('/');
};

const toAttachmentAbsolutePath = (url) => {
  const rel = toAttachmentRelativePath(url);
  if (!rel) return '';
  return path.join(CONTENT_ATTACHMENTS_DIR, ...rel.split('/'));
};

const toR2PublicUrl = (url) => {
  const cleanUrl = String(url || '').split('#')[0].split('?')[0].trim();
  if (!toAttachmentRelativePath(cleanUrl) || !R2_PUBLIC_BASE_URL) return url;
  return siteUrlToR2PublicUrl(cleanUrl, R2_PUBLIC_BASE_URL);
};

const resolveAttachmentUrlForOutput = async (url, filePath) => {
  const normalizedUrl = normalizeAttachmentUrl(url, filePath);
  const cacheKey = `${filePath}::${normalizedUrl}`;
  if (attachmentUrlResolveCache.has(cacheKey)) {
    return attachmentUrlResolveCache.get(cacheKey);
  }

  if (!R2_PUBLIC_BASE_URL || !normalizedUrl.startsWith('/attachments/')) {
    attachmentUrlResolveCache.set(cacheKey, normalizedUrl);
    return normalizedUrl;
  }

  const absPath = toAttachmentAbsolutePath(normalizedUrl);
  if (!absPath) {
    attachmentUrlResolveCache.set(cacheKey, normalizedUrl);
    return normalizedUrl;
  }

  try {
    const stat = await fs.stat(absPath);
    if (stat.size > ATTACHMENT_R2_THRESHOLD_BYTES) {
      const externalUrl = toR2PublicUrl(normalizedUrl);
      attachmentUrlResolveCache.set(cacheKey, externalUrl);
      return externalUrl;
    }
  } catch {
    const warnKey = path.relative(ROOT, absPath);
    if (!missingAttachmentWarned.has(warnKey)) {
      missingAttachmentWarned.add(warnKey);
      console.warn(`[attachments] Missing local attachment: ${warnKey}`);
    }
  }

  attachmentUrlResolveCache.set(cacheKey, normalizedUrl);
  return normalizedUrl;
};

const rewriteAttachmentsForOutput = async (attachments, filePath) => {
  const rewritten = await Promise.all((attachments || []).map(async (item) => ({
    ...item,
    url: await resolveAttachmentUrlForOutput(item.url, filePath),
  })));
  return rewritten;
};

const normalizeAttachments = (attachments, filePath) => {
  if (!attachments) return [];
  if (!Array.isArray(attachments)) fail('attachments must be an array', filePath);

  return attachments.map((item, index) => {
    if (typeof item === 'string') {
      const clean = item.trim();
      if (!clean) fail(`Attachment at index ${index} is empty`, filePath);
      const normalizedUrl = normalizeAttachmentUrl(clean, filePath);
      return {
        name: path.basename(normalizedUrl),
        url: normalizedUrl,
        type: path.extname(normalizedUrl).replace('.', '').toLowerCase() || 'file',
      };
    }

    if (!item || typeof item !== 'object') fail(`Attachment at index ${index} must be string or object`, filePath);
    const name = String(item.name || '').trim();
    const url = String(item.url || '').trim();
    if (!name || !url) fail(`Attachment at index ${index} missing name or url`, filePath);
    const normalizedUrl = normalizeAttachmentUrl(url, filePath);

    return {
      name,
      url: normalizedUrl,
      type: String(item.type || path.extname(normalizedUrl).replace('.', '').toLowerCase() || 'file'),
    };
  });
};

const inferAttachmentTypeFromUrl = (url) => {
  const cleanUrl = String(url || '').split('#')[0].split('?')[0];
  const ext = path.extname(cleanUrl).replace('.', '').toLowerCase();
  if (!ext) return 'link';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'xlsx';
  if (['doc', 'docx'].includes(ext)) return 'docx';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['ppt', 'pptx'].includes(ext)) return 'pptx';
  return ext;
};

const extractInlineAttachments = (markdown) => {
  const result = [];
  const text = String(markdown || '');

  const imgRe = /!\[([^\]]{0,500})\]\(([^)\s]{0,2000})\)/g;
  let match;
  while ((match = imgRe.exec(text))) {
    const alt = String(match[1] || '').trim();
    const url = String(match[2] || '').trim();
    if (!url) continue;
    result.push({
      name: alt || path.basename(url) || 'image',
      url,
      type: 'image',
    });
  }

  const linkRe = /(?<!!)\[([^\]]{1,500})\]\(([^)\s]{1,2000})\)/g;
  while ((match = linkRe.exec(text))) {
    const name = String(match[1] || '').trim();
    const url = String(match[2] || '').trim();
    if (!url) continue;
    result.push({
      name: name || path.basename(url) || url,
      url,
      type: inferAttachmentTypeFromUrl(url),
    });
  }

  const lineAttachments = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('[分享]') || line.startsWith('[QQ小程序]'))
    .map((line) => ({
      name: line,
      url: '#',
      type: 'link',
    }));

  result.push(...lineAttachments);

  const unique = [];
  const seen = new Set();
  for (const item of result) {
    const key = `${item.name}::${item.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
};

const mergeAttachments = (base, extra) => {
  const merged = [];
  const seen = new Set();
  [...base, ...extra].forEach((item) => {
    const key = `${item.name}::${item.url}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  });
  return merged;
};

const markdownToPlainText = (markdown) => markdown
  .replace(/```[\s\S]*?```/g, ' ')
  .replace(/`[^`]*`/g, ' ')
  .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
  .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
  .replace(/^#+\s+/gm, '')
  .replace(/[>*_~\-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const ensureString = (value, fieldName, filePath) => {
  const text = String(value || '').trim();
  if (!text) fail(`Missing ${fieldName}`, filePath);
  return text;
};

const slugifyChannel = (value) => value
  .toLowerCase()
  .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
  .replace(/^-+|-+$/g, '');

const parseConfig = async () => {
  const raw = await fs.readFile(CONFIG_PATH, 'utf8');
  const data = YAML.parse(raw);
  if (!data || typeof data !== 'object') fail('config/subscriptions.yaml is invalid');
  if (!Array.isArray(data.schools) || data.schools.length === 0) fail('config/schools must be a non-empty array', CONFIG_PATH);

  const schools = data.schools.map((item, index) => {
    if (!item || typeof item !== 'object') fail(`school at index ${index} is invalid`, CONFIG_PATH);
    const subscriptions = Array.isArray(item.subscriptions) ? item.subscriptions : null;
    if (!subscriptions || subscriptions.length === 0) {
      fail(`schools[${index}].subscriptions must be a non-empty array`, CONFIG_PATH);
    }

    return {
      slug: ensureString(item.slug, `schools[${index}].slug`, CONFIG_PATH),
      name: ensureString(item.name, `schools[${index}].name`, CONFIG_PATH),
      shortName: String(item.short_name || '').trim(),
      icon: String(item.icon || '').trim() || siteConfig.favicon,
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : index,
      subscriptions,
    };
  });

  const schoolSlugSet = new Set();
  for (const school of schools) {
    if (schoolSlugSet.has(school.slug)) fail(`Duplicate school slug in config: ${school.slug}`, CONFIG_PATH);
    schoolSlugSet.add(school.slug);
  }

  const subscriptions = [];
  for (const school of schools) {
    for (let index = 0; index < school.subscriptions.length; index += 1) {
      const item = school.subscriptions[index];
      if (!item || typeof item !== 'object') {
        fail(`schools[${school.slug}].subscriptions[${index}] is invalid`, CONFIG_PATH);
      }

      const title = ensureString(item.title, `schools[${school.slug}].subscriptions[${index}].title`, CONFIG_PATH);
      const number = item.number == null ? '' : String(item.number).trim();
      const url = String(item.url || '').trim();
      const key = url || title;
      const suffix = slugifyChannel(key);
      const rawIcon = String(item.icon || '').trim();
      const isWaitingSource = title.includes('待接入');
      if (!suffix) {
        fail(`schools[${school.slug}].subscriptions[${index}] has empty slug key`, CONFIG_PATH);
      }

      subscriptions.push({
        id: `${school.slug}-${suffix}`,
        schoolSlug: school.slug,
        schoolName: school.name,
        schoolIcon: school.icon,
        title,
        number,
        url,
        icon: rawIcon || (isWaitingSource ? '/img/subicon/waiting-dots.svg' : '/img/subicon/group-default.svg'),
        enabled: item.enabled !== false,
        order: Number.isFinite(Number(item.order)) ? Number(item.order) : index,
      });
    }

    const unknownSourceSuffix = slugifyChannel(UNKNOWN_SOURCE);
    const unknownSourceId = `${school.slug}-${unknownSourceSuffix}`;
    const hasUnknownSource = subscriptions.some((item) => item.id === unknownSourceId);
    if (!hasUnknownSource) {
      subscriptions.push({
        id: unknownSourceId,
        schoolSlug: school.slug,
        schoolName: school.name,
        schoolIcon: school.icon,
        title: UNKNOWN_SOURCE,
        number: '',
        url: '',
        icon: '/img/subicon/group-default.svg',
        enabled: true,
        order: 99990,
      });
    }
  }

  const subscriptionIdSet = new Set();
  for (const sub of subscriptions) {
    if (subscriptionIdSet.has(sub.id)) fail(`Duplicate subscription id in config: ${sub.id}`, CONFIG_PATH);
    subscriptionIdSet.add(sub.id);
  }

  schools.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
  const schoolOrderMap = new Map(schools.map((item, idx) => [item.slug, idx]));
  subscriptions.sort((a, b) => {
    const schoolDiff = (schoolOrderMap.get(a.schoolSlug) ?? 9999) - (schoolOrderMap.get(b.schoolSlug) ?? 9999);
    if (schoolDiff !== 0) return schoolDiff;
    if (a.order !== b.order) return a.order - b.order;
    return a.id.localeCompare(b.id, 'zh-CN');
  });

  return {
    schools: schools.map(({ subscriptions: _subs, ...rest }) => rest),
    subscriptions,
    schoolMap: new Map(schools.map(({ subscriptions: _subs, ...rest }) => [rest.slug, rest])),
    subscriptionMap: new Map(subscriptions.map((item) => [item.id, item])),
  };
};

const loadCards = async ({ schoolMap, subscriptionMap }) => {
  const files = await walkMarkdownFiles(CARD_DIR);
  const notices = [];
  const seen = new Set();

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = matter(raw);
    const id = String(parsed.data.id || path.basename(filePath, '.md')).trim();
    if (!id) fail('Missing card id', filePath);
    if (seen.has(id)) fail(`Duplicate card id: ${id}`, filePath);
    seen.add(id);

    // Warn if description field does not use >- folded block scalar syntax
    if (parsed.data.description && !/description:\s*>-/m.test(raw)) {
      console.warn(`[description] Missing >- syntax for description field: ${path.relative(ROOT, filePath)}`);
    }

    const rawSchoolSlug = String(parsed.data.school_slug || '').trim();
    const schoolSlug = rawSchoolSlug && schoolMap.has(rawSchoolSlug) ? rawSchoolSlug : UNKNOWN_SCHOOL;
    const school = schoolMap.get(schoolSlug);

    const fallbackChannel = UNKNOWN_SOURCE;
    const sourceChannel = String(parsed.data.source?.channel || '').trim();
    const resolvedChannel = sourceChannel || fallbackChannel;
    const legacySubscriptionId = String(parsed.data.subscription_id || '').trim();

    let subscriptionId = `${schoolSlug}-${slugifyChannel(resolvedChannel)}`;
    let subscription = subscriptionId ? subscriptionMap.get(subscriptionId) : null;

    if (!subscription && legacySubscriptionId) {
      const fallback = subscriptionMap.get(legacySubscriptionId);
      if (fallback && fallback.schoolSlug === schoolSlug) {
        subscription = fallback;
        subscriptionId = legacySubscriptionId;
      }
    }

    if (!subscription) {
      const schoolUnknownSourceId = `${schoolSlug}-${slugifyChannel(fallbackChannel)}`;
      subscription = subscriptionMap.get(schoolUnknownSourceId) || null;
      subscriptionId = schoolUnknownSourceId;
    }

    if (!subscription) {
      fail(`Invalid source.channel(${resolvedChannel}), cannot map to subscription in school_slug(${schoolSlug})`, filePath);
    }
    if (!subscription.enabled) fail(`source.channel maps to disabled subscription_id: ${subscriptionId}`, filePath);

    const parsedStart = parsed.data.start_at ? toIso(parsed.data.start_at, filePath) : '';
    const parsedEnd = parsed.data.end_at ? toIso(parsed.data.end_at, filePath) : '';
    const publishedIso = toIso(parsed.data.published || new Date().toISOString(), filePath);

    const markdown = parsed.content?.trim() || '';
    const html = marked.parse(markdown);

    const frontmatterAttachments = normalizeAttachments(parsed.data.attachments, filePath);
    const inlineAttachments = extractInlineAttachments(markdown);
    const mergedAttachments = mergeAttachments(frontmatterAttachments, inlineAttachments);
    const outputAttachments = await rewriteAttachmentsForOutput(mergedAttachments, filePath);

    const schoolName = String(school?.name || schoolSlug);
    const schoolShortName = String(school?.shortName || schoolName);
    const cover = String(parsed.data.cover || '');
    const sender = String(parsed.data.source?.sender || '').trim();
    const fallbackCover = String(school?.icon || siteConfig.default_cover);

    notices.push({
      guid: id,
      schoolSlug,
      schoolShortName,
      subscriptionId,
      title: String(parsed.data.title || '').trim(),
      description: String(parsed.data.description || markdownToPlainText(markdown).slice(0, 180) || '').trim(),
      aiCategory: String(parsed.data.category || '未分类'),
      tags: Array.isArray(parsed.data.tags) ? parsed.data.tags.map(String) : [],
      pinned: toBoolean(parsed.data.pinned ?? parsed.data.pined, false),
      thumbnail: cover || fallbackCover,
      isPlaceholderCover: !cover,
      badge: String(parsed.data.badge || ''),
      link: String(parsed.data.extra_url || ''),
      startAt: parsedStart || (parsedEnd ? publishedIso : ''),
      endAt: parsedEnd,
      source: {
        channel: sourceChannel || fallbackChannel,
        sender,
      },
      attachments: outputAttachments,
      pubDate: publishedIso,
      author: sender || schoolName,
      feedTitle: schoolName,
      content: html,
      enclosure: { link: '', type: '' },
      _contentMarkdown: markdown,
    });
  }

  return notices;
};

const loadConclusions = async ({ schools, schoolMap }) => {
  const files = await walkMarkdownFiles(CONCLUSION_DIR);
  const bySchool = {};

  for (const school of schools) {
    bySchool[school.slug] = {
      defaultMarkdown: '',
      defaultHtml: '<p>暂无总结。</p>\n',
      byDate: {},
    };
  }

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = matter(raw);
    const schoolSlug = String(parsed.data.school_slug || path.basename(filePath, '.md')).trim();
    if (!schoolMap.has(schoolSlug)) fail(`Conclusion has invalid school_slug: ${schoolSlug}`, filePath);

    const markdown = (parsed.content || '').trim();
    const daily = parsed.data.daily;
    const byDate = {};

    if (daily) {
      if (typeof daily !== 'object' || Array.isArray(daily)) fail('conclusion daily must be an object map', filePath);
      for (const [dateKey, dailyMarkdown] of Object.entries(daily)) {
        if (typeof dailyMarkdown !== 'string') fail(`conclusion daily value must be string for ${dateKey}`, filePath);
        byDate[dateKey] = {
          markdown: dailyMarkdown.trim(),
          html: marked.parse(dailyMarkdown.trim()),
        };
      }
    }

    bySchool[schoolSlug] = {
      defaultMarkdown: markdown,
      defaultHtml: marked.parse(markdown || '暂无总结。'),
      byDate,
    };
  }

  return bySchool;
};

const compile = ({ notices, conclusions, schools, subscriptions, schoolMap }) => {
  const schoolOrderMap = new Map(schools.map((item, index) => [item.slug, index]));
  const subscriptionOrderMap = new Map(subscriptions.map((item, index) => [item.id, index]));

  const searchIndex = notices.map((notice) => ({
    id: notice.guid,
    schoolSlug: notice.schoolSlug,
    subscriptionId: notice.subscriptionId,
    title: notice.title,
    description: notice.description,
    category: notice.aiCategory,
    tags: notice.tags,
    published: notice.pubDate,
    contentPlainText: markdownToPlainText(`${notice.title}\n${notice._contentMarkdown}`),
    attachmentText: (notice.attachments || [])
      .map((item) => `${String(item.name || '')} ${String(item.type || '')}`.trim())
      .filter(Boolean)
      .join(' '),
  }));

  notices.sort((a, b) => {
    const schoolDiff = (schoolOrderMap.get(a.schoolSlug) ?? 9999) - (schoolOrderMap.get(b.schoolSlug) ?? 9999);
    if (schoolDiff !== 0) return schoolDiff;
    const subscriptionDiff = (subscriptionOrderMap.get(a.subscriptionId) ?? 9999) - (subscriptionOrderMap.get(b.subscriptionId) ?? 9999);
    if (subscriptionDiff !== 0) return subscriptionDiff;
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const diff = new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    if (diff !== 0) return diff;
    return a.guid.localeCompare(b.guid);
  });

  // Strip internal-only field before output
  const outputNotices = notices.map(({ _contentMarkdown, ...rest }) => rest);

  return {
    generatedAt: new Date().toISOString(),
    totalNotices: outputNotices.length,
    schools: schools.map((item) => ({ slug: item.slug, name: item.name, shortName: item.shortName, icon: item.icon || '' })),
    subscriptions: subscriptions.map((item) => ({
      id: item.id,
      schoolSlug: item.schoolSlug,
      schoolName: schoolMap.get(item.schoolSlug)?.name || item.schoolName || item.schoolSlug,
      title: item.title,
      number: item.number,
      url: item.url,
      icon: item.icon,
      enabled: item.enabled,
      order: item.order,
    })),
    notices: outputNotices,
    conclusionBySchool: conclusions,
    searchIndex,
  };
};

const loadPreviousNoticeCount = async () => {
  const contentDataPath = path.join(PUBLIC_GENERATED_DIR, 'content-data.json');
  try {
    const raw = await fs.readFile(contentDataPath, 'utf8');
    const data = JSON.parse(raw);
    const previous = Number(data?.totalNotices ?? data?.notices?.length ?? 0);
    return Number.isFinite(previous) ? previous : 0;
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      console.warn(`[build:content] Failed to load previous notice count from public/generated/content-data.json: ${error.message}`);
    }
    return 0;
  }
};

const writeOutputs = async (compiled) => {
  await fs.mkdir(PUBLIC_GENERATED_DIR, { recursive: true });
  const previousNoticeCount = await loadPreviousNoticeCount();
  const updatedCount = Math.max(0, compiled.totalNotices - previousNoticeCount);

  const contentData = {
    generatedAt: compiled.generatedAt,
    updatedCount,
    previousNoticeCount,
    totalNotices: compiled.totalNotices,
    schools: compiled.schools,
    subscriptions: compiled.subscriptions,
    notices: compiled.notices,
    conclusionBySchool: compiled.conclusionBySchool,
  };

  const contentDataFinal = path.join(PUBLIC_GENERATED_DIR, 'content-data.json');
  const searchIndexFinal = path.join(PUBLIC_GENERATED_DIR, 'search-index.json');
  const contentDataTmp = path.join(PUBLIC_GENERATED_DIR, '.content-data.json.tmp');
  const searchIndexTmp = path.join(PUBLIC_GENERATED_DIR, '.search-index.json.tmp');

  try {
    // Write to temporary files first
    await fs.writeFile(contentDataTmp, `${JSON.stringify(contentData, null, 2)}\n`, 'utf8');
    await fs.writeFile(searchIndexTmp, `${JSON.stringify(compiled.searchIndex, null, 2)}\n`, 'utf8');

    // Atomic swap: rename temps to final names
    await fs.rename(contentDataTmp, contentDataFinal);
    await fs.rename(searchIndexTmp, searchIndexFinal);
  } catch (err) {
    // Clean up temp files on failure
    await fs.unlink(contentDataTmp).catch(() => {});
    await fs.unlink(searchIndexTmp).catch(() => {});
    throw err;
  }
};

const syncStaticAssets = async () => {
  await Promise.all([
    fs.mkdir(PUBLIC_COVERS_DIR, { recursive: true }),
    fs.mkdir(PUBLIC_IMG_DIR, { recursive: true }),
    fs.mkdir(PUBLIC_ATTACHMENTS_DIR, { recursive: true }),
  ]);

  const criticalTasks = [
    { label: `copy ${path.relative(ROOT, CARD_COVERS_DIR)}`, promise: fs.cp(CARD_COVERS_DIR, PUBLIC_COVERS_DIR, { recursive: true, force: true }) },
    { label: `copy ${path.relative(ROOT, CONTENT_IMG_DIR)}`, promise: fs.cp(CONTENT_IMG_DIR, PUBLIC_IMG_DIR, { recursive: true, force: true }) },
  ];

  if (R2_PUBLIC_BASE_URL) {
    await fs.rm(PUBLIC_ATTACHMENTS_DIR, { recursive: true, force: true });
    await fs.mkdir(PUBLIC_ATTACHMENTS_DIR, { recursive: true });
    criticalTasks.push({
      label: 'copy filtered attachments',
      promise: fs.cp(CONTENT_ATTACHMENTS_DIR, PUBLIC_ATTACHMENTS_DIR, {
        recursive: true,
        force: true,
        filter: async (src) => {
          try {
            const stat = await fs.stat(src);
            if (stat.isDirectory()) return true;
            if (!stat.isFile()) return false;
            return stat.size <= ATTACHMENT_R2_THRESHOLD_BYTES;
          } catch {
            return false;
          }
        },
      }),
    });
  } else {
    criticalTasks.push({
      label: `copy ${path.relative(ROOT, CONTENT_ATTACHMENTS_DIR)}`,
      promise: fs.cp(CONTENT_ATTACHMENTS_DIR, PUBLIC_ATTACHMENTS_DIR, { recursive: true, force: true }),
    });
  }

  const results = await Promise.allSettled(criticalTasks.map((t) => t.promise));
  const failures = [];
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].status === 'rejected') {
      const label = criticalTasks[i].label;
      console.error(`[sync] Failed to ${label}: ${results[i].reason?.message || results[i].reason}`);
      failures.push(label);
    }
  }
  if (failures.length > 0) {
    console.error(`[sync] ${failures.length} critical asset sync(s) failed: ${failures.join(', ')}`);
    process.exit(1);
  }

  const iconSource = path.join(CONTENT_IMG_DIR, 'icon.ico');
  const iconTarget = path.join(PUBLIC_DIR, 'icon.ico');
  await fs.copyFile(iconSource, iconTarget).catch((err) => {
    console.warn(`[sync] Failed to copy icon.ico: ${err.message}`);
  });
};

const main = async () => {
  const validateOnly = process.argv.includes('--validate-only');
  const config = await parseConfig();
  const notices = await loadCards(config);
  const conclusions = await loadConclusions(config);
  const compiled = compile({
    notices,
    conclusions,
    schools: config.schools,
    subscriptions: config.subscriptions,
    schoolMap: config.schoolMap,
  });

  if (validateOnly) {
    console.log(`Validated ${compiled.notices.length} card notices.`);
    return;
  }

  await writeOutputs(compiled);
  await syncStaticAssets();
  console.log(`Compiled ${compiled.notices.length} card notices.`);
};

main().catch((error) => {
  console.error('[build:content] failed');
  console.error(error.message);
  process.exit(1);
});
