import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, 'config', 'subscriptions.yaml');
const CARD_DIR = path.join(ROOT, 'content', 'card');

const run = async () => {
  const configRaw = await fs.readFile(CONFIG_PATH, 'utf8');
  const config = YAML.parse(configRaw);
  const schools = Array.isArray(config?.schools) ? config.schools : [];
  await fs.mkdir(CARD_DIR, { recursive: true });

  for (const school of schools) {
    const subs = Array.isArray(school?.subscriptions) ? school.subscriptions : [];
    const firstSub = subs.find((item) => item?.enabled !== false) || subs[0];
    if (!firstSub) continue;

    const schoolSlug = String(school.slug || '').trim();
    const schoolName = String(school.name || '').trim();
    const subTitle = String(firstSub.title || '').trim() || schoolName;
    const id = `20260210-${schoolSlug}-099`;
    const filePath = path.join(CARD_DIR, schoolSlug, `${id}.md`);

    const content = [
      '---',
      `id: "${id}"`,
      `school_slug: "${schoolSlug}"`,
      `title: "${schoolName}院徽回退展示测试"`,
      `description: "用于测试无封面卡片时，是否按学院展示院徽并在无匹配时回退校徽。"`,
      "published: '2026-02-10T12:00:00+08:00'",
      'category: "通知公告"',
      'tags: ["测试卡片", "院徽回退"]',
      'pinned: false',
      'cover: ""',
      'badge: ""',
      'extra_url: ""',
      'start_at: ""',
      'end_at: ""',
      'source:',
      `  channel: "${subTitle.replace(/"/g, '\\"')}"`,
      '  sender: "系统测试"',
      'attachments: []',
      '---',
      '',
      '该卡片用于验证无封面时的院徽回退展示效果。',
      '',
    ].join('\n');

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf8');
  }

  console.log(`Generated test cards for ${schools.length} schools.`);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
