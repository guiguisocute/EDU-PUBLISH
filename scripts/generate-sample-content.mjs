import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const CARD_DIR = path.join(ROOT, 'content', 'card');
const CONCLUSION_DIR = path.join(ROOT, 'content', 'conclusion');

const SCHOOLS = [
  { slug: 'ai', name: '人工智能学院' },
  { slug: 'public-funded-normal', name: '公费师范生学院' },
  { slug: 'pe', name: '体育学院' },
  { slug: 'chem-materials', name: '化学与材料学院' },
  { slug: 'chem-eng', name: '化学工程学院' },
  { slug: 'history-tourism', name: '历史文化与旅游学院' },
  { slug: 'geography-environment', name: '地理与环境学院' },
  { slug: 'urban-construction', name: '城市建设学院' },
  { slug: 'foreign', name: '外国语学院' },
  { slug: 'psychology', name: '心理学院' },
  { slug: 'law', name: '政法学院' },
  { slug: 'education', name: '教育学院' },
  { slug: 'math-stat', name: '数学与统计学院' },
  { slug: 'literature', name: '文学院' },
  { slug: 'journalism', name: '新闻与传播学院' },
  { slug: 'physics-electronics', name: '物理与通信电子学院' },
  { slug: 'life-science', name: '生命科学学院' },
  { slug: 'economics-management', name: '经济与管理学院' },
  { slug: 'fine-arts', name: '美术学院' },
  { slug: 'pharmacy', name: '药学院' },
  { slug: 'marxism', name: '马克思主义学院' },
];

const CATEGORIES = ['通知公告', '竞赛相关', '志愿实习', '二课活动', '问卷填表', '其它分类'];

const TAG_POOL = [
  '报名事项',
  '截止提醒',
  '团学工作',
  '材料提交',
  '教务安排',
  '实验室管理',
  '活动通知',
  '志愿服务',
  '值班安排',
  '安全排查',
  '评优申报',
  '奖助评定',
  '实践教学',
  '跨学院',
  '就业升学',
  '讲座',
  '心理健康',
  '学业预警',
  '晚点名',
  '班委协作',
];

const TEST_COMPONENTS = [
  '限时进度条',
  '超长标题',
  '超短标题',
  '长描述',
  '短描述',
  '弹层长正文',
  'Markdown 表格',
  '引用块',
  '代码块',
  '清单列表',
  '多附件',
  '无附件',
  '封面图',
  '无封面',
  '多标签',
  '外链按钮',
];

const AI_CHANNELS = [
  { channel: '25-26学年学生干部通知群', count: 11 },
  { channel: '22-24级团支书', count: 11 },
  { channel: '24级计算机心委+学委', count: 10 },
];

const toYamlArray = (arr) => `[${arr.map((item) => `"${String(item).replace(/"/g, '\\"')}"`).join(', ')}]`;

const toYamlString = (value) => `"${String(value).replace(/"/g, '\\"')}"`;

const writeFile = async (filePath, content) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
};

const removeMarkdownFiles = async (dir) => {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'attachments') await removeMarkdownFiles(full);
      } else if (entry.isFile() && full.endsWith('.md')) {
        await fs.unlink(full);
      }
    }
  } catch {
    // no-op
  }
};

const toAiSource = (index) => {
  let offset = index;
  for (const entry of AI_CHANNELS) {
    if (offset < entry.count) {
      return {
        channel: entry.channel,
        sender: '人工智能学院学工办',
      };
    }
    offset -= entry.count;
  }

  return {
    channel: AI_CHANNELS[0].channel,
    sender: '人工智能学院学工办',
  };
};

const makeAiTitle = (index, ordinal) => {
  if (index % 4 === 0) return `AI学院协同任务 ${ordinal}`;
  if (index % 4 === 1) return `人工智能学院学生事务提醒 ${ordinal}（多组件渲染验证）`;
  if (index % 4 === 2) return `AI学院 ${ordinal}`;
  return `人工智能学院本周综合通知与流程核验说明 ${ordinal}（用于卡片列表、筛选面板、详情弹层、移动端布局联合测试）`;
};

const makeAiDescription = (index) => {
  if (index % 3 === 0) return `短描述 ${String(index + 1).padStart(2, '0')}`;
  if (index % 3 === 1) return `该卡片用于验证不同标签组合、时间窗口状态、封面展示和分享链接行为，确保筛选、排序与弹层交互一致。`;
  return `用于验证通知卡片在不同标题长度、正文复杂度、附件形式和来源渠道下的渲染稳定性。`;
};

const makeAiTags = (index) => {
  const count = 2 + (index % 4);
  const tags = [];
  for (let i = 0; i < count; i += 1) {
    const tag = TAG_POOL[(index * 3 + i * 5) % TAG_POOL.length];
    if (!tags.includes(tag)) tags.push(tag);
  }
  return tags;
};

const makeComponentHints = (index) => {
  const picked = [
    TEST_COMPONENTS[index % TEST_COMPONENTS.length],
    TEST_COMPONENTS[(index + 5) % TEST_COMPONENTS.length],
    TEST_COMPONENTS[(index + 11) % TEST_COMPONENTS.length],
  ];
  return picked.filter((value, idx) => picked.indexOf(value) === idx);
};

const makeAiBody = (index) => {
  const caseNo = String(index + 1).padStart(2, '0');
  const hints = makeComponentHints(index);

  if (index === 19) {
    return `# 移动端渲染压力测试通知（Case ${caseNo}）\n\n本条用于验证长正文、多层列表、表格、代码块与超长连续文本在移动端详情弹层中的排版稳定性。\n\n**组件测试点**：${hints.join(' / ')}\n\n## 执行步骤\n\n1. 先阅读全部说明\n2. 再按班级完成核验\n3. 最后提交回执\n\n### 重点清单\n\n- [ ] 核对姓名、学号、联系方式\n- [ ] 确认附件格式\n- [ ] 群内回复“已完成”\n\n| 项目 | 截止 | 责任人 |\n| --- | --- | --- |\n| 材料校验 | 2月4日 18:00 | 班长 |\n| 附件汇总 | 2月5日 12:00 | 学委 |\n| 最终确认 | 2月5日 20:00 | 团支书 |\n\n\`\`\`text\nmobile-overflow-check: true\nline-wrap: required\ncase: ${caseNo}\n\`\`\`\n\n以下长文本用于换行测试：\n\n超长内容测试ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789\n\n> 若出现横向滚动，请记录具体机型与缩放比例。\n\n请各班务必按时完成。`;
  }

  const variant = index % 8;
  if (variant === 0) return `请今日内完成基础信息核验并反馈，超时将影响后续流程。（Case ${caseNo}，测试：${hints.join(' / ')}）`;
  if (variant === 1) return `## 工作提醒（Case ${caseNo}）\n\n**组件测试点**：${hints.join(' / ')}\n\n请各班班委在晚自习前完成台账更新，并在群内回复“已同步”。`;
  if (variant === 2) return `### 活动安排（Case ${caseNo}）\n\n- 地点：学院报告厅\n- 时间：周三 19:00\n- 对象：全体学生干部\n- 备注：用于弹层列表样式测试`;
  if (variant === 3) return `本条通知用于测试较长描述段落（Case ${caseNo}）。` + '请同学们根据附件要求逐条核对信息并在截止前提交。'.repeat(12);
  if (variant === 4) return `> 温馨提示（Case ${caseNo}）：请勿重复提交，系统以最后一次提交为准。\n\n附件内包含填写示例。`;
  if (variant === 5) return `#### 清单（Case ${caseNo}）\n\n1. 下载附件\n2. 填写信息\n3. 命名规范\n4. 提交回执\n\n\`\`\`bash\n# mock command\nnpm run verify:card\n\`\`\``;
  if (variant === 6) return `请关注报名时段（Case ${caseNo}），未开始与已截止状态将自动在卡片上展示。\n\n| 状态 | 行为 |\n| --- | --- |\n| 未开始 | 展示“未开始” |\n| 进行中 | 展示进度条 |\n| 已过期 | 灰化处理 |`;
  return `为便于后续自动汇总，请统一使用班级-姓名命名规则上传材料。\n\n**组件测试点**：${hints.join(' / ')}`;
};

const makeAiAttachments = (index) => {
  const mode = index % 5;
  if (mode === 0) return ['报名汇总表.docx'];
  if (mode === 1) return [{ name: '活动细则.pdf', url: 'https://example.com/files/ai-rules.pdf' }];
  if (mode === 2) return [{ name: '名单模板.xlsx', url: '/attachments/名单模板.xlsx' }];
  if (mode === 3) return [];
  return [{ name: '流程图.png', url: 'https://picsum.photos/seed/ai-flow/1200/800' }];
};

const toTimeWindow = (index) => {
  const mode = index % 4;
  if (mode === 0) return { startAt: '', endAt: '' }; // normal
  if (mode === 1) return { startAt: '2026-02-01T00:00:00+08:00', endAt: '2026-12-31T23:59:59+08:00' }; // active
  if (mode === 2) return { startAt: '2026-12-01T00:00:00+08:00', endAt: '2027-01-31T23:59:59+08:00' }; // upcoming
  return { startAt: '2025-12-01T00:00:00+08:00', endAt: '2026-01-31T23:59:59+08:00' }; // expired
};

const makeCardFrontmatter = ({
  id,
  school,
  title,
  description,
  published,
  category,
  tags,
  pinned,
  cover,
  badge,
  extraUrl,
  source,
  attachments,
  startAt,
  endAt,
}) => {
  const attachmentLines = attachments.length === 0
    ? ['attachments: []']
    : [
      'attachments:',
      ...attachments.flatMap((item) => {
        if (typeof item === 'string') return [`  - ${toYamlString(item)}`];
        return [
          '  - name: ' + toYamlString(item.name),
          '    url: ' + toYamlString(item.url),
        ];
      }),
    ];

  return [
    '---',
    `id: ${toYamlString(id)}`,
    `school_slug: ${toYamlString(school.slug)}`,
    `title: ${toYamlString(title)}`,
    `description: ${toYamlString(description)}`,
    `published: ${published}`,
    `category: ${toYamlString(category)}`,
    `tags: ${toYamlArray(tags)}`,
    `pinned: ${pinned ? 'true' : 'false'}`,
    `cover: ${toYamlString(cover)}`,
    `badge: ${toYamlString(badge)}`,
    `extra_url: ${toYamlString(extraUrl)}`,
    `start_at: ${toYamlString(startAt)}`,
    `end_at: ${toYamlString(endAt)}`,
    'source:',
    `  channel: ${toYamlString(source.channel)}`,
    `  sender: ${toYamlString(source.sender)}`,
    ...attachmentLines,
    '---',
    '',
  ].join('\n');
};

const main = async () => {
  await removeMarkdownFiles(CARD_DIR);
  await removeMarkdownFiles(CONCLUSION_DIR);

  const aiSchool = SCHOOLS[0];
  for (let i = 0; i < 32; i += 1) {
    const ordinal = String(i + 1).padStart(3, '0');
    const id = `20260201-ai-${ordinal}`;
    const date = `2026-02-${String((i % 28) + 1).padStart(2, '0')}T${String(8 + (i % 10)).padStart(2, '0')}:00:00+08:00`;
    const source = toAiSource(i);
    const { startAt, endAt } = toTimeWindow(i);
    const tags = makeAiTags(i);
    const category = CATEGORIES[i % CATEGORIES.length];
    const cover = i % 3 === 0 ? '' : `https://picsum.photos/seed/ai-${ordinal}/1280/720`;
    const badge = i % 2 === 0 ? '/JXNUlogo.png' : '';
    const pinned = i === 0 || i === 15;
    const extraUrl = i % 4 === 0 ? `https://example.com/original/ai/${id}` : '';
    const title = makeAiTitle(i, ordinal);
    const description = makeAiDescription(i);
    const body = makeAiBody(i);
    const attachments = makeAiAttachments(i);

    const frontmatter = makeCardFrontmatter({
      id,
      school: aiSchool,
      title,
      description,
      published: date,
      category,
      tags,
      pinned,
      cover,
      badge,
      extraUrl,
      source,
      attachments,
      startAt,
      endAt,
    });

    await writeFile(path.join(CARD_DIR, aiSchool.slug, `${id}.md`), `${frontmatter}${body}\n`);
  }

  for (const school of SCHOOLS.slice(1)) {
    const id = `20260201-${school.slug}-001`;
    const frontmatter = makeCardFrontmatter({
      id,
      school,
      title: `${school.name} 未接入`,
      description: 'JXNU PUBLISH希望更多的学院可以接入我们的通知源，**打破学院之间的信息壁垒，促进师大的信息流通效率**，非常希望未接入的学院的班委、老师、可以联系作者，万分感激！\\n邮箱：guiguisocute@linux.do',
      published: '2026-02-01T09:00:00+08:00',
      category: '其它分类',
      tags: ['联系作者'],
      pinned: true,
      cover: '',
      badge: '/default-placeholder.svg',
      extraUrl: '',
      source: {
        channel: '待接入',
        sender: '联系作者',
      },
      attachments: [],
      startAt: '',
      endAt: '',
    });

    const body = '# I WANT YOU';

    await writeFile(path.join(CARD_DIR, school.slug, `${id}.md`), `${frontmatter}${body}\n`);
  }

  for (const school of SCHOOLS) {
    const dailyLines = [];
    for (let day = 1; day <= 28; day += 1) {
      const dateKey = `2026-02-${String(day).padStart(2, '0')}`;
      dailyLines.push(`  "${dateKey}": |`);
      dailyLines.push(`    # ${school.name} ${dateKey} 每日总结`);
      dailyLines.push('    ');
      dailyLines.push('    - 今日通知已自动汇总，请优先处理置顶与限时条目。');
      dailyLines.push('    - 若显示“待接入”，请联系作者补充学院数据源。');
      dailyLines.push('    - 右侧筛选可切换“仅看限时活动”与“隐藏已过期”。');
    }

    const conclusion = [
      '---',
      `school_slug: "${school.slug}"`,
      'daily:',
      ...dailyLines,
      '---',
      '',
      `# ${school.name}学院总结`,
      '',
      '- 默认总结用于无指定日期时展示。',
      '- 可在 daily 字段中按日期覆盖。',
      '',
    ].join('\n');

    await writeFile(path.join(CONCLUSION_DIR, `${school.slug}.md`), conclusion);
  }

  console.log('Generated sample content: AI 32 cards + other schools 20 contact cards.');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
