import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const SITE_CONFIG_PATH = path.join(ROOT, 'public', 'generated', 'site-config.json');
let siteConfig = { site_name: 'EDU Publish', site_description: '高校通知聚合站', site_url: 'https://example.edu.cn' };
if (fsSync.existsSync(SITE_CONFIG_PATH)) {
  siteConfig = JSON.parse(fsSync.readFileSync(SITE_CONFIG_PATH, 'utf-8'));
}
const PUBLIC_DIR = path.join(ROOT, 'public');
const GENERATED_CONTENT_PATH = path.join(PUBLIC_DIR, 'generated', 'content-data.json');
const RSS_DIR = path.join(PUBLIC_DIR, 'rss');
const RSS_MAIN_PATH = path.join(PUBLIC_DIR, 'rss.xml');
const RSS_LIMIT = 120;

const normalizeSiteUrl = (raw) => {
  const value = String(raw || '').trim();
  if (!value) return siteConfig.site_url;
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, '');
};

const SITE_URL = normalizeSiteUrl(
  process.env.SITE_URL
  || process.env.RSS_SITE_URL
  || process.env.VERCEL_PROJECT_PRODUCTION_URL
  || process.env.VERCEL_URL
);

const escapeXml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const toRfc822 = (isoLike) => {
  const date = new Date(isoLike);
  if (Number.isNaN(date.getTime())) {
    console.warn(`[generate-rss] Invalid date "${isoLike}", falling back to current time`);
    return new Date().toUTCString();
  }
  return date.toUTCString();
};

const sortedNotices = (notices) => {
  return [...notices].sort((a, b) => {
    const aTs = new Date(a.pubDate).getTime();
    const bTs = new Date(b.pubDate).getTime();
    const diff = (Number.isFinite(bTs) ? bTs : 0) - (Number.isFinite(aTs) ? aTs : 0);
    if (diff !== 0) return diff;
    return String(b.guid || '').localeCompare(String(a.guid || ''), 'zh-CN');
  });
};

const enclosureMimeByExt = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

const enclosureMimeFor = (url) => {
  const ext = String(url || '').split('.').pop().toLowerCase();
  return enclosureMimeByExt[ext] || 'application/octet-stream';
};

const toItemXml = (notice) => {
  const schoolSlug = String(notice.schoolSlug || '').trim();
  const id = String(notice.guid || '').trim();
  const title = String(notice.title || '').trim();
  const description = String(notice.description || '').trim();
  const itemUrl = `${SITE_URL}/school/${encodeURIComponent(schoolSlug)}#${encodeURIComponent(id)}`;
  const pubDate = toRfc822(notice.pubDate);
  const tags = Array.isArray(notice.tags) ? notice.tags : [];
  const schoolName = String(notice.feedTitle || schoolSlug || '未分类');

  const categories = [schoolName, ...tags]
    .map((tag) => `<category>${escapeXml(tag)}</category>`)
    .join('');

  const attachments = Array.isArray(notice.attachments) ? notice.attachments : [];
  const firstAttachment = attachments.length > 0 ? attachments[0] : null;
  const enclosure = firstAttachment && firstAttachment.url
    ? `<enclosure url="${escapeXml(`${SITE_URL}${firstAttachment.url}`)}" type="${enclosureMimeFor(firstAttachment.url)}" length="0" />`
    : '';

  return [
    '<item>',
    `<title>${escapeXml(title)}</title>`,
    `<link>${escapeXml(itemUrl)}</link>`,
    `<guid isPermaLink="false">${escapeXml(id)}</guid>`,
    `<pubDate>${escapeXml(pubDate)}</pubDate>`,
    `<description>${escapeXml(description)}</description>`,
    categories,
    enclosure,
    '</item>',
  ].join('');
};

const toFeedXml = ({ title, description, linkPath, selfPath, notices }) => {
  const feedUrl = `${SITE_URL}${selfPath}`;
  const channelUrl = `${SITE_URL}${linkPath}`;
  const items = sortedNotices(notices)
    .slice(0, RSS_LIMIT)
    .map(toItemXml)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(channelUrl)}</link>
    <description>${escapeXml(description)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${escapeXml(new Date().toUTCString())}</lastBuildDate>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>
`;
};

const main = async () => {
  const raw = await fs.readFile(GENERATED_CONTENT_PATH, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse ${GENERATED_CONTENT_PATH}: ${err.message}`);
  }

  const notices = Array.isArray(data.notices) ? data.notices : [];
  const schools = Array.isArray(data.schools) ? data.schools : [];

  await fs.mkdir(RSS_DIR, { recursive: true });

  const mainFeedXml = toFeedXml({
    title: `${siteConfig.site_name} 全站通知`,
    description: `${siteConfig.site_description} RSS 订阅（全站）`,
    linkPath: '/',
    selfPath: '/rss.xml',
    notices,
  });
  await fs.writeFile(RSS_MAIN_PATH, mainFeedXml, 'utf8');

  for (const school of schools) {
    const slug = String(school.slug || '').trim();
    if (!slug) continue;
    const schoolName = String(school.name || slug).trim();
    const schoolNotices = notices.filter((item) => String(item.schoolSlug || '').trim() === slug);
    const schoolFeedXml = toFeedXml({
      title: `${schoolName} - ${siteConfig.site_name}`,
      description: `${schoolName} 通知聚合 RSS 订阅`,
      linkPath: `/school/${encodeURIComponent(slug)}`,
      selfPath: `/rss/${encodeURIComponent(slug)}.xml`,
      notices: schoolNotices,
    });

    await fs.writeFile(path.join(RSS_DIR, `${slug}.xml`), schoolFeedXml, 'utf8');
  }

  console.log(`Generated RSS feeds: 1 main + ${schools.length} schools.`);
  console.log(`Main feed: ${path.relative(ROOT, RSS_MAIN_PATH)}`);
};

main().catch((error) => {
  console.error('[generate-rss] failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
