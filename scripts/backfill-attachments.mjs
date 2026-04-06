import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const CARD_DIR = path.join(ROOT, 'content', 'card');

const walkMarkdownFiles = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkMarkdownFiles(fullPath);
    if (entry.isFile() && fullPath.endsWith('.md')) return [fullPath];
    return [];
  }));
  return nested.flat();
};

const normalizeAttachments = (attachments) => {
  if (!attachments) return [];
  if (!Array.isArray(attachments)) return [];
  return attachments
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const name = String(item.name || '').trim();
      const url = String(item.url || '').trim();
      if (!name || !url) return null;
      const type = String(item.type || '').trim() || 'file';
      return { name, url, type };
    })
    .filter(Boolean);
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

  const imgRe = /!\[([^\]]*)\]\(([^)]+)\)/g;
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

  const linkRe = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g;
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
    .map((line) => ({ name: line, url: '#', type: 'link' }));

  result.push(...lineAttachments);

  const dedup = [];
  const seen = new Set();
  for (const item of result) {
    const key = `${item.name}::${item.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(item);
  }
  return dedup;
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

const run = async () => {
  const files = await walkMarkdownFiles(CARD_DIR);
  let updated = 0;

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = matter(raw);
    const base = normalizeAttachments(parsed.data.attachments);
    const extra = extractInlineAttachments(parsed.content || '');
    const merged = mergeAttachments(base, extra);

    const before = JSON.stringify(base);
    const after = JSON.stringify(merged);
    if (before === after) continue;

    parsed.data.attachments = merged;
    const next = matter.stringify((parsed.content || '').trim() + '\n', parsed.data, { lineWidth: 10000 });
    await fs.writeFile(filePath, next, 'utf8');
    updated += 1;
  }

  console.log(`Backfilled attachments for ${updated} card files.`);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
