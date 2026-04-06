import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const AI_DIR = path.join(ROOT, 'content', 'card', 'ai');
const EXPORT_FILES = [
  path.join(ROOT, 'init-sept', 'word.md'),
  path.join(ROOT, 'init-oct', 'Markdown File.md'),
  path.join(ROOT, 'init-nov', 'Markdown File.md'),
  path.join(ROOT, 'init-dec', 'Markdown File.md'),
  path.join(ROOT, 'init-jan', 'Markdown File.md'),
];

const fileUrlToWindowsPath = (value) => {
  let text = String(value || '').trim();
  text = decodeURIComponent(text);

  if (text.startsWith('file:///')) {
    text = text.slice('file:///'.length);
  } else if (text.startsWith('file://')) {
    text = text.slice('file://'.length);
  }

  text = text.replace(/\\/g, '/');

  if (/^[A-Za-z]:\//.test(text)) {
    return text.replace(/\//g, '\\');
  }

  return text;
};

const sourceByBasename = new Map();

for (const exportPath of EXPORT_FILES) {
  let raw = '';
  try {
    raw = await fs.readFile(exportPath, 'utf8');
  } catch {
    continue;
  }

  const matches = raw.matchAll(/!\[[^\]]*]\((file:\/\/[^)]+)\)/g);
  for (const match of matches) {
    const sourcePath = fileUrlToWindowsPath(match[1]);
    const basename = path.basename(sourcePath).toLowerCase();
    if (!basename) continue;

    try {
      await fs.access(sourcePath);
      if (!sourceByBasename.has(basename)) {
        sourceByBasename.set(basename, sourcePath);
      }
    } catch {
      // ignore non-existing local image sources
    }
  }
}

const aiFiles = (await fs.readdir(AI_DIR)).filter((file) => file.endsWith('.md'));

let missing = 0;
let copied = 0;
let unresolved = 0;
const unresolvedList = [];

for (const file of aiFiles) {
  const filePath = path.join(AI_DIR, file);
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = matter(raw);
  const cover = String(parsed.data.cover || '').trim();

  if (!cover.startsWith('/img/')) continue;

  const publicCoverPath = path.join(ROOT, 'public', cover.slice(1));
  try {
    await fs.access(publicCoverPath);
    continue;
  } catch {
    // missing in public, try to recover from local QQ export
  }

  missing += 1;
  const basename = path.basename(cover).toLowerCase();
  const sourcePath = sourceByBasename.get(basename);

  if (!sourcePath) {
    unresolved += 1;
    unresolvedList.push({ file, cover, reason: 'source_not_found' });
    continue;
  }

  const targetPath = path.join(ROOT, 'content', cover.slice(1));
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  try {
    await fs.access(targetPath);
  } catch {
    await fs.copyFile(sourcePath, targetPath);
    copied += 1;
  }
}

console.log(JSON.stringify({ missing, copied, unresolved, unresolvedList }, null, 2));
